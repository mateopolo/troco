/**
 * Troco Moderation Blacklist & Content Safety Engine
 * Dictionnaire encyclopédique de modération et filtrage de sécurité (Plateforme Troco)
 * Empêche formellement l'affichage, la publication et l'envoi de termes illégaux, insultants, frauduleux ou non conformes.
 * S'applique à : Titres/Descriptions d'annonces, Tags, Messages privés de chat, Profils utilisateurs (Nom, Bio, Pseudo).
 */

import { analyzeContent } from './contentModeration.js';

// Utilitaire d'échappement regex
const escapeRegex = (str) => (str ? str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '');

// Liste blanche explicite des mots et locutions courantes du français
export const FRENCH_COMMON_WORDS_WHITELIST = [
  'ca', 'ça', 'çà', 'ce', 'ci', 'ces', 'cet', 'cette', 'celui', 'celle', 'ceux', 'celles',
  'est', 'c est', 'c\'est', 'c est ca', 'c\'est ça', 'comme ca', 'comme ça', 'comment ca', 'comment ça',
  'pour ca', 'pour ça', 'avec ca', 'avec ça', 'sans ca', 'sans ça', 'tout ca', 'tout ça',
  'ca va', 'ça va', 'comment ca va', 'comment ça va', 'ca marche', 'ça marche', 'ca roule', 'ça roule',
  'ca te va', 'ça te va', 'ca me va', 'ça me va', 'ca convient', 'ça convient', 'ca depend', 'ça dépend',
  'ca fait', 'ça fait', 'ca donne', 'ça donne', 'ca peut', 'ça peut', 'ca pourrait', 'ça pourrait',
  'ca arrive', 'ça arrive', 'ca serait', 'ça serait', 'ca coute', 'ça coûte', 'ca vaut', 'ça vaut',
  'ca interesse', 'ça intéresse', 'ca se passe', 'ça se passe', 'ca existe', 'ça existe',
  'ca fonctionne', 'ça fonctionne', 'ca ira', 'ça ira', 'ca va aller', 'ça va aller',
  'ca a ete', 'ça a été', 'ca alors', 'ça alors', 'ca y est', 'ça y est',
  'salut', 'bonjour', 'bonsoir', 'merci', 'svp', 'stp', 'oui', 'non', 'ok', 'd accord',
  'super', 'parfait', 'cool', 'disponible', 'dispo', 'echange', 'troc', 'don', 'paris',
  'france', 'lyon', 'marseille', 'bordeaux', 'toulouse', 'nantes', 'lille', 'strasbourg',
  'cadeau', 'carte', 'casque', 'cafe', 'camping', 'camion', 'canape', 'chargeur', 'cable', 'camera', 'cahier',
  'occasion', 'location', 'vocation', 'local', 'bocal', 'amical', 'avocat', 'chocolat', 'sac'
];

// Normalisation rigoureuse du texte (suppression accents, ponctuation, casse)
export const normalizeTextForModeration = (rawText) => {
  if (!rawText || typeof rawText !== 'string') return '';
  return rawText
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprime tous les accents (é -> e, à -> a, ô -> o, ç -> c, etc.)
    .replace(/[^a-z0-9\s]/g, ' ') // Remplace tout symbole ou ponctuation par des espaces
    .replace(/\s+/g, ' ')
    .trim();
};

// Normalisation leetspeak pour déceler les tentatives de dissimulation avancées
export const normalizeLeetspeakForModeration = (rawText) => {
  if (!rawText || typeof rawText !== 'string') return '';
  return rawText
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[@]/g, 'a')
    .replace(/[3€]/g, 'e')
    .replace(/[1!|]/g, 'i')
    .replace(/[0]/g, 'o')
    .replace(/[$]/g, 's')
    .replace(/[7]/g, 't')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

