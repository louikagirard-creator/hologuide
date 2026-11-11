// Voix de Gee-Gee (synthèse vocale du navigateur) et micro (reconnaissance vocale), en français ou en anglais.
// Sur la borne, utiliser Edge : ses voix « Natural » (fr-CA, en-CA) sont les plus humaines et donnent le minutage de chaque mot.

const MALE = /antoine|jean|thierry|claude|liam|guy|paul|henri|remy|rémy|nicolas|thomas|daniel|eric|andrew|brian|christopher|roger|david|mark|richard|male|homme/i;
const FEMALE = /sylvie|caroline|clara|denise|eloise|vivienne|amélie|amelie|julie|zira|aria|jenny|michelle|ava|emma|samantha|karen|linda|female|femme/i;
const LOCALE = { fr: ['fr-CA', 'fr-FR', 'fr'], en: ['en-CA', 'en-US', 'en'] };

export const canSpeak = 'speechSynthesis' in window;
const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
export const canListen = !!Recognition;

// Meilleure voix : bonne langue (variante canadienne d'abord), voix neuronale, voix masculine (Gee-Gee).
function pickVoice(lang) {
  let best = null, bestScore = -Infinity;
  for (const v of speechSynthesis.getVoices()) {
    const i = LOCALE[lang].findIndex((p) => v.lang.replace('_', '-').startsWith(p));
    if (i < 0) continue;
    const s = (3 - i) * 10 + (/natural|neural|online|premium|enhanced/i.test(v.name) ? 25 : 0) + (MALE.test(v.name) ? 15 : FEMALE.test(v.name) ? -15 : 0);
    if (s > bestScore) { bestScore = s; best = v; }
  }
  return best;
}
if (canSpeak) speechSynthesis.onvoiceschanged = () => {}; // Chrome charge les voix en différé

// Lit le texte et prévient l'avatar : onStart, onWord(mot) à chaque mot prononcé, onEnd.
// Si la voix ne donne pas le minutage des mots, onNoWords(estimationMs) permet d'animer quand même la bouche.
export function speak(text, lang, { onStart, onWord, onNoWords, onEnd } = {}) {
  const rate = 1.05, estimate = Math.min(16000, 400 + text.length * 62 / rate);
  if (!canSpeak) { onNoWords?.(estimate); setTimeout(() => onEnd?.(), estimate); return; }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = LOCALE[lang][0]; u.rate = rate;
  const v = pickVoice(lang);
  if (v) u.voice = v;
  u.pitch = v && MALE.test(v.name) ? 1.12 : 0.9; // voix enjouée de mascotte
  let gotWords = false, waitWords = null, done = false;
  const finish = () => { if (done) return; done = true; clearTimeout(waitWords); onEnd?.(); };
  u.onstart = () => { onStart?.(); waitWords = setTimeout(() => { if (!gotWords) onNoWords?.(estimate); }, 300); };
  u.onboundary = (e) => {
    if (e.name !== 'word') return;
    gotWords = true;
    onWord?.(e.charLength ? text.substr(e.charIndex, e.charLength) : text.substr(e.charIndex).split(/[\s,.;:!?«»]/)[0], rate);
  };
  u.onend = u.onerror = finish;
  speechSynthesis.speak(u);
  setTimeout(() => { if (!speechSynthesis.speaking) finish(); }, estimate + 1500); // garde-fou si onend n'arrive pas
}
export function stopSpeaking() { if (canSpeak) speechSynthesis.cancel(); }

// Micro : une phrase à la fois. onText(texte final), onState(true/false) pour l'affichage.
let rec = null;
export function listen(lang, { onText, onState, onError }) {
  if (!canListen) return;
  if (rec) { rec.stop(); return; }
  rec = new Recognition();
  rec.lang = LOCALE[lang][0]; rec.interimResults = false; rec.maxAlternatives = 1;
  rec.onstart = () => onState?.(true);
  rec.onresult = (e) => onText?.(e.results[0][0].transcript);
  rec.onerror = (e) => onError?.(e.error);
  rec.onend = () => { rec = null; onState?.(false); };
  stopSpeaking();
  rec.start();
}
