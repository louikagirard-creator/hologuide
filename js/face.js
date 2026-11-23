// Visage du modèle importé (assets/geegee.glb) : paupières qui clignent, bouche qui s'ouvre quand Gee-Gee parle,
// yeux qui suivent le regard et oreilles qui frémissent.
//
// Le modèle de Meshy n'a ni os ni « blend shapes » pour le visage : ses yeux et ses dents sont seulement peints
// dans la texture. On ajoute donc deux choses, sans toucher au fichier :
//  1. Paupières : dans le shader du matériau, la zone de chaque œil est repeinte en couleur de fourrure, de haut en bas,
//     selon le clignement (0 = ouvert, 1 = fermé), avec une ligne de cils foncée au bord de la paupière.
//  2. Yeux : le blanc, l'iris, la pupille et le reflet sont redessinés par le shader, l'iris décalé vers le regard.
//  3. Oreilles : une morph target par oreille (vers l'arrière / vers l'avant) pour les frémissements.
//  4. Bouche : une « morph target » abaisse la mâchoire (les sommets sous la ligne des dents tournent autour d'un pivot
//     derrière le museau) et le shader assombrit l'espace qui s'ouvre entre les dents du haut et du bas.
// Les zones sont repérées dans l'espace de la pose de départ (coordonnées du fichier, avant le squelette) : elles ont été
// mesurées en échantillonnant la texture sur les triangles de la tête. Si l'équipe remplace geegee.glb, il faudra
// les mesurer de nouveau (voir FACE ci-dessous) ; si le fichier ne ressemble pas, le visage reste simplement tel quel.
import * as THREE from 'three';

// Mesures pour assets/geegee.glb (pose de départ, en unités du fichier)
const FACE = {
  eyes: [
    { c: [-0.101, 1.530, 0.150], r: [0.057, 0.048] }, // œil droit de Gee-Gee (à gauche à l'écran)
    { c: [0.103, 1.531, 0.150], r: [0.057, 0.048] }   // œil gauche de Gee-Gee
  ],
  teeth: { c: [0.0, 1.183, 0.204], r: [0.085, 0.027] }, // bande blanche des dents
  jaw: { pivot: [1.183, -0.06], maxAngle: 0.15, halfWidth: 0.16, bottom: 1.0 }, // pivot (y, z) de la mâchoire
  // Intérieur de l'œil (blanc) et iris peints dans la texture : le shader les redessine pour que l'iris suive le regard.
  // (La texture de Meshy découpe les yeux en petits morceaux : on ne peut pas simplement la décaler.)
  inner: [{ c: [-0.100, 1.529], r: [0.051, 0.041] }, { c: [0.1025, 1.532], r: [0.050, 0.042] }],
  iris: [{ c: [-0.100, 1.5195], r: 0.0235 }, { c: [0.0994, 1.5195], r: 0.0225 }],
  irisColor: [172, 126, 120], // couleur moyenne de l'iris dans la texture (sRGB)
  ears: { x: 0.205, y: 1.66, z: -0.05, minY: 1.58 } // base des oreilles (de chaque côté, x = ±0.205)
};

// Couleur moyenne de la fourrure juste sous les yeux : c'est la couleur des paupières.
function furColor(mesh) {
  const img = mesh.material.map?.image;
  if (!img) return new THREE.Color(0x8c8c8c);
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
  const D = ctx.getImageData(0, 0, c.width, c.height).data;
  const P = mesh.geometry.attributes.position, UV = mesh.geometry.attributes.uv;
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
    if (z < 0.05 || y < 1.39 || y > 1.46 || Math.abs(x) < 0.04 || Math.abs(x) > 0.17) continue;
    const o = (Math.floor(UV.getY(i) * (c.height - 1)) * c.width + Math.floor(UV.getX(i) * (c.width - 1))) * 4;
    const R = D[o], G = D[o + 1], B = D[o + 2];
    if (Math.max(R, G, B) - Math.min(R, G, B) > 25) continue; // fourrure grise seulement
    r += R; g += G; b += B; n++;
  }
  if (!n) return new THREE.Color(0x8c8c8c);
  // La texture est en sRGB : la couleur passée au shader doit être linéaire, comme diffuseColor après la texture.
  return new THREE.Color().setRGB(r / n / 255, g / n / 255, b / n / 255, THREE.SRGBColorSpace);
}

