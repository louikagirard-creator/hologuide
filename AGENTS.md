# HoloGuide — instructions pour les agents (Freebuff, Claude Code, etc.)

Projet d'équipe GNG1503 : guide d'information de l'Université d'Ottawa pour la **boîte Holotech d'INNOVA**.
Site statique (HTML, CSS, JavaScript), publié sur GitHub Pages : https://louikagirard-creator.github.io/hologuide/
Dépôt : https://github.com/louikagirard-creator/hologuide — toute l'équipe y travaille.

## Règle n° 1 : chaque modification va sur GitHub
L'équipe doit voir le travail des autres. À chaque demande de modification :
1. **Avant de commencer** : `git pull --rebase` pour récupérer les modifications des coéquipiers.
2. Faire la modification demandée, puis lancer les tests : `node tests/search.test.mjs` et `node tests/ai.test.mjs` (tout doit réussir).
   - Si on touche à la recherche (`js/search.js`) ou à la base : `node tests/essais.mjs` (banc de 1000 questions réalistes, avec fautes, anglais, bavardage et charabia). Le score ne doit pas baisser (77,7 % au 23 novembre 2026) ; `--erreurs` liste chaque erreur.
3. **Tout de suite après** : `git add -A`, `git commit -m "<prénom> : <ce qui a changé, en français>"`, puis `git push`.
   - Si `git push` est refusé parce qu'un coéquipier a publié entre-temps : `git pull --rebase`, régler les conflits s'il y en a, relancer les tests, puis `git push`.
   - Ne jamais utiliser `git push --force`. Ne jamais publier de secret (`.env`, clé API, mot de passe).
4. Le site en ligne se met à jour tout seul environ une minute après le `push`.

On voit tout l'historique de l'équipe ici : https://github.com/louikagirard-creator/hologuide/commits/main

## Mise en page à respecter
- Fond **blanc**. Deux colonnes : Gee-Gee debout à **gauche**, sur toute la hauteur ; l'interface à **droite**.
- Boutons **en bas** (maquette d'arrangement 2) : « Touche et parle » + Écrire, puis Langue, Historique, Paramètres, Terminer.
- Texte **noir et bien gras** (jamais de gris pâle), une seule police sans empattements, cartes douces `#f4f2ee` arrondies, un seul accent grenat `#8f001a`.
- Icônes : uniquement le jeu d'icônes au trait du sprite SVG d'`index.html`. Pas d'émoji ni d'effets « verre » ou de dégradés.
- Les réglages (taille, contraste, voix, police…) sont dans le bouton **Paramètres** et reviennent par défaut pour chaque nouvelle personne.
- Tout le texte existe en **français et en anglais** (`js/i18n.js`). Le français tutoie.

## Base de réponses (`data/kb.js`)
- **Seulement de l'information officielle** de uottawa.ca (ou SÉUO, GSAÉD, Gee-Gees), avec la page source dans `sources`. Ne jamais inventer d'heures, de prix ni de dates.
- Pas de conseils en santé mentale : `js/search.js` redirige ces questions vers le Centre de santé et de bien-être, et vers le 911 en cas d'urgence.
- Pour ajouter des réponses : écrire un fichier JSON dans `data/new/` (voir le format dans `tools/merge-kb.mjs`), puis `node tools/merge-kb.mjs --write`.
- Ajouter une question type dans `tests/cases.js` pour chaque nouveau sujet important.

## Fichiers
- `index.html`, `css/style.css` : la page et son style.
- `js/app.js` : déroulement (veille, accueil, conversation, fin avec code QR, inactivité, indicateurs).
- `js/search.js` : recherche locale (mots-clés, rareté des mots, fautes de frappe, pluriels).
- `js/speech.js` : voix et micro (Web Speech). `js/mascot.js` : Gee-Gee en 3D (three.js, dans `vendor/`).
- Gee-Gee en vidéo (vrai costume) : clips dans `assets/video/`, liste dans `CLIPS` (`js/avatar-video.js`) ; guide de tournage dans le README.
- Vrai modèle 3D : déposer un `.glb` dans `assets/` et mettre son chemin dans `MODEL_URL` (`js/mascot.js`).
- `js/face.js` : paupières, bouche, iris qui suit le regard et oreilles de `assets/geegee.glb` (repérées dans le modèle, voir `FACE`). Si on remplace le `.glb`, il faut remesurer ces zones.

## Tester en local
`python3 -m http.server 5179` dans ce dossier, puis ouvrir http://localhost:5179 (format de la boîte : écran vertical, par exemple 1080×1920).

## IA
- `js/ai.js` : IA en ligne via le relais `worker/` si `AI_ENDPOINT` est rempli (guide : `worker/README.md`), sinon IA dans le navigateur (désactivée par défaut).
- **Ne jamais mettre de clé API dans le site ni dans le dépôt** : elle va seulement dans les secrets Cloudflare du relais.
