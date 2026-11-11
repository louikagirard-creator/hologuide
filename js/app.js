// HoloGuide : déroulement de la borne (veille > accueil > conversation > fin).
// Une seule réponse à l'écran à la fois : le texte s'illumine mot par mot pendant que Gee-Gee parle (il sert de sous-titre).
// Les échanges précédents restent dans l'historique (transcription complète).
import { TEXT, LINKS, TOPIC_ORDER, TOPIC_ICON } from './i18n.js';
import { findAnswer, byId, inCategory, CATEGORIES } from './search.js';
import { speak, stopSpeaking, listen, canListen } from './speech.js';
import { GeeGee } from './mascot.js';

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

// ---------- Gee-Gee (sans WebGL : emoji de secours) ----------
let gg = null;
try { gg = new GeeGee(); } catch (err) { console.warn('3D indisponible :', err); }
function placeMascot(screen) {
  const stage = $('.stage', screen);
  if (!stage) return;
  if (gg) gg.mount(stage, stage.dataset.view);
  else if (!stage.firstChild) stage.append(h('div', { class: 'fallback', 'aria-hidden': 'true', style: 'font-size:8rem;text-align:center', text: '🐴' }));
}

// ---------- Indicateurs de succès (sur la borne seulement, rien de personnel) ----------
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
  placeMascot($(`#${id}`));
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
function topicTiles(ids) {
  return h('div', { class: 'topics-grid' }, ids.map((id) => {
    const c = CATEGORIES.find((x) => x.id === id);
    return h('button', { class: 'tile', onclick: () => showTopic(id) }, h('span', { class: 'emoji', text: TOPIC_ICON[id] || '•' }), h('span', { text: L(c) }));
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
  setView(p,
    h('p', { class: 'section', text: t('popular') }), topicTiles(profileTopics().slice(0, 6)),
    h('ul', { class: 'list', style: 'margin-top:10px' }, h('li', {}, h('button', { onclick: showAllTopics }, h('span', { text: `${t('allTopics')} (${profileTopics().length})` }), icon('next')))));
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
    h('h2', { class: 'view-title', text: `${TOPIC_ICON[id] || ''} ${L(c)}` }), p, h('div', { style: 'height:14px' }), questionList(inCategory(id)));
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
      h('button', { class: 'round', 'aria-label': t('listenAgain'), title: t('listenAgain'), onclick: () => say(answer, p) }, icon('replay')),
      h('span', { class: 'spacer' }), h('span', { text: t('helpful') }),
      ...[['up', '👍', 'yes'], ['down', '👎', 'no']].map(([k, sym, lab]) => h('button', { class: 'round', 'aria-label': t(lab), onclick: (ev) => {
        const box = ev.currentTarget.parentNode; if (box.dataset.done) return;
        box.dataset.done = '1'; bump((s) => { s[k]++; });
        box.replaceChildren(h('span', { class: 'spacer' }), h('span', { text: t('thanksFb') }));
      } }, sym)));
    setView(asked(q), p,
      e.image && h('button', { class: 'plan', onclick: () => openPlan(e.image) }, h('img', { src: e.image.src, alt: L(e.image.alt) }), h('span', { text: t('zoom') })),
      sourceLinks(e.sources), h('p', { class: 'meta', text: `${e.status === 'pointer' ? `${t('pointer')} · ` : ''}${fill(t('time'), { ms })}${e.verifiedOn ? ` · ${t('verified')} ${e.verifiedOn}` : ''}` }),
      fb, related.length && h('p', { class: 'section', text: t('relatedTitle') }), related.length && questionList(related));
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
    logExchange(q, t('none'), LINKS.infoservice.url);
    bump((s) => { s.unanswered++; });
    const p = spokenText(t('none'));
    setView(asked(q), p, sourceLinks([{ label: t('infoservice'), url: LINKS.infoservice.url }]),
      res.alts.length && h('p', { class: 'section', text: t('didYouMean') }), res.alts.length && questionList(res.alts),
      h('p', { class: 'section', text: t('popular') }), topicTiles(profileTopics().slice(0, 3)));
    gg?.react('none');
    say(t('none'), p);
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
  $$('#rating .tile').forEach((b) => b.setAttribute('aria-pressed', 'false'));
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
function openPlan(img) { $('#lightboxImg').src = img.src; $('#lightboxImg').alt = L(img.alt); $('#lightbox').hidden = false; }
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

applyText();
bind();
attract();
window.HoloGuide = { findAnswer, ask, gg, state, showTopic, endSession }; // accès pour les tests
