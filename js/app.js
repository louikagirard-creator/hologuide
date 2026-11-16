// HoloGuide : déroulement dans la boîte Holotech d'INNOVA (veille > accueil > conversation > fin).
// Une seule réponse à l'écran à la fois : le texte s'illumine mot par mot pendant que Gee-Gee parle (il sert de sous-titre).
// Les échanges précédents restent dans l'historique (transcription complète).
import { TEXT, LINKS, TOPIC_ORDER, TOPIC_SHORT } from './i18n.js';
import { findAnswer, byId, inCategory, CATEGORIES } from './search.js';
import { speak, stopSpeaking, listen, canListen } from './speech.js';
import { GeeGee } from './mascot.js';
import { VideoGeeGee, CLIPS } from './avatar-video.js';
import { loadCampus, routeForEntry, drawRoute } from './campusmap.js';
import { loadLinks, searchLinks } from './links.js';

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const IDLE_MS = 45000, IDLE_COUNTDOWN = 15, SESSION_NOTICE_MS = 180000, END_COUNTDOWN = 30;

const state = { lang: 'fr', profile: 'student', voice: true, scale: 1, session: null, idleTimer: null, idleTick: null, endTick: null };
const t = (key) => TEXT[state.lang][key];
const L = (o) => (o && typeof o === 'object' ? o[state.lang] || o.fr : o);
const fill = (s, vars) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k]);

// ---------- Petits outils d'affichage ----------
function h(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v);
  }
  e.append(...kids.flat().filter((k) => k != null && k !== false));
  return e;
}
const icon = (id) => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.innerHTML = `<use href="#i-${id}"/>`; return s; };

// ---------- Gee-Gee (sans WebGL : son nom s'affiche à la place) ----------
let gg = null;
// Vidéo du vrai costume si les clips sont configurés (js/avatar-video.js), sinon Gee-Gee en 3D.
try { gg = CLIPS ? new VideoGeeGee(CLIPS) : new GeeGee(); } catch (err) { console.warn('Avatar indisponible :', err); }
// Monté une seule fois dans la colonne de gauche : Gee-Gee reste à sa place d'un écran à l'autre.
function placeMascot() {
  const stage = $('#stage');
  if (gg) gg.mount(stage);
  else stage.append(h('p', { class: 'fallback', text: 'Gee-Gee' }));
}

// ---------- Indicateurs de succès (dans la boîte seulement, rien de personnel) ----------
const STATS_KEY = 'hologuide-v2-stats';
const blank = () => ({ sessions: 0, questions: 0, unanswered: 0, qr: 0, up: 0, down: 0, ratings: [0, 0, 0], top: {}, profiles: {}, langs: {} });
function stats() { try { return { ...blank(), ...JSON.parse(localStorage.getItem(STATS_KEY) || '{}') }; } catch { return blank(); } }
function bump(change) { const s = stats(); change(s); try { localStorage.setItem(STATS_KEY, JSON.stringify(s)); } catch { /* stockage indisponible */ } }

// ---------- Textes fixes ----------
function applyText() {
  document.documentElement.lang = state.lang;
  $$('[data-t]').forEach((e) => { e.textContent = t(e.dataset.t); });
  $$('[data-ph]').forEach((e) => { e.placeholder = t(e.dataset.ph); });
  $$('[data-aria]').forEach((e) => { e.setAttribute('aria-label', t(e.dataset.aria)); e.title = t(e.dataset.aria); });
  $$('[data-profile]').forEach((b) => { $('[data-profile-label]', b).textContent = TEXT[state.lang].profiles[b.dataset.profile]; });
  $('#langBtn').textContent = t('langBtn');
  $('#attractEn').textContent = TEXT.en.attractSub;
  $('#micBtn').hidden = !canListen;
}

