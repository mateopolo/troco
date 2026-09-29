import React, { useState, useEffect, useRef } from 'react';
import { Mail, Check, X, ShieldCheck } from 'lucide-react';
import UniversalModal from '../ui/UniversalModal';
import { useLanguage } from '../../contexts/LanguageContext';

export default function EmailLinkPromptModal({
  isOpen,
  onConfirm,
  onClose,
  darkMode = false,
}) {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setError('');
      setIsSubmitting(false);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setError(t('invalid_email', 'Veuillez saisir une adresse email valide.'));
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      await onConfirm(cleanEmail);
    } catch (err) {
      setError(err?.message || t('email_link_error', 'Erreur lors de la validation du lien.'));
      setIsSubmitting(false);
    }
  };

  return (
    <UniversalModal
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel={t('confirm_email_link_title', 'Finaliser la connexion')}
      showCloseButton={false}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: darkMode ? '#1F1B18' : '#FAF7F2',
          borderRadius: '24px',
          padding: '24px',
          boxShadow: darkMode ? '0 25px 60px rgba(0,0,0,0.8)' : '0 25px 60px rgba(61,53,48,0.25)',
          border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3',
          position: 'relative',
        }}
      >
        <button
          onClick={onClose}
          type="button"
          aria-label={t('cancelBtn', 'Fermer')}
          style={{
            position: 'absolute',
            top: '14px',
            right: '14px',
            border: 'none',
            backgroundColor: darkMode ? 'rgba(232,221,211,0.1)' : '#F5EAE4',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: darkMode ? '#FAF7F2' : '#3D3530',
          }}
        >
          <X size={16} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              backgroundColor: 'rgba(198, 125, 91, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-primary, #C67D5B)',
            }}
          >
            <ShieldCheck size={22} />
          </div>
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: '800',
                color: darkMode ? '#FAF7F2' : '#3D3530',
              }}
            >
              {t('email_link_modal_title', 'Connexion sécurisée')}
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: '12px',
                color: darkMode ? '#A89F91' : '#7D6E65',
              }}
            >
              {t('email_link_modal_subtitle', 'Lien magique détecté')}
            </p>
          </div>
        </div>

        <p
          style={{
            fontSize: '13px',
            color: darkMode ? '#D4C5B5' : '#6B5E54',
            lineHeight: 1.5,
            marginBottom: '18px',
          }}
        >
          {t('email_link_modal_desc', 'Pour des raisons de sécurité, veuillez confirmer votre adresse email pour valider ce lien et finaliser votre connexion :')}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ position: 'relative' }}>
            <Mail
              size={18}
              style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: darkMode ? '#A89F91' : '#7D6E65',
              }}
            />
            <input
              ref={inputRef}
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError('');
              }}
              placeholder="votre.email@exemple.com"
              required
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '12px 14px 12px 42px',
                borderRadius: '12px',
                border: error
                  ? '1px solid #EF4444'
                  : darkMode
                    ? '1px solid rgba(232,221,211,0.2)'
                    : '1px solid #D5C7BC',
                backgroundColor: darkMode ? '#2B2622' : '#FFFFFF',
                color: darkMode ? '#FAF7F2' : '#2D2825',
                fontSize: '14px',
                outline: 'none',
              }}
            />
          </div>

          {error && (
            <div style={{ fontSize: '12px', color: '#EF4444', fontWeight: '600' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '12px',
                border: darkMode ? '1px solid rgba(232,221,211,0.2)' : '1px solid #D5C7BC',
                backgroundColor: 'transparent',
                color: darkMode ? '#D4C5B5' : '#6B5E54',
                fontWeight: '700',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              {t('cancelBtn', 'Annuler')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="premium-button"
              style={{
                flex: 2,
                padding: '12px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #C67D5B 0%, #A8644A 100%)',
                color: '#FFFFFF',
                fontWeight: '800',
                fontSize: '13px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 8px 16px rgba(198,125,91,0.25)',
              }}
            >
              {isSubmitting ? (
                <span>{t('validating', 'Vérification...')}</span>
              ) : (
                <>
                  <Check size={16} />
                  <span>{t('confirmBtn', 'Valider la connexion')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </UniversalModal>
  );
}
