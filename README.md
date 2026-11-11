# HoloGuide — borne holographique uOttawa × INNOVA

Projet GNG1503, équipe AVENGERS (AF23). Site statique (HTML, CSS, JS) sans serveur ni compte, pensé pour la boîte holographique Holopro (Windows 11, écran tactile, micro, haut-parleurs). Le fond est noir parce que la boîte rend le noir transparent : seul l'avatar « flotte ».

## En ligne
- Site : https://louikagirard-creator.github.io/hologuide/ (GitHub Pages, branche `main`).
- Mettre à jour : `git add -A && git commit -m "..." && git push` dans ce dossier ; le site se met à jour en 1 à 2 minutes.

## Lancer
- Sur un ordinateur : `python3 -m http.server 5178` dans ce dossier, puis ouvrir http://localhost:5178.
- Sur la borne : Chrome ou Edge en mode kiosque, par exemple `msedge --kiosk http://localhost:5178 --edge-kiosk-type=fullscreen`.
- La voix et le micro utilisent l'API Web Speech du navigateur. **Utiliser Edge sur la borne** : ses voix « Natural » (ex. Sylvie, Antoine en fr-CA) sont les plus humaines et envoient le minutage de chaque mot, ce qui donne la meilleure synchronisation des lèvres. Le site les choisit automatiquement.
- Le site doit être servi par un serveur (pas en double-cliquant sur `index.html`), sinon le navigateur bloque le chargement des modèles 3D.

## Exigences du client couvertes
| Demande (rencontres client) | Dans le site |
|---|---|
| Bilinguisme (priorité 1) | Tout le site et toutes les réponses en FR et EN, bouton de changement de langue |
| Vitesse de réponse (priorité 1) | Recherche locale instantanée, temps affiché sous chaque réponse |
| Parler avec l'avatar, avatar humain réaliste qui bouge | Humain 3D réaliste (three.js + TalkingHead) : lèvres synchronisées mot par mot sur la voix, clignements, regard vers la personne, gestes des mains, salut, haussement d'épaules si pas de réponse |
| Choix de l'avatar | 3 guides 3D au choix : la mascotte Gee-Gee (par défaut), Maya et Alex, chacun avec sa voix |
| Mascotte des Gee-Gees | Cheval 3D animé aux couleurs uOttawa (grenat et gris) : bouche synchronisée sur la voix, clignements, oreilles qui bougent, regard, salut du sabot, haussement d'épaules, sabot levé, petit saut de joie |
| Code QR (trace de ce que l'avatar a dit) | À la fin : QR avec les questions et les liens officiels |
| Seulement de l'info officielle | 85 réponses tirées des pages uOttawa, source et date de vérification affichées |
| Si pas de réponse : s'excuser et guider | Message d'excuse et renvoi vers InfoService |
| Santé mentale exclue | Redirection vers le Centre de santé et de bien-être, et le 911 en cas d'urgence |
| Accessibilité : sous-titres, transcription, voix | Sous-titres, transcription complète, taille du texte, contraste élevé, voix activable |
| Écran tactile (si trop bruyant) et menu | Sujets et questions fréquentes en boutons tactiles |
| Profil (étudiant, employé, public) | Choix au départ ; adapte l'accueil et l'ordre des sujets |
| Écran de veille si inactif, pop-up d'inactivité | Pop-up après 45 s, puis fin de session et écran de veille |
| Session de 3 minutes environ | Rappel doux après 3 minutes |
| Aucune donnée personnelle | Rien n'est demandé ; la conversation est effacée à la fin |
| Indicateurs de succès (achalandage, questions, QR) | Tableau de bord : 5 touches sur « HoloGuide » ou Maj+A |

## Fichiers
- `index.html`, `styles.css`, `app.js` : l'application.
- `avatar3d.js` : l'avatar 3D (chargement du modèle, lèvres, gestes). Sans WebGL, le site garde un avatar dessiné en secours.
- `mascot.js` : la mascotte Gee-Gee, entièrement construite en code avec three.js (aucun modèle à télécharger). Design original inspiré des Gee-Gees ; pour utiliser le logo ou la mascotte officielle, demander l'accord de l'Université (Service des sports / image de marque). `assets/portrait-geegee.jpg` : sa vignette.
- `avatars/` : modèles 3D (`maya.glb` créé avec Avaturn, `alex.glb` avec AvatarSDK ; exemples du projet TalkingHead, usage non commercial). `assets/portrait-*.jpg` : vignettes de choix.
- `vendor/three/` (three.js 0.186, MIT) et `vendor/talkinghead/` (TalkingHead 1.8.2, MIT) : servis en local, la borne n'a pas besoin d'Internet pour l'avatar.
- `kb.js` : la base de réponses (catégories et réponses FR/EN avec sources). À enrichir pour ajouter des sujets.
- `assets/` : plans officiels des pavillons. `vendor/qrcode.js` : générateur de QR (licence MIT).
- `test.html` : vérifie que les questions types trouvent la bonne réponse.

## Prochaines étapes (après le prototype, selon le client)
- Avatar à l'image d'une vraie personne : créer un modèle à partir d'une photo (Avaturn), l'exporter en GLB avec les formes ARKit + Oculus visemes, puis le déposer dans `avatars/` et l'ajouter dans `avatar3d.js`.
- Voix de synthèse premium (Azure, ElevenLabs) pour une voix encore plus naturelle : TalkingHead accepte l'audio et le minutage des mots.
- Base de données alimentée par les services et facultés.
