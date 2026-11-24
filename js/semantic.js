// Recherche par le sens : la question et chaque fiche deviennent un vecteur de 384 nombres qui résume leur sens
// (modèle multilingual-e5-small, français et anglais). Deux questions qui veulent dire la même chose ont des vecteurs
// proches, même sans mot en commun (« ma chaîne de vélo a cassé » ≈ « stations de réparation de vélos »).
//  - Les vecteurs des fiches sont calculés d'avance (data/sens.bin, voir tools/build-sens.mjs).
//  - Le modèle (≈ 120 Mo) est téléchargé une seule fois puis gardé en cache par le navigateur ; il tourne sur place,
//    aucune question n'est envoyée à un serveur.
//  - Tant qu'il n'est pas prêt (ou s'il échoue), la recherche par mots-clés fonctionne seule, comme avant.
import { KB } from '../data/kb.js';

const LIB = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.5';
export const SENS_MODEL = 'Xenova/multilingual-e5-small';
const D = 384;

export const semantic = { state: 'off', progress: 0 }; // off · loading · ready · error
let extract = null, rows = null, loading = null;

// data/sens.bin : n facteurs d'échelle (float32), puis n × 384 valeurs int8. data/sens.json : modèle et ids des fiches.
// Les vecteurs sont rangés selon l'ordre de KB grâce aux ids : une fiche ajoutée depuis n'a simplement pas de vecteur.
async function loadVectors() {
  const [meta, buf] = await Promise.all([
    fetch('data/sens.json').then((r) => { if (!r.ok) throw new Error('data/sens.json absent'); return r.json(); }),
    fetch('data/sens.bin').then((r) => { if (!r.ok) throw new Error('data/sens.bin absent'); return r.arrayBuffer(); })
  ]);
  if (meta.model !== SENS_MODEL || meta.dims !== D) throw new Error('vecteurs faits avec un autre modèle');
  const n = meta.ids.length;
  const scale = new Float32Array(buf, 0, n), q = new Int8Array(buf, n * 4, n * D);
  const pos = new Map(meta.ids.map((id, i) => [id, i]));
  return KB.map((e) => {
    const i = pos.get(e.id);
    if (i === undefined) return null;
    const v = new Float32Array(D);
    for (let j = 0; j < D; j++) v[j] = q[i * D + j] * scale[i];
    return v;
  });
}

export function loadSemantic(onChange = () => {}) {
  if (loading) return loading;
  semantic.state = 'loading'; onChange(semantic);
  loading = (async () => {
    try {
      const [{ pipeline, env }, vecs] = await Promise.all([import(LIB), loadVectors()]);
      env.allowLocalModels = false; // le modèle vient du dépôt public Hugging Face, puis du cache du navigateur
      const files = {};
      extract = await pipeline('feature-extraction', SENS_MODEL, {
        dtype: 'q8',
        progress_callback: (p) => {
          if (p.status !== 'progress' || !p.total) return;
          files[p.file] = [p.loaded, p.total];
          const [a, b] = Object.values(files).reduce(([x, y], [l, t]) => [x + l, y + t], [0, 0]);
          semantic.progress = Math.round((100 * a) / b); onChange(semantic);
        }
      });
      rows = vecs;
      semantic.state = 'ready'; semantic.progress = 100; onChange(semantic);
      return true;
    } catch (err) {
      console.warn('Recherche par le sens indisponible, mots-clés seulement :', err);
      semantic.state = 'error'; onChange(semantic);
      return false;
    }
  })();
  return loading;
}

// Ressemblance de sens entre la question et chaque fiche (ordre de KB, entre −1 et 1), ou null si pas prêt.
export async function senseScores(text) {
  if (semantic.state !== 'ready' || !text?.trim()) return null;
  const out = await extract(`query: ${text}`, { pooling: 'mean', normalize: true });
  const qv = out.data, sims = new Float32Array(rows.length);
  for (let k = 0; k < rows.length; k++) {
    const v = rows[k];
    if (!v) continue;
    let d = 0;
    for (let j = 0; j < D; j++) d += v[j] * qv[j];
    sims[k] = d;
  }
  return sims;
}
