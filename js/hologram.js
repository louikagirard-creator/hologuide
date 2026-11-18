// Effet « hologramme » de Gee-Gee, sans aucune dépendance nouvelle : tout passe par le three.js de vendor/.
// 1. Liseré de Fresnel + lignes de balayage : injectés dans les matériaux de la mascotte (onBeforeCompile).
// 2. Bloom + grain : une passe plein écran maison (rendu hors écran, seuil puis deux flous séparables),
//    parce que le dépôt ne contient pas les modules postprocessing de three — rien à télécharger, la borne reste hors-ligne.
// Le tone mapping (ACES) et l'encodage sRGB sont refaits à la fin de la passe, exactement comme le fait three
// quand il dessine directement : le rendu hors écran n'applique ni l'un ni l'autre.
import * as THREE from 'three';

// Uniformes partagés par tous les matériaux de la mascotte : un seul temps, une seule palette.
export const HOLO = {
  uTime: { value: 0 },
  uRimColor: { value: new THREE.Color(0x8f001a) },  // le grenat du site, pour le liseré
  uRimStrength: { value: 0.55 },
  uRimPower: { value: 2.2 },
  uScanStrength: { value: 0.09 },                    // lignes de balayage sur le corps
  uScanSpeed: { value: 2.2 }
};

const FULLSCREEN_VERT = /* glsl */`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4( position.xy, 0.0, 1.0 ); }
`;

// Seuil de brillance : ne garde que ce qui dépasse, pour que le flou ne lave pas tout le personnage.
const BRIGHT_FRAG = /* glsl */`
uniform sampler2D tDiffuse;
uniform float uThreshold;
varying vec2 vUv;
void main() {
  vec4 c = texture2D( tDiffuse, vUv );
  float l = max( c.r, max( c.g, c.b ) );
  float w = smoothstep( uThreshold, uThreshold + 0.25, l ) * c.a;
  gl_FragColor = vec4( c.rgb * w, w );
}
`;

// Flou gaussien séparable (5 prises), appliqué horizontalement puis verticalement.
const BLUR_FRAG = /* glsl */`
uniform sampler2D tDiffuse;
uniform vec2 uDir;
varying vec2 vUv;
void main() {
  vec4 s = texture2D( tDiffuse, vUv ) * 0.2270270270;
  s += ( texture2D( tDiffuse, vUv + uDir * 1.3846153846 ) + texture2D( tDiffuse, vUv - uDir * 1.3846153846 ) ) * 0.3162162162;
  s += ( texture2D( tDiffuse, vUv + uDir * 3.2307692308 ) + texture2D( tDiffuse, vUv - uDir * 3.2307692308 ) ) * 0.0702702703;
  gl_FragColor = s;
}
`;

// Composition : bloom + grain, puis ACES et sRGB. Copie exacte des fonctions de three.js
// (RRTAndODTFit, ACESFilmicToneMapping, sRGBTransferOETF) pour retrouver le rendu d'avant l'effet.
const COMPOSITE_FRAG = /* glsl */`
uniform sampler2D tDiffuse;
uniform sampler2D tBloom;
uniform vec2 uResolution;
uniform vec3 uBloomTint;
uniform float uTime, uExposure, uBloom, uGrain, uHalo, uNeutral;
varying vec2 vUv;

vec3 RRTAndODTFit( vec3 v ) {
  vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
  vec3 b = v * ( v * 0.983729 + 0.4329510 ) + 0.238081;
  return a / b;
}
vec3 acesFilmic( vec3 color ) {
  const mat3 inputMat = mat3(
    vec3( 0.59719, 0.07600, 0.02840 ), vec3( 0.35458, 0.90834, 0.13383 ), vec3( 0.04823, 0.01566, 0.83777 )
  );
  const mat3 outputMat = mat3(
    vec3( 1.60475, -0.10208, -0.00327 ), vec3( -0.53108, 1.10813, -0.07276 ), vec3( -0.07367, -0.00605, 1.07602 )
  );
  color *= uExposure / 0.6;
  color = inputMat * color;
  color = RRTAndODTFit( color );
  color = outputMat * color;
  return clamp( color, 0.0, 1.0 );
}
// Tone mapping neutre de three (Khronos PBR Neutral), utilisé par le modèle réaliste.
vec3 neutralToneMapping( vec3 color ) {
  const float StartCompression = 0.8 - 0.04;
  const float Desaturation = 0.15;
  color *= uExposure;
  float x = min( color.r, min( color.g, color.b ) );
  float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
  color -= offset;
  float peak = max( color.r, max( color.g, color.b ) );
  if ( peak < StartCompression ) return color;
  float d = 1. - StartCompression;
  float newPeak = 1. - d * d / ( peak + d - StartCompression );
  color *= newPeak / peak;
  float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
  return mix( color, vec3( newPeak ), g );
}
vec4 sRGBTransferOETF( vec4 value ) {
  return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92,
    vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}
float hash( vec2 p ) { return fract( sin( dot( p, vec2( 12.9898, 78.233 ) ) ) * 43758.5453123 ); }

void main() {
  vec4 base = texture2D( tDiffuse, vUv );
  vec3 bloom = texture2D( tBloom, vUv ).rgb;
  vec3 col = base.rgb + bloom * uBloom * uBloomTint;

  // Grain de film, seulement sur l'hologramme (le fond blanc de la boîte reste propre).
  float n = hash( floor( vUv * uResolution ) + floor( uTime * 24.0 ) );
  col += ( n - 0.5 ) * uGrain * base.a;

  col = uNeutral > 0.5 ? neutralToneMapping( col ) : acesFilmic( col );
  float halo = clamp( max( bloom.r, max( bloom.g, bloom.b ) ) * uHalo, 0.0, 0.4 );
  gl_FragColor = sRGBTransferOETF( vec4( col, clamp( base.a + halo, 0.0, 1.0 ) ) );
}
`;

