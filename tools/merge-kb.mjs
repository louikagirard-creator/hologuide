// Fusionne les nouvelles réponses (data/new/*.json) dans data/kb.js après vérification.
// Usage : node tools/merge-kb.mjs        (vérifie seulement)
//         node tools/merge-kb.mjs --write (vérifie puis écrit data/kb.js)
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { KB, CATEGORIES } from '../data/kb.js';

const write = process.argv.includes('--write');
const cats = new Set(CATEGORIES.map((c) => c.id));
const ids = new Set(KB.map((e) => e.id));
const merged = new Set(ids); // réponses déjà dans la base (lots fusionnés avant)
let skipped = 0;
const OFFICIAL = /(^|\.)(uottawa\.ca|geegees\.ca|seuo-uosu\.com|uosu\.ca|gsaed\.ca)$/;
const problems = [];
const added = [];

for (const f of readdirSync('data/new').filter((n) => n.endsWith('.json')).sort()) {
  let list;
  try { list = JSON.parse(readFileSync(`data/new/${f}`, 'utf8')); } catch (err) { problems.push(`${f} : JSON invalide (${err.message})`); continue; }
  for (const e of list) {
    if (merged.has(e.id)) { skipped++; continue; }
    const where = `${f} › ${e.id}`;
    const bad = [];
    if (!e.id || ids.has(e.id)) bad.push('id manquant ou en double');
    if (!cats.has(e.category)) bad.push(`catégorie inconnue « ${e.category} »`);
    for (const k of ['question', 'answer']) if (!e[k]?.fr?.trim() || !e[k]?.en?.trim()) bad.push(`${k} FR/EN manquant`);
    if (!Array.isArray(e.keywords) || e.keywords.length < 3) bad.push('moins de 3 mots-clés');
    if (!Array.isArray(e.sources) || !e.sources.length) bad.push('aucune source');
    for (const s of e.sources || []) {
      try { if (!OFFICIAL.test(new URL(s.url).hostname)) bad.push(`source non officielle ${s.url}`); } catch { bad.push(`lien invalide ${s.url}`); }
    }
    if (/https?:\/\//.test(`${e.answer?.fr} ${e.answer?.en}`)) bad.push('lien dans le texte parlé');
    if (bad.length) { problems.push(`${where} : ${bad.join(', ')}`); continue; }
    ids.add(e.id);
    added.push({
      id: e.id, category: e.category, keywords: e.keywords.map((k) => String(k).toLowerCase()),
      question: e.question, answer: e.answer, sources: e.sources.map(({ label, url }) => ({ label, url })),
      related: [], verifiedOn: e.verifiedOn || '2026-11-16', status: e.status === 'pointer' ? 'pointer' : 'official'
    });
  }
}

// Questions liées : trois autres réponses de la même catégorie
for (const e of added) e.related = added.filter((x) => x.category === e.category && x.id !== e.id).slice(0, 3).map((x) => x.id);

console.log(`${added.length} nouvelles réponses valides, ${problems.length} rejetées, ${skipped} déjà dans la base.`);
problems.forEach((p) => console.log(`  - ${p}`));
const count = {}; [...KB, ...added].forEach((e) => { count[e.category] = (count[e.category] || 0) + 1; });
console.log(`Total après fusion : ${KB.length + added.length}`, count);

if (write) {
  const src = readFileSync('data/kb.js', 'utf8');
  const head = src.slice(0, src.indexOf('export const KB'));
  writeFileSync('data/kb.js', `${head}export const KB = ${JSON.stringify([...KB, ...added], null, 1)};\n`);
  console.log('data/kb.js mis à jour.');
}