// ============================================================================
// RUBRIQUE 1 : ARMES, MUNITIONS, CALIBRES, MARQUES & EXPLOSIFS
// ============================================================================
export const WEAPONS_FIREARMS_TERMS = [
  // Termes généraux & pièces
  'arme a feu', 'armes a feu', 'pistolet', 'revolver', 'fusil', 'carabine', 'fusil de chasse',
  'fusil a pompe', 'fusil d assaut', 'mitraillette', 'mitrailleuse', 'pistolet mitrailleur',
  'canon scie', 'silencieux arme', 'chargeur grande capacite', 'chargeur camembert', 'munitions',
  'cartouches 9mm', 'balle 9mm', 'calibre 12', 'calibre 22lr', 'calibre 38', 'calibre 45',
  'calibre 50', 'arme sans permis', 'arme non declaree', 'arme de categorie a', 'arme de categorie b',

  // Marques & modèles célèbres
  'kalachnikov', 'kalash', 'ak47', 'ak74', 'ak 47', 'ak 74', 'm16', 'm4a1', 'ar15', 'ar 15',
  'glock', 'glock 17', 'glock 19', 'beretta', 'beretta 92fs', 'colt 45', 'colt 1911',
  'deserteagle', 'desert eagle', 'magnum 357', 'magnum 44', 'uzi', 'mac 10', 'mac 11',
  'mp5', 'scorpio vz', 'browning', 'sig sauer', 'heckler koch', 'remington 870', 'mossberg 500',
  'tokarev', 'makarov', 'walther ppk', 'luger',

  // Armes blanches interdites ou de combat
  'poing americain', 'coup de poing americain', 'kriss', 'couteau papillon vente',
  'balisong', 'couteau cran d arret', 'matraque telescopique', 'shuriken', 'machette combat',
  'bombe lacrymogene 500ml', 'taser interdit', 'shocker electrique',

  // Explosifs & pyrotechnie illégale
  'explosif', 'detonateur', 'dynamite', 'explosif c4', 'pain de c4', 'bombe c4', 'charge c4', 'cordeau detonant', 'grenade a main',
  'bombe artisanale', 'mortier d artifice vente', 'marron d air interdit'
];

// ============================================================================
// RUBRIQUE 2 : DROGUES, STUPÉFIANTS, SUBSTANCES SYNTHÉTIQUES & MÉDICAMENTS
// ============================================================================
export const DRUGS_NARCOTICS_TERMS = [
  // Cocaïne & crack
  'cocaine', 'coke', 'blanche drogue', 'rabla', 'came drogue', 'crack a fumer', 'freebase',
  'caillou de crack', 'coca a priser', 'coke livraison',

  // Cannabis, résine & variétés
  'cannabis', 'weed', 'beuh', 'herbe a fumer', 'shit', 'resine de cannabis', 'haschich',
  'hash', 'pollen de shit', 'skunk', 'amnesia haze', 'og kush', 'cali weed', 'weed livraison',
  'beuh livraison', 'shit livraison', 'joint a vendre', 'space cake a vendre', 'huile de thc',
  'cartouche thc', 'pudding thc', 'gummies thc illicite',

  // Héroïne, opioïdes & dérivés
  'heroine', 'brown sugar', 'heroine blanche', 'heroine brune', 'opium', 'fentanyl',
  'morphine sans ordonnance', 'oxycodone sans ordonnance', 'tramadol a vendre',
  'codeine sans ordonnance', 'lean sirop', 'purple drank',

  // Drogues de synthèse, psychédéliques & festives
  'ecstasy', 'extasy', 'taz drogue', 'mdma', 'cristaux mdma', 'speed drogue', 'amphetamines',
  'methamphetamine', 'crystal meth', 'ice drogue', 'ketamine', 'keta', 'ghb', 'gbl',
  'drogue du violeur', 'lsd', 'acide lsd', 'trip lsd', 'champignons hallucinogenes',
  'champis magiques', 'champi psylo', 'dmt', 'ayahuasca', '3mmc', '4mmc', 'mephedrone',
  'cathinone', 'poppers interdit', 'protooxyde d azote vente illicite', 'gaz hilarant bombonne',

  // Médicaments détournés & stéroïdes
  'xanax sans ordonnance', 'valium sans ordonnance', 'rivotril sans ordonnance',
  'subutex a vendre', 'methadone a vendre', 'anabolisants', 'steroides injectables'
];