// Ajoute le liseré de Fresnel et les lignes de balayage à un matériau de la mascotte.
// Sans effet sur l'ombre du plancher, qui doit rester neutre.
const patched = new WeakSet();
export function holoMaterial(material) {
  if (!material) return material;
  if (Array.isArray(material)) { material.forEach(holoMaterial); return material; }
  if (patched.has(material) || typeof material.onBeforeCompile !== 'function') return material;
  if (material.isShadowMaterial || material.isSpriteMaterial) return material;
  patched.add(material);

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, {
      uTime: HOLO.uTime, uRimColor: HOLO.uRimColor, uRimStrength: HOLO.uRimStrength,
      uRimPower: HOLO.uRimPower, uScanStrength: HOLO.uScanStrength, uScanSpeed: HOLO.uScanSpeed
    });

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vHoloW;')
      .replace('#include <project_vertex>', '#include <project_vertex>\n\tvHoloW = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;');

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vHoloW;
uniform float uTime;
uniform vec3 uRimColor;
uniform float uRimStrength;
uniform float uRimPower;
uniform float uScanStrength;
uniform float uScanSpeed;`)
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
{
  // Normale déduite de la position écran : fonctionne sur tous les matériaux, sans toucher au squelette.
  vec3 holoN = normalize( cross( dFdx( vHoloW ), dFdy( vHoloW ) ) );
  vec3 holoV = normalize( cameraPosition - vHoloW );
  float rim = pow( clamp( 1.0 - abs( dot( holoN, holoV ) ), 0.0, 1.0 ), uRimPower );
  float band = 0.5 + 0.5 * sin( vHoloW.y * 46.0 - uTime * uScanSpeed );
  gl_FragColor.rgb = mix( gl_FragColor.rgb, uRimColor, rim * uRimStrength );
  gl_FragColor.rgb *= 1.0 - uScanStrength * band;
}`);
  };
  material.needsUpdate = true;
  return material;
}

export class Hologram {
  constructor(renderer) {
    this.enabled = true;
    this.quadCamera = new THREE.Camera();
    this.fxScene = new THREE.Scene();
    this.size = new THREE.Vector2(1, 1);

    // Flottants 16 bits si la carte le permet : pas de bandes dans les dégradés, et les hautes lumières
    // au-delà de 1 peuvent déborder dans le bloom. Sinon on retombe sur du 8 bits classique.
    const hdr = renderer.extensions.has('EXT_color_buffer_float') || renderer.extensions.has('EXT_color_buffer_half_float');
    const type = hdr ? THREE.HalfFloatType : THREE.UnsignedByteType;
    const base = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, stencilBuffer: false, type };

    this.sceneRT = new THREE.WebGLRenderTarget(1, 1, { ...base, depthBuffer: true, samples: hdr ? 4 : 0 });
    this.bloomRT = new THREE.WebGLRenderTarget(1, 1, base);
    this.blurRT = new THREE.WebGLRenderTarget(1, 1, base);

