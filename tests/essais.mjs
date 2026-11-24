// Banc d'essai : ~1000 questions écrites comme de vrais étudiants (fautes, anglais, langage parlé, bavardage, charabia).
// Usage : node tests/essais.mjs            → score global et par fichier
//         node tests/essais.mjs --erreurs  → liste aussi chaque erreur (question → réponse obtenue / attendue)
//         node tests/essais.mjs --mots    → mots-clés seulement (sans la recherche par le sens)
// La recherche par le sens utilise data/sens.bin (fiches) et tests/essais/sens-questions.* (vecteurs des questions,
// recalculés par tools/build-sens.mjs) : pas besoin du modèle pour lancer le banc d'essai.
// Fichiers : tests/essais/*.json = [{ q, expect: [id de fiche… ou type : hello, thanks, sensitive, none, smalltalk:<intention>] }]
import { readFileSync, readdirSync } from 'node:fs';
import { findAnswer, KB } from '../js/search.js';

// Vecteurs de sens (même format que js/semantic.js : n échelles float32, puis n × 384 int8)
const D = 384;
const unpack = (file, n) => { const b = readFileSync(file); const buf = b.buffer.slice(b.byteOffset, b.byteOffset + b.length);
  const sc = new Float32Array(buf, 0, n), q = new Int8Array(buf, n * 4, n * D);
  return Array.from({ length: n }, (_, i) => Float32Array.from(q.subarray(i * D, (i + 1) * D), (x) => x * sc[i])); };
let senseOf = () => null;
if (!process.argv.includes('--mots')) {
  try {
    const meta = JSON.parse(readFileSync('data/sens.json', 'utf8')), kv = unpack('data/sens.bin', meta.ids.length);
    const pos = new Map(meta.ids.map((id, i) => [id, i])), rows = KB.map((e) => kv[pos.get(e.id)] || null);
    const qs = JSON.parse(readFileSync('tests/essais/sens-questions.json', 'utf8')), qv = unpack('tests/essais/sens-questions.bin', qs.length);
    const qi = new Map(qs.map((q, i) => [q, i]));
    senseOf = (q) => { const i = qi.get(q); if (i === undefined) return null; const v = qv[i];
      return Float32Array.from(rows, (r) => { if (!r) return 0; let d = 0; for (let j = 0; j < D; j++) d += r[j] * v[j]; return d; }); };
    console.log('Recherche par le sens : activée');
  } catch { console.log('Recherche par le sens : vecteurs absents, mots-clés seulement'); }
}

const SMALL = ['bye', 'howareyou', 'whoareyou', 'help', 'joke', 'compliment', 'insult', 'yesno'];
const show = process.argv.includes('--erreurs');
let total = 0, good = 0, near = 0;
const errors = [];
for (const f of readdirSync('tests/essais').filter((n) => n.endsWith('.json') && !n.startsWith('sens-')).sort()) {
  const list = JSON.parse(readFileSync(`tests/essais/${f}`, 'utf8'));
  let g = 0, n = 0;
  for (const { q, expect } of list) {
    const r = findAnswer(q, { sem: senseOf(q) });
    // Ce que la borne a fait : id de la fiche, ou type (le charabia « unclear » compte comme « none »)
    const got = r.type === 'answer' ? r.entry.id : r.type === 'smalltalk' ? r.intent : r.type === 'unclear' || r.type === 'offtopic' ? 'none' : r.type;
    const ok = expect.includes(got);
    const close = !ok && r.type === 'answer' && (r.alts || []).some((a) => expect.includes(a.id)); // bonne fiche proposée juste en dessous
    total++; if (ok) { good++; g++; } else { if (close) { near++; n++; } errors.push({ f, q, got, expect, close }); }
  }
  console.log(`${f.padEnd(22)} ${g}/${list.length} (${Math.round(100 * g / list.length)} %)${n ? `, ${n} autres proposées juste en dessous` : ''}`);
}
console.log(`\nTOTAL ${good}/${total} bonnes réponses (${(100 * good / total).toFixed(1)} %), ${near} autres où la bonne fiche est proposée en « Questions liées ».`);
if (show) for (const e of errors) console.log(`${e.close ? '~' : '✗'} [${e.f}] « ${e.q} » → ${e.got} (attendu ${e.expect.join(' | ')})`);
