// Recherche de réponses, 100 % locale et instantanée (aucun serveur, aucune IA).
// Ordre : santé mentale (redirection) > salutations / remerciements > meilleure réponse de la base.
// shortcut: score par mots-clés + tolérance aux fautes ; passer à une recherche sémantique si la base dépasse quelques centaines de réponses.
import { KB, CATEGORIES } from '../data/kb.js';

const STOP = new Set(('le la les un une des de du d l au aux et ou a à en est sont je tu il elle on nous vous ils mon ma mes ton ta tes son sa ses ' +
  'ce cette ces qui que quoi quel quelle quels quelles comment ou où pour par sur dans avec pas ne se me te y ai as faire fait peux peut veux ' +
  'the a an of to in on at for and or is are am be i you he she it we they my your his her its our their what which who how where when do does can ' +
  'want need please svp stp est-ce ca ça c s t').split(' '));
const SENSITIVE = ['sante mentale', 'mental health', 'suicide', 'suicidaire', 'suicidal', 'depression', 'deprime', 'depressed', 'anxiete', 'anxiety',
  'detresse', 'distress', 'me tuer', 'kill myself', 'self harm', 'automutilation', 'counselling', 'psychologue', 'me sens mal', 'feel hopeless'];
const HELLO = ['bonjour', 'salut', 'allo', 'hello', 'hi', 'hey', 'bonsoir', 'coucou', 'yo'];
const THANKS = ['merci', 'thanks', 'thank you', 'thx', 'super merci', 'merci beaucoup'];

export function norm(s) {
  return ` ${String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim()} `;
}
const words = (s) => norm(s).trim().split(' ').filter((w) => w && !STOP.has(w));

function lev(a, b) { // distance d'édition (tolérance d'une faute de frappe)
  if (Math.abs(a.length - b.length) > 1) return 2;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

// Index préparé une seule fois au chargement.
const INDEX = KB.map((e) => {
  const kws = e.keywords.map(norm);
  const vocab = new Set([...kws.flatMap((k) => k.trim().split(' ')), ...words(e.question.fr), ...words(e.question.en)]);
  return { e, kws, vocab: [...vocab].filter((w) => w.length > 2 && !STOP.has(w)) };
});
const ALL_WORDS = new Set(INDEX.flatMap((it) => it.vocab)); // un mot connu n'est pas une faute de frappe
const CAT_HINTS = CATEGORIES.map((c) => ({ id: c.id, hints: c.hints.map(norm) }));

function score(item, n, qwords, cats) {
  let s = 0;
  for (const k of item.kws) {
    if (n.includes(k)) s += 2 + k.trim().split(' ').length; // expression exacte : plus elle est longue, plus elle compte
    else if (k.length >= 7 && !k.trim().includes(' ') && qwords.some((w) => w.length >= 5 && !ALL_WORDS.has(w) && lev(w, k.trim()) <= 1)) s += 2.5; // mot-clé avec une faute
  }
  for (const w of qwords) {
    if (w.length < 3) continue;
    if (item.vocab.includes(w)) s += 1;
    else if (w.length >= 5 && !ALL_WORDS.has(w) && item.vocab.some((v) => v.length >= 5 && lev(w, v) <= 1)) s += 0.75;
  }
  if (cats.has(item.e.category)) s += 0.5;
  return s;
}

export function findAnswer(text) {
  const n = norm(text);
  const qwords = words(text);
  if (SENSITIVE.some((k) => n.includes(norm(k)))) return { type: 'sensitive' };
  const all = n.trim().split(' ');
  if (all.length <= 3 && HELLO.some((h) => n.includes(` ${h} `))) return { type: 'hello' };
  if (THANKS.some((h) => n.includes(norm(h))) && all.length <= 5) return { type: 'thanks' };
  const cats = new Set(CAT_HINTS.filter((c) => c.hints.some((h) => n.includes(h))).map((c) => c.id));
  const ranked = INDEX.map((it) => ({ e: it.e, s: score(it, n, qwords, cats) })).filter((r) => r.s > 0).sort((a, b) => b.s - a.s);
  const best = ranked[0];
  if (best && best.s >= 2.5) return { type: 'answer', entry: best.e, score: best.s, alts: ranked.slice(1, 4).filter((r) => r.s >= 2).map((r) => r.e) };
  return { type: 'none', alts: ranked.slice(0, 3).filter((r) => r.s >= 1).map((r) => r.e) };
}

export const byId = (id) => KB.find((e) => e.id === id);
export const inCategory = (cat) => KB.filter((e) => e.category === cat);
export { KB, CATEGORIES };
