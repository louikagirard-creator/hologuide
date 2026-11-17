// Gee-Gee réaliste et cheval réaliste : un vrai modèle 3D (assets/cheval-realiste.glb, généré à partir d'une image),
// avec fourrure en temps réel et animation calculée directement sur la carte graphique.
//
// - Fourrure : « shell fur », le maillage est recopié en couches poussées le long de la normale ; un motif de brins
//   en 3D découpe les poils. Les zones non orangées de la texture (sabots, yeux, naseaux) restent sans poils.
// - Variante « geegee » : pelage crème, maillot grenat GG / GEE-GEES 48 et short gris, dessinés dans le shader.
// - Animation sans squelette : la tête, la mâchoire et les bras tournent autour de pivots mesurés sur le modèle,
//   avec des poids progressifs (épaules, cou) ; les poils et les vêtements suivent automatiquement.
//   Les gestes viennent de la même logique que le Gee-Gee fait en code (mascot.js) : parole, salut, haussement…
import * as THREE from 'three';

// Repères du corps en fraction de hauteur (t = 0 aux sabots, 1 au bout des oreilles), devant = +z, unité = hauteur.
// Mesurés sur le modèle : épaules ≈ 0,70, aisselles ≈ 0,62, coudes ≈ 0,52, entrejambe ≈ 0,42, cou ≈ 0,755.
const BODY_GLSL = `
  uniform float bodyMinY, bodyH, geegee;
  float bodyT(vec3 p) { return (p.y - bodyMinY) / bodyH; }
  vec3 bodyN(vec3 p) { return p / bodyH; }
  // 1 = maillot, 2 = short, 0 = pelage
  float clothZone(vec3 p) {
    if (geegee < 0.5) return 0.0;
    vec3 q = bodyN(p); float t = bodyT(p); float ax = abs(q.x);
    bool torso = t > 0.475 && t < 0.755 && (t > 0.62 || ax < 0.118);
    float ny = (0.758 - t) / (q.z > 0.0 ? 0.05 : 0.022);
    bool collar = (ax / 0.07) * (ax / 0.07) + ny * ny < 1.0;
    bool tail = q.z < -0.105 && t < 0.56;
    if (torso && !collar && !tail) return 1.0;
    if (t > 0.335 && t <= 0.475 && ax < 0.126 && !tail) return 2.0;
    return 0.0;
  }
  vec3 recolor(vec3 col) {
    if (geegee < 0.5) return col;
    float L = dot(col, vec3(0.299, 0.587, 0.114));
    float orange = smoothstep(0.05, 0.16, col.r - col.b);
    float hair = (1.0 - smoothstep(0.26, 0.40, max(col.r, col.g))) * smoothstep(0.01, 0.05, col.r - col.b);
    vec3 cream = vec3(0.95, 0.92, 0.87) * clamp(0.25 + L * 1.55, 0.45, 1.06);
    vec3 grey = vec3(0.60, 0.61, 0.64) * clamp(0.55 + L * 2.2, 0.55, 1.15);
    return mix(mix(col, cream, orange), grey, hair * (1.0 - orange));
  }
`;

// Déformation (« squelette » doux) : appliquée à la position et à la normale de chaque couche.
const RIG_GLSL = `
  uniform mat3 headR; uniform float jaw, breath; uniform vec4 armP, armN; // bras côté +x / −x : (lever, avant, côté, avant épaule)
  mat3 rotX(float a) { float c = cos(a), s = sin(a); return mat3(1., 0., 0., 0., c, s, 0., -s, c); }
  mat3 rotZ(float a) { float c = cos(a), s = sin(a); return mat3(c, s, 0., -s, c, 0., 0., 0., 1.); }
  void rigApply(inout vec3 Q, inout vec3 N, mat3 R, vec3 pivot, float w) {
    Q = mix(Q, R * (Q - pivot) + pivot, w);
    N = normalize(mix(N, R * N, w));
  }
  // Q : coordonnées du corps (x, t, z) en unités de hauteur
  void rig(inout vec3 Q, inout vec3 N) {
    float s = Q.x >= 0.0 ? 1.0 : -1.0;
    vec4 a = s > 0.0 ? armP : armN;
    float ax = abs(Q.x);
    float wArm = smoothstep(0.105, 0.14, ax) * (1.0 - smoothstep(0.64, 0.73, Q.y)) * smoothstep(0.24, 0.28, Q.y);
    float wFore = wArm * (1.0 - smoothstep(0.49, 0.545, Q.y));
    float wHead = smoothstep(0.715, 0.79, Q.y) * (1.0 - wArm);
    float wJaw = smoothstep(0.11, 0.15, Q.z) * smoothstep(0.742, 0.752, Q.y) * (1.0 - smoothstep(0.776, 0.788, Q.y));
    float wChest = smoothstep(0.5, 0.58, Q.y) * (1.0 - smoothstep(0.68, 0.74, Q.y)) * (1.0 - wArm);
    // Respiration : la cage thoracique gonfle un peu.
    Q.xz *= 1.0 + breath * 0.012 * wChest;
    // Avant-bras autour du coude, puis bras entier autour de l'épaule.
    rigApply(Q, N, rotZ(a.z * s) * rotX(-a.y), vec3(s * 0.165, 0.515, 0.0), wFore);
    rigApply(Q, N, rotZ(a.x * s) * rotX(-a.w), vec3(s * 0.14, 0.695, 0.0), wArm);
    // Mâchoire puis tête entière autour du cou.
    rigApply(Q, N, rotX(jaw), vec3(0.0, 0.79, 0.06), wJaw);
    rigApply(Q, N, headR, vec3(0.0, 0.755, 0.0), wHead);
  }
`;

