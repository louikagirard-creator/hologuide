// Récapitulatif de la session : la conversation est encodée dans le lien du code QR de fin.
// Rien n'est envoyé ni conservé sur un serveur : le lien contient la liste des questions, et le document
// (recap.html) relit les réponses et les pages officielles dans la base de connaissances du site.
import { TEXT, LINKS } from './i18n.js';
import { KB } from '../data/kb.js';

const BY_ID = new Map(KB.map((e) => [e.id, e]));
const MAX_ITEMS = 12; // au-delà, le code QR devient dense et difficile à scanner
const L = (o, lang) => (o && typeof o === 'object' ? o[lang] || o.fr : o);
const cut = (s, n) => { const x = String(s || '').replace(/\s+/g, ' ').trim(); return x.length > n ? `${x.slice(0, n - 1).trimEnd()}…` : x; };
const fill = (s, vars) => String(s).replace(/\{(\w+)\}/g, (_, k) => vars[k]);
const host = (url) => { try { return new URL(url).host.replace(/^www\./, ''); } catch { return url; } };

// Un échange du journal -> forme la plus courte possible : questions et réponses officielles sont relues
// dans la base, ce qui garde un lien assez court pour un code QR net et facile à scanner.
//   ['k', id]              fiche officielle (question et réponse viennent de la base)
//   ['s', question]        redirection santé et bien-être (réponse fixe)
//   ['p', url, titre]      page officielle ouverte pendant la session
//   ['n', question, url?]  aucune fiche : la page officielle proposée, ou InfoService
export function recapItem(it) {
  if (!it || !it.q) return null;
  if (it.id && BY_ID.has(it.id)) return ['k', it.id];
  if (it.type === 'sensitive') return ['s', cut(it.q, 70)];
  if (!it.a && it.url) return ['p', it.url, cut(it.q, 50)];
  return ['n', cut(it.q, 70), it.url || ''];
}

export function recapData(log = [], lang = 'fr', startedAt = Date.now()) {
  return { v: 1, t: startedAt, l: lang === 'en' ? 'en' : 'fr', i: log.map(recapItem).filter(Boolean).slice(0, MAX_ITEMS) };
}

// Lien absolu vers le document, dans le même dossier que le site (valable en ligne comme en local).
export function recapLink(data, base) {
  const href = base || (typeof location !== 'undefined' ? location.href : '');
  const dir = href.replace(/[?#].*$/, '').replace(/[^/]*$/, '');
  return `${dir}recap.html#${encodeURIComponent(JSON.stringify(data))}`;
}

export function decodeRecap(hash) {
  const raw = String(hash || '').replace(/^#/, '');
  if (!raw) return null;
  const read = (s) => { const d = JSON.parse(s); return d && d.v === 1 && Array.isArray(d.i) ? d : null; };
  try { return read(raw); } catch { /* hash encodé par le code QR */ }
  try { return read(decodeURIComponent(raw)); } catch { return null; }
}

// Données prêtes à afficher : question, réponse et pages officielles d'où vient la réponse.
export function readRecap(data) {
  const lang = data?.l === 'en' ? 'en' : 'fr';
  const T = TEXT[lang];
  const link = (label, url) => (url ? { label: label || host(url), url } : null);
  const rows = [];
  for (const [kind, a, b] of data?.i || []) {
    if (kind === 'k') {
      const e = BY_ID.get(a);
      if (!e) continue; // fiche retirée de la base depuis : on ne l'invente pas
      rows.push({
        q: L(e.question, lang), a: L(e.answer, lang),
        sources: (e.sources || []).map((s) => link(L(s.label, lang), s.url)).filter(Boolean)
      });
    } else if (kind === 's') {
      rows.push({ q: a, a: T.sensitive, sources: [link(LINKS.wellness.label[lang], LINKS.wellness.url)] });
    } else if (kind === 'p') {
      rows.push({ q: b || host(a), a: '', sources: [link(b, a)] });
    } else if (kind === 'n') {
      const label = b === LINKS.infoservice.url ? LINKS.infoservice.label[lang] : null;
      rows.push({ q: a, a: b ? T.noneLinks : T.none, sources: [link(label, b || LINKS.infoservice.url)] });
    }
  }
  return { lang, when: new Date(Number(data?.t) || Date.now()), rows };
}

// ---------- Le document (recap.html) : imprimable, sans dépendance au reste de l'interface ----------
function render() {
  const data = decodeRecap(location.hash);
  const { lang, when, rows } = readRecap(data);
  const T = TEXT[lang];
  const $ = (s) => document.querySelector(s);
  const li = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  document.documentElement.lang = lang;
  document.title = `HoloGuide · ${T.recapTitle}`;
  $('#recapTitle').textContent = T.recapTitle;
  $('#recapLead').textContent = rows.length ? fill(T.recapLead, { n: rows.length }) : T.recapEmpty;
  $('#recapMeta').textContent = rows.length ? fill(T.recapWhen, { date: when.toLocaleString(lang === 'en' ? 'en-CA' : 'fr-CA', { dateStyle: 'long', timeStyle: 'short' }) }) : '';
  $('#printBtn').textContent = T.recapPrint;
  $('#printBtn').hidden = !rows.length;
  $('#backLink').textContent = T.recapBack;
  $('#recapFoot').replaceChildren(
    document.createTextNode(`${T.recapFooter} `),
    Object.assign(document.createElement('a'), { href: 'https://www.uottawa.ca/', target: '_blank', rel: 'noopener', textContent: T.recapSite }),
    document.createTextNode(` · ${LINKS.infoservice.label[lang]}: `),
    Object.assign(document.createElement('a'), { href: LINKS.infoservice.url, target: '_blank', rel: 'noopener', textContent: LINKS.infoservice.url }));

  $('#recap').replaceChildren(...rows.map((r, i) => {
    const item = li('li');
    item.append(li('h2', 'q', `${i + 1}. ${r.q}`));
    if (r.a) item.append(li('p', 'a', r.a));
    if (r.sources.length) {
      const list = li('ul', 'src');
      list.append(...r.sources.map((s) => {
        const a = Object.assign(document.createElement('a'), { href: s.url, target: '_blank', rel: 'noopener', textContent: s.label || s.url });
        const row = li('li');
        row.append(a);
        return row;
      }));
      item.append(li('p', 'src-label', T.recapSource), list);
    }
    return item;
  }));
}

if (typeof document !== 'undefined' && document.getElementById('recap')) {
  render();
  addEventListener('hashchange', render);
  document.getElementById('printBtn').addEventListener('click', () => window.print());
}
