// Calcule les vecteurs de sens des fiches (data/sens.bin + data/sens.json) pour la recherche par le sens (js/semantic.js).
// À relancer après chaque ajout de fiches (node tools/merge-kb.mjs --write) ; sans ça, les nouvelles fiches restent
// trouvables par mots-clés, mais pas par le sens.
//
// Une seule fois :  npm install --no-save @huggingface/transformers@3.7.5   (≈ 120 Mo de modèle téléchargés au 1er lancement)
// Puis :            node tools/build-sens.mjs                                 (≈ 4 minutes)
import { writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { pipeline } from '@huggingface/transformers';
import { KB } from '../data/kb.js';
import { SENS_MODEL } from '../js/semantic.js';

const D = 384;
// Texte d'une fiche : ses deux questions et ses mots-clés (le préfixe « passage: » est celui qu'attend le modèle e5)
const text = (e) => `passage: ${e.question.fr} ${e.question.en} ${e.keywords.join(', ')}`;

const extract = await pipeline('feature-extraction', SENS_MODEL, { dtype: 'q8' });
// Vecteurs en int8 (une échelle par ligne) : 4 fois plus légers, même résultat au banc d'essai
async function pack(texts, label) {
  const n = texts.length, scale = new Float32Array(n), q = new Int8Array(n * D);
  for (let i = 0; i < n; i += 64) {
    const out = await extract(texts.slice(i, i + 64), { pooling: 'mean', normalize: true });
    for (let k = 0; k < out.dims[0]; k++) {
      const v = out.data.subarray(k * D, (k + 1) * D);
      let m = 0; for (const x of v) m = Math.max(m, Math.abs(x)); m = m || 1;
      scale[i + k] = m / 127;
      for (let j = 0; j < D; j++) q[(i + k) * D + j] = Math.round((v[j] / m) * 127);
    }
    process.stdout.write(`\r${Math.min(n, i + 64)}/${n} ${label}`);
  }
  process.stdout.write('\n');
  return Buffer.concat([Buffer.from(scale.buffer), Buffer.from(q.buffer)]);
}
const n = KB.length;
writeFileSync('data/sens.bin', await pack(KB.map(text), 'fiches'));
writeFileSync('data/sens.json', JSON.stringify({ model: SENS_MODEL, dims: D, builtOn: new Date().toISOString().slice(0, 10), ids: KB.map((e) => e.id) }));
// Vecteurs des questions du banc d'essai (tests/essais.mjs s'en sert sans avoir besoin du modèle)
const qs = [];
for (const f of readdirSync('tests/essais').filter((x) => x.endsWith('.json') && !x.startsWith('sens-')).sort()) for (const e of JSON.parse(readFileSync(`tests/essais/${f}`, 'utf8'))) qs.push(e.q);
writeFileSync('tests/essais/sens-questions.bin', await pack(qs.map((x) => `query: ${x}`), 'questions d\'essai'));
writeFileSync('tests/essais/sens-questions.json', JSON.stringify(qs));
console.log(`data/sens.bin, data/sens.json et les vecteurs du banc d'essai écrits (${n} fiches, ${qs.length} questions).`);
