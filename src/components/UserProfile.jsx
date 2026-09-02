import React, { useState, useId } from 'react';
import {
  Globe,
  ExternalLink,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle,
  ShieldCheck,
  Star,
  MapPin,
  Pencil,
  Link as LinkIcon
} from 'lucide-react';
import { validateSocialLink, parseSocialLink } from '../utils/socialSecurity';

/**
 * Composant d'icône officielle pour les réseaux sociaux avec rendu SVG ultra-précis
 */
export function SocialIcon({ platform, size = 18, color = 'currentColor' }) {
  switch (platform) {
    case 'github':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
          <path d="M9 18c-4.51 2-5-2-7-2" />
        </svg>
      );
    case 'linkedin':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
          <rect width="4" height="12" x="2" y="9" />
          <circle cx="4" cy="4" r="2" />
        </svg>
      );
    case 'instagram':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
          <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
        </svg>
      );
    case 'twitter':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );
    case 'youtube':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
          <polygon points="10 15 15 12 10 9 10 15" fill={color} />
        </svg>
      );
    case 'dribbble':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M19.13 5.09C15.22 9.14 10 10.44 2.25 10.94" />
          <path d="M21.75 12.84c-6.62-1.41-12.14 1-16.38 6.32" />
          <path d="M8.56 2.75c4.37 6 6 9.42 8 17.72" />
        </svg>
      );
    case 'behance':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
          <path d="M22 7h-7v-2h7v2zm1.726 10c-.442 1.297-2.029 3-4.726 3-3.09 0-5.328-2.091-5.328-5.351 0-3.328 2.37-5.649 5.37-5.649 3.036 0 4.887 2.128 4.887 5.257 0 .438-.044.832-.072 1.054h-7.657c.074 1.637 1.238 2.689 2.8 2.689 1.408 0 2.222-.647 2.626-1.551l2.1.551zm-4.726-5.851c-1.396 0-2.221.947-2.43 2.138h4.743c-.08-1.258-.87-2.138-2.313-2.138zm-12.75-6.149h-6.25v14h6.541c3.151 0 5.209-1.639 5.209-4.57 0-1.729-.915-3.085-2.359-3.694 1.137-.624 1.859-1.848 1.859-3.275 0-2.617-1.93-2.461-5-2.461zm-3.75 5.5v-3.25h3.25c1.479 0 2.25.688 2.25 1.625 0 1.011-.854 1.625-2.25 1.625h-3.25zm0 6.25v-3.75h3.625c1.551 0 2.375.767 2.375 1.875 0 1.171-.902 1.875-2.375 1.875h-3.625z" />
        </svg>
      );
    case 'tiktok':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-1.01-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
        </svg>
      );
    case 'discord':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
        </svg>
      );
    case 'facebook':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
        </svg>
      );
    case 'website':
    default:
      return <Globe size={size} color={color} />;
  }
}

/**
 * Affiche la liste des liens sociaux vérifiés sous forme de badges stylisés cliquables
 */
