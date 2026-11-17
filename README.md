# HoloGuide — boîte Holotech d'INNOVA (uOttawa)

Projet GNG1503, équipe AVENGERS (AF23). Version refaite de zéro. Site statique (HTML, CSS, JavaScript), sans serveur, sans compte et sans dépendance réseau, pensé pour la **boîte Holotech d'INNOVA** (Windows 11, écran tactile vertical, micro, haut-parleurs). Le fond est blanc.

**Mise en page** : Gee-Gee est debout dans la colonne de gauche, en pied, de la tête aux souliers, sur toute la hauteur de la boîte, comme s'il était vraiment dedans. L'interface occupe la colonne de droite et ne passe jamais devant lui. Sur un écran à l'horizontale, les colonnes s'ajustent ; sur un téléphone (tests), Gee-Gee passe au-dessus.

## Travailler en équipe
Chaque modification est publiée sur GitHub tout de suite (`git pull --rebase` avant, `git commit` puis `git push` après). Les règles sont dans `AGENTS.md`, que Freebuff lit automatiquement.
Historique des modifications de l'équipe : https://github.com/louikagirard-creator/hologuide/commits/main

## Lancer
- Sur un ordinateur : `python3 -m http.server 5179` dans ce dossier, puis ouvrir http://localhost:5179.
- Dans la boîte Holotech : Edge en mode kiosque, par exemple `msedge --kiosk http://localhost:5179 --edge-kiosk-type=fullscreen`. Edge a les voix « Natural » les plus humaines et donne le minutage de chaque mot, ce qui synchronise le mieux la bouche de Gee-Gee.
- Le site doit être servi par un serveur (pas en double-cliquant `index.html`), sinon le navigateur bloque les modules JavaScript.
- Tests de la recherche : ouvrir `tests.html`, ou `node tests/search.test.mjs`.

## Parcours
1. **Veille** : Gee-Gee salue et des conseils défilent en français et en anglais. On touche l'écran pour commencer.
2. **Accueil** : choix de la langue et du profil (étudiant·e, employé·e / prof, visiteur·euse). Aucune donnée personnelle.
3. **Conversation** : question écrite, à la voix ou en touchant une tuile de sujet. Une seule réponse à l'écran à la fois : le texte s'illumine mot par mot pendant que Gee-Gee parle (il sert de sous-titre), avec le plan du pavillon si utile, la source officielle, la date de vérification et les questions liées. Les échanges précédents sont dans l'**historique** (bouton horloge).
4. **Fin** : code QR avec les questions posées et les liens officiels, puis note de satisfaction. Retour à la veille après 30 s.

## Exigences du client couvertes
| Demande | Dans le site |
|---|---|
| Bilinguisme (priorité 1) | Toute l'interface et toutes les réponses en FR et EN, bouton de langue |
| Vitesse de réponse (priorité 1) | Recherche locale instantanée, temps affiché sous chaque réponse |
| Parler avec un avatar animé | Gee-Gee, mascotte 3D : bouche synchronisée mot par mot, clignements, regard, oreilles, gestes |
| Seulement de l'information officielle | 2 125 fiches tirées des pages officielles (uOttawa, catalogue, SÉUO, Gee-Gees), source et date de vérification affichées, plus un index de 36 032 pages officielles (`data/links.json`) quand aucune fiche ne répond |
| Si pas de réponse : s'excuser et guider | Pages officielles les plus proches (avec code QR), renvoi vers InfoService et suggestions proches |
| Santé mentale exclue | Redirection vers le Centre de santé et de bien-être, et le 911 en cas d'urgence |
| Accessibilité | Texte surligné mot par mot (sous-titres), historique complet, réécoute, taille du texte (bouton Aa), contraste élevé, voix activable, navigation au clavier |
| Écran tactile si trop bruyant | Sujets et questions en boutons tactiles |
| Profil | Adapte l'accueil et l'ordre des sujets |
| Inactivité | Fenêtre « Es-tu encore là ? » après 45 s, puis fin de session et retour à la veille |
| Session d'environ 3 minutes | Rappel doux après 3 minutes |
| Code QR | Trace des questions et des liens officiels, sans rien de personnel |
| Aucune donnée personnelle | Rien n'est demandé ; tout est effacé à la fin de la session |
| Indicateurs de succès | Tableau de bord : 5 touches sur « HoloGuide » ou Maj+A (sessions, questions, sans réponse, QR, avis, satisfaction, questions fréquentes) |

## Gee-Gee
Cheval aux couleurs uOttawa (grenat et gris), en pied : maillot « GG », short gris à bande blanche, bas grenat rayés, souliers de mascotte et queue qui se balance. Il est construit entièrement en code avec three.js (`js/mascot.js`), donc rien à télécharger. Il parle syllabe par syllabe selon les voyelles, cligne des yeux, bouge les oreilles et les sourcils, tourne la tête vers l'endroit touché, salue, hausse les épaules quand il n'a pas de réponse, lève le sabot quand on le remercie, saute de joie quand il répond et s'anime tout seul au repos. Rendu : matières peluche et tissu (reflet satiné), ombres douces, lumière venant du plafond de la boîte et contre-jours qui détachent la silhouette du noir. Le haut du corps se balance pendant que les pieds restent au sol.
### Gee-Gee en vidéo (le vrai costume) — option choisie par l'équipe
Le plus réaliste : filmer quelqu'un dans le costume de Gee-Gee. Le site enchaîne les clips en fondu : repos en boucle, « parle » pendant la voix, salut, etc.

