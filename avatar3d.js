// Avatar humain 3D réaliste (moteur TalkingHead + three.js, servis en local).
// Expose window.HG3D, que app.js pilote : choix du modèle, placement, parole et gestes.
// Si WebGL ou le chargement échoue, app.js garde l'avatar dessiné en secours.
import { TalkingHead } from 'talkinghead';
import { Mascot } from './mascot.js';

const MODELS = {
  // Modèles d'exemple de TalkingHead (usage non commercial : Avaturn, AvatarSDK).
  maya: {
    url: './avatars/maya.glb', body: 'F', avatarMood: 'happy',
    retarget: {
      Hips: { y: 0.03 }, Spine: { y: 0.02 }, Spine1: { y: 0.02, z: 0.01 },
      Spine2: { y: 0.02, z: 0.01 }, Neck: { z: 0.02, y: 0.01 }, Head: { z: 0.02 },
      LeftShoulder: { rx: -0.5 }, RightShoulder: { rx: -0.5 }, scaleToHipsLevel: 1.0
    },
    baseline: { headRotateX: -0.05, eyeBlinkLeft: 0.15, eyeBlinkRight: 0.15 }
  },
  alex: {
    url: './avatars/alex.glb', body: 'M', avatarMood: 'happy',
    retarget: {
      Neck: { z: -0.01, rx: -0.15 }, Neck1: { z: -0.01, rx: -0.15 }, Neck2: { z: -0.01, rx: -0.15 },
      LeftShoulder: { rz: -0.3 }, RightShoulder: { rz: 0.3 }, scaleToEyesLevel: 1.0, origin: { y: -0.1 }
    },
    baseline: { headRotateX: -0.04, eyeBlinkLeft: 0.05, eyeBlinkRight: 0.05 },
    // Le t-shirt d'origine porte un logo de marque : on le remplace par un uni grenat uOttawa.
    fix(root) {
      root.traverse((o) => {
        if (o.isMesh && o.name === 'outfit_top') { o.material.map = null; o.material.color.set(0x3a0610); o.material.needsUpdate = true; }
      });
    }
  }
};

const host = document.createElement('div');
host.id = 'avatar3d';
let head = null, current = null, loading = Promise.resolve(), silence = null;
// Mascotte Gee-Gee (mascot.js) : sa propre scène dans le même cadre ; on montre l'une ou l'autre.
let mascot = null;
const isMascot = () => current === 'geegee';

function silentBuffer(ms) {
  const ctx = head.audioCtx;
  return ctx.createBuffer(1, Math.max(1, Math.ceil(ctx.sampleRate * ms / 1000)), ctx.sampleRate);
}
function speakWords(words, lang, totalMs, pad = 150) {
  // Durée de chaque mot proportionnelle à sa longueur, sur la durée totale estimée.
  const letters = words.reduce((n, w) => n + w.length + 1, 0) || 1;
  let t = 0; const wtimes = [], wdurations = [];
  for (const w of words) { const d = (w.length + 1) / letters * totalMs; wtimes.push(t); wdurations.push(Math.max(80, d - 30)); t += d; }
  head.speakAudio({ audio: silentBuffer(totalMs + pad), words, wtimes, wdurations }, { lipsyncLang: lang, isRaw: true });
}

const HG3D = {
  ready: false,
  async init() {
    head = new TalkingHead(host, {
      ttsEndpoint: null, lipsyncModules: ['fr', 'en'], lipsyncLang: 'fr',
      cameraView: 'upper', cameraRotateEnable: false, cameraPanEnable: false, cameraZoomEnable: false,
      modelPixelRatio: Math.min(2, window.devicePixelRatio || 1), modelFPS: 60,
      // Éclairage de studio doux + contre-jour froid : le personnage se détache sur le noir de la boîte.
      lightAmbientIntensity: 1.1, lightDirectColor: 0xfff4e8, lightDirectIntensity: 9,
      lightSpotColor: 0x7fdcff, lightSpotIntensity: 12, lightSpotPhi: 0.1, lightSpotTheta: 4,
      avatarIdleEyeContact: 0.6, avatarSpeakingEyeContact: 0.8, avatarIdleHeadMove: 0.4
    });
    // L'audio de TalkingHead ne sert qu'à cadencer les lèvres (son muet) : la vraie voix vient du navigateur.
    const unlock = () => { head.audioCtx.resume?.(); };
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock);
  },
  use(id) {
    if (current === id) return loading;
    if (id === 'geegee') {
      current = id;
      loading = loading.catch(() => {}).then(() => {
        mascot = mascot || new Mascot(host);
        head.stop(); head.stopSpeaking();
        host.classList.add('mascot-on');
        mascot.resize(); mascot.start();
      });
      return loading;
    }
    if (!MODELS[id]) return loading;
    current = id;
    if (mascot) { mascot.stopLoop(); host.classList.remove('mascot-on'); head.start(); }
    const cfg = MODELS[id];
    loading = loading.catch(() => {}).then(async () => {
      host.classList.add('loading');
      await head.showAvatar({ ...cfg, lipsyncLang: 'fr' });
      cfg.fix?.(head.armature);
      host.classList.remove('loading');
    });
    return loading;
  },
  mount(slot, view = 'upper') {
    if (!slot) return;
    if (host.parentNode !== slot) slot.appendChild(host);
    if (mascot) { mascot.setView(view); mascot.resize(); }
    head.setView(view);
    head.onResize();
  },
  // Début d'une réplique : regard vers la personne et gestes des mains naturels.
  startTalk() {
    if (isMascot()) return mascot.startTalk();
    head.stopSpeaking();
    head.lookAtCamera(800);
    head.makeEyeContact(2000);
    head.speakWithHands();
  },
  // Un mot vient d'être prononcé par la voix du navigateur (événement « boundary »).
  word(w, lang, rate = 1) {
    if (!w) return;
    if (isMascot()) return mascot.word(w, lang, rate);
    if (head.isSpeaking) head.stopSpeaking();
    const ms = Math.min(520, Math.max(130, w.length * 62 / rate));
    speakWords([w], lang, ms, 0); // pas de marge : le mot suivant enchaîne sans coupure
  },
  // Pas d'événements de mots (voix réseau, voix coupée) : animation estimée sur toute la phrase.
  sentence(text, lang, totalMs) {
    if (isMascot()) return mascot.sentence(text, lang, totalMs);
    head.stopSpeaking();
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length) speakWords(words, lang, totalMs);
  },
  stop() { if (isMascot()) mascot.stop(); else head.stopSpeaking(); },
  react(kind) {
    if (isMascot()) return mascot.react(kind);
    if (kind === 'hello') { head.setMood('happy'); head.playGesture('handup', 2.2); }
    else if (kind === 'thanks') { head.setMood('happy'); head.playGesture('thumbup', 2); }
    else if (kind === 'none') { head.playGesture('shrug', 2); }
    else if (kind === 'sensitive') { head.setMood('neutral'); }
    else if (kind === 'answer') { head.setMood('happy'); }
  },
  idle() { if (isMascot()) return mascot.idle(); head.setMood('happy'); head.lookAtCamera(1500); },
  get mascot() { return mascot; },
  get head() { return head; } // accès direct pour le débogage
};

try {
  const gl = document.createElement('canvas').getContext('webgl2');
  if (!gl) throw new Error('WebGL2 indisponible');
  await HG3D.init();
  window.HG3D = HG3D;
  HG3D.ready = true;
  window.dispatchEvent(new Event('hg3d-ready'));
} catch (err) {
  console.warn('Avatar 3D désactivé, avatar dessiné utilisé :', err);
}