    this.brightMat = new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: null }, uThreshold: { value: 0.72 } },
      vertexShader: FULLSCREEN_VERT, fragmentShader: BRIGHT_FRAG, depthTest: false, depthWrite: false
    });
    this.blurMat = new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: null }, uDir: { value: new THREE.Vector2() } },
      vertexShader: FULLSCREEN_VERT, fragmentShader: BLUR_FRAG, depthTest: false, depthWrite: false
    });
    this.compositeMat = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null }, tBloom: { value: null }, uResolution: { value: new THREE.Vector2(1, 1) },
        uBloomTint: { value: new THREE.Color(0xffd9df) }, uBloom: { value: 0.55 },
        uGrain: { value: 0.05 }, uHalo: { value: 0.18 }, uExposure: { value: 0.95 }, uNeutral: { value: 0 },
        uTime: HOLO.uTime
      },
      vertexShader: FULLSCREEN_VERT, fragmentShader: COMPOSITE_FRAG,
      depthTest: false, depthWrite: false, transparent: true, blending: THREE.NoBlending
    });
    this.tone = 'aces'; this.exposure = 0.95; // voir setTone()

    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.brightMat);
    this.quad.frustumCulled = false;
    this.fxScene.add(this.quad);
    this.probe = 6; // quelques images avant de vérifier que la composition écrit vraiment à l'écran
  }

  // Le renderer ne fait plus de tone mapping (c'est la composition qui s'en charge) :
  // 'aces' pour le Gee-Gee en code, 'neutral' pour le modèle réaliste, comme avant l'effet.
  setTone(kind = 'aces', exposure = 0.95) {
    this.tone = kind === 'neutral' ? 'neutral' : 'aces';
    this.exposure = exposure;
    this.compositeMat.uniforms.uNeutral.value = this.tone === 'neutral' ? 1 : 0;
    this.compositeMat.uniforms.uExposure.value = exposure;
  }

  // Rendu direct, quand la carte graphique refuse la passe plein écran.
  direct(renderer, scene, camera) {
    renderer.toneMapping = this.tone === 'neutral' ? THREE.NeutralToneMapping : THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = this.exposure;
    renderer.setRenderTarget(null);
    renderer.render(scene, camera);
  }

  setSize(renderer) {
    const s = renderer.getDrawingBufferSize(new THREE.Vector2());
    if (s.x === this.size.x && s.y === this.size.y) return;
    this.size.copy(s);
    this.sceneRT.setSize(s.x, s.y);
    // Le bloom se calcule à mi-résolution : invisible à l'œil, quatre fois moins cher.
    const w = Math.max(1, Math.round(s.x / 2)), h = Math.max(1, Math.round(s.y / 2));
    this.bloomRT.setSize(w, h); this.blurRT.setSize(w, h);
    this.compositeMat.uniforms.uResolution.value.set(s.x, s.y);
  }

  // Rendu : scène hors écran, seuil de brillance, flou horizontal, flou vertical, composition à l'écran.
  render(renderer, scene, camera) {
    if (!this.enabled) { renderer.render(scene, camera); return; }
    try {
      this.setSize(renderer);
      renderer.setRenderTarget(this.sceneRT);
      renderer.render(scene, camera);

      this.quad.material = this.brightMat;
      this.brightMat.uniforms.tDiffuse.value = this.sceneRT.texture;
      renderer.setRenderTarget(this.bloomRT);
      renderer.render(this.fxScene, this.quadCamera);

      this.quad.material = this.blurMat;
      this.blurMat.uniforms.tDiffuse.value = this.bloomRT.texture;
      this.blurMat.uniforms.uDir.value.set(1 / this.bloomRT.width, 0);
      renderer.setRenderTarget(this.blurRT);
      renderer.render(this.fxScene, this.quadCamera);

      this.blurMat.uniforms.tDiffuse.value = this.blurRT.texture;
      this.blurMat.uniforms.uDir.value.set(0, 1 / this.bloomRT.height);
      renderer.setRenderTarget(this.bloomRT);
      renderer.render(this.fxScene, this.quadCamera);

      this.quad.material = this.compositeMat;
      this.compositeMat.uniforms.tDiffuse.value = this.sceneRT.texture;
      this.compositeMat.uniforms.tBloom.value = this.bloomRT.texture;
      renderer.setRenderTarget(null);
      renderer.render(this.fxScene, this.quadCamera);
      if (this.probe > 0 && --this.probe === 0) this.verify(renderer, scene, camera);
    } catch (err) {
      // Carte graphique capricieuse : on revient au rendu direct, avec le tone mapping d'origine.
      this.enabled = false;
      console.warn('Effet hologramme désactivé :', err);
      this.direct(renderer, scene, camera);
    }
  }

  // Filet de sécurité : si la carte graphique ne veut rien savoir de la passe plein écran, on le voit
  // tout de suite (mascotte vide à l'écran alors que la scène, hors écran, est dessinée) et on revient
  // au rendu direct. Mieux vaut perdre l'effet que perdre Gee-Gee.
  verify(renderer, scene, camera) {
    try {
      const gl = renderer.getContext();
      const px = new Uint8Array(4), rt = new Uint16Array(4); // 16 bits : la cible est en flottants 16
      let drawn = 0, live = 0;
      for (let i = 1; i <= 4; i++) for (let j = 1; j <= 3; j++) {
        const x = Math.round(this.size.x * i / 5), y = Math.round(this.size.y * j / 4);
        gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
        if (px[3] > 10) drawn++;
        renderer.readRenderTargetPixels(this.sceneRT, x, y, 1, 1, rt);
        if (rt[3] > 0) live++;
      }
      if (live > 0 && drawn === 0) {
        console.warn('Effet hologramme invisible sur cette carte : rendu direct rétabli.');
        this.enabled = false;
        this.direct(renderer, scene, camera);
      }
    } catch { /* lecture impossible sur cette carte : on garde l'effet, il ne casse rien */ }
  }
}
