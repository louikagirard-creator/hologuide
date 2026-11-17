// IA gratuite dans le navigateur (WebLLM + petit modèle Qwen 2.5) : aucune clé, aucun compte, rien n'est envoyé ailleurs.
// Le modèle (~1 Go) est téléchargé une seule fois puis gardé par le navigateur ; il tourne sur la carte graphique (WebGPU).
// Règle d'or : l'IA ne fait que reformuler les FICHES OFFICIELLES trouvées par la recherche. Elle n'invente rien ;
// si les fiches ne répondent pas, elle le dit. Si l'IA est absente, lente ou en erreur, le site répond comme avant.

const LIB = 'https://esm.run/@mlc-ai/web-llm@0.2.86';
const MODELS = ['Qwen2.5-1.5B-Instruct-q4f16_1-MLC', 'Qwen2.5-1.5B-Instruct-q4f32_1-MLC']; // ~1 Go ; f16 si la carte le permet (le 3B testé n'était pas meilleur et plus lent)
const TIMEOUT_MS = 15000;

let engine = null, loading = null;
export const ai = { state: 'off', progress: 0, error: '' }; // off · loading · ready · unsupported · error

export const aiSupported = () => typeof navigator !== 'undefined' && 'gpu' in navigator;

export function loadAI(onChange = () => {}) {
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

// Réponse courte, en parlant comme Gee-Gee, à partir des fiches fournies seulement.
// Renvoie { text, used: [indices des fiches utilisées] } ou null (pas d'IA, délai dépassé, ou « je ne sais pas »).
export async function aiAnswer(question, entries, lang) {
  if (!engine || !entries.length) return null;
  const fr = lang === 'fr';
  const facts = entries.map((e, i) => `[${i + 1}] ${e.q}\n${e.a}`).join('\n\n');
  const system = fr
    ? "Tu es Gee-Gee, la mascotte de l'Université d'Ottawa, dans une borne d'information. Réponds en français, en tutoyant, en 1 à 3 phrases courtes et chaleureuses. Utilise UNIQUEMENT les informations des FICHES ci-dessous : n'invente aucun lieu, heure, prix, date, nom ni numéro. Si les fiches ne permettent pas de répondre à la question, réponds exactement : JE_NE_SAIS_PAS. Pas de liens, pas de listes, pas de markdown. Termine par les numéros des fiches utilisées entre crochets, par exemple [1] ou [1][3]."
    : "You are Gee-Gee, the University of Ottawa mascot, in an information kiosk. Answer in English, in 1 to 3 short, warm sentences. Use ONLY the information in the FACT SHEETS below: never invent a place, time, price, date, name or number. If the sheets do not answer the question, reply exactly: JE_NE_SAIS_PAS. No links, no lists, no markdown. End with the numbers of the sheets you used in brackets, e.g. [1] or [1][3].";
  const ask = engine.chat.completions.create({
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: `${fr ? 'FICHES' : 'FACT SHEETS'} :\n${facts}\n\n${fr ? 'QUESTION' : 'QUESTION'} : ${question}` }
    ],
    temperature: 0.2, max_tokens: 200
  });
  const timer = new Promise((resolve) => setTimeout(() => resolve(null), TIMEOUT_MS));
  try {
    const out = await Promise.race([ask, timer]);
    if (!out) { engine.interruptGenerate?.(); return null; }
    let text = (out.choices?.[0]?.message?.content || '').trim();
    ai.last = text; // dernière sortie brute (diagnostic)
    if (!text || /JE_NE_SAI|ne sais pas|don.?t know|not sure|end with|je vais|i will|fiches?|fact sheets?/i.test(text)) return null; // refus, hésitation ou reste de consigne : réponse habituelle
    let used = [...text.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1]) - 1).filter((i) => i >= 0 && i < entries.length);
    if (!used.length) return null; // garde-fou n° 0 : l'IA doit citer ses fiches
    text = text.replace(/\s*\[\d+\]/g, '').replace(/[*_#`]/g, '').trim();
    if (text.length < 8) return null;
    // Garde-fou n° 1 : chaque nombre de la réponse (local, heure, prix, téléphone, date) doit exister tel quel dans les fiches
    const factsDigits = entries.map((e) => `${e.q} ${e.a}`).join(' ').replace(/[\s.,:h$-]/g, ' ');
    const nums = text.match(/\d+/g) || [];
    if (nums.some((n) => !new RegExp(`(^|\\D)${n}(\\D|$)`).test(factsDigits))) return null;
    // Garde-fou n° 2 : la réponse doit reprendre les mots d'au moins une fiche ; on retrouve les fiches utilisées si l'IA ne les cite pas
    const toks = (x) => new Set(x.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[^a-z0-9]+/).filter((w) => w.length > 3));
    const qw = toks(question);
    const tw = new Set([...toks(text)].filter((w) => !qw.has(w))); // les mots repris de la question ne prouvent rien
    const overlap = entries.map((e) => { const ew = toks(`${e.q} ${e.a}`); let k = 0; tw.forEach((w) => { if (ew.has(w)) k++; }); return k / Math.max(1, tw.size); });
    if (!used.length) used = overlap.map((o, i) => [o, i]).filter(([o]) => o >= 0.4).sort((a, b) => b[0] - a[0]).slice(0, 2).map(([, i]) => i);
    if (tw.size < 3 || !used.length || Math.max(...used.map((i) => overlap[i])) < 0.4) return null; // trop loin des fiches : on ne fait pas confiance
    return { text, used: [...new Set(used)] };
  } catch (err) { console.warn('Réponse IA impossible :', err); return null; }
}