export const realSettings = {
  furLength: { value: 0.012 }, density: { value: 900 }, gravity: { value: 0.35 }, furOn: { value: 1 },
  geegee: { value: 1 }, headR: { value: new THREE.Matrix3() }, jaw: { value: 0 }, breath: { value: 0 },
  armP: { value: new THREE.Vector4() }, armN: { value: new THREE.Vector4() }
};

function smoothNormals(geometry) {
  const pos = geometry.attributes.position, n = pos.count;
  const idx = geometry.index ? geometry.index.array : null;
  const key = (i) => `${pos.getX(i).toFixed(5)},${pos.getY(i).toFixed(5)},${pos.getZ(i).toFixed(5)}`;
  const groups = new Map(), gid = new Int32Array(n);
  for (let i = 0; i < n; i++) { const k = key(i); if (!groups.has(k)) groups.set(k, groups.size); gid[i] = groups.get(k); }
  const acc = new Float32Array(groups.size * 3);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), f = new THREE.Vector3(), e = new THREE.Vector3();
  const tri = idx ? idx.length / 3 : n / 3;
  for (let t = 0; t < tri; t++) {
    const i0 = idx ? idx[t * 3] : t * 3, i1 = idx ? idx[t * 3 + 1] : t * 3 + 1, i2 = idx ? idx[t * 3 + 2] : t * 3 + 2;
    a.fromBufferAttribute(pos, i0); b.fromBufferAttribute(pos, i1); c.fromBufferAttribute(pos, i2);
    f.subVectors(c, b).cross(e.subVectors(a, b));
    for (const i of [i0, i1, i2]) { const g = gid[i] * 3; acc[g] += f.x; acc[g + 1] += f.y; acc[g + 2] += f.z; }
  }
  const normals = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const g = gid[i] * 3; f.set(acc[g], acc[g + 1], acc[g + 2]).normalize();
    normals[i * 3] = f.x; normals[i * 3 + 1] = f.y; normals[i * 3 + 2] = f.z;
  }
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
}

function bodyUniforms(s, bounds) {
  s.uniforms.bodyMinY = { value: bounds.min.y };
  s.uniforms.bodyH = { value: bounds.max.y - bounds.min.y };
  for (const k of ['geegee', 'headR', 'jaw', 'breath', 'armP', 'armN']) s.uniforms[k] = realSettings[k];
}

