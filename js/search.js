// Recherche de réponses, 100 % locale et instantanée (aucun serveur, aucune IA).
// Ordre : santé mentale (redirection) > salutations / remerciements > meilleure réponse de la base.
// shortcut: score par mots-clés + tolérance aux fautes ; passer à une recherche sémantique si la base dépasse quelques centaines de réponses.
import { KB, CATEGORIES } from '../data/kb.js';

export const STOP = new Set(('le la les un une des de du d l au aux et ou a à en est sont je tu il elle on nous vous ils mon ma mes ton ta tes son sa ses ' +
  'ce cette ces qui que quoi quel quelle quels quelles comment ou où pour par sur dans avec pas ne se me te y ai as faire fait peux peut veux ' +
  'the a an of to in on at for and or is are am be i you he she it we they my your his her its our their what which who how where when do does can ' +
  'want need please svp stp est-ce ca ça c s t es suis etes moi toi e d ve its when why pourquoi quand ' +
  // langage parlé et verbes passe-partout : ils ne disent rien du sujet (« c koi », « genre », « gonna »)
  'koi ki quoi cest jai etre avoir aller faut falloir genre pis ben bin coudonc voudrais aimerais savoir dire dois doit devrait pourrais puis vais va ' +
  'know tell get got gonna wanna like just also any some there here this that these those have has had will would could should may might much many ' +
  'very really im ive dont cant thats whats theres anyone someone somebody quelqu quelquun anything something thing chose truc affaire').split(' '));
// Détresse : redirection immédiate vers le soutien (jamais de conseil). Liste volontairement large : mieux vaut
// rediriger une question de trop que manquer quelqu'un qui va mal.
const SENSITIVE = ['sante mentale', 'mental health', 'suicide', 'suicidaire', 'suicidal', 'depression', 'deprime', 'depressed', 'depressif', 'anxiete', 'anxiety', 'anxious',
  'anxieux', 'anxieuse', 'detresse', 'distress', 'me tuer', 'me suicider', 'kill myself', 'end my life', 'mettre fin a mes jours', 'en finir', 'self harm', 'automutilation',
  'me faire du mal', 'hurt myself', 'harm myself', 'counselling', 'psychologue', 'me sens mal', 'feel hopeless', 'idees noires', 'dark thoughts', 'envie de mourir',
  'pense a mourir', 'want to die', 'wanna die', 'veux mourir', 'veux plus vivre', 'plus envie de vivre', 'don t want to live', 'don t want to be here anymore',
  'attaque de panique', 'crise de panique', 'panic attack', 'je me sens vide', 'feel empty', 'me sens seul', 'me sens seule', 'feel so alone', 'feel alone', 'feel lonely',
  'personne m aime', 'nobody loves me', 'no one cares', 'pleure tout le temps', 'cry all the time', 'crying all the time', 'en peux plus', 'can t cope', 'cannot cope',
  'overwhelmed', 'tout lacher', 'give up on everything', 'burn out', 'burnout', 'epuise mentalement', 'stresse que je dors plus', 'can t sleep because', 'hopeless', 'desespere',
  'me sens nul', 'feel worthless', 'je vaux rien', 'worthless', 'peux plus de rien', 'pas bien mentalement', 'mentalement epuise', 'feel like a failure',
  'nothing matters', 'rien ne compte', 'sens tellement seul', 'sens tellement seule', 'seul a l universite', 'seule a l universite', 'so lonely', 'tellement deprime',
  'je vais mal', 'ca va pas du tout', 'not okay mentally', 'i m not ok', 'je suis pas ok', 'broken inside', 'je veux disparaitre', 'want to disappear'];
