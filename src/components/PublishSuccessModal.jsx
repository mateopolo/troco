import React from 'react';
import { CheckCircle, ChevronRight, PlusCircle } from 'lucide-react';
import UniversalModal from './ui/UniversalModal';

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

  const modalHeader = (
    <div style={{
      textAlign: 'center',
      padding: '24px 24px 0',
    }}>
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
            margin: '0 0 0',
            fontSize: '13px',
            fontWeight: '700',
            color: 'var(--accent-primary)',
          }}
        >
          « {listing.title} »
        </p>
      )}
    </div>
  );

  const modalFooter = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', padding: '20px 24px 24px' }}>
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
  );

  return (
    <UniversalModal
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel="Annonce publiée avec succès"
      showCloseButton={false}
      maxWidth="md"
      header={modalHeader}
      footer={modalFooter}
      contentStyle={{
        backgroundColor: 'var(--bg-card)',
        borderRadius: '24px',
        boxShadow: '0 25px 50px -12px rgba(61,53,48,0.4)',
        border: darkMode ? '1px solid rgba(232,221,211,0.18)' : '1px solid var(--border-color)',
        color: 'var(--text-main)',
      }}
      overlayStyle={{
        backgroundColor: 'rgba(0,0,0,0.6)',
      }}
    >
      {null}
    </UniversalModal>
  );
}
