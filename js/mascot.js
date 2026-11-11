// Gee-Gee : mascotte 3D (cheval de dessin animé, grenat et gris uOttawa), construite en code avec three.js.
// Aucun modèle à télécharger. Fond transparent : sur le noir de la boîte holographique, seul Gee-Gee « flotte ».
// Design original inspiré des Gee-Gees ; la mascotte et le logo officiels demandent l'accord de l'Université.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const C = { garnet: 0x8f001a, garnetDark: 0x5c0010, grey: 0x6d6e71, coat: 0xece7df, muzzle: 0xf7f2eb, hoof: 0x37373a, pink: 0xeaa3b2 };
const VIEWS = { bust: { pos: [0, 1.5, 3.2], look: [0, 1.4, 0] }, wide: { pos: [0, 1.2, 4.3], look: [0, 1.15, 0] } };
const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const mix = (a, b, k) => a + (b - a) * k;
const now = () => performance.now() / 1000;

const mat = (color, roughness = 0.65, more = {}) => new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, ...more });
function ball(r, material, sx = 1, sy = 1, sz = 1, seg = 32) {
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
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 0.9;
    this.el.appendChild(r.domElement);

    this.scene = new THREE.Scene();
    this.scene.environment = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.35;
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x302028, 0.7));
    at(new THREE.DirectionalLight(0xfff2e6, 1.8), 1.6, 2.6, 3, this.scene);   // lumière principale
    at(new THREE.DirectionalLight(0x7fdcff, 3.2), -2, 2.2, -2.5, this.scene); // contre-jour cyan (effet hologramme)
    at(new THREE.DirectionalLight(0xff8aa0, 1.2), 2.2, 1, -2, this.scene);    // contre-jour grenat
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    this.setView('bust');

    this.build();
    this.state = {
      mouth: 0, syllables: [], talking: false, gesture: null, calm: false, pose: null, attention: null,
      blinkAt: now() + 1.5, blinkStart: -1, earAt: now() + 2, earStart: -1, earSide: 0,
      gaze: new THREE.Vector2(), gazeTo: new THREE.Vector2(), gazeAt: now() + 1, fidgetAt: now() + 8, last: now()
    };
    new ResizeObserver(() => this.resize()).observe(this.el);
    window.addEventListener('pointerdown', (e) => this.lookToward(e.clientX, e.clientY), { passive: true });
  }

  build() {
    const root = this.root = new THREE.Group(); this.scene.add(root);

    // Torse : maillot grenat (forme tournée qui sort du bas de l'image), col gris, inscription « GG »
    const torso = this.torso = new THREE.Group(); root.add(torso);
    const shape = [[0, 1.07], [0.17, 1.06], [0.36, 1.0], [0.45, 0.88], [0.45, 0.62], [0.39, 0.32], [0.36, 0.05], [0.37, -0.5]].map(([x, y]) => new THREE.Vector2(x, y));
    const jersey = new THREE.Mesh(new THREE.LatheGeometry(shape, 48), mat(C.garnet, 0.8)); jersey.scale.z = 0.76; torso.add(jersey);
    const collar = at(new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.04, 16, 48), mat(C.grey, 0.6)), 0, 1.04, 0, torso);
    collar.rotation.x = Math.PI / 2; collar.scale.y = 0.85;
    const label = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.23), new THREE.MeshStandardMaterial({ map: jerseyLabel(), transparent: true, roughness: 0.7 }));
    at(label, 0, 0.66, 0.345, torso);

    const neck = at(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.21, 0.42, 32), mat(C.coat)), 0, 1.17, 0, root);
    neck.rotation.x = 0.1;

    // Tête de cheval : crâne, joues, long museau, naseaux ; légèrement baissée pour qu'on voie le museau
    this.neckPivot = at(new THREE.Group(), 0, 1.3, 0.02, root);
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
    this.mane = new THREE.Group(); root.add(this.mane);
    for (let i = 0; i < 8; i++) {
      const k = i / 7;
      at(ball(0.09 - k * 0.025, mane, 0.7, 1.15, 1), 0, 1.84 - k * 0.78, -0.12 - Math.sin(k * 1.9) * 0.24, this.mane).rotation.x = -0.5 - k * 0.6;
    }

    // Bras : épaule arrondie > manche > coude > avant-bras > sabot
    this.arms = [1, -1].map((s) => {
      const shoulder = at(new THREE.Group(), 0.44 * s, 0.86, 0, root);
      at(ball(0.13, mat(C.garnet, 0.8), 1, 0.9, 0.9), 0, -0.02, 0, shoulder);
      at(new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.26, 6, 20), mat(C.garnet, 0.8)), 0, -0.17, 0, shoulder);
      at(new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.02, 8, 24), mat(C.grey, 0.6)), 0, -0.34, 0, shoulder).rotation.x = Math.PI / 2;
      const elbow = at(new THREE.Group(), 0, -0.4, 0, shoulder);
      at(new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.24, 6, 20), mat(C.coat)), 0, -0.16, 0, elbow);
      at(new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.1, 24), mat(C.hoof, 0.4)), 0, -0.36, 0, elbow);
      return { s, shoulder, elbow };
    });

    // Particules lumineuses qui montent : effet de projection holographique
    const N = 140, positions = new Float32Array(N * 3), colors = new Float32Array(N * 3);
    const cyan = new THREE.Color(0xffffff), red = new THREE.Color(0xd0103a); // blanc et grenat
    this.sparks = Array.from({ length: N }, (_, i) => {
      const c = Math.random() < 0.75 ? cyan : red; colors.set([c.r, c.g, c.b], i * 3);
      return { a: Math.random() * Math.PI * 2, r: 0.55 + Math.random() * 0.55, y: Math.random() * 2.4 - 0.2, v: 0.08 + Math.random() * 0.18, w: (Math.random() - 0.5) * 0.4 };
    });
    this.sparkGeo = new THREE.BufferGeometry();
    this.sparkGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.sparkGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.scene.add(new THREE.Points(this.sparkGeo, new THREE.PointsMaterial({ size: 0.03, vertexColors: true, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false })));
  }

  // ---------- Affichage ----------
  mount(parent, view = 'bust') {
    if (this.el.parentNode !== parent) parent.appendChild(this.el);
    this.setView(view); this.resize();
    if (!this.running) { this.running = true; const loop = () => { this.frame(); requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
  }
  setView(name) {
    const v = VIEWS[name] || VIEWS.bust;
    this.camera.position.set(...v.pos); this.camera.lookAt(...v.look);
  }
  resize() {
    const w = this.el.clientWidth || 1, h = this.el.clientHeight || 1;
    this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
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
    const g = { hello: ['wave', 2.6], thanks: ['hoofUp', 2], none: ['shrug', 2], answer: ['hop', 1.1], sensitive: ['calm', 2.5] }[kind];
    this.state.calm = kind === 'sensitive';
    if (g) this.play(...g);
  }
  play(name, dur) { this.state.gesture = { name, t0: now(), dur }; }
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
      arms: this.arms.map((a) => ({ sx: 0.05, sz: -0.12 * a.s, ex: -0.25 + 0.03 * b, ez: 0, lift: 0 }))
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
    if (!S.talking && !S.gesture && t > S.fidgetAt) { // petite animation spontanée pour attirer les passants
      S.fidgetAt = t + 7 + Math.random() * 8;
      const pick = ['tilt', 'lookAround', 'hop', 'tilt'][Math.floor(Math.random() * 4)];
      this.play(pick, pick === 'lookAround' ? 2.6 : 1.4);
      if (pick === 'tilt') { S.earStart = t; S.earSide = Math.random() < 0.5 ? 0 : 1; }
    }
    const g = S.gesture;
    if (g) {
      const k = (t - g.t0) / g.dur, e = t - g.t0;
      if (k >= 1) S.gesture = null;
      else {
        const w = smooth(Math.min(k / 0.18, (1 - k) / 0.2, 1));
        const [R, L] = p.arms;
        if (['wave', 'hoofUp', 'hop', 'tilt'].includes(g.name)) p.brow = mix(p.brow, 1, w);
        if (g.name === 'wave') {
          Object.assign(R, { sz: mix(R.sz, 2.2, w), sx: mix(R.sx, -0.25, w), ex: mix(R.ex, -0.2, w), ez: mix(R.ez, 0.9 + 0.45 * Math.sin(e * 9), w) });
          p.hz += 0.12 * w; p.y += 0.03 * Math.abs(Math.sin(e * 4.5)) * w;
        } else if (g.name === 'hoofUp') {
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
        }
      }
    }
    return p;
  }

  frame() {
    const S = this.state, t = now();
    const dt = Math.min(0.05, t - S.last); S.last = t;
    const T = this.target(t);
    if (!S.pose) S.pose = structuredClone(T);
    const P = S.pose, k = 1 - Math.exp(-dt * 10);
    for (const key of ['y', 'ry', 'rz', 'hx', 'hy', 'hz', 'brow']) P[key] = mix(P[key], T[key], k);
    P.arms.forEach((a, i) => { for (const key in a) a[key] = mix(a[key], T.arms[i][key], k); });

    this.root.position.y = P.y; this.root.rotation.set(0, P.ry, P.rz);
    this.torso.scale.y = 1 + 0.012 * Math.sin(t * 1.4);
    this.neckPivot.rotation.set(P.hx, P.hy, P.hz);
    this.arms.forEach((a, i) => { const q = P.arms[i]; a.shoulder.position.y = 0.86 + q.lift; a.shoulder.rotation.set(q.sx, 0, q.sz); a.elbow.rotation.set(q.ex, 0, q.ez); });

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
    if (S.blinkStart >= 0) { const x = (t - S.blinkStart) / 0.16; if (x >= 1) S.blinkStart = -1; else lid = mix(lid, 1.45, Math.sin(x * Math.PI)); }
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
    this.forelock.rotation.x = -P.hx * 0.8 + Math.sin(t * 3) * 0.03;
    this.mane.rotation.y = P.hy * 0.4;

    // Particules
    const pos = this.sparkGeo.attributes.position;
    this.sparks.forEach((s, i) => {
      s.y += s.v * dt; s.a += s.w * dt;
      if (s.y > 2.3) { s.y = -0.2; s.a = Math.random() * Math.PI * 2; }
      pos.setXYZ(i, Math.cos(s.a) * s.r, s.y, Math.sin(s.a) * s.r * 0.6 - 0.1);
    });
    pos.needsUpdate = true;

    this.renderer.render(this.scene, this.camera);
  }
}