const HELLO = ['bonjour', 'salut', 'allo', 'hello', 'hi', 'hey', 'bonsoir', 'coucou', 'yo', 'bon matin', 'good morning', 'good afternoon', 'good evening', 'hola', 'heya', 'howdy', 'bjr', 'slt', 'hii'];
const THANKS = ['merci', 'thanks', 'thank you', 'thx', 'super merci', 'merci beaucoup', 'ty', 'mercii', 'merci bcp'];
// Bavardage : Gee-Gee répond quelques mots (textes st_<intention> dans js/i18n.js) au lieu d'une fiche sans rapport.
// Une expression de plusieurs mots compte si la phrase est courte ; un mot seul (« aide », « ok ») doit être
// toute la phrase, pour que « aide financière » ou « ok pour le stationnement » restent des questions.
const SMALLTALK = [
  ['bye', ['bonne fin de semaine', 'have a good one', 'bye gee gee', 'je m en vais', 'i m leaving', 'gotta go', 'faut que j y aille', 'a la revoyure', 'peace', 'au revoir', 'bye', 'bye bye', 'a plus', 'a plus tard', 'a la prochaine', 'bonne journee', 'bonne soiree', 'bonne fin de journee', 'see you',
    'see ya', 'goodbye', 'good bye', 'ciao', 'tchao', 'a bientot', 'a tantot', 'later', 'have a good day', 'have a nice day', 'take care', 'bonne nuit', 'good night']],
  ['howareyou', ['sa va', 'how have you been', 'comment tu te sens', 'how do you feel', 'you doing ok', 'you ok', 'tu vas ok', 'ca va bien toi',  'tu vas comment', 'ca va toi', 'and you', 'et toi', 'how was your day', 'ta journee', 'comment ca va', 'ca va', 'comment vas tu', 'comment tu vas', 'tu vas bien', 'vas tu bien', 'how are you', 'how r u', 'how are u', 'hows it going',
    'how is it going', 'how s it going', 'how you doing', 'what s up', 'whats up', 'wassup', 'quoi de neuf', 'ca roule', 'sava', 'cava', 'ca va bien', 'comment ca va aujourd hui']],
  ['whoareyou', ['t ki', 'tes ki', 'ki es tu', 'vrai cheval', 'real horse', 'chatgpt', 'qui t a cree', 'qui t a fait', 'who made you', 'who created you', 'who built you', 't es tu un humain', 'real person', 'vraie personne', 'pourquoi t es un cheval', 'chatbot', 'es tu un chatbot', 'boy or a girl', 'gars ou fille', 'garcon ou fille', 'fille ou gars', 'are you a boy', 'es tu un gars',  'why are you a horse', 'what kind of animal', 'quel animal', 'are you alive', 'es tu vivant', 'tu es une machine', 'are you a bot', 'es tu un bot', 't es qui', 'tu es qui', 'qui es tu', 'tes qui', 'c est quoi ton nom', 'quel est ton nom', 'comment tu t appelle', 'comment tu t appelles', 'ton nom',
    'who are you', 'who r u', 'what s your name', 'whats your name', 'what is your name', 'your name', 'es tu un robot', 't es un robot', 'tu es un robot', 'are you a robot',
    'es tu une ia', 't es une ia', 'tu es une ia', 'are you an ai', 'are you ai', 'are you real', 'es tu humain', 'es tu reel', 'tu es quoi', 't es quoi', 'what are you',
    'es tu un cheval', 'are you a horse', 'c est qui gee gee', 'who is gee gee', 'qui est gee gee', 'tu es un humain', 'are you human']],
  ['help', ['besoin d aide', 'j ai besoin d aide', 'jai besoin d aide', 'what are you for', 'quelles questions', 'what questions', 'what should i ask', 'je sais pas quoi demander', 'je sais pas quoi te demander', 'je sais pas quoi te poser',  'i don t know what to ask', 'comment ca fonctionne', 'how does it work', 'instructions', 'mode d emploi', 'aide', 'aide moi', 'help', 'help me', 'tu peux faire quoi', 'que peux tu faire', 'qu est ce que tu peux faire', 'what can you do', 'what can i ask',
    'what can i ask you', 'je peux te demander quoi', 'je peux te poser quoi', 'comment ca marche', 'how does this work', 'how do i use this', 'how do i use you',
    'tu sers a quoi', 'what do you do', 'what are you for', 'a quoi tu sers', 'qu est ce que je peux te demander', 'comment je t utilise', 'je comprends pas comment ca marche']],
  ['joke', ['une joke', 't as une joke', 'joke drole', 'good jokes', 'blagues', 'jokes', 'fun fact', 'quelque chose de marrant', 'fais moi une blague', 'dis une blague', 'conte moi une joke', 'blague', 'une blague', 'joke', 'a joke', 'fais moi rire', 'make me laugh', 'quelque chose de drole', 'something funny', 'raconte moi une blague',
    'tell me a joke', 'dis moi une blague', 'tu connais une blague', 'know any jokes', 'any jokes']],
  ['compliment', ['smart', 't es smart', 'tu es smart', 'you re smart', 'you re cute', 'you are cute', 't es bon',  'tu es bon', 'cute', 't es mignon', 'tu es mignon', 'adorable', 'love this', 'j adore', 'trop cool', 'so cool', 'merci t es cool', 'you rock', 't es malade', 'incroyable', 'amazing', 't es cool', 'tu es cool', 'tes cool', 'je t aime', 'i love you', 'love you', 'good job', 'bon travail', 'bravo', 'tu es beau', 't es beau', 't es drole',
    'tu es drole', 'you re cool', 'you are cool', 'youre cool', 'you re awesome', 'you are awesome', 't es le meilleur', 'tu es le meilleur', 'you re the best', 'genial',
    'awesome', 'nice', 't es fin', 't es hot', 'tu es gentil', 't es gentil', 'you re funny', 'you re smart', 't es intelligent', 'tu es intelligent', 'great job', 'well done']],
  ['insult', ['inutile', 't es inutile', 'tu es inutile', 'this kiosk sucks', 'cette borne est nulle', 'borne de marde', 'sucks',  'stupid horse', 'cheval stupide', 'so dumb', 't es pas bon', 'you re bad', 'worst', 'le pire', 'pourri', 'garbage', 'nul a chier', 'ta gueule', 't es lent', 'you re slow', 't es nul', 'tu es nul', 'tes nul', 'you re useless', 'you are useless', 'youre useless', 'you suck', 'ferme la', 'shut up', 'stupide', 'stupid', 'idiot',
    't es poche', 'tu es poche', 'tu sers a rien', 't sers a rien', 'useless', 'dumb', 'you re dumb', 't es con', 'tu es con', 'nul', 'trash', 'you re stupid', 't es niaiseux']],
  ['yesno', ['ben non', 'ben oui', 'bah oui', 'bah non', 'non merci', 'no thanks', 'no thank you', 'c est bon', 'that s all', 'c est tout', 'rien', 'nothing', 'pas pour l instant', 'not now', 'merci c est tout', 'mmm', 'hmm', 'ah ok', 'oh ok', 'bof', 'mouais', 'meh',  'okk', 'vrm', 'vraiment', 'really', 'ok', 'okay', 'oki', 'oui', 'non', 'd accord', 'dac', 'cool', 'yes', 'no', 'nope', 'yep', 'yeah', 'ouais', 'ouin', 'correct', 'parfait', 'super', 'k',
    'ok merci', 'sure', 'alright', 'all right', 'got it', 'compris', 'je vois', 'i see', 'pas grave', 'ok cool', 'nah', 'si']]
].map(([id, list]) => [id, list.map(norm)]); // même normalisation que la question (accents, pluriels : « ouais » → « ouai »)
const LAUGH = new Set('lol lool mdr ptdr haha hahaha hihi hehe xd lmao rofl'.split(' '));
const FILLER = new Set('gee geegee gg stp svp please pls hey yo dis alors donc euh hum bien vraiment really so well toi you lol haha'.split(' '));
const squash = (x) => x.replace(/([a-z])\1+/g, '$1'); // « heyyy », « salutt », « okkk »
const SQ = (x) => ` ${x.trim().split(' ').map(squash).join(' ')} `;
const SMALLTALK_SQ = SMALLTALK.map(([id, list]) => [id, list.map(SQ)]);
function smalltalk(n0) {
  // On compare tout en version « sans lettres doublées » des deux côtés (« heyyy » = « hey », « cool » = « col »)
  const n = SQ(n0);
  const all = n.trim().split(' ');
  const core = ` ${all.filter((w) => !FILLER.has(w)).join(' ')} `;
  for (const [id, list] of SMALLTALK_SQ) {
    for (const p of list) {
      const multi = p.trim().includes(' ');
      if (core === p) return { id, whole: true };
      // Expression dans une phrase courte : on vérifiera qu'aucune fiche ne répond nettement mieux
      // (« à quelle heure ferme la bibliothèque » n'est pas « ferme-la »)
      if (multi && all.length <= 7 && n.includes(p)) return { id, whole: false };
    }
  }
  return null;
}
// Hors sujet évident : Gee-Gee dit qu'il répond seulement sur l'Université (au lieu d'une fiche trouvée par hasard).
// Volontairement précis : « club d'échecs », « cours de cinéma » ou « bus vers Carleton » restent des questions du campus.
const OFFTOPIC = [
  /\b(meteo|weather|forecast|quel temps|temps qu il fait|va t il pleuvoir|il va pleuvoir|rain tomorrow|snow tomorrow|neiger demain)\b/, // météo
  /\b(quelle heure est il|quelle heure il est|what time is it|quel jour on est|on est quel jour|what day is it|what s the date today)\b/, // heure, date du jour
  /\b(combien font|combien fait \d|what is \d+ \d|resous|resoudre|solve for|equation|derivee de|integrale de)\b/, // calcul
  /\b(capitale de|capital of|population de la|population of|vitesse de la lumiere|speed of light|premier ministre|prime minister|president des etats|president of the|sens de la vie|meaning of life|qui a invente|who invented|world war|guerre mondiale|what year did)\b/, // culture générale
  /\b(netflix|meilleur film|best movie|series? to watch|recommend me a (movie|show|series)|recette|recipe|cuire un|faire du pain|bake a|poeme|poem|paroles de|song lyrics|changer un pneu|change a tire|cinema ce soir|movie tonight)\b/, // loisirs
  /\b(canadiens|habs|senators game|maple leafs|leafs|nhl|nba|nfl|mlb|super bowl|world cup|coupe du monde|stanley cup|coupe stanley|meilleur joueur|best player|meilleure equipe de|best team in|drake|taylor swift)\b/, // sport pro, vedettes
  /\b(fais mon devoir|faire mon devoir|do my homework|write my essay|ecris mon|redige mon|photosynthese|photosynthesis|traduis|translate this)\b/, // devoirs
  /\b(mcgill|universite de montreal|udem|concordia|universite laval|sherbrooke|u of t|uoft|university of toronto|queen s university|waterloo|mcmaster|ubc|harvard|stanford|mit)\b/, // autres universités
  /\b(billet d avion|plane ticket|flight to|vol pour paris|bitcoin|crypto|tesla stock|acheter des actions|buy stock|prix de l essence|gas price)\b/ // voyages, argent
];
const OTHER_UNI = OFFTOPIC[7];
// Une autre université, mais pour un lien avec nous (emprunter des livres, transférer des crédits, échange) : vraie question
const LINKED = /\b(emprunt\w*|borrow\w*|biblio\w*|library|librar\w+|livres?|books?|transf\w+|credits?|echange|exchange|ici|here|chez vous)\b/;
const ANCHOR = /\b(uottawa|u ottawa|universite d ottawa|university of ottawa|gee gee|gees|campus)\b/; // la question parle bien de chez nous
// Charabia (« blablabla », « asdfgh ») : aucune voyelle, ou une syllabe répétée ; on répond « je n'ai pas compris ».
const gibberish = (w) => w.length >= 4 && !/\d/.test(w) && (!/[aeiouy]/.test(w) || /(.{1,3})\1{2,}/.test(w));

