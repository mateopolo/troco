import React from 'react';
import { CheckCircle, ChevronRight, PlusCircle } from 'lucide-react';

/**
 * PublishSuccessModal.jsx — Modale de Succès de Publication Annonce
 * PHASE 117 : Centrage Flexbox absolu parfait & Responsive Mobile garanti
 */
export default function PublishSuccessModal({
  isOpen = false,
  listing = null,
  onClose = () => {},
  onViewListing = () => {},
  onPublishAnother = () => {},
  currentLang = 'FR',
  t = (k) => k,
  darkMode = false,
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      style={{ position: 'fixed', inset: 0, zIndex: 999999 }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md mx-auto bg-[var(--bg-card)] rounded-3xl shadow-2xl flex flex-col items-center text-center overflow-hidden p-6 md:p-8"
        style={{
          border: darkMode ? '1px solid rgba(232,221,211,0.18)' : '1px solid var(--border-color)',
          animation: 'popupIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both',
        }}
      >
        {/* Icône checkmark animée */}
        <div
          style={{
            width: '68px',
            height: '68px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent-success), var(--accent-success))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 18px',
            boxShadow: '0 12px 28px rgba(122,143,106,0.3)',
            animation: 'checkPop 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.15s both',
          }}
        >
          <CheckCircle size={36} color="#FFF" />
        </div>

        {/* Titre */}
        <h2
          className="font-editorial-heading"
          style={{
            margin: '0 0 8px',
            fontSize: '22px',
            fontWeight: '600',
            color: 'var(--text-main)',
            lineHeight: 1.2,
          }}
        >
          {currentLang === 'FR'
            ? '🎉 Annonce publiée !'
            : currentLang === 'EN'
            ? '🎉 Ad published!'
            : currentLang === 'ES'
            ? '🎉 ¡Anuncio publicado!'
            : currentLang === 'IT'
            ? '🎉 Annuncio pubblicato!'
            : currentLang === 'DE'
            ? '🎉 Anzeige veröffentlicht!'
            : currentLang === 'JA'
            ? '🎉 広告を公開しました！'
            : '🎉 广告已发布！'}
        </h2>

        {/* Sous-titre descriptif */}
        <p
          style={{
            margin: '0 0 6px',
            fontSize: '13.5px',
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
          }}
        >
          {currentLang === 'FR'
            ? 'Votre annonce est maintenant visible dans le flux, sur la carte et dans les résultats de recherche.'
            : currentLang === 'EN'
            ? 'Your ad is now visible in the feed, on the map and in search results.'
            : currentLang === 'ES'
            ? 'Tu anuncio ahora es visible en el feed, en el mapa y en los resultados de búsqueda.'
            : currentLang === 'IT'
            ? 'Il tuo annuncio è ora visibile nel feed, sulla mappa e nei risultati di ricerca.'
            : currentLang === 'DE'
            ? 'Ihre Anzeige ist jetzt im Feed, auf der Karte und in den Suchergebnissen sichtbar.'
            : currentLang === 'JA'
            ? '広告はフィード、マップ、検索結果に表示されるようになりました。'
            : '您的广告现在可以在动态、地图和搜索结果中看到。'}
        </p>

        {listing?.title && (
          <p
            style={{
              margin: '0 0 20px',
              fontSize: '13px',
              fontWeight: '700',
              color: 'var(--accent-primary)',
            }}
          >
            « {listing.title} »
          </p>
        )}

        {/* Boutons d'action */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
          <button
            type="button"
            onClick={onViewListing}
            className="premium-button"
            style={{
              width: '100%',
              border: 'none',
              borderRadius: '16px',
              padding: '14px',
              background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)',
              color: '#FFF',
              fontWeight: '800',
              fontSize: '14px',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            {currentLang === 'FR'
              ? 'Voir mon annonce →'
              : currentLang === 'EN'
              ? 'View my listing →'
              : currentLang === 'ES'
              ? 'Ver mi anuncio →'
              : currentLang === 'IT'
              ? 'Vedi il mio annuncio →'
              : currentLang === 'DE'
              ? 'Meine Anzeige anzeigen →'
              : currentLang === 'JA'
              ? '広告を見る →'
              : '查看我的广告 →'}
            <ChevronRight size={18} />
          </button>

          <button
            type="button"
            onClick={onPublishAnother}
            style={{
              width: '100%',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '12px',
              background: 'transparent',
              color: 'var(--text-secondary)',
              fontWeight: '700',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <PlusCircle size={15} />
            {currentLang === 'FR'
              ? '+ Déposer une autre annonce'
              : currentLang === 'EN'
              ? '+ Post another listing'
              : currentLang === 'ES'
              ? '+ Publicar otro anuncio'
              : currentLang === 'IT'
              ? '+ Pubblica un altro annuncio'
              : currentLang === 'DE'
              ? '+ Eine weitere Anzeige aufgeben'
              : currentLang === 'JA'
              ? '+ 別の広告を投稿'
              : '+ 发布另一条广告'}
          </button>
        </div>
      </div>
    </div>
  );
}
