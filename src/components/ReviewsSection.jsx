import React, { useState, useEffect } from 'react';
import { Star, MessageSquare, Send, CornerDownRight, Clock } from 'lucide-react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { auth, db } from '../firebase';

function formatReviewDate(ts) {
  if (!ts) return '';
  if (typeof ts === 'string') return ts;
  if (ts.toDate && typeof ts.toDate === 'function') {
    return ts.toDate().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  if (ts.seconds) {
    return new Date(ts.seconds * 1000).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  if (ts instanceof Date) {
    return ts.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  return String(ts);
}

export default function ReviewsSection({
  profileUid,
  ownerName = 'Propriétaire',
  currentUser = null,
  darkMode = false,
  t = (k, defaultVal) => defaultVal || k,
  initialReviews = [],
}) {
  const [reviews, setReviews] = useState(initialReviews);
  const [loading, setLoading] = useState(true);
  const [replyingToId, setReplyingToId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const activeUser = currentUser || auth?.currentUser;
  const currentUid = typeof activeUser === 'string' ? activeUser : (activeUser?.uid || activeUser?.id);
  const isOwner = Boolean(currentUid && profileUid && String(currentUid) === String(profileUid));

  useEffect(() => {
    if (!profileUid || !db) {
      setLoading(false);
      return;
    }

    let unsubscribe = () => {};

    try {
      const reviewsColl = collection(db, 'users', String(profileUid), 'reviews');
      const q = query(reviewsColl, orderBy('timestamp', 'desc'));

      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const fetched = snapshot.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          }));
          setReviews(fetched);
          setLoading(false);
        },
        (err) => {
          console.warn('[ReviewsSection] query with orderBy failed, fallback to unordered collection:', err);
          // Fallback en cas d'index manquant sur timestamp
          const fallbackUnsub = onSnapshot(
            reviewsColl,
            (fallbackSnap) => {
              const fallbackList = fallbackSnap.docs
                .map((d) => ({
                  id: d.id,
                  ...d.data(),
                }))
                .sort((a, b) => {
                  const timeA = a.timestamp?.seconds || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
                  const timeB = b.timestamp?.seconds || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
                  return timeB - timeA;
                });
              setReviews(fallbackList);
              setLoading(false);
            },
            () => setLoading(false)
          );
          unsubscribe = fallbackUnsub;
        }
      );
    } catch (e) {
      console.warn('[ReviewsSection] init error:', e);
      setLoading(false);
    }

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [profileUid]);

  const handleSendReply = async (reviewId) => {
    const trimmed = replyText.trim();
    if (!trimmed || !profileUid || !db) return;
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const reviewDocRef = doc(db, 'users', String(profileUid), 'reviews', String(reviewId));
      await updateDoc(reviewDocRef, {
        reply: {
          text: trimmed,
          timestamp: serverTimestamp(),
        },
      });

      // Optimistic update for instant UI feedback
      setReviews((prev) =>
        prev.map((r) => {
          if (r.id === reviewId) {
            return {
              ...r,
              reply: {
                text: trimmed,
                timestamp: new Date(),
              },
            };
          }
          return r;
        })
      );

      setReplyingToId(null);
      setReplyText('');
    } catch (err) {
      console.error('[ReviewsSection] updateDoc reply failed:', err);
      setErrorMessage("Erreur lors de l'envoi de la réponse. Veuillez réessayer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="reviews-section-panel"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderRadius: '24px',
        padding: '24px',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-card)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        marginTop: '18px',
      }}
    >
      {/* EN-TÊTE DE SECTION */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <h3
          className="font-editorial-heading"
          style={{
            margin: 0,
            fontSize: '20px',
            fontWeight: '600',
            color: 'var(--text-main)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Star size={20} fill="#F59E0B" color="#F59E0B" /> Avis et Évaluations
        </h3>
        {reviews.length > 0 && (
          <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>
            {reviews.length} avis vérifié{reviews.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {errorMessage && (
        <div style={{ padding: '8px 12px', borderRadius: '10px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', fontSize: '12px', fontWeight: '600' }}>
          {errorMessage}
        </div>
      )}

      {/* ÉTAT VIDE */}
      {!loading && reviews.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '28px 16px',
            borderRadius: '18px',
            backgroundColor: 'var(--bg-subtle)',
            border: '1px dashed var(--border-color)',
            color: 'var(--text-secondary)',
            fontSize: '13px',
          }}
        >
          <Star size={28} style={{ opacity: 0.3, margin: '0 auto 8px' }} />
          <div>Cet utilisateur n'a pas encore reçu d'avis.</div>
        </div>
      )}

      {/* LISTE DES AVIS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {reviews.map((review) => {
          const authorName = review.author || review.authorName || review.userName || review.user || 'Membre Troco';
          const ratingVal = Number(review.rating) || 5;
          const dateStr = formatReviewDate(review.timestamp || review.date || review.createdAt);
          const reviewText = review.text || review.comment || review.review || '';
          const replyObj = typeof review.reply === 'object' && review.reply !== null
            ? review.reply
            : (typeof review.reply === 'string' ? { text: review.reply } : null);
          const hasReply = Boolean(replyObj && replyObj.text);
          const isReplyingThis = replyingToId === review.id;

          return (
            <div
              key={review.id}
              className="premium-card"
              style={{
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: '18px',
                padding: '16px',
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              {/* LIGNE DU HAUT : AUTEUR + NOTE + DATE */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--accent-primary)',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '800',
                      fontSize: '13px',
                      flexShrink: 0,
                    }}
                  >
                    {authorName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)' }}>
                      {authorName}
                    </div>
                    {dateStr && (
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Clock size={10} /> {dateStr}
                      </div>
                    )}
                  </div>
                </div>

                {/* ÉTOILES */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={14}
                      fill={star <= ratingVal ? '#F59E0B' : 'transparent'}
                      color={star <= ratingVal ? '#F59E0B' : 'var(--text-secondary)'}
                      style={{ opacity: star <= ratingVal ? 1 : 0.3 }}
                    />
                  ))}
                  <span style={{ fontSize: '12px', fontWeight: '800', color: '#F59E0B', marginLeft: '4px' }}>
                    {ratingVal.toFixed(1)}
                  </span>
                </div>
              </div>

              {/* TEXTE DE L'AVIS */}
              {reviewText && (
                <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: 'var(--text-main)', lineHeight: 1.5 }}>
                  "{reviewText}"
                </p>
              )}

              {/* DROIT DE RÉPONSE (OWNER ONLY) */}
              {isOwner && !hasReply && !isReplyingThis && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setReplyingToId(review.id);
                      setReplyText('');
                    }}
                    className="premium-button"
                    style={{
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-card)',
                      color: 'var(--accent-primary)',
                      padding: '5px 12px',
                      borderRadius: '999px',
                      fontSize: '11.5px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <MessageSquare size={12} />
                    <span>Répondre</span>
                  </button>
                </div>
              )}

              {/* FORMULAIRE DE RÉPONSE OUVERT */}
              {isReplyingThis && (
                <div
                  style={{
                    marginTop: '10px',
                    padding: '12px',
                    borderRadius: '14px',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                    Votre réponse publique en tant que {ownerName} :
                  </div>
                  <textarea
                    rows={3}
                    autoFocus
                    placeholder="Écrivez votre réponse publique à cet avis..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '10px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-subtle)',
                      color: 'var(--text-main)',
                      fontSize: '12.5px',
                      outline: 'none',
                      resize: 'vertical',
                      boxSizing: 'border-box',
                    }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setReplyingToId(null)}
                      disabled={isSubmitting}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--text-secondary)',
                        fontSize: '11.5px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        padding: '6px 10px',
                      }}
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSendReply(review.id)}
                      disabled={isSubmitting || !replyText.trim()}
                      className="premium-button"
                      style={{
                        border: 'none',
                        borderRadius: '999px',
                        backgroundColor: 'var(--accent-primary)',
                        color: '#FFFFFF',
                        padding: '6px 14px',
                        fontSize: '11.5px',
                        fontWeight: '800',
                        cursor: isSubmitting || !replyText.trim() ? 'not-allowed' : 'pointer',
                        opacity: isSubmitting || !replyText.trim() ? 0.6 : 1,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        boxShadow: 'var(--shadow-accent)',
                      }}
                    >
                      <Send size={12} />
                      <span>{isSubmitting ? 'Envoi...' : 'Envoyer'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* AFFICHAGE DE LA RÉPONSE IMBRIQUÉE */}
              {hasReply && (
                <div
                  style={{
                    marginLeft: '24px',
                    marginTop: '8px',
                    padding: '10px 14px',
                    borderRadius: '14px',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderLeft: '3px solid var(--accent-primary)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', fontWeight: '800', color: 'var(--accent-primary)' }}>
                    <CornerDownRight size={13} />
                    <span>Réponse de {ownerName}</span>
                    {replyObj.timestamp && (
                      <span style={{ color: 'var(--text-secondary)', fontWeight: '500', fontSize: '10.5px', marginLeft: 'auto' }}>
                        {formatReviewDate(replyObj.timestamp)}
                      </span>
                    )}
                  </div>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-main)', lineHeight: 1.5 }}>
                    {replyObj.text}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
