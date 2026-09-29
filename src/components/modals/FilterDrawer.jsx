import React, { useState, useEffect } from 'react';
import { X, Sparkles, MapPin, Bookmark, Plus, Pencil, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import UniversalModal from '../ui/UniversalModal';
import { getFlagEmoji } from '../../utils/flagUtils';
import { useFeedStore } from '../../stores/useFeedStore';
import { useConfirm } from '../../hooks/useConfirm';
import { auth } from '../../firebase';

export default function FilterDrawer({
  isOpen,
  onClose,
  filteredListingsCount = 0,
  isInfiniteRadius = false,
  setIsInfiniteRadius,
  radiusKm = 20,
  setRadiusKm,
  handleRequestGeolocation,
  isGeolocating = false,
  isGeolocated = false,
  selectedLanguages = ['FR', 'EN'],
  toggleLanguageFilter,
  selectedPayment = 'all',
  setSelectedPayment,
  hideDemos = false,
  setHideDemos,
  paymentOptions = ['all', 'credits', 'cash', 'troc', 'hybrid'],
  paymentLabels,
  darkMode = false,
  profile = null,
  t = (k) => k,
}) {
  const confirm = useConfirm();
  const {
    savedFilters,
    loadSavedFilters,
    addSavedFilter,
    renameSavedFilter,
    deleteSavedFilter,
    applySavedFilter,
  } = useFeedStore();

  const [isSavingFilter, setIsSavingFilter] = useState(false);
  const [newFilterName, setNewFilterName] = useState('');
  const [editingFilterId, setEditingFilterId] = useState(null);
  const [editFilterName, setEditFilterName] = useState('');

  const effectiveUid = profile?.uid || (auth?.currentUser && auth.currentUser.uid);

  // Charger les filtres sauvegardés dès l'ouverture si un UID est présent
  useEffect(() => {
    if (isOpen && effectiveUid) {
      loadSavedFilters(effectiveUid);
    }
  }, [isOpen, effectiveUid, loadSavedFilters]);

  const getPaymentLabel = (option) => {
    if (paymentLabels && paymentLabels[option]) return paymentLabels[option];
    if (option === 'all') return t('paymentAll') || t('all') || 'Tous';
    if (option === 'credits') return t('paymentCredits') || 'Crédits temps';
    if (option === 'cash') return t('paymentCash') || 'Rémunéré (€)';
    if (option === 'troc') return t('paymentTroc') || 'Troc direct';
    if (option === 'hybrid') return t('paymentHybrid') || 'Hybride';
    return option;
  };

  const handleSaveFilterSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!newFilterName.trim()) return;

    const currentFilters = {
      radiusKm,
      isInfiniteRadius,
      selectedPayment,
      selectedLanguages,
      hideDemos,
    };

    await addSavedFilter(effectiveUid, newFilterName.trim(), currentFilters);
    setNewFilterName('');
    setIsSavingFilter(false);
  };

  const handleRenameSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!editingFilterId || !editFilterName.trim()) return;

    await renameSavedFilter(effectiveUid, editingFilterId, editFilterName.trim());
    setEditingFilterId(null);
    setEditFilterName('');
  };

  const handleDeleteFilter = async (sf) => {
    const ok = await confirm({
      title: t('delete_filter_confirm_title', 'Supprimer le filtre ?'),
      message: t('delete_filter_confirm_message', 'Êtes-vous sûr de vouloir supprimer ce filtre sauvegardé ?'),
      confirmLabel: t('delete_filter', 'Supprimer'),
      cancelLabel: t('cancelBtn', 'Annuler'),
      variant: 'danger',
    });

    if (ok) {
      await deleteSavedFilter(effectiveUid, sf.id);
    }
  };

  const handleApplyFilter = (sf) => {
    if (!sf || !sf.filters) return;
    applySavedFilter(sf);

    const f = sf.filters;
    if (f.isInfiniteRadius !== undefined && typeof setIsInfiniteRadius === 'function') {
      setIsInfiniteRadius(f.isInfiniteRadius);
    }
    if (f.radiusKm !== undefined && typeof setRadiusKm === 'function') {
      setRadiusKm(f.radiusKm);
    }
    if (f.selectedPayment && typeof setSelectedPayment === 'function') {
      setSelectedPayment(f.selectedPayment);
    }
    if (f.hideDemos !== undefined && typeof setHideDemos === 'function') {
      setHideDemos(f.hideDemos);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <UniversalModal
          isOpen={isOpen}
          onClose={onClose}
          ariaLabel={t('filtersTitle')}
          showCloseButton={false}
          contentStyle={{
            width: '100%',
            maxWidth: '360px',
            height: '100%',
            maxHeight: 'none',
            overflow: 'visible',
            marginLeft: 'auto',
            borderRadius: 0,
          }}
          overlayStyle={{
            alignItems: 'stretch',
            justifyContent: 'flex-end',
            padding: 0,
          }}
        >
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '360px',
              height: '100%',
              backgroundColor: darkMode ? '#231E1B' : '#FAF7F2',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              padding: '20px',
              boxShadow: '-12px 0 40px rgba(0,0,0,0.25)',
              overflowY: 'auto',
              borderLeft: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3',
            }}
          >
            {/* EN-TÊTE DU TIROIR */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 className="font-editorial-heading" style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: darkMode ? '#FAF7F2' : '#3D3530' }}>
                {t('filtersTitle')}
              </h3>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fermer les filtres"
                style={{
                  border: 'none',
                  background: darkMode ? 'rgba(255,255,255,0.08)' : '#E8DDD3',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: darkMode ? '#FFF' : '#3D3530'
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* COMPTEUR D'ANNONCES RÉSULTANTES */}
            <div style={{
              padding: '10px 14px',
              borderRadius: '14px',
              backgroundColor: darkMode ? 'rgba(198,125,91,0.2)' : '#F5EAE4',
              border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3',
              color: darkMode ? '#FAF7F2' : '#A8644A',
              fontSize: '12px',
              fontWeight: '800',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Sparkles size={16} />
              <span>
                {isInfiniteRadius || radiusKm >= 100
                  ? `🎉 ${filteredListingsCount} ${t('listingsTotalInfinite') || 'annonces au total (Mode Infini & Visio)'}`
                  : `📍 ${filteredListingsCount} ${filteredListingsCount > 1 ? (t('results') || 'annonces') : (t('result') || 'annonce')} ${filteredListingsCount > 1 ? (t('availablePlural') || 'disponibles') : (t('availableSingular') || 'disponible')} ${t('withinRadius') || 'dans'} ${radiusKm} km`}
              </span>
            </div>

            {/* GÉOLOCALISATION SILENCIEUSE GEOPRIVACY BOUTON */}
            <div style={{ marginBottom: '14px' }}>
              <button
                type="button"
                onClick={handleRequestGeolocation}
                disabled={isGeolocating}
                aria-pressed={isGeolocated}
                aria-label={isGeolocated ? (t('disableSecureLocation') || 'Désactiver ma position sécurisée') : (t('useMyLocation') || 'Utiliser ma position')}
                className="premium-button"
                style={{
                  width: '100%',
                  border: isGeolocated ? '1px solid #9CAF88' : (darkMode ? '1px solid rgba(232,221,211,0.2)' : '1px solid #E8DDD3'),
                  backgroundColor: isGeolocated ? (darkMode ? 'rgba(156,175,136,0.25)' : '#EBF0E6') : (darkMode ? '#1A1715' : '#F5F0E8'),
                  color: isGeolocated ? '#3D4A35' : (darkMode ? '#FAF7F2' : '#3D3530'),
                  padding: '10px 14px',
                  borderRadius: '14px',
                  fontSize: '12px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <MapPin size={15} />
                {isGeolocating ? (t('locating') || 'Localisation...') : isGeolocated ? (t('secureLocationActive') || '✓ Position sécurisée (Rayon flou)') : (t('useMyLocation') || 'Utiliser ma position')}
              </button>
            </div>

            {/* RAYON DE RECHERCHE */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label htmlFor="filter-radius-slider" style={{ fontSize: '12px', fontWeight: '700', color: darkMode ? '#D4C5B5' : '#3D3530' }}>
                  {t('searchRadius') || 'Rayon géographique'}
                </label>
                <span style={{ fontSize: '12px', fontWeight: '800', color: '#C67D5B' }}>
                  {isInfiniteRadius ? (t('infinite') || '∞ Illimité') : `${radiusKm} km`}
                </span>
              </div>
              <input
                id="filter-radius-slider"
                type="range"
                min="5"
                max="100"
                step="5"
                value={isInfiniteRadius ? 100 : radiusKm}
                disabled={isInfiniteRadius}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setRadiusKm(val);
                }}
                style={{
                  width: '100%',
                  accentColor: '#C67D5B',
                  opacity: isInfiniteRadius ? 0.4 : 1,
                  cursor: isInfiniteRadius ? 'not-allowed' : 'pointer'
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                <span style={{ fontSize: '10px', color: darkMode ? '#A8998C' : '#8C7D73' }}>5 km</span>
                <button
                  type="button"
                  onClick={() => setIsInfiniteRadius(!isInfiniteRadius)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '11px',
                    fontWeight: '700',
                    color: isInfiniteRadius ? '#C67D5B' : (darkMode ? '#A8998C' : '#8C7D73'),
                    cursor: 'pointer',
                    textDecoration: isInfiniteRadius ? 'underline' : 'none'
                  }}
                >
                  {isInfiniteRadius ? `✓ ${t('infiniteModeActive') || 'Mode Partout actif'}` : (t('allFrance') || 'Toute la France / Distanciel')}
                </button>
                <span style={{ fontSize: '10px', color: darkMode ? '#A8998C' : '#8C7D73' }}>100 km</span>
              </div>
            </div>

            {/* FILTRE PAR LANGUE */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: darkMode ? '#D4C5B5' : '#3D3530', display: 'block', marginBottom: '8px' }}>
                {t('languagesFilter') || 'Langues parlées'}
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {['FR', 'EN', 'ES', 'IT', 'DE', 'JA', 'ZH'].map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => toggleLanguageFilter(code)}
                    aria-pressed={selectedLanguages.includes(code)}
                    style={{
                      border: selectedLanguages.includes(code) ? '1px solid #C67D5B' : (darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3'),
                      backgroundColor: selectedLanguages.includes(code) ? (darkMode ? 'rgba(198,125,91,0.25)' : '#F5EAE4') : (darkMode ? '#1A1715' : '#FAF7F2'),
                      color: selectedLanguages.includes(code) ? (darkMode ? '#FAF7F2' : '#A8644A') : (darkMode ? '#D4C5B5' : '#6B5E54'),
                      borderRadius: '999px',
                      padding: '5px 10px',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      lineHeight: 1
                    }}
                  >
                    {getFlagEmoji(code)}
                  </button>
                ))}
              </div>
            </div>

            {/* FILTRE DES ANNONCES DÉMO */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginTop: '16px',
                marginBottom: '14px',
                color: darkMode ? '#FAF7F2' : '#3D3530',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={hideDemos}
                role="checkbox"
                aria-checked={hideDemos}
                onChange={(e) => setHideDemos?.(e.target.checked)}
                style={{ accentColor: '#C67D5B', width: '16px', height: '16px' }}
              />
              {t('hideDemos') || 'Masquer les démos'}
            </label>

            {/* FILTRE MODE DE RÉTRIBUTION */}
            <label style={{ fontSize: '12px', fontWeight: '700', color: darkMode ? '#D4C5B5' : '#3D3530' }}>
              {t('retributionType') || t('retribution') || 'Rétribution'}
            </label>
            <div role="group" aria-label="Filtres de rétribution" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
              {paymentOptions.map(option => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setSelectedPayment(option)}
                  aria-pressed={selectedPayment === option}
                  style={{
                    border: selectedPayment === option ? '1px solid #C67D5B' : (darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3'),
                    backgroundColor: selectedPayment === option ? (darkMode ? 'rgba(198,125,91,0.25)' : '#F5EAE4') : (darkMode ? '#1A1715' : '#FAF7F2'),
                    color: selectedPayment === option ? (darkMode ? '#FAF7F2' : '#A8644A') : (darkMode ? '#D4C5B5' : '#6B5E54'),
                    borderRadius: '999px',
                    padding: '6px 10px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  {getPaymentLabel(option)}
                </button>
              ))}
            </div>

            {/* SECTION FILTRES SAUVEGARDÉS (FAC-05) */}
            <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '800', color: darkMode ? '#FAF7F2' : '#3D3530' }}>
                  <Bookmark size={15} color="var(--accent-primary, #C67D5B)" />
                  <span>{t('saved_filters_title', 'Filtres sauvegardés')}</span>
                </div>
                {!isSavingFilter && (
                  <button
                    type="button"
                    onClick={() => setIsSavingFilter(true)}
                    className="premium-button"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11px',
                      fontWeight: '700',
                      padding: '4px 10px',
                      borderRadius: '999px',
                      backgroundColor: 'var(--accent-primary, #C67D5B)',
                      color: '#FFFFFF',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <Plus size={13} /> {t('save_current_filters', 'Sauvegarder')}
                  </button>
                )}
              </div>

              {/* Formulaire de sauvegarde inline */}
              {isSavingFilter && (
                <div style={{
                  padding: '12px',
                  borderRadius: '14px',
                  backgroundColor: darkMode ? '#1A1715' : '#F5EAE4',
                  border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3',
                  marginBottom: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <input
                    type="text"
                    value={newFilterName}
                    onChange={(e) => setNewFilterName(e.target.value)}
                    placeholder={t('filter_name_placeholder', 'Nom du filtre (ex: Proche de moi, Troc...)')}
                    autoFocus
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '10px',
                      border: darkMode ? '1px solid rgba(232,221,211,0.2)' : '1px solid #D4C5B5',
                      backgroundColor: darkMode ? '#231E1B' : '#FFFFFF',
                      color: darkMode ? '#FAF7F2' : '#3D3530',
                      fontSize: '12px',
                      fontWeight: '600',
                      boxSizing: 'border-box'
                    }}
                  />
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => { setIsSavingFilter(false); setNewFilterName(''); }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: darkMode ? '1px solid rgba(232,221,211,0.2)' : '1px solid #D4C5B5',
                        backgroundColor: 'transparent',
                        color: darkMode ? '#D4C5B5' : '#6B5E54',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      {t('cancelBtn', 'Annuler')}
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveFilterSubmit}
                      disabled={!newFilterName.trim()}
                      className="premium-button"
                      style={{
                        padding: '6px 14px',
                        borderRadius: '8px',
                        backgroundColor: 'var(--accent-primary, #C67D5B)',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: newFilterName.trim() ? 'pointer' : 'not-allowed',
                        opacity: newFilterName.trim() ? 1 : 0.6
                      }}
                    >
                      {t('confirmBtn', 'Enregistrer')}
                    </button>
                  </div>
                </div>
              )}

              {/* Formulaire pour renommer un filtre */}
              {editingFilterId && (
                <div style={{
                  padding: '12px',
                  borderRadius: '14px',
                  backgroundColor: darkMode ? '#1A1715' : '#F5EAE4',
                  border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3',
                  marginBottom: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: darkMode ? '#D4C5B5' : '#6B5E54' }}>
                    {t('rename_filter', 'Renommer le filtre')}
                  </span>
                  <input
                    type="text"
                    value={editFilterName}
                    onChange={(e) => setEditFilterName(e.target.value)}
                    autoFocus
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '10px',
                      border: darkMode ? '1px solid rgba(232,221,211,0.2)' : '1px solid #D4C5B5',
                      backgroundColor: darkMode ? '#231E1B' : '#FFFFFF',
                      color: darkMode ? '#FAF7F2' : '#3D3530',
                      fontSize: '12px',
                      fontWeight: '600',
                      boxSizing: 'border-box'
                    }}
                  />
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => { setEditingFilterId(null); setEditFilterName(''); }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: darkMode ? '1px solid rgba(232,221,211,0.2)' : '1px solid #D4C5B5',
                        backgroundColor: 'transparent',
                        color: darkMode ? '#D4C5B5' : '#6B5E54',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      {t('cancelBtn', 'Annuler')}
                    </button>
                    <button
                      type="button"
                      onClick={handleRenameSubmit}
                      disabled={!editFilterName.trim()}
                      className="premium-button"
                      style={{
                        padding: '6px 14px',
                        borderRadius: '8px',
                        backgroundColor: 'var(--accent-primary, #C67D5B)',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: editFilterName.trim() ? 'pointer' : 'not-allowed',
                        opacity: editFilterName.trim() ? 1 : 0.6
                      }}
                    >
                      {t('confirmBtn', 'Valider')}
                    </button>
                  </div>
                </div>
              )}

              {/* Liste des filtres sauvegardés */}
              {savedFilters && savedFilters.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {savedFilters.map((sf) => (
                    <div
                      key={sf.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        borderRadius: '12px',
                        backgroundColor: darkMode ? '#1A1715' : '#FFFFFF',
                        border: darkMode ? '1px solid rgba(232,221,211,0.1)' : '1px solid #E8DDD3',
                        gap: '8px'
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: darkMode ? '#FAF7F2' : '#3D3530', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {sf.name}
                        </div>
                        <div style={{ fontSize: '10px', color: darkMode ? '#D4C5B5' : '#8C7D73', marginTop: '2px' }}>
                          {sf.filters?.isInfiniteRadius ? '∞ km' : `${sf.filters?.radiusKm || 20}km`} • {getPaymentLabel(sf.filters?.selectedPayment || 'all')}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button
                          type="button"
                          onClick={() => handleApplyFilter(sf)}
                          title={t('apply_filter', 'Appliquer')}
                          style={{
                            padding: '5px 9px',
                            borderRadius: '8px',
                            backgroundColor: darkMode ? 'rgba(198,125,91,0.2)' : '#F5EAE4',
                            color: 'var(--accent-primary, #C67D5B)',
                            border: 'none',
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: 'pointer'
                          }}
                        >
                          {t('apply_filter', 'Appliquer')}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setEditingFilterId(sf.id); setEditFilterName(sf.name); }}
                          title={t('rename_filter', 'Renommer')}
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: 'transparent',
                            color: darkMode ? '#D4C5B5' : '#8C7D73',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                          }}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteFilter(sf)}
                          title={t('delete_filter', 'Supprimer')}
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: 'transparent',
                            color: '#EF4444',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '11px', color: darkMode ? '#D4C5B5' : '#8C7D73', fontStyle: 'italic', padding: '6px 0' }}>
                  {t('no_saved_filters', 'Aucun filtre enregistré')}
                </div>
              )}
            </div>
          </motion.div>
        </UniversalModal>
      )}
    </AnimatePresence>
  );
}