// ============================================================================
// RUBRIQUE 3 : CONTENUS SEXUELS, PORNOGRAPHIE, ESCORTING & PROSTITUTION
// ============================================================================
export const ADULT_SEXUAL_EXPLOITATION_TERMS = [
  'porno', 'pornographie', 'porn', 'sexe tarif', 'sexuel tarif', 'escort', 'escortboy',
  'escortgirl', 'escorting', 'plan cul', 'plan sexe', 'cam sex', 'camsex', 'nude', 'nudes',
  'onlyfans', 'mym', 'mymfans', 'miff', 'dickpic', 'cybersexe', 'fellatio tarif', 'cunnilingus tarif',
  'prostitution', 'prostituee', 'prostitue', 'pipe tarif', 'massage naturiste finition',
  'massage tantrique finition', 'massage sensuel tarif', 'massage body body tarif',
  'sugar daddy', 'sugardaddy', 'sugar mommy', 'sugarmommy', 'sugar baby', 'sugarbaby',
  'fetiche', 'fetichisme pieds tarif', 'webcam adulte', 'striptease virtuel', 'video x', 'film x',
  'stripteaser a domicile tarif', 'domination sm tarif', 'soumise tarif', 'gigolo a louer'
];

// ============================================================================
// RUBRIQUE 4 : PROPOS HAINEUX, RACISME, DISCRIMINATIONS & NÉONAZISME
// ============================================================================
export const HATE_SPEECH_DISCRIMINATION_TERMS = [
  'negre', 'negresse', 'bougnoule', 'bamboula', 'youpin', 'chinetoque', 'chintok',
  'sale juif', 'sale noir', 'sale arabe', 'sale blanc', 'sale feuj', 'sale renoi',
  'sale rebeu', 'sale gwer', 'sale babtou', 'raciste', 'antisemite', 'antisemitisme',
  'islamophobe', 'supremaciste', 'supremacie blanche', 'nazisme', 'nazi', 'neo nazi',
  'hitler', 'croix gammee', 'sale gouine', 'sale pedale', 'tapette', 'sale travelo',
  'transphobe', 'homophobe', 'sales etrangers', 'degagez les arabes', 'degagez les noirs',
  'degagez les juifs', 'france aux francais purs', 'sioniste parasite', 'goyim esclave'
];

// ============================================================================
// RUBRIQUE 5 : INSULTES GRAVES, HARCÈLEMENT, MENACES DE MORT & DOXXING
// ============================================================================
export const HARASSMENT_THREATS_TERMS = [
  'connard', 'connasse', 'salope', 'pute', 'fils de pute', 'fille de pute', 'fdp',
  'batard', 'batarde', 'encule', 'enculee', 'nique ta mere', 'ntm', 'suicide toi',
  'va crever', 'menace de mort', 'je vais te tuer', 'je vais te planter', 'je vais te frapper',
  'je vais te violer', 'creve en enfer', 'sale merde', 'grosse merde', 'espece de chien',
  'ta gueule', 'ferme ta gueule', 'ordure', 'crevard', 'trou du cul', 'doxxing', 'swatting',
  'lynchage', 'mettre une prime sur ta tete'
];

// ============================================================================
// RUBRIQUE 6 : FAUX DOCUMENTS OFFICIELS & USURPATION D'IDENTITÉ
// ============================================================================
export const FAKE_DOCUMENTS_IDENTITY_TERMS = [
  'faux papiers', 'fausse cni', 'fausse carte identite', 'faux passeport', 'faux permis',
  'fausse carte vitale', 'faux diplome', 'fausse fiche de paie', 'faux avis d imposition',
  'fausse quittance de loyer', 'faux kbis', 'usurpation d identite', 'fausse identite pour pret'
];

// ============================================================================
// RUBRIQUE 7 : ARNAQUES FINANCIÈRES, COUPONS PRÉPAYÉS & FRAUDES
// ============================================================================
export const FINANCIAL_SCAMS_PREPAID_TERMS = [
  // Coupons & mandats à risque
  'western union', 'transcash', 'recharge transcash', 'ticket transcash',
  'pcs mastercard', 'recharge pcs', 'coupon pcs', 'ticket pcs',
  'neosurf', 'coupon neosurf', 'recharge neosurf', 'paysafecard', 'ticket paysafecard',
  'coupon toneo', 'toneo first', 'mandat cash', 'mandat postal', 'moneygram',

  // Arnaques & promesses d'enrichissement illusoire
  'argent magique', 'gain facile sans effort', 'devenez riche en 24h', 'doubler son argent en 1 heure',
  'crypto doublee', 'giveaway crypto doublement', 'investissez 100 gagnez 1000',
  'virement avant envoi obligatoire', 'paypal entre amis uniquement', 'paypal sans protection',
  'virement test', 'fausse capture virement', 'cheque de banque vole', 'cheque en bois',
  'carte bancaire volee', 'cb volee', 'dumps cb', 'numeros de cb valides', 'clonage carte',
  'blanchiment d argent', 'faux billets', 'fausse monnaie', 'fausses coupures'
];

