// IA de Gee-Gee : deux modes, mêmes garde-fous.
//  1. En ligne (meilleure qualité) : si AI_ENDPOINT est rempli, le site appelle le relais Cloudflare (worker/), qui garde
//     la clé gratuite Groq ou Gemini. Seules la question et les fiches officielles sont envoyées, rien de personnel.
//  2. Dans le navigateur (gratuit, sans clé) : WebLLM + petit modèle Qwen 2.5 (~1 Go, téléchargé une fois, WebGPU).
// Règle d'or : l'IA ne fait que reformuler les FICHES OFFICIELLES trouvées par la recherche. Si les fiches ne répondent
// pas, elle le dit. Toute réponse douteuse est rejetée et le site répond comme avant.

// ▼ Adresse du relais IA en ligne, à coller ici après son déploiement (voir worker/README.md). Vide = IA dans le navigateur.
export const AI_ENDPOINT = '';

const LIB = 'https://esm.run/@mlc-ai/web-llm@0.2.86';
const MODELS = ['Qwen2.5-1.5B-Instruct-q4f16_1-MLC', 'Qwen2.5-1.5B-Instruct-q4f32_1-MLC']; // ~1 Go ; f16 si la carte le permet (le 3B testé n'était pas meilleur et plus lent)
const TIMEOUT_MS = AI_ENDPOINT ? 9000 : 15000;

let engine = null, loading = null;
export const ai = { state: 'off', progress: 0, error: '', online: Boolean(AI_ENDPOINT) }; // off · loading · ready · unsupported · error

export const aiSupported = () => Boolean(AI_ENDPOINT) || (typeof navigator !== 'undefined' && 'gpu' in navigator);

export function loadAI(onChange = () => {}) {
  if (AI_ENDPOINT) { ai.state = 'ready'; ai.progress = 100; onChange(ai); return Promise.resolve(true); } // rien à télécharger
  if (engine) return Promise.resolve(engine);
  if (loading) return loading;
  if (!aiSupported()) { ai.state = 'unsupported'; onChange(ai); return Promise.resolve(null); }
  ai.state = 'loading'; ai.progress = 0; onChange(ai);
  loading = (async () => {
    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) throw new Error('Pas de carte graphique compatible WebGPU');
      const model = adapter.features.has('shader-f16') ? MODELS[0] : MODELS[1];
      const { CreateMLCEngine } = await import(LIB);
      engine = await CreateMLCEngine(model, {
        initProgressCallback: (p) => { ai.progress = Math.round((p.progress || 0) * 100); onChange(ai); }
      });
      ai.state = 'ready'; ai.progress = 100; onChange(ai);
      return engine;
    } catch (err) {
      console.warn('IA indisponible :', err);
      ai.state = 'error'; ai.error = String(err?.message || err); onChange(ai);
      loading = null;
      return null;
    }
  })();
  return loading;
}

const SYSTEM = {
  fr: "Tu es Gee-Gee, la mascotte de l'Université d'Ottawa, dans une borne d'information. Réponds en français, en tutoyant, en 1 à 3 phrases courtes et chaleureuses. Commence par la réponse précise à la QUESTION : le lieu, l'heure, le prix, la date ou la démarche demandés, avec le chiffre exact des FICHES. Ne récite pas les fiches, ne répète pas la question et ne donne pas de détail qui n'aide pas à y répondre. Utilise UNIQUEMENT les informations des FICHES ci-dessous : n'invente aucun lieu, heure, prix, date, nom ni numéro. Si les fiches ne permettent pas de répondre à la question, réponds exactement : JE_NE_SAIS_PAS. Pas de liens, pas de listes, pas de markdown. Termine par les numéros des fiches utilisées entre crochets, par exemple [1] ou [1][3].",
  en: "You are Gee-Gee, the University of Ottawa mascot, in an information kiosk. Answer in English, in 1 to 3 short, warm sentences. Start with the precise answer to the QUESTION: the place, time, price, date or step asked for, with the exact figure from the FACT SHEETS. Do not recite the sheets, do not repeat the question, and leave out details that do not help answer it. Use ONLY the information in the FACT SHEETS below: never invent a place, time, price, date, name or number. If the sheets do not answer the question, reply exactly: JE_NE_SAIS_PAS. No links, no lists, no markdown. End with the numbers of the sheets you used in brackets, e.g. [1] or [1][3]."
};
const withTimeout = (p, ms) => Promise.race([p, new Promise((resolve) => setTimeout(() => resolve(null), ms))]);

