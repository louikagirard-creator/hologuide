// Recherche de réponses, 100 % locale et instantanée (aucun serveur, aucune IA).
// Ordre : santé mentale (redirection) > salutations / remerciements > meilleure réponse de la base.
// shortcut: score par mots-clés + tolérance aux fautes ; passer à une recherche sémantique si la base dépasse quelques centaines de réponses.
import { KB, CATEGORIES } from '../data/kb.js';

export const STOP = new Set(('le la les un une des de du d l au aux et ou a à en est sont je tu il elle on nous vous ils mon ma mes ton ta tes son sa ses ' +
  'ce cette ces qui que quoi quel quelle quels quelles comment ou où pour par sur dans avec pas ne se me te y ai as faire fait peux peut veux ' +
  'the a an of to in on at for and or is are am be i you he she it we they my your his her its our their what which who how where when do does can ' +
  'want need please svp stp est-ce ca ça c s t').split(' '));
const SENSITIVE = ['sante mentale', 'mental health', 'suicide', 'suicidaire', 'suicidal', 'depression', 'deprime', 'depressed', 'anxiete', 'anxiety',
  'detresse', 'distress', 'me tuer', 'kill myself', 'self harm', 'automutilation', 'counselling', 'psychologue', 'me sens mal', 'feel hopeless'];
const HELLO = ['bonjour', 'salut', 'allo', 'hello', 'hi', 'hey', 'bonsoir', 'coucou', 'yo'];
const THANKS = ['merci', 'thanks', 'thank you', 'thx', 'super merci', 'merci beaucoup'];

export function norm(s) {
  return ` ${String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim()
    .replace(/\b([a-z]{4,})s\b/g, '$1')} `; // pluriel simple : « examens » = « examen »
}
const words = (s) => norm(s).trim().split(' ').filter((w) => w && !STOP.has(w));
// Synonymes courants (langage parlé, québécismes) ramenés aux mots de la base ; appliqués à la question seulement
const SYN = [[' egare ', ' perdu '], [' egaree ', ' perdue '], [' paume ', ' perdu '], [' carte d etudiant ', ' carte etudiante '], [' carte etudiant ', ' carte etudiante '],
  [' bouffer ', ' manger '], [' bouffe ', ' nourriture '], [' resto ', ' restaurant '], [' wc ', ' toilette '], [' salle de bain ', ' toilette '], [' bathroom ', ' toilette '], [' washroom ', ' toilette '],
  [' bibli ', ' bibliotheque '], [' biblio ', ' bibliotheque '], [' job ', ' emploi '], [' boulot ', ' emploi '], [' jobine ', ' emploi '], [' char ', ' voiture '],
  [' parking ', ' stationnement '], [' cell ', ' telephone '], [' ordi ', ' ordinateur '], [' laptop ', ' ordinateur portable '], [' prof ', ' professeur '], [' labo ', ' laboratoire ']];
const expand = (n) => { let x = n; for (const [a, b] of SYN) x = x.replaceAll(a, `${a}${b.trim()} `); return x; }; // garde le mot d'origine et ajoute le synonyme

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
  return { e, kws, idk: norm(e.id.replace(/^[a-z]-/, '')), vocab: [...vocab].filter((w) => w.length > 2 && !STOP.has(w)) };
});
const ALL_WORDS = new Set(INDEX.flatMap((it) => it.vocab)); // un mot connu n'est pas une faute de frappe
// Rareté de chaque mot : « différés » ou « fauteux » départagent mieux les réponses que « examens » ou « pavillon ».
const DF = new Map();
INDEX.forEach((it) => it.vocab.forEach((w) => DF.set(w, (DF.get(w) || 0) + 1)));
const idf = (w) => Math.min(2, 0.4 + Math.log(INDEX.length / (DF.get(w) || 1)) / 3);
const CAT_HINTS = CATEGORIES.map((c) => ({ id: c.id, hints: c.hints.map(norm) }));
// Mots d'aspect : ils disent CE QUI est demandé (heures, jour, prix…), pas DE QUOI on parle.
// Sans pondération, « le CRX est-il ouvert samedi ? » partait sur la fiche du Centre Brunsfield, la seule à parler d'ouverture le samedi.
const FACET = new Set(`heure heures horaire horaires ouvert ouverte ouverts ouvertes ouvre ouvrent ferme fermes fermee fermees fermeture
  samedi dimanche lundi mardi mercredi jeudi vendredi matin soir midi nuit aujourd demain weekend week end
  hours open opens opening close closes closed closing weekend weekdays monday tuesday wednesday thursday friday saturday sunday morning evening`.split(/\s+/));
const facetWeight = (parts) => (parts.every((w) => FACET.has(w)) ? 0.4 : 1);

function score(item, n, qwords, cats) {
  let s = 0;
  for (const k of item.kws) {
    if (n.includes(k)) s += (2 + k.trim().split(' ').length) * facetWeight(k.trim().split(' ')); // expression exacte : plus elle est longue, plus elle compte
    else if (k.length >= 7 && !k.trim().includes(' ') && qwords.some((w) => w.length >= 5 && !ALL_WORDS.has(w) && lev(w, k.trim()) <= 1)) s += 2.5; // mot-clé avec une faute
  }
  for (const w of qwords) {
    if (w.length < 3) continue;
    const f = FACET.has(w) ? 0.4 : 1;
    if (item.vocab.includes(w)) s += idf(w) * f;
    else if (w.length >= 5 && !ALL_WORDS.has(w) && item.vocab.some((v) => v.length >= 5 && lev(w, v) <= 1)) s += 0.75 * f;
  }
  if (cats.has(item.e.category)) s += 0.5;
  if (cats.club && item.e.category === 'associations') s += 1.5; // « club de … » : les fiches de clubs d'abord
  if (/\d/.test(item.idk) && n.includes(item.idk)) s += 1; // départage : « gng1503 » → la fiche j-gng1503 plutôt que son équivalent anglais
  return s;
}

