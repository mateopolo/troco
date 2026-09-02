import React from 'react';
import { Sparkles, Phone } from 'lucide-react';
import TrocoLogo from './common/TrocoLogo';

export default function AuthScreen({
  authError,
  authStep,
  setAuthStep,
  setAuthError,
  authPhoneNumber,
  setAuthPhoneNumber,
  authSmsCode,
  setAuthSmsCode,
  authEmail,
  setAuthEmail,
  authLoading,
  handleSendSms,
  handleVerifySmsCode,
  handleSendEmailLink,
  handleGoogleSignIn,
  handleConfirmDemoAuth
}) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #F5F5F7 0%, #E8F7F1 100%)',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif",
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
    }}>
      <div id="recaptcha-container"></div>
      <div style={{
        width: '100%', maxWidth: '520px',
        backgroundColor: 'rgba(255,255,255,0.75)',
        backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        borderRadius: '28px', boxShadow: '0 24px 60px rgba(15, 23, 42, 0.10)',
        border: '1px solid rgba(255,255,255,0.7)', overflow: 'hidden'
      }}>
        <div style={{ padding: '32px 28px 18px' }}>
          {/* LOGO DYNAMIQUE TROCO */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
            <TrocoLogo size={42} style={{ color: 'var(--accent-primary, #C67D5B)' }} />
            <div>
              <span
                style={{
                  fontSize: '26px',
                  fontWeight: '800',
                  color: '#111827',
                  letterSpacing: '-0.02em',
                  display: 'block',
                  lineHeight: 1.1,
                }}
              >
                Troco
              </span>
              <span style={{ fontSize: '11px', color: '#64748B', letterSpacing: '0.04em' }}>
                Plateforme d'échanges & savoir-faire
              </span>
            </div>
          </div>

          <div style={{
            display: 'inline-flex', alignItems: 'center', padding: '8px 12px',
            borderRadius: '999px', backgroundColor: '#EFF6FF', color: '#04265A',
            fontSize: '12px', fontWeight: '700', marginBottom: '14px'
          }}>
            <Sparkles size={14} style={{ marginRight: '6px' }} />
            Bienvenue sur Troco
          </div>
          <h1 style={{ fontSize: '30px', fontWeight: '800', margin: '0 0 12px', color: '#111827', letterSpacing: '-0.02em' }}>
            Échange, partage, crée sans limites.
          </h1>
          <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.7, color: '#64748B' }}>
            Troco réinvente les services, les swaps et les prêts avec une expérience premium pensée pour les échanges humains.
          </p>
        </div>

        <div style={{ padding: '0 28px 28px' }}>
          {authError && (
            <div style={{ marginBottom: '14px', padding: '10px 14px', borderRadius: '12px', backgroundColor: '#FEF2F2', color: '#991B1B', fontSize: '12px', fontWeight: '600' }}>
              {authError}
            </div>
          )}

          {authStep === 'select' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
              <button
                onClick={handleGoogleSignIn}
                style={{
                  border: '1px solid rgba(226,232,240,0.9)', borderRadius: '16px', padding: '13px 14px',
                  backgroundColor: 'rgba(255,255,255,0.9)', boxShadow: '0 10px 20px -6px rgba(0,0,0,0.08)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                  fontWeight: '700', color: '#111827'
                }}
              >
                <span style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', color: '#4285F4' }}>G</span>
                Se connecter avec Google
              </button>
              <button
                onClick={() => { setAuthStep('phone'); setAuthError(''); }}
                style={{
                  border: 'none', borderRadius: '16px', padding: '13px 14px',
                  background: 'linear-gradient(135deg, #04265A 0%, #14B8A6 100%)', color: '#FFF',
                  cursor: 'pointer', fontWeight: '700', boxShadow: '0 12px 20px -6px rgba(4, 38, 90, 0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                }}
              >
                <Phone size={18} /> Se connecter avec son Téléphone (SMS)
              </button>
              <button
                onClick={() => { setAuthStep('email'); setAuthError(''); }}
                style={{
                  border: '1px solid rgba(226,232,240,0.9)', borderRadius: '16px', padding: '13px 14px',
                  backgroundColor: 'rgba(255,255,255,0.9)', boxShadow: '0 10px 20px -6px rgba(0,0,0,0.08)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  fontWeight: '700', color: '#111827'
                }}
              >
                <span>📧</span> Se connecter par Email (Lien magique)
              </button>
              <button
                onClick={() => handleConfirmDemoAuth('Démo Rapide')}
                style={{
                  border: '1px dashed #CBD5E1', borderRadius: '16px', padding: '10px 14px',
                  backgroundColor: '#F8FAFC', cursor: 'pointer', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: '8px', fontWeight: '600', color: '#64748B', fontSize: '12px'
                }}
              >
                ⚡ Accès Rapide Démo
              </button>
            </div>
          )}

          {authStep === 'phone' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: '700', color: '#111827' }}>Numéro de téléphone :</label>
              <input
                type="tel"
                value={authPhoneNumber}
                onChange={(e) => setAuthPhoneNumber(e.target.value)}
                placeholder="+33612345678"
                style={{ width: '100%', padding: '12px', border: '1px solid #D1D5DB', borderRadius: '14px', fontSize: '14px', fontWeight: '600' }}
              />
              <button
                disabled={authLoading}
                onClick={handleSendSms}
                style={{ border: 'none', borderRadius: '14px', padding: '12px', backgroundColor: '#04265A', color: '#FFF', fontWeight: '700', cursor: authLoading ? 'not-allowed' : 'pointer', opacity: authLoading ? 0.7 : 1 }}
              >
                {authLoading ? 'Envoi du SMS...' : 'Envoyer le code par SMS'}
              </button>
              <button onClick={() => { setAuthStep('select'); setAuthError(''); }} style={{ background: 'none', border: 'none', color: '#64748B', fontSize: '12px', cursor: 'pointer', textAlign: 'center' }}>
                ← Retour aux options
              </button>
            </div>
          )}

          {authStep === 'sms-verify' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', color: '#475569' }}>Un SMS contenant un code de confirmation a été envoyé au <strong>{authPhoneNumber}</strong>.</div>
              <label style={{ fontSize: '13px', fontWeight: '700', color: '#111827' }}>Code de confirmation :</label>
              <input
                type="text"
                value={authSmsCode}
                onChange={(e) => setAuthSmsCode(e.target.value)}
                placeholder="123456"
                style={{ width: '100%', padding: '12px', border: '1px solid #D1D5DB', borderRadius: '14px', fontSize: '16px', fontWeight: '700', letterSpacing: '4px', textAlign: 'center' }}
              />
              <button
                disabled={authLoading}
                onClick={handleVerifySmsCode}
                style={{ border: 'none', borderRadius: '14px', padding: '12px', backgroundColor: '#10B981', color: '#FFF', fontWeight: '700', cursor: authLoading ? 'not-allowed' : 'pointer', opacity: authLoading ? 0.7 : 1 }}
              >
                {authLoading ? 'Vérification...' : 'Valider et se connecter'}
              </button>
              <button onClick={() => { setAuthStep('phone'); setAuthError(''); }} style={{ background: 'none', border: 'none', color: '#64748B', fontSize: '12px', cursor: 'pointer', textAlign: 'center' }}>
                ← Changer de numéro
              </button>
            </div>
          )}

          {authStep === 'email' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: '700', color: '#111827' }}>Adresse email :</label>
              <input
                type="email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="votre.email@exemple.com"
                style={{ width: '100%', padding: '12px', border: '1px solid #D1D5DB', borderRadius: '14px', fontSize: '14px', fontWeight: '600' }}
              />
              <button
                disabled={authLoading}
                onClick={handleSendEmailLink}
                style={{ border: 'none', borderRadius: '14px', padding: '12px', backgroundColor: '#04265A', color: '#FFF', fontWeight: '700', cursor: authLoading ? 'not-allowed' : 'pointer', opacity: authLoading ? 0.7 : 1 }}
              >
                {authLoading ? 'Envoi du lien...' : 'Recevoir mon lien de connexion'}
              </button>
              <button onClick={() => { setAuthStep('select'); setAuthError(''); }} style={{ background: 'none', border: 'none', color: '#64748B', fontSize: '12px', cursor: 'pointer', textAlign: 'center' }}>
                ← Retour aux options
              </button>
            </div>
          )}

          {authStep === 'email-sent' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', color: '#475569', lineHeight: 1.6 }}>Un lien de connexion magique a été envoyé à <strong>{authEmail}</strong>. Cliquez dessus depuis votre appareil pour vous connecter.</div>
              <button onClick={() => { setAuthStep('select'); setAuthError(''); }} style={{ background: 'none', border: 'none', color: '#64748B', fontSize: '12px', cursor: 'pointer', textAlign: 'center', marginTop: '8px' }}>
                ← Retour aux options
              </button>
            </div>
          )}

          <div style={{ padding: '16px', borderRadius: '18px', backgroundColor: 'rgba(248,250,252,0.9)', border: '1px solid rgba(226,232,240,0.8)', color: '#475569', fontSize: '13px', lineHeight: 1.7 }}>
            <div style={{ fontWeight: '700', color: '#0F172A', marginBottom: '6px' }}>Pourquoi les utilisateurs aiment Troco</div>
            <div>• Des échanges simples, rapides et sécurisés par SMS/Email</div>
            <div>• Des profils premium avec visibilité accrue</div>
            <div>• Un espace de négociation inspiré du meilleur du freelance</div>
          </div>
        </div>
      </div>
    </div>
  );
}
