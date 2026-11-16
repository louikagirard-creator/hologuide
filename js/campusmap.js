// Carte du campus et itinéraires à pied depuis la borne (CRX, INNOVA).
// Données : OpenStreetMap (© contributeurs OpenStreetMap, licence ODbL), préparées dans data/campus-map.json et data/routes.json.
// Tout est dessiné en SVG : net à toutes les tailles, rien à télécharger d'autre.

const NS = 'http://www.w3.org/2000/svg';
let DATA = null;
let loading = null;

// Chargement unique des deux fichiers ; les réponses sur un pavillon trouvent ensuite leur trajet par l'id de la fiche.
export function loadCampus() {
  if (!loading) {
    loading = Promise.all([fetch('data/campus-map.json').then((r) => r.json()), fetch('data/routes.json').then((r) => r.json())])
      .then(([map, routes]) => {
        const byKb = new Map();
        for (const [code, r] of Object.entries(routes.routes)) for (const id of r.kb || []) if (!byKb.has(id)) byKb.set(id, code);
        DATA = { map, routes, byKb };
        return DATA;
      })
      .catch((err) => { console.warn('Carte du campus indisponible :', err); loading = null; return null; });
  }
  return loading;
}
const fold = (x) => ` ${String(x).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()} `;
// Mots qui désignent un pavillon : son code (« tbt ») et le mot distinctif de son nom (« tabaret », « fauteux »)
function tokens() {
  if (DATA.tokens) return DATA.tokens;
  const common = new Set(['pavillon', 'hall', 'residence', 'complexe', 'maisons', 'building', 'centre', 'universitaire', 'sports', 'de', 'du', 'la', 'le', 'des', 'and', 'the', 'house', 'houses']);
  DATA.tokens = [];
  for (const [code, r] of Object.entries(DATA.routes.routes)) {
    if (code === 'CRX') continue;
    const words = new Set([code.split('-')[0].toLowerCase()]);
    for (const n of [r.name.fr, r.name.en]) fold(n.replace(/\(.*?\)/g, '')).trim().split(' ').filter((w) => w.length > 3 && !common.has(w) && !/^\d+$/.test(w)).forEach((w) => words.add(w));
    words.forEach((w) => DATA.tokens.push([w, code]));
  }
  return DATA.tokens;
}
// Trajet d'une fiche : lien direct (routes.json), sinon le pavillon nommé dans une question « où est… / comment aller à… »
const WHERE = / (ou|where|aller|rendre|trouve|get to|go to|find|directions?|itineraire|chemin) /;
export function routeForEntry(entry, asked = '') {
  if (!DATA || !entry) return null;
  let code = DATA.byKb.get(entry.id);
  const q = fold(asked);
  if (!code && WHERE.test(q)) code = tokens().find(([w]) => q.includes(` ${w} `))?.[1]; // pavillon nommé dans la question posée
  if (!code && WHERE.test(fold(`${entry.question.fr} ${entry.question.en}`))) {
    const text = fold(`${entry.question.fr} ${entry.question.en} ${entry.keywords.join(' ')}`);
    code = tokens().find(([w]) => text.includes(` ${w} `))?.[1];
  }
  return code ? { code, ...DATA.routes.routes[code] } : null;
}

// ---------- Projection : degrés → mètres (plan local, nord en haut) ----------
const LAT0 = 45.4235, LON0 = -75.682, M = 111320, COS = Math.cos((LAT0 * Math.PI) / 180);
const px = ([lon, lat]) => [(lon - LON0) * COS * M, (LAT0 - lat) * M];

