// Visage du modèle importé (assets/geegee.glb) : paupières qui clignent et bouche qui s'ouvre quand Gee-Gee parle.
//
// Le modèle de Meshy n'a ni os ni « blend shapes » pour le visage : ses yeux et ses dents sont seulement peints
// dans la texture. On ajoute donc deux choses, sans toucher au fichier :
//  1. Paupières : dans le shader du matériau, la zone de chaque œil est repeinte en couleur de fourrure, de haut en bas,
//     selon le clignement (0 = ouvert, 1 = fermé), avec une ligne de cils foncée au bord de la paupière.
//  2. Bouche : une « morph target » abaisse la mâchoire (les sommets sous la ligne des dents tournent autour d'un pivot
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
  jaw: { pivot: [1.183, -0.06], maxAngle: 0.15, halfWidth: 0.16, bottom: 1.0 } // pivot (y, z) de la mâchoire
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
  if (!moved) return false;
  geo.morphAttributes.position = [new THREE.Float32BufferAttribute(d, 3)];
  geo.morphTargetsRelative = true;
  mesh.updateMorphTargets();
  mesh.morphTargetInfluences[0] = 0;
  return true;
}

// Paupières et intérieur de la bouche, peints dans le shader du matériau.
function patchMaterial(mesh, fur) {
  const u = {
    uBlink: { value: 0 }, uMouth: { value: 0 }, uFur: { value: fur },
    uEyeA: { value: new THREE.Vector4(...FACE.eyes[0].c.slice(0, 2), ...FACE.eyes[0].r) },
    uEyeB: { value: new THREE.Vector4(...FACE.eyes[1].c.slice(0, 2), ...FACE.eyes[1].r) },
    uTeeth: { value: new THREE.Vector4(...FACE.teeth.c.slice(0, 2), ...FACE.teeth.r) }
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
float ggHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
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
  const jaw = addJaw(mesh);
  const u = patchMaterial(mesh, furColor(mesh));
  return {
    set(blink, mouth) {
      u.uBlink.value = Math.min(1, Math.max(0, blink));
      const m = Math.min(1, Math.max(0, mouth * 1.25)); // la parole ouvre rarement à fond : on amplifie un peu
      u.uMouth.value = jaw ? m : 0;
      if (jaw) mesh.morphTargetInfluences[0] = m;
    }
  };
}
