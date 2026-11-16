// Construit data/links.json : l'index de toutes les pages officielles de uottawa.ca (plans du site publics).
// Chaque page est gardée avec sa version française et anglaise. HoloGuide s'en sert quand aucune fiche ne répond :
// Gee-Gee propose alors les pages officielles les plus proches de la question (avec un code QR pour les ouvrir).
// Usage : node tools/build-links.mjs   (environ 1 minute ; à relancer chaque session pour suivre le site)
import { writeFileSync } from 'node:fs';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const BASE = 'https://www.uottawa.ca/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(url) {
  for (let i = 0; i < 3; i++) {
    const r = await fetch(url, { headers: { 'User-Agent': UA } }).catch(() => null);
    if (r?.ok) { const t = await r.text(); if (t.trim() && (!url.includes('.xml') || t.includes('<loc>'))) return t; } // réponse vide : le serveur demande de patienter
    await sleep(1500);
  }
  throw new Error(`Échec : ${url}`);
}
const locs = (xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, '&'));

// 1. Plans du site listés dans robots.txt (certains sont des index de pages : ?page=1, 2, 3…)
const robots = await get(`${BASE}robots.txt`);
const roots = [...robots.matchAll(/Sitemap:\s*(\S+)/gi)].map((m) => m[1])
  .concat(['https://catalogue.uottawa.ca/sitemap.xml', 'https://telfer.uottawa.ca/sitemap.xml']); // catalogue des cours et programmes, École Telfer
const files = [];
const tryGet = (u) => get(u).catch((err) => { console.warn(`  (ignoré) ${err.message}`); return ''; }); // un plan du site en panne n'arrête pas tout
for (const s of roots) {
  const xml = await tryGet(s); await sleep(300);
  if (xml.includes('<sitemapindex')) for (const u of locs(xml)) { files.push(await tryGet(u)); await sleep(300); }
  else files.push(xml);
}

// 2. Paires anglais / français grâce aux liens hreflang
const pairs = new Map();
for (const xml of files) {
  for (const block of xml.split('<url>').slice(1)) {
    const en = block.match(/hreflang="en" href="([^"]+)"/)?.[1], fr = block.match(/hreflang="fr" href="([^"]+)"/)?.[1];
    const loc = block.match(/<loc>([^<]+)<\/loc>/)?.[1];
    const e = en || (!fr ? loc : null), f = fr || null;
    if (!e && !f) continue;
    const key = e || f;
    if (!pairs.has(key)) pairs.set(key, [e, f]);
  }
}

// 3. Nettoyage : on garde les pages utiles à un visiteur (pas les fichiers, pas les pages de recherche)
// www.uottawa.ca : chemin seul (fichier plus léger) ; autres sites officiels : adresse complète
const strip = (raw) => { const u = raw?.replace(/^http:/, 'https:'); return (!u ? null : u.startsWith(BASE) ? decodeURI(u.slice(BASE.length)).replace(/\/$/, '') : /^https:\/\/[a-z.]*uottawa\.ca\//.test(u) ? decodeURI(u).replace(/\/$/, '') : null); };
const junk = /(\?|\/node\/|\/user\/|\/search|\.(pdf|docx?|xlsx?|jpg|png)$)/i;
const out = [];
for (const [, [e, f]] of pairs) {
  const pe = strip(e), pf = strip(f);
  if ((!pe && !pf) || junk.test(e || '') || junk.test(f || '')) continue;
  out.push(pf && pf !== pe ? [pe || '', pf] : [pe || pf]);
}
out.sort((a, b) => a[0].localeCompare(b[0]));
writeFileSync('data/links.json', JSON.stringify({ base: BASE, builtOn: new Date().toISOString().slice(0, 10), pages: out }));
console.log(`${out.length} pages officielles indexées → data/links.json`);
