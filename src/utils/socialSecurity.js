/**
 * Module de sécurité et d'analyse des réseaux sociaux pour Troco
 * - Filtre strict anti-NSFW (OnlyFans, Fansly, MYM, etc.)
 * - Parsing d'URL et détection des plateformes (GitHub, LinkedIn, Instagram, X/Twitter, etc.)
 * - Normalisation et validation de confiance
 */

// Regex stricte pour détecter les plateformes réservées aux adultes / NSFW
export const NSFW_PLATFORMS_REGEX = /(?:https?:\/\/)?(?:[a-zA-Z0-9-]+\.)*(?:onlyfans\.com|fansly\.com|mym\.fans|mymfans\.com|manyvids\.com|patreon\.com\/.*(?:18\+|nsfw)|chaturbate\.com|cam4\.com|stripchat\.com|pornhub\.com|xhamster\.com|xvideos\.com|redtube\.com|youporn\.com)(?:[\/?#].*)?$/i;

// Regex pour les mots-clés d'URL directs
export const NSFW_KEYWORDS_REGEX = /(onlyfans|fansly|mym\.fans|mymfans)/i;

/**
 * Valide une URL de réseau social ou de portfolio
 * @param {string} rawUrl - L'URL brute saisie par l'utilisateur
 * @returns {{ isValid: boolean, errorMessage?: string, sanitizedUrl?: string }}
 */
export const validateSocialLink = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { isValid: false, errorMessage: 'Veuillez saisir une URL valide.' };
  }

  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return { isValid: false, errorMessage: 'L\'URL ne peut pas être vide.' };
  }

  // Vérification de sécurité NSFW
  if (NSFW_PLATFORMS_REGEX.test(trimmed) || NSFW_KEYWORDS_REGEX.test(trimmed)) {
    return {
      isValid: false,
      errorMessage: "Ce type de plateforme n'est pas autorisé sur Troco"
    };
  }

  // Normaliser le protocole si manquant
  let normalizedUrl = trimmed;
  if (!/^https?:\/\//i.test(normalizedUrl)) {
    normalizedUrl = `https://${normalizedUrl}`;
  }

  // Vérification de la structure URL standard
  try {
    const parsed = new URL(normalizedUrl);
    if (!parsed.hostname || !parsed.hostname.includes('.')) {
      return { isValid: false, errorMessage: 'Veuillez saisir un nom de domaine valide (ex: linkedin.com/in/nom).' };
    }

    return {
      isValid: true,
      sanitizedUrl: parsed.toString()
    };
  } catch (err) {
    return {
      isValid: false,
      errorMessage: 'Le format de l\'URL est invalide. Exemple : https://linkedin.com/in/nom'
    };
  }
};

/**
 * Analyse une URL et extrait la plateforme, l'icône, le label, et le nom d'utilisateur/handle
 * @param {string} url - URL du lien social
 * @returns {{
 *   platform: 'github'|'linkedin'|'instagram'|'twitter'|'youtube'|'facebook'|'dribbble'|'behance'|'tiktok'|'discord'|'website',
 *   label: string,
 *   handle: string,
 *   cleanUrl: string,
 *   domain: string,
 *   brandColor: string,
 *   brandBg: string,
 *   brandBorder: string
 * }}
 */