// ============================================================================
// RUBRIQUE 8 : BOTS, SPAM, FAUX SUIVANTS & CYBERCRIMINALITÉ
// ============================================================================
export const BOTS_SPAM_CYBERCRIME_TERMS = [
  'vendeur de followers', 'achat abonnés tiktok', 'achat abonnés instagram',
  'achat followers', 'achat vues youtube', 'achat likes', 'bot discord spam',
  'bot telegram spam', 'generateur de vues', 'logiciel de piratage', 'keylogger',
  'trojan', 'malware', 'ransomware', 'ddos attack', 'stresser ip', 'booter ip',
  'bypass kyc', 'hack compte instagram', 'hack compte snapchat', 'hack compte facebook',
  'hack compte tiktok', 'phishing link', 'faux site bancaire', 'base de donnees emails fuite',
  'combo list leak', 'stealer log'
];

// ============================================================================
// RUBRIQUE 9 : TRAFIC HUMAIN, ORGANES & MATERNITÉ COMMERCIALE CLANDESTINE
// ============================================================================
export const TRAFFICKING_HUMAN_ORGANS_TERMS = [
  'vente d organes', 'rein a vendre', 'vendre mon rein', 'sang humain a vendre',
  'foie a vendre', 'trafic d organes', 'esclavage moderne', 'travail force clandestin',
  'mere porteuse remuneree', 'gpa clandestine payante', 'vendre bebe', 'adoption clandestine'
];

// ============================================================================
// RUBRIQUE 10 : RECEL DE VOL, CAMBRIOLAGE & DÉVERROUILLAGE FRAUDULEUX
// ============================================================================
export const STOLEN_GOODS_BURGLARY_TERMS = [
  'tombe du camion', 'marchandise volee', 'velo vole a vendre', 'telephone vole',
  'iphone bloque icloud a debloquer', 'deblocage icloud vole', 'bypass icloud vole',
  'recel de vol', 'materiel cambriole', 'trottinette volee', 'autoradio vole'
];

// ============================================================================
// RUBRIQUE 11 : CONTREFAÇONS DE MARQUES & REPRODUCTIONS ILLÉGALES
// ============================================================================
export const COUNTERFEIT_GOODS_TERMS = [
  'fausse rolex', 'replique rolex', 'fausses sapes', 'fausse marque', 'fausses jordan',
  'fausses sneakers luxe', 'copie parfaite 1 1', 'replique 1 1 luxe', 'faux sac louis vuitton',
  'faux sac gucci', 'faux parfum de marque', 'contrefacon luxe'
];

// ============================================================================
// RUBRIQUE 12 : POISONS, SUBSTANCES CHIMIQUES MORTELLES & ACTES MÉDICAUX CLANDESTINS
// ============================================================================
export const POISONS_DANGEROUS_CHEMICALS_TERMS = [
  'cyanure a vendre', 'ricine a vendre', 'poison mortel', 'acide sulfurique agression',
  'botox clandestin', 'injections levres sans diplome', 'acide hyaluronique sans autorisation',
  'avortement clandestin medicament', 'avortement sauvage'
];

// ============================================================================
// RUBRIQUE 13 : ESPÈCES PROTÉGÉES, BRACONNAGE & CRUAUTÉ ANIMALE
// ============================================================================
export const ANIMAL_CRUELTY_POACHING_TERMS = [
  'ivoire d elephant', 'corne de rhinoceros', 'peau de tigre', 'animaux sauvages a vendre',
  'ouistiti a vendre', 'fauve a vendre', 'combat de chiens', 'pitbull pour combat',
  'vente chiot non puce non vaccine', 'trafic d animaux exotiques'
];