// Abaisse la mâchoire : morph target ajoutée au maillage (0 = fermée, 1 = grande ouverte).
function addJaw(mesh) {
  const geo = mesh.geometry, P = geo.attributes.position, SI = geo.attributes.skinIndex, SW = geo.attributes.skinWeight;
  const headBones = new Set(mesh.skeleton.bones.map((bn, i) => (/^(Head|headfront|head_end)$/.test(bn.name) ? i : -1)).filter((i) => i >= 0));
  const { pivot: [py, pz], maxAngle, halfWidth, bottom } = FACE.jaw;
  const line = FACE.teeth.c[1];
  const d = new Float32Array(P.count * 3);
  const cos = Math.cos(maxAngle), sin = Math.sin(maxAngle);
  const smooth = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
  let moved = 0;
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
    if (z < 0.0 || y < bottom || y > line + 0.01 || Math.abs(x) > halfWidth) continue;
    let hw = 0; for (let k = 0; k < 4; k++) if (headBones.has(SI.getComponent(i, k))) hw += SW.getComponent(i, k);
    if (hw < 0.4) continue; // pas le maillot ni le cou
    // Poids : plein sous la ligne des dents, nul juste au-dessus ; s'efface vers les joues et en arrière du museau.
    const w = (1 - smooth(line - 0.012, line + 0.004, y)) * (1 - smooth(halfWidth * 0.55, halfWidth, Math.abs(x))) * smooth(0.0, 0.08, z) * Math.min(1, hw);
    if (w <= 0) continue;
    // Rotation autour de l'axe x passant par le pivot : le menton descend et recule un peu.
    const dy = y - py, dz = z - pz;
    const ny = py + dy * cos - dz * sin, nz = pz + dy * sin + dz * cos;
    d[i * 3 + 1] = (ny - y) * w; d[i * 3 + 2] = (nz - z) * w;
    moved++;
  }
  return moved ? d : null;
}

// Oreilles : une morph target par oreille (1 = l'oreille part vers l'arrière et se dresse un peu ; −1 = vers l'avant).
function addEars(mesh) {
  const geo = mesh.geometry, P = geo.attributes.position, SI = geo.attributes.skinIndex, SW = geo.attributes.skinWeight;
  const headBones = new Set(mesh.skeleton.bones.map((bn, i) => (/^(Head|headfront|head_end)$/.test(bn.name) ? i : -1)).filter((i) => i >= 0));
  const E = FACE.ears;
  const smooth = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
  return [1, -1].map((side) => {
    const d = new Float32Array(P.count * 3);
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0.5 * side, 0.22 * side)); // vers l'arrière, pointe qui monte
    const pivot = new THREE.Vector3(E.x * side, E.y, E.z), v = new THREE.Vector3();
    let moved = 0;
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i) * side, y = P.getY(i);
      if (x < E.x - 0.01 || y < E.minY) continue;
      let hw = 0; for (let k = 0; k < 4; k++) if (headBones.has(SI.getComponent(i, k))) hw += SW.getComponent(i, k);
      if (hw < 0.4) continue;
      const w = smooth(E.x - 0.005, E.x + 0.05, x) * Math.min(1, hw);
      v.set(P.getX(i), y, P.getZ(i)).sub(pivot).applyQuaternion(q).add(pivot);
      d[i * 3] = (v.x - P.getX(i)) * w; d[i * 3 + 1] = (v.y - y) * w; d[i * 3 + 2] = (v.z - P.getZ(i)) * w;
      moved++;
    }
    return moved ? d : null;
  });
}

