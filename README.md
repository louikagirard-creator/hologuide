# HoloGuide v2 — borne holographique uOttawa × INNOVA

Projet GNG1503, équipe AVENGERS (AF23). Version refaite de zéro. Site statique (HTML, CSS, JavaScript), sans serveur, sans compte et sans dépendance réseau, pensé pour la boîte holographique (Windows 11, écran tactile vertical, micro, haut-parleurs). Le fond est noir parce que la boîte rend le noir transparent : seul Gee-Gee « flotte ».

## Lancer
- Sur un ordinateur : `python3 -m http.server 5179` dans ce dossier, puis ouvrir http://localhost:5179.
- Sur la borne : Edge en mode kiosque, par exemple `msedge --kiosk http://localhost:5179 --edge-kiosk-type=fullscreen`. Edge a les voix « Natural » les plus humaines et donne le minutage de chaque mot, ce qui synchronise le mieux la bouche de Gee-Gee.
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
| Seulement de l'information officielle | 85 réponses tirées des pages uOttawa, source et date de vérification affichées |
| Si pas de réponse : s'excuser et guider | Excuse, renvoi vers InfoService et suggestions proches |
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
Cheval de dessin animé aux couleurs uOttawa (grenat et gris), maillot « GG », construit entièrement en code avec three.js (`js/mascot.js`), donc rien à télécharger. Il parle syllabe par syllabe selon les voyelles, cligne des yeux, bouge les oreilles et les sourcils, tourne la tête vers l'endroit touché, salue, hausse les épaules quand il n'a pas de réponse, lève le sabot quand on le remercie, saute de joie quand il répond et s'anime tout seul au repos. Des particules lumineuses donnent un effet de projection.
Design original inspiré des Gee-Gees : pour utiliser le logo ou la mascotte officielle, il faut l'accord de l'Université.

## Fichiers
- `index.html`, `css/style.css` : la page et son style.
- `js/app.js` : le déroulement de la borne (écrans, conversation, QR, inactivité, indicateurs).
- `js/search.js` : la recherche de réponses (mots-clés, tolérance aux fautes, santé mentale, salutations).
- `js/speech.js` : la voix et le micro (API Web Speech du navigateur).
- `js/mascot.js` : Gee-Gee en 3D.
- `js/i18n.js` : tous les textes en FR et EN, liens de secours, ordre des sujets par profil.
- `data/kb.js` : la base de réponses officielles (à enrichir pour ajouter des sujets).
- `assets/plans/` : plans officiels des pavillons.
- `vendor/three/` (three.js, licence MIT) et `vendor/qrcode.js` (licence MIT) : servis en local.
- `tests.html`, `tests/` : questions types et réponse attendue.