// ---------- Écrans ----------
function show(id) {
  $$('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
  resetIdle();
}
let tipTimer = null;
function attract() {
  stopSpeaking(); gg?.stopTalking();
  clearTimeout(state.session?.noticeTimer); state.session = null;
  clearInterval(state.endTick);
  state.lang = 'fr'; applyText();
  show('attract');
  let i = 0;
  const tick = () => {
    const k = i % TEXT.fr.tips.length;
    $('#tip').textContent = `${TEXT.fr.tips[k]} · ${TEXT.en.tips[k]}`;
    if (i % 3 === 0) gg?.react('hello');
    i++;
  };
  clearInterval(tipTimer); tick(); tipTimer = setInterval(tick, 6000);
}
function openStart() { clearInterval(tipTimer); show('start'); markChoices(); }
function markChoices() {
  $$('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === state.lang)));
  $$('[data-profile]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.profile === state.profile)));
}

// ---------- Parole synchronisée : le texte s'illumine mot par mot ----------
function spokenText(text) {
  const p = h('p', { class: 'spoken' });
  let i = 0;
  for (const part of text.split(/(\s+)/)) {
    if (!part) continue;
    if (/^\s+$/.test(part)) p.append(part); else p.append(h('span', { class: 'w', 'data-i': i, text: part }));
    i += part.length;
  }
  return p;
}
let karaoke = null;
function say(text, p) {
  clearInterval(karaoke);
  const words = p ? $$('.w', p) : [];
  const mark = (k) => words.forEach((w, j) => { w.classList.toggle('said', j < k); w.classList.toggle('now', j === k); });
  const done = () => { clearInterval(karaoke); p?.classList.remove('reading'); words.forEach((w) => w.classList.remove('said', 'now')); };
  const sweep = (ms) => { // sans minutage des mots : la surbrillance avance à vitesse estimée
    let k = 0; const step = ms / Math.max(1, words.length);
    karaoke = setInterval(() => { mark(k++); if (k > words.length) done(); }, step);
  };
  if (!state.voice) { gg?.sayText(text, Math.min(9000, 400 + text.length * 55)); return; }
  p?.classList.add('reading');
  speak(text, state.lang, {
    onStart: () => gg?.startTalking(),
    onWord: (w, rate, idx) => {
      gg?.sayWord(w, rate);
      const k = words.findIndex((s) => Number(s.dataset.i) > idx);
      mark(Math.max(0, (k < 0 ? words.length : k) - 1));
    },
    onNoWords: (ms) => { gg?.sayText(text, ms); sweep(ms); },
    onEnd: () => { gg?.stopTalking(); done(); resetIdle(); }
  });
}

// ---------- Contenu du panneau ----------
function setView(...children) {
  const v = $('#view');
  v.replaceChildren(...children.flat().filter(Boolean));
  v.scrollTop = 0;
}
// Sujets : liste numérotée (01, 02…), le nombre de questions à droite.
function topicTiles(ids) {
  return h('ol', { class: 'topics' }, ids.map((id, i) => {
    const c = CATEGORIES.find((x) => x.id === id);
    return h('li', {}, h('button', { onclick: () => showTopic(id) },
      h('span', { class: 'num', text: String(i + 1).padStart(2, '0') }), h('span', { class: 'name', text: L(c) }), h('span', { class: 'count', text: inCategory(id).length }), icon('next')));
  }));
}
function profileTopics() {
  const order = TOPIC_ORDER[state.profile] || TOPIC_ORDER.student;
  return order.filter((id) => CATEGORIES.some((c) => c.id === id) && inCategory(id).length);
}
function questionList(entries) {
  return h('ul', { class: 'list' }, entries.map((e) => h('li', {}, h('button', { onclick: () => ask('', e.id) }, h('span', { text: L(e.question) }), icon('next')))));
}
function sourceLinks(sources, extra) {
  return h('div', { class: 'foot' }, sources.map((s) => h('a', { class: 'src', href: s.url, target: '_blank', rel: 'noopener' }, icon('link'), L(s.label))), extra);
}
const asked = (q) => (q ? h('p', { class: 'asked', text: q }) : null);

function viewHome(greeting) {
  const p = spokenText(greeting);
  // Accueil compact : quelques sujets en petites puces, plus un exemple de question
  const chip = (id) => h('button', { class: 'chip', onclick: () => showTopic(id) }, L(TOPIC_SHORT[id]) || L(CATEGORIES.find((c) => c.id === id)));
  setView(p,
    h('div', { class: 'chips' }, profileTopics().slice(0, 5).map(chip), h('button', { class: 'chip all', onclick: showAllTopics }, `${t('allTopics')} →`)),
    h('p', { class: 'hint', text: t('tryAsk') }));
  return p;
}
function showAllTopics() {
  setView(h('button', { class: 'back', onclick: () => viewHome(t('homeTitle')) }, icon('back'), t('back')),
    h('h2', { class: 'view-title', text: t('allTopics') }), topicTiles(CATEGORIES.map((c) => c.id).filter((id) => inCategory(id).length)));
}
function showTopic(id) {
  const c = CATEGORIES.find((x) => x.id === id);
  const intro = fill(t('topicIntro'), { cat: L(c) });
  const p = spokenText(intro);
  setView(h('button', { class: 'back', onclick: showAllTopics }, icon('back'), t('allTopics')),
    h('h2', { class: 'view-title', text: L(c) }), p, questionList(inCategory(id)));
  say(intro, p);
}
function logExchange(q, a, url) {
  if (!state.session) return;
  state.session.log.push({ q, a, url });
  const n = state.session.log.length;
  $('#histCount').hidden = !n; $('#histCount').textContent = n;
}

// ---------- Questions ----------
function ask(text, id) {
  const started = performance.now();
  const entry = id ? byId(id) : null;
  const q = entry ? L(entry.question) : text.trim();
  if (!q) return;
  const res = entry ? { type: 'answer', entry, alts: [] } : findAnswer(q);
  const ms = Math.max(1, Math.round(performance.now() - started));
  bump((s) => { s.questions++; });

  if (res.type === 'answer') {
    const e = res.entry, answer = L(e.answer);
    logExchange(q, answer, e.sources[0]?.url || '');
    bump((s) => { s.top[e.id] = (s.top[e.id] || 0) + 1; });
    const p = spokenText(answer);
    const related = [...new Set([...(e.related || []).map(byId).filter(Boolean), ...res.alts])].filter((r) => r.id !== e.id).slice(0, 3);
    const fb = h('div', { class: 'actions' },
      h('button', { class: 'tool', 'aria-label': t('listenAgain'), title: t('listenAgain'), onclick: () => say(answer, p) }, icon('replay')),
      h('span', { class: 'spacer' }), h('span', { text: t('helpful') }),
      ...[['up', 'yes'], ['down', 'no']].map(([k, lab]) => h('button', { class: 'pill', onclick: (ev) => {
        const box = ev.currentTarget.parentNode; if (box.dataset.done) return;
        box.dataset.done = '1'; bump((s) => { s[k]++; });
        box.replaceChildren(h('span', { class: 'spacer' }), h('span', { text: t('thanksFb') }));
      } }, t(lab))));
    // Pavillon : vraie carte avec le trajet depuis la borne ; plan du campus : carte d'ensemble ; plan d'étage en plus si disponible
    const route = routeCard(e, q);
    const sitePlan = /site-plan/.test(e.image?.src || '');
    setView(asked(q), p, route || (sitePlan && campusCard()),
      e.image?.src && !sitePlan && h('button', { class: 'plan', onclick: () => openPlan(e.image) }, h('img', { src: e.image.src, alt: L(e.image.alt) }), h('span', { text: route ? t('floorPlan') : t('zoom') })),
      sourceLinks(e.sources), h('p', { class: 'meta', text: `${e.status === 'pointer' ? `${t('pointer')} · ` : ''}${fill(t('time'), { ms })}${e.verifiedOn ? ` · ${t('verified')} ${e.verifiedOn}` : ''}` }),
      fb, related.length && h('p', { class: 'section', text: t('relatedTitle') }), related.length && questionList(related),
      !route && pageList(searchLinks(q, state.lang, 3), t('morePages')));
    gg?.react('answer');
    say(answer, p);
  } else if (res.type === 'sensitive') {
    logExchange(q, t('sensitive'), LINKS.wellness.url);
    const p = spokenText(t('sensitive'));
    setView(asked(q), p, sourceLinks([LINKS.wellness], h('a', { class: 'src alert', href: 'tel:911' }, t('urgent'))));
    gg?.react('sensitive');
    say(t('sensitive'), p);
  } else if (res.type === 'hello' || res.type === 'thanks') {
    const p = viewHome(t(res.type));
    $('#view').prepend(asked(q));
    gg?.react(res.type);
    say(t(res.type), p);
  } else {
    // Pas de fiche : on cherche dans l'index des ~36 000 pages officielles
    const pages = searchLinks(q, state.lang);
    const said = pages.length ? t('noneLinks') : t('none');
    logExchange(q, said, pages[0]?.url || LINKS.infoservice.url);
    bump((s) => { s.unanswered++; });
    const p = spokenText(said);
    setView(asked(q), p, pageList(pages), sourceLinks([{ label: t('infoservice'), url: LINKS.infoservice.url }]),
      res.alts.length && h('p', { class: 'section', text: t('didYouMean') }), res.alts.length && questionList(res.alts),
      h('p', { class: 'section', text: t('popular') }), topicTiles(profileTopics().slice(0, 3)));
    gg?.react(pages.length ? 'answer' : 'none');
    say(said, p);
  }
}

// ---------- Session ----------
function startSession() {
  state.session = { log: [], noticeTimer: setTimeout(() => {
    toast(t('timeNotice'));
    if (state.voice) speak(t('timeNotice'), state.lang, { onStart: () => gg?.startTalking(), onWord: (w, r) => gg?.sayWord(w, r), onEnd: () => gg?.stopTalking() });
  }, SESSION_NOTICE_MS) };
  bump((s) => { s.sessions++; s.profiles[state.profile] = (s.profiles[state.profile] || 0) + 1; s.langs[state.lang] = (s.langs[state.lang] || 0) + 1; });
  $('#histCount').hidden = true;
  applyText();
  show('chat');
  gg?.react('hello');
  const greet = t('greet')[state.profile];
  say(greet, viewHome(greet));
}
function endSession() {
  hideIdle(); closeOverlays();
  stopSpeaking(); gg?.stopTalking();
  clearTimeout(state.session?.noticeTimer);
  const log = state.session?.log || [];
  $('#qr').replaceChildren();
  if (log.length) { $('#qrText').textContent = t('qrText'); $('#qr').innerHTML = makeQR(log); bump((s) => { s.qr++; }); }
  else $('#qrText').textContent = t('noQr');
  $$('#rating .choice').forEach((b) => b.setAttribute('aria-pressed', 'false'));
  state.session = null;
  show('end');
  let left = END_COUNTDOWN;
  const tick = () => { $('#closing').textContent = fill(t('closing'), { s: left }); if (left-- <= 0) attract(); };
  clearInterval(state.endTick); tick(); state.endTick = setInterval(tick, 1000);
}
// QR : questions posées + lien officiel de chaque réponse (aucune donnée personnelle).
function makeQR(log) {
  const lines = [t('qrHeader')];
  for (const it of log) {
    const line = `• ${it.q}${it.url ? `\n  ${it.url}` : ''}`;
    if ((lines.join('\n') + line).length > 700) break; // reste facile à scanner
    lines.push(line);
  }
  qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
  const code = qrcode(0, 'M'); code.addData(lines.join('\n'), 'Byte'); code.make();
  return code.createSvgTag({ cellSize: 4, margin: 2, scalable: true, alt: t('qrText') });
}

// ---------- Fenêtres : historique, plan, rappel, inactivité, tableau de bord ----------
function openHistory() {
  const log = state.session?.log || [];
  $('#historyList').replaceChildren(...(log.length ? log.map((x) => h('li', {}, h('p', { class: 'q', text: x.q }), h('p', { class: 'a', text: x.a })))
    : [h('li', { class: 'empty', text: t('historyEmpty') })]));
  $('#history').hidden = false;
}
function openPlan(img) { $('#lightboxMap').replaceChildren(); $('#lightboxImg').hidden = false; $('#lightboxImg').src = img.src; $('#lightboxImg').alt = L(img.alt); $('#lightbox').hidden = false; }
// Pages officielles trouvées dans l'index : toucher une page affiche un code QR pour l'ouvrir sur son téléphone
function pageList(pages, heading = t('officialPages')) {
  if (!pages.length) return null;
  return h('section', { class: 'pages' }, h('p', { class: 'section', text: heading }),
    h('ul', { class: 'list' }, pages.map((pg) => h('li', {}, h('button', { onclick: () => openLinkQR(pg) },
      h('span', {}, h('span', { class: 'pg-title', text: pg.title }), h('span', { class: 'pg-sec', text: pg.section })), icon('next'))))));
}
function openLinkQR(pg) {
  qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
  const code = qrcode(0, 'M'); code.addData(pg.url, 'Byte'); code.make();
  const box = h('div', { class: 'link-qr' }, h('p', { class: 'title', text: pg.title }), h('p', { class: 'lead', text: t('scanToOpen') }));
  const qr = h('div', { class: 'qr' }); qr.innerHTML = code.createSvgTag({ cellSize: 4, margin: 2, scalable: true, alt: pg.url });
  box.append(qr, h('p', { class: 'fine', text: pg.url }));
  if (state.session) state.session.log.push({ q: pg.title, a: '', url: pg.url }); // aussi dans le code QR de fin
  $('#lightboxImg').hidden = true; $('#lightboxMap').replaceChildren(box); $('#lightbox').hidden = false;
}
function openMap(svg) { $('#lightboxImg').hidden = true; $('#lightboxMap').replaceChildren(svg); $('#lightbox').hidden = false; }

// ---------- Itinéraire à pied (carte d'ensemble + une petite carte zoomée par étape) ----------
function routeCard(e, asked) {
  const r = routeForEntry(e, asked);
  if (!r) return null;
  const lang = state.lang, steps = r.steps[lang] || r.steps.fr;
  const head = r.distance_m ? fill(t('walk'), { m: r.distance_m, min: r.minutes }) : t('hereAlready');
  return h('section', { class: 'route' },
    h('p', { class: 'route-head' }, h('strong', { text: t('directions') }), h('span', { text: head })),
    h('button', { class: 'route-map', 'aria-label': t('enlargeMap'), onclick: () => openMap(drawRoute(r.code, { lang, aspect: 0.8, pad: 50 })) },
      drawRoute(r.code, { lang, aspect: 1.3 }), h('span', { class: 'route-zoom', text: t('enlargeMap') })),
    h('ol', { class: 'route-steps' }, steps.map((txt, i) => h('li', {},
      r.stepRanges?.[i] && r.line.length > 1 ? h('span', { class: 'step-map', 'aria-hidden': 'true' }, drawRoute(r.code, { lang, focus: r.stepRanges[i], aspect: 1, pad: 30, min: 110, mini: true })) : null,
      h('span', { class: 'step-num', text: i + 1 }), h('span', { class: 'step-text', text: txt })))));
}
function campusCard() {
  try {
    const lang = state.lang;
    return h('section', { class: 'route' },
      h('p', { class: 'route-head' }, h('strong', { text: t('campusMap') })),
      h('button', { class: 'route-map', 'aria-label': t('enlargeMap'), onclick: () => openMap(drawRoute('CRX', { lang, aspect: 0.8, min: 1150, pad: 0 })) },
        drawRoute('CRX', { lang, aspect: 1, min: 1000, pad: 0 }), h('span', { class: 'route-zoom', text: t('enlargeMap') })));
  } catch { return null; } // données pas encore chargées
}
function closeOverlays() { $('#history').hidden = true; $('#lightbox').hidden = true; }
function toast(text) {
  const el = h('div', { class: 'toast', role: 'status', text });
  document.body.append(el); setTimeout(() => el.remove(), 7000);
}
function resetIdle() {
  clearTimeout(state.idleTimer);
  if (!['start', 'chat'].includes($('.screen.active')?.id) || !$('#idle').hidden) return;
  state.idleTimer = setTimeout(() => {
    if ('speechSynthesis' in window && speechSynthesis.speaking) return resetIdle(); // Gee-Gee parle encore
    let left = IDLE_COUNTDOWN;
    $('#idle').hidden = false;
    const tick = () => { $('#idleText').textContent = fill(t('idleText'), { s: left }); if (left-- <= 0) { hideIdle(); state.session ? endSession() : attract(); } };
    tick(); state.idleTick = setInterval(tick, 1000);
    $('#stayBtn').focus();
  }, IDLE_MS);
}
function hideIdle() { $('#idle').hidden = true; clearInterval(state.idleTick); }
function openAdmin() {
  const s = stats(), S = t('stats');
  const top = Object.entries(s.top).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, n]) => `${L(byId(id)?.question) || id} (${n})`).join(' · ') || '—';
  const rows = [[S.sessions, s.sessions], [S.questions, s.questions], [S.unanswered, s.unanswered], [S.qr, s.qr], [S.up, s.up], [S.down, s.down],
    [S.ratings, s.ratings.join(' / ')], [S.profiles, Object.entries(s.profiles).map(([k, v]) => `${TEXT[state.lang].profiles[k] || k} ${v}`).join(' · ') || '—'],
    [S.langs, Object.entries(s.langs).map(([k, v]) => `${k.toUpperCase()} ${v}`).join(' · ') || '—'], [S.top, top]];
  $('#stats').replaceChildren(...rows.flatMap(([k, v]) => [h('dt', { text: k }), h('dd', { text: String(v) })]));
  $('#admin').hidden = false;
}

