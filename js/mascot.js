// Gee-Gee : mascotte 3D (cheval de dessin animé, grenat et gris uOttawa), construite en code avec three.js.
// Aucun modèle à télécharger. Gee-Gee est en pied (de la tête aux souliers), à l'échelle de la boîte Holotech d'INNOVA :
// fond transparent (le noir disparaît dans la boîte), matières peluche et tissu, ombres douces, éclairage venant du plafond.
// Design original inspiré des Gee-Gees ; la mascotte et le logo officiels demandent l'accord de l'Université.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RealHorse } from './realhorse.js';
import { attachFace } from './face.js';

const C = { garnet: 0x8f001a, garnetDark: 0x5c0010, grey: 0x6d6e71, coat: 0xece7df, muzzle: 0xf7f2eb, hoof: 0x37373a, pink: 0xeaa3b2 };
// Vrai modèle 3D de Gee-Gee : mascotte générée sur Meshy (assets/geegee.glb), avec son squelette et son animation.
// Déposer un autre fichier dans assets/ et écrire son chemin ici ; laisser null pour utiliser le Gee-Gee fait en code.
const MODEL_URL = 'assets/geegee.glb';
const MODEL_MAX_W = 2.05; // largeur maximale du modèle importé au repos (il a les bras écartés), en unités de la scène
const FIT_MARGIN = 1.1; // marge autour des mains (perspective + léger pivot du modèle) : rien ne touche le bord de la colonne
const WALK_FOR = 5;   // secondes de marche entre deux salutations de la mascotte importée, tant que personne ne l'utilise
const IDLE_PAUSE = 4; // quelques secondes debout, naturellement (regarde autour, change d'appui), avant la marche ou le salut
const FLOOR = -1.33;   // dessous des souliers = plancher de la boîte
const TOP = 2.02;      // bout des oreilles
const FIT = 1.06;      // marge au-dessus des oreilles
const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const mix = (a, b, k) => a + (b - a) * k;
const now = () => performance.now() / 1000;