export function findAnswer(text) {
  const n = expand(norm(text));
  const qwords = words(n);
  if (SENSITIVE.some((k) => n.includes(norm(k)))) return { type: 'sensitive' };
  const all = n.trim().split(' ');
  if (all.length <= 3 && HELLO.some((h) => n.includes(` ${h} `))) return { type: 'hello' };
  if (THANKS.some((h) => n.includes(norm(h))) && all.length <= 5) return { type: 'thanks' };
  const cats = new Set(CAT_HINTS.filter((c) => c.hints.some((h) => n.includes(h))).map((c) => c.id));
  cats.club = / (club|clubs|association etudiante|student club) /.test(n);
  const ranked = INDEX.map((it) => ({ e: it.e, s: score(it, n, qwords, cats) })).filter((r) => r.s > 0).sort((a, b) => b.s - a.s);
  const best = ranked[0];
  const top = ranked.slice(0, 6).map((r) => r.e); // candidates pour l'IA (elle relit plus de fiches que l'écran n'en montre)
  if (best && best.s >= 2.5) return { type: 'answer', entry: best.e, score: best.s, alts: ranked.slice(1, 4).filter((r) => r.s >= 2).map((r) => r.e), top };
  return { type: 'none', alts: ranked.slice(0, 3).filter((r) => r.s >= 1).map((r) => r.e), top };
}

// Phrase de la fiche qui répond le mieux à la question : on ne retire rien du texte officiel, on met seulement
// en tête la phrase qui traite du point demandé (heures, prix, date, téléphone, adresse) au lieu de toujours commencer par l'adresse.
const FACETS = [
  { q: /\b(heure|heures|horaire|horaires|ouvert|ouverte|ouverts|ouvertes|ouvre|ouvrent|ferme|fermee|fermeture|open|opens|opening|close|closes|closed|hours|time)\b/, s: /(heure|horaire|ouvert|ferme|open|close|hours|\d\s?h\b|a\.m\.|p\.m\.|midi|minuit)/i },
  { q: /\b(combien|prix|tarif|tarifs|cout|coutent|coute|cost|costs|price|prices|fee|fees|pay|payer)\b/, s: /(\$|prix|tarif|cout|frais|fee|cost|price)/i },
  { q: /\b(quand|date|dates|deadline|echeance|jusqu)\b/, s: /\b(janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre|january|february|march|april|june|july|august|september|october|november|december)\b/i },
  { q: /\b(telephone|phone)\b/, s: /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/ },
  { q: /(\bou est\b|\bou se trouve\b|\badresse\b|where|address)/, s: /(adresse|rue|avenue|promenade|situe|located|address|local [a-z]?\d)/i }
];
const ANAPHORA = /^(il|elle|ils|elles|c'est|ce sont|ca|cela|ceci|it|they|this|that|these|those|there)\b/i;
const NO_ACCENT = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// Découpe en phrases sans casser un prix (« 12.50 ») ni une heure (« 7 a.m. »).
const DOT = '\u2024';
const sentences = (t) => (t.replace(/\b([ap])\.m\.?(?=\s|$)/gi, `$1${DOT}m${DOT}`).match(/[^.!?…]+[.!?…]+(?:\s+|$)|[^.!?…]+$/g) || [t])
  .map((x) => x.trim().replaceAll(DOT, '.')).filter(Boolean);

// Réponse de la fiche, cadrée sur la question : même contenu officiel, phrase la plus pertinente en premier.
export function focusAnswer(entry, question, lang = 'fr') {
  const text = String(entry?.answer?.[lang] || entry?.answer?.fr || '');
  const parts = sentences(text);
  if (parts.length < 2) return text;
  const asked = NO_ACCENT(question);
  const facets = FACETS.filter((f) => f.q.test(asked)); // question sans point précis : on laisse l'ordre officiel
  if (!facets.length) return text;
  const own = new Set([...words(entry.question?.fr || ''), ...words(entry.question?.en || '')]); // mots qui nomment le sujet, pas ce qui est demandé
  const qw = words(asked).filter((w) => w.length > 2 && !own.has(w));
  const scored = parts.map((s, i) => ({
    s, i, k: facets.reduce((a, f) => a + (f.s.test(s) ? 2 : 0), 0) + qw.reduce((a, w) => a + (new Set(words(s)).has(w) ? 1 : 0), 0)
  }));
  const best = scored.reduce((a, b) => (b.k > a.k ? b : a), scored[0]);
  if (best.i === 0 || best.k < 2 || best.k <= scored[0].k || ANAPHORA.test(best.s)) return text; // « C'est là que… » ne peut pas ouvrir la réponse
  return [best.s, ...parts.filter((_, i) => i !== best.i)].join(' ');
}

export const byId = (id) => KB.find((e) => e.id === id);
export const inCategory = (cat) => KB.filter((e) => e.category === cat);
export { KB, CATEGORIES };
