/**
 * Troco Content Moderation & AI Scam Protection Engine
 * Détection automatique intelligente : Phishing, liens suspects, arnaques par ingénierie sociale,
 * coupons prépayés, usurpation de support et diffusion de coordonnées bancaires illicites.
 */

// Dictionnaire enrichi de motifs d'arnaques, phishing et menaces
export const FORBIDDEN_PATTERNS = [
  // 1. Phishing & Liens suspects / Raccourcisseurs
  /\b(bit\.ly|tinyurl\.com|cutt\.ly|is\.gd|t\.co|shorturl\.at|ow\.ly|v\.ht|goo\.gl)\/[a-z0-9_-]+/i,
  /\bhttps?:\/\/[^\s]*\.(xyz|top|tk|ml|ga|cf|gq|work|click|country|kim|men|loan|racing)\b/i,
  /\b(paypal-[a-z0-9-]+\.(com|net|org|xyz)|leboncoin-[a-z0-9-]+\.(com|net|fr)|banque-[a-z0-9-]+\.(com|net)|virement-[a-z0-9-]+\.(com|net))\b/i,
  /\b(wa\.me\/\d+|t\.me\/[a-z0-9_]+|api\.whatsapp\.com)\b/i,

  // 2. Moyens de paiement frauduleux & coupons prépayés
  /\b(virement\s*western\s*union|western\s*union|transcash|pcs\s*mastercard|neosurf|mandat\s*cash|paysafecard|toneo\s*first|coupons?\s*transcash)\b/i,
  /\b(cartes?\s*cadeaux?\s*(apple|amazon|google\s*play|steam)|steam\s*card|code\s*de\s*recharge\s*pcs)\b/i,
  /\b(paypal\s*entre\s*amis\s*uniquement|virement\s*avant\s*envoi\s*obligatoire)\b/i,
  /\b(crypto\s*doubl[eé]|gain\s*facile|argent\s*magique|pyramidal|recrute\s*sans\s*experience\s*1000€)\b/i,

  // 3. Schémas d'ingénierie sociale & arnaques au faux coursier
  /\b(coursier\s*(dhl|fedex|dpd|chronopost|mondial\s*relay|ups))\b/i,
  /\b(coursier.*(enveloppe|argent|liquide|especes|frais|assurance))\b/i,
  /\b(mon\s*(oncle|cousin|frere|fils|livreur).*(enveloppe|liquide|argent|especes))\b/i,
  /\b(enveloppe\s*d\s*argent|enveloppe\s*en\s*liquide|enveloppe\s*d\s*especes)\b/i,
  /\b(envoyez\s*votre\s*adresse\s*(email|mail)\s*pour|votre\s*adresse\s*mail\s*pour\s*le\s*virement)\b/i,
  /\b(avance\s*de\s*frais|frais\s*d\s*assurance\s*a\s*regler|payer\s*l\s*assurance\s*du\s*coursier)\b/i,

  // 4. Usurpation de support officiel ou modérateur Troco
  /\b(support\s*officiel\s*troco|service\s*client\s*troco|admin\s*troco|securite\s*bancaire\s*troco|equipe\s*de\s*moderation\s*troco)\b/i,
  /\b(cliquez\s*ici\s*pour\s*debloquer\s*vos\s*fonds|validez\s*votre\s*compte\s*avant\s*blocage)\b/i,

  // 5. Données ultra sensibles en clair (RIB / Cartes bancaires / Cryptogrammes)
  /\b(FR\d{2}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{3})\b/i, // IBAN FR
  /\b(\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4})\b/, // Numéro de CB
  /\b(cvv\s*:\s*\d{3,4}|cryptogramme\s*:\s*\d{3,4})\b/i,

  // 6. Contenus haineux, insultes graves & trafics illicites
  /\b(connard|salope|putain|encul[eé]|fdp|nique\s*ta\s*mère|bâtard|fils\s*de\s*pute)\b/i,
  /\b(drogue\s*à\s*vendre|coca[iï]ne|cannabis\s*livraison|arme\s*à\s*feu|faux\s*papiers)\b/i,
];