// Partie commune du vertex shader : déformation + poussée le long de la normale (offset en unités de hauteur).
function vertexPatch(s, offsetExpr) {
  s.vertexShader = s.vertexShader
    .replace('#include <common>', `#include <common>
      ${BODY_GLSL}
      ${RIG_GLSL}
      uniform float furLength, gravity, shellH, furOn; varying vec3 vBase;
      vec3 rigQ; vec3 rigN;`)
    .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
      rigQ = vec3(position.x / bodyH, bodyT(position), position.z / bodyH); rigN = objectNormal;
      rig(rigQ, rigN);
      objectNormal = rigN;`)
    .replace('#include <begin_vertex>', `#include <begin_vertex>
      vBase = position;
      transformed = vec3(rigQ.x * bodyH, rigQ.y * bodyH + bodyMinY, rigQ.z * bodyH);
      ${offsetExpr}`);
}

function shellMaterial(base, h, bounds) {
  const m = base.clone();
  m.transparent = false; m.alphaTest = 0; m.side = THREE.FrontSide; m.roughness = 0.9; m.metalness = 0;
  m.onBeforeCompile = (s) => {
    for (const k of ['furLength', 'density', 'gravity', 'furOn']) s.uniforms[k] = realSettings[k];
    s.uniforms.shellH = { value: h };
    bodyUniforms(s, bounds);
    vertexPatch(s, `transformed += objectNormal * furLength * bodyH * shellH * furOn;
      transformed.y -= gravity * furLength * bodyH * shellH * shellH * furOn;`);
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float density, shellH, furOn; varying vec3 vBase;
        ${BODY_GLSL}
        float h31(vec3 p) { p = fract(p * vec3(.1031, .1030, .0973)); p += dot(p, p.yxz + 33.33); return fract((p.x + p.y) * p.z); }
        vec3 h33(vec3 p) { p = fract(p * vec3(.1031, .1030, .0973)); p += dot(p, p.yxz + 33.33); return fract((p.xxy + p.yxx) * p.zyx); }`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        {
          vec3 raw = diffuseColor.rgb;
          vec3 col = recolor(raw);
          float orange = smoothstep(0.04, 0.16, raw.r - raw.b) * smoothstep(0.03, 0.12, max(raw.r, raw.g));
          float cloth = clothZone(vBase);
          float strand = 0.0;
          if (shellH > 0.0) {
            if (cloth > 0.5 || furOn < 0.5) discard;
            vec3 p = (vBase / bodyH) * density, c = floor(p);
            float best = 9.0, rnd = 0.0;
            for (int x = 0; x <= 1; x++) for (int y = 0; y <= 1; y++) for (int z = 0; z <= 1; z++) {
              vec3 cc = c + vec3(x, y, z) - 0.5 + step(0.5, fract(p));
              float d = length(p - (cc + h33(cc)));
              if (d < best) { best = d; rnd = h31(cc); }
            }
            float len = mix(0.55, 1.0, rnd) * orange;
            float radius = 0.62 * (1.0 - shellH / max(len, 1e-3));
            if (shellH > len || best > radius) discard;
            strand = rnd;
          }
          float ao = mix(0.55, 1.08, shellH) * mix(1.0, 0.9 + 0.2 * strand, step(0.001, shellH));
          diffuseColor.rgb = col * mix(1.0, ao, orange * (1.0 - step(0.5, cloth)));
        }`);
  };
  m.customProgramCacheKey = () => 'realhorse-fur' + h.toFixed(3);
  return m;
}

// Lettrage du maillot : devant « GG », dos « GEE-GEES » et « 48 » (1848, fondation de l'Université).
function jerseyArt() {
  const c = Object.assign(document.createElement('canvas'), { width: 1024, height: 512 });
  const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, 1024, 512);
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  g.strokeStyle = '#808080'; g.fillStyle = '#fff';
  g.font = '900 230px Arial Black, Arial, sans-serif'; g.lineWidth = 22;
  g.strokeText('GG', 256, 270); g.fillText('GG', 256, 270);
  g.font = '900 78px Arial Black, Arial, sans-serif'; g.lineWidth = 10;
  g.strokeText('GEE-GEES', 768, 150); g.fillText('GEE-GEES', 768, 150);
  g.font = '900 190px Arial Black, Arial, sans-serif'; g.lineWidth = 18;
  g.strokeText('48', 768, 330); g.fillText('48', 768, 330);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace; t.anisotropy = 8;
  return t;
}

function clothMaterial(bounds) {
  const art = jerseyArt();
  const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.85, sheen: 0.25, sheenRoughness: 0.6, sheenColor: new THREE.Color(0x8a3a48) });
  m.onBeforeCompile = (s) => {
    for (const k of ['furLength', 'gravity', 'furOn']) s.uniforms[k] = realSettings[k];
    s.uniforms.shellH = { value: 0 };
    bodyUniforms(s, bounds);
    s.uniforms.art = { value: art };
    vertexPatch(s, 'transformed += objectNormal * bodyH * 0.0055;'); // tissu ≈ 1 cm au-dessus de la peau
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform sampler2D art; varying vec3 vBase;
        ${BODY_GLSL}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          float zone = clothZone(vBase);
          if (zone < 0.5) discard;
          vec3 q = bodyN(vBase); float t = bodyT(vBase); float ax = abs(q.x);
          // Couleurs uOttawa en espace linéaire : grenat #8f001a, gris #6d6e71.
          vec3 garnet = vec3(0.274, 0.0, 0.0103), grey = vec3(0.153, 0.155, 0.162), white = vec3(0.86);
          vec3 c;
          if (zone < 1.5) {
            c = garnet;
            bool sleeve = ax > 0.118 && t > 0.6;
            float band = sleeve ? t - 0.61 : t - 0.475;
            if (band > 0.0 && band < 0.03) c = (band > 0.01 && band < 0.02) ? white : grey;
            float ny2 = (0.758 - t) / (q.z > 0.0 ? 0.05 : 0.022);
            if ((ax / 0.085) * (ax / 0.085) + ny2 * ny2 * 0.6 < 1.0 && !sleeve) c = grey;
            if (!sleeve) {
              bool front = q.z > 0.0;
              float v = (t - 0.53) / 0.17;
              if (v > 0.0 && v < 1.0 && ax < 0.1) {
                float u = clamp(q.x / 0.20 + 0.5, 0.0, 1.0);
                vec2 tuv = front ? vec2(u * 0.5, v) : vec2(0.5 + (1.0 - u) * 0.5, v);
                vec3 a = texture2D(art, tuv).rgb;
                c = mix(c, white, step(0.75, a.r));
                c = mix(c, grey, step(0.3, a.r) * (1.0 - step(0.75, a.r)));
              }
            }
          } else {
            c = grey * 1.15;
            if (t - 0.335 < 0.012) c = garnet;
          }
          diffuseColor.rgb = c;
        }`);
  };
  m.customProgramCacheKey = () => 'realhorse-cloth';
  return m;
}

