// HoloGuide : déroulement de la borne (veille > accueil > conversation > fin), réponses, voix, QR et indicateurs.
import { TEXT, LINKS, TOPIC_ORDER } from './i18n.js';
import { findAnswer, byId, inCategory, CATEGORIES } from './search.js';
import { speak, stopSpeaking, listen, canListen } from './speech.js';
import { GeeGee } from './mascot.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const IDLE_MS = 45000, IDLE_COUNTDOWN = 15, SESSION_NOTICE_MS = 180000, END_COUNTDOWN = 30;

const state = { lang: 'fr', profile: 'student', voice: true, scale: 1, session: null, idleTimer: null, countdown: null };
const t = (key) => TEXT[state.lang][key];
const L = (o) => (o && typeof o === 'object' ? o[state.lang] || o.fr : o);
const fill = (s, vars) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k]);

// ---------- Gee-Gee (sans WebGL : simple emoji de secours) ----------
let gg = null;
try { gg = new GeeGee(); } catch (err) { console.warn('3D indisponible :', err); }
function placeMascot(screen) {
  const stage = $('.stage', screen);
  if (!stage) return;
  if (gg) gg.mount(stage, stage.dataset.view);
  else if (!stage.textContent) stage.innerHTML = '<div class="fallback" aria-hidden="true" style="font-size:9rem;text-align:center">🐴</div>';
}

// ---------- Indicateurs de succès (stockés seulement sur la borne, sans rien de personnel) ----------
const STATS_KEY = 'hologuide-v2-stats';
const blank = () => ({ sessions: 0, questions: 0, unanswered: 0, qr: 0, up: 0, down: 0, ratings: [0, 0, 0], top: {}, profiles: {}, langs: {} });
function stats() { try { return { ...blank(), ...JSON.parse(localStorage.getItem(STATS_KEY) || '{}') }; } catch { return blank(); } }
function bump(change) { const s = stats(); change(s); try { localStorage.setItem(STATS_KEY, JSON.stringify(s)); } catch { /* stockage indisponible : on continue */ } }