export function norm(s) {
  return ` ${String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim()
    .replace(/\b([a-z]{4,})s\b/g, '$1')} `; // pluriel simple : « examens » = « examen »
}
const words = (s) => norm(s).trim().split(' ').filter((w) => w && !STOP.has(w));
// Synonymes courants (langage parlé, québécismes) ramenés aux mots de la base ; appliqués à la question seulement
const SYN = [[' egare ', ' perdu '], [' egaree ', ' perdue '], [' paume ', ' perdu '], [' carte d etudiant ', ' carte etudiante '], [' carte etudiant ', ' carte etudiante '],
  [' bouffer ', ' manger '], [' bouffe ', ' nourriture '], [' resto ', ' restaurant '], [' wc ', ' toilette '], [' salle de bain ', ' toilette '], [' bathroom ', ' toilette '], [' washroom ', ' toilette '],
  [' bibli ', ' bibliotheque '], [' biblio ', ' bibliotheque '], [' job ', ' emploi '], [' boulot ', ' emploi '], [' jobine ', ' emploi '], [' char ', ' voiture '],
  [' parking ', ' stationnement '], [' cell ', ' telephone '], [' ordi ', ' ordinateur '], [' laptop ', ' ordinateur portable '], [' prof ', ' professeur '], [' labo ', ' laboratoire '],
  [' rez ', ' residence '], [' res ', ' residence '], [' asso ', ' association '], [' fac ', ' faculte '], [' prereq ', ' prealable prerequisite '], [' prereqs ', ' prealable prerequisite '],
  [' appart ', ' appartement '], [' proprio ', ' proprietaire '], [' intl ', ' international '], [' uni ', ' universite '], [' physio ', ' physiotherapie '],
  [' ergo ', ' ergotherapie '], [' doc ', ' document '], [' toilet ', ' toilette '], [' restroom ', ' toilette '], [' prep ', ' preparer '], [' tabarret ', ' tabaret ']];