**Tournage**
- Téléphone **à la verticale**, sur trépied, qui ne bouge jamais d'un clip à l'autre. 1080×1920, 30 images/s.
- **Mur blanc** derrière, bien éclairé de face, sans ombre sur le mur (deux lampes à 45°, pas de contre-jour). Le fond du site est blanc : le mur doit être le plus blanc possible.
- Gee-Gee **en entier, des oreilles aux pieds**, avec un peu de marge en haut. Les pieds restent au même endroit dans tous les clips.
- Chaque clip **commence et finit dans la même pose de repos** (bras le long du corps, de face), pour que les fondus ne se voient pas.
- Gee-Gee est à gauche de l'écran : quand il montre quelque chose, il le montre **vers sa gauche à lui** (la droite de l'image), là où sont les réponses.

**Clips à filmer** (sans son)
| Fichier | Durée | Ce que fait Gee-Gee |
|---|---|---|
| `idle.mp4` (obligatoire) | 10–15 s | Au repos : respire, bouge un peu la tête, regarde autour. Doit boucler sans saut. |
| `talk.mp4` | 10–15 s | Fait des gestes comme s'il expliquait quelque chose, hoche la tête. Boucle pendant qu'il parle. |
| `wave.mp4` | 3 s | Salue de la main. |
| `point.mp4` | 3 s | Montre l'écran à côté de lui (la réponse). |
| `shrug.mp4` | 3 s | Hausse les épaules (« je ne sais pas »). |
| `thumbs.mp4` | 2 s | Pouce en l'air (« merci »). |

**Installation** : couper et exporter en MP4 (H.264), sans son, idéalement moins de 5 Mo par clip ; les mettre dans `assets/video/` ; dans `js/avatar-video.js`, remplacer `export const CLIPS = null;` par la liste des fichiers (l'exemple est juste en dessous dans le fichier). Seul `idle` est obligatoire.

### Remplacer Gee-Gee par un vrai modèle 3D
1. Obtenir un fichier `.glb` de la mascotte, debout, de face (modélisé dans Blender, acheté, ou généré avec un outil d'IA 3D comme Meshy ou Tripo à partir d'une photo de Gee-Gee). Idéalement avec un squelette et des animations nommées `idle` (repos) et `wave` (salut).
2. Le déposer dans `assets/`, par exemple `assets/geegee.glb`.
3. Dans `js/mascot.js`, remplacer `const MODEL_URL = null;` par `const MODEL_URL = 'assets/geegee.glb';`.

Le modèle est automatiquement mis à l'échelle de la boîte (de la tête aux pieds) et posé au sol. Il joue son animation de repos, salue avec l'animation `wave` et hoche la tête quand il parle. Si le fichier ne se charge pas, le Gee-Gee fait en code s'affiche à la place.

Design original inspiré des Gee-Gees : pour utiliser le logo ou la mascotte officielle, il faut l'accord de l'Université.

## IA gratuite dans la borne (expérimentale, désactivée par défaut)
`js/ai.js` : WebLLM + modèle Qwen 2.5 1.5B, qui tourne dans le navigateur (WebGPU) : gratuit, sans clé, rien n'est envoyé ailleurs. Le modèle (~1 Go) se télécharge une seule fois. À activer dans **Paramètres › Réponses intelligentes**.
- L'IA ne sert que quand la recherche hésite, et seulement en arrière-plan : la réponse officielle s'affiche tout de suite, puis un encadré « Résumé par l'IA » s'ajoute si la réponse passe les garde-fous.
- Garde-fous : elle doit citer ses fiches ; chaque nombre (local, heure, prix…) doit exister dans les fiches ; la réponse doit reprendre le contenu des fiches ; les refus et hésitations sont rejetés.
- Limite constatée aux tests : un petit modèle gratuit se trompe souvent de sujet.
- **IA en ligne (meilleure qualité)** : le relais Cloudflare est prêt dans `worker/` (Groq ou Gemini, offres gratuites). Guide pas à pas : `worker/README.md`. Une fois l'adresse du relais collée dans `AI_ENDPOINT` (`js/ai.js`), l'IA en ligne remplace l'IA du navigateur et s'active par défaut.

## Fichiers
- `index.html`, `css/style.css` : la page (deux colonnes : Gee-Gee à gauche, interface à droite) et son style sobre (titres à empattements, filets fins, accent grenat).
- `js/app.js` : le déroulement dans la boîte (écrans, conversation, QR, inactivité, indicateurs).
- `js/search.js` : la recherche de réponses (mots-clés, tolérance aux fautes, santé mentale, salutations).
- `js/speech.js` : la voix et le micro (API Web Speech du navigateur).
- `js/mascot.js` : Gee-Gee en 3D.
- `js/i18n.js` : tous les textes en FR et EN, liens de secours, ordre des sujets par profil.
- `data/kb.js` : la base de réponses officielles (à enrichir pour ajouter des sujets).
- `assets/plans/` : plans officiels des pavillons.
- `vendor/three/` (three.js, licence MIT) et `vendor/qrcode.js` (licence MIT) : servis en local.
- `tests.html`, `tests/` : questions types et réponse attendue.