// ---------- Textes ----------
function applyText() {
  document.documentElement.lang = state.lang;
  $$('[data-t]').forEach((el) => { el.textContent = t(el.dataset.t); });
  $$('[data-ph]').forEach((el) => { el.placeholder = t(el.dataset.ph); });
  $$('[data-aria]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.aria)); el.title = t(el.dataset.aria); });
  $$('[data-profile]').forEach((b) => { b.textContent = TEXT[state.lang].profiles[b.dataset.profile]; });
  $('#langBtn').textContent = t('langBtn');
  $('#attractEn').textContent = `${TEXT.en.attractTitle} ${TEXT.en.attractSub}`;
  $('#micBtn').hidden = !canListen;
  renderTopics();
}

// ---------- Écrans ----------
function show(id) {
  $$('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
  placeMascot($(`#${id}`));
  resetIdle();
}

// Veille : conseils en alternance (FR · EN) et Gee-Gee qui salue de temps en temps.
let tipTimer = null;
function attract() {
  stopSpeaking(); gg?.stopTalking();
  clearTimeout(state.session?.noticeTimer); state.session = null;
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
function openStart() {
  clearInterval(tipTimer);
  show('start');
  markChoices();
}
function markChoices() {
  $$('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === state.lang)));
  $$('[data-profile]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.profile === state.profile)));
}

// ---------- Session ----------
function startSession() {
  state.session = { items: [], noticeTimer: setTimeout(() => botText(t('timeNotice'), { speakIt: true }), SESSION_NOTICE_MS) };
  bump((s) => { s.sessions++; s.profiles[state.profile] = (s.profiles[state.profile] || 0) + 1; s.langs[state.lang] = (s.langs[state.lang] || 0) + 1; });
  $('#log').innerHTML = '';
  applyText();
  show('chat');
  gg?.react('hello');
  botText(t('greet')[state.profile], { speakIt: true });
  $('#askInput').focus({ preventScroll: true });
}
function endSession() {
  hideIdle();
  stopSpeaking(); gg?.stopTalking();
  clearTimeout(state.session?.noticeTimer);
  const items = state.session?.items || [];
  $('#qr').innerHTML = '';
  if (items.length) {
    $('#qrText').textContent = t('qrText');
    $('#qr').innerHTML = makeQR(items);
    bump((s) => { s.qr++; });
  } else $('#qrText').textContent = t('noQr');
  $$('#rating .pill').forEach((b) => b.setAttribute('aria-pressed', 'false'));
  state.session = null;
  show('end');
  let left = END_COUNTDOWN;
  const tick = () => { $('#closing').textContent = fill(t('closing'), { s: left }); if (left-- <= 0) { clearInterval(state.countdown); attract(); } };
  clearInterval(state.countdown); tick(); state.countdown = setInterval(tick, 1000);
}

// QR : les questions posées et le lien officiel de chaque réponse (aucune donnée personnelle).
function makeQR(items) {
  const lines = [t('qrHeader')];
  for (const it of items) {
    const line = `• ${it.q}${it.url ? `\n  ${it.url}` : ''}`;
    if ((lines.join('\n') + line).length > 700) break; // reste lisible par un téléphone
    lines.push(line);
  }
  qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
  const code = qrcode(0, 'M'); code.addData(lines.join('\n'), 'Byte'); code.make();
  return code.createSvgTag({ cellSize: 4, margin: 2, scalable: true, alt: t('qrText') });
}

// ---------- Messages ----------
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
function addMsg(who) { const li = el('li', `msg ${who}`); $('#log').append(li); requestAnimationFrame(() => li.scrollIntoView({ block: 'end' })); return li; }
function chips(parent, entries, label) {
  if (!entries.length) return;
  if (label) parent.append(el('p', 'meta', label));
  const box = el('div', 'chips');
  for (const e of entries) { const b = el('button', 'chip', L(e.question)); b.dataset.q = e.id; box.append(b); }
  parent.append(box);
}
function linkLine(parent, label, links) {
  const p = el('p', 'meta', `${label} : `);
  links.forEach((s, i) => { const a = el('a', null, L(s.label)); a.href = s.url; a.target = '_blank'; a.rel = 'noopener'; p.append(a); if (i < links.length - 1) p.append(' · '); });
  parent.append(p);
}
function botText(text, { speakIt = false, link = null } = {}) {
  const li = addMsg('bot');
  li.append(el('p', null, text));
  if (link) linkLine(li, t('sources'), [link]);
  if (speakIt) say(text);
  return li;
}

// Gee-Gee parle : sous-titre + voix + bouche synchronisée sur les mots.
function say(text) {
  $('#subtitle').replaceChildren(el('span', null, text));
  if (!state.voice) { gg?.sayText(text, Math.min(9000, 400 + text.length * 55)); return; }
  speak(text, state.lang, {
    onStart: () => gg?.startTalking(),
    onWord: (w, rate) => gg?.sayWord(w, rate),
    onNoWords: (ms) => gg?.sayText(text, ms),
    onEnd: () => { gg?.stopTalking(); resetIdle(); }
  });
}

// ---------- Questions ----------
function ask(text, id) {
  const started = performance.now();
  const entry = id ? byId(id) : null;
  const shown = entry ? L(entry.question) : text.trim();
  if (!shown) return;
  const user = addMsg('user'); user.append(el('p', null, shown));
  const res = entry ? { type: 'answer', entry, alts: [] } : findAnswer(shown);
  const ms = Math.max(1, Math.round(performance.now() - started));
  bump((s) => { s.questions++; });

  if (res.type === 'answer') {
    const e = res.entry;
    state.session?.items.push({ q: shown, url: e.sources[0]?.url || '' });
    bump((s) => { s.top[e.id] = (s.top[e.id] || 0) + 1; });
    const li = addMsg('bot');
    li.append(el('p', null, L(e.answer)));
    if (e.image) { const img = el('img'); img.src = e.image.src; img.alt = L(e.image.alt); img.loading = 'lazy'; li.append(img); }
    if (e.sources.length) linkLine(li, e.status === 'pointer' ? t('pointer') : t('sources'), e.sources);
    li.append(el('p', 'meta', `${fill(t('time'), { ms })}${e.verifiedOn ? ` · ${t('verified')} ${e.verifiedOn}` : ''}`));
    const fb = el('div', 'fb'); fb.append(t('helpful'));
    for (const [k, v] of [['up', 'yes'], ['down', 'no']]) { const b = el('button', null, t(v)); b.dataset.fb = k; fb.append(b); }
    li.append(fb);
    const related = [...new Set([...(e.related || []).map(byId).filter(Boolean), ...res.alts])].filter((r) => r.id !== e.id).slice(0, 3);
    chips(li, related, t('related'));
    gg?.react('answer');
    say(L(e.answer));
  } else if (res.type === 'sensitive') {
    state.session?.items.push({ q: shown, url: LINKS.wellness.url });
    gg?.react('sensitive');
    botText(t('sensitive'), { speakIt: true, link: LINKS.wellness });
  } else if (res.type === 'hello' || res.type === 'thanks') {
    gg?.react(res.type);
    botText(t(res.type), { speakIt: true });
  } else {
    state.session?.items.push({ q: shown, url: LINKS.infoservice.url });
    bump((s) => { s.unanswered++; });
    gg?.react('none');
    const li = botText(t('none'), { speakIt: true, link: LINKS.infoservice });
    chips(li, res.alts, t('didYouMean'));
  }
}

// ---------- Sujets ----------
function renderTopics() {
  const order = TOPIC_ORDER[state.profile] || TOPIC_ORDER.student;
  const cats = order.map((id) => CATEGORIES.find((c) => c.id === id)).filter((c) => c && inCategory(c.id).length);
  $('#topics').replaceChildren(...cats.map((c) => { const b = el('button', 'chip', L(c)); b.dataset.cat = c.id; return b; }));
}
function showTopic(id) {
  const cat = CATEGORIES.find((c) => c.id === id);
  const li = botText(fill(t('topicIntro'), { cat: L(cat) }));
  chips(li, inCategory(id).slice(0, 8));
  say(fill(t('topicIntro'), { cat: L(cat) }));
}

// ---------- Inactivité : fenêtre après 45 s, puis fin de session ----------
function resetIdle() {
  clearTimeout(state.idleTimer);
  if (!['start', 'chat'].includes($('.screen.active')?.id) || !$('#idle').hidden) return;
  state.idleTimer = setTimeout(() => {
    if ('speechSynthesis' in window && speechSynthesis.speaking) return resetIdle(); // Gee-Gee parle encore
    let left = IDLE_COUNTDOWN;
    $('#idle').hidden = false;
    const tick = () => { $('#idleText').textContent = fill(t('idleText'), { s: left }); if (left-- <= 0) { hideIdle(); state.session ? endSession() : attract(); } };
    tick(); state.countdown = setInterval(tick, 1000);
    $('#stayBtn').focus();
  }, IDLE_MS);
}
function hideIdle() { $('#idle').hidden = true; clearInterval(state.countdown); }

// ---------- Tableau de bord ----------
function openAdmin() {
  const s = stats(), S = t('stats');
  const top = Object.entries(s.top).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, n]) => `${L(byId(id)?.question) || id} (${n})`).join(' · ') || '—';
  const rows = [[S.sessions, s.sessions], [S.questions, s.questions], [S.unanswered, s.unanswered], [S.qr, s.qr], [S.up, s.up], [S.down, s.down],
    [S.ratings, s.ratings.join(' / ')], [S.profiles, Object.entries(s.profiles).map(([k, v]) => `${TEXT[state.lang].profiles[k] || k} ${v}`).join(' · ') || '—'],
    [S.langs, Object.entries(s.langs).map(([k, v]) => `${k.toUpperCase()} ${v}`).join(' · ') || '—'], [S.top, top]];
  $('#stats').replaceChildren(...rows.flatMap(([k, v]) => [el('dt', null, k), el('dd', null, String(v))]));
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
  $('#askForm').addEventListener('submit', (e) => { e.preventDefault(); const v = $('#askInput').value; $('#askInput').value = ''; ask(v); });
  $('#micBtn').addEventListener('click', () => listen(state.lang, {
    onState: (on) => { $('#micBtn').classList.toggle('on', on); $('#askInput').placeholder = on ? t('listening') : t('askPh'); },
    onText: (txt) => ask(txt),
    onError: (err) => { if (err !== 'aborted') botText(t('micError')); }
  }));
  $('#log').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.q) ask('', b.dataset.q);
    if (b.dataset.fb) {
      const box = b.closest('.fb'); if (box.dataset.done) return;
      box.dataset.done = '1'; bump((s) => { s[b.dataset.fb]++; });
      box.replaceChildren(t('thanksFb'));
    }
  });
  $('#topics').addEventListener('click', (e) => { const b = e.target.closest('[data-cat]'); if (b) showTopic(b.dataset.cat); });
  $('#langBtn').addEventListener('click', () => { state.lang = state.lang === 'fr' ? 'en' : 'fr'; applyText(); });
  const scale = (d) => { state.scale = Math.min(1.6, Math.max(0.85, state.scale + d)); document.documentElement.style.setProperty('--scale', state.scale); };
  $('#textUp').addEventListener('click', () => scale(0.15));
  $('#textDown').addEventListener('click', () => scale(-0.15));
  $('#contrastBtn').addEventListener('click', (e) => { const on = document.body.classList.toggle('contrast'); e.currentTarget.setAttribute('aria-pressed', String(on)); });
  $('#voiceBtn').addEventListener('click', (e) => {
    state.voice = !state.voice; e.currentTarget.setAttribute('aria-pressed', String(state.voice));
    if (!state.voice) { stopSpeaking(); gg?.stopTalking(); }
  });
  $('#endBtn').addEventListener('click', endSession);
  $('#stayBtn').addEventListener('click', () => { hideIdle(); resetIdle(); });
  $('#rating').addEventListener('click', (e) => {
    const b = e.target.closest('[data-rate]'); if (!b || $('#rating [aria-pressed="true"]')) return;
    b.setAttribute('aria-pressed', 'true'); bump((s) => { s.ratings[Number(b.dataset.rate)]++; });
  });
  $('#doneBtn').addEventListener('click', () => { clearInterval(state.countdown); attract(); });
  let taps = [];
  $('#brand').addEventListener('click', () => { const n = Date.now(); taps = [...taps.filter((x) => n - x < 3000), n]; if (taps.length >= 5) { taps = []; openAdmin(); } });
  document.addEventListener('keydown', (e) => { if (e.shiftKey && e.key.toLowerCase() === 'a' && document.activeElement?.tagName !== 'INPUT') openAdmin(); });
  $('#closeAdmin').addEventListener('click', () => { $('#admin').hidden = true; });
  $('#resetStats').addEventListener('click', () => { try { localStorage.removeItem(STATS_KEY); } catch { /* rien */ } openAdmin(); });
}

bind();
attract();
window.HoloGuide = { findAnswer, ask, gg, state }; // accès pour les tests
