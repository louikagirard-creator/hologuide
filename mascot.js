// Mascotte 3D « Gee-Gee » : cheval de dessin animé aux couleurs uOttawa (grenat et gris), construit en code avec three.js.
// Aucun modèle externe : tout est généré ici, donc rien à télécharger sur la borne.
// Même interface que l'avatar humain (avatar3d.js) : parole mot par mot, gestes, regard, clignements.
// Design original inspiré des Gee-Gees ; le logo et la mascotte officiels demandent l'accord de l'Université.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const GARNET = 0x8f001a, GREY = 0x6d6e71, COAT = 0xe9e4dc, MUZZLE = 0xf6f1ea, HOOF = 0x3b3b3e;
const VIEWS = { // caméra : position, cible
  upper: { pos: [0, 1.42, 3.1], look: [0, 1.32, 0] },
  mid: { pos: [0, 1.18, 4.3], look: [0, 1.15, 0] },
  full: { pos: [0, 1.1, 4.8], look: [0, 1.05, 0] }
};
const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const lerp = (a, b, k) => a + (b - a) * k;

function mat(color, rough = 0.62, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });
}
function blob(r, color, sx = 1, sy = 1, sz = 1, seg = 32) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.75)), typeof color === 'number' ? mat(color) : color);
  m.scale.set(sx, sy, sz);
  return m;
}
function jerseyText() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '900 150px Arial, Helvetica, sans-serif';
  g.lineWidth = 14; g.strokeStyle = '#6d6e71'; g.strokeText('GG', 256, 110);
  g.fillStyle = '#ffffff'; g.fillText('GG', 256, 110);
  g.font = 'bold 44px Arial, Helvetica, sans-serif'; g.fillStyle = '#d9d9db'; g.fillText('GEE-GEES', 256, 216);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return tex;
}

