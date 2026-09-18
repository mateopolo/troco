import React from 'react';

/**
 * displayName.js — Utilitaire central de noms d'affichage.
 *
 * RÈGLE ABSOLUE : l'identifiant technique unique Firebase (UID alphanumérique
 * genre "Ey8n3OHnwLM2dwbi66XdV5loCqW2") peut rester stocké en base pour la
 * sécurité des transactions, mais ne doit JAMAIS être rendu comme nom visible.
 */

/**
 * Détecte un identifiant technique brut (UID Firebase ou équivalent) :
 * - 18 caractères ou plus
 * - uniquement alphanumérique (aucun espace, aucun séparateur)
 * - contient au moins un chiffre ET une lettre, OU une alternance casse typique
 */
export const isTechnicalId = (value) => {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (trimmed.length < 18) return false;
  if (/\s/.test(trimmed)) return false;
  if (!/^[A-Za-z0-9_-]+$/.test(trimmed)) return false;
  const hasLetter = /[A-Za-z]/.test(trimmed);
  const hasDigit = /[0-9]/.test(trimmed);
  if (hasLetter && hasDigit) return true;
  // UID Firebase modernes : 28 caractères aléatoires mixant casse sans chiffres
  if (trimmed.length >= 24 && /[a-z]/.test(trimmed) && /[A-Z]/.test(trimmed)) return true;
  return false;
};

/** Retourne le premier nom "humain" valable, sinon une chaîne vide. */
export const getHumanName = (...candidates) => {
  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue;
    const trimmed = candidate.trim();
    if (!trimmed) continue;
    if (isTechnicalId(trimmed)) continue;
    if (/^(null|undefined|utilisateur\s*troco|anonymous|anonyme)$/i.test(trimmed) && trimmed.length < 20) {
      // "Utilisateur Troco" reste acceptable comme nom par défaut explicite
      if (!/^utilisateur troco$/i.test(trimmed)) continue;
    }
    return trimmed;
  }
  return '';
};

/**
 * Nom d'affichage résolu à partir d'un objet profil.
 * Ordre : name → displayName → username → email-prefix → "Utilisateur".
 */
export const getDisplayName = (user, t) => {
  if (!user || typeof user !== 'object') return (t && t('common.user', 'Utilisateur')) || 'Utilisateur';
  const fallbackLabel = (t && t('common.user', 'Utilisateur')) || 'Utilisateur';
  return (
    getHumanName(user.name, user.displayName, user.user, user.fullName) ||
    getHumanName(user.username) ||
    humanizeEmailPrefix((user.email || '').split('@')[0]) ||
    fallbackLabel
  );
};

/** Handle @username affichable : dérivé du nom réel, jamais de l'UID. */
export const getDisplayUsername = (user, t) => {
  if (!user || typeof user !== 'object') return '@membre';
  const base = getHumanName(user.username) || getHumanName(user.name, user.displayName);
  if (base) return `@${slugifyUsername(base)}`;
  const emailPrefix = (user.email || '').split('@')[0];
  if (emailPrefix && !isTechnicalId(emailPrefix)) return `@${slugifyUsername(emailPrefix)}`;
  return (t && t('profile.default_handle', '@membre')) || '@membre';
};

/** "Jean-Marie.DUPONT_99" → "jeanmariedupont99" */
export const slugifyUsername = (value = '') => {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 24) || 'membre';
};

/** "john.doe" → "John Doe" — "marie-claire" → "Marie Claire" — "a1b2c3..." → "" */
export const humanizeEmailPrefix = (prefix = '') => {
  if (!prefix || isTechnicalId(prefix)) return '';
  const cleaned = String(prefix)
    .replace(/[0-9]+$/g, '')
    .split(/[._\-+]+/)
    .filter(Boolean)
    .filter((part) => part.length > 1)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase());
  if (cleaned.length === 0) return '';
  return cleaned.join(' ').slice(0, 40);
};

/**
 * Handle d'inscription (@username) : minuscule, sans espaces ni caractères
 * spéciaux. Suffixe court uniquement si la base est vide/trop faible pour
 * rester unique (les collisions exactes sont rares et résorbables en profil).
 */
export const buildUsernameHandle = (base = '', seed = '') => {
  const slug = slugifyUsername(base);
  if (slug && slug !== 'membre') return `@${slug}`;
  const seedSlug = slugifyUsername(seed).slice(-4);
  const random = Math.random().toString(36).slice(2, 6);
  return `@membre${seedSlug || random}`;
};

/**
 * Garde-fou anti-fuite : remplace tout identifiant technique brut par un
 * libellé humain. À utiliser sur TOUT nom affiché dans l'UI (chat, titres,
 * mentions, listes de conversations).
 */
export const safeName = (value, fallback = 'Utilisateur') => {
  const human = getHumanName(value);
  return human || fallback;
};

/** Nom Google → nom de profil Firestore ("Jean Dupont"), avec fallback email. */
export const deriveDisplayName = (firebaseUser = {}) => {
  const googleName = (firebaseUser.displayName || '').trim();
  if (googleName && !isTechnicalId(googleName)) return googleName;
  const emailPrefix = (firebaseUser.email || '').split('@')[0] || '';
  const humanized = humanizeEmailPrefix(emailPrefix);
  if (humanized) return humanized;
  return 'Membre Troco';
};

export default {
  isTechnicalId,
  getHumanName,
  getDisplayName,
  getDisplayUsername,
  slugifyUsername,
  humanizeEmailPrefix,
  buildUsernameHandle,
  deriveDisplayName,
  safeName,
};