// Paupières et intérieur de la bouche, peints dans le shader du matériau.
function patchMaterial(mesh, fur) {
  const u = {
    uBlink: { value: 0 }, uMouth: { value: 0 }, uFur: { value: fur },
    uEyeA: { value: new THREE.Vector4(...FACE.eyes[0].c.slice(0, 2), ...FACE.eyes[0].r) },
    uEyeB: { value: new THREE.Vector4(...FACE.eyes[1].c.slice(0, 2), ...FACE.eyes[1].r) },
    uTeeth: { value: new THREE.Vector4(...FACE.teeth.c.slice(0, 2), ...FACE.teeth.r) },
    uGaze: { value: new THREE.Vector2() },
    uInA: { value: new THREE.Vector4(...FACE.inner[0].c, ...FACE.inner[0].r) },
    uInB: { value: new THREE.Vector4(...FACE.inner[1].c, ...FACE.inner[1].r) },
    uIrisA: { value: new THREE.Vector3(...FACE.iris[0].c, FACE.iris[0].r) },
    uIrisB: { value: new THREE.Vector3(...FACE.iris[1].c, FACE.iris[1].r) },
    uIrisCol: { value: new THREE.Color().setRGB(...FACE.irisColor.map((v) => v / 255), THREE.SRGBColorSpace) },
    uWhite: { value: new THREE.Color().setRGB(0.95, 0.95, 0.95, THREE.SRGBColorSpace) }
  };
  const mat = mesh.material;
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vBind;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBind = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vBind;
uniform float uBlink; uniform float uMouth; uniform vec3 uFur; uniform vec4 uEyeA; uniform vec4 uEyeB; uniform vec4 uTeeth;
uniform vec2 uGaze; uniform vec4 uInA; uniform vec4 uInB; uniform vec3 uIrisA; uniform vec3 uIrisB; uniform vec3 uIrisCol; uniform vec3 uWhite;
float ggHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float ggShape(vec2 p, vec4 e) { vec2 q = (p - e.xy) / e.zw; return pow(abs(q.x), 3.0) + pow(abs(q.y), 3.0); }
// Œil redessiné : blanc, iris décalé vers le regard (caché sous le bord de l'œil), pupille et reflet.
// Renvoie (couleur, opacité du dessin) ; l'opacité s'efface au bord pour rejoindre le contour peint.
vec4 ggEye(vec4 e, vec3 iris) {
  float r = ggShape(vBind.xy, e);
  if (r > 1.0 || vBind.z < 0.05) return vec4(0.0);
  vec2 q = (vBind.xy - e.xy) / e.zw;
  vec3 col = uWhite * (1.0 - 0.22 * smoothstep(0.2, 1.0, q.y)) * (1.0 - 0.1 * smoothstep(0.5, 1.0, abs(q.x))); // ombre sous la paupière, coins
  vec2 ic = iris.xy + uGaze;
  vec2 dv = (vBind.xy - ic) / iris.z;
  float d = length(dv);
  float aa = 0.08;
  if (d < 1.0 + aa) {
    float ang = atan(dv.y, dv.x);
    vec3 ir = uIrisCol * (0.75 + 0.45 * (1.0 - smoothstep(0.3, 0.95, d))) * (0.94 + 0.06 * sin(ang * 23.0));
    ir *= 1.0 - 0.45 * smoothstep(0.78, 1.0, d);                 // anneau foncé au bord de l'iris
    ir = mix(ir, vec3(0.015), 1.0 - smoothstep(0.38, 0.44, d));   // pupille
    col = mix(ir, col, smoothstep(1.0 - aa, 1.0 + aa, d));
    vec2 hl = (vBind.xy - (ic + vec2(-0.3, 0.38) * iris.z)) / iris.z; // reflet de la lumière
    col = mix(col, vec3(1.0), 1.0 - smoothstep(0.12, 0.2, length(hl)));
  }
  return vec4(col, 1.0 - smoothstep(0.82, 1.0, r));
}
// Paupière d'un œil : 0 = rien, 1 = paupière ; la ligne des cils (bord de la paupière) est rendue plus foncée.
vec2 ggLid(vec4 e) {
  vec2 q = (vBind.xy - e.xy) / e.zw;
  float inside = pow(abs(q.x), 3.0) + pow(abs(q.y), 3.0);
  if (inside > 1.0 || vBind.z < 0.05 || uBlink <= 0.001) return vec2(0.0);
  // Bord de la paupière : descend de haut en bas, un peu plus bas au milieu (paupière bombée).
  float edge = 1.05 - 1.97 * uBlink + 0.18 * q.x * q.x * uBlink; // fermé : la ligne des cils reste visible en bas
  if (q.y < edge) return vec2(0.0);
  return vec2(1.0, 1.0 - smoothstep(0.0, 0.16, q.y - edge));
}`)
      .replace('#include <map_fragment>', `#include <map_fragment>
float ggLidMask = 0.0;
{
  vec4 ea = ggEye(uInA, uIrisA), eb = ggEye(uInB, uIrisB);
  vec4 ey = ea.w > 0.0 ? ea : eb;
  if (ey.w > 0.0) diffuseColor.rgb = mix(diffuseColor.rgb, ey.rgb, ey.w);
}
{
  vec2 la = ggLid(uEyeA), lb = ggLid(uEyeB);
  vec2 lid = la.x > 0.0 ? la : lb;
  ggLidMask = lid.x;
  if (lid.x > 0.0) {
    float grain = 0.9 + 0.2 * ggHash(floor(vBind.xy * 900.0));
    vec3 c = uFur * grain;
    c *= 1.0 - 0.75 * lid.y; // cils
    diffuseColor.rgb = c;
  }
  // Bouche : l'espace entre les dents du haut et du bas s'assombrit quand la mâchoire descend.
  vec2 t = (vBind.xy - uTeeth.xy) / uTeeth.zw;
  if (uMouth > 0.001 && vBind.z > 0.08 && abs(t.x) < 1.0) {
    float gap = uMouth * (1.0 - t.x * t.x) * 0.55; // bouche plus ouverte au centre
    float m = 1.0 - smoothstep(gap * 0.7, gap + 0.02, abs(t.y + 0.05));
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.07, 0.012, 0.018), m * step(0.02, gap));
  }
}`)
      // La paupière est mate comme la fourrure (l'œil peint, lui, est brillant dans la texture de rugosité).
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.85, ggLidMask);')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = mix(metalnessFactor, 0.0, ggLidMask);');
  };
  mat.needsUpdate = true;
  return u;
}

// Branche le visage sur le modèle : renvoie { set(blink, mouth) } ou null si le modèle ne correspond pas.
export function attachFace(root) {
  let mesh = null;
  root.traverse((o) => { if (o.isSkinnedMesh && !mesh) mesh = o; });
  if (!mesh?.geometry.attributes.uv || !mesh.material) return null;
  const head = mesh.skeleton.bones.find((b) => b.name === 'Head');
  if (!head) return null;
  // Morph targets : mâchoire, oreille gauche, oreille droite (celles qui manquent sont simplement ignorées).
  const targets = { jaw: addJaw(mesh) };
  [targets.earL, targets.earR] = addEars(mesh);
  const names = Object.keys(targets).filter((k) => targets[k]);
  const index = {};
  if (names.length) {
    const geo = mesh.geometry;
    geo.morphAttributes.position = names.map((k, i) => { index[k] = i; return new THREE.Float32BufferAttribute(targets[k], 3); });
    geo.morphTargetsRelative = true;
    mesh.updateMorphTargets();
  }
  const morph = (k, v) => { if (k in index) mesh.morphTargetInfluences[index[k]] = v; };
  const u = patchMaterial(mesh, furColor(mesh));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  return {
    // blink 0..1, mouth 0..1 ; gaze : regard (x à droite de l'écran, y vers le haut, environ −1..1) ;
    // earL/earR : oreilles (1 = vers l'arrière, −1 = vers l'avant).
    set(blink, mouth, { gaze = null, earL = 0, earR = 0 } = {}) {
      u.uBlink.value = clamp(blink, 0, 1);
      const m = clamp(mouth * 1.25, 0, 1); // la parole ouvre rarement à fond : on amplifie un peu
      u.uMouth.value = 'jaw' in index ? m : 0;
      morph('jaw', m);
      if (gaze) u.uGaze.value.set(clamp(gaze.x, -1, 1) * 0.017, clamp(gaze.y, -1, 1) * 0.009);
      morph('earL', clamp(earL, -1, 1)); morph('earR', clamp(earR, -1, 1));
    }
  };
}