const expand = (n) => { let x = n; for (const [a, b] of SYN) x = x.replaceAll(a, `${a}${b.trim()} `); return x; }; // garde le mot d'origine et ajoute le synonyme

function lev(a, b, max = 1) { // distance d'édition (tolérance d'une ou deux fautes de frappe)
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

// Trigrammes de lettres (« ins », « nsc », « scr »…) : rapprochent « inscrire » et « inscription », « payer » et « paiement »,
// et résistent aux fautes. Servent à reclasser les meilleures fiches (voir findAnswer).
function grams(text) {
  const m = new Map();
  for (const w of words(text)) {
    if (w.length < 3) continue;
    const x = `_${w}_`;
    for (let i = 0; i + 3 <= x.length; i++) { const g = x.slice(i, i + 3); m.set(g, (m.get(g) || 0) + 1); }
  }
  let nrm = 0; for (const v of m.values()) nrm += v * v;
  return { m, nrm: Math.sqrt(nrm) || 1 };
}
function cosine(a, b) {
  let d = 0;
  const [small, big] = a.m.size < b.m.size ? [a, b] : [b, a];
  for (const [g, v] of small.m) { const w = big.m.get(g); if (w) d += v * w; }
  return d / (a.nrm * b.nrm);
}
const GENERIC = new Set('uottawa ottawa universite university campus etudiant etudiante student students'.split(' '));
// Index préparé une seule fois au chargement.
// Mots-clés inutilisables écartés : faits seulement de petits mots (« es », « the », « a- », « qui peut ») ; sinon ils
// correspondent à presque toutes les phrases (« t'es qui » donnait l'Association des étudiants japonais).
const usable = (k) => { const w = k.trim().split(' ').filter(Boolean); return w.length && w.some((x) => x.length >= 2 && !STOP.has(x)); };
const INDEX = KB.map((e) => {
  const kws = e.keywords.map(norm).filter(usable);
  const vocab = new Set([...kws.flatMap((k) => k.trim().split(' ')), ...words(e.question.fr), ...words(e.question.en)]);
  const v = [...vocab].filter((w) => w.length > 2 && !STOP.has(w));
  const aset = new Set([...words(e.answer.fr), ...words(e.answer.en)].filter((w) => w.length > 2 && !vocab.has(w)));
  // Mots de la question de la fiche, dans la langue la plus proche de la demande (on prend la plus courte des deux listes)
  // (sans les mots présents partout : « uottawa », « campus »… sinon « C'est quoi I.T.I.S-uOttawa ? » attirait toute question avec « uottawa »)
  const qf = words(e.question.fr).filter((w) => w.length > 2 && !GENERIC.has(w)), qe = words(e.question.en).filter((w) => w.length > 2 && !GENERIC.has(w));
  const where = /^(ou |where |how do i get to |comment (me rendre|aller|se rendre))/.test(norm(e.question.fr).trim() + ' ') || /^(where |how do i get to )/.test(norm(e.question.en).trim() + ' ');
  return { e, kws, idk: norm(e.id.replace(/^[a-z]-/, '')), vocab: v, vset: new Set(v), aset, qfr: new Set(qf), qen: new Set(qe), where,
    gfr: grams(e.question.fr), gen: grams(e.question.en) };
});
const ALL_WORDS = new Set(INDEX.flatMap((it) => it.vocab)); // un mot connu n'est pas une faute de frappe
// Rareté de chaque mot : « différés » ou « fauteux » départagent mieux les réponses que « examens » ou « pavillon ».
const DF = new Map();
INDEX.forEach((it) => it.vocab.forEach((w) => DF.set(w, (DF.get(w) || 0) + 1)));
const idf = (w) => Math.min(2, 0.4 + Math.log(INDEX.length / (DF.get(w) || 1)) / 3);
const DFA = new Map();
INDEX.forEach((it) => it.aset.forEach((w) => DFA.set(w, (DFA.get(w) || 0) + 1)));
const idfA = (w) => Math.min(2, Math.log(INDEX.length / (DFA.get(w) || 1)) / 3);
const CAT_HINTS = CATEGORIES.map((c) => ({ id: c.id, hints: c.hints.map(norm) }));
// Mots d'aspect : ils disent CE QUI est demandé (heures, jour, prix…), pas DE QUOI on parle.
// Sans pondération, « le CRX est-il ouvert samedi ? » partait sur la fiche du Centre Brunsfield, la seule à parler d'ouverture le samedi.
const FACET = new Set(`heure heures horaire horaires ouvert ouverte ouverts ouvertes ouvre ouvrent ferme fermes fermee fermees fermeture
  samedi dimanche lundi mardi mercredi jeudi vendredi matin soir midi nuit aujourd demain weekend week end
  hours open opens opening close closes closed closing weekend weekdays monday tuesday wednesday thursday friday saturday sunday morning evening`.split(/\s+/));
const facetWeight = (parts) => (parts.every((w) => FACET.has(w)) ? 0.4 : 1);

// Réglages (ajustés avec le banc d'essai tests/essais.mjs)
export const TUNE = { answerWeight: 0.35, minScore: 2.5, minCover: 0.5, sureScore: 5, focus: 10, focusIdf: true, whereBonus: 2, tri: 10 };
function score(item, n, qwords, cats) {
  let s = 0, exact = 0;
  const hit = new Set(); // mots de la question expliqués par cette fiche
  for (const k of item.kws) {
    // (Buffy) un mot-clé fait seulement de mots d'aspect (« ouvert », « samedi ») compte moins que le sujet nommé
    if (n.includes(k)) {
      s += (2 + k.trim().split(' ').length) * facetWeight(k.trim().split(' ')) + (k === n ? 10 : 0); // la question EST ce mot-clé (« code qr ») : fiche visée
      exact++; for (const w of k.trim().split(' ')) hit.add(w);
    } // expression exacte : plus elle est longue, plus elle compte
    else if (k.length >= 7 && !k.trim().includes(' ')) {
      const kk = k.trim(), tol = kk.length >= 8 ? 2 : 1; // mot long : deux fautes permises (« morriset » pour « morisset »)
      const w = qwords.find((x) => x.length >= 5 && !ALL_WORDS.has(x) && lev(x, kk, tol) <= tol);
      if (w) { s += 2.5; exact++; hit.add(w); } // mot-clé long avec une faute : indice fiable
    }
  }
  for (const w of qwords) {
    if (w.length < 3) continue;
    const f = FACET.has(w) ? 0.4 : 1;
    if (item.vset.has(w)) { s += idf(w) * f; exact++; hit.add(w); }
    else if (item.aset.has(w)) { s += TUNE.answerWeight * idfA(w) * f; hit.add(w); } // mot présent seulement dans la réponse : indice plus faible
    else if (w.length >= 5 && !ALL_WORDS.has(w) && item.vocab.some((v) => v.length >= 5 && lev(w, v) <= 1)) { s += 0.75 * f; hit.add(w); }
  }
  if (cats.has(item.e.category)) s += 0.5;
  if (cats.where && item.where && exact) s += TUNE.whereBonus; // « où est… » : les fiches qui disent où se trouve quelque chose
  if (cats.club && item.e.category === 'associations') s += 1.5; // « club de … » : les fiches de clubs d'abord
  if (/\d/.test(item.idk) && n.includes(item.idk)) s += 1; // départage : « gng1503 » → la fiche j-gng1503 plutôt que son équivalent anglais
  // Fiche « ciblée » : la part des mots de sa propre question qu'on retrouve dans la demande départage les fiches voisines
  let focus = 0;
  // (pondéré par la rareté : retrouver « lit » et « draps » compte plus que « programme » ou « cours »)
  for (const set of [item.qfr, item.qen]) if (set.size) {
    let m = 0, all = 0;
    for (const w of set) { const k = TUNE.focusIdf ? idf(w) : 1; all += k; if (qwords.includes(w)) m += k; }
    focus = Math.max(focus, m / all);
  }
  const base = exact ? s : s * 0.6; // score sans le bonus de ciblage : sert au seuil « correspondance très forte »
  if (exact) s += TUNE.focus * focus;
  const content = qwords.filter((w) => w.length >= 3);
  const cover = content.length ? content.filter((w) => hit.has(w)).length / content.length : 1;
  // Seulement des mots « presque pareils » (fautes de frappe) : indice faible (« blague » ressemble à « bague »)
  return { s: exact ? s : s * 0.6, base, cover };
}

export function findAnswer(text) {
  const n = expand(norm(text));
  const qwords = words(n);
  if (SENSITIVE.some((k) => n.includes(norm(k)))) return { type: 'sensitive' };
  const all = n.trim().split(' ');
  if (all.every((w) => LAUGH.has(w) || gibberish(w) || w.length < 2) && all.some((w) => LAUGH.has(w) || gibberish(w))) return { type: 'unclear', alts: [], top: [] }; // « lol », « aaaaaa », « kdkdkd lol »
  const st = smalltalk(n);
  if (st?.whole) return { type: 'smalltalk', intent: st.id };
  // (sur le texte sans la règle des pluriels : « temps » doit rester « temps », « senators » rester « senators »)
  const raw = ` ${String(text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[’']/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim()} `;
  if (!ANCHOR.test(raw) && OFFTOPIC.some((re) => re.test(raw)) && !(OTHER_UNI.test(raw) && LINKED.test(raw))) return { type: 'offtopic', alts: [], top: [] };
  if (all.length <= 4 && HELLO.some((h) => n.includes(` ${h} `) || ` ${all.map(squash).join(' ')} `.includes(` ${squash(h)} `))) return { type: 'hello' };
  if (THANKS.some((h) => n.includes(norm(h))) && all.length <= 5) return { type: 'thanks' };
  const cats = new Set(CAT_HINTS.filter((c) => c.hints.some((h) => n.includes(h))).map((c) => c.id));
  cats.club = / (club|clubs|association etudiante|student club) /.test(n);
  cats.where = / (ou est|ou sont|ou se trouve|ou trouver|where is|where are|where s|where can i find|how do i get to|comment aller|comment me rendre|c est ou) /.test(n);
  const ranked = INDEX.map((it) => ({ it, e: it.e, ...score(it, n, qwords, cats) })).filter((r) => r.s > 0).sort((a, b) => b.s - a.s);
  // Reclassement des 30 premières par ressemblance des lettres avec la question de chaque fiche
  if (TUNE.tri && ranked.length > 1) {
    const g = grams(n);
    const head = ranked.slice(0, 30);
    for (const r of head) r.s += TUNE.tri * Math.max(cosine(g, r.it.gfr), cosine(g, r.it.gen));
    head.sort((a, b) => b.s - a.s);
    ranked.splice(0, head.length, ...head);
  }
  let best = ranked[0];
  if (st && !ranked.slice(0, 5).some((r) => r.base >= TUNE.sureScore && r.cover >= TUNE.minCover)) return { type: 'smalltalk', intent: st.id };
  if ((!best || best.s < 2.5) && all.every((w) => gibberish(w) || w.length < 3) && all.some(gibberish)) return { type: 'unclear', alts: [], top: [] };
  // Réponse seulement si la fiche explique une bonne partie de la question (sinon « qui a gagné le match hier »
  // trouvait une fiche grâce à un seul mot), sauf correspondance très forte. Après le reclassement, la première fiche
  // peut ne couvrir qu'une partie de la question : on remonte la première des cinq meilleures qui passe le seuil
  // (« à quelle heure ferme la bibliothèque » → heures de la bibliothèque, pas le Wi-Fi de la bibliothèque fermée).
  const pass = (r) => r.s >= TUNE.minScore && (r.cover >= TUNE.minCover || r.base >= TUNE.sureScore);
  const okIdx = ranked.slice(0, 5).findIndex(pass);
  if (okIdx > 0) ranked.unshift(...ranked.splice(okIdx, 1));
  best = ranked[0];
  const top = ranked.slice(0, 6).map((r) => r.e); // candidates pour l'IA (elle relit plus de fiches que l'écran n'en montre)
  if (best && pass(best)) return { type: 'answer', entry: best.e, score: best.s, alts: ranked.slice(1, 4).filter((r) => r.s >= 2).map((r) => r.e), top };
  return { type: 'none', alts: ranked.slice(0, 3).filter((r) => r.s >= 1).map((r) => r.e), top };
}

// Phrase de la fiche qui répond le mieux à la question : on ne retire rien du texte officiel, on met seulement
// en tête la phrase qui traite du point demandé (heures, prix, date, téléphone, adresse) au lieu de toujours commencer par l'adresse.
const FACETS = [
  { q: /\b(heure|heures|horaire|horaires|ouvert|ouverte|ouverts|ouvertes|ouvre|ouvrent|ferme|fermee|fermeture|open|opens|opening|close|closes|closed|hours|time)\b/, s: /(heure|horaire|ouvert|ferme|open|close|hours|\d\s?h\b|a\.m\.|p\.m\.|midi|minuit)/i },
  { q: /\b(combien|prix|tarif|tarifs|cout|coutent|coute|cost|costs|price|prices|fee|fees|pay|payer)\b/, s: /(\$|prix|tarif|cout|frais|fee|cost|price)/i },
  { q: /\b(quand|date|dates|deadline|echeance|jusqu)\b/, s: /\b(janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre|january|february|march|april|june|july|august|september|october|november|december)\b/i },
  { q: /\b(telephone|phone)\b/, s: /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/ },
  { q: /(\bou est\b|\bou se trouve\b|\badresse\b|where|address)/, s: /(adresse|rue|avenue|promenade|situe|located|address|local [a-z]?\d)/i }
];
const ANAPHORA = /^(il|elle|ils|elles|c'est|ce sont|ca|cela|ceci|it|they|this|that|these|those|there)\b/i;
const NO_ACCENT = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// Découpe en phrases sans casser un prix (« 12.50 ») ni une heure (« 7 a.m. »).
const DOT = '\u2024';
const sentences = (t) => (t.replace(/\b([ap])\.m\.?(?=\s|$)/gi, `$1${DOT}m${DOT}`).match(/[^.!?…]+[.!?…]+(?:\s+|$)|[^.!?…]+$/g) || [t])
  .map((x) => x.trim().replaceAll(DOT, '.')).filter(Boolean);

// Réponse de la fiche, cadrée sur la question : même contenu officiel, phrase la plus pertinente en premier.
export function focusAnswer(entry, question, lang = 'fr') {
  const text = String(entry?.answer?.[lang] || entry?.answer?.fr || '');
  const parts = sentences(text);
  if (parts.length < 2) return text;
  const asked = NO_ACCENT(question);
  const facets = FACETS.filter((f) => f.q.test(asked)); // question sans point précis : on laisse l'ordre officiel
  if (!facets.length) return text;
  const own = new Set([...words(entry.question?.fr || ''), ...words(entry.question?.en || '')]); // mots qui nomment le sujet, pas ce qui est demandé
  const qw = words(asked).filter((w) => w.length > 2 && !own.has(w));
  const scored = parts.map((s, i) => ({
    s, i, k: facets.reduce((a, f) => a + (f.s.test(s) ? 2 : 0), 0) + qw.reduce((a, w) => a + (new Set(words(s)).has(w) ? 1 : 0), 0)
  }));
  const best = scored.reduce((a, b) => (b.k > a.k ? b : a), scored[0]);
  if (best.i === 0 || best.k < 2 || best.k <= scored[0].k || ANAPHORA.test(best.s)) return text; // « C'est là que… » ne peut pas ouvrir la réponse
  return [best.s, ...parts.filter((_, i) => i !== best.i)].join(' ');
}

export const byId = (id) => KB.find((e) => e.id === id);
export const inCategory = (cat) => KB.filter((e) => e.category === cat);
export { KB, CATEGORIES };
