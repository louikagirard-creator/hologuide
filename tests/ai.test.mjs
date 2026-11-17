// Tests de l'IA sans vraie clé : garde-fous (js/ai.js) et relais Cloudflare (worker/index.js) avec un faux fournisseur.
// Usage : node tests/ai.test.mjs
import { checkAnswer } from '../js/ai.js';
import worker from '../worker/index.js';

let ok = 0, fail = 0;
const t = (name, cond) => { if (cond) ok++; else { fail++; console.log(`ÉCHEC ${name}`); } };
const facts = [
  { q: 'Où sont les toilettes au CRX ?', a: 'Au 6e étage du CRX, il y a des toilettes accessibles aux locaux C604 et C605. Une toilette non genrée est au local C547.' },
  { q: 'Où manger ?', a: 'Il y a des cafétérias et des cafés au Centre universitaire et au CRX.' }
];

// --- Garde-fous ---
t('bonne réponse acceptée', checkAnswer('Au 6e étage du CRX, tu trouveras des toilettes accessibles aux locaux C604 et C605. [1]', 'où sont les wc', facts)?.used[0] === 0);
t('nombre inventé rejeté', checkAnswer('Les toilettes sont au local C244 du CRX, au 6e étage. [1]', 'où sont les wc', facts) === null);
t('sans citation rejeté', checkAnswer('Au 6e étage du CRX, il y a des toilettes accessibles.', 'où sont les wc', facts) === null);
t('refus rejeté', checkAnswer('JE_NE_SAIS_PAS', 'chien en classe', facts) === null);
t('hésitation rejetée', checkAnswer('Je ne sais pas, mais les cafés sont au CRX. [2]', 'manger', facts) === null);
t('hors sujet rejeté', checkAnswer('Tu peux contacter ton superviseur pour une solution adaptée rapidement. [1]', 'aide travaux écrits', facts) === null);

// --- Relais avec un faux fournisseur ---
const realFetch = globalThis.fetch;
const call = async (env, body, origin = 'https://louikagirard-creator.github.io') => worker.fetch(new Request('https://relais.test/', {
  method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin, 'CF-Connecting-IP': String(Math.random()) }, body: JSON.stringify(body)
}), env);
let sent = null;
globalThis.fetch = async (url, init) => {
  sent = { url: String(url), init, body: JSON.parse(init.body) };
  if (String(url).includes('groq')) return new Response(JSON.stringify({ choices: [{ message: { content: 'Réponse de test. [1]' } }] }));
  return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'Gemini test. [2]' } ] } }] }));
};
const body = { question: 'où sont les wc', lang: 'fr', facts };
let r = await call({ GROQ_API_KEY: 'cle-test' }, body);
let d = await r.json();
t('groq : 200 et texte', r.status === 200 && d.text === 'Réponse de test. [1]');
t('groq : clé envoyée au fournisseur seulement', sent.init.headers.Authorization === 'Bearer cle-test' && !JSON.stringify(d).includes('cle-test'));
t('groq : fiches transmises', sent.body.messages[1].content.includes('C604'));
r = await call({ PROVIDER: 'gemini', GEMINI_API_KEY: 'g-test' }, { ...body, lang: 'en' });
d = await r.json();
t('gemini : 200 et texte', r.status === 200 && d.text === 'Gemini test. [2]' && sent.init.headers['x-goog-api-key'] === 'g-test');
r = await call({ GROQ_API_KEY: 'x' }, body, 'https://site-pirate.example');
t('origine inconnue refusée', r.status === 403);
r = await call({ GROQ_API_KEY: 'x' }, body, 'http://localhost:5179');
t('localhost accepté (tests de l\'équipe)', r.status === 200);
r = await call({ GROQ_API_KEY: 'x' }, { question: '', facts: [] });
t('requête vide refusée', r.status === 400);
r = await call({}, body);
t('sans clé : erreur propre (502)', r.status === 502);
globalThis.fetch = realFetch;

console.log(`${ok}/${ok + fail} réussis`);
if (fail) process.exit(1);
