# Activer l'IA en ligne de Gee-Gee (gratuit, environ 15 minutes)

Le site est déjà prêt : il ne manque qu'une **clé gratuite** et le **relais** qui la garde secrète.
Une seule personne de l'équipe fait ces étapes. **Ne jamais mettre la clé dans le site, sur GitHub, dans Discord ou dans un message.**

## Pourquoi un relais ?
Le site est public (GitHub Pages) : une clé mise dedans serait volée en quelques minutes. Le relais (un petit programme gratuit sur Cloudflare) garde la clé, reçoit la question et les fiches officielles, appelle l'IA et renvoie seulement le texte. Il n'accepte que les demandes venant du site HoloGuide.

## Étape 1 — Créer la clé gratuite (choisir UNE option)

**Option A — Groq (recommandé : rapide, sans carte de crédit)**
1. Aller sur https://console.groq.com et créer un compte.
2. Menu **API Keys** → **Create API Key** → nom : `hologuide`.
3. Copier la clé (elle commence par `gsk_`) et la garder pour l'étape 3. Elle ne s'affiche qu'une fois.

**Option B — Google Gemini**
1. Aller sur https://aistudio.google.com/apikey avec un compte Google.
2. **Create API key** → copier la clé.
3. Dans `worker/wrangler.toml`, remplacer `PROVIDER = "groq"` par `PROVIDER = "gemini"`.

Lisez les conditions de l'offre gratuite au moment de l'inscription : certaines offres gratuites (par exemple celle de Gemini) peuvent utiliser les demandes pour améliorer leurs produits. HoloGuide n'envoie que la question et les fiches officielles, jamais de donnée personnelle.

## Étape 2 — Créer un compte Cloudflare (gratuit)
https://dash.cloudflare.com/sign-up — aucune carte de crédit nécessaire pour Workers.

## Étape 3 — Déployer le relais

**Avec le terminal** (il faut Node.js) :
```bash
cd worker
npx wrangler login
npx wrangler secret put GROQ_API_KEY
npx wrangler deploy
```
- `wrangler login` ouvre le navigateur pour se connecter à Cloudflare.
- `secret put` demande la clé : la coller puis Entrée (avec Gemini : `npx wrangler secret put GEMINI_API_KEY`).
- `deploy` affiche l'adresse du relais, par exemple `https://hologuide-ia.votre-nom.workers.dev`. La copier.

**Sans terminal** (tableau de bord Cloudflare) :
1. **Workers & Pages** → **Create** → **Create Worker** → nom `hologuide-ia` → **Deploy**.
2. **Edit code** : remplacer tout le code par le contenu de `worker/index.js` → **Deploy**.
3. **Settings** → **Variables and Secrets** :
   - variable `PROVIDER` = `groq` (ou `gemini`) ;
   - variable `ALLOWED_ORIGIN` = `https://louikagirard-creator.github.io` ;
   - **secret** `GROQ_API_KEY` (ou `GEMINI_API_KEY`) = la clé.
4. Copier l'adresse du worker affichée en haut.

## Étape 4 — Vérifier que le relais répond
```bash
curl -s -X POST https://hologuide-ia.votre-nom.workers.dev -H "Origin: http://localhost:5179" -H "Content-Type: application/json" -d '{"question":"où manger ?","lang":"fr","facts":[{"q":"Où manger ?","a":"Il y a des cafés au Centre universitaire et au CRX."}]}'
```
Réponse attendue : `{"text":"… [1]"}`. Si vous voyez `Service IA indisponible`, la clé ou le nom du modèle est en cause (voir plus bas).

## Étape 5 — Brancher le site
Dans `js/ai.js`, remplacer `export const AI_ENDPOINT = '';` par l'adresse du relais, par exemple :
`export const AI_ENDPOINT = 'https://hologuide-ia.votre-nom.workers.dev';`

Puis lancer les tests (`node tests/search.test.mjs` et `node tests/ai.test.mjs`), faire `git commit` et `git push` (règle n° 1 d'`AGENTS.md`). Le site en ligne utilise l'IA environ une minute plus tard.

## Comment l'IA est utilisée
- La réponse officielle s'affiche **tout de suite**. L'IA intervient seulement quand la recherche hésite, en arrière-plan, et ajoute un encadré « Résumé par l'IA » si sa réponse passe les garde-fous : elle doit citer ses fiches, chaque nombre (local, heure, prix…) doit exister dans les fiches, et la réponse doit reprendre leur contenu.
- Avec le relais configuré, l'IA est activée par défaut ; on peut la couper dans **Paramètres › Réponses intelligentes**.
- Si le relais est en panne ou lent (plus de 9 s), le site répond comme avant : la borne ne bloque jamais.

## Problèmes fréquents
- **403 Origine non autorisée** : `ALLOWED_ORIGIN` doit être exactement `https://louikagirard-creator.github.io` (sans `/hologuide`).
- **502 Service IA indisponible** : clé mal collée, quota gratuit dépassé, ou modèle retiré par le fournisseur. Dans ce dernier cas, ajouter une variable `MODEL` avec un modèle actuel (liste sur la page du fournisseur), puis redéployer.
- **429 Trop de demandes** : limite de 20 questions par minute et par appareil, pour protéger le quota gratuit.