// ---------- Événements ----------
function bind() {
  ['pointerdown', 'keydown', 'input'].forEach((ev) => document.addEventListener(ev, () => { if ($('#idle').hidden) resetIdle(); }, true));
  $('#attract').addEventListener('click', openStart);
  $('#holo').addEventListener('click', () => { if ($('#attract').classList.contains('active')) openStart(); });
  $('#attract').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') openStart(); });
  $('#start').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.lang) { state.lang = b.dataset.lang; applyText(); }
    if (b.dataset.profile) state.profile = b.dataset.profile;
    markChoices();
  });
  $('#go').addEventListener('click', startSession);
  $('#askForm').addEventListener('submit', (e) => { e.preventDefault(); const v = $('#askInput').value; $('#askInput').value = ''; $('#askInput').blur(); ask(v); });
  $('#micBtn').addEventListener('click', () => listen(state.lang, {
    onState: (on) => { $('#micBtn').classList.toggle('on', on); $('#askInput').placeholder = on ? t('listening') : t('askPh'); },
    onText: (txt) => ask(txt),
    onError: (err) => { if (err !== 'aborted') toast(t('micError')); }
  }));
  let taps = [];
  $('#brand').addEventListener('click', () => {
    const n = Date.now(); taps = [...taps.filter((x) => n - x < 3000), n];
    if (taps.length >= 5) { taps = []; openAdmin(); } else if (state.session) viewHome(t('homeTitle'));
  });
  $('#langBtn').addEventListener('click', () => { state.lang = state.lang === 'fr' ? 'en' : 'fr'; applyText(); viewHome(t('homeTitle')); });
  $('#textBtn').addEventListener('click', (e) => { // trois tailles de texte, en boucle
    state.scale = state.scale >= 1.4 ? 1 : +(state.scale + 0.2).toFixed(1);
    document.documentElement.style.setProperty('--scale', state.scale);
    e.currentTarget.setAttribute('aria-pressed', String(state.scale > 1));
  });
  $('#contrastBtn').addEventListener('click', (e) => { const on = document.body.classList.toggle('contrast'); e.currentTarget.setAttribute('aria-pressed', String(on)); });
  $('#voiceBtn').addEventListener('click', (e) => {
    state.voice = !state.voice;
    e.currentTarget.setAttribute('aria-pressed', String(state.voice));
    $('use', e.currentTarget).setAttribute('href', state.voice ? '#i-sound' : '#i-mute');
    if (!state.voice) { stopSpeaking(); gg?.stopTalking(); $$('.spoken.reading').forEach((p) => p.classList.remove('reading')); }
  });
  $('#historyBtn').addEventListener('click', openHistory);
  $('#closeHistory').addEventListener('click', closeOverlays);
  $('#closeLightbox').addEventListener('click', closeOverlays);
  $('#lightbox').addEventListener('click', (e) => { if (e.target.id === 'lightbox') closeOverlays(); });
  $('#history').addEventListener('click', (e) => { if (e.target.id === 'history') closeOverlays(); });
  $('#endBtn').addEventListener('click', endSession);
  $('#stayBtn').addEventListener('click', () => { hideIdle(); resetIdle(); });
  $('#rating').addEventListener('click', (e) => {
    const b = e.target.closest('[data-rate]'); if (!b || $('#rating [aria-pressed="true"]')) return;
    b.setAttribute('aria-pressed', 'true'); bump((s) => { s.ratings[Number(b.dataset.rate)]++; });
  });
  $('#doneBtn').addEventListener('click', attract);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeOverlays();
    if (e.shiftKey && e.key.toLowerCase() === 'a' && document.activeElement?.tagName !== 'INPUT') openAdmin();
  });
  $('#closeAdmin').addEventListener('click', () => { $('#admin').hidden = true; });
  $('#resetStats').addEventListener('click', () => { try { localStorage.removeItem(STATS_KEY); } catch { /* rien */ } openAdmin(); });
}

loadCampus();
loadLinks();
applyText();
placeMascot();
bind();
attract();
window.HoloGuide = { findAnswer, ask, gg, state, showTopic, endSession }; // accès pour les tests
