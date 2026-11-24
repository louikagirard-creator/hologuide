// Tous les textes de l'interface, en français et en anglais (le bilinguisme est la priorité n° 1 du client).
export const TEXT = {
  fr: {
    rate0: 'Bof', rate1: 'Correct', rate2: 'Super',
    homeTitle: 'Comment je peux t\'aider ?', noneLinks: 'Je n\'ai pas de fiche détaillée là-dessus, mais voici les pages officielles de l\'Université qui en parlent. Touche une page pour l\'ouvrir sur ton téléphone.', officialPages: 'Pages officielles sur ce sujet', morePages: 'Pour aller plus loin (pages officielles)', scanToOpen: 'Scanne ce code avec ton téléphone pour ouvrir la page officielle.', setVolume: 'Volume de la voix', setFont: 'Police', setSpacing: 'Espacement du texte', setQr: 'Code QR sous chaque réponse', setTime: 'Temps avant la fin de session', optLow: 'Bas', optMedium: 'Moyen', optLoud: 'Fort', optStandard: 'Standard', optLegible: 'Très lisible', optWide: 'Aéré', optMoreTime: 'Plus de temps', takeAway: 'Emporte cette réponse', takeAwaySub: 'Scanne avec ton téléphone : la réponse, le lien officiel et l\'itinéraire.', setAI: 'Réponses intelligentes (IA)', aiOnline: 'IA en ligne active : ta question et les fiches officielles sont envoyées au service d\'IA (rien de personnel).', aiThinking: 'L\'IA de Gee-Gee prépare un résumé…', aiBadge: 'Résumé par l\'IA de la borne, à partir de ces fiches officielles :', aiNoGpu: 'Cet ordinateur n\'a pas de carte graphique compatible : réponses habituelles seulement.', aiOff: 'Désactivées.', aiLoading: 'Préparation de l\'IA : {p} % (une seule fois).', aiReady: 'Prête : utilisée quand la recherche hésite, jamais pour inventer.', aiError: 'IA indisponible pour l\'instant : réponses habituelles.', talk: 'Touche et parle', type: 'Écrire', otherLang: 'English', ok: 'OK', settings: 'Paramètres', resetSettings: 'Réinitialiser', setLang: 'Langue', setSize: 'Taille du texte', setContrast: 'Contraste', setVoice: 'Voix de Gee-Gee', setSpeed: 'Vitesse de la voix', setHighlight: 'Mots surlignés pendant la lecture', setMascot: 'Gee-Gee', optMascotReal: 'Réaliste', optMascotHorse: 'Cheval', optMascotCartoon: 'Dessin', setMotion: 'Animations', optNormal: 'Normal', optNormalF: 'Normales', optHigh: 'Élevé', optOn: 'Activée', optOff: 'Coupée', optSlow: 'Lente', optFast: 'Rapide', optYes: 'Oui', optNo: 'Non', optReduced: 'Réduites', directions: 'Itinéraire depuis ici', walk: '{m} m · {min} min à pied', hereAlready: 'Tu y es déjà !', enlargeMap: 'Agrandir la carte', floorPlan: 'Plan de l\'étage', campusMap: 'Carte du campus', tryAsk: 'Essaie : « Où est le pavillon Fauteux ? » ou « J\'ai perdu ma carte étudiante ».', popular: 'Sujets populaires', allTopics: 'Tous les sujets', back: 'Retour',
    history: 'Historique', historyEmpty: 'Tes questions apparaîtront ici.', youAsked: 'Ta question', relatedTitle: 'Questions liées',
    infoservice: 'Contacter InfoService', urgent: 'Urgence : 911', zoom: 'Agrandir le plan', listenAgain: 'Réécouter', touchStart: 'Touche pour commencer',
    attractTitle: 'Salut !\nJe suis Gee\u2011Gee.', attractSub: 'Touche l\'écran pour me poser une question.',
    tips: ['Je réponds en français et en anglais.', 'Parle-moi ou écris ta question.', 'Je te montre le plan des pavillons.', 'À la fin, garde tes réponses avec un code QR.'],
    welcome: 'Bienvenue !', chooseLang: 'Choisis ta langue', chooseProfile: 'Tu es…',
    profiles: { student: 'Étudiant·e', staff: 'Employé·e / prof', visitor: 'Visiteur·euse' }, go: 'C\'est parti !',
    greet: {
      student: 'Salut ! Je suis Gee-Gee, le guide du campus. Pose-moi ta question à l\'écrit ou à la voix, ou touche un sujet.',
      staff: 'Bonjour ! Je suis Gee-Gee. Je peux t\'aider avec les services, les pavillons et l\'informatique. Que cherches-tu ?',
      visitor: 'Bienvenue à l\'Université d\'Ottawa ! Je suis Gee-Gee. Je peux t\'orienter sur le campus. Que cherches-tu ?'
    },
    askPh: 'Écris ta question…', ask: 'Ta question', send: 'Envoyer', mic: 'Parler', listening: 'Je t\'écoute…', micError: 'Je n\'ai pas bien entendu. Réessaie ou écris ta question.',
    topics: 'Sujets', langBtn: 'EN', textDown: 'Texte plus petit', textUp: 'Taille du texte', contrast: 'Contraste élevé', voice: 'Voix', end: 'Terminer',
    sources: 'Source officielle', verified: 'vérifiée le', pointer: 'Pour les détails à jour, consulte la page officielle :', time: 'Réponse en {ms} ms',
    helpful: 'Cette réponse t\'aide ?', yes: 'Oui', no: 'Non', thanksFb: 'Merci pour ton avis !', related: 'Aussi :', topicIntro: 'Voici ce que je peux te dire sur « {cat} » :',
    hello: 'Salut ! Qu\'est-ce que je peux faire pour toi ?', thanks: 'Avec plaisir ! As-tu une autre question ?',
    // Bavardage (js/search.js, SMALLTALK) : une réponse est tirée au hasard dans chaque liste.
    st_bye: ['Bonne journée ! Touche « Terminer » quand tu as fini, ou pose-moi une autre question.', 'À la prochaine ! Bon succès dans ta session.'],
    st_howareyou: ['Ça va super bien, merci ! Je suis prêt à t\'aider. Qu\'est-ce que tu cherches sur le campus ?', 'Très bien ! Toujours content de jaser avec un Gee-Gee. Comment je peux t\'aider ?'],
    st_whoareyou: ['Je suis Gee-Gee, la mascotte de l\'Université d\'Ottawa, et le guide de cette borne. Je réponds à tes questions sur le campus, en français et en anglais, avec l\'information officielle de l\'Université.'],
    st_help: ['Tu peux me demander où est un pavillon, comment payer tes frais, les dates importantes, les services aux étudiants, l\'informatique, le logement et bien plus. Parle-moi ou écris ta question, ou touche un sujet.'],
    st_joke: ['Pourquoi les Gee-Gees sont toujours à l\'heure à leurs examens ? Parce qu\'ils ont un bon galop d\'avance !', 'Que dit un cheval qui a fini ses travaux ? Ouf, j\'ai enfin tout bouclé… à la crinière !', 'Mon cours préféré ? L\'histoire de l\'art… équestre, évidemment !'],
    st_compliment: ['Merci, ça me fait vraiment plaisir ! As-tu une autre question ?', 'Oh, merci ! Toi aussi, tu es super. Je peux t\'aider avec autre chose ?'],
    st_insult: ['Désolé si je n\'ai pas bien répondu. Essaie de reformuler ta question, ou touche un sujet : je vais faire de mon mieux.'],
    st_yesno: ['D\'accord ! As-tu une autre question ?', 'Parfait ! Je suis là si tu as besoin d\'autre chose.'],
    offtopic: 'Ça, c\'est en dehors de ce que je connais ! Je réponds aux questions sur l\'Université d\'Ottawa : les pavillons, les cours, les services, les dates importantes et la vie sur le campus.',
    unclear: 'Oups, je n\'ai pas compris. Peux-tu reformuler ta question ? Tu peux aussi toucher un sujet.',
    none: 'Désolé, je n\'ai pas d\'information officielle sur ce sujet. InfoService peut t\'aider : en personne, par téléphone ou en ligne.',
    didYouMean: 'Tu cherchais peut-être :',
    sensitive: 'Je ne suis pas la bonne ressource pour parler de santé mentale, mais tu n\'es pas seul·e. Le Centre de santé et de bien-être étudiant offre du soutien et du counselling. En cas d\'urgence, appelle le 911.',
    timeNotice: 'Ça fait déjà 3 minutes ! Prends ton temps, mais pense aux personnes qui attendent peut-être derrière toi.',
    idleTitle: 'Es-tu encore là ?', idleText: 'La session se termine dans {s} s.', stay: 'Je suis là',
    endTitle: 'Merci d\'avoir parlé avec moi !', qrText: 'Scanne ce code pour ouvrir le récapitulatif de ta conversation, avec les liens officiels.', noQr: 'Aucune question posée cette fois-ci.',
    qrOpen: 'Ouvrir le récapitulatif', qrPartial: 'Récapitulatif des {n} premières questions sur {total}.',
    rate: 'Comment était ton expérience ?', done: 'Terminer', closing: 'Retour à l\'accueil dans {s} s',
    privacy: 'Aucune donnée personnelle n\'est demandée ni conservée. Tout est effacé à la fin de la session.',
    recapTitle: 'Récapitulatif de ta conversation', recapSource: 'Pages officielles', recapSite: 'uOttawa.ca',
    recapLead: 'Tes {n} questions à Gee-Gee, avec les pages officielles de l\'Université d\'où viennent les réponses.',
    recapWhen: 'Session du {date}', recapPrint: 'Imprimer ou enregistrer en PDF', recapBack: 'Retour à HoloGuide',
    recapFooter: 'HoloGuide — boîte Holotech d\'INNOVA. Chaque réponse vient d\'une page officielle de l\'Université d\'Ottawa, listée sous la question.',
    recapEmpty: 'Ce lien ne contient aucune conversation. Pose une question à Gee-Gee à la borne, puis scanne le code QR affiché à la fin.',
    admin: 'Indicateurs de la boîte Holotech',
    stats: { sessions: 'Sessions', questions: 'Questions', unanswered: 'Sans réponse', qr: 'Codes QR', up: 'Réponses utiles', down: 'Réponses pas utiles', ratings: 'Satisfaction (bof / correct / super)', top: 'Questions fréquentes', profiles: 'Profils', langs: 'Langues' },
    close: 'Fermer', reset: 'Remettre à zéro'
  },
  en: {
    rate0: 'Meh', rate1: 'Okay', rate2: 'Great',
    homeTitle: 'How can I help you?', noneLinks: 'I don\'t have a detailed answer on that, but here are the official University pages about it. Touch a page to open it on your phone.', officialPages: 'Official pages on this topic', morePages: 'Learn more (official pages)', scanToOpen: 'Scan this code with your phone to open the official page.', setVolume: 'Voice volume', setFont: 'Font', setSpacing: 'Text spacing', setQr: 'QR code under each answer', setTime: 'Time before the session ends', optLow: 'Low', optMedium: 'Medium', optLoud: 'Loud', optStandard: 'Standard', optLegible: 'Extra legible', optWide: 'Wide', optMoreTime: 'More time', takeAway: 'Take this answer with you', takeAwaySub: 'Scan with your phone: the answer, the official link and the directions.', setAI: 'Smart answers (AI)', aiOnline: 'Online AI on: your question and the official fact sheets are sent to the AI service (nothing personal).', aiThinking: 'Gee-Gee\'s AI is preparing a summary…', aiBadge: 'Summary by the kiosk AI, from these official fact sheets:', aiNoGpu: 'This computer has no compatible graphics card: regular answers only.', aiOff: 'Off.', aiLoading: 'Preparing the AI: {p}% (one time only).', aiReady: 'Ready: used when the search is unsure, never to make things up.', aiError: 'AI unavailable for now: regular answers.', talk: 'Touch and speak', type: 'Type', otherLang: 'Français', ok: 'OK', settings: 'Settings', resetSettings: 'Reset', setLang: 'Language', setSize: 'Text size', setContrast: 'Contrast', setVoice: 'Gee-Gee\'s voice', setSpeed: 'Voice speed', setHighlight: 'Highlight words while reading', setMascot: 'Gee-Gee', optMascotReal: 'Realistic', optMascotHorse: 'Horse', optMascotCartoon: 'Cartoon', setMotion: 'Animations', optNormal: 'Normal', optNormalF: 'Normal', optHigh: 'High', optOn: 'On', optOff: 'Off', optSlow: 'Slow', optFast: 'Fast', optYes: 'Yes', optNo: 'No', optReduced: 'Reduced', directions: 'Walking directions from here', walk: '{m} m · {min} min walk', hereAlready: 'You are already here!', enlargeMap: 'Enlarge the map', floorPlan: 'Floor plan', campusMap: 'Campus map', tryAsk: 'Try: “Where is Fauteux Hall?” or “I lost my student card.”', popular: 'Popular topics', allTopics: 'All topics', back: 'Back',
    history: 'History', historyEmpty: 'Your questions will appear here.', youAsked: 'Your question', relatedTitle: 'Related questions',
    infoservice: 'Contact InfoService', urgent: 'Emergency: 911', zoom: 'Enlarge the map', listenAgain: 'Listen again', touchStart: 'Touch to start',
    attractTitle: 'Hi!\nI\'m Gee\u2011Gee.', attractSub: 'Touch the screen to ask me a question.',
    tips: ['I answer in English and French.', 'Talk to me or type your question.', 'I show you building floor plans.', 'At the end, keep your answers with a QR code.'],
    welcome: 'Welcome!', chooseLang: 'Choose your language', chooseProfile: 'You are…',
    profiles: { student: 'Student', staff: 'Staff / professor', visitor: 'Visitor' }, go: 'Let\'s go!',
    greet: {
      student: 'Hi! I\'m Gee-Gee, your campus guide. Ask me by typing or speaking, or tap a topic.',
      staff: 'Hello! I\'m Gee-Gee. I can help with services, buildings and IT. What are you looking for?',
      visitor: 'Welcome to the University of Ottawa! I\'m Gee-Gee and I can help you find your way. What are you looking for?'
    },
    askPh: 'Type your question…', ask: 'Your question', send: 'Send', mic: 'Speak', listening: 'I\'m listening…', micError: 'I didn\'t catch that. Try again or type your question.',
    topics: 'Topics', langBtn: 'FR', textDown: 'Smaller text', textUp: 'Text size', contrast: 'High contrast', voice: 'Voice', end: 'End',
    sources: 'Official source', verified: 'checked on', pointer: 'For up-to-date details, see the official page:', time: 'Answered in {ms} ms',
    helpful: 'Was this helpful?', yes: 'Yes', no: 'No', thanksFb: 'Thanks for your feedback!', related: 'Also:', topicIntro: 'Here is what I can tell you about "{cat}":',
    hello: 'Hi! What can I do for you?', thanks: 'You\'re welcome! Any other question?',
    st_bye: ['Have a great day! Touch “End” when you are done, or ask me another question.', 'See you next time! Good luck this term.'],
    st_howareyou: ['I\'m doing great, thanks! Ready to help. What are you looking for on campus?', 'Very well! Always happy to chat with a fellow Gee-Gee. How can I help?'],
    st_whoareyou: ['I\'m Gee-Gee, the University of Ottawa mascot and the guide on this kiosk. I answer your campus questions in English and French, using official University information.'],
    st_help: ['You can ask me where a building is, how to pay your fees, important dates, student services, IT, housing and much more. Talk to me or type your question, or touch a topic.'],
    st_joke: ['Why are Gee-Gees never late for exams? Because they always have a head start… by a nose!', 'What do you call a horse who finished all its assignments? A stable student!', 'My favourite course? Neigh-bourhood planning, of course!'],
    st_compliment: ['Thank you, that makes my day! Any other question?', 'Aw, thanks! You\'re great too. Can I help with anything else?'],
    st_insult: ['Sorry if my answer wasn\'t helpful. Try rephrasing your question, or touch a topic: I\'ll do my best.'],
    st_yesno: ['Okay! Any other question?', 'Perfect! I\'m here if you need anything else.'],
    offtopic: 'That\'s outside what I know! I answer questions about the University of Ottawa: buildings, courses, services, important dates and campus life.',
    unclear: 'Oops, I didn\'t understand. Could you rephrase your question? You can also touch a topic.',
    none: 'Sorry, I don\'t have official information on that topic. InfoService can help you in person, by phone or online.',
    didYouMean: 'Maybe you were looking for:',
    sensitive: 'I\'m not the right resource to talk about mental health, but you are not alone. The Student Health and Wellness Centre offers support and counselling. In an emergency, call 911.',
    timeNotice: 'It\'s already been 3 minutes! Take your time, but remember others may be waiting behind you.',
    idleTitle: 'Are you still there?', idleText: 'The session ends in {s} s.', stay: 'I\'m here',
    endTitle: 'Thanks for talking with me!', qrText: 'Scan this code to open the summary of your conversation, with the official links.', noQr: 'No questions asked this time.',
    qrOpen: 'Open the summary', qrPartial: 'Summary of the first {n} questions out of {total}.',
    rate: 'How was your experience?', done: 'Done', closing: 'Back to the start in {s} s',
    privacy: 'No personal data is requested or stored. Everything is erased when the session ends.',
    recapTitle: 'Your conversation summary', recapSource: 'Official pages', recapSite: 'uOttawa.ca',
    recapLead: 'Your {n} questions to Gee-Gee, with the official University pages the answers come from.',
    recapWhen: 'Session of {date}', recapPrint: 'Print or save as PDF', recapBack: 'Back to HoloGuide',
    recapFooter: 'HoloGuide — INNOVA Holotech box. Every answer comes from an official University of Ottawa page, listed under the question.',
    recapEmpty: 'This link contains no conversation. Ask Gee-Gee a question at the booth, then scan the QR code shown at the end.',
    admin: 'Holotech box indicators',
    stats: { sessions: 'Sessions', questions: 'Questions', unanswered: 'Unanswered', qr: 'QR codes', up: 'Helpful answers', down: 'Unhelpful answers', ratings: 'Satisfaction (bof / correct / super)', top: 'Top questions', profiles: 'Profiles', langs: 'Languages' },
    close: 'Close', reset: 'Reset'
  }
};