const el = (tag, attrs = {}, parent) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
};
const path = (pts, close) => pts.map((p, i) => { const [x, y] = px(p); return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`; }).join('') + (close ? 'Z' : '');
function bounds(pts) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of pts) { const [x, y] = px(p); x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return { x0, y0, x1, y1 };
}
const centroid = (poly) => { const b = bounds(poly); return [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2]; };
const inView = (pts, v) => pts.some((p) => { const [x, y] = px(p); return x >= v.x0 && x <= v.x1 && y >= v.y0 && y <= v.y1; });

// ---------- Dessin ----------
// options : focus = [i, j] (partie du trajet mise en avant), aspect = largeur/hauteur, pad = marge en mètres,
// min = taille minimale de la vue en mètres, labels = afficher les codes des pavillons et les noms de rues
export function drawRoute(code, { lang = 'fr', focus = null, aspect = 1, pad = 60, min = 220, labels = true, mini = false } = {}) {
  const { map, routes } = DATA;
  const r = routes.routes[code];
  const line = r.line.length > 1 ? r.line : [r.at, r.at];
  const part = focus ? line.slice(focus[0], Math.max(focus[0] + 2, focus[1] + 1)) : line;

  // Cadre : la partie à montrer + marge, agrandi pour respecter le format demandé
  const b = bounds(part);
  let w = Math.max(b.x1 - b.x0 + pad * 2, min), h = Math.max(b.y1 - b.y0 + pad * 2, min);
  if (w / h < aspect) w = h * aspect; else h = w / aspect;
  const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
  const v = { x0: cx - w / 2, y0: cy - h / 2, x1: cx + w / 2, y1: cy + h / 2 };
  const s = w / 600; // épaisseurs et textes proportionnels à la vue

  const svg = el('svg', { viewBox: `${v.x0.toFixed(1)} ${v.y0.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`, class: `campus-map${mini ? ' mini' : ''}`, role: 'img' });
  el('rect', { x: v.x0, y: v.y0, width: w, height: h, class: 'm-ground' }, svg);
  const big = { x0: v.x0 - w, y0: v.y0 - h, x1: v.x1 + w, y1: v.y1 + h }; // marge pour les formes qui débordent
  const visible = (pts) => inView(pts, big);

  const g = (cls) => el('g', { class: cls }, svg);
  const water = g('m-water'), green = g('m-green'), casing = g('m-road-casing'), roads = g('m-road'), foot = g('m-foot'), blds = g('m-bld');
  map.water.filter(visible).forEach((p) => el('path', { d: path(p, true) }, water));
  map.green.filter(visible).forEach((p) => el('path', { d: path(p, true) }, green));
  for (const rd of map.roads.filter((x) => visible(x.line))) {
    const wid = { primary: 16, secondary: 13, tertiary: 11, residential: 9, service: 6 }[rd.kind] || 7;
    el('path', { d: path(rd.line), 'stroke-width': (wid + 2.5).toFixed(1) }, casing);
    el('path', { d: path(rd.line), 'stroke-width': wid }, roads);
  }
  map.footways.filter(visible).forEach((l) => el('path', { d: path(l), 'stroke-width': (1.6 * Math.max(1, s)).toFixed(2), 'stroke-dasharray': `${(4 * s).toFixed(1)} ${(3 * s).toFixed(1)}` }, foot));
  for (const bd of map.buildings) {
    if (!visible(bd.poly)) continue;
    const cls = bd.code === code ? 'dest' : bd.code === 'CRX' ? 'here' : bd.uo ? 'uo' : '';
    el('path', { d: path(bd.poly, true), class: cls }, blds);
  }

  // Trajet : liseré blanc + trait grenat ; la partie mise en avant est pleine, le reste estompé
  const route = g('m-route');
  if (r.line.length > 1) {
    el('path', { d: path(line), class: 'halo', 'stroke-width': (9 * s).toFixed(1) }, route);
    el('path', { d: path(line), class: focus ? 'rest' : 'main', 'stroke-width': (5 * s).toFixed(1) }, route);
    if (focus) el('path', { d: path(part), class: 'main', 'stroke-width': (6.5 * s).toFixed(1) }, route);
  }

  // Étiquettes : codes des pavillons uOttawa et noms des rues principales
  if (labels) {
    const lab = g('m-label');
    const seen = new Set();
    for (const bd of map.buildings) {
      if (!bd.uo || !bd.code || seen.has(bd.code) || !inView(bd.poly, v)) continue;
      const bb = bounds(bd.poly);
      if (!mini && Math.max(bb.x1 - bb.x0, bb.y1 - bb.y0) < 18 * s) continue;
      seen.add(bd.code);
      const [x, y] = centroid(bd.poly);
      const t = el('text', { x: x.toFixed(1), y: y.toFixed(1), 'font-size': ((bd.code === code ? 15 : 11) * s).toFixed(1), class: bd.code === code ? 'dest' : '' }, lab);
      t.textContent = bd.code.replace(/-.*/, '');
    }
    if (!mini) {
      const named = new Set();
      for (const rd of map.roads) {
        if (!rd.name || named.has(rd.name) || !['primary', 'secondary', 'tertiary', 'residential'].includes(rd.kind) || !inView(rd.line, v)) continue;
        // segment le plus long visible : le nom s'écrit dans son sens
        let best = null;
        for (let i = 1; i < rd.line.length; i++) {
          const a = px(rd.line[i - 1]), c = px(rd.line[i]), len = Math.hypot(c[0] - a[0], c[1] - a[1]);
          const mid = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2];
          if (mid[0] < v.x0 + 30 * s || mid[0] > v.x1 - 30 * s || mid[1] < v.y0 + 20 * s || mid[1] > v.y1 - 20 * s) continue;
          if (!best || len > best.len) best = { len, mid, ang: (Math.atan2(c[1] - a[1], c[0] - a[0]) * 180) / Math.PI };
        }
        if (!best || best.len < 70 * s) continue;
        named.add(rd.name);
        let ang = best.ang; if (ang > 90) ang -= 180; if (ang < -90) ang += 180;
        const t = el('text', { x: best.mid[0].toFixed(1), y: best.mid[1].toFixed(1), 'font-size': (10 * s).toFixed(1), class: 'road', transform: `rotate(${ang.toFixed(1)} ${best.mid[0].toFixed(1)} ${best.mid[1].toFixed(1)})` }, lab);
        t.textContent = rd.name;
      }
    }
  }

  // Station de train léger
  for (const st of map.transit) {
    if (!inView([st.at], v)) continue;
    const [x, y] = px(st.at);
    el('rect', { x: x - 7 * s, y: y - 7 * s, width: 14 * s, height: 14 * s, rx: 3 * s, class: 'm-train' }, svg);
    const t = el('text', { x, y: y + 3.6 * s, 'font-size': 9 * s, class: 'm-train-t' }, svg); t.textContent = 'O';
  }

  // Départ (« Tu es ici ») et arrivée
  const [ox, oy] = px(routes.origin.at), [dx, dy] = px(r.at);
  const pins = g('m-pins');
  if (!focus || focus[0] === 0) {
    el('circle', { cx: ox, cy: oy, r: 11 * s, class: 'here-ring' }, pins);
    el('circle', { cx: ox, cy: oy, r: 6 * s, class: 'here-dot' }, pins);
    if (!mini) { const t = el('text', { x: ox, y: oy - 16 * s, 'font-size': 12 * s, class: 'here-t' }, pins); t.textContent = lang === 'fr' ? 'Tu es ici' : 'You are here'; }
  }
  if (code !== 'CRX' && (!focus || focus[1] >= line.length - 2)) {
    el('path', { d: `M${dx} ${dy}c${-9 * s} ${-12 * s} ${-12 * s} ${-17 * s} ${-12 * s} ${-23 * s}a${12 * s} ${12 * s} 0 1 1 ${24 * s} 0c0 ${6 * s} ${-3 * s} ${11 * s} ${-12 * s} ${23 * s}z`, class: 'dest-pin' }, pins);
    el('circle', { cx: dx, cy: dy - 23 * s, r: 4.5 * s, class: 'dest-dot' }, pins);
  }

  // Nord, échelle et crédit (grande carte seulement)
  if (!mini) {
    const deco = g('m-deco');
    const nx = v.x1 - 24 * s, ny = v.y0 + 30 * s;
    el('path', { d: `M${nx} ${ny - 14 * s}l${7 * s} ${18 * s}l${-7 * s} ${-5 * s}l${-7 * s} ${5 * s}z` }, deco);
    const nt = el('text', { x: nx, y: ny + 16 * s, 'font-size': 10 * s }, deco); nt.textContent = 'N';
    const len = [50, 100, 200, 500].find((m) => m >= w / 6) || 500, sx = v.x0 + 16 * s, sy = v.y1 - 18 * s;
    el('path', { d: `M${sx} ${sy - 4 * s}v${4 * s}h${len}v${-4 * s}`, class: 'scale', 'stroke-width': 1.5 * s }, deco);
    const st = el('text', { x: sx + len / 2, y: sy - 7 * s, 'font-size': 9.5 * s }, deco); st.textContent = `${len} m`;
    const cr = el('text', { x: v.x1 - 8 * s, y: v.y1 - 8 * s, 'font-size': 8 * s, class: 'credit' }, deco);
    cr.textContent = lang === 'fr' ? '© contributeurs OpenStreetMap' : '© OpenStreetMap contributors';
  }
  return svg;
}
