/**
 * Générateur intelligent de tags thématiques & SEO basé sur l'analyse lexicale.
 * @param {string} title - Titre de l'annonce ou de la requête
 * @param {string} description - Description détaillée
 * @returns {string[]} Liste des tags détectés (max 4)
 */
export const generateTags = (title = '', description = '') => {
  const text = `${title || ''} ${description || ''}`.toLowerCase();
  const tags = [];
  const rules = [
    { re: /(cours|leçon|lecon|coaching|formation|apprendre|séance|seance|niveau)/, tag: 'Cours' },
    { re: /(piano|guitare|musique|beatmaking|ableton|solfège|production|chant)/, tag: 'Musique' },
    { re: /(cuisine|pâtisserie|patisserie|pizza|recette|robot pâtissier)/, tag: 'Cuisine' },
    { re: /(perceuse|outil|outillage|bricolage|forets|nettoyeur|jardinage|tondeuse)/, tag: 'Bricolage' },
    { re: /(iphone|smartphone|écran|ecran|réparation|reparation|panne|dépannage)/, tag: 'Dépannage' },
    { re: /(appartement|maison|logement|échange|echange|swap|chalet|studio|séjour|sejour)/, tag: 'Logement' },
    { re: /(python|code|informatique|développement|developpement|script|données|data)/, tag: 'Tech' },
    { re: /(vélo|velo|sport|musculation|yoga|posture|fitness)/, tag: 'Sport & Bien-être' },
    { re: /(chien|animal|garde)/, tag: 'Animaux' },
    { re: /(photo|camera|vidéo|video|montage|objectif)/, tag: 'Photo & Vidéo' },
    { re: /(visio|distance|en ligne|monde)/, tag: 'À distance' },
    { re: /(urgence|urgent|ce soir|aujourd|rapide|problème|probleme)/, tag: 'Urgent' },
  ];

  rules.forEach(rule => {
    if (rule.re.test(text) && !tags.includes(rule.tag)) {
      tags.push(rule.tag);
    }
  });

  if (tags.length === 0) tags.push('Échange');
  return tags.slice(0, 4);
};

export default generateTags;
