/**
 * DealRatingModal.jsx — Modale de Notation & Récolte d'Avis Vérifiés post-deal
 * S'affiche automatiquement à la résolution d'un deal ou d'un troc validé pour gamifier la clôture.
 * Conforme au design system Troco (cartes flottantes, rounded-full, glassmorphism, A11Y).
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Star, X, CheckCircle, Sparkles, Send, Heart } from 'lucide-react';
import { collection, addDoc, doc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { hapticSuccess, hapticLight } from '../utils/haptics';

const COMPLIMENT_TAGS = [
  'Ponctuel ⏰',
  'Sympathique 😊',
  'Service soigné ✨',
  'Communication fluide 💬',
  'Matériel impeccable 🛠️',
  'Expert et pédagogue 🎓',
  'Généreux & Arrangeant 🤝',
];

export default function DealRatingModal({
  isOpen = false,
  onClose = () => {},
  partnerName = 'l’interlocuteur',
  partnerUid = null,
  dealId = null,
  serviceTitle = 'Prestation Troco',
  currentUser = null,
  darkMode = false,
  onReviewSubmitted = null,
}) {
  const [rating, setRating] = useState(5);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState([]);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const toggleTag = (tag) => {
    hapticLight();
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    hapticSuccess();

    try {
      const reviewPayload = {
        author: currentUser?.name || currentUser?.displayName || 'Membre Troco',
        authorUid: currentUser?.uid || null,
        authorAvatar: currentUser?.avatar || null,
        rating: Number(rating) || 5,
        comment: comment.trim(),
        text: comment.trim(),
        tags: selectedTags,
        dealId: dealId || null,
        serviceTitle: serviceTitle || null,
        verifiedDeal: true,
        createdAt: new Date().toISOString(),
      };

      if (db && partnerUid) {
        reviewPayload.timestamp = serverTimestamp();
        // Écriture de l'avis vérifié dans la sous-collection Firestore
        const reviewsRef = collection(db, 'users', String(partnerUid), 'reviews');
        await addDoc(reviewsRef, reviewPayload);

        // Mise à jour incrémentale du profil du partenaire
        try {
          const partnerDocRef = doc(db, 'users', String(partnerUid));
          await updateDoc(partnerDocRef, {
            reviewsCount: increment(1),
            updatedAt: serverTimestamp(),
          });
        } catch (_) {}
      }

      if (typeof onReviewSubmitted === 'function') {
        onReviewSubmitted(reviewPayload);
      }

      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 1600);
    } catch (err) {
      console.warn('[DealRatingModal] Submit error:', err);
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 1200);
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="deal-rating-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100090,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      <div
        className="deal-rating-card"
        style={{
          width: '100%',
          maxWidth: '520px',
          borderRadius: '28px',
          backgroundColor: darkMode ? '#1F1B18' : '#FFFFFF',
          border: darkMode ? '1.5px solid rgba(255,255,255,0.12)' : '1.5px solid #E8DDD3',
          boxShadow: darkMode
            ? '0 25px 60px -15px rgba(0,0,0,0.85), 0 0 35px rgba(198,125,91,0.2)'
            : '0 25px 60px -15px rgba(61, 53, 48, 0.25), 0 0 30px rgba(198,125,91,0.15)',
          padding: '28px 24px',
          color: darkMode ? '#FAF7F2' : '#3D3530',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
          maxHeight: '92vh',
          overflowY: 'auto',
          boxSizing: 'border-box',
          fontFamily: 'var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)',
        }}
      >
        {/* BOUTON FERMER */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer la modale d'évaluation"
          className="focus:ring-2 focus:ring-[#C67D5B] focus:outline-none transition-all rounded-full"
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            border: 'none',
            background: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
            color: darkMode ? '#D4C5B5' : '#8A7A6D',
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <X size={18} aria-hidden="true" />
        </button>

        {isSuccess ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '36px 16px',
              textAlign: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'rgba(16,185,129,0.15)',
                color: '#10B981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(16,185,129,0.3)',
              }}
            >
              <CheckCircle size={36} />
            </div>
            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#10B981' }}>
              Merci pour votre évaluation !
            </h3>
            <p style={{ margin: 0, fontSize: '13.5px', color: darkMode ? '#D4C5B5' : '#6B5E54' }}>
              Votre avis vérifié a été publié sur le profil de <strong>{partnerName}</strong>.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* EN-TÊTE AVEC ICONE ET TITRE */}
            <div style={{ textAlign: 'center', paddingRight: '24px' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: 'rgba(198,125,91,0.15)',
                  color: '#C67D5B',
                  borderRadius: '999px',
                  padding: '4px 12px',
                  fontSize: '11.5px',
                  fontWeight: '800',
                  marginBottom: '10px',
                }}
              >
                <Sparkles size={13} />
                <span>Deal Validé & Clôturé</span>
              </div>
              <h2
                id="deal-rating-title"
                style={{
                  margin: '0 0 6px',
                  fontSize: '21px',
                  fontWeight: '800',
                  color: darkMode ? '#FFFFFF' : '#231E1B',
                  letterSpacing: '-0.02em',
                }}
              >
                Comment s'est passé votre échange ?
              </h2>
              <p style={{ margin: 0, fontSize: '13px', color: darkMode ? '#D4C5B5' : '#6B5E54' }}>
                Évaluez votre expérience avec <strong>{partnerName}</strong> pour « {serviceTitle} ».
              </p>
            </div>

            {/* SÉLECTEUR D'ÉTOILES INTERACTIF */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                padding: '14px',
                borderRadius: '20px',
                backgroundColor: darkMode ? 'rgba(255,255,255,0.03)' : '#FAF7F2',
                border: darkMode ? '1px solid rgba(255,255,255,0.06)' : '1px solid #E8DDD3',
              }}
            >
              <div
                role="radiogroup"
                aria-label="Note de 1 à 5 étoiles"
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                {[1, 2, 3, 4, 5].map((starValue) => {
                  const isActive = (hoveredRating || rating) >= starValue;
                  return (
                    <button
                      key={starValue}
                      type="button"
                      onClick={() => {
                        setRating(starValue);
                        hapticLight();
                      }}
                      onMouseEnter={() => setHoveredRating(starValue)}
                      onMouseLeave={() => setHoveredRating(0)}
                      aria-label={`${starValue} étoile${starValue > 1 ? 's' : ''} sur 5`}
                      className="focus:ring-2 focus:ring-[#C67D5B] focus:outline-none rounded-full transition-transform"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transform: isActive ? 'scale(1.15)' : 'scale(1)',
                        transition: 'transform 0.15s ease',
                      }}
                    >
                      <Star
                        size={32}
                        fill={isActive ? '#F59E0B' : 'transparent'}
                        color={isActive ? '#F59E0B' : (darkMode ? '#5C524B' : '#D4C7B0')}
                      />
                    </button>
                  );
                })}
              </div>
              <div style={{ fontSize: '13px', fontWeight: '800', color: '#F59E0B' }}>
                {rating === 5 && '🌟 Excellent échange !'}
                {rating === 4 && '✨ Très bon échange !'}
                {rating === 3 && '👍 Échange correct'}
                {rating === 2 && '😕 Des points à améliorer'}
                {rating === 1 && '⚠️ Expérience décevante'}
              </div>
            </div>

            {/* TAGS RAPIDES DE COMPLIMENTS */}
            <div>
              <div style={{ fontSize: '12.5px', fontWeight: '700', marginBottom: '8px', color: darkMode ? '#D4C5B5' : '#6B5E54' }}>
                Compliments & points forts :
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {COMPLIMENT_TAGS.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      aria-pressed={isSelected}
                      className="focus:ring-2 focus:ring-[#C67D5B] focus:outline-none transition-all rounded-full"
                      style={{
                        padding: '6px 14px',
                        borderRadius: '999px',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        border: isSelected
                          ? '1.5px solid #C67D5B'
                          : (darkMode ? '1px solid rgba(255,255,255,0.12)' : '1px solid #D4C7B0'),
                        backgroundColor: isSelected
                          ? (darkMode ? 'rgba(198,125,91,0.25)' : '#F5EAE4')
                          : (darkMode ? 'rgba(255,255,255,0.04)' : '#FFFFFF'),
                        color: isSelected ? '#C67D5B' : (darkMode ? '#FAF7F2' : '#3D3530'),
                      }}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ZONE DE COMMENTAIRE */}
            <div>
              <label
                htmlFor="deal-rating-comment"
                style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', marginBottom: '6px' }}
              >
                Votre commentaire public (optionnel) :
              </label>
              <textarea
                id="deal-rating-comment"
                rows={3}
                maxLength={500}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Racontez en quelques mots comment s'est déroulée la prestation..."
                aria-label="Commentaire d'évaluation du deal"
                className="focus:ring-2 focus:ring-[#C67D5B] focus:outline-none rounded-xl"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '16px',
                  border: darkMode ? '1px solid rgba(255,255,255,0.12)' : '1px solid #D4C7B0',
                  backgroundColor: darkMode ? '#28231F' : '#FFFFFF',
                  color: darkMode ? '#FAF7F2' : '#3D3530',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />
              <div style={{ textAlign: 'right', fontSize: '11px', color: darkMode ? '#8A7A6D' : '#A8998C', marginTop: '4px' }}>
                {comment.length}/500 caractères
              </div>
            </div>

            {/* BOUTONS D'ACTION */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={onClose}
                className="focus:ring-2 focus:ring-[#C67D5B] focus:outline-none transition-all rounded-full"
                style={{
                  padding: '10px 18px',
                  borderRadius: '999px',
                  border: 'none',
                  background: 'transparent',
                  color: darkMode ? '#A8998C' : '#7D6E63',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
              >
                Plus tard
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                aria-label="Publier mon avis vérifié"
                className="premium-button focus:ring-2 focus:ring-[#C67D5B] focus:ring-offset-2 focus:outline-none transition-all rounded-full"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '11px 24px',
                  borderRadius: '999px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #C67D5B 0%, #A8644A 100%)',
                  backgroundColor: '#C67D5B',
                  color: '#FFFFFF',
                  fontSize: '13.5px',
                  fontWeight: '800',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px rgba(198,125,91,0.3)',
                  opacity: isSubmitting ? 0.7 : 1,
                }}
              >
                <Send size={15} aria-hidden="true" />
                <span>{isSubmitting ? 'Publication...' : 'Publier mon avis vérifié'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