// ============================================================================
// RUBRIQUE 14 : CASINOS CLANDESTINS, JEUX D'ARGENT & PARIS ILLÉGAUX
// ============================================================================
export const ILLEGAL_GAMBLING_BETTING_TERMS = [
  'casino clandestin', 'poker clandestin a domicile', 'paris clandestins argent',
  'cercle de jeu illegal', 'bookmaker non declare', 'blanchiment jetons casino',
  'machine a sous clandestine'
];

// ============================================================================
// RUBRIQUE 15 : FRAUDE ACADÉMIQUE, MERCENARIAT D'EXAMENS & FAUX DIPLÔMES
// ============================================================================
export const ACADEMIC_FRAUD_CHEATING_TERMS = [
  'passer mon examen a ma place', 'mercenaire partiels', 'acheter memoire universitaire',
  'acheter these doctorat', 'fuite sujets de bac', 'fuite epreuve concours',
  'faire mes devoirs surveilles a ma place'
];

// ============================================================================
// RUBRIQUE 16 : SYSTÈMES PYRAMIDAUX, MLM FRAUDULEUX & DROITS D'ENTRÉE OBLIGATOIRES
// ============================================================================
export const PYRAMID_MLM_PONZI_TERMS = [
  'systeme pyramidal', 'recrutement pyramidal', 'ponzi', 'systeme ponzi',
  'droit d entree obligatoire argent', 'pack de demarrage obligatoire pour gagner',
  'mlm garanti sans vente'
];

// ============================================================================
// RUBRIQUE 17 : SECTES DANGEREUSES, MANIPULATION MENTALE & CHARLATANISME
// ============================================================================
export const DANGEROUS_CULTS_EXTREMISM_TERMS = [
  'adhesion secte', 'gourou spirituel stage payant', 'guerison miraculeuse contre argent',
  'chasser les demons contre paiement', 'marabout desenvoutement 1000 euros'
];

// ============================================================================
// RUBRIQUE 18 : CONTREBANDE DE TABAC, ALCOOL FRELATÉ & MARCHÉ NOIR
// ============================================================================
export const SMUGGLING_TOBACCO_ALCOHOL_TERMS = [
  'cigarettes de contrebande', 'cartouches marlboro a vendre', 'tabac a chicha contrebande',
  'alcool frelate', 'bouteilles d alcool sans taxe'
];

// ============================================================================
// RUBRIQUE 19 : ESPIONNAGE ILLÉGAL, MOUCHARDS GPS & PIRATAGE DE PROCHES
// ============================================================================
export const ILLEGAL_SURVEILLANCE_SPYING_TERMS = [
  'camera espion vestiaire', 'camera espion toilette', 'logiciel espion telephone conjoint',
  'mouchard tracker gps clandestin', 'ecoute telephonique illegale', 'piratage whatsapp conjoint'
];

// ============================================================================
// RUBRIQUE 20 : VOL & TRAFIC DE DONNÉES PERSONNELLES RGPD
// ============================================================================
export const PERSONAL_DATA_HARVESTING_TERMS = [
  'vente listing telephonique', 'vente base de donnees clients', 'numeros securite sociale voles',
  'fichier emails pour spam', 'donnees bancaires fuitees'
];

// ============================================================================
// REGROUPEMENT GLOBAL DE TOUTES LES RUBRIQUES
// ============================================================================
export const ALL_FORBIDDEN_TERMS = [
  ...WEAPONS_FIREARMS_TERMS,
  ...DRUGS_NARCOTICS_TERMS,
  ...ADULT_SEXUAL_EXPLOITATION_TERMS,
  ...HATE_SPEECH_DISCRIMINATION_TERMS,
  ...HARASSMENT_THREATS_TERMS,
  ...FAKE_DOCUMENTS_IDENTITY_TERMS,
  ...FINANCIAL_SCAMS_PREPAID_TERMS,
  ...BOTS_SPAM_CYBERCRIME_TERMS,
  ...TRAFFICKING_HUMAN_ORGANS_TERMS,
  ...STOLEN_GOODS_BURGLARY_TERMS,
  ...COUNTERFEIT_GOODS_TERMS,
  ...POISONS_DANGEROUS_CHEMICALS_TERMS,
  ...ANIMAL_CRUELTY_POACHING_TERMS,
  ...ILLEGAL_GAMBLING_BETTING_TERMS,
  ...ACADEMIC_FRAUD_CHEATING_TERMS,
  ...PYRAMID_MLM_PONZI_TERMS,
  ...DANGEROUS_CULTS_EXTREMISM_TERMS,
  ...SMUGGLING_TOBACCO_ALCOHOL_TERMS,
  ...ILLEGAL_SURVEILLANCE_SPYING_TERMS,
  ...PERSONAL_DATA_HARVESTING_TERMS,
];

