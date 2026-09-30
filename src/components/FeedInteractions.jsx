import React from 'react';
import { CheckCircle, X } from 'lucide-react';

export default function FeedInteractions({
  showPublishedPopup,
  setShowPublishedPopup,
  publishedListing,
  setSelectedListing,
  setActiveTab,
  defaultPostDraft,
  setPostStep,
  setPostDraft,
  currentLang,
  darkMode,
  mobileListingActionTarget,
  setMobileListingActionTarget,
  handleStartEditListing,
  handleBoostListing,
  handleTogglePauseListing,
  handleDeleteListing,
}) {
  return (
    <>
      {/* POPUP CONFIRMATION PUBLICATION */}
      {showPublishedPopup && publishedListing && (
        <div
          className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          style={{ position: 'fixed', inset: 0, zIndex: 999999 }}
          onClick={() => {
            setShowPublishedPopup(false);
            setSelectedListing(publishedListing);
            setActiveTab('feed');
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="relative w-full max-w-md mx-auto bg-[var(--bg-card)] rounded-3xl shadow-2xl flex flex-col items-center text-center overflow-hidden p-6 md:p-8"
            style={{ border: '1px solid var(--border-color)', animation: 'popupIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both' }}
          >
            {/* Icône checkmark animée */}
            <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-success), var(--accent-success))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 12px 32px rgba(122,143,106,0.3)', animation: 'checkPop 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.15s both' }}>
              <CheckCircle size={38} color="#FFF" />
            </div>
            <h2 className="font-editorial-heading" style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: '600', color: 'var(--text-main)', lineHeight: 1.2 }}>
              {currentLang === 'FR' ? '🎉 Annonce publiée !' :
                currentLang === 'EN' ? '🎉 Ad published!' :
                  currentLang === 'ES' ? '🎉 ¡Anuncio publicado!' :
                    currentLang === 'IT' ? '🎉 Annuncio pubblicato!' :
                      currentLang === 'DE' ? '🎉 Anzeige veröffentlicht!' :
                        currentLang === 'JA' ? '🎉 広告を公開しました！' :
                          '🎉 广告已发布！'}
            </h2>
            <p style={{ margin: '0 0 6px', fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {currentLang === 'FR' ? 'Votre annonce est maintenant visible dans le flux, sur la carte et dans les résultats de recherche.' :
                currentLang === 'EN' ? 'Your ad is now visible in the feed, on the map and in search results.' :
                  currentLang === 'ES' ? 'Tu anuncio ahora es visible en el feed, en el mapa y en los resultados de búsqueda.' :
                    currentLang === 'IT' ? 'Il tuo annuncio è ora visibile nel feed, sulla mappa e nei résultats de recherche.' :
                      currentLang === 'DE' ? 'Ihre Anzeige ist jetzt im Feed, auf der Karte und in den Suchergebnissen sichtbar.' :
                        currentLang === 'JA' ? '広告はフィード、マップ、検索結果に表示されるようになりました。' :
                          '您的广告现在可以在动态、地图和搜索结果中看到。'}
            </p>
            <p style={{ margin: '0 0 24px', fontSize: '13px', fontWeight: '700', color: 'var(--accent-primary)' }}>« {publishedListing.title} »</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={() => {
                  setShowPublishedPopup(false);
                  setSelectedListing(publishedListing);
                  setActiveTab('feed');
                }}
                className="premium-button"
                style={{ width: '100%', border: 'none', borderRadius: '16px', padding: '14px', background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)', color: '#FFF', fontWeight: '800', fontSize: '15px', cursor: 'pointer', boxShadow: 'var(--shadow-accent)' }}
              >
                {currentLang === 'FR' ? 'Voir mon annonce →' :
                  currentLang === 'EN' ? 'View my listing →' :
                    currentLang === 'ES' ? 'Ver mi anuncio →' :
                      currentLang === 'IT' ? 'Vedi il mio annuncio →' :
                        currentLang === 'DE' ? 'Meine Anzeige anzeigen →' :
                          currentLang === 'JA' ? '広告を見る →' : '查看我的广告 →'}
              </button>
              <button
                onClick={() => {
                  setShowPublishedPopup(false);
                  setActiveTab('post');
                  setPostStep(1);
                  setPostDraft(defaultPostDraft);
                }}
                style={{ width: '100%', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '13px', background: 'transparent', color: 'var(--text-secondary)', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}
              >
                {currentLang === 'FR' ? '+ Déposer une autre annonce' :
                  currentLang === 'EN' ? '+ Post another listing' :
                    currentLang === 'ES' ? '+ Publicar otro anuncio' :
                      currentLang === 'IT' ? '+ Pubblica un altro annuncio' :
                        currentLang === 'DE' ? '+ Eine weitere Anzeige aufgeben' :
                          currentLang === 'JA' ? '+ 別の広告を投稿' : '+ 发布另一条广告'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- MODALE D'ACTION TACTILE SUR ANNONCE MOBILE ---- */}
      {mobileListingActionTarget && (
        <div
          onClick={() => setMobileListingActionTarget(null)}
          className="fixed inset-0 z-[4000] bg-black/90 md:bg-[rgba(61,53,48,0.72)] md:backdrop-blur-md flex items-end justify-center p-0"
          style={{
            position: 'fixed', inset: 0,
            zIndex: 4000,
            animation: 'fadeSlideUp 0.25s ease both'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: darkMode ? '#231E1B' : '#FAF7F2',
              borderRadius: '24px 24px 0 0', width: '100%', maxWidth: '500px',
              padding: '20px 20px 32px', boxShadow: '0 -10px 40px rgba(61,53,48,0.25)',
              border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3',
              position: 'relative', display: 'flex', flexDirection: 'column', gap: '14px'
            }}
          >
            {/* Barre de drag */}
            <div style={{ width: '40px', height: '4px', borderRadius: '999px', backgroundColor: darkMode ? 'rgba(232,221,211,0.2)' : '#D4C5B5', margin: '0 auto 6px' }} />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                <img src={mobileListingActionTarget.image} alt={mobileListingActionTarget.title} style={{ width: '48px', height: '48px', borderRadius: '12px', objectFit: 'cover' }} />
                <div style={{ minWidth: 0 }}>
                  <div className="font-editorial-heading" style={{ fontWeight: '600', fontSize: '16px', color: darkMode ? '#FAF7F2' : '#3D3530', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {mobileListingActionTarget.title}
                  </div>
                  <div style={{ fontSize: '12px', color: '#C67D5B', fontWeight: '700' }}>
                    {mobileListingActionTarget.compensation} • {mobileListingActionTarget.status === 'paused' ? 'En pause' : 'Active'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setMobileListingActionTarget(null)}
                style={{ border: 'none', backgroundColor: darkMode ? 'rgba(232,221,211,0.1)' : '#F5EAE4', color: darkMode ? '#FAF7F2' : '#3D3530', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
              {/* MODIFIER */}
              <button
                onClick={() => {
                  const target = mobileListingActionTarget;
                  setMobileListingActionTarget(null);
                  handleStartEditListing(target);
                }}
                className="premium-button"
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px',
                  borderRadius: '16px', border: darkMode ? '1px solid rgba(232,221,211,0.12)' : '1px solid #E8DDD3',
                  backgroundColor: darkMode ? '#1A1715' : '#FFF', color: darkMode ? '#FAF7F2' : '#3D3530',
                  fontSize: '14px', fontWeight: '700', cursor: 'pointer'
                }}
              >
                <span style={{ fontSize: '18px' }}>✏️</span>
                <span>Modifier l'annonce</span>
              </button>

              <button
                onClick={() => {
                  const target = mobileListingActionTarget;
                  setMobileListingActionTarget(null);
                  handleBoostListing(target);
                }}
                className="premium-button"
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px',
                  borderRadius: '16px', border: '1px solid #E8DDD3',
                  backgroundColor: darkMode ? 'rgba(217,119,6,0.15)' : '#FEF3C7', color: '#D97706',
                  fontSize: '14px', fontWeight: '800', cursor: 'pointer'
                }}
              >
                <span style={{ fontSize: '18px' }}>🔥</span>
                <span>Booster l'annonce (Top visibilité)</span>
              </button>

              <button
                onClick={async () => {
                  const targetId = mobileListingActionTarget.id;
                  await handleTogglePauseListing(targetId);
                  setMobileListingActionTarget(null);
                }}
                className="premium-button"
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px',
                  borderRadius: '16px', border: darkMode ? '1px solid rgba(232,221,211,0.12)' : '1px solid #E8DDD3',
                  backgroundColor: darkMode ? '#1A1715' : '#FFF', color: darkMode ? '#FAF7F2' : '#3D3530',
                  fontSize: '14px', fontWeight: '700', cursor: 'pointer'
                }}
              >
                <span style={{ fontSize: '18px' }}>{mobileListingActionTarget.status === 'paused' ? '▶️' : '⏸️'}</span>
                <span>{mobileListingActionTarget.status === 'paused' ? 'Réactiver l\'annonce' : 'Mettre en pause'}</span>
              </button>

              <button
                onClick={() => {
                  const targetId = mobileListingActionTarget.id;
                  handleDeleteListing(targetId);
                }}
                className="premium-button"
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px',
                  borderRadius: '16px', border: '1px solid rgba(239,68,68,0.3)',
                  backgroundColor: darkMode ? 'rgba(239,68,68,0.15)' : '#FEF2F2', color: '#EF4444',
                  fontSize: '14px', fontWeight: '800', cursor: 'pointer'
                }}
              >
                <span style={{ fontSize: '18px' }}>🗑️</span>
                <span>Supprimer définitivement l'annonce</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
