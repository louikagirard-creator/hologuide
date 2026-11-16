// Recherche dans l'index de toutes les pages officielles (data/links.json, ~36 000 pages de uottawa.ca,
// du catalogue des cours et de Telfer). Sert de filet quand aucune fiche de la base ne répond :
// Gee-Gee propose alors les pages officielles dont l'adresse correspond le mieux à la question.
import { norm, STOP } from './search.js';

let INDEX = null;
let loading = null;

// Mots d'une adresse : « study/fees-financial-support/payment-fees » → study, fees, financial, support, payment
const words = (path) => norm(path.replace(/[/_-]+/g, ' ')).trim().split(' ').filter((w) => w.length > 2 && !STOP.has(w));

export function loadLinks() {
  if (!loading) {
    loading = fetch('data/links.json').then((r) => r.json()).then((data) => {
      const post = new Map(); // mot → pages qui le contiennent (avec poids : dernier segment = plus important)
      data.pages.forEach((p, i) => {
        const seen = new Map();
        for (const path of p) {
          if (!path) continue;
          const segs = path.replace(/^https:\/\/[^/]+\//, '').split('/');
          segs.forEach((seg, k) => {
            const wgt = k === segs.length - 1 ? 2 : k === segs.length - 2 ? 1.2 : 0.6;
            for (const w of words(seg)) seen.set(w, Math.max(seen.get(w) || 0, wgt));
          });
        }
        for (const [w, wgt] of seen) { if (!post.has(w)) post.set(w, []); post.get(w).push(i, wgt); }
      });
      INDEX = { base: data.base, pages: data.pages, post, n: data.pages.length };
      return INDEX;
    }).catch((err) => { console.warn('Index des pages officielles indisponible :', err); loading = null; return null; });
  }
  return loading;
}

const url = (base, path) => (path.startsWith('https://') ? path : `${base}${path}`);
// Mots fréquents que les adresses écrivent sans apostrophe ni accent
const FIX = [[' uottawa ', ' uOttawa '], [' luniversite ', " l'Université "], [' universite ', ' université '], [' dottawa ', " d'Ottawa "], [' ottawa ', ' Ottawa '],
  [' etudiants ', ' étudiants '], [' etudiant ', ' étudiant '], [' etudes ', ' études '], [' faculte ', ' faculté '], [' genie ', ' génie '],
  [' sante ', ' santé '], [' societe ', ' société '], [' activites ', ' activités '], [' evenements ', ' événements '], [' recherche ', ' recherche '],
  [' superieures ', ' supérieures '], [' premier cycle ', ' premier cycle '], [' lecole ', " l'École "], [' ecole ', ' école ']];
// Titre lisible tiré de l'adresse : « payment-fees » → « Payment fees », avec la rubrique au-dessus
function title(path) {
  const segs = path.replace(/^https:\/\/([^/]+)\//, '$1/').split('/').filter(Boolean);
  const nice = (s) => {
    let t = ` ${decodeURIComponent(s).replace(/[-_]+/g, ' ').replace(/\.\w+$/, '').trim()} `;
    for (const [a, b] of FIX) t = t.replaceAll(a, b);
    t = t.trim(); return t.charAt(0).toUpperCase() + t.slice(1);
  };
  return { title: nice(segs[segs.length - 1] || 'uOttawa'), section: segs.slice(0, -1).slice(-2).map(nice).join(' › ') };
}

// Meilleures pages pour une question ; lang choisit la version française ou anglaise de la page
export function searchLinks(text, lang = 'fr', max = 5) {
  if (!INDEX) return [];
  const q = [...new Set(norm(text).trim().split(' ').filter((w) => w.length > 2 && !STOP.has(w)))];
  if (!q.length) return [];
  const score = new Map(), hits = new Map();
  for (const w of q) {
    const list = INDEX.post.get(w);
    if (!list) continue;
    const idf = Math.log(1 + INDEX.n / (list.length / 2));
    for (let k = 0; k < list.length; k += 2) {
      const i = list[k];
      score.set(i, (score.get(i) || 0) + idf * list[k + 1]);
      hits.set(i, (hits.get(i) || 0) + 1);
    }
  }
  const known = q.filter((w) => INDEX.post.has(w)).length;
  if (!known) return [];
  const need = known >= 3 ? 2 : known; // la page doit contenir la plupart des mots connus de la question
  return [...score.entries()]
    .filter(([i]) => hits.get(i) >= need)
    .map(([i, s]) => {
      const p = INDEX.pages[i], path = (lang === 'fr' && p[1]) || p[0] || p[1];
      const news = /(news|nouvelles|events|evenements|blog)/.test(path) ? 0.55 : 1; // services et programmes avant les articles
      return { s: s * news - path.split('/').length * 0.15, path }; // à score égal, la page la moins profonde d'abord
    })
    .sort((a, b) => b.s - a.s)
    .filter((r, k, all) => all.findIndex((x) => title(x.path).title === title(r.path).title) === k) // pas deux fois le même titre
    .slice(0, max)
    .map((r) => ({ url: url(INDEX.base, r.path), ...title(r.path) }));
}
