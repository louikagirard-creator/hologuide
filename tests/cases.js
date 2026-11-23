// Questions types et réponse attendue (id de la base ou type spécial). Utilisé par tests/search.test.mjs et tests.html.
export const CASES = [
  ['Où est le pavillon CRX ?', 'crx'], ['where is the library', ['bibliotheque', 'd-morisset']], ['comment payer mes frais de scolarité', 'paiement-frais'],
  ['je veux créer un club', 'creer-club'], ['wifi eduroam', 'wifi'], ['stationnement', 'stationnement'], ['how do I print', ['impression', 'c-impression-gratuite']],
  ['examen différé', 'examen-differe'], ['où manger', 'alimentation'], ['urgence', ['urgence', 'c-urgence-campus']], ['je me sens en dépression', 'sensitive'],
  ['bonjour', 'hello'], ['merci beaucoup', 'thanks'], ['quelle est la recette des crêpes', 'none'],
  ['ou est la biblioteque', 'bibliotheque'], ['parking on campus', 'stationnement'], ['code qr', 'resume-qr'],
  // Base élargie (novembre 2026)
  ['où est le gym', 'c-ou-est-gym'], ["j'ai perdu ma carte étudiante", 'c-carte-perdue'], ['quand commence la session d\'hiver', 'b-debut-hiver-2027'],
  ['où est le pavillon Fauteux', 'd-fauteux'], ["j'ai oublié mon mot de passe uoAccess", 'e-mot-de-passe-oublie'], ['combien coûte le U-Pass', 'd-upass-cout'],
  ['where can I get coffee', 'c-cafe'], ['permis de travail post-diplôme', ['a-permis-travail-postdiplome', 'k-documents-pgwp']], ['comment aller à Roger-Guindon', ['d-roger-guindon', 'd-aller-roger-guindon']],
  ['c\'est quoi ITI1120', 'j-iti1120'], ['GNG1503', 'j-gng1503'], ['Tim Hortons au CRX', 'i-crx-tim-hortons'], ['alarme incendie', 'g-alarme-incendie'],
  ['c\'est quoi le club d\'escalade', 'q-club-escalade'], ['is there a chess club', 'q-club-chess'],
  ['labo informatique', ['r-labo-info-sciences-mnt', 'r-labo-info-connexion']], ['formation SIMDUT', 'r-simdut-obligatoire'],
  ['combien coute le depot de residence', 'm-residence-acompte'], ['upass exemption', 'w-upass-exemption-autres'],
  ['révision de note', 'v-revision-note-etapes'], ['ligne de crise texto', 'x-texto-crise'],
  ['bourse schulich leader', 'z-bourse-schulich-leader'], ['échange étudiant à l étranger', 'a-echange-etudiant-sortant'],
  // Base élargie (23 novembre 2026)
  ['combien de crédits pour une mineure', 'zb-mineure-definition'], ['réglages eduroam android', 'zb-eduroam-android'],
  ['Copilot uottawa', 'zb-copilot-gratuit'], ['toefl score minimum', 'zc-toefl-admission'],
  ['FAFSA prêt américain', 'zc-fafsa-etapes'], ['cours bilingue', ['zb-cours-bilingue-code', 'b-cours-bilingue']],
  // Le nom du pavillon doit battre un simple mot d'aspect (« ouvert », « samedi »)
  ['le CRX est-il ouvert samedi', 'crx'], ['à quelle heure ferme la bibliothèque', 'bibliotheque']
];