export class RealHorse {
  constructor(url) { this.url = url; this.group = new THREE.Group(); this.ready = null; }

  // Charge le modèle, le met à l'échelle (hauteur donnée), pieds au sol, et crée les couches de poils et les vêtements.
  load(height, floorY, shells = 28) {
    if (this.ready) return this.ready;
    this.ready = (async () => {
      const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
      const gltf = await new GLTFLoader().loadAsync(this.url);
      const m = gltf.scene;
      const meshes = [];
      m.traverse((o) => { if (o.isMesh) meshes.push(o); });
      for (const mesh of meshes) {
        smoothNormals(mesh.geometry);
        mesh.geometry.computeBoundingBox();
        const bounds = mesh.geometry.boundingBox, base = mesh.material;
        mesh.material = shellMaterial(base, 0, bounds);
        mesh.frustumCulled = false; // la déformation sort parfois de la boîte englobante d'origine
        const cloth = new THREE.Mesh(mesh.geometry, clothMaterial(bounds));
        cloth.frustumCulled = false; mesh.add(cloth);
        for (let i = 1; i <= shells; i++) {
          const shell = new THREE.Mesh(mesh.geometry, shellMaterial(base, i / shells, bounds));
          shell.renderOrder = i; shell.frustumCulled = false; mesh.add(shell);
        }
      }
      const box = new THREE.Box3().setFromObject(m), size = box.getSize(new THREE.Vector3());
      m.scale.setScalar(height / size.y);
      box.setFromObject(m);
      const c = box.getCenter(new THREE.Vector3());
      m.position.set(-c.x, floorY - box.min.y, -c.z);
      m.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      this.group.add(m);
      return this;
    })();
    return this.ready;
  }

  setVariant(v) { realSettings.geegee.value = v === 'geegee' ? 1 : 0; }

  // Applique la pose calculée par mascot.js (tête, bras, mâchoire) au modèle réaliste.
  pose(P, mouth, t, arms) {
    // Amplitudes réduites : sans vrai squelette, une grande rotation étirerait le cou.
    const e = new THREE.Euler(P.hx * 0.6, (P.hy + 0.12) * 0.5, P.hz * 0.6, 'YXZ');
    realSettings.headR.value.setFromMatrix4(new THREE.Matrix4().makeRotationFromEuler(e));
    realSettings.jaw.value = mouth * 0.22;
    realSettings.breath.value = Math.sin(t * 1.4);
    // Écart par rapport au repos du Gee-Gee fait en code (sz repos = −0,12·s, ex repos = −0,25).
    P.arms.forEach((q, i) => {
      const s = arms[i].s, v = s > 0 ? realSettings.armP.value : realSettings.armN.value;
      const raise = Math.max(-0.1, Math.min(1.35, (q.sz + 0.12 * s) * s * 0.62));
      const fwd = Math.max(-0.2, Math.min(1.5, -(q.ex + 0.25) * 0.85));
      v.set(raise, fwd, q.ez * s * 0.5, -q.sx * 0.5);
    });
  }
}
