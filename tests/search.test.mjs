import { findAnswer, focusAnswer, byId } from '../js/search.js';
import { CASES } from './cases.js';
let ok = 0;
for (const [q, want] of CASES) {
  const r = findAnswer(q); const got = r.type === 'answer' ? r.entry.id : r.type;
  // plusieurs fiches équivalentes acceptées : ['a', 'b']
  if ([want].flat().includes(got)) ok++; else console.log(`ÉCHEC « ${q} » → ${got} (attendu ${want})`);
}
// Réponse cadrée : la phrase qui traite de ce qui est demandé passe en premier, sans rien retirer du texte officiel.
const check = (name, cond) => { if (cond) ok++; else console.log(`ÉCHEC ${name}`); };
const total = () => CASES.length + 4;
const crx = byId('crx'), full = crx.answer.fr;
const hours = focusAnswer(crx, 'à quelle heure ferme le CRX ?', 'fr');
check('cadrage : la phrase des heures ouvre la réponse', hours.startsWith('Le bâtiment est ouvert'));
check('cadrage : texte officiel complet conservé', hours.length === full.length && hours.includes('100, rue Louis-Pasteur'));
check('cadrage : une question de lieu garde l\'ordre officiel', focusAnswer(crx, 'où est le CRX ?', 'fr') === full);
check('cadrage : même chose en anglais', focusAnswer(crx, 'What time does CRX close?', 'en').startsWith('The building is open'));

console.log(`${ok}/${total()} réussis`); process.exit(ok === total() ? 0 : 1);
