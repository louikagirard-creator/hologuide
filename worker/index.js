// Relais HoloGuide → IA en ligne gratuite (Groq ou Google Gemini), à déployer sur Cloudflare Workers (gratuit).
// La clé API reste ici, dans les « secrets » Cloudflare : elle n'est jamais dans le site ni sur GitHub.
// Le site envoie seulement la question et les fiches officielles trouvées ; le relais renvoie le texte de l'IA.
// Aucune donnée personnelle n'est demandée, enregistrée ou journalisée.
//
// Variables (wrangler.toml / tableau de bord Cloudflare) :
//   PROVIDER      "groq" (par défaut) ou "gemini"
//   MODEL         facultatif ; par défaut llama-3.3-70b-versatile (Groq) ou gemini-2.5-flash (Gemini)
//   ALLOWED_ORIGIN  adresse du site autorisé, ex. https://louikagirard-creator.github.io
// Secrets (wrangler secret put …) :
//   GROQ_API_KEY ou GEMINI_API_KEY

const LIMITS = { question: 300, facts: 6, factChars: 1200, perMinute: 20 };
const hits = new Map(); // limite simple par adresse IP (mémoire du worker, remise à zéro souvent)

const SYSTEM = {
  fr: "Tu es Gee-Gee, la mascotte de l'Université d'Ottawa, dans une borne d'information. Réponds en français, en tutoyant, en 1 à 3 phrases courtes et chaleureuses. Commence par la réponse précise à la QUESTION : le lieu, l'heure, le prix, la date ou la démarche demandés, avec le chiffre exact des FICHES. Ne récite pas les fiches, ne répète pas la question et ne donne pas de détail qui n'aide pas à y répondre. Utilise UNIQUEMENT les informations des FICHES fournies : n'invente aucun lieu, heure, prix, date, nom ni numéro. Si les fiches ne permettent pas de répondre à la question, réponds exactement : JE_NE_SAIS_PAS. Pas de liens, pas de listes, pas de markdown. Termine par les numéros des fiches utilisées entre crochets, par exemple [1] ou [1][3].",
  en: "You are Gee-Gee, the University of Ottawa mascot, in an information kiosk. Answer in English, in 1 to 3 short, warm sentences. Start with the precise answer to the QUESTION: the place, time, price, date or step asked for, with the exact figure from the FACT SHEETS. Do not recite the sheets, do not repeat the question, and leave out details that do not help answer it. Use ONLY the information in the provided FACT SHEETS: never invent a place, time, price, date, name or number. If the sheets do not answer the question, reply exactly: JE_NE_SAIS_PAS. No links, no lists, no markdown. End with the numbers of the sheets you used in brackets, e.g. [1] or [1][3]."
};

function cors(env, origin) {
  const allowed = env.ALLOWED_ORIGIN || 'https://louikagirard-creator.github.io';
  const ok = origin === allowed || /^http:\/\/localhost(:\d+)?$/.test(origin || ''); // localhost pour les tests de l'équipe
  return { 'Access-Control-Allow-Origin': ok ? origin : allowed, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', Vary: 'Origin' };
}
const json = (data, status, headers) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...headers } });

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const headers = cors(env, origin);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST') return json({ error: 'POST seulement' }, 405, headers);
    if (headers['Access-Control-Allow-Origin'] !== origin) return json({ error: 'Origine non autorisée' }, 403, headers);

    // Limite d'usage (protège le quota gratuit)
    const ip = request.headers.get('CF-Connecting-IP') || 'local';
    const now = Date.now(), recent = (hits.get(ip) || []).filter((t) => now - t < 60000);
    if (recent.length >= LIMITS.perMinute) return json({ error: 'Trop de demandes, réessaie dans une minute' }, 429, headers);
    hits.set(ip, [...recent, now]);

    // Entrée : { question, lang: "fr"|"en", facts: [{ q, a }] } — tronquée pour rester dans les limites gratuites
    let body;
    try { body = await request.json(); } catch { return json({ error: 'JSON invalide' }, 400, headers); }
    const lang = body.lang === 'en' ? 'en' : 'fr';
    const question = String(body.question || '').slice(0, LIMITS.question).trim();
    const facts = (Array.isArray(body.facts) ? body.facts : []).slice(0, LIMITS.facts)
      .map((f, i) => `[${i + 1}] ${String(f.q || '').slice(0, 200)}\n${String(f.a || '').slice(0, LIMITS.factChars)}`);
    if (!question || !facts.length) return json({ error: 'Question ou fiches manquantes' }, 400, headers);
    const user = `${lang === 'fr' ? 'FICHES' : 'FACT SHEETS'} :\n${facts.join('\n\n')}\n\nQUESTION : ${question}`;

    try {
      const text = (env.PROVIDER || 'groq') === 'gemini' ? await gemini(env, SYSTEM[lang], user) : await groq(env, SYSTEM[lang], user);
      return json({ text: text.trim() }, 200, headers);
    } catch (err) {
      return json({ error: 'Service IA indisponible' }, 502, headers); // le site revient à la réponse habituelle
    }
  }
};

async function groq(env, system, user) {
  if (!env.GROQ_API_KEY) throw new Error('GROQ_API_KEY manquante');
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: env.MODEL || 'llama-3.3-70b-versatile', temperature: 0.2, max_tokens: 220,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }] })
  });
  if (!r.ok) throw new Error(`Groq ${r.status}`);
  const d = await r.json();
  return d.choices?.[0]?.message?.content || '';
}

async function gemini(env, system, user) {
  if (!env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY manquante');
  const model = env.MODEL || 'gemini-2.5-flash';
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': env.GEMINI_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 220 } })
  });
  if (!r.ok) throw new Error(`Gemini ${r.status}`);
  const d = await r.json();
  return d.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
}