export class Mascot {
  constructor(host) {
    this.host = host;
    this.el = document.createElement('div');
    this.el.className = 'mascot3d';
    host.appendChild(this.el);

    const r = this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    r.setClearColor(0x000000, 0);
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 0.9;
    this.el.appendChild(r.domElement);

    this.scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(r);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.35;
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    this.setView('upper');

    // Éclairage de studio + contre-jour cyan : la mascotte se détache sur le noir de la boîte holographique.
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x302028, 0.7));
    const key = new THREE.DirectionalLight(0xfff2e6, 1.8); key.position.set(1.6, 2.6, 3); this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x7fdcff, 3.2); rim.position.set(-2, 2.2, -2.5); this.scene.add(rim);
    const rim2 = new THREE.DirectionalLight(0xff8aa0, 1.2); rim2.position.set(2.2, 1, -2); this.scene.add(rim2);

    this.build();
    this.reset();
    this.clock = new THREE.Clock();
    this.running = false;
    new ResizeObserver(() => this.resize()).observe(this.el);
  }

  build() {
    const root = this.root = new THREE.Group(); this.scene.add(root);

    // --- Torse : maillot grenat avec col et bandes grises
    const torso = this.torso = new THREE.Group(); root.add(torso);
    const profile = [[0, 1.07], [0.17, 1.06], [0.36, 1.0], [0.45, 0.88], [0.45, 0.62], [0.39, 0.32], [0.36, 0.05], [0.37, -0.5]]
      .map(([x, y]) => new THREE.Vector2(x, y));
    const jersey = new THREE.Mesh(new THREE.LatheGeometry(profile, 48), mat(GARNET, 0.8));
    jersey.scale.z = 0.76; torso.add(jersey);
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.04, 16, 48), mat(GREY, 0.6));
    collar.rotation.x = Math.PI / 2; collar.position.set(0, 1.04, 0); collar.scale.y = 0.85; torso.add(collar);
    const vneck = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.13, 3), mat(0xffffff, 0.6));
    vneck.rotation.set(Math.PI, 0, 0); vneck.position.set(0, 0.99, 0.2); vneck.scale.z = 0.35; torso.add(vneck);
    const text = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.23), new THREE.MeshStandardMaterial({ map: jerseyText(), transparent: true, roughness: 0.7 }));
    text.position.set(0, 0.66, 0.345); torso.add(text);

    // --- Cou
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.21, 0.42, 32), mat(COAT));
    neck.position.set(0, 1.17, 0.0); neck.rotation.x = 0.1; root.add(neck);

    // --- Tête (pivot au haut du cou)
    const headPivot = this.headPivot = new THREE.Group(); headPivot.position.set(0, 1.3, 0.02); root.add(headPivot);
    const head = this.head = new THREE.Group(); head.position.set(0, 0.24, 0); headPivot.add(head);
    head.rotation.x = 0.28; // tête légèrement baissée : on voit le long museau du cheval
    head.add(blob(0.27, COAT, 1, 1.12, 1.02));
    for (const s of [1, -1]) { const j = blob(0.15, COAT, 0.8, 1, 1); j.position.set(0.15 * s, -0.12, 0.02); head.add(j); }
    const bridge = blob(0.17, COAT, 0.7, 0.85, 1.3); bridge.position.set(0, -0.08, 0.2); head.add(bridge);
    const muzzle = blob(0.21, MUZZLE, 1.08, 0.86, 1.12); muzzle.position.set(0, -0.2, 0.34); head.add(muzzle);
    for (const s of [1, -1]) {
      const n = blob(0.04, 0x4a2c2e, 0.8, 1, 0.6, 16); n.position.set(0.09 * s, -0.15, 0.56); n.rotation.set(-0.3, 0.45 * s, 0); head.add(n);
    }
    // Bouche : mâchoire mobile + intérieur sombre visible quand elle s'ouvre
    const mouthIn = blob(0.15, mat(0x3a0a12, 0.9), 1.15, 0.45, 0.9); mouthIn.position.set(0, -0.3, 0.38); head.add(mouthIn);
    const tongue = blob(0.08, mat(0xd8607a, 0.5), 1.2, 0.35, 1); tongue.position.set(0, -0.33, 0.42); head.add(tongue);
    const jaw = this.jaw = new THREE.Group(); jaw.position.set(0, -0.27, 0.18); head.add(jaw);
    const chin = blob(0.18, MUZZLE, 1.02, 0.5, 1.1); chin.position.set(0, -0.06, 0.22); jaw.add(chin);
    const smile = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.012, 8, 32, Math.PI), mat(0x5a2a30, 0.8));
    smile.rotation.set(0, 0, Math.PI); smile.position.set(0, -0.04, 0.41); smile.scale.set(1, 0.55, 1); jaw.add(smile);
    this.smile = smile;

    // Yeux : blanc, iris, pupille, reflet ; paupières qui basculent pour cligner
    this.lids = []; this.pupils = [];
    for (const s of [1, -1]) {
      const eye = new THREE.Group(); eye.position.set(0.165 * s, 0.09, 0.2); eye.rotation.set(-0.2, 0.5 * s, 0); head.add(eye);
      eye.add(blob(0.085, mat(0xffffff, 0.25), 1, 1.12, 0.75));
      const look = new THREE.Group(); eye.add(look); this.pupils.push(look);
      const iris = blob(0.05, mat(0x5a3418, 0.3), 1, 1.12, 0.5); iris.position.z = 0.052; look.add(iris);
      const pupil = blob(0.03, mat(0x0a0a0a, 0.2), 1, 1.12, 0.5); pupil.position.z = 0.066; look.add(pupil);
      const glint = blob(0.012, new THREE.MeshBasicMaterial({ color: 0xffffff }), 1, 1, 1, 12); glint.position.set(0.016, 0.022, 0.078); look.add(glint);
      const lid = new THREE.Group(); eye.add(lid);
      const lidMesh = new THREE.Mesh(new THREE.SphereGeometry(0.092, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), mat(COAT));
      lidMesh.scale.set(1, 1.12, 0.8); lid.add(lidMesh); this.lids.push(lid);
      const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.009, 0.06, 4, 8), mat(0x5a0a14, 0.7));
      brow.rotation.z = Math.PI / 2 + 0.25 * s; brow.position.set(0.0, 0.13, 0.04); eye.add(brow);
    }

    // Oreilles (pivot à la base pour qu'elles bougent)
    this.ears = [];
    for (const s of [1, -1]) {
      const ear = new THREE.Group(); ear.position.set(0.14 * s, 0.24, -0.06); ear.rotation.set(-0.15, 0, -0.32 * s); head.add(ear);
      const outer = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.27, 20), mat(COAT)); outer.position.y = 0.12; outer.scale.z = 0.55; ear.add(outer);
      const inner = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.17, 20), mat(0xe9a2b0, 0.6)); inner.position.set(0, 0.1, 0.03); inner.scale.z = 0.4; ear.add(inner);
      this.ears.push(ear);
    }

    // Crinière grenat : toupet sur le front + mèches le long du cou
    const maneMat = mat(GARNET, 0.55);
    this.mane = new THREE.Group(); root.add(this.mane);
    this.forelock = new THREE.Group(); this.forelock.position.set(0, 0.28, 0.06); head.add(this.forelock);
    [[-0.09, 0.4], [-0.03, 0.12], [0.03, -0.12], [0.09, -0.4]].forEach(([x, rz]) => {
      const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.22, 16), maneMat);
      tuft.position.set(x, 0.0, 0.06); tuft.rotation.set(1.9, 0, rz); this.forelock.add(tuft);
    });
    for (let i = 0; i < 8; i++) {
      const k = i / 7;
      const tuft = blob(0.09 - k * 0.025, maneMat, 0.7, 1.15, 1);
      tuft.position.set(0, 1.84 - k * 0.78, -0.12 - Math.sin(k * 1.9) * 0.24);
      tuft.rotation.x = -0.5 - k * 0.6;
      this.mane.add(tuft);
    }

    // Bras : épaule (pivot) > manche grenat > coude (pivot) > avant-bras > sabot
    this.arms = [];
    for (const s of [1, -1]) { // s = 1 : côté droit de l'écran
      const shoulder = new THREE.Group(); shoulder.position.set(0.44 * s, 0.86, 0); root.add(shoulder);
      const sleeve = new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.26, 6, 20), mat(GARNET, 0.8)); sleeve.position.y = -0.17; shoulder.add(sleeve);
      const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.02, 8, 24), mat(GREY, 0.6)); cuff.rotation.x = Math.PI / 2; cuff.position.y = -0.34; shoulder.add(cuff);
      const elbow = new THREE.Group(); elbow.position.y = -0.4; shoulder.add(elbow);
      const fore = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.24, 6, 20), mat(COAT)); fore.position.y = -0.16; elbow.add(fore);
      const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.1, 24), mat(HOOF, 0.4)); hoof.position.y = -0.36; elbow.add(hoof);
      this.arms.push({ s, shoulder, elbow });
    }
  }

  reset() {
    this.view = this.view || 'upper';
    this.mouth = 0; this.segs = []; this.talking = false;
    this.gesture = null; this.mood = 'happy';
    this.nextBlink = 1.5; this.blinkT = -1; this.nextEar = 2; this.earT = -1; this.earSide = 0;
    this.gaze = new THREE.Vector2(); this.gazeTarget = new THREE.Vector2(); this.nextGaze = 1;
    this.pose = null;
  }

  setView(name) {
    const v = VIEWS[name] || VIEWS.upper;
    this.view = name;
    this.camera.position.set(...v.pos);
    this.camera.lookAt(new THREE.Vector3(...v.look));
  }
  resize() {
    const w = this.el.clientWidth || 1, h = this.el.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }
  start() {
    if (this.running) return;
    this.running = true; this.clock.getDelta();
    const loop = () => { if (!this.running) return; this.frame(); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }
  stopLoop() { this.running = false; }

  // ---------- Parole ----------
  // Chaque mot devient une ou plusieurs syllabes : la mâchoire s'ouvre selon la voyelle (a large, o/u arrondi, é/i petit).
  queueWord(w, startMs, durMs) {
    const now = performance.now() + startMs;
    const syl = (w.toLowerCase().match(/[aeiouyàâäéèêëîïôöûüù]+/g) || ['a']);
    const n = Math.min(4, syl.length), d = durMs / n;
    for (let i = 0; i < n; i++) {
      const v = syl[i];
      const amp = /[aàâä]/.test(v) ? 1 : /[oôöuûüù]/.test(v) ? 0.75 : 0.55;
      this.segs.push({ t0: now + i * d, dur: d, amp: amp * (0.85 + Math.random() * 0.25) });
    }
  }
  startTalk() { this.segs = []; this.talking = true; this.gaze.set(0, 0); }
  word(w, lang, rate = 1) {
    if (!w) return;
    this.talking = true;
    this.segs = this.segs.filter((s) => s.t0 + s.dur > performance.now());
    this.queueWord(w, 0, Math.min(520, Math.max(130, w.length * 62 / rate)));
  }
  sentence(text, lang, totalMs) {
    this.talking = true; this.segs = [];
    const words = text.split(/\s+/).filter(Boolean);
    const letters = words.reduce((n, w) => n + w.length + 1, 0) || 1;
    let t = 0;
    for (const w of words) { const d = (w.length + 1) / letters * totalMs; this.queueWord(w, t, Math.max(80, d - 30)); t += d; }
    clearTimeout(this.endTimer); this.endTimer = setTimeout(() => this.stop(), totalMs + 200);
  }
  stop() { this.segs = []; this.talking = false; }

  // ---------- Gestes ----------
  react(kind) {
    const g = { hello: ['wave', 2.6], thanks: ['hoofup', 2], none: ['shrug', 2], answer: ['hop', 1.1], sensitive: ['calm', 2] }[kind];
    if (g) this.play(g[0], g[1]);
    this.mood = kind === 'sensitive' ? 'calm' : 'happy';
  }
  play(name, dur) { this.gesture = { name, t0: performance.now() / 1000, dur }; }
  idle() { this.mood = 'happy'; this.gazeTarget.set(0, 0); }

  // Pose cible du moment (angles en radians), à partir d'une pose de repos + le geste en cours.
  targetPose(t) {
    const breathe = Math.sin(t * 1.4);
    const p = {
      rootY: 0.008 * breathe, rootRotY: 0.22 + Math.sin(t * 0.37) * 0.08, rootRotZ: Math.sin(t * 0.29) * 0.015,
      headX: Math.sin(t * 0.8) * 0.03, headY: -0.12 + Math.sin(t * 0.43) * 0.1, headZ: Math.sin(t * 0.61) * 0.05,
      arms: this.arms.map((a) => ({ sz: -0.12 * a.s, sx: 0.05, sy: 0, ez: 0.0, ex: -0.25 + 0.03 * breathe, lift: 0 }))
    };
    if (this.talking) { // en parlant : petits hochements et mains qui accompagnent
      p.headX += Math.sin(t * 5.3) * 0.035; p.headZ += Math.sin(t * 2.1) * 0.05;
      p.arms[0].ex += -0.35 + Math.sin(t * 2.7) * 0.25; p.arms[0].sz += Math.sin(t * 1.9) * 0.08;
      p.arms[1].ex += -0.25 + Math.sin(t * 2.2 + 1) * 0.2;
    }
    if (this.mood === 'calm') { p.headX += 0.08; p.headZ += 0.1; }
    const g = this.gesture;
    if (g) {
      const k = (t - g.t0) / g.dur;
      if (k >= 1) this.gesture = null;
      else {
        const w = ease(Math.min(k / 0.18, (1 - k) / 0.2, 1));
        const R = p.arms[0], Lf = p.arms[1];
        if (g.name === 'wave') {
          R.sz = lerp(R.sz, 2.2, w); R.sx = lerp(R.sx, -0.25, w); R.ex = lerp(R.ex, -0.2, w);
          R.ez = lerp(R.ez, 0.9 + 0.45 * Math.sin((t - g.t0) * 9), w); // avant-bras levé qui se balance
          p.headZ += 0.12 * w; p.rootY += 0.03 * Math.abs(Math.sin((t - g.t0) * 4.5)) * w;
        } else if (g.name === 'hoofup') {
          R.sx = lerp(R.sx, -1.1, w); R.ex = lerp(R.ex, -1.4, w); R.sz = lerp(R.sz, 0.15, w);
          p.headX += 0.12 * Math.sin((t - g.t0) * 6) * w;
        } else if (g.name === 'shrug') {
          for (const a of [R, Lf]) { a.lift = 0.07 * w; a.ex = lerp(a.ex, -1.5, w); a.ez = lerp(a.ez, 0.9 * (a === R ? 1 : -1), w); a.sz = lerp(a.sz, 0.35 * (a === R ? 1 : -1), w); }
          p.headZ += 0.18 * w; p.headX -= 0.05 * w;
        } else if (g.name === 'hop') {
          p.rootY += 0.05 * Math.sin(Math.min(1, k * 2) * Math.PI) * w; p.headZ += 0.08 * w;
        } else if (g.name === 'calm') {
          for (const a of [R, Lf]) { a.sx = lerp(a.sx, -0.6, w); a.ex = lerp(a.ex, -1.2, w); a.sz = lerp(a.sz, -0.25 * (a === R ? 1 : -1), w); }
        }
      }
    }
    return p;
  }

  frame() {
    const dt = Math.min(0.05, this.clock.getDelta());
    const t = performance.now() / 1000; // horloge réelle : les gestes restent justes même si l'image ralentit
    const target = this.targetPose(t);
    if (!this.pose) this.pose = JSON.parse(JSON.stringify(target));
    const k = 1 - Math.exp(-dt * 10);
    const P = this.pose;
    for (const key of ['rootY', 'rootRotY', 'rootRotZ', 'headX', 'headY', 'headZ']) P[key] = lerp(P[key], target[key], k);
    P.arms.forEach((a, i) => { for (const key in a) a[key] = lerp(a[key], target.arms[i][key], k); });

    this.root.position.y = P.rootY;
    this.root.rotation.set(0, P.rootRotY, P.rootRotZ);
    this.torso.scale.y = 1 + 0.012 * Math.sin(t * 1.4);
    this.headPivot.rotation.set(P.headX, P.headY, P.headZ);
    this.arms.forEach((a, i) => {
      const q = P.arms[i];
      a.shoulder.position.y = 0.86 + q.lift;
      a.shoulder.rotation.set(q.sx, q.sy, q.sz);
      a.elbow.rotation.set(q.ex, 0, q.ez);
    });

    // Mâchoire : enveloppe des syllabes en cours (attaque et relâchement doux)
    const now = performance.now();
    let open = 0;
    for (const s of this.segs) {
      const x = (now - s.t0) / s.dur;
      if (x > 0 && x < 1) open = Math.max(open, s.amp * Math.sin(x * Math.PI));
    }
    this.segs = this.segs.filter((s) => s.t0 + s.dur > now);
    if (!this.segs.length && this.talking && !speechSynthesis?.speaking) this.talking = false;
    this.mouth = lerp(this.mouth, open, 1 - Math.exp(-dt * 28));
    this.jaw.rotation.x = this.mouth * 0.42;
    this.smile.scale.y = 0.55 - this.mouth * 0.3;

    // Clignements (parfois doubles)
    if (t > this.nextBlink && this.blinkT < 0) { this.blinkT = t; this.nextBlink = t + 2.2 + Math.random() * 3.5; if (Math.random() < 0.2) this.nextBlink = t + 0.35; }
    let lid = -0.35;
    if (this.blinkT >= 0) {
      const b = (t - this.blinkT) / 0.16;
      if (b >= 1) this.blinkT = -1; else lid = lerp(-0.35, 1.45, Math.sin(b * Math.PI));
    }
    if (this.mood === 'calm') lid = Math.max(lid, 0.05);
    this.lids.forEach((l) => { l.rotation.x = lid; });

    // Regard : vers la personne, avec de petits coups d'œil
    if (t > this.nextGaze) {
      this.nextGaze = t + 1.2 + Math.random() * 2.5;
      this.gazeTarget.set(this.talking ? 0 : (Math.random() - 0.5) * 0.5, this.talking ? 0 : (Math.random() - 0.5) * 0.3);
    }
    this.gaze.lerp(this.gazeTarget, 1 - Math.exp(-dt * 12));
    this.pupils.forEach((p) => { p.rotation.set(-this.gaze.y * 0.5, this.gaze.x * 0.6, 0); });

    // Oreilles : frémissements aléatoires, et dressées quand elle parle
    if (t > this.nextEar && this.earT < 0) { this.earT = t; this.earSide = Math.random() < 0.5 ? 0 : 1; this.nextEar = t + 2 + Math.random() * 4; }
    this.ears.forEach((e, i) => {
      let x = this.talking ? -0.12 : 0;
      if (this.earT >= 0 && (i === this.earSide || Math.random() < 0.02)) {
        const z = (t - this.earT) / 0.35; if (z >= 1) this.earT = -1; else x += Math.sin(z * Math.PI * 2) * 0.35;
      }
      e.rotation.x = lerp(e.rotation.x, x, 1 - Math.exp(-dt * 18));
    });

    // Crinière et toupet suivent la tête avec un léger retard
    this.forelock.rotation.x = -P.headX * 0.8 + Math.sin(t * 3) * 0.03;
    this.mane.rotation.y = P.headY * 0.4;

    this.renderer.render(this.scene, this.camera);
  }
}