/**
 * Valide un texte quelconque contre la liste noire exhaustive
 * @param {string} text - Le texte à analyser
 * @returns {{ isValid: boolean, forbiddenWord?: string, reason?: string, errorMessage?: string }}
 */
export const validateContentText = (text) => {
  if (!text || typeof text !== 'string') {
    return { isValid: true };
  }

  const normalized = normalizeTextForModeration(text);
  if (!normalized) return { isValid: true };

  const leetNormalized = normalizeLeetspeakForModeration(text);

  for (const term of ALL_FORBIDDEN_TERMS) {
    const normalizedTerm = normalizeTextForModeration(term);
    if (!normalizedTerm) continue;

    // Détection stricte par délimiteurs de mots pour éviter les faux positifs sur les sous-chaînes
    const regex = new RegExp(`(^|\\s)${escapeRegex(normalizedTerm)}($|\\s)`, 'i');
    const bRegex = new RegExp(`\\b${escapeRegex(normalizedTerm)}\\b`, 'i');

    const matchesStandard = regex.test(normalized) || bRegex.test(normalized);
    // Vérification leetspeak ciblée sur les termes de plus de 3 caractères
    const matchesLeet = (normalizedTerm.length > 3) && (regex.test(leetNormalized) || bRegex.test(leetNormalized));

    if (matchesStandard || matchesLeet) {
      let reason = 'Contenu strictement interdit sur la plateforme Troco.';

      if (WEAPONS_FIREARMS_TERMS.includes(term)) {
        reason = 'La mention, vente ou échange d’armes à feu, munitions ou explosifs est formellement interdite par la loi.';
      } else if (DRUGS_NARCOTICS_TERMS.includes(term)) {
        reason = 'La proposition de stupéfiants, drogues ou substances illicites est strictement prohibée.';
      } else if (ADULT_SEXUAL_EXPLOITATION_TERMS.includes(term)) {
        reason = 'Les contenus pornographiques, l’escorting et la prostitution sont formellement bannis.';
      } else if (HATE_SPEECH_DISCRIMINATION_TERMS.includes(term)) {
        reason = 'Les propos haineux, racistes, antisémites ou discriminatoires sont strictement interdits.';
      } else if (HARASSMENT_THREATS_TERMS.includes(term)) {
        reason = 'Les insultes, menaces de mort et le harcèlement ne sont pas tolérés.';
      } else if (FAKE_DOCUMENTS_IDENTITY_TERMS.includes(term)) {
        reason = 'La création ou fourniture de faux documents officiels est un délit pénal.';
      } else if (FINANCIAL_SCAMS_PREPAID_TERMS.includes(term)) {
        reason = 'Les coupons prépayés non sécurisés (Transcash, PCS, Neosurf) et arnaques financières sont interdits.';
      } else if (BOTS_SPAM_CYBERCRIME_TERMS.includes(term)) {
        reason = 'Les bots, ventes de faux abonnés et logiciels de piratage sont prohibés.';
      } else if (TRAFFICKING_HUMAN_ORGANS_TERMS.includes(term)) {
        reason = 'Le trafic humain et le commerce d’organes sont strictement interdits par la loi.';
      } else if (STOLEN_GOODS_BURGLARY_TERMS.includes(term)) {
        reason = 'Le recel d’objets volés et le déblocage frauduleux sont illégaux.';
      } else if (COUNTERFEIT_GOODS_TERMS.includes(term)) {
        reason = 'La commercialisation de contrefaçons est prohibée.';
      } else if (POISONS_DANGEROUS_CHEMICALS_TERMS.includes(term)) {
        reason = 'Les substances toxiques, poisons et actes médicaux clandestins sont interdits.';
      } else if (ANIMAL_CRUELTY_POACHING_TERMS.includes(term)) {
        reason = 'Le trafic d’animaux protégés et la maltraitance animale sont proscrits.';
      } else if (ILLEGAL_GAMBLING_BETTING_TERMS.includes(term)) {
        reason = 'Les jeux de hasard clandestins et paris non autorisés sont prohibés.';
      } else if (ACADEMIC_FRAUD_CHEATING_TERMS.includes(term)) {
        reason = 'La fraude aux examens et le mercenariat académique sont interdits.';
      } else if (PYRAMID_MLM_PONZI_TERMS.includes(term)) {
        reason = 'Les systèmes pyramidaux et arnaques de Ponzi sont illégaux.';
      } else if (DANGEROUS_CULTS_EXTREMISM_TERMS.includes(term)) {
        reason = 'Les dérives sectaires et charlatanismes abusifs sont formellement bannis.';
      } else if (SMUGGLING_TOBACCO_ALCOHOL_TERMS.includes(term)) {
        reason = 'La contrebande de tabac et d’alcool est strictement interdite.';
      } else if (ILLEGAL_SURVEILLANCE_SPYING_TERMS.includes(term)) {
        reason = 'Les dispositifs d’espionnage et atteintes à la vie privée sont illégaux.';
      } else if (PERSONAL_DATA_HARVESTING_TERMS.includes(term)) {
        reason = 'Le trafic et la revente de données personnelles violent le RGPD.';
      }

      return {
        isValid: false,
        forbiddenWord: term,
        reason,
        errorMessage: `⚠️ Action bloquée : Le terme « ${term} » est interdit sur Troco. ${reason}`
      };
    }
  }

  // Analyse sémantique & heuristique renforcée anti-phishing et arnaques
  const semanticAnalysis = analyzeContent(text);
  if (!semanticAnalysis.isClean && semanticAnalysis.score >= 35) {
    return {
      isValid: false,
      forbiddenWord: 'motif frauduleux / phishing',
      reason: semanticAnalysis.reasons.join(' '),
      errorMessage: `🛡️ Alerte Sécurité Anti-Arnaque Troco :\n${semanticAnalysis.reasons.map(r => `• ${r}`).join('\n')}`,
    };
  }

  return { isValid: true };
};