export const LINKS = {
  infoservice: { label: { fr: 'InfoService — uOttawa', en: 'InfoService — uOttawa' }, url: 'https://www.uottawa.ca/en/contact/infoservice' },
  wellness: { label: { fr: 'Centre de santé et de bien-être étudiant', en: 'Student Health and Wellness Centre' }, url: 'https://www.uottawa.ca/campus-life/health-wellness/student-health-wellness-centre' }
};

// Ordre des sujets selon le profil choisi à l'accueil.
export const TOPIC_ORDER = {
  student: ['cours', 'examens', 'bibliotheques', 'batiments', 'services', 'finances', 'logement', 'associations', 'ti', 'transport', 'sante', 'calendrier', 'reglements', 'evenements', 'international', 'programmes', 'genie', 'admissions', 'borne'],
  staff: ['ti', 'batiments', 'transport', 'services', 'bibliotheques', 'evenements', 'calendrier', 'sante', 'reglements', 'cours', 'borne'],
  visitor: ['batiments', 'transport', 'evenements', 'admissions', 'programmes', 'international', 'services', 'bibliotheques', 'borne']
};

// Noms courts des sujets (puces de l'accueil).
export const TOPIC_SHORT = {
  admissions: { fr: 'Admission', en: 'Admissions' }, programmes: { fr: 'Programmes', en: 'Programs' }, cours: { fr: 'Cours', en: 'Courses' },
  calendrier: { fr: 'Dates', en: 'Dates' }, examens: { fr: 'Examens', en: 'Exams' }, reglements: { fr: 'Règlements', en: 'Rules' },
  services: { fr: 'Services', en: 'Services' }, batiments: { fr: 'Pavillons', en: 'Buildings' }, bibliotheques: { fr: 'Bibliothèques', en: 'Libraries' },
  transport: { fr: 'Transport', en: 'Transport' }, logement: { fr: 'Logement', en: 'Housing' }, finances: { fr: 'Frais et bourses', en: 'Fees and awards' },
  associations: { fr: 'Clubs', en: 'Clubs' }, evenements: { fr: 'Événements', en: 'Events' }, genie: { fr: 'Génie et sciences', en: 'Engineering' },
  international: { fr: 'International', en: 'International' }, ti: { fr: 'Informatique', en: 'IT' }, sante: { fr: 'Santé', en: 'Health' }, borne: { fr: 'HoloGuide', en: 'HoloGuide' }
};