const mat = (color, roughness = 0.65, more = {}) => new THREE.MeshPhysicalMaterial({
  color, roughness, metalness: 0, ...(roughness >= 0.55 ? { sheen: 0.6, sheenRoughness: 0.5, sheenColor: new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.35) } : { clearcoat: 0.4 }), ...more
});
function ball(r, material, sx = 1, sy = 1, sz = 1, seg = 40) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.75)), typeof material === 'number' ? mat(material) : material);
  m.scale.set(sx, sy, sz);
  return m;
}
function at(obj, x, y, z, parent) { obj.position.set(x, y, z); parent.add(obj); return obj; }
function jerseyLabel() {
  const c = Object.assign(document.createElement('canvas'), { width: 512, height: 256 });
  const g = c.getContext('2d');
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '900 150px Arial, sans-serif'; g.lineWidth = 14; g.strokeStyle = '#6d6e71'; g.strokeText('GG', 256, 108);
  g.fillStyle = '#fff'; g.fillText('GG', 256, 108);
  g.font = 'bold 44px Arial, sans-serif'; g.fillStyle = '#dadadc'; g.fillText('GEE-GEES', 256, 214);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class GeeGee {
  constructor() {
    this.el = Object.assign(document.createElement('div'), { className: 'geegee' });
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    r.setClearColor(0, 0);
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 0.95;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.el.appendChild(r.domElement);

    this.scene = new THREE.Scene();
    this.scene.environment = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.35;
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x2a2024, 0.55));
    const key = at(new THREE.DirectionalLight(0xfff3e8, 2.2), 1.8, 4.5, 3.2, this.scene); // lumière du plafond de la boîte, de face
    key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 6; key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
    Object.assign(key.shadow.camera, { left: -2, right: 2, top: 2.6, bottom: -1.6, near: 1, far: 12 });
    at(new THREE.DirectionalLight(0xdfeeff, 2.4), -2.4, 2.4, -2.6, this.scene); // contre-jour : détache la silhouette du noir
    at(new THREE.DirectionalLight(0xffc9d2, 1.0), 2.6, 0.6, -2.2, this.scene);  // contre-jour chaud, côté opposé
    at(new THREE.DirectionalLight(0xffffff, 0.5), 0, -2, 3, this.scene);        // rebond du plancher
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    this.figure = 0.27; // position horizontale de Gee-Gee dans l'image (0 = bord gauche)
    this.yaw = 0; this.yawTo = 0; // rotation donnée au doigt (glisser de côté)

    this.build();
    this.modelYaw = 0;
    this.style = 'cartoon';
    if (MODEL_URL) this.loadModel(MODEL_URL);
    this.state = {
      mouth: 0, syllables: [], talking: false, gesture: null, calm: false, pose: null, attention: null,
      blinkAt: now() + 1.5, blinkStart: -1, earAt: now() + 2, earStart: -1, earSide: 0,
      gaze: new THREE.Vector2(), gazeTo: new THREE.Vector2(), gazeAt: now() + 1, fidgetAt: now() + 8, last: now()
    };
    this.holdPose = false; // vrai quand la mascotte importée tient la pose « voici le code QR »
    // Veille (modèle importé) : on alterne marche sur place et salut tant que personne n'interagit.
    this.idleAllowed = true; this.idleAt = now() + 2; this.waveNext = true; this.walkOn = false;
    new ResizeObserver(() => this.resize()).observe(this.el);
    window.addEventListener('pointerdown', (e) => this.lookToward(e.clientX, e.clientY), { passive: true });
  }

  build() {
    const root = this.root = new THREE.Group(); this.scene.add(root);
    const upper = this.upper = new THREE.Group(); root.add(upper);

    // Torse : maillot grenat (forme tournée qui sort du bas de l'image), col gris, inscription « GG »
    const torso = this.torso = new THREE.Group(); upper.add(torso);
    const shape = [[0, 1.07], [0.17, 1.06], [0.36, 1.0], [0.45, 0.88], [0.45, 0.62], [0.39, 0.32], [0.36, 0.05], [0.36, -0.04]].reverse().map(([x, y]) => new THREE.Vector2(x, y)); // de bas en haut : normales vers l'extérieur
    const jersey = new THREE.Mesh(new THREE.LatheGeometry(shape, 48), mat(C.garnet, 0.8)); jersey.scale.z = 0.76; torso.add(jersey);
    const collar = at(new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.04, 16, 48), mat(C.grey, 0.6)), 0, 1.04, 0, torso);
    collar.rotation.x = Math.PI / 2; collar.scale.y = 0.85;
    const label = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.23), new THREE.MeshStandardMaterial({ map: jerseyLabel(), transparent: true, roughness: 0.7 }));
    at(label, 0, 0.66, 0.345, torso);

    const neck = at(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.21, 0.42, 32), mat(C.coat)), 0, 1.17, 0, upper);
    neck.rotation.x = 0.1;

    // Tête de cheval : crâne, joues, long museau, naseaux ; légèrement baissée pour qu'on voie le museau
    this.neckPivot = at(new THREE.Group(), 0, 1.3, 0.02, upper);
    const head = this.head = at(new THREE.Group(), 0, 0.24, 0, this.neckPivot);
    head.rotation.x = 0.28;
    head.add(ball(0.27, C.coat, 1, 1.12, 1.02));
    for (const s of [1, -1]) at(ball(0.15, C.coat, 0.8, 1, 1), 0.15 * s, -0.12, 0.02, head);
    at(ball(0.17, C.coat, 0.7, 0.85, 1.3), 0, -0.08, 0.2, head);
    at(ball(0.21, C.muzzle, 1.08, 0.86, 1.12), 0, -0.2, 0.34, head);
    for (const s of [1, -1]) {
      at(ball(0.04, 0x4a2c2e, 0.8, 1, 0.6, 16), 0.09 * s, -0.15, 0.56, head).rotation.set(-0.3, 0.45 * s, 0);
      at(ball(0.055, mat(0xff8fa8, 0.8, { transparent: true, opacity: 0.45 }), 1, 0.6, 0.3, 20), 0.2 * s, -0.12, 0.17, head).rotation.y = 0.7 * s;
    }

    // Bouche : intérieur sombre + langue, mâchoire mobile avec le sourire
    at(ball(0.15, mat(0x3a0a12, 0.9), 1.15, 0.45, 0.9), 0, -0.3, 0.38, head);
    at(ball(0.08, mat(0xd8607a, 0.5), 1.2, 0.35, 1), 0, -0.33, 0.42, head);
    this.jaw = at(new THREE.Group(), 0, -0.27, 0.18, head);
    at(ball(0.18, C.muzzle, 1.02, 0.5, 1.1), 0, -0.06, 0.22, this.jaw);
    this.smile = at(new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.012, 8, 32, Math.PI), mat(0x5a2a30, 0.8)), 0, -0.04, 0.41, this.jaw);
    this.smile.rotation.z = Math.PI; this.smile.scale.y = 0.55;

    // Yeux : blanc, iris, pupille, reflet ; paupière qui bascule pour cligner ; sourcil mobile
    this.eyes = [];
    for (const s of [1, -1]) {
      const eye = at(new THREE.Group(), 0.165 * s, 0.09, 0.2, head); eye.rotation.set(-0.2, 0.5 * s, 0);
      eye.add(ball(0.085, mat(0xffffff, 0.25), 1, 1.12, 0.75));
      const look = new THREE.Group(); eye.add(look);
      at(ball(0.05, mat(0x5a3418, 0.3), 1, 1.12, 0.5), 0, 0, 0.052, look);
      at(ball(0.03, mat(0x0a0a0a, 0.2), 1, 1.12, 0.5), 0, 0, 0.066, look);
      at(ball(0.012, new THREE.MeshBasicMaterial({ color: 0xffffff }), 1, 1, 1, 12), 0.016, 0.022, 0.078, look);
      const lid = new THREE.Group(); eye.add(lid);
      const lidMesh = new THREE.Mesh(new THREE.SphereGeometry(0.092, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), mat(C.coat));
      lidMesh.scale.set(1, 1.12, 0.8); lid.add(lidMesh);
      const brow = at(new THREE.Mesh(new THREE.CapsuleGeometry(0.009, 0.06, 4, 8), mat(C.garnetDark, 0.7)), 0, 0.13, 0.04, eye);
      this.eyes.push({ s, look, lid, brow });
    }

    // Oreilles (pivot à la base)
    this.ears = [1, -1].map((s) => {
      const ear = at(new THREE.Group(), 0.14 * s, 0.24, -0.06, head); ear.rotation.set(-0.15, 0, -0.32 * s);
      at(new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.27, 20), mat(C.coat)), 0, 0.12, 0, ear).scale.z = 0.55;
      at(new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.17, 20), mat(C.pink, 0.6)), 0, 0.1, 0.03, ear).scale.z = 0.4;
      return ear;
    });

    // Crinière grenat : toupet sur le front + mèches le long du cou
    const mane = mat(C.garnet, 0.55);
    this.forelock = at(new THREE.Group(), 0, 0.28, 0.06, head);
    for (const [x, rz] of [[-0.09, 0.4], [-0.03, 0.12], [0.03, -0.12], [0.09, -0.4]])
      at(new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.22, 16), mane), x, 0, 0.06, this.forelock).rotation.set(1.9, 0, rz);
    this.mane = new THREE.Group(); upper.add(this.mane);
    for (let i = 0; i < 8; i++) {
      const k = i / 7;
      at(ball(0.09 - k * 0.025, mane, 0.7, 1.15, 1), 0, 1.84 - k * 0.78, -0.12 - Math.sin(k * 1.9) * 0.24, this.mane).rotation.x = -0.5 - k * 0.6;
    }

    // Bras : épaule arrondie > manche > coude > avant-bras > sabot
    this.arms = [1, -1].map((s) => {
      const shoulder = at(new THREE.Group(), 0.44 * s, 0.86, 0, upper);
      at(ball(0.15, mat(C.garnet, 0.8), 1, 0.92, 0.92), 0, -0.02, 0, shoulder);
      // Manche = biceps : plus épaisse, et elle gonfle pendant le flex.
      const bicep = at(new THREE.Mesh(new THREE.CapsuleGeometry(0.118, 0.26, 6, 20), mat(C.garnet, 0.8)), 0, -0.17, 0, shoulder);
      at(new THREE.Mesh(new THREE.TorusGeometry(0.118, 0.02, 8, 24), mat(C.grey, 0.6)), 0, -0.34, 0, shoulder).rotation.x = Math.PI / 2;
      const elbow = at(new THREE.Group(), 0, -0.4, 0, shoulder);
      at(new THREE.Mesh(new THREE.CapsuleGeometry(0.088, 0.24, 6, 20), mat(C.coat)), 0, -0.16, 0, elbow);
      at(new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.1, 0.1, 24), mat(C.hoof, 0.4)), 0, -0.36, 0, elbow);
      return { s, shoulder, elbow, bicep };
    });

    // Bas du corps : short gris à bande blanche, jambes, bas grenat rayés, gros souliers de mascotte
    const shorts = new THREE.Mesh(new THREE.LatheGeometry([[0, -0.22], [0.39, -0.2], [0.4, -0.05], [0.37, 0.08], [0, 0.08]].map(([x, y]) => new THREE.Vector2(x, y)), 48), mat(C.grey, 0.8));
    shorts.scale.z = 0.78; root.add(shorts);
    for (const s of [1, -1]) {
      const leg = at(new THREE.Group(), 0.18 * s, 0, 0, root);
      at(new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.16, 0.34, 32), mat(C.grey, 0.8)), 0, -0.3, 0, leg);
      at(new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.42, 0.05), mat(0xffffff, 0.7)), 0.17 * s, -0.26, 0, leg);
      at(new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.42, 8, 24), mat(C.coat)), 0, -0.72, 0, leg);
      at(new THREE.Mesh(new THREE.CylinderGeometry(0.118, 0.112, 0.26, 32), mat(C.garnet, 0.85)), 0, -1.03, 0, leg);
      for (const y of [-0.93, -0.97]) at(new THREE.Mesh(new THREE.TorusGeometry(0.117, 0.012, 8, 32), mat(0xffffff, 0.7)), 0, y, 0, leg).rotation.x = Math.PI / 2;
      const shoe = at(new THREE.Group(), 0, -1.22, 0.07, leg);
      at(new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.2, 8, 24), mat(0xf4f4f4, 0.6)), 0, 0, 0, shoe).rotation.x = Math.PI / 2;
      at(new THREE.Mesh(new THREE.CapsuleGeometry(0.135, 0.22, 8, 24), mat(C.garnet, 0.7)), 0, -0.055, 0, shoe).rotation.x = Math.PI / 2;
      shoe.children[1].scale.set(1, 1, 0.35);
    }
    // Queue grenat qui se balance
    this.tail = at(new THREE.Group(), 0, 0.0, -0.33, root);
    for (let i = 0; i < 6; i++) at(ball(0.075 - i * 0.008, mat(C.garnet, 0.55), 0.8, 1.3, 0.8), 0, -i * 0.11, -0.04 - Math.sin(i * 0.5) * 0.12, this.tail);
    this.tail.rotation.x = 0.35;

    // Ombre de contact sur le plancher de la boîte (seule l'ombre est dessinée)
    const floor = at(new THREE.Mesh(new THREE.CircleGeometry(1.6, 48), new THREE.ShadowMaterial({ opacity: 0.22 })), 0, FLOOR, 0, this.scene);
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
    this.root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  }

  // ---------- Affichage ----------
  mount(parent, view = 'bust') {
    if (this.el.parentNode !== parent) parent.appendChild(this.el);
    this.attachDrag(parent.closest('.holo') || parent);
    this.setView(view); this.resize();
    if (!this.running) { this.running = true; const loop = () => { this.frame(); requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
  }
  // Rotation au doigt : glisser de côté sur la colonne de gauche fait tourner Gee-Gee sur lui-même.
  attachDrag(area) {
    if (!area || area.dataset.turnReady) return;
    area.dataset.turnReady = '1';
    let id = null, x0 = 0, yaw0 = 0, moved = 0;
    const down = (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      id = e.pointerId; x0 = e.clientX; yaw0 = this.yawTo; moved = 0;
      try { area.setPointerCapture(id); } catch { /* capture refusée */ }
      area.classList.add('turning');
    };
    const move = (e) => {
      if (id !== e.pointerId) return;
      this.yawTo = yaw0 + (e.clientX - x0) * 0.012; // ~1 tour sur ~520 px
      moved = Math.max(moved, Math.abs(e.clientX - x0));
    };
    const up = (e) => {
      if (id !== e.pointerId) return;
      try { area.releasePointerCapture(id); } catch { /* déjà relâchée */ }
      id = null; area.classList.remove('turning');
      if (moved > 8) this.lastDragEnd = performance.now(); // un glissement ne doit pas lancer la session
    };
    area.addEventListener('pointerdown', down);
    area.addEventListener('pointermove', move);
    area.addEventListener('pointerup', up);
    area.addEventListener('pointercancel', up);
  }
  setView() { this.resize(); } // une seule vue : Gee-Gee en pied, cadré de la tête aux souliers
  resize() {
    const w = this.el.clientWidth || 1, h = this.el.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    // Le canevas fait exactement la colonne de gauche : quoi qu'il arrive, rien ne peut déborder dans l'interface.
    const cam = this.camera, aspect = w / h, half = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    // Hauteur et largeur à faire tenir, bras compris : la colonne est étroite (1080×1920), donc c'est la largeur
    // qui décide du cadrage. Pour le modèle importé, on prend la largeur mesurée dans toutes ses animations
    // (le grand signe d'au revoir écarte les bras plus que le repos).
    const H = (TOP - FLOOR) * FIT;
    const W = this.style === 'cartoon' ? 1.25 : this.style === 'geegee' ? this.reachW() * FIT_MARGIN : 1.75;
    const d = Math.max(H / 2 / half, W / 2 / (half * aspect));
    const cy = FLOOR + H / 2 - 0.02;
    cam.aspect = aspect; cam.position.set(0, cy, d); cam.lookAt(0, cy, 0);
    this.baseDist = d; this.baseY = cy; // cadrage de base ; le flex recule un peu pour garder les bras dans l'image
    cam.clearViewOffset();
    cam.updateProjectionMatrix();
  }
  // Largeur à réserver au repos pour le modèle importé : ses gestes courants (salut, mains ouvertes), pas le grand
  // signe d'au revoir, qui est plus large et fait reculer un peu la caméra (voir pullBack).
  reachW() { return this.baseHalf ? this.baseHalf * 2 : MODEL_MAX_W; }
  // Demi-largeur visible à une rotation donnée : la silhouette d'un clip vaut x*|cos| + z*|sin| quand on tourne.
  reachAt(name, yaw) {
    const h = this.clipHalf?.get(name || '');
    if (!h) return 0;
    return h.x * Math.abs(Math.cos(yaw)) + h.z * Math.abs(Math.sin(yaw));
  }
  // Recul de la caméra pour que le geste en cours reste entier dans la colonne : 1 pour les gestes courants,
  // un peu plus pendant le grand signe d'au revoir, et plus encore quand la rotation au doigt présente la mascotte
  // de profil (les bras qui pointaient vers la caméra occupent alors toute la largeur de l'image).
  // On cadre sur la rotation visée autant que sur la rotation actuelle : la caméra recule avant que le bras n'arrive au bord.
  pullBack() {
    const clip = this.state.gesture ? this.gestureClip : this.talkOn ? this.talkClip : this.walkOn ? this.walkClip : null;
    if (!this.baseHalf) return 1;
    const name = clip?.name || '';
    const half = Math.max(this.reachAt(name, this.yaw), this.reachAt(name, this.yawTo));
    return Math.max(1, half / this.baseHalf);
  }
  snapshot() { this.frame(); return this.renderer.domElement.toDataURL('image/png'); }

  // ---------- Parole ----------
  // Chaque mot devient des syllabes ; la mâchoire s'ouvre selon la voyelle (a : grand, o/u : arrondi, é/i : petit).
  queueWord(word, delayMs, durMs) {
    const t0 = performance.now() + delayMs;
    const vowels = word.toLowerCase().match(/[aeiouyàâäéèêëîïôöûüù]+/g) || ['a'];
    const n = Math.min(4, vowels.length), d = durMs / n;
    vowels.slice(0, n).forEach((v, i) => this.state.syllables.push({
      t0: t0 + i * d, d, amp: (/[aàâä]/.test(v) ? 1 : /[oôöuûüù]/.test(v) ? 0.75 : 0.55) * (0.85 + Math.random() * 0.25)
    }));
  }
  startTalking() { this.state.syllables = []; this.state.talking = true; this.state.gazeTo.set(0, 0); }
  sayWord(word, rate = 1) {
    if (!word) return;
    this.state.talking = true;
    this.queueWord(word, 0, Math.min(520, Math.max(130, word.length * 62 / rate)));
  }
  sayText(text, totalMs) { // sans minutage des mots : on répartit la phrase sur la durée estimée
    this.startTalking();
    const list = text.split(/\s+/).filter(Boolean);
    const letters = list.reduce((n, w) => n + w.length + 1, 0) || 1;
    let t = 0;
    for (const w of list) { const d = (w.length + 1) / letters * totalMs; this.queueWord(w, t, Math.max(80, d - 30)); t += d; }
    clearTimeout(this.quietTimer); this.quietTimer = setTimeout(() => this.stopTalking(), totalMs + 200);
  }
  stopTalking() { this.state.syllables = []; this.state.talking = false; }

  // ---------- Gestes et attention ----------
  react(kind) {
    const g = {
      hello: ['wave', 2.6],     // salutation : au début d'une conversation, puis toutes les 10 s
      bye: ['bye', 4.2],        // au revoir : à la fin de la conversation
      present: ['present', 4],  // « voici le code QR » : les mains s'ouvrent vers l'écran et la pose reste affichée
      thanks: ['hoofUp', 2], none: ['shrug', 2], answer: ['hop', 1.1], sensitive: ['calm', 2.5]
    }[kind];
    this.state.calm = kind === 'sensitive';
    if (g) this.play(...g);
  }
  play(name, dur) {
    const clip = this.clipFor(name);
    this.gestureClip = clip;
    this.holdPose = name === 'present';
    this.talkOn = false; // un geste remplace l'animation de parole (stopAllAction ci-dessous)
    clearTimeout(this.talkStopTimer);
    this.state.gesture = { name, t0: now(), dur: clip ? Math.max(dur, clip.duration) : dur };
    // Un geste interrompt la veille : la marche s'arrête et le cycle (marche puis salut) reprend après le geste.
    this.stopWalk();
    this.waveNext = false; this.idleAt = now() + IDLE_PAUSE;
    // Avec le modèle importé : joue l'animation du fichier (salut, au revoir, mains ouvertes), puis revient au repos.
    if (clip && this.mixer) {
      // Fondu enchaîné depuis l'animation en cours (marche, parole) : plus de retour brusque à la pose de départ.
      const a = this.gestureAction = this.fadeTo(clip, { loop: false, fade: 0.3 });
      a.clampWhenFinished = true; a.endFading = false; // la fin du geste se fond dans le repos (voir frame)
      if (this.holdPose) { a.paused = true; a.time = Math.min(1.3, clip.duration * 0.4); } // main levée tant que le code QR est à l'écran
    } else this.gestureAction = null;
  }
  // Passe en douceur à une animation du modèle importé : les autres s'effacent pendant qu'elle apparaît.
  fadeTo(clip, { loop = true, fade = 0.3, speed = 1 } = {}) {
    const next = this.mixer.clipAction(clip);
    for (const a of this.mixer._actions) if (a !== next && a.isRunning()) a.fadeOut(fade);
    next.reset().setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
    next.timeScale = speed;
    next.setEffectiveWeight(1).fadeIn(fade).play();
    return next;
  }
  // Animation du modèle importé pour un geste : « wave » → petit signe de la main, « bye » → grand signe, « present » → mains ouvertes.
  clipFor(name) {
    if (!this.clips?.length) return null;
    const re = { wave: /wave.?one.?hand/i, bye: /big.?wave|hello/i, present: /wave.?one.?hand/i, talk: /talk|hands.?open/i }[name] || new RegExp(name, 'i');
    return this.clips.find((c) => re.test(c.name)) || null;
  }
  // Pendant que la mascotte parle : l'animation « mains ouvertes » du modèle, en boucle, effacée dès le silence.
  updateTalk() {
    const want = !!this.mixer && !!this.talkClip && this.state.talking && !this.state.gesture && !this.holdPose;
    if (want === this.talkOn) return;
    this.talkOn = want;
    if (want) {
      this.stopWalk(); // parler l'emporte sur la marche de veille
      // Vitesse un peu différente à chaque réponse : les gestes ne se répètent pas à l'identique.
      this.talkAction = this.fadeTo(this.talkClip, { fade: 0.35, speed: 0.85 + Math.random() * 0.25 });
    } else if (this.talkAction) {
      const a = this.talkAction;
      a.fadeOut(0.3);
      // Une fois le silence, on arrête l'animation : le modèle revient à sa pose de repos au lieu de rester les mains ouvertes.
      clearTimeout(this.talkStopTimer);
      this.talkStopTimer = setTimeout(() => { if (!this.talkOn) a.stop(); }, 400);
    }
  }

  // ---------- Veille : marche et salut en alternance ----------
  // Au repos, le modèle importé n'a pas d'animation d'attente : plutôt que de rester figé, il marche sur place
  // puis salue de la main, puis remarche, tant que personne n'interagit avec la boîte.
  // La veille ne tourne que sur l'écran d'accueil (setIdle) : dès qu'une personne touche la boîte, elle s'arrête.
  setIdle(on) {
    this.idleAllowed = on !== false;
    if (!this.idleAllowed) { this.stopWalk(); this.idleAt = now() + 2; }
  }
  idleTick(t) {
    const S = this.state;
    if (!this.idleAllowed || S.talking || S.gesture || this.holdPose) { this.stopWalk(); return; }
    if (this.walkOn) {
      if (t < this.walkUntil) return;
      this.stopWalk();
      this.waveNext = true; this.idleAt = t + IDLE_PAUSE; // petite pose au repos avant de saluer
      return;
    }
    if (t < this.idleAt) return;
    if (this.waveNext) { this.waveNext = false; this.react('hello'); }
    else { this.waveNext = true; this.startWalk(WALK_FOR); }
  }
  startWalk(seconds) {
    if (!this.mixer || !this.walkClip || this.state.gesture || this.state.talking || this.holdPose) return;
    this.talkOn = false; clearTimeout(this.talkStopTimer);
    this.walkAction = this.fadeTo(this.walkClip, { fade: 0.45 });
    this.walkOn = true; this.walkUntil = now() + seconds;
  }
  stopWalk() {
    if (!this.walkOn) return;
    this.walkOn = false;
    const a = this.walkAction; this.walkAction = null;
    if (!a) return;
    a.fadeOut(0.3);
    clearTimeout(this.walkStopTimer);
    this.walkStopTimer = setTimeout(() => { if (!this.walkOn) a.stop(); }, 400);
  }

  // ---------- Style de la mascotte ----------
  // 'cartoon' : Gee-Gee fait en code ; 'geegee' : Gee-Gee réaliste (fourrure, maillot GG) ; 'horse' : cheval réaliste.
  // Les deux versions réalistes utilisent le même modèle 3D (js/realhorse.js), chargé seulement quand on le choisit.
  setStyle(style = 'cartoon') {
    if (!['cartoon', 'geegee', 'horse'].includes(style)) style = 'cartoon';
    this.style = style;
    // 'geegee' : la mascotte importée (assets/geegee.glb) ; 'horse' : le cheval réaliste ; 'cartoon' : Gee-Gee fait en code.
    const useModel = style === 'geegee' && !!this.model;
    if (style === 'horse' && !this.real) {
      this.real = new RealHorse('assets/cheval-realiste.glb');
      this.scene.add(this.real.group);
      this.real.load(TOP - FLOOR, FLOOR).catch((err) => {
        console.warn('Modèle réaliste non chargé, Gee-Gee fait en code utilisé à la place :', err);
        this.real = null; this.setStyle('cartoon');
      });
    }
    const real = style === 'horse' || (style === 'geegee' && !useModel && !!this.real);
    if (this.real) { this.real.group.visible = real; if (real) this.real.setVariant(style); }
    if (this.model) this.model.visible = useModel;
    // Tant que le modèle importé charge (ou s'il échoue), le Gee-Gee fait en code tient l'écran.
    this.root.visible = style === 'cartoon' || (style === 'geegee' && !useModel && !this.real);
    // Les textures du modèle importé et du modèle réaliste sont réglées pour un rendu neutre (l'ACES rougit le pelage).
    this.renderer.toneMapping = real || useModel ? THREE.NeutralToneMapping : THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = real || useModel ? 1.0 : 0.95;
    this.resize();
  }

  // ---------- Vrai modèle 3D ----------
  // Si l'équipe dépose un fichier assets/geegee.glb (mascotte modélisée ou générée), il remplace le Gee-Gee fait en code.
  // Il est mis à l'échelle de la boîte (tête aux pieds), posé au sol, et ses animations (idle, wave…) sont utilisées.
  async loadModel(url) {
    try {
      const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
      const gltf = await new GLTFLoader().loadAsync(url);
      const m = gltf.scene, box = new THREE.Box3().setFromObject(m), size = box.getSize(new THREE.Vector3());
      // À l'échelle de la boîte (tête aux pieds), mais sans déborder en largeur : le modèle a les bras écartés.
      m.scale.setScalar(Math.min((TOP - FLOOR) / size.y, MODEL_MAX_W / size.x));
      box.setFromObject(m);
      const c = box.getCenter(new THREE.Vector3());
      m.position.set(-c.x, FLOOR - box.min.y, -c.z);
      m.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      this.model = new THREE.Group(); this.model.add(m); this.scene.add(this.model);
      this.root.visible = false;
      this.clips = gltf.animations;
      // Au repos, on ne joue que les animations d'attente : une marche ou une course sur place ferait bizarre.
      if (this.clips.length) {
        this.mixer = new THREE.AnimationMixer(m);
        const idle = this.clips.find((k) => /idle|repos|breath|attente/i.test(k.name));
        if (idle) this.mixer.clipAction(idle).play();
      }
      this.pinInPlace(m);
      this.talkClip = this.clipFor('talk');
      this.modelReach = this.measureReach(m); // mains comprises, sur toutes les animations
      this.walkClip = this.clipFor('walk'); // « walking_man » : la marche sur place de la veille
      // Cadrage de repos : le plus large des gestes courants, sans compter le grand signe d'au revoir.
      const bye = this.clipFor('bye');
      const rest = this.clipHalf.get('') || { x: MODEL_MAX_W / 2, z: 0 };
      this.baseHalf = Math.max(rest.x, ...[...this.clipHalf].filter(([n]) => n && n !== bye?.name).map(([, h]) => h.x));
      this.rig = this.buildRig(m);
      this.face = attachFace(m); // paupières qui clignent et bouche qui s'ouvre (js/face.js)
      this.setStyle(this.style);
    } catch (err) { console.warn('Modèle 3D non chargé, Gee-Gee fait en code utilisé à la place :', err); }
  }
  // Les animations de Meshy déplacent la mascotte d'un clip à l'autre (translation des hanches, jusqu'à 35 cm) :
  // pendant le grand signe, elle sortait de la colonne et sautait d'un clip au suivant. Dans la boîte, elle reste
  // à sa place : on garde le balancement vertical, on ramène chaque animation sur la position de repos des hanches.
  pinInPlace(root) {
    const hips = root.getObjectByName('Hips');
    if (!hips) return;
    const x0 = hips.position.x, z0 = hips.position.z;
    for (const clip of this.clips) {
      const track = clip.tracks.find((tr) => /Hips\.position$/.test(tr.name));
      if (!track) continue;
      const v = track.values;
      for (let i = 0; i < v.length; i += 3) { v[i] = x0; v[i + 2] = z0; }
    }
  }
  // Demi-largeur (x) et demi-profondeur (z) maximales du modèle dans chacun de ses gestes et au repos : le grand signe
  // d'au revoir écarte les bras bien plus que la pose de repos, et la rotation au doigt change la silhouette.
  // Le cadrage s'en sert pour que rien ne touche le bord de la colonne de gauche.
  measureReach(root) {
    if (!this.clips?.length || !this.mixer) return { x: 0, z: 0 };
    const meshes = []; root.traverse((o) => { if (o.isMesh && o.getVertexPosition) meshes.push(o); });
    if (!meshes.length) return { x: 0, z: 0 };
    const v = new THREE.Vector3();
    const setPose = () => {
      root.updateMatrixWorld(true);
      for (const mesh of meshes) mesh.skeleton?.update(); // sans rendu, les matrices des os ne sont pas recalculées
    };
    const poseAt = (t) => { this.mixer.setTime(t); setPose(); };
    // Étendue de la silhouette en largeur (x) et en profondeur (z) : en tournant au doigt, les bras qui pointent
    // vers la caméra prennent la place qu'occupaient ceux qui pointaient de côté.
    const scan = (stride) => {
      let x = 0, z = 0;
      for (const mesh of meshes) {
        const n = mesh.geometry.attributes.position.count;
        for (let k = 0; k < n; k += stride) {
          mesh.getVertexPosition(k, v).applyMatrix4(mesh.matrixWorld);
          x = Math.max(x, Math.abs(v.x - root.position.x));
          z = Math.max(z, Math.abs(v.z - root.position.z));
        }
      }
      return { x, z };
    };
    this.clipHalf = new Map();
    // Pose de repos (aucune animation) : c'est elle qu'on voit entre deux gestes.
    this.mixer.stopAllAction(); this.mixer.setTime(0); setPose();
    this.clipHalf.set('', scan(1));
    let half = { x: 0, z: 0 };
    for (const clip of this.clips) {
      this.mixer.stopAllAction();
      const a = this.mixer.clipAction(clip); a.reset().play();
      // Deux passes : un balayage rapide trouve les instants les plus larges (en x comme en z), puis ces instants
      // sont mesurés sommet par sommet — une main qui salue va plus vite que l'échantillonnage.
      const N = 120, moments = [];
      for (let i = 0; i < N; i++) {
        const t = clip.duration * i / N;
        poseAt(t);
        const s = scan(20);
        moments.push([Math.max(s.x, s.z), t]);
      }
      moments.sort((p, q) => q[0] - p[0]);
      const reach = { x: 0, z: 0 };
      for (const [, t] of moments.slice(0, 4)) {
        poseAt(t);
        const s = scan(1);
        reach.x = Math.max(reach.x, s.x); reach.z = Math.max(reach.z, s.z);
      }
      this.clipHalf.set(clip.name, reach);
      half = { x: Math.max(half.x, reach.x), z: Math.max(half.z, reach.z) };
      a.stop();
    }
    this.mixer.stopAllAction(); this.mixer.setTime(0);
    return half;
  }
  // ---------- Mouvements ajoutés par-dessus les animations du modèle importé ----------
  // Le fichier de Meshy n'a que 4 animations, et sa pose de départ a les bras écartés en « A ». Entre deux animations,
  // la mascotte restait donc figée, bras tendus. On ajoute ici, os par os : une vraie pose de repos (bras le long du
  // corps, coudes un peu pliés), la respiration, un transfert de poids, une tête vivante (regarde autour, suit la
  // personne, hoche quand il parle) et les gestes sans animation dans le fichier (haussement d'épaules, hochement…).
  // Les axes de rotation de chaque os sont mesurés au chargement : rien ne dépend de la façon dont Meshy a orienté le squelette.
  buildRig(root) {
    const bone = (n) => root.getObjectByName(n);
    const need = ['Hips', 'Spine01', 'Spine02', 'neck', 'Head', 'headfront', 'head_end', 'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand',
      'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand', 'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'RightUpLeg', 'RightLeg', 'RightFoot'];
    const B = {}; for (const n of need) { B[n] = bone(n); if (!B[n]) return null; }
    this.mixer.stopAllAction(); this.mixer.setTime(0);
    this.model.updateMatrixWorld(true);
    const AX = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)];
    const q = new THREE.Quaternion(), p0 = new THREE.Vector3(), p1 = new THREE.Vector3();
    // Axe local (avec son signe) qui déplace « probe » le plus dans la direction « dir » quand on tourne « b ».
    const axisFor = (b, probe, dir, only = [0, 1, 2]) => {
      probe.getWorldPosition(p0);
      let best = null, score = 0;
      for (const i of only) {
        const save = b.quaternion.clone();
        b.quaternion.multiply(q.setFromAxisAngle(AX[i], 0.2));
        this.model.updateMatrixWorld(true); probe.getWorldPosition(p1);
        b.quaternion.copy(save);
        const s = p1.sub(p0).dot(dir);
        if (Math.abs(s) > Math.abs(score)) { score = s; best = AX[i].clone().multiplyScalar(Math.sign(s)); }
      }
      this.model.updateMatrixWorld(true);
      return best;
    };
    const down = new THREE.Vector3(0, -1, 0), up = new THREE.Vector3(0, 1, 0), fwd = new THREE.Vector3(0, 0, 1), right = new THREE.Vector3(1, 0, 0);
    const side = (L) => ({
      arm: B[L + 'Arm'], fore: B[L + 'ForeArm'], sh: B[L + 'Shoulder'],
      lower: axisFor(B[L + 'Arm'], B[L + 'Hand'], down),        // bras vers le bas, le long du corps
      bend: axisFor(B[L + 'ForeArm'], B[L + 'Hand'], fwd),      // coude qui plie vers l'avant
      shrug: axisFor(B[L + 'Shoulder'], B[L + 'Arm'], up)       // épaule qui monte
    });
    const leg = (L) => ({
      up: B[L + 'UpLeg'], knee: B[L + 'Leg'],
      thigh: axisFor(B[L + 'UpLeg'], B[L + 'Leg'], fwd),                         // cuisse vers l'avant
      bend: axisFor(B[L + 'Leg'], B[L + 'Foot'], new THREE.Vector3(0, 0, -1))   // genou qui plie (le pied recule)
    });
    const R = {
      B, L: side('Left'), R: side('Right'),
      leanSide: axisFor(B.Spine01, B.Head, right), leanFwd: axisFor(B.Spine02, B.Head, fwd),
      yaw: axisFor(B.Head, B.headfront, right, [1]), nod: axisFor(B.Head, B.headfront, down, [0]), tilt: axisFor(B.Head, B.head_end, right, [2]),
      spineYaw: axisFor(B.Spine02, B.headfront, right, [1]),   // le buste tourne un peu avec la tête
      legL: leg('Left'), legR: leg('Right'),
      free: 1, hy: 0, hp: 0, ht: 0, shift: 0, shiftTo: 0, shiftAt: 3
    };
    if (!R.yaw || !R.nod || !R.tilt || !R.L.lower || !R.R.lower) return null;
    R.bones = Object.values(B); R.bind = R.bones.map((b) => b.quaternion.clone());
    return R;
  }
  // Avant mixer.update : chaque os revient à sa pose de départ, sinon nos rotations s'additionneraient d'image en image.
  resetRig() { const R = this.rig; if (R) R.bones.forEach((b, i) => b.quaternion.copy(R.bind[i])); }
  poseRig(t, dt) {
    const R = this.rig; if (!R) return;
    const S = this.state, q = new THREE.Quaternion();
    const turn = (b, axis, a) => { if (axis && a) b.quaternion.multiply(q.setFromAxisAngle(axis, a)); };
    // Part des animations du fichier : la pose de repos ne s'applique que lorsqu'aucune animation ne joue.
    let w = 0; for (const a of this.mixer._actions) if (a.isRunning()) w += a.getEffectiveWeight();
    // Exactement le complément des fondus du fichier (déjà progressifs) : un retard créerait un à-coup en fin de geste.
    R.free = 1 - Math.min(1, w);
    // Bruit doux (somme de sinus de fréquences sans rapport) : les petits mouvements ne se répètent jamais en boucle.
    const noise = (a, ph = 0) => Math.sin(t * a + ph) * 0.6 + Math.sin(t * a * 2.13 + ph + 1.7) * 0.3 + Math.sin(t * a * 3.71 + ph + 4.1) * 0.1;
    const f = R.free, breath = Math.sin(t * 1.45), sway = noise(0.42);
    // Gestes sans animation dans le fichier
    let shrug = 0, nod = 0, tilt = 0, bounce = 0;
    const g = S.gesture;
    if (g && !this.gestureClip) {
      const k = Math.min(1, Math.max(0, (t - g.t0) / g.dur)), env = Math.sin(k * Math.PI);
      if (g.name === 'shrug') { shrug = smooth(Math.min(1, env * 1.6)); tilt = 0.22 * shrug; }       // « je ne sais pas »
      else if (g.name === 'hop') { nod = 0.16 * Math.sin(k * Math.PI * 2) * env; bounce = env; }   // « voilà ! » à chaque réponse
      else if (g.name === 'hoofUp') { nod = 0.2 * Math.sin(k * Math.PI * 3) * env; bounce = 0.5 * env; } // merci : deux hochements
      else if (g.name === 'calm') { tilt = 0.16 * env; nod = 0.08 * env; }                           // sujet délicat : tête penchée, posée
    }
    if (S.calm) tilt = Math.max(tilt, 0.1);
    // Bras : le long du corps au repos, avec la respiration ; les épaules montent pendant le haussement.
    for (const s of [R.L, R.R]) {
      turn(s.arm, s.lower, (0.62 + 0.015 * breath) * f - 0.35 * shrug);
      turn(s.fore, s.bend, 0.22 * f + 0.9 * shrug);
      turn(s.sh, s.shrug, 0.03 * breath * f + 0.22 * shrug);
    }
    // Transfert de poids : comme une vraie personne debout, il se repose sur une jambe, l'autre genou relâché,
    // puis change de côté toutes les 5 à 12 secondes (parfois revient sur ses deux pieds).
    if (t > R.shiftAt) {
      R.shiftTo = Math.random() < 0.25 ? 0 : (R.shiftTo > 0 ? -1 : 1);
      R.shiftAt = t + 5 + Math.random() * 7;
    }
    R.shift = mix(R.shift, R.shiftTo * f, 1 - Math.exp(-dt * 1.4));
    const sh = R.shift, relaxed = sh > 0 ? R.legR : R.legL, standing = sh > 0 ? R.legL : R.legR, amt = Math.abs(sh);
    // Petit rebond « voilà » : les genoux plient (les pieds restent au sol) au lieu de soulever toute la mascotte.
    const dip = 0.22 * bounce;
    turn(relaxed.up, relaxed.thigh, 0.09 * amt + dip * 0.5); turn(relaxed.knee, relaxed.bend, 0.18 * amt + dip);
    turn(standing.up, standing.thigh, dip * 0.5); turn(standing.knee, standing.bend, dip);
    // Torse : respiration, bassin au-dessus de la jambe d'appui et épaules qui compensent
    turn(R.B.Spine02, R.leanFwd, 0.018 * breath + 0.012 * noise(0.23, 2));
    turn(R.B.Spine01, R.leanSide, 0.02 * sway * (0.4 + 0.6 * f) - 0.035 * sh);
    // Tête : suit la personne (attention), regarde autour au repos, hoche avec les syllabes quand il parle.
    const att = S.attention && S.attention.until > t ? S.attention : null;
    const hy = (att ? att.x * 0.55 : 0) + S.gaze.x * 0.7 + noise(0.31) * 0.05;
    const hp = (att ? att.y * 0.25 : 0) - S.gaze.y * 0.4 + S.mouth * 0.09 + nod + (S.talking ? 0.04 * noise(2.3, 1) : 0);
    const ht = tilt + noise(0.53, 3) * 0.035 + 0.04 * sh + (S.talking ? 0.04 * noise(1.3, 5) : 0);
    const k = 1 - Math.exp(-dt * 7);
    R.hy = mix(R.hy, hy, k); R.hp = mix(R.hp, hp, k); R.ht = mix(R.ht, ht, k);
    // Le regard entraîne le corps : la tête tourne la première, le buste suit un peu, plus lentement.
    R.by = mix(R.by || 0, R.hy, 1 - Math.exp(-dt * 2.5));
    turn(R.B.Spine02, R.spineYaw, R.by * 0.22);
    turn(R.B.neck, R.yaw, R.hy * 0.3); turn(R.B.Head, R.yaw, R.hy * 0.55 - R.by * 0.07);
    turn(R.B.neck, R.nod, R.hp * 0.35); turn(R.B.Head, R.nod, R.hp * 0.65);
    turn(R.B.Head, R.tilt, R.ht);
    this.model.position.y -= 0.022 * bounce + 0.006 * amt; // le genou relâché fait descendre un peu le bassin
    this.model.position.x = 0.014 * sh;                    // le corps se place au-dessus de la jambe d'appui
  }
  lookToward(x, y) {
    if (!this.el.isConnected) return;
    const r = this.el.getBoundingClientRect();
    const ax = Math.max(-1, Math.min(1, (x - (r.left + r.width / 2)) / (window.innerWidth / 2)));
    const ay = Math.max(-1, Math.min(1, (y - (r.top + r.height * 0.3)) / (window.innerHeight / 2)));
    this.state.attention = { x: ax, y: ay, until: now() + 1.8 };
    this.state.gazeTo.set(ax * 0.8, -ay * 0.5); this.state.gazeAt = now() + 1.8;
  }

  // Pose voulue à l'instant t : repos + parole + attention + geste en cours.
  target(t) {
    const S = this.state, b = Math.sin(t * 1.4);
    const p = {
      y: 0.008 * b, ry: 0.22 + Math.sin(t * 0.37) * 0.08, rz: Math.sin(t * 0.29) * 0.015,
      hx: Math.sin(t * 0.8) * 0.03, hy: -0.12 + Math.sin(t * 0.43) * 0.1, hz: Math.sin(t * 0.61) * 0.05, brow: 0.15,
      arms: this.arms.map((a) => ({ sx: 0.05, sz: -0.12 * a.s, ex: -0.25 + 0.03 * b, ez: 0, lift: 0 })),
      flex: 0 // contraction des biceps (0 = repos, 1 = flex)
    };
    if (S.talking) {
      p.hx += Math.sin(t * 5.3) * 0.035; p.hz += Math.sin(t * 2.1) * 0.05; p.brow = 0.5 + 0.5 * Math.sin(t * 3.1);
      p.arms[0].ex += -0.35 + Math.sin(t * 2.7) * 0.25; p.arms[0].sz += Math.sin(t * 1.9) * 0.08;
      p.arms[1].ex += -0.25 + Math.sin(t * 2.2 + 1) * 0.2;
    }
    if (S.calm) { p.hx += 0.08; p.hz += 0.1; p.brow = 0.6; }
    if (S.attention) {
      const left = S.attention.until - t;
      if (left <= 0) S.attention = null;
      else { const w = smooth(left / 0.4); p.hy -= S.attention.x * 0.45 * w; p.hx += S.attention.y * 0.18 * w; p.ry -= S.attention.x * 0.12 * w; }
    }
    if (!this.model && !S.talking && !S.gesture && t > S.fidgetAt) { // petite animation spontanée (Gee-Gee fait en code) pour attirer les passants
      S.fidgetAt = t + 7 + Math.random() * 8;
      const pick = ['tilt', 'lookAround', 'flex', 'hop', 'tilt'][Math.floor(Math.random() * 5)];
      this.play(pick, pick === 'lookAround' ? 2.6 : pick === 'flex' ? 3 : 1.4);
      if (pick === 'tilt') { S.earStart = t; S.earSide = Math.random() < 0.5 ? 0 : 1; }
    }
    const g = S.gesture;
    if (g) {
      const k = (t - g.t0) / g.dur, e = t - g.t0;
      if (k >= 1) S.gesture = null;
      else {
        const w = smooth(Math.min(k / 0.18, (1 - k) / 0.2, 1));
        const [R, L] = p.arms;
        if (['wave', 'bye', 'present', 'hoofUp', 'hop', 'tilt'].includes(g.name)) p.brow = mix(p.brow, 1, w);
        if (g.name === 'wave' || g.name === 'bye') {
          Object.assign(R, { sz: mix(R.sz, 2.2, w), sx: mix(R.sx, -0.25, w), ex: mix(R.ex, -0.2, w), ez: mix(R.ez, 0.9 + 0.45 * Math.sin(e * 9), w) });
          p.hz += 0.12 * w; p.y += 0.03 * Math.abs(Math.sin(e * 4.5)) * w;
        } else if (g.name === 'hoofUp' || g.name === 'present') {
          Object.assign(R, { sx: mix(R.sx, -1.1, w), ex: mix(R.ex, -1.4, w), sz: mix(R.sz, 0.15, w) }); p.hx += 0.12 * Math.sin(e * 6) * w;
        } else if (g.name === 'shrug') {
          for (const [a, s] of [[R, 1], [L, -1]]) Object.assign(a, { lift: 0.07 * w, ex: mix(a.ex, -1.5, w), ez: mix(a.ez, 0.9 * s, w), sz: mix(a.sz, 0.35 * s, w) });
          p.hz += 0.18 * w; p.hx -= 0.05 * w;
        } else if (g.name === 'hop') {
          p.y += 0.05 * Math.sin(Math.min(1, k * 2) * Math.PI) * w; p.hz += 0.08 * w;
        } else if (g.name === 'tilt') {
          p.hz += 0.22 * w; p.hx -= 0.06 * w;
        } else if (g.name === 'lookAround') {
          const sw = Math.sin(k * Math.PI * 2); p.hy += sw * 0.45 * w; p.ry += sw * 0.1 * w;
        } else if (g.name === 'calm') {
          for (const [a, s] of [[R, 1], [L, -1]]) Object.assign(a, { sx: mix(a.sx, -0.6, w), ex: mix(a.ex, -1.2, w), sz: mix(a.sz, -0.25 * s, w) });
        } else if (g.name === 'flex') {
          // Double biceps : les bras montent sur les côtés et les coudes se plient ; les biceps gonflent (P.flex).
          for (const [a, s] of [[R, 1], [L, -1]]) Object.assign(a, {
            sz: mix(a.sz, 1.05 * s, w), sx: mix(a.sx, -0.2, w), ex: mix(a.ex, -0.5, w), ez: mix(a.ez, 1.5 * s, w)
          });
          p.flex = w; p.hz += 0.08 * w; p.hx -= 0.04 * w; p.brow = mix(p.brow, 1, w);
        }
      }
    }
    return p;
  }

  frame() {
    const S = this.state, t = now();
    const dt = Math.min(0.05, t - S.last); S.last = t;
    const T = this.target(t);
    // Veille : la mascotte importée alterne marche et salut tant que personne n'interagit avec elle.
    if (this.model) this.idleTick(t);
    this.yaw = mix(this.yaw, this.yawTo, 1 - Math.exp(-dt * 10)); // suit le doigt, sans à-coup
    if (this.baseDist) { // pendant le flex, il se tourne de trois quarts et recule un peu : les bras restent dans la colonne
      const fx = this.state.pose?.flex || 0;
      // On recule tout de suite quand la silhouette s'élargit (geste, rotation au doigt) : la caméra ne doit jamais
      // être en retard sur le bras. On revient doucement, sans à-coup.
      const want = this.pullBack(), zoom = this.camZoom ?? 1;
      this.camZoom = want > zoom ? want : mix(zoom, want, 1 - Math.exp(-dt * 4));
      this.camera.position.set(0, this.baseY, this.baseDist * this.camZoom * (1 + 0.12 * fx));
      this.camera.lookAt(0, this.baseY, 0);
    }
    if (!S.pose) S.pose = structuredClone(T);
    const P = S.pose, k = 1 - Math.exp(-dt * 10);
    for (const key of ['y', 'ry', 'rz', 'hx', 'hy', 'hz', 'brow', 'flex']) P[key] = mix(P[key], T[key], k);
    P.arms.forEach((a, i) => { for (const key in a) a[key] = mix(a[key], T.arms[i][key], k); });

    this.root.position.y = P.y; this.root.rotation.set(0, P.ry + this.yaw, 0);
    this.upper.rotation.z = P.rz; this.upper.rotation.x = Math.sin(t * 0.9) * 0.012; // le haut se balance, les pieds restent au sol
    this.tail.rotation.z = Math.sin(t * 1.7) * 0.18; this.tail.rotation.x = 0.35 + Math.sin(t * 1.1) * 0.05;
    this.torso.scale.y = 1 + 0.012 * Math.sin(t * 1.4);
    this.neckPivot.rotation.set(P.hx, P.hy, P.hz);
    this.arms.forEach((a, i) => {
      const q = P.arms[i]; a.shoulder.position.y = 0.86 + q.lift; a.shoulder.rotation.set(q.sx, 0, q.sz); a.elbow.rotation.set(q.ex, 0, q.ez);
      a.bicep.scale.set(1 + 0.45 * P.flex, 1 + 0.08 * P.flex, 1 + 0.45 * P.flex); // biceps qui gonfle puis revient
    });

    // Mâchoire : enveloppe des syllabes en cours
    const ms = performance.now();
    let open = 0;
    for (const s of S.syllables) { const x = (ms - s.t0) / s.d; if (x > 0 && x < 1) open = Math.max(open, s.amp * Math.sin(x * Math.PI)); }
    S.syllables = S.syllables.filter((s) => s.t0 + s.d > ms);
    S.mouth = mix(S.mouth, open, 1 - Math.exp(-dt * 28));
    this.jaw.rotation.x = S.mouth * 0.42; this.smile.scale.y = 0.55 - S.mouth * 0.3;

    // Clignements (parfois doubles), regard, sourcils
    if (t > S.blinkAt && S.blinkStart < 0) { S.blinkStart = t; S.blinkAt = t + (Math.random() < 0.2 ? 0.35 : 2.2 + Math.random() * 3.5); }
    let lid = S.calm ? 0.05 : -0.35;
    let blink = S.calm ? 0.3 : 0; // fermeture des paupières du modèle réaliste (0 à 1)
    if (S.blinkStart >= 0) { const x = (t - S.blinkStart) / 0.16; if (x >= 1) S.blinkStart = -1; else { lid = mix(lid, 1.45, Math.sin(x * Math.PI)); blink = mix(blink, 1, Math.sin(x * Math.PI)); } }
    this.eyeState = { blink, gx: S.gaze.x, gy: S.gaze.y };
    if (t > S.gazeAt) { S.gazeAt = t + 1.2 + Math.random() * 2.5; S.gazeTo.set(S.talking ? 0 : (Math.random() - 0.5) * 0.5, S.talking ? 0 : (Math.random() - 0.5) * 0.3); }
    S.gaze.lerp(S.gazeTo, 1 - Math.exp(-dt * 12));
    for (const e of this.eyes) {
      e.lid.rotation.x = lid;
      e.look.rotation.set(-S.gaze.y * 0.5, S.gaze.x * 0.6, 0);
      e.brow.position.y = 0.13 + P.brow * 0.03; e.brow.rotation.z = Math.PI / 2 + (0.25 - P.brow * 0.15) * e.s;
    }

    // Oreilles : frémissements, dressées quand il parle
    if (t > S.earAt && S.earStart < 0) { S.earStart = t; S.earSide = Math.random() < 0.5 ? 0 : 1; S.earAt = t + 2 + Math.random() * 4; }
    this.ears.forEach((ear, i) => {
      let x = S.talking ? -0.12 : 0;
      if (S.earStart >= 0 && i === S.earSide) { const z = (t - S.earStart) / 0.35; if (z >= 1) S.earStart = -1; else x += Math.sin(z * Math.PI * 2) * 0.35; }
      ear.rotation.x = mix(ear.rotation.x, x, 1 - Math.exp(-dt * 18));
    });
    // Même mouvement pour les oreilles du modèle réaliste (amplifié : ses oreilles sont plus petites à l'écran).
    if (this.eyeState) { this.eyeState.earP = this.ears[0].rotation.x * 1.6; this.eyeState.earN = this.ears[1].rotation.x * 1.6; }
    this.forelock.rotation.x = -P.hx * 0.8 + Math.sin(t * 3) * 0.03;
    this.mane.rotation.y = P.hy * 0.4;

    // Vrai modèle 3D (s'il est présent) : animations du fichier, orientation et petits hochements quand il parle
    if (this.model) {
      this.updateTalk();
      // Fin d'un geste : il se fond dans la pose de repos au lieu de revenir d'un coup aux bras écartés.
      const ga = this.gestureAction;
      if (ga && !this.holdPose && !ga.endFading && ga.isRunning() && ga.time > ga.getClip().duration - 0.45) { ga.fadeOut(0.45); ga.endFading = true; }
      this.resetRig();
      this.mixer?.update(dt);
      this.model.position.y = P.y; this.model.rotation.y = P.ry - 0.22 + this.modelYaw + this.yaw;
      this.model.rotation.x = 0; this.model.rotation.z = P.rz;
      this.poseRig(t, dt);
      // Visage : paupières, bouche, regard (les yeux devancent la tête), oreilles (même frémissement que le
      // Gee-Gee fait en code : 0,35 rad = oreille à fond).
      this.face?.set(this.eyeState?.blink || 0, S.mouth, {
        gaze: { x: S.gaze.x * 1.6, y: S.gaze.y * 2 },
        earL: this.ears[0].rotation.x / 0.35, earR: this.ears[1].rotation.x / 0.35
      });
    }

    // Modèle réaliste (Gee-Gee réaliste ou cheval) : même pose que le Gee-Gee fait en code
    if (this.real && this.style !== 'cartoon') {
      this.real.pose(P, S.mouth, t, this.arms, this.eyeState, P.flex);
      const g = this.real.group;
      // Pendant le flex, il pivote un peu (pose de trois quarts) pour montrer ses biceps sans sortir de la colonne.
      g.position.y = P.y; g.rotation.set(Math.sin(t * 0.9) * 0.01, P.ry - 0.22 + this.yaw + 1 * P.flex, P.rz);
    }

    this.renderer.render(this.scene, this.camera);
  }
}
