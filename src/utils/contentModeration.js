/**
 * Troco Content Moderation Utility
 * Détection automatique de mots-clés interdits, arnaques, phishing et spam.
 */

// Dictionnaire de termes et motifs sensibles
export const FORBIDDEN_PATTERNS = [
  // Arnaques & Phishing
  /\b(virement\s*wester\s*union|western\s*union|transcash|pcs\s*mastercard|neosurf|mandat\s*cash|paysafecard)\b/i,
  /\b(cliquez\s*ici\s*pour\s*gagner|crypto\s*doubl[eé]|gain\s*facile|argent\s*magique|pyramidal)\b/i,
  /\b(paypal\s*entre\s*amis\s*uniquement|virement\s*avant\s*envoi\s*obligatoire)\b/i,
  /\b(phishing|fake\s*proof|faux\s*profil|arnaque\s*confirm[eé]e)\b/i,

  // Données ultra sensibles en public (RIB / Cartes bancaires / SSN)
  /\b(FR\d{2}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{3})\b/i, // IBAN FR
  /\b(\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4})\b/, // Numéro de carte bancaire probable
  /\b(cvv\s*:\s*\d{3,4}|cryptogramme\s*:\s*\d{3,4})\b/i,

  // Contenus haineux, insultes graves & illicites
  /\b(connard|salope|putain|encul[eé]|fdp|nique\s*ta\s*mère|bâtard|fils\s*de\s*pute)\b/i,
  /\b(drogue\s*à\s*vendre|coca[iï]ne|cannabis\s*livraison|arme\s*à\s*feu|faux\s*papiers)\b/i,
];

// Mots sensibles individuels pour le nettoyage ou surlignage
export const FORBIDDEN_WORDS = [
  'western union', 'transcash', 'pcs mastercard', 'neosurf', 'mandat cash',
  'connard', 'salope', 'encule', 'enculé', 'fdp', 'nique ta mere',
  'cocaïne', 'faux papiers', 'carte bancaire volée', 'argent facile sans effort'
];

/**
 * Vérifie si un texte contient des mots-clés ou motifs interdits
 * @param {string} text 
 * @returns {boolean}
 */
export const containsForbiddenKeywords = (text) => {
  if (!text || typeof text !== 'string') return false;
  return FORBIDDEN_PATTERNS.some(pattern => pattern.test(text));
};

/**
 * Analyse approfondie du contenu avec rapport et score de risque
 * @param {string} text 
 * @returns {{ isClean: boolean, reasons: string[], score: number }}
 */
export const analyzeContent = (text) => {
  if (!text || typeof text !== 'string') {
    return { isClean: true, reasons: [], score: 0 };
  }

  const reasons = [];
  let riskScore = 0;

  // Test des expressions régulières
  FORBIDDEN_PATTERNS.forEach((pattern) => {
    if (pattern.test(text)) {
      riskScore += 40;
      if (/transcash|neosurf|western\s*union|pcs/i.test(text)) {
        reasons.push('Mention de coupons de paiement prépayés ou mandat risqué (Transcash, Neosurf, Western Union).');
      } else if (/FR\d{2}|\d{4}[-\s]?\d{4}/i.test(text)) {
        reasons.push('Coordonnées bancaires sensibles ou numéro de carte détecté.');
      } else if (/drogue|arme|faux\s*papiers/i.test(text)) {
        reasons.push('Offre de produits ou services illicites.');
      } else {
        reasons.push('Propos offensants ou suspects détectés.');
      }
    }
  });

  // Détection de répétition excessive de liens URL
  const linkMatches = text.match(/https?:\/\/[^\s]+/g);
  if (linkMatches && linkMatches.length > 2) {
    riskScore += 30;
    reasons.push('Nombre anormalement élevé de liens externes (suspicion de spam).');
  }

  // Détection de texte tout en majuscules (cri/spam)
  if (text.length > 30 && text === text.toUpperCase() && /[A-Z]/.test(text)) {
    riskScore += 15;
    reasons.push('Texte entièrement en majuscules.');
  }

  // Déduplication des motifs
  const uniqueReasons = Array.from(new Set(reasons));

  return {
    isClean: riskScore < 30,
    reasons: uniqueReasons,
    score: Math.min(riskScore, 100)
  };
};

/**
 * Remplace les termes interdits par des astérisques
 * @param {string} text 
 * @returns {string}
 */
export const sanitizeText = (text) => {
  if (!text || typeof text !== 'string') return '';
  let sanitized = text;
  FORBIDDEN_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, (match) => '*'.repeat(Math.max(match.length, 3)));
  });
  return sanitized;
};
