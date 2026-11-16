// Questions types et réponse attendue (id de la base ou type spécial). Utilisé par tests/search.test.mjs et tests.html.
export const CASES = [
  ['Où est le pavillon CRX ?', 'crx'], ['where is the library', 'bibliotheque'], ['comment payer mes frais de scolarité', 'paiement-frais'],
  ['je veux créer un club', 'creer-club'], ['wifi eduroam', 'wifi'], ['stationnement', 'stationnement'], ['how do I print', 'impression'],
  ['examen différé', 'examen-differe'], ['où manger', 'alimentation'], ['urgence', 'urgence'], ['je me sens en dépression', 'sensitive'],
  ['bonjour', 'hello'], ['merci beaucoup', 'thanks'], ['quelle est la recette des crêpes', 'none'],
  ['ou est la biblioteque', 'bibliotheque'], ['parking on campus', 'stationnement'], ['code qr', 'resume-qr'],
  // Base élargie (novembre 2026)
  ['où est le gym', 'c-ou-est-gym'], ["j'ai perdu ma carte étudiante", 'c-carte-perdue'], ['quand commence la session d\'hiver', 'b-debut-hiver-2027'],
  ['où est le pavillon Fauteux', 'd-fauteux'], ["j'ai oublié mon mot de passe uoAccess", 'e-mot-de-passe-oublie'], ['combien coûte le U-Pass', 'd-upass-cout'],
  ['where can I get coffee', 'c-cafe'], ['permis de travail post-diplôme', 'a-permis-travail-postdiplome'], ['comment aller à Roger-Guindon', 'd-roger-guindon']
];
