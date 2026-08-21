import React, { useState } from 'react';
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
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 90 }}>
          <div style={{ backgroundColor: darkMode ? '#1E293B' : 'rgba(255,255,255,0.95)', backdropFilter: 'blur(28px) saturate(180%)', WebkitBackdropFilter: 'blur(28px) saturate(180%)', borderRadius: '28px', width: '100%', maxWidth: '440px', padding: '28px', boxShadow: '0 30px 80px rgba(0,0,0,0.3)', border: darkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(255,255,255,0.9)', textAlign: 'center', animation: 'popIn 0.4s cubic-bezier(0.22, 1, 0.36, 1)' }}>
            <div style={{ width: '72px', height: '72px', borderRadius: '50%', backgroundColor: '#D1FAE5', color: '#059669', margin: '0 auto 18px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 12px 24px rgba(16,185,129,0.25)' }}>
              <CheckCircle size={38} strokeWidth={2.5} />
            </div>

            <h3 style={{ margin: '0 0 8px', fontSize: '22px', fontWeight: '800', color: darkMode ? '#FFF' : '#111827' }}>
              🎉 {t('adPublishedSuccess')}
            </h3>

            <p style={{ margin: '0 0 20px', fontSize: '13px', color: darkMode ? '#94A3B8' : '#64748B', lineHeight: 1.6 }}>
              {publishedListing ? `« ${publishedListing.title} » ${t('adPublishedSub')}` : t('adPublishedSub')}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={onViewPublishedListing}
                className="premium-button"
                style={{ width: '100%', border: 'none', borderRadius: '16px', padding: '14px', backgroundColor: '#04265A', color: '#FFFFFF', fontWeight: '800', fontSize: '14px', cursor: 'pointer', boxShadow: '0 10px 24px rgba(4,38,90,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <ChevronRight size={18} /> {t('viewMyAdBtn')}
              </button>

              <button
                onClick={onResetPublishWizard}
                className="premium-button"
                style={{ width: '100%', border: '1px solid #D1D5DB', borderRadius: '16px', padding: '12px', backgroundColor: darkMode ? 'rgba(255,255,255,0.08)' : '#FFFFFF', color: darkMode ? '#FFF' : '#374151', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <PlusCircle size={16} /> {t('publishAnotherAdBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FORMULAIRE DE PUBLICATION EN 4 ÉTAPES */}
      {(activeTab === 'publish' || activeTab === 'post') && (
        <div style={{ backgroundColor: darkMode ? 'rgba(30,41,59,0.85)' : 'rgba(255,255,255,0.85)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', padding: '22px', borderRadius: '28px', border: darkMode ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(226,232,240,0.9)', boxShadow: '0 10px 30px rgba(15,23,42,0.06)', color: darkMode ? '#F8FAFC' : '#111827' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '700', padding: '6px 10px', borderRadius: '999px', backgroundColor: '#EFF6FF', color: '#04265A', marginBottom: '8px' }}>
                <PlusCircle size={12} /> {isEditingListing ? t('editAdTabTitle') : t('publishAdTabTitle')}
              </div>
              <h3 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: darkMode ? '#FFFFFF' : '#111827', letterSpacing: '-0.01em' }}>{isEditingListing ? t('editAdHeadline') : t('createListingTitle')}</h3>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: darkMode ? '#94A3B8' : '#64748B' }}>{t('wizardStepIndicator')} {postStep}/4</p>
            </div>
            {isEditingListing && (
              <button onClick={cancelEditListing} className="premium-button" style={{ border: '1px solid #D1D5DB', borderRadius: '999px', padding: '8px 14px', backgroundColor: '#FFF', color: '#374151', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>{t('cancelEdit')}</button>
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
                <label style={{ fontSize: '12px', fontWeight: '700', color: darkMode ? '#CBD5E1' : '#374151' }}>{t('adTitleLabel')}</label>
                <input
                  type="text"
                  value={postDraft.title}
                  onChange={(e) => setPostDraft(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex : Cours de Guitare Acoustique"
                  style={{ width: '100%', marginTop: '6px', padding: '11px 14px', border: '1px solid #D1D5DB', borderRadius: '14px', fontSize: '14px', backgroundColor: darkMode ? '#0F172A' : '#FFF', color: darkMode ? '#FFF' : '#111827' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: darkMode ? '#CBD5E1' : '#374151' }}>{t('categoryLabel')}</label>
                <select
                  value={postDraft.category}
                  onChange={(e) => setPostDraft(prev => ({ ...prev, category: e.target.value }))}
                  style={{ width: '100%', marginTop: '6px', padding: '11px 14px', border: '1px solid #D1D5DB', borderRadius: '14px', fontSize: '14px', backgroundColor: darkMode ? '#0F172A' : '#FFF', color: darkMode ? '#FFF' : '#111827' }}
                >
                  {defaultCategories.filter(c => c !== 'Tous').map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: darkMode ? '#CBD5E1' : '#374151' }}>{t('descriptionLabel')}</label>
                <textarea
                  rows={4}
                  value={postDraft.description}
                  onChange={(e) => setPostDraft(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Décrivez précisément votre offre ou demande..."
                  style={{ width: '100%', marginTop: '6px', padding: '11px 14px', border: '1px solid #D1D5DB', borderRadius: '14px', fontSize: '13px', backgroundColor: darkMode ? '#0F172A' : '#FFF', color: darkMode ? '#FFF' : '#111827', resize: 'vertical' }}
                />
              </div>
            </div>
          )}

          {postStep === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: darkMode ? '#CBD5E1' : '#374151' }}>{t('mainImageUrlLabel')}</label>
                <input
                  type="text"
                  value={postDraft.imageUrl}
                  onChange={(e) => setPostDraft(prev => ({ ...prev, imageUrl: e.target.value }))}
                  placeholder="https://images.unsplash.com/..."
                  style={{ width: '100%', marginTop: '6px', padding: '11px 14px', border: '1px solid #D1D5DB', borderRadius: '14px', fontSize: '13px', backgroundColor: darkMode ? '#0F172A' : '#FFF', color: darkMode ? '#FFF' : '#111827' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: darkMode ? '#CBD5E1' : '#374151' }}>{t('videoMp4UrlLabel')}</label>
                <input
                  type="text"
                  value={postDraft.videoUrl}
                  onChange={(e) => setPostDraft(prev => ({ ...prev, videoUrl: e.target.value }))}
                  placeholder="https://assets.mixkit.co/..."
                  style={{ width: '100%', marginTop: '6px', padding: '11px 14px', border: '1px solid #D1D5DB', borderRadius: '14px', fontSize: '13px', backgroundColor: darkMode ? '#0F172A' : '#FFF', color: darkMode ? '#FFF' : '#111827' }}
                />
              </div>
            </div>
          )}

          {postStep === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* PRESETS RAPIDES */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: darkMode ? '#CBD5E1' : '#374151', display: 'block', marginBottom: '6px' }}>
                  ⚡ Formules rapides :
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setPostDraft(prev => ({ ...prev, compensation: 'credits', durationType: 'hourly', durationValue: '1' }))}
                    style={{ padding: '8px', borderRadius: '10px', border: '1px solid #F59E0B', backgroundColor: '#FEF3C7', color: '#92400E', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}
                  >
                    🪙 1h / 1 Jeton
                  </button>
                  <button
                    type="button"
                    onClick={() => setPostDraft(prev => ({ ...prev, compensation: 'swap', durationType: 'daily', durationValue: '1' }))}
                    style={{ padding: '8px', borderRadius: '10px', border: '1px solid #10B981', backgroundColor: '#D1FAE5', color: '#065F46', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}
                  >
                    🔄 1 jour / Troc
                  </button>
                </div>
              </div>

              {/* SÉLECTEUR DE DURÉE */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: darkMode ? '#CBD5E1' : '#374151', display: 'block', marginBottom: '6px' }}>
                  ⏱️ Format & Unité de durée :
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px' }}>
                  <select
                    value={postDraft.durationType || 'hourly'}
                    onChange={(e) => setPostDraft(prev => ({ ...prev, durationType: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: '12px', fontSize: '13px', backgroundColor: darkMode ? '#0F172A' : '#FFF', color: darkMode ? '#FFF' : '#111827' }}
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
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: '12px', fontSize: '13px', backgroundColor: darkMode ? '#0F172A' : '#FFF', color: darkMode ? '#FFF' : '#111827' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: darkMode ? '#CBD5E1' : '#374151' }}>{t('compensationTypeLabel')}</label>
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
                      style={{ border: postDraft.compensation === mode.key ? '2px solid #04265A' : '1px solid #D1D5DB', borderRadius: '12px', padding: '9px 14px', backgroundColor: postDraft.compensation === mode.key ? '#EFF6FF' : '#FFF', color: '#111827', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              {(postDraft.compensation === 'cash' || postDraft.compensation === 'hybrid') && (
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: darkMode ? '#CBD5E1' : '#374151' }}>{t('euroAmountLabel')}</label>
                  <input
                    type="number"
                    min="0"
                    value={postDraft.price}
                    onChange={(e) => setPostDraft(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="20"
                    style={{ width: '100%', marginTop: '6px', padding: '11px 14px', border: '1px solid #D1D5DB', borderRadius: '14px', fontSize: '14px', backgroundColor: darkMode ? '#0F172A' : '#FFF', color: darkMode ? '#FFF' : '#111827' }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px', padding: '12px', borderRadius: '14px', backgroundColor: darkMode ? '#0F172A' : '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <input
                  type="checkbox"
                  id="urgent-check"
                  checked={postDraft.isUrgent}
                  onChange={(e) => setPostDraft(prev => ({ ...prev, isUrgent: e.target.checked }))}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="urgent-check" style={{ fontSize: '13px', fontWeight: '700', color: darkMode ? '#FFF' : '#111827', cursor: 'pointer' }}>
                  🔥 {t('enableUrgentOption')} (+1,99€)
                </label>
              </div>
            </div>
          )}

          {postStep === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ padding: '14px', borderRadius: '16px', backgroundColor: darkMode ? '#0F172A' : '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '6px' }}>{t('previewLabel')}</div>
                <img src={postDraft.imageUrl.trim() || getSuggestedImage(postDraft.title, postDraft.description)} alt="aperçu" style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '14px', marginBottom: '10px' }} />
                <div style={{ fontSize: '16px', fontWeight: '800', color: darkMode ? '#FFF' : '#111827' }}>{postDraft.title || t('titleToBeDefined')}</div>
                <div style={{ fontSize: '12px', color: '#64748B', margin: '6px 0' }}>{postDraft.category}</div>
                <div style={{ fontSize: '13px', color: darkMode ? '#CBD5E1' : '#475569', lineHeight: 1.6 }}>{postDraft.description || t('addDescriptionConvincing')}</div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '18px' }}>
            {postStep > 1 ? (
              <button onClick={() => setPostStep(prev => prev - 1)} className="premium-button" style={{ border: '1px solid #D1D5DB', borderRadius: '999px', padding: '10px 16px', backgroundColor: '#FFF', color: '#334155', fontWeight: '700', cursor: 'pointer' }}>{t('backButton')}</button>
            ) : <span />}
            {postStep < 4 ? (
              <button onClick={() => setPostStep(prev => prev + 1)} className="premium-button" style={{ border: 'none', borderRadius: '999px', padding: '10px 16px', backgroundColor: '#04265A', color: '#FFF', fontWeight: '700', cursor: 'pointer', boxShadow: '0 8px 18px rgba(4,38,90,0.2)' }}>{t('continueButton')}</button>
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
                style={{ border: 'none', borderRadius: '999px', padding: '10px 16px', backgroundColor: '#04265A', color: '#FFF', fontWeight: '700', cursor: 'pointer', boxShadow: '0 8px 18px rgba(4,38,90,0.2)' }}
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
