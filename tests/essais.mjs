// Banc d'essai : ~1000 questions écrites comme de vrais étudiants (fautes, anglais, langage parlé, bavardage, charabia).
// Usage : node tests/essais.mjs            → score global et par fichier
//         node tests/essais.mjs --erreurs  → liste aussi chaque erreur (question → réponse obtenue / attendue)
// Fichiers : tests/essais/*.json = [{ q, expect: [id de fiche… ou type : hello, thanks, sensitive, none, smalltalk:<intention>] }]
import { readFileSync, readdirSync } from 'node:fs';
import { findAnswer } from '../js/search.js';

const SMALL = ['bye', 'howareyou', 'whoareyou', 'help', 'joke', 'compliment', 'insult', 'yesno'];
const show = process.argv.includes('--erreurs');
let total = 0, good = 0, near = 0;
const errors = [];
for (const f of readdirSync('tests/essais').filter((n) => n.endsWith('.json')).sort()) {
  const list = JSON.parse(readFileSync(`tests/essais/${f}`, 'utf8'));
  let g = 0, n = 0;
  for (const { q, expect } of list) {
    const r = findAnswer(q);
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