export const parseSocialLink = (url) => {
  if (!url || typeof url !== 'string') {
    return {
      platform: 'website',
      label: 'Site Web',
      handle: '',
      cleanUrl: '#',
      domain: '',
      brandColor: 'var(--accent-primary)',
      brandBg: 'var(--bg-subtle)',
      brandBorder: 'var(--border-color)',
    };
  }

  const trimmed = url.trim();
  const validProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let hostname = '';
  let pathname = '';

  try {
    const parsed = new URL(validProtocol);
    hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
    pathname = parsed.pathname.replace(/\/+$/, '');
  } catch (e) {
    hostname = trimmed.toLowerCase();
  }

  // Détection GitHub
  if (hostname.includes('github.com')) {
    const match = pathname.match(/^\/([a-zA-Z0-9-_]+)/);
    const user = match ? `@${match[1]}` : 'GitHub';
    return {
      platform: 'github',
      label: 'GitHub',
      handle: user,
      cleanUrl: validProtocol,
      domain: 'github.com',
      brandColor: '#24292e',
      brandBg: 'rgba(36, 41, 46, 0.08)',
      brandBorder: 'rgba(36, 41, 46, 0.25)',
    };
  }

  // Détection LinkedIn
  if (hostname.includes('linkedin.com')) {
    const match = pathname.match(/^\/(?:in|company)\/([a-zA-Z0-9-_%]+)/);
    const user = match ? decodeURIComponent(match[1]) : 'LinkedIn';
    return {
      platform: 'linkedin',
      label: 'LinkedIn',
      handle: user,
      cleanUrl: validProtocol,
      domain: 'linkedin.com',
      brandColor: '#0077b5',
      brandBg: 'rgba(0, 119, 181, 0.1)',
      brandBorder: 'rgba(0, 119, 181, 0.3)',
    };
  }

  // Détection Instagram
  if (hostname.includes('instagram.com') || hostname.includes('instagr.am')) {
    const match = pathname.match(/^\/([a-zA-Z0-9-_\.]+)/);
    const user = match ? `@${match[1]}` : 'Instagram';
    return {
      platform: 'instagram',
      label: 'Instagram',
      handle: user,
      cleanUrl: validProtocol,
      domain: 'instagram.com',
      brandColor: '#E1306C',
      brandBg: 'rgba(225, 48, 108, 0.1)',
      brandBorder: 'rgba(225, 48, 108, 0.3)',
    };
  }

  // Détection X / Twitter
  if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
    const match = pathname.match(/^\/([a-zA-Z0-9-_]+)/);
    const user = match ? `@${match[1]}` : 'X';
    return {
      platform: 'twitter',
      label: 'X (Twitter)',
      handle: user,
      cleanUrl: validProtocol,
      domain: hostname.includes('x.com') ? 'x.com' : 'twitter.com',
      brandColor: '#0f1419',
      brandBg: 'rgba(15, 20, 25, 0.08)',
      brandBorder: 'rgba(15, 20, 25, 0.25)',
    };
  }

  // Détection YouTube
  if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
    const match = pathname.match(/^\/@?([a-zA-Z0-9-_]+)/);
    const channel = match ? `@${match[1]}` : 'YouTube';
    return {
      platform: 'youtube',
      label: 'YouTube',
      handle: channel,
      cleanUrl: validProtocol,
      domain: 'youtube.com',
      brandColor: '#FF0000',
      brandBg: 'rgba(255, 0, 0, 0.08)',
      brandBorder: 'rgba(255, 0, 0, 0.25)',
    };
  }

  // Détection Dribbble
  if (hostname.includes('dribbble.com')) {
    const match = pathname.match(/^\/([a-zA-Z0-9-_]+)/);
    const user = match ? `@${match[1]}` : 'Dribbble';
    return {
      platform: 'dribbble',
      label: 'Dribbble',
      handle: user,
      cleanUrl: validProtocol,
      domain: 'dribbble.com',
      brandColor: '#ea4c89',
      brandBg: 'rgba(234, 76, 137, 0.1)',
      brandBorder: 'rgba(234, 76, 137, 0.3)',
    };
  }

  // Détection Behance
  if (hostname.includes('behance.net')) {
    const match = pathname.match(/^\/([a-zA-Z0-9-_]+)/);
    const user = match ? `@${match[1]}` : 'Behance';
    return {
      platform: 'behance',
      label: 'Behance',
      handle: user,
      cleanUrl: validProtocol,
      domain: 'behance.net',
      brandColor: '#1769ff',
      brandBg: 'rgba(23, 105, 255, 0.1)',
      brandBorder: 'rgba(23, 105, 255, 0.3)',
    };
  }

  // Détection TikTok
  if (hostname.includes('tiktok.com')) {
    const match = pathname.match(/^\/@?([a-zA-Z0-9-_\.]+)/);
    const user = match ? `@${match[1]}` : 'TikTok';
    return {
      platform: 'tiktok',
      label: 'TikTok',
      handle: user,
      cleanUrl: validProtocol,
      domain: 'tiktok.com',
      brandColor: '#fe2c55',
      brandBg: 'rgba(254, 44, 85, 0.1)',
      brandBorder: 'rgba(254, 44, 85, 0.3)',
    };
  }

  // Détection Discord
  if (hostname.includes('discord.gg') || hostname.includes('discord.com')) {
    return {
      platform: 'discord',
      label: 'Discord',
      handle: 'Serveur Discord',
      cleanUrl: validProtocol,
      domain: hostname,
      brandColor: '#5865F2',
      brandBg: 'rgba(88, 101, 242, 0.1)',
      brandBorder: 'rgba(88, 101, 242, 0.3)',
    };
  }

  // Détection Facebook
  if (hostname.includes('facebook.com') || hostname.includes('fb.com')) {
    const match = pathname.match(/^\/([a-zA-Z0-9-_\.]+)/);
    const user = match ? `${match[1]}` : 'Facebook';
    return {
      platform: 'facebook',
      label: 'Facebook',
      handle: user,
      cleanUrl: validProtocol,
      domain: 'facebook.com',
      brandColor: '#1877f2',
      brandBg: 'rgba(24, 119, 242, 0.1)',
      brandBorder: 'rgba(24, 119, 242, 0.3)',
    };
  }

  // Fallback : Portfolio / Site Web externe
  const cleanDomain = hostname.replace(/\/.*$/, '');
  return {
    platform: 'website',
    label: cleanDomain || 'Portfolio',
    handle: cleanDomain || 'Lien externe',
    cleanUrl: validProtocol,
    domain: cleanDomain,
    brandColor: 'var(--accent-primary)',
    brandBg: 'var(--bg-subtle)',
    brandBorder: 'var(--border-color)',
  };
};
