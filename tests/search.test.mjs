import { findAnswer } from '../js/search.js';
import { CASES } from './cases.js';
let ok = 0;
for (const [q, want] of CASES) {
  const r = findAnswer(q); const got = r.type === 'answer' ? r.entry.id : r.type;
  if (got === want) ok++; else console.log(`ÉCHEC « ${q} » → ${got} (attendu ${want})`);
}
console.log(`${ok}/${CASES.length} réussis`); process.exit(ok === CASES.length ? 0 : 1);