export function SocialLinksDisplay({
  links = [],
  size = 'medium', // 'small' | 'medium' | 'large'
  showLabels = true,
  className = '',
  style = {},
}) {
  const validLinks = Array.isArray(links) ? links.filter(Boolean) : [];

  if (validLinks.length === 0) {
    return null;
  }

  const isSmall = size === 'small';
  const isLarge = size === 'large';

  return (
    <div
      className={`troco-social-links-display ${className}`}
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: isSmall ? '6px' : isLarge ? '12px' : '8px',
        alignItems: 'center',
        ...style,
      }}
    >
      {validLinks.map((url, idx) => {
        const parsed = parseSocialLink(url);
        return (
          <a
            key={`${parsed.platform}-${idx}-${url}`}
            href={parsed.cleanUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={`${parsed.label} : ${parsed.handle || parsed.domain}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: isSmall ? '5px' : '8px',
              padding: isSmall ? '4px 8px' : isLarge ? '8px 16px' : '6px 12px',
              borderRadius: isSmall ? '8px' : '12px',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
              textDecoration: 'none',
              fontSize: isSmall ? '11px' : isLarge ? '14px' : '12px',
              fontWeight: '700',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.borderColor = parsed.brandColor || 'var(--accent-primary)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'var(--border-color)';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
            }}
          >
            <span style={{ color: parsed.brandColor || 'var(--accent-primary)', display: 'flex', alignItems: 'center' }}>
              <SocialIcon platform={parsed.platform} size={isSmall ? 13 : isLarge ? 18 : 15} color={parsed.brandColor} />
            </span>
            {showLabels && (
              <span style={{ letterSpacing: '-0.01em' }}>
                {parsed.label}
              </span>
            )}
            <ExternalLink size={isSmall ? 10 : 12} style={{ opacity: 0.5, marginLeft: '2px' }} />
          </a>
        );
      })}
    </div>
  );
}

/**
 * Interface d'édition sécurisée des réseaux sociaux avec filtre NSFW
 */
export function SocialLinksEditor({
  socialLinks = [],
  onChange,
  onAdd,
  onRemove,
  darkMode = false,
}) {
  const [inputUrl, setInputUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const inputId = useId();

  // Suggestions rapides pour inciter à ajouter des plateformes professionnelles
  const quickPlatforms = [
    { name: 'LinkedIn', domain: 'https://linkedin.com/in/', icon: 'linkedin' },
    { name: 'GitHub', domain: 'https://github.com/', icon: 'github' },
    { name: 'Instagram', domain: 'https://instagram.com/', icon: 'instagram' },
    { name: 'X / Twitter', domain: 'https://x.com/', icon: 'twitter' },
    { name: 'Portfolio', domain: 'https://', icon: 'website' },
  ];

  const handleAddLink = (rawUrlToAdd) => {
    const url = (rawUrlToAdd || inputUrl).trim();
    if (!url) {
      setErrorMessage('Veuillez renseigner une adresse URL.');
      return;
    }

    // Validation stricte NSFW + structure
    const validation = validateSocialLink(url);
    if (!validation.isValid) {
      setErrorMessage(validation.errorMessage || 'Lien non autorisé.');
      setIsSuccess(false);
      return;
    }

    const sanitized = validation.sanitizedUrl;

    // Éviter les doublons
    if (socialLinks.includes(sanitized)) {
      setErrorMessage('Ce lien est déjà ajouté à votre profil.');
      setIsSuccess(false);
      return;
    }

    const nextLinks = [...socialLinks, sanitized];
    if (onChange) onChange(nextLinks);
    if (onAdd) onAdd(sanitized);

    setInputUrl('');
    setErrorMessage('');
    setIsSuccess(true);
    setTimeout(() => setIsSuccess(false), 2500);
  };

  const handleRemoveLink = (indexToRemove) => {
    const nextLinks = socialLinks.filter((_, idx) => idx !== indexToRemove);
    if (onChange) onChange(nextLinks);
    if (onRemove) onRemove(indexToRemove);
  };

  const currentPreview = inputUrl.trim() ? parseSocialLink(inputUrl.trim()) : null;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        backgroundColor: 'var(--bg-card)',
        borderRadius: '18px',
        padding: '18px',
        border: '1px solid var(--border-color)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <label
          htmlFor={inputId}
          style={{
            fontSize: '14px',
            fontWeight: '800',
            color: 'var(--text-main)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <LinkIcon size={16} color="var(--accent-primary)" /> Réseaux Sociaux & Portfolio Sécurisés
        </label>
        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>
          {socialLinks.length} lien{socialLinks.length !== 1 ? 's' : ''} actif{socialLinks.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
        Ajoutez vos profils (LinkedIn, GitHub, Portfolio...) pour instaurer la confiance avec vos futurs partenaires d'échange sur Troco.
      </div>

      {/* Raccourcis de plateformes recommandées */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {quickPlatforms.map((qp) => (
          <button
            key={qp.name}
            type="button"
            onClick={() => {
              if (!inputUrl.startsWith(qp.domain)) {
                setInputUrl(qp.domain);
                setErrorMessage('');
              }
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 10px',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: '700',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--text-main)';
              e.currentTarget.style.borderColor = 'var(--accent-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-secondary)';
              e.currentTarget.style.borderColor = 'var(--border-color)';
            }}
          >
            <SocialIcon platform={qp.icon} size={12} />
            + {qp.name}
          </button>
        ))}
      </div>

      {/* Champ d'ajout de lien avec détection temps réel */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            id={inputId}
            type="url"
            value={inputUrl}
            onChange={(e) => {
              setInputUrl(e.target.value);
              if (errorMessage) setErrorMessage('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddLink();
              }
            }}
            placeholder="Ex : https://linkedin.com/in/monprofil ou github.com/username"
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '10px 14px 10px 38px',
              borderRadius: '12px',
              border: `1px solid ${errorMessage ? 'var(--accent-danger, #EF4444)' : 'var(--border-color)'}`,
              fontSize: '13px',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-main)',
              outline: 'none',
              transition: 'border-color 0.2s ease',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: currentPreview ? currentPreview.brandColor : 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {currentPreview ? (
              <SocialIcon platform={currentPreview.platform} size={16} color={currentPreview.brandColor} />
            ) : (
              <Globe size={16} />
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => handleAddLink()}
          disabled={!inputUrl.trim()}
          style={{
            border: 'none',
            borderRadius: '12px',
            padding: '10px 18px',
            background: inputUrl.trim()
              ? 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)'
              : 'var(--bg-subtle)',
            color: inputUrl.trim() ? '#FFF' : 'var(--text-secondary)',
            fontWeight: '800',
            fontSize: '13px',
            cursor: inputUrl.trim() ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: inputUrl.trim() ? 'var(--shadow-accent)' : 'none',
            transition: 'all 0.2s ease',
            flexShrink: 0,
          }}
        >
          <Plus size={16} /> Ajouter
        </button>
      </div>

      {/* Message d'erreur NSFW ou de validation */}
      {errorMessage && (
        <div
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 14px',
            borderRadius: '10px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: 'var(--accent-danger, #EF4444)',
            fontSize: '12px',
            fontWeight: '700',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Confirmation d'ajout réussi */}
      {isSuccess && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            borderRadius: '10px',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: 'var(--accent-success, #10B981)',
            fontSize: '12px',
            fontWeight: '700',
          }}
        >
          <CheckCircle size={15} /> Lien validé et ajouté avec succès !
        </div>
      )}

      {/* Liste des liens déjà enregistrés */}
      {socialLinks.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
          {socialLinks.map((url, idx) => {
            const parsed = parseSocialLink(url);
            return (
              <div
                key={`${url}-${idx}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--bg-subtle)',
                  border: '1px solid var(--border-color)',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <span style={{ color: parsed.brandColor, display: 'flex', alignItems: 'center' }}>
                    <SocialIcon platform={parsed.platform} size={18} color={parsed.brandColor} />
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)' }}>
                      {parsed.label}
                    </div>
                    <div
                      style={{
                        fontSize: '11px',
                        color: 'var(--text-secondary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '300px',
                      }}
                    >
                      {url}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <a
                    href={parsed.cleanUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '6px',
                      borderRadius: '8px',
                      color: 'var(--text-secondary)',
                      textDecoration: 'none',
                    }}
                    title="Tester le lien"
                  >
                    <ExternalLink size={14} />
                  </a>
                  <button
                    type="button"
                    onClick={() => handleRemoveLink(idx)}
                    style={{
                      border: 'none',
                      background: 'none',
                      padding: '6px',
                      borderRadius: '8px',
                      color: 'var(--accent-danger, #EF4444)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title="Supprimer ce lien"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div
          style={{
            textAlign: 'center',
            padding: '16px',
            borderRadius: '12px',
            border: '1px dashed var(--border-color)',
            color: 'var(--text-secondary)',
            fontSize: '12px',
            fontWeight: '600',
          }}
        >
          Aucun lien social externe pour l'instant.
        </div>
      )}
    </div>
  );
}

/**
 * Composant complet de profil utilisateur UserProfile
 * Utilisable en mode visualisation ou en mode édition complète
 */
export default function UserProfile({
  profile = {},
  isEditing = false,
  onSave,
  onCancel,
  onEditToggle,
  darkMode = false,
}) {
  const [draft, setDraft] = useState({
    name: profile.name || '',
    username: profile.username || '',
    bio: profile.bio || '',
    location: profile.location || '',
    socialLinks: Array.isArray(profile.socialLinks) ? profile.socialLinks : [],
  });

  const [validationError, setValidationError] = useState('');

  const handleSave = () => {
    // Vérifier les liens sociaux contre le filtre NSFW
    if (Array.isArray(draft.socialLinks)) {
      for (const link of draft.socialLinks) {
        const val = validateSocialLink(link);
        if (!val.isValid) {
          setValidationError(val.errorMessage || 'Lien invalide.');
          return;
        }
      }
    }

    setValidationError('');
    if (onSave) {
      onSave({
        ...profile,
        ...draft,
      });
    }
  };

  const cardStyle = {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '24px',
    padding: '24px',
    border: '1px solid var(--border-color)',
    boxShadow: 'var(--shadow-card)',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      {/* Carte Principale de Profil */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap' }}>
          {/* Avatar */}
          <div style={{ position: 'relative' }}>
            <div
              style={{
                width: '88px',
                height: '88px',
                borderRadius: '50%',
                overflow: 'hidden',
                border: '3px solid var(--accent-primary)',
                boxShadow: 'var(--shadow-accent)',
              }}
            >
              <img
                src={profile.avatar || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80'}
                alt={profile.name || 'Profil'}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          </div>

          {/* Informations */}
          <div style={{ flex: 1, minWidth: '240px' }}>
            {!isEditing ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
                  <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: 'var(--text-main)' }}>
                    {profile.name || 'Membre Troco'}
                  </h2>
                  <span style={{ fontSize: '13px', color: 'var(--accent-primary)', fontWeight: '700' }}>
                    {profile.username || '@membre'}
                  </span>
                  {profile.kycVerified && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        backgroundColor: 'var(--bg-subtle)',
                        color: 'var(--accent-success)',
                        fontSize: '11px',
                        fontWeight: '800',
                        padding: '2px 8px',
                        borderRadius: '999px',
                        border: '1px solid var(--border-color)',
                      }}
                    >
                      <ShieldCheck size={13} /> Vérifié
                    </span>
                  )}
                </div>

                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 14px' }}>
                  {profile.bio || 'Aucune biographie renseignée.'}
                </p>

                {/* Liens sociaux avec icônes officielles */}
                <div style={{ marginBottom: '14px' }}>
                  <SocialLinksDisplay links={profile.socialLinks || []} size="medium" />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={14} /> {profile.location || 'France'}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-warning)', fontWeight: '800' }}>
                    <Star size={14} fill="var(--accent-warning)" /> {profile.rating || 5.0} ({profile.reviews || 0} avis)
                  </span>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input
                  type="text"
                  value={draft.name}
                  onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Nom complet"
                  style={{
                    padding: '10px 12px',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    fontSize: '14px',
                    fontWeight: '700',
                  }}
                />
                <input
                  type="text"
                  value={draft.username}
                  onChange={(e) => setDraft((prev) => ({ ...prev, username: e.target.value }))}
                  placeholder="@pseudo"
                  style={{
                    padding: '10px 12px',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    fontSize: '13px',
                  }}
                />
                <textarea
                  rows={3}
                  value={draft.bio}
                  onChange={(e) => setDraft((prev) => ({ ...prev, bio: e.target.value }))}
                  placeholder="Biographie..."
                  style={{
                    padding: '10px 12px',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    fontSize: '13px',
                    resize: 'vertical',
                  }}
                />

                {/* Gestionnaire de réseaux sociaux en mode édition */}
                <SocialLinksEditor
                  socialLinks={draft.socialLinks}
                  onChange={(newLinks) => setDraft((prev) => ({ ...prev, socialLinks: newLinks }))}
                  darkMode={darkMode}
                />
              </div>
            )}

            {validationError && (
              <div
                style={{
                  marginTop: '12px',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  color: 'var(--accent-danger, #EF4444)',
                  fontSize: '12px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <AlertCircle size={15} /> {validationError}
              </div>
            )}

            {/* Boutons d'action */}
            <div style={{ marginTop: '16px', display: 'flex', gap: '10px' }}>
              {!isEditing ? (
                <button
                  type="button"
                  onClick={onEditToggle}
                  className="premium-button"
                  style={{
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    padding: '8px 16px',
                    backgroundColor: 'var(--bg-subtle)',
                    color: 'var(--text-main)',
                    fontWeight: '800',
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Pencil size={14} /> Modifier le profil
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onCancel}
                    className="premium-button"
                    style={{
                      border: '1px solid var(--border-color)',
                      borderRadius: '12px',
                      padding: '8px 16px',
                      backgroundColor: 'var(--bg-subtle)',
                      color: 'var(--text-secondary)',
                      fontWeight: '700',
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="premium-button"
                    style={{
                      border: 'none',
                      borderRadius: '12px',
                      padding: '8px 16px',
                      background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)',
                      color: '#FFF',
                      fontWeight: '800',
                      fontSize: '13px',
                      cursor: 'pointer',
                      boxShadow: 'var(--shadow-accent)',
                    }}
                  >
                    Enregistrer
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