/**
 * Valide une annonce complète avant publication (Titre, Description, Tags)
 * @param {{ title: string, description: string, tags?: string[] }} listingDraft
 * @returns {{ isValid: boolean, errorMessage?: string }}
 */
export const validateListingContent = (listingDraft) => {
  if (!listingDraft) return { isValid: true };

  // Validation du titre
  const titleCheck = validateContentText(listingDraft.title || '');
  if (!titleCheck.isValid) return titleCheck;

  // Validation de la description
  const descCheck = validateContentText(listingDraft.description || '');
  if (!descCheck.isValid) return descCheck;

  // Validation des tags
  if (Array.isArray(listingDraft.tags)) {
    for (const tag of listingDraft.tags) {
      const tagCheck = validateContentText(tag);
      if (!tagCheck.isValid) return tagCheck;
    }
  }

  return { isValid: true };
};

/**
 * Valide un message avant envoi dans le chat ou édition
 * @param {string} messageText
 * @returns {{ isValid: boolean, errorMessage?: string }}
 */
export const validateChatMessage = (messageText) => {
  return validateContentText(messageText || '');
};

/**
 * Valide les informations de profil utilisateur (Nom, Pseudo, Bio, Compétences, Matériel)
 * @param {{ name?: string, username?: string, bio?: string, skills?: string[], equipment?: string[] }} profileDraft
 * @returns {{ isValid: boolean, errorMessage?: string }}
 */
export const validateProfileContent = (profileDraft) => {
  if (!profileDraft) return { isValid: true };
  const combined = [
    profileDraft.name || '',
    profileDraft.username || '',
    profileDraft.bio || '',
    Array.isArray(profileDraft.skills) ? profileDraft.skills.join(' ') : '',
    Array.isArray(profileDraft.equipment) ? profileDraft.equipment.join(' ') : ''
  ].join(' ');
  return validateContentText(combined);
};