// Texte brut de l'IA (en ligne ou dans le navigateur), ou null
async function generate(question, entries, lang) {
  if (AI_ENDPOINT) {
    const ctrl = new AbortController();
    const res = await withTimeout(fetch(AI_ENDPOINT, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctrl.signal,
      body: JSON.stringify({ question, lang, facts: entries })
    }).then((r) => (r.ok ? r.json() : null)).catch(() => null), TIMEOUT_MS);
    if (!res) { ctrl.abort(); return null; }
    return res.text || null;
  }
  if (!engine) return null;
  const fr = lang === 'fr';
  const facts = entries.map((e, i) => `[${i + 1}] ${e.q}\n${e.a}`).join('\n\n');
  const out = await withTimeout(engine.chat.completions.create({
    messages: [{ role: 'system', content: SYSTEM[fr ? 'fr' : 'en'] }, { role: 'user', content: `${fr ? 'FICHES' : 'FACT SHEETS'} :\n${facts}\n\nQUESTION : ${question}` }],
    temperature: 0.2, max_tokens: 200
  }), TIMEOUT_MS);
  if (!out) { engine.interruptGenerate?.(); return null; }
  return out.choices?.[0]?.message?.content || null;
}

// Garde-fous (fonction pure, testée par tests/ai.test.mjs). Renvoie { text, used } ou null si la réponse est douteuse.
export function checkAnswer(raw, question, entries) {
  let text = String(raw || '').trim();
  if (!text || /JE_NE_SAI|ne sais pas|don.?t know|not sure|end with|je vais|i will|fiches?|fact sheets?/i.test(text)) return null; // refus, hésitation ou reste de consigne
  let used = [...text.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1]) - 1).filter((i) => i >= 0 && i < entries.length);
  if (!used.length) return null; // n° 0 : l'IA doit citer ses fiches
  text = text.replace(/\s*\[\d+\]/g, '').replace(/[*_#`]/g, '').trim();
  if (text.length < 8) return null;
  // n° 1 : chaque nombre de la réponse (local, heure, prix, téléphone, date) doit exister tel quel dans les fiches
  const factsDigits = entries.map((e) => `${e.q} ${e.a}`).join(' ').replace(/[\s.,:h$-]/g, ' ');
  if ((text.match(/\d+/g) || []).some((n) => !new RegExp(`(^|\\D)${n}(\\D|$)`).test(factsDigits))) return null;
  // n° 2 : la réponse doit reprendre le contenu des fiches citées (les mots repris de la question ne prouvent rien)
  const toks = (x) => new Set(x.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[^a-z0-9]+/).filter((w) => w.length > 3));
  const qw = toks(question);
  const tw = new Set([...toks(text)].filter((w) => !qw.has(w)));
  const overlap = entries.map((e) => { const ew = toks(`${e.q} ${e.a}`); let k = 0; tw.forEach((w) => { if (ew.has(w)) k++; }); return k / Math.max(1, tw.size); });
  if (tw.size < 3 || Math.max(...used.map((i) => overlap[i])) < 0.4) return null;
  return { text, used: [...new Set(used)] };
}

// Réponse courte de Gee-Gee à partir des fiches fournies seulement : { text, used } ou null (le site garde la réponse habituelle)
export async function aiAnswer(question, entries, lang) {
  if (ai.state !== 'ready' || !entries.length) return null;
  try {
    const raw = await generate(question, entries, lang);
    ai.last = raw || ''; // dernière sortie brute (diagnostic)
    return checkAnswer(raw, question, entries);
  } catch (err) { console.warn('Réponse IA impossible :', err); return null; }
}