// Mots sensibles individuels pour le nettoyage ou surlignage
export const FORBIDDEN_WORDS = [
  'western union', 'transcash', 'pcs mastercard', 'neosurf', 'mandat cash',
  'connard', 'salope', 'encule', 'enculé', 'fdp', 'nique ta mere',
  'cocaïne', 'faux papiers', 'carte bancaire volée', 'argent facile sans effort',
  'coursier dhl enveloppe', 'payer assurance coursier'
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
 * @returns {{ isClean: boolean, reasons: string[], score: number, alertLevel: 'low' | 'medium' | 'high' }}
 */
export const analyzeContent = (text) => {
  if (!text || typeof text !== 'string') {
    return { isClean: true, reasons: [], score: 0, alertLevel: 'low' };
  }

  const reasons = [];
  let riskScore = 0;

  // 1. Analyse par motifs et expressions régulières
  FORBIDDEN_PATTERNS.forEach((pattern) => {
    if (pattern.test(text)) {
      riskScore += 45;
      if (/bit\.ly|tinyurl|cutt\.ly|shorturl|\.xyz|\.top/i.test(text)) {
        reasons.push('Lien raccourci ou domaine suspect détecté (risque élevé de phishing).');
      } else if (/paypal-|leboncoin-|banque-/i.test(text)) {
        reasons.push('Tentative d’usurpation de plateforme bancaire ou de paiement.');
      } else if (/transcash|neosurf|western\s*union|pcs|paysafecard|carte\s*cadeau/i.test(text)) {
        reasons.push('Demande de coupons prépayés ou cartes cadeaux (méthode d’escroquerie notoire).');
      } else if (/coursier\s*(dhl|fedex|dpd|chronopost)|enveloppe|avance\s*de\s*frais/i.test(text)) {
        reasons.push('Arnaque au faux coursier / fausse enveloppe d’argent liquide détectée.');
      } else if (/support\s*officiel|admin\s*troco|debloquer\s*vos\s*fonds/i.test(text)) {
        reasons.push('Tentative d’usurpation de l’administration Troco.');
      } else if (/FR\d{2}|\d{4}[-\s]?\d{4}|cvv/i.test(text)) {
        reasons.push('Diffusion non sécurisée de coordonnées bancaires ou de carte de crédit.');
      } else if (/drogue|arme|faux\s*papiers/i.test(text)) {
        reasons.push('Offre de produits ou services strictement illicites.');
      } else {
        reasons.push('Propos offensants ou comportement frauduleux suspect.');
      }
    }
  });

  // 2. Détection de surcharge de liens URL externes
  const linkMatches = text.match(/https?:\/\/[^\s]+/gi) || [];
  if (linkMatches.length >= 2) {
    riskScore += 30;
    reasons.push('Multiples liens externes détectés (suspicion de spam/phishing).');
  }

  // 3. Détection de canaux externes pour déporter la conversation (Telegram / WhatsApp)
  if (/(contacte\s*moi\s*sur|ecris\s*moi\s*sur|mon\s*numero\s*c\s*est|rejoins\s*moi\s*sur)\s*(whatsapp|telegram|signal|snapchat)/i.test(text)) {
    riskScore += 25;
    reasons.push('Tentative de détournement de la conversation hors de la plateforme sécurisée.');
  }

  // 4. Détection de texte tout en majuscules (cri/spam)
  if (text.length > 35 && text === text.toUpperCase() && /[A-Z]/.test(text)) {
    riskScore += 15;
    reasons.push('Texte entièrement en majuscules (spam visuel).');
  }

  const uniqueReasons = Array.from(new Set(reasons));
  const finalScore = Math.min(riskScore, 100);

  return {
    isClean: finalScore < 30,
    reasons: uniqueReasons,
    score: finalScore,
    alertLevel: finalScore >= 60 ? 'high' : finalScore >= 30 ? 'medium' : 'low',
    errorMessage: uniqueReasons.length > 0
      ? `🛡️ Alerte Sécurité Anti-Arnaque Troco :\n• ${uniqueReasons.join('\n• ')}`
      : undefined,
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
    sanitized = sanitized.replace(pattern, (match) => '*'.repeat(match.length));
  });

  return sanitized;
};
