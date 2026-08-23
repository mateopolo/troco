import React from 'react';
import { PlusCircle, CheckCircle, ChevronRight } from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function PublishWizard({
  activeTab,
  postStep,
  setPostStep,
  postDraft,
  setPostDraft,
  handlePublishAnnouncement,
  isEditingListing,
  cancelEditListing,
  publishMessage,
  profile,
  currentLang,
  t,
  defaultCategories,
  getSuggestedImage,
  generateTags,
  isPublishSuccessOpen,
  publishedListing,
  onViewPublishedListing,
  onResetPublishWizard,
  darkMode,
}) {
  if (activeTab !== 'publish' && activeTab !== 'post' && !isPublishSuccessOpen) return null;

  return (
    <>
      {/* MULTI-LANGUAGE PUBLISH SUCCESS MODAL */}
      {isPublishSuccessOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(61, 53, 48, 0.72)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 90 }}>
          <div style={{ backgroundColor: darkMode ? '#231E1B' : '#FAF7F2', borderRadius: '28px', width: '100%', maxWidth: '440px', padding: '28px', boxShadow: darkMode ? '0 30px 80px rgba(0,0,0,0.8)' : '0 30px 80px rgba(61,53,48,0.25)', border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3', textAlign: 'center', animation: 'popIn 0.4s cubic-bezier(0.22, 1, 0.36, 1)' }}>
            <div style={{ width: '72px', height: '72px', borderRadius: '50%', backgroundColor: darkMode ? 'rgba(156,175,136,0.25)' : '#EBF0E6', color: '#7A8F6A', margin: '0 auto 18px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 12px 24px rgba(156,175,136,0.25)' }}>
              <CheckCircle size={38} strokeWidth={2.5} />
            </div>

            <h3 className="font-editorial-heading" style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: '600', color: darkMode ? '#FAF7F2' : '#3D3530' }}>
              🎉 {t('adPublishedSuccess')}
            </h3>

            <p style={{ margin: '0 0 20px', fontSize: '13px', color: darkMode ? '#D4C5B5' : '#6B5E54', lineHeight: 1.6 }}>
              {publishedListing ? `« ${publishedListing.title} » ${t('adPublishedSub')}` : t('adPublishedSub')}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={onViewPublishedListing}
                className="premium-button"
                style={{ width: '100%', border: 'none', borderRadius: '16px', padding: '14px', background: 'linear-gradient(135deg, #C67D5B 0%, #A8644A 100%)', color: '#FFFFFF', fontWeight: '800', fontSize: '14px', cursor: 'pointer', boxShadow: '0 10px 24px rgba(198,125,91,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <ChevronRight size={18} /> {t('viewMyAdBtn')}
              </button>

              <button
                onClick={onResetPublishWizard}
                className="premium-button"
                style={{ width: '100%', border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3', borderRadius: '16px', padding: '12px', backgroundColor: 'transparent', color: darkMode ? '#D4C5B5' : '#6B5E54', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <PlusCircle size={16} /> {t('publishAnotherAdBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FORMULAIRE DE PUBLICATION EN 4 ÉTAPES */}
      {(activeTab === 'publish' || activeTab === 'post') && (
        <div style={{ backgroundColor: darkMode ? '#231E1B' : '#FAF7F2', borderRadius: '28px', border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3', padding: '24px', boxShadow: darkMode ? '0 10px 30px rgba(0,0,0,0.5)' : '0 10px 30px rgba(61,53,48,0.06)', color: darkMode ? '#FAF7F2' : '#3D3530' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '700', padding: '6px 10px', borderRadius: '999px', backgroundColor: darkMode ? 'rgba(198,125,91,0.2)' : '#F5EAE4', color: '#C67D5B', marginBottom: '8px' }}>
                <PlusCircle size={12} /> {isEditingListing ? t('editAdTabTitle') : t('publishAdTabTitle')}
              </div>
              <h3 className="font-editorial-heading" style={{ margin: 0, fontSize: '24px', fontWeight: '600', color: darkMode ? '#FAF7F2' : '#3D3530', letterSpacing: '-0.01em' }}>{isEditingListing ? t('editAdHeadline') : t('createListingTitle')}</h3>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: darkMode ? '#D4C5B5' : '#6B5E54' }}>{t('wizardStepIndicator')} {postStep}/4</p>
            </div>
            {isEditingListing && (
              <button onClick={cancelEditListing} className="premium-button" style={{ border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3', borderRadius: '999px', padding: '8px 14px', backgroundColor: 'transparent', color: darkMode ? '#D4C5B5' : '#6B5E54', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>{t('cancelEdit')}</button>
            )}
          </div>

          {publishMessage && (
            <div style={{ marginBottom: '16px', padding: '10px 14px', borderRadius: '14px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', fontSize: '12px', fontWeight: '600' }}>
              {publishMessage}
            </div>
          )}

          {postStep === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: darkMode ? '#FAF7F2' : '#3D3530' }}>{t('adTitleLabel')}</label>
                <input
                  type="text"
                  value={postDraft.title}
                  onChange={(e) => setPostDraft(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex : Cours de Guitare Acoustique"
                  style={{ width: '100%', marginTop: '6px', padding: '11px 14px', border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3', borderRadius: '14px', fontSize: '14px', backgroundColor: darkMode ? '#1A1715' : '#FFF', color: darkMode ? '#FAF7F2' : '#3D3530', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: darkMode ? '#FAF7F2' : '#3D3530' }}>{t('categoryLabel')}</label>
                <select
                  value={postDraft.category}
                  onChange={(e) => setPostDraft(prev => ({ ...prev, category: e.target.value }))}
                  style={{ width: '100%', marginTop: '6px', padding: '11px 14px', border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3', borderRadius: '14px', fontSize: '14px', backgroundColor: darkMode ? '#1A1715' : '#FFF', color: darkMode ? '#FAF7F2' : '#3D3530', outline: 'none' }}
                >
                  {defaultCategories.filter(c => c !== 'Tous').map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>

                {(postDraft.category === 'Autre' || postDraft.category === 'Autre / Domaine personnalisé') && (
                  <div style={{ marginTop: '8px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '800', color: '#C67D5B', display: 'block', marginBottom: '4px' }}>
                      ✍️ Précisez votre catégorie personnalisée :
                    </label>
                    <input
                      type="text"
                      value={postDraft.customCategoryName || ''}
                      onChange={(e) => setPostDraft(prev => ({ ...prev, customCategoryName: e.target.value }))}
                      placeholder="Ex : Apiculture urbaine, Reliure d'art..."
                      style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #C67D5B', borderRadius: '12px', fontSize: '13px', backgroundColor: darkMode ? '#1A1715' : '#F5EAE4', color: darkMode ? '#FAF7F2' : '#3D3530', outline: 'none' }}
                    />
                  </div>
                )}
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: darkMode ? '#FAF7F2' : '#3D3530' }}>{t('descriptionLabel')}</label>
                <textarea
                  rows={4}
                  value={postDraft.description}
                  onChange={(e) => setPostDraft(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Décrivez précisément votre offre ou demande..."
                  style={{ width: '100%', marginTop: '6px', padding: '11px 14px', border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3', borderRadius: '14px', fontSize: '13px', backgroundColor: darkMode ? '#1A1715' : '#FFF', color: darkMode ? '#FAF7F2' : '#3D3530', resize: 'vertical', outline: 'none' }}
                />
              </div>
            </div>
          )}

          {postStep === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: darkMode ? '#FAF7F2' : '#3D3530' }}>{t('mainImageUrlLabel')}</label>
                <input
                  type="text"
                  value={postDraft.imageUrl}
                  onChange={(e) => setPostDraft(prev => ({ ...prev, imageUrl: e.target.value }))}
                  placeholder="https://images.unsplash.com/..."
                  style={{ width: '100%', marginTop: '6px', padding: '11px 14px', border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3', borderRadius: '14px', fontSize: '13px', backgroundColor: darkMode ? '#1A1715' : '#FFF', color: darkMode ? '#FAF7F2' : '#3D3530', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: darkMode ? '#FAF7F2' : '#3D3530' }}>{t('videoMp4UrlLabel')}</label>
                <input
                  type="text"
                  value={postDraft.videoUrl}
                  onChange={(e) => setPostDraft(prev => ({ ...prev, videoUrl: e.target.value }))}
                  placeholder="https://assets.mixkit.co/..."
                  style={{ width: '100%', marginTop: '6px', padding: '11px 14px', border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3', borderRadius: '14px', fontSize: '13px', backgroundColor: darkMode ? '#1A1715' : '#FFF', color: darkMode ? '#FAF7F2' : '#3D3530', outline: 'none' }}
                />
              </div>
            </div>
          )}

          {postStep === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* PRESETS RAPIDES */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: darkMode ? '#FAF7F2' : '#3D3530', display: 'block', marginBottom: '6px' }}>
                  ⚡ Formules rapides :
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setPostDraft(prev => ({ ...prev, compensation: 'credits', durationType: 'hourly', durationValue: '1' }))}
                    style={{ padding: '8px', borderRadius: '10px', border: '1px solid #C67D5B', backgroundColor: darkMode ? 'rgba(198,125,91,0.2)' : '#F5EAE4', color: '#A8644A', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}
                  >
                    🪙 1h / 1 Jeton
                  </button>
                  <button
                    type="button"
                    onClick={() => setPostDraft(prev => ({ ...prev, compensation: 'swap', durationType: 'daily', durationValue: '1' }))}
                    style={{ padding: '8px', borderRadius: '10px', border: '1px solid #9CAF88', backgroundColor: darkMode ? 'rgba(156,175,136,0.2)' : '#EBF0E6', color: '#3D4A35', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}
                  >
                    🔄 1 jour / Troc
                  </button>
                </div>
              </div>

              {/* SÉLECTEUR DE DURÉE */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: darkMode ? '#FAF7F2' : '#3D3530', display: 'block', marginBottom: '6px' }}>
                  ⏱️ Format & Unité de durée :
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px' }}>
                  <select
                    value={postDraft.durationType || 'hourly'}
                    onChange={(e) => setPostDraft(prev => ({ ...prev, durationType: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3', borderRadius: '12px', fontSize: '13px', backgroundColor: darkMode ? '#1A1715' : '#FFF', color: darkMode ? '#FAF7F2' : '#3D3530', outline: 'none' }}
                  >
                    <option value="hourly">À l'heure</option>
                    <option value="daily">À la journée</option>
                    <option value="monthly">Au mois</option>
                    <option value="fixed">Au forfait global</option>
                    <option value="indefinite">Indéfini / Libre</option>
                  </select>
                  <input
                    type="number"
                    min="1"
                    value={postDraft.durationValue || '1'}
                    onChange={(e) => setPostDraft(prev => ({ ...prev, durationValue: e.target.value }))}
                    placeholder="Qté"
                    style={{ width: '100%', padding: '10px 12px', border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3', borderRadius: '12px', fontSize: '13px', backgroundColor: darkMode ? '#1A1715' : '#FFF', color: darkMode ? '#FAF7F2' : '#3D3530', outline: 'none' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: darkMode ? '#FAF7F2' : '#3D3530' }}>{t('compensationTypeLabel')}</label>
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                  {[
                    { key: 'swap', label: 'Troc Direct' },
                    { key: 'credits', label: 'Jetons Troco' },
                    { key: 'cash', label: 'Euros €' },
                    { key: 'hybrid', label: 'Hybride' }
                  ].map(mode => (
                    <button
                      key={mode.key}
                      onClick={() => setPostDraft(prev => ({ ...prev, compensation: mode.key }))}
                      style={{ border: postDraft.compensation === mode.key ? '2px solid #C67D5B' : (darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3'), borderRadius: '12px', padding: '9px 14px', backgroundColor: postDraft.compensation === mode.key ? (darkMode ? 'rgba(198,125,91,0.25)' : '#F5EAE4') : (darkMode ? '#1A1715' : '#FFF'), color: postDraft.compensation === mode.key ? (darkMode ? '#FAF7F2' : '#A8644A') : (darkMode ? '#D4C5B5' : '#6B5E54'), fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              {(postDraft.compensation === 'cash' || postDraft.compensation === 'hybrid') && (
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: darkMode ? '#FAF7F2' : '#3D3530' }}>{t('euroAmountLabel')}</label>
                  <input
                    type="number"
                    min="0"
                    value={postDraft.price}
                    onChange={(e) => setPostDraft(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="20"
                    style={{ width: '100%', marginTop: '6px', padding: '11px 14px', border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3', borderRadius: '14px', fontSize: '14px', backgroundColor: darkMode ? '#1A1715' : '#FFF', color: darkMode ? '#FAF7F2' : '#3D3530', outline: 'none' }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px', padding: '12px', borderRadius: '14px', backgroundColor: darkMode ? '#1A1715' : '#FFF', border: darkMode ? '1px solid rgba(232,221,211,0.12)' : '1px solid #E8DDD3' }}>
                <input
                  type="checkbox"
                  id="urgent-check"
                  checked={postDraft.isUrgent}
                  onChange={(e) => setPostDraft(prev => ({ ...prev, isUrgent: e.target.checked }))}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#C67D5B' }}
                />
                <label htmlFor="urgent-check" style={{ fontSize: '13px', fontWeight: '700', color: darkMode ? '#FAF7F2' : '#3D3530', cursor: 'pointer' }}>
                  🔥 {t('enableUrgentOption')} (+1,99€)
                </label>
              </div>
            </div>
          )}

          {postStep === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ padding: '16px', borderRadius: '18px', backgroundColor: darkMode ? '#1A1715' : '#FFF', border: darkMode ? '1px solid rgba(232,221,211,0.12)' : '1px solid #E8DDD3' }}>
                <div style={{ fontSize: '11px', color: darkMode ? '#D4C5B5' : '#6B5E54', marginBottom: '6px' }}>{t('previewLabel')}</div>
                <img src={postDraft.imageUrl.trim() || getSuggestedImage(postDraft.title, postDraft.description)} alt="aperçu" style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '14px', marginBottom: '10px' }} />
                <div className="font-editorial-heading" style={{ fontSize: '18px', fontWeight: '600', color: darkMode ? '#FAF7F2' : '#3D3530' }}>{postDraft.title || t('titleToBeDefined')}</div>
                <div style={{ fontSize: '12px', color: '#C67D5B', margin: '6px 0', fontWeight: '700' }}>{postDraft.category}</div>
                <div style={{ fontSize: '13px', color: darkMode ? '#D4C5B5' : '#6B5E54', lineHeight: 1.6 }}>{postDraft.description || t('addDescriptionConvincing')}</div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '18px' }}>
            {postStep > 1 ? (
              <button onClick={() => setPostStep(prev => prev - 1)} className="premium-button" style={{ border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3', borderRadius: '999px', padding: '10px 16px', backgroundColor: 'transparent', color: darkMode ? '#D4C5B5' : '#6B5E54', fontWeight: '700', cursor: 'pointer' }}>{t('backButton')}</button>
            ) : <span />}
            {postStep < 4 ? (
              <button onClick={() => setPostStep(prev => prev + 1)} className="premium-button" style={{ border: 'none', borderRadius: '999px', padding: '10px 20px', background: 'linear-gradient(135deg, #C67D5B 0%, #A8644A 100%)', color: '#FFF', fontWeight: '800', cursor: 'pointer', boxShadow: '0 8px 18px rgba(198,125,91,0.25)' }}>{t('continueButton')}</button>
            ) : (
              <button 
                onClick={async () => {
                  try {
                    await addDoc(collection(db, 'listings'), {
                      ...postDraft,
                      author: profile.name || 'User',
                      createdAt: new Date().toISOString()
                    });
                    handlePublishAnnouncement();
                  } catch (e) {
                    console.error("Error adding document: ", e);
                    handlePublishAnnouncement();
                  }
                }} 
                className="premium-button" 
                style={{ border: 'none', borderRadius: '999px', padding: '10px 20px', background: 'linear-gradient(135deg, #C67D5B 0%, #A8644A 100%)', color: '#FFF', fontWeight: '800', cursor: 'pointer', boxShadow: '0 8px 18px rgba(198,125,91,0.25)' }}
              >
                {t('publishAdButton')}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
