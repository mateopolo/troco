import React, { useState } from 'react';
import { ShieldAlert, X, CheckCircle, AlertTriangle } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const REPORT_REASONS = [
  { key: 'fraud', label: 'Arnaque ou suspicion de fraude', desc: 'Demande de virement externe, coupon prépayé ou arnaque avérée.' },
  { key: 'inappropriate', label: 'Contenu inapproprié ou offensant', desc: 'Propos haineux, vulgarité, discrimination ou contenu explicite.' },
  { key: 'spam', label: 'Spam ou publicité abusive', desc: 'Annonces répétitives, faux services ou publicité commerciale non sollicitée.' },
  { key: 'illegal', label: 'Produit ou service illégal', desc: 'Contrefaçon, substances ou activités interdites par la loi.' },
  { key: 'other', label: 'Autre motif', desc: 'Tout autre comportement non conforme aux règles de la communauté Troco.' },
];

export default function ReportModal({
  isOpen,
  onClose,
  targetListing = null,
  targetUser = null,
  currentUser = null,
  darkMode = false,
  onReportSubmitted = null,
}) {
  const [selectedReason, setSelectedReason] = useState('fraud');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const targetTitle = targetListing?.title || (targetUser ? `Profil de ${targetUser.name}` : 'Contenu');
  const targetAuthor = targetListing?.author || targetUser?.name || 'Inconnu';

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const reportPayload = {
        listingId: targetListing?.id ? String(targetListing.id) : null,
        listingTitle: targetListing?.title || null,
        listingImage: targetListing?.image || null,
        reportedUserName: targetAuthor,
        reportedUserId: targetUser?.uid || targetListing?.authorUid || null,
        reporterName: currentUser?.name || 'Utilisateur Troco',
        reporterUid: currentUser?.uid || 'anonymous',
        reasonKey: selectedReason,
        reasonLabel: REPORT_REASONS.find(r => r.key === selectedReason)?.label || selectedReason,
        details: details.trim(),
        status: 'pending', // 'pending' | 'resolved' | 'dismissed'
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'reports'), reportPayload);

      setSubmitted(true);
      if (onReportSubmitted) onReportSubmitted(reportPayload);

      setTimeout(() => {
        setSubmitted(false);
        setDetails('');
        setSelectedReason('fraud');
        onClose();
      }, 1800);
    } catch (err) {
      console.warn('[Firestore] Failed to save report:', err);
      // Fallback local
      setSubmitted(true);
      if (onReportSubmitted) {
        onReportSubmitted({
          listingTitle: targetTitle,
          reportedUserName: targetAuthor,
          reasonLabel: selectedReason,
          details,
          status: 'pending',
          createdAt: new Date(),
        });
      }
      setTimeout(() => {
        setSubmitted(false);
        setDetails('');
        onClose();
      }, 1800);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        backgroundColor: 'rgba(61, 53, 48, 0.72)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeSlideUp 0.25s ease both',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          backgroundColor: darkMode ? '#231E1B' : '#FAF7F2',
          borderRadius: '24px',
          padding: '24px',
          boxShadow: darkMode ? '0 25px 50px -12px rgba(0,0,0,0.8)' : '0 25px 50px -12px rgba(61,53,48,0.2)',
          border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3',
          color: darkMode ? '#FAF7F2' : '#3D3530',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* BOUTON FERMER */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '18px',
            right: '18px',
            border: 'none',
            background: darkMode ? 'rgba(232,221,211,0.1)' : '#F5EAE4',
            color: darkMode ? '#FAF7F2' : '#3D3530',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <X size={16} />
        </button>

        {submitted ? (
          <div style={{ textAlign: 'center', padding: '24px 10px' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: darkMode ? 'rgba(16,185,129,0.2)' : '#ECFDF5',
                color: '#10B981',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '14px',
              }}
            >
              <CheckCircle size={32} />
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: '800' }}>Signalement transmis</h3>
            <p style={{ margin: 0, fontSize: '13px', color: darkMode ? '#94A3B8' : '#64748B', lineHeight: 1.6 }}>
              Merci d'aider à préserver la sécurité de la communauté Troco. Notre équipe de modération analyse ce contenu dans les plus brefs délais.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '14px',
                  backgroundColor: darkMode ? 'rgba(239,68,68,0.2)' : '#FEF2F2',
                  color: '#EF4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <ShieldAlert size={22} />
              </div>
              <div>
                <h3 className="font-editorial-heading" style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: darkMode ? '#FAF7F2' : '#3D3530' }}>Signaler un contenu</h3>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: darkMode ? '#D4C5B5' : '#6B5E54' }}>
                  Concerne : <strong>{targetTitle}</strong> {targetAuthor ? `(${targetAuthor})` : ''}
                </p>
              </div>
            </div>

            {errorMessage && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '12px',
                  backgroundColor: '#FEF2F2',
                  color: '#991B1B',
                  fontSize: '12px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <AlertTriangle size={14} /> {errorMessage}
              </div>
            )}

            {/* LISTE DES MOTIFS */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', marginBottom: '8px', color: darkMode ? '#FAF7F2' : '#3D3530' }}>
                Quel est le problème ?
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {REPORT_REASONS.map((r) => {
                  const isSelected = selectedReason === r.key;
                  return (
                    <div
                      key={r.key}
                      onClick={() => setSelectedReason(r.key)}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '14px',
                        border: isSelected
                          ? '2px solid #DC2626'
                          : (darkMode ? '1px solid rgba(232,221,211,0.12)' : '1px solid #E8DDD3'),
                        backgroundColor: isSelected
                          ? (darkMode ? 'rgba(239,68,68,0.15)' : '#FEF2F2')
                          : (darkMode ? '#1A1715' : '#FFF'),
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '13px', fontWeight: isSelected ? '800' : '700', color: isSelected ? (darkMode ? '#FCA5A5' : '#991B1B') : (darkMode ? '#FAF7F2' : '#3D3530') }}>
                          {r.label}
                        </span>
                        <input
                          type="radio"
                          name="reportReason"
                          checked={isSelected}
                          onChange={() => setSelectedReason(r.key)}
                          style={{ accentColor: '#DC2626', cursor: 'pointer' }}
                        />
                      </div>
                      <div style={{ fontSize: '11px', color: darkMode ? '#D4C5B5' : '#6B5E54', marginTop: '4px' }}>
                        {r.desc}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* DÉTAILS COMPLÉMENTAIRES */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', marginBottom: '6px', color: darkMode ? '#FAF7F2' : '#3D3530' }}>
                Détails complémentaires (facultatif) :
              </label>
              <textarea
                rows={3}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Décrivez ce qui vous paraît suspect ou non conforme..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  backgroundColor: darkMode ? '#1A1715' : '#FFFFFF',
                  color: darkMode ? '#FAF7F2' : '#3D3530',
                  border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3',
                  outline: 'none',
                  resize: 'none',
                }}
              />
            </div>

            {/* BOUTONS ACTIONS */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '14px',
                  border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3',
                  background: 'transparent',
                  color: darkMode ? '#D4C5B5' : '#6B5E54',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{
                  flex: 2,
                  padding: '12px',
                  borderRadius: '14px',
                  border: 'none',
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  fontWeight: '800',
                  fontSize: '13px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  boxShadow: '0 8px 20px -4px rgba(220,38,38,0.4)',
                }}
              >
                {loading ? 'Envoi...' : 'Confirmer le signalement'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
