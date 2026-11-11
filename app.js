/* HoloGuide — borne holographique d'information uOttawa × INNOVA (GNG1503, équipe AVENGERS AF23).
   Tout fonctionne dans le navigateur, sans serveur ni compte : rien ne quitte la borne. */
(() => {
  'use strict';
  const KB = window.HG_KB || [];
  const CATS = window.HG_CATEGORIES || [];
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // ---------- Textes FR / EN ----------
  const T = {
    fr: {
      ssTitle: 'Bonjour ! Touche l\'écran pour me poser une question.', ssSub: 'Hello! Touch the screen to ask me a question.',
      wTitle: 'Bienvenue !', chooseLang: 'Choisis ta langue', chooseProfile: 'Tu es…', chooseAvatar: 'Choisis ton guide',
      pStudent: 'Étudiant·e', pStaff: 'Employé·e / prof', pVisitor: 'Visiteur·euse', start: 'Commencer',
      privacy: 'Aucune donnée personnelle n\'est demandée ni conservée.', end: 'Terminer', send: 'Envoyer',
      askPh: 'Écris ta question…', askLabel: 'Ta question', mic: 'Parler', contrast: 'Contraste élevé', voice: 'Voix',
      transcript: 'Transcription', sTitle: 'Merci de ta visite !',
      sQr: 'Scanne ce code QR pour garder un résumé de notre conversation et les liens officiels.',
      qrAlt: 'Code QR du résumé', qrEmpty: 'Aucune question posée : pas de résumé à exporter.',
      rate: 'Comment s\'est passée ta visite ?', done: 'Terminer', idleTitle: 'Es-tu toujours là ?',
      idleText: 'La session se termine dans', stay: 'Je suis là', autoClose: 'Retour à l\'accueil dans {n} s.',
      greet: { etudiant: 'Salut ! Je suis {name}, ton guide du campus. Pose-moi une question à l\'écrit, à la voix ou touche un sujet.',
        employe: 'Bonjour ! Je suis {name}. Je peux vous aider à trouver un pavillon, un service ou une ressource TI.',
        visiteur: 'Bienvenue à l\'Université d\'Ottawa ! Je suis {name}. Je peux vous orienter sur le campus.' },
      source: 'Source officielle', verified: 'vérifié le', useful: 'Utile ?', related: 'Questions liées',
      topics: 'Sujets', ms: 'ms',
      notFound: 'Désolé, je n\'ai pas trouvé de réponse officielle à cette question. Je te recommande de contacter InfoService, le service d\'information de l\'Université : il saura te guider.',
      sensitive: 'Je ne suis pas la bonne ressource pour parler de santé mentale, mais tu n\'es pas seul·e. Le Centre de santé et de bien-être étudiant offre du soutien et du counselling. En cas d\'urgence, appelle le 911.',
      hello: 'Bonjour ! Comment puis-je t\'aider ?', thanks: 'Avec plaisir ! As-tu une autre question ?',
      timeNotice: 'Pour laisser la place aux autres, pense à terminer la session bientôt. Tu pourras garder un résumé avec le code QR.',
      catPrompt: 'Voici des questions sur « {cat} » :', qrTitle: 'HoloGuide uOttawa – résumé', micNo: 'La reconnaissance vocale n\'est pas offerte sur ce navigateur.',
      tips: ['Je réponds en français et en anglais.', 'Je te montre le plan des pavillons.', 'Garde un résumé avec un code QR à la fin.', 'Aucune donnée personnelle n\'est conservée.']
    },
    en: {
      ssTitle: 'Hello! Touch the screen to ask me a question.', ssSub: 'Bonjour ! Touche l\'écran pour me poser une question.',
      wTitle: 'Welcome!', chooseLang: 'Choose your language', chooseProfile: 'You are…', chooseAvatar: 'Choose your guide',
      pStudent: 'Student', pStaff: 'Staff / professor', pVisitor: 'Visitor', start: 'Start',
      privacy: 'No personal information is requested or stored.', end: 'End', send: 'Send',
      askPh: 'Type your question…', askLabel: 'Your question', mic: 'Speak', contrast: 'High contrast', voice: 'Voice',
      transcript: 'Transcript', sTitle: 'Thanks for visiting!',
      sQr: 'Scan this QR code to keep a summary of our conversation and the official links.',
      qrAlt: 'Summary QR code', qrEmpty: 'No questions asked: nothing to export.',
      rate: 'How was your visit?', done: 'Finish', idleTitle: 'Are you still there?',
      idleText: 'The session ends in', stay: 'I\'m here', autoClose: 'Back to the start screen in {n} s.',
      greet: { etudiant: 'Hi! I\'m {name}, your campus guide. Ask me by typing, by voice, or tap a topic.',
        employe: 'Hello! I\'m {name}. I can help you find a building, a service or an IT resource.',
        visiteur: 'Welcome to the University of Ottawa! I\'m {name}. I can help you find your way on campus.' },
      source: 'Official source', verified: 'verified on', useful: 'Helpful?', related: 'Related questions',
      topics: 'Topics', ms: 'ms',
      notFound: 'Sorry, I couldn\'t find an official answer to that question. I recommend contacting InfoService, the University information service: they will point you in the right direction.',
      sensitive: 'I\'m not the right resource to talk about mental health, but you are not alone. The Student Health and Wellness Centre offers support and counselling. In an emergency, call 911.',
      hello: 'Hello! How can I help you?', thanks: 'You\'re welcome! Do you have another question?',
      timeNotice: 'To give others a turn, please end the session soon. You can keep a summary with the QR code.',
      catPrompt: 'Here are questions about "{cat}":', qrTitle: 'HoloGuide uOttawa – summary', micNo: 'Speech recognition is not available in this browser.',
      tips: ['I answer in English and French.', 'I show you building floor plans.', 'Keep a summary with a QR code at the end.', 'No personal data is stored.']
    }
  };
  const INFOSERVICE = { label: 'InfoService — uOttawa', url: 'https://www.uottawa.ca/en/contact/infoservice' };
  const WELLNESS = { label: { fr: 'Centre de santé et de bien-être étudiant', en: 'Student Health and Wellness Centre' },
    url: 'https://www.uottawa.ca/campus-life/health-wellness/student-health-wellness-centre' };

  // ---------- Avatars ----------
  // Avatar principal : humain 3D réaliste (avatar3d.js). Le dessin SVG ci-dessous ne sert qu'en secours sans WebGL.
  const AVATARS = [
    // Mascotte Gee-Gee (mascot.js) : guide par défaut, voix masculine un peu plus aiguë et enjouée.
    { id: 'geegee', name: 'Gee-Gee', gender: 'M', pitch: 1.15, portrait: 'assets/portrait-geegee.jpg', skin: '#e9e4dc', hair: '#8f001a', shirt: '#8f001a', style: 'short' },
    { id: 'maya', name: 'Maya', gender: 'F', portrait: 'assets/portrait-maya.jpg', skin: '#f0c8ad', hair: '#9a5a44', shirt: '#4a4f57', style: 'long' },
    { id: 'alex', name: 'Alex', gender: 'M', portrait: 'assets/portrait-alex.jpg', skin: '#f1c6a8', hair: '#a8592c', shirt: '#5a0a18', style: 'short' }
  ];
  const A3 = () => (window.HG3D && window.HG3D.ready ? window.HG3D : null);
  function avatarSVG(a) {
    const hair = {
      short: `<path d="M62 70c0-30 22-46 48-46s48 16 48 46c-8-12-22-20-48-20s-40 8-48 20z" fill="${a.hair}"/>`,
      long: `<path d="M58 78c0-34 22-54 52-54s52 20 52 54v70c-8 4-14 2-16-6V82c-10-14-24-20-36-20s-26 6-36 20v60c-2 8-8 10-16 6z" fill="${a.hair}"/>`,
      curly: `<g fill="${a.hair}">${[70, 86, 102, 118, 134, 150].map((x, i) => `<circle cx="${x}" cy="${44 + (i % 2) * 6}" r="14"/>`).join('')}<circle cx="64" cy="64" r="12"/><circle cx="156" cy="64" r="12"/></g>`
    }[a.style];
    return `<svg viewBox="0 0 220 300" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <g class="av-body">
    <path d="M30 300c4-58 36-86 80-86s76 28 80 86z" fill="${a.shirt}"/>
    <path d="M92 214h36l-6 22h-24z" fill="${a.skin}"/>
    <g class="av-arm"><path d="M186 300c6-40 2-66-6-80l-14 6c6 16 8 40 2 74z" fill="${a.shirt}"/></g>
    <g class="av-head">
      <rect x="96" y="176" width="28" height="44" rx="10" fill="${a.skin}"/>
      <ellipse cx="110" cy="112" rx="46" ry="56" fill="${a.skin}"/>
      <ellipse cx="64" cy="116" rx="7" ry="11" fill="${a.skin}"/><ellipse cx="156" cy="116" rx="7" ry="11" fill="${a.skin}"/>
      ${hair}
      <g class="av-eyes" fill="#1a1a1a"><ellipse cx="92" cy="112" rx="5.5" ry="6.5"/><ellipse cx="128" cy="112" rx="5.5" ry="6.5"/>
        <circle cx="94" cy="110" r="1.6" fill="#fff"/><circle cx="130" cy="110" r="1.6" fill="#fff"/></g>
      <path d="M84 98q8-6 16 0M120 98q8-6 16 0" stroke="${a.hair}" stroke-width="3.5" fill="none" stroke-linecap="round"/>
      <path d="M110 118q-4 14 2 16" stroke="rgba(0,0,0,.25)" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <g class="av-mouth" data-v="0">
        <path class="m0" d="M96 146q14 10 28 0" stroke="#7a2e2e" stroke-width="3.5" fill="none" stroke-linecap="round"/>
        <path class="m1" d="M98 144q12 10 24 0q-12 4-24 0z" fill="#5a1f1f"/>
        <path class="m2" d="M96 142q14 18 28 0q-14 4-28 0z" fill="#5a1f1f"/>
        <path class="m3" d="M104 141a6 7 0 1 0 12 0a6 7 0 1 0 -12 0z" fill="#5a1f1f"/>
      </g>
    </g>
  </g></svg>`;
  }

  // ---------- État ----------
  const state = { lang: 'fr', profile: 'etudiant', avatar: AVATARS[0], voice: true, scale: 1, contrast: false,
    session: null, idleTimer: null, idleCountdown: null, timeNoticeTimer: null };
  const t = (k) => T[state.lang][k];
  const L = (o) => (o && typeof o === 'object') ? (o[state.lang] || o.fr) : o;

  // ---------- Statistiques (indicateurs de succès demandés par le client) ----------
  const STATS_KEY = 'hologuide-stats-v1';
  const emptyStats = () => ({ sessions: 0, questions: 0, unanswered: 0, qr: 0, up: 0, down: 0, ratings: [0, 0, 0], top: {}, profiles: {}, langs: {} });
  function loadStats() { try { return { ...emptyStats(), ...JSON.parse(localStorage.getItem(STATS_KEY) || '{}') }; } catch { return emptyStats(); } }
  function bump(fn) { const s = loadStats(); fn(s); try { localStorage.setItem(STATS_KEY, JSON.stringify(s)); } catch { /* stockage indisponible : on continue */ } }

  // ---------- Recherche de réponse ----------
  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const STOP = new Set('le la les un une des de du et ou a au aux en est sont que qui quoi ou comment je tu il on mon ma mes ton ta pour sur dans the a an of to is are what where how do i my in on for and can'.split(' '));
  const tokens = (s) => norm(s).split(' ').filter((w) => w.length > 2 && !STOP.has(w));
  const INDEX = KB.map((e) => ({
    e,
    kw: (e.keywords || []).map(norm).filter(Boolean),
    qt: new Set([...tokens(e.question.fr), ...tokens(e.question.en)])
  }));
  const SENSITIVE = ['sante mentale', 'mental health', 'suicide', 'suicidaire', 'depression', 'deprime', 'anxiete', 'anxiety', 'detresse', 'me tuer', 'kill myself', 'self harm', 'automutilation', 'counselling', 'psychologue'];
  const HELLO = ['bonjour', 'salut', 'allo', 'hello', 'hi', 'hey', 'bonsoir'];
  const THANKS = ['merci', 'thanks', 'thank you', 'super merci'];

  function findAnswer(q) {
    const n = ` ${norm(q)} `;
    if (SENSITIVE.some((k) => n.includes(` ${k} `) || n.includes(` ${k}`))) return { type: 'sensitive' };
    const qt = tokens(q);
    let best = null, bestScore = 0;
    for (const it of INDEX) {
      let s = 0;
      for (const k of it.kw) {
        if (n.includes(` ${k} `)) s += 3 + k.split(' ').length * 2;
        else if (k.length > 4 && n.includes(k)) s += 2;
      }
      for (const w of qt) if (it.qt.has(w)) s += 1;
      if (s > bestScore) { bestScore = s; best = it.e; }
    }
    if (bestScore >= 3) return { type: 'kb', entry: best };
    const words = n.trim().split(' ');
    if (words.length <= 3 && HELLO.some((h) => n.includes(` ${h} `))) return { type: 'hello' };
    if (THANKS.some((h) => n.includes(` ${h} `))) return { type: 'thanks' };
    return { type: 'none' };
  }
  // shortcut: correspondance par mots-clés, sans IA ; à remplacer par une recherche sémantique si la base dépasse quelques centaines d'entrées.

  // ---------- Avatar : parole et lèvres ----------
  let mouthTimer = null;
  const mouths = () => $$('.av-mouth');
  const setMouth = (v) => mouths().forEach((m) => { m.dataset.v = v; });
  function visemeFor(word) {
    const w = norm(word);
    if (/[ou]/.test(w[w.length - 1] || '') || /ou|o$/.test(w)) return 3;
    if (/[aei]/.test(w)) return w.length > 4 ? 2 : 1;
    return 1;
  }
  function animateMouth(text, ms) {
    clearInterval(mouthTimer);
    const words = text.split(/\s+/);
    let i = 0;
    $$('.avatar-slot').forEach((s) => s.classList.add('speaking'));
    mouthTimer = setInterval(() => {
      const w = words[i % words.length] || '';
      setMouth(i % 3 === 2 ? 0 : visemeFor(w));
      i++;
    }, 140);
    if (ms) setTimeout(stopMouth, ms);
  }
  function stopMouth() {
    clearInterval(mouthTimer); setMouth(0);
    A3()?.stop();
    $$('.avatar-slot').forEach((s) => s.classList.remove('speaking'));
  }
  // Voix : la bonne langue, puis les voix neuronales (« Natural », Edge), puis une voix du même genre que l'avatar.
  const VOICE_F = /sylvie|caroline|clara|denise|eloise|vivienne|amélie|amelie|aurélie|aurelie|hortense|julie|zira|aria|jenny|michelle|ava|emma|samantha|karen|linda|heather|female|femme/i;
  const VOICE_M = /antoine|jean|thierry|claude|liam|guy|paul|henri|remy|rémy|nicolas|thomas|daniel|eric|andrew|brian|christopher|roger|steffan|david|mark|richard|male|homme/i;
  function pickVoice() {
    const vs = speechSynthesis.getVoices();
    const want = state.lang === 'fr' ? ['fr-CA', 'fr-FR', 'fr'] : ['en-CA', 'en-US', 'en'];
    const same = state.avatar.gender === 'M' ? VOICE_M : VOICE_F;
    const other = state.avatar.gender === 'M' ? VOICE_F : VOICE_M;
    let best = null, bestScore = -1;
    for (const v of vs) {
      const lang = v.lang.replace('_', '-');
      const li = want.findIndex((p) => lang.startsWith(p));
      if (li < 0) continue;
      let s = (3 - li) * 10;
      if (/natural|online|neural|premium|enhanced/i.test(v.name)) s += 25;
      if (same.test(v.name)) s += 15; else if (other.test(v.name)) s -= 15;
      if (s > bestScore) { bestScore = s; best = v; }
    }
    return best;
  }
  function speak(text) {
    const sub = $('#subtitle');
    sub.textContent = text;
    const lang = state.lang;
    const rate = 1.05;
    const estimate = Math.min(16000, 400 + text.length * 62 / rate);
    const a3 = A3();
    if (!state.voice || !('speechSynthesis' in window)) {
      if (a3) { a3.startTalk(); a3.sentence(text, lang, estimate); } else animateMouth(text, Math.min(estimate, 3500));
      return;
    }
    speechSynthesis.cancel();
    a3?.stop();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === 'fr' ? 'fr-CA' : 'en-CA';
    const v = pickVoice(); if (v) u.voice = v;
    u.rate = rate;
    // Pas de voix du bon genre : on ajuste légèrement la hauteur.
    if (!v || !(state.avatar.gender === 'M' ? VOICE_M : VOICE_F).test(v.name)) u.pitch = state.avatar.gender === 'M' ? 0.85 : 1.1;
    if (state.avatar.pitch) u.pitch = state.avatar.pitch;
    let words = false, fallback = null;
    u.onstart = () => {
      if (!a3) { animateMouth(text); return; }
      a3.startTalk();
      // Certaines voix réseau n'envoient pas d'événements de mots : lèvres estimées sur toute la phrase.
      fallback = setTimeout(() => { if (!words) a3.sentence(text, lang, estimate); }, 300);
    };
    u.onboundary = (e) => {
      if (e.name !== 'word') return;
      words = true;
      const w = (e.charLength ? text.substr(e.charIndex, e.charLength) : text.substr(e.charIndex, 20).split(/[\s,.;:!?«»]/)[0]);
      if (a3) a3.word(w, lang, rate); else setMouth(visemeFor(w));
    };
    u.onend = u.onerror = () => { clearTimeout(fallback); if (a3) a3.stop(); else stopMouth(); };
    speechSynthesis.speak(u);
    setTimeout(() => { if (!speechSynthesis.speaking) { if (a3) a3.stop(); else stopMouth(); } }, estimate + 1500); // garde-fou si onend ne vient pas
  }
  function mountAvatars() {
    $$('.avatar-slot').forEach((s) => { s.querySelector('svg')?.remove(); s.insertAdjacentHTML('afterbegin', avatarSVG(state.avatar)); });
  }
  // Place l'unique scène 3D dans l'écran affiché (veille : plan plus large ; conversation : buste).
  function mount3D(screenId) {
    const a3 = A3(); if (!a3) return;
    const slot = $(`#${screenId} .avatar-slot`);
    if (slot) a3.mount(slot, screenId === 'screensaver' ? 'mid' : 'upper');
  }
  function wave() {
    const a3 = A3();
    if (a3) { a3.react('hello'); return; }
    $$('.avatar-slot').forEach((s) => { s.classList.remove('waving'); void s.offsetWidth; s.classList.add('waving'); });
  }

  // ---------- Écrans ----------
  function show(id) {
    $$('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
    mount3D(id);
    resetIdle();
  }
  function applyI18n() {
    document.documentElement.lang = state.lang;
    $$('[data-i18n]').forEach((el) => { const v = t(el.dataset.i18n); if (typeof v === 'string') el.textContent = v; });
    $$('[data-i18n-ph]').forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
    $$('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
    $('#langToggle').textContent = state.lang === 'fr' ? 'EN' : 'FR';
    renderMenu();
  }

  // ---------- Écran de veille ----------
  let tipTimer = null;
  function startScreensaver() {
    clearTimeout(state.timeNoticeTimer);
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    stopMouth();
    state.session = null;
    state.lang = 'fr';
    applyI18n();
    show('screensaver');
    let i = 0;
    const tips = () => [...T.fr.tips.map((x, k) => `${x} · ${T.en.tips[k]}`), ...KB.slice(0, 8).map((e) => `« ${e.question.fr} »`)];
    clearInterval(tipTimer);
    const tick = () => {
      const list = tips(); $('#ssTip').textContent = list[i++ % list.length];
      if (i % 3 === 0) wave(); // l'avatar salue de temps en temps pour attirer les passants
    };
    tick(); tipTimer = setInterval(tick, 6000);
  }
  function leaveScreensaver() {
    clearInterval(tipTimer);
    show('welcome');
    markChoices();
  }

  // ---------- Accueil ----------
  function markChoices() {
    $$('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === state.lang)));
    $$('[data-profile]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.profile === state.profile)));
    $$('[data-avatar]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.avatar === state.avatar.id)));
  }
  function renderAvatarChoices() {
    $('#avatarChoices').innerHTML = AVATARS.map((a) =>
      `<button class="choice avatar-pick" data-avatar="${a.id}"><img src="${a.portrait}" alt=""><span>${a.name}</span></button>`).join('');
  }

  // ---------- Conversation ----------
  const PROFILE_ORDER = {
    etudiant: ['cours', 'examens', 'bibliotheques', 'batiments', 'services', 'finances', 'logement', 'associations', 'ti', 'transport', 'sante', 'calendrier', 'reglements', 'evenements', 'international', 'programmes', 'genie', 'admissions', 'borne'],
    employe: ['ti', 'batiments', 'transport', 'services', 'bibliotheques', 'evenements', 'calendrier', 'sante', 'reglements', 'cours', 'borne'],
    visiteur: ['batiments', 'transport', 'evenements', 'admissions', 'programmes', 'international', 'services', 'bibliotheques', 'borne']
  };
  function orderedCats() {
    const order = PROFILE_ORDER[state.profile] || [];
    const used = new Set(KB.map((e) => e.category));
    const ids = [...order, ...CATS.map((c) => c.id).filter((id) => !order.includes(id))].filter((id) => used.has(id));
    return ids.map((id) => CATS.find((c) => c.id === id)).filter(Boolean);
  }
  function renderMenu() {
    const m = $('#menu'); if (!m) return;
    m.setAttribute('aria-label', t('topics'));
    m.innerHTML = orderedCats().map((c) => `<button class="chip" data-cat="${c.id}">${L(c)}</button>`).join('');
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function addMsg(role, html) {
    const li = document.createElement('li');
    li.className = `msg ${role}`;
    li.innerHTML = html;
    $('#transcript').appendChild(li);
    li.scrollIntoView({ behavior: 'smooth', block: 'end' });
    return li;
  }
  function chipsHTML(entries, label) {
    if (!entries.length) return '';
    return `<div class="chips" aria-label="${esc(label)}">${entries.map((e) => `<button class="chip" data-q="${e.id}">${esc(L(e.question))}</button>`).join('')}</div>`;
  }
  function botAnswer(entry, ms) {
    const text = L(entry.answer);
    const sources = (entry.sources || []).map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(L(s.label))}</a>`).join(' · ');
    const img = entry.image ? `<img src="${esc(entry.image.src)}" alt="${esc(L(entry.image.alt))}" loading="lazy">` : '';
    const related = (entry.related || []).map((id) => KB.find((e) => e.id === id)).filter(Boolean).slice(0, 3);
    const li = addMsg('bot', `<p>${esc(text)}</p>${img}
      ${sources ? `<p class="src">${t('source')} : ${sources}${entry.verifiedOn ? ` · ${t('verified')} ${esc(entry.verifiedOn)}` : ''}</p>` : ''}
      <div class="meta"><span>${t('useful')}</span>
        <button class="fb" data-fb="up" aria-pressed="false" aria-label="Oui / Yes">👍</button>
        <button class="fb" data-fb="down" aria-pressed="false" aria-label="Non / No">👎</button>
        <span>· ${ms} ${t('ms')}</span></div>
      ${chipsHTML(related, t('related'))}`);
    li.dataset.id = entry.id;
    speak(text);
  }
  function botSimple(text, link) {
    addMsg('bot', `<p>${esc(text)}</p>${link ? `<p class="src">${t('source')} : <a href="${esc(link.url)}" target="_blank" rel="noopener">${esc(L(link.label))}</a></p>` : ''}`);
    speak(text);
  }
  function ask(q, entryId) {
    q = q.trim(); if (!q && !entryId) return;
    const t0 = performance.now();
    const res = entryId ? { type: 'kb', entry: KB.find((e) => e.id === entryId) } : findAnswer(q);
    const shown = entryId ? L(res.entry.question) : q;
    addMsg('user', `<p>${esc(shown)}</p>`);
    const ms = Math.max(1, Math.round(performance.now() - t0));
    const sess = state.session;
    if (res.type === 'kb') {
      sess.items.push({ q: L(res.entry.question), url: (res.entry.sources || [])[0]?.url || '' });
      bump((s) => { s.questions++; s.top[res.entry.id] = (s.top[res.entry.id] || 0) + 1; });
      botAnswer(res.entry, ms);
      A3()?.react('answer');
    } else if (res.type === 'sensitive') {
      bump((s) => { s.questions++; });
      sess.items.push({ q: shown, url: WELLNESS.url });
      botSimple(t('sensitive'), WELLNESS);
      A3()?.react('sensitive');
    } else if (res.type === 'hello') { botSimple(t('hello')); wave(); }
    else if (res.type === 'thanks') { botSimple(t('thanks')); A3()?.react('thanks'); }
    else {
      A3()?.react('none');
      bump((s) => { s.questions++; s.unanswered++; });
      sess.items.push({ q: shown, url: INFOSERVICE.url });
      botSimple(t('notFound'), INFOSERVICE);
    }
  }
  function showCategory(id) {
    const c = CATS.find((x) => x.id === id);
    const list = KB.filter((e) => e.category === id);
    const text = t('catPrompt').replace('{cat}', L(c));
    addMsg('bot', `<p>${esc(text)}</p>${chipsHTML(list, L(c))}`);
    $('#subtitle').textContent = text;
  }
  function startSession() {
    state.session = { started: Date.now(), items: [] };
    bump((s) => { s.sessions++; s.profiles[state.profile] = (s.profiles[state.profile] || 0) + 1; s.langs[state.lang] = (s.langs[state.lang] || 0) + 1; });
    $('#transcript').innerHTML = '';
    mountAvatars();
    applyI18n();
    show('chat');
    const greet = t('greet')[state.profile].replace('{name}', state.avatar.name);
    const firstCat = orderedCats()[0];
    const starters = firstCat ? KB.filter((e) => e.category === firstCat.id).slice(0, 2) : [];
    const extra = KB.filter((e) => ['carte-campus', 'resume-qr'].includes(e.id));
    addMsg('bot', `<p>${esc(greet)}</p>${chipsHTML([...starters, ...extra], t('related'))}`);
    wave(); speak(greet);
    clearTimeout(state.timeNoticeTimer);
    state.timeNoticeTimer = setTimeout(() => { if (state.session) botSimple(t('timeNotice')); }, 3 * 60 * 1000);
  }

  // ---------- Fin de session : code QR ----------
  let closeTimer = null;
  function endSession() {
    hideIdle();
    clearTimeout(state.timeNoticeTimer);
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    stopMouth();
    const items = state.session ? state.session.items : [];
    const qr = $('#qr');
    qr.innerHTML = '';
    $('#qrEmpty').hidden = items.length > 0;
    if (items.length) {
      const date = new Date().toLocaleDateString(state.lang === 'fr' ? 'fr-CA' : 'en-CA');
      let lines = items.map((it, i) => `${i + 1}. ${it.q}${it.url ? `\n${it.url}` : ''}`);
      let text = `${t('qrTitle')} (${date})\n${lines.join('\n')}`;
      // Un QR lisible au téléphone tient environ 1 200 octets : on garde les questions les plus récentes.
      while (new TextEncoder().encode(text).length > 1200 && lines.length > 1) { lines = lines.slice(1); text = `${t('qrTitle')} (${date})\n…\n${lines.join('\n')}`; }
      qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
      const code = qrcode(0, 'M'); code.addData(text); code.make();
      qr.innerHTML = code.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
      bump((s) => { s.qr++; });
    }
    state.session = null;
    $$('#rating .choice').forEach((b) => b.setAttribute('aria-pressed', 'false'));
    show('summary');
    let n = 45;
    const upd = () => { $('#autoClose').textContent = t('autoClose').replace('{n}', n); };
    upd(); clearInterval(closeTimer);
    closeTimer = setInterval(() => { n--; upd(); if (n <= 0) { clearInterval(closeTimer); startScreensaver(); } }, 1000);
  }

  // ---------- Inactivité ----------
  const IDLE_MS = { welcome: 60000, chat: 45000 };
  function resetIdle() {
    clearTimeout(state.idleTimer);
    const cur = $('.screen.active')?.id;
    if (!IDLE_MS[cur] || !$('#idleModal').hidden) return;
    state.idleTimer = setTimeout(() => (cur === 'chat' ? showIdle() : startScreensaver()), IDLE_MS[cur]);
  }
  function showIdle() {
    if ('speechSynthesis' in window && speechSynthesis.speaking) { resetIdle(); return; }
    $('#idleModal').hidden = false;
    $('#stayBtn').focus();
    let n = 15; $('#idleCount').textContent = n;
    clearInterval(state.idleCountdown);
    state.idleCountdown = setInterval(() => { n--; $('#idleCount').textContent = n; if (n <= 0) { hideIdle(); endSession(); } }, 1000);
  }
  function hideIdle() { clearInterval(state.idleCountdown); $('#idleModal').hidden = true; }

  // ---------- Reconnaissance vocale ----------
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec = null;
  function toggleMic() {
    if (!SR) { botSimple(t('micNo')); return; }
    if (rec) { rec.stop(); return; }
    rec = new SR();
    rec.lang = state.lang === 'fr' ? 'fr-CA' : 'en-CA';
    rec.interimResults = true;
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    $('#micBtn').setAttribute('aria-pressed', 'true');
    rec.onresult = (e) => {
      const r = e.results[e.results.length - 1];
      $('#askInput').value = r[0].transcript;
      if (r.isFinal) { ask(r[0].transcript); $('#askInput').value = ''; }
    };
    rec.onend = rec.onerror = () => { $('#micBtn').setAttribute('aria-pressed', 'false'); rec = null; };
    rec.start();
  }

  // ---------- Tableau de bord ----------
  function openAdmin() {
    const s = loadStats();
    const top = Object.entries(s.top).sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([id, n]) => `${KB.find((e) => e.id === id)?.question.fr || id} (${n})`).join('<br>') || '—';
    const avg = s.ratings.reduce((a, n, i) => a + n * (i + 1), 0) / (s.ratings.reduce((a, n) => a + n, 0) || 1);
    const rows = [
      ['Sessions', s.sessions], ['Questions posées', s.questions], ['Sans réponse officielle', s.unanswered],
      ['Codes QR générés', s.qr], ['👍 / 👎', `${s.up} / ${s.down}`], ['Satisfaction moyenne (sur 3)', avg ? avg.toFixed(2) : '—'],
      ['Profils', Object.entries(s.profiles).map(([k, v]) => `${k} ${v}`).join(', ') || '—'],
      ['Langues', Object.entries(s.langs).map(([k, v]) => `${k} ${v}`).join(', ') || '—'], ['Questions populaires', top]
    ];
    $('#stats').innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
    $('#adminModal').hidden = false;
  }

  // ---------- Événements ----------
  function bind() {
    ['pointerdown', 'keydown'].forEach((ev) => document.addEventListener(ev, () => { if ($('#idleModal').hidden) resetIdle(); }, true));
    $('#screensaver').addEventListener('click', leaveScreensaver);
    $('#screensaver').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') leaveScreensaver(); });

    $('#welcome').addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.lang) { state.lang = b.dataset.lang; applyI18n(); }
      if (b.dataset.profile) state.profile = b.dataset.profile;
      if (b.dataset.avatar) { state.avatar = AVATARS.find((a) => a.id === b.dataset.avatar); A3()?.use(state.avatar.id); mountAvatars(); }
      markChoices();
    });
    $('#startBtn').addEventListener('click', startSession);

    $('#askForm').addEventListener('submit', (e) => { e.preventDefault(); const v = $('#askInput').value; $('#askInput').value = ''; ask(v); });
    $('#micBtn').addEventListener('click', toggleMic);
    $('#chat').addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.q) ask('', b.dataset.q);
      if (b.dataset.cat) showCategory(b.dataset.cat);
      if (b.dataset.fb) {
        const li = b.closest('.msg'); if (li.dataset.rated) return;
        li.dataset.rated = '1'; b.setAttribute('aria-pressed', 'true');
        bump((s) => { s[b.dataset.fb]++; });
      }
    });
    $('#langToggle').addEventListener('click', () => { state.lang = state.lang === 'fr' ? 'en' : 'fr'; applyI18n(); });
    $('#textUp').addEventListener('click', () => setScale(state.scale + 0.15));
    $('#textDown').addEventListener('click', () => setScale(state.scale - 0.15));
    $('#contrastBtn').addEventListener('click', (e) => {
      state.contrast = !state.contrast; document.body.classList.toggle('contrast', state.contrast);
      e.currentTarget.setAttribute('aria-pressed', String(state.contrast));
    });
    $('#voiceBtn').addEventListener('click', (e) => {
      state.voice = !state.voice; if (!state.voice && 'speechSynthesis' in window) { speechSynthesis.cancel(); A3()?.stop(); }
      e.currentTarget.setAttribute('aria-pressed', String(state.voice));
    });
    $('#endBtn').addEventListener('click', endSession);
    $('#stayBtn').addEventListener('click', () => { hideIdle(); resetIdle(); });

    $('#rating').addEventListener('click', (e) => {
      const b = e.target.closest('[data-rate]'); if (!b || b.getAttribute('aria-pressed') === 'true') return;
      $$('#rating .choice').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      bump((s) => { s.ratings[Number(b.dataset.rate) - 1]++; });
    });
    $('#doneBtn').addEventListener('click', () => { clearInterval(closeTimer); startScreensaver(); });

    let taps = [];
    $('.brand').addEventListener('click', () => { const now = Date.now(); taps = [...taps.filter((x) => now - x < 3000), now]; if (taps.length >= 5) { taps = []; openAdmin(); } });
    document.addEventListener('keydown', (e) => { if (e.shiftKey && e.key.toLowerCase() === 'a' && document.activeElement?.tagName !== 'INPUT') openAdmin(); });
    $('#closeAdmin').addEventListener('click', () => { $('#adminModal').hidden = true; });
    $('#resetStats').addEventListener('click', () => { try { localStorage.removeItem(STATS_KEY); } catch { /* rien */ } openAdmin(); });
    if (!SR) $('#micBtn').hidden = true;
    if ('speechSynthesis' in window) speechSynthesis.onvoiceschanged = () => {};
  }
  function setScale(v) { state.scale = Math.min(1.6, Math.max(0.85, v)); document.documentElement.style.setProperty('--scale', state.scale); }

  // ---------- Démarrage ----------
  renderAvatarChoices();
  mountAvatars();
  bind();
  startScreensaver();
  // L'avatar 3D (module chargé après ce script) remplace le dessin dès qu'il est prêt.
  function enable3D() {
    document.body.classList.add('has3d');
    window.HG3D.use(state.avatar.id).then(() => mount3D($('.screen.active')?.id || 'screensaver'))
      .catch((err) => { console.warn('Modèle 3D non chargé :', err); document.body.classList.remove('has3d'); });
  }
  if (A3()) enable3D(); else window.addEventListener('hg3d-ready', enable3D, { once: true });
  window.HoloGuide = { findAnswer, KB }; // pour les tests
})();
