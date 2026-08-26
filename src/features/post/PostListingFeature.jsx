import React, { useState, useRef, Suspense } from 'react';
import {
  Sparkles,
  Plus,
  Sliders,
  Tag,
  X,
  MapPin,
  Flame,
} from 'lucide-react';
import { auth, db } from '../../firebase';
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import {
  getSuggestedMedia as defaultGetSuggestedMedia,
  getFallbackImage as defaultGetFallbackImage,
} from '../../utils/mediaUtils';
import {
  searchNominatim,
  reverseGeocodeNominatim,
  applyPrivacyBlur,
} from '../../utils/geocodingNominatim';
import { validateListingContent } from '../../utils/moderationBlacklist';
import { analyzeContent } from '../../utils/contentModeration';
import { playApplePaySound } from '../../utils/audioService';
import InvoiceCalculator, {
  calculateListingInvoice,
  generateInvoiceRef,
} from '../../components/InvoiceCalculator';
import { SkeletonModalFallback } from '../../components/SkeletonLoader';

// Lazy loading des sous-composants lourds de création
const PhotoGrid = React.lazy(() => import('../../components/PhotoGrid'));
const VideoEditorModal = React.lazy(() => import('../../components/VideoEditorModal'));

// Helper compression d'image local
const compressImage = (file, maxWidth = 800, maxHeight = 800, quality = 0.75) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(event.target.result);
    };
    reader.onerror = () => resolve(null);
  });
};

export default function PostListingFeature({
  profile = {},
  setProfile = () => {},
  listings = [],
  setListings = () => {},
  postDraft = {},
  setPostDraft = () => {},
  postStep = 1,
  setPostStep = () => {},
  isEditingListing = false,
  setIsEditingListing = () => {},
  editingOriginalListing = null,
  setEditingOriginalListing = () => {},
  publishMessage = '',
  setPublishMessage = () => {},
  userCoords = null,
  customCategories = [],
  setCustomCategories = () => {},
  setUserTransactions = () => {},
  openCheckout = () => {},
  setSelectedListing = () => {},
  setPublishedListing = () => {},
  setShowPublishedPopup = () => {},
  darkMode = false,
  t = (k) => k,
  currentLang = 'FR',
  formatCompensation = (v) => v,
  getListingDetail = (l) => l,
  getCoordinatesForLocation = () => [48.8566, 2.3522],
  generateTags: propGenerateTags,
  getSuggestedMedia = defaultGetSuggestedMedia,
  getSuggestedImage = defaultGetFallbackImage,
}) {
  // États internes du tunnel de publication
  const [tagInputValue, setTagInputValue] = useState('');
  const [nominatimSuggestions, setNominatimSuggestions] = useState([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const nominatimTimeoutRef = useRef(null);

  // État de l'éditeur vidéo
  const [isVideoEditorOpen, setIsVideoEditorOpen] = useState(false);
  const [editingVideoData, setEditingVideoData] = useState(null);

  const defaultGenerateTags = (title = '', description = '') => {
    const text = `${title} ${description}`.toLowerCase();
    const tags = [];
    const rules = [
      { re: /(cours|leçon|lecon|coaching|formation|apprendre|séance|seance|niveau)/, tag: 'Cours' },
      { re: /(piano|guitare|musique|beatmaking|ableton|solfège|production|chant)/, tag: 'Musique' },
      { re: /(cuisine|pâtisserie|patisserie|pizza|recette|robot pâtissier)/, tag: 'Cuisine' },
      { re: /(perceuse|outil|outillage|bricolage|forets|nettoyeur|jardinage|tondeuse)/, tag: 'Bricolage' },
      { re: /(iphone|smartphone|écran|ecran|réparation|reparation|panne|dépannage)/, tag: 'Dépannage' },
      { re: /(appartement|maison|logement|échange|echange|swap|chalet|studio|séjour|sejour)/, tag: 'Logement' },
      { re: /(python|code|informatique|développement|developpement|script|données|data)/, tag: 'Tech' },
      { re: /(vélo|velo|sport|musculation|yoga|posture|fitness)/, tag: 'Sport & Bien-être' },
      { re: /(chien|animal|garde)/, tag: 'Animaux' },
      { re: /(photo|camera|vidéo|video|montage|objectif)/, tag: 'Photo & Vidéo' },
      { re: /(visio|distance|en ligne|monde)/, tag: 'À distance' },
      { re: /(urgence|urgent|ce soir|aujourd|rapide|problème|probleme)/, tag: 'Urgent' },
    ];
    rules.forEach((rule) => {
      if (rule.re.test(text) && !tags.includes(rule.tag)) tags.push(rule.tag);
    });
    if (tags.length === 0) tags.push('Échange');
    return tags.slice(0, 4);
  };

  const generateTags = propGenerateTags || defaultGenerateTags;

  // ---- GESTIONNAIRES PHOTOGRID ----
  const handlePhotoGridAdd = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const currentGallery = postDraft.gallery && postDraft.gallery.length > 0
      ? [...postDraft.gallery]
      : (postDraft.imageUrl ? [postDraft.imageUrl] : []);

    for (const file of files) {
      if (currentGallery.length >= 8) break;
      const compressed = await compressImage(file, 800, 800, 0.75);
      if (compressed) {
        currentGallery.push(compressed);
      }
    }

    setPostDraft(prev => ({
      ...prev,
      gallery: currentGallery,
      imageUrl: currentGallery[0] || prev.imageUrl,
    }));
    event.target.value = '';
  };

  const handlePhotoGridRemove = (index) => {
    const currentGallery = postDraft.gallery && postDraft.gallery.length > 0
      ? [...postDraft.gallery]
      : (postDraft.imageUrl ? [postDraft.imageUrl] : []);
    const updated = currentGallery.filter((_, i) => i !== index);
    setPostDraft(prev => ({
      ...prev,
      gallery: updated,
      imageUrl: updated[0] || '',
    }));
  };

  const handlePhotoGridUpdate = (index, newPhotoDataUrl) => {
    const currentGallery = postDraft.gallery && postDraft.gallery.length > 0
      ? [...postDraft.gallery]
      : (postDraft.imageUrl ? [postDraft.imageUrl] : []);
    if (index >= 0 && index < currentGallery.length) {
      const updated = [...currentGallery];
      updated[index] = newPhotoDataUrl;
      setPostDraft(prev => ({
        ...prev,
        gallery: updated,
        imageUrl: updated[0] || prev.imageUrl,
      }));
    }
  };

  const handlePhotoGridAutoGenerate = () => {
    const suggested = getSuggestedMedia(postDraft.title, postDraft.description);
    const updatedGallery = suggested.gallery && suggested.gallery.length > 0 ? suggested.gallery : [suggested.image];
    setPostDraft(prev => ({
      ...prev,
      imageUrl: suggested.image,
      videoUrl: suggested.video,
      gallery: updatedGallery,
    }));
  };

  // ---- GESTIONNAIRES ÉDITEUR VIDÉO ----
  const handleOpenVideoEditor = (videoSourceUrl = null) => {
    const targetUrl = videoSourceUrl || postDraft.videoUrl || getSuggestedMedia(postDraft.title, postDraft.description, postDraft.imageUrl, postDraft.videoUrl).video;
    setEditingVideoData({
      url: targetUrl,
      trimStart: Number(postDraft.videoTrimStart || 0),
      trimEnd: Number(postDraft.videoTrimEnd || 0),
      cropRatio: postDraft.cropRatio || '16:9',
    });
    setIsVideoEditorOpen(true);
  };

  const handleSaveVideoEdits = (videoData) => {
    setPostDraft(prev => ({
      ...prev,
      videoUrl: videoData.videoUrl,
      videoTrimStart: videoData.trimStart,
      videoTrimEnd: videoData.trimEnd,
      cropRatio: videoData.cropRatio,
      videoMetadata: videoData,
    }));
    setIsVideoEditorOpen(false);
  };

  const handleVideoFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPostDraft(prev => ({
        ...prev,
        videoUrl: reader.result,
        videoTrimStart: 0,
        videoTrimEnd: 0,
        cropRatio: '16:9',
      }));
      setEditingVideoData({
        url: reader.result,
        trimStart: 0,
        trimEnd: 0,
        cropRatio: '16:9',
      });
      setIsVideoEditorOpen(true);
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  // ---- PUBLICATION FINALE DE L'ANNONCE ----
  const handlePublishAnnouncement = async () => {
    const rawTitle = (postDraft.title || '').trim();
    const rawDescription = (postDraft.description || '').trim();

    if (!rawTitle || !rawDescription) {
      setPublishMessage(currentLang === 'FR' ? 'Ajoute un titre et une description pour publier ton annonce.' : currentLang === 'EN' ? 'Add a title and a description to publish your ad.' : currentLang === 'ES' ? 'Añade un título y una descripción para publicar tu anuncio.' : currentLang === 'IT' ? 'Aggiungi un titre e una descrizione per pubblicare il tuo annuncio.' : currentLang === 'DE' ? 'Füge einen Titel und eine Beschreibung hinzu, um deine Anzeige zu veröffentlichen.' : currentLang === 'JA' ? 'タイトルと説明を追加して広告を公開してください。' : '添加标题和描述以发布您的广告。');
      return;
    }

    // Modération automatique
    const blacklistCheck = validateListingContent({
      title: rawTitle,
      description: rawDescription,
      tags: postDraft.tags || [],
    });
    if (!blacklistCheck.isValid) {
      setPublishMessage(blacklistCheck.errorMessage);
      alert(blacklistCheck.errorMessage);
      return;
    }

    const moderationAnalysis = analyzeContent(`${rawTitle} ${rawDescription}`);
    if (!moderationAnalysis.isClean && moderationAnalysis.score >= 40) {
      setPublishMessage(`⚠️ Annonce non conforme aux règles Troco : ${moderationAnalysis.reasons.join(' ')}`);
      return;
    }

    const wantsUrgent = postDraft.isUrgent;
    const compensationText = postDraft.compensation === 'credits'
      ? '1h = 1 Crédit'
      : postDraft.compensation === 'cash'
        ? `${postDraft.price || '20'}€`
        : postDraft.compensation === 'hybrid'
          ? `${postDraft.trocoTokens || 0} Jetons + ${postDraft.euroAmount || 0}€`
          : 'Troc direct';

    const cautionText = postDraft.requiresCaution
      ? `Caution virtuelle ${postDraft.cautionAmount || 0}€`
      : (postDraft.caution && typeof postDraft.caution === 'string' ? postDraft.caution.trim() : null);

    const generatedTags = postDraft.tags && postDraft.tags.length > 0 ? postDraft.tags : generateTags(rawTitle, rawDescription);
    const media = getSuggestedMedia(rawTitle, rawDescription, postDraft.imageUrl, postDraft.videoUrl);

    const baseTranslations = {};
    const lowerTitle = rawTitle.toLowerCase();
    const isPython = lowerTitle.includes('python');
    ['EN', 'ES', 'IT', 'DE', 'JA', 'ZH'].forEach(l => {
      let tTitle = rawTitle;
      let tDesc = rawDescription;
      if (isPython) {
        if (l === 'EN') tTitle = tTitle.replace(/cours/i, 'COURSE');
        if (l === 'ES') tTitle = tTitle.replace(/cours/i, 'CURSO');
        if (l === 'IT') tTitle = tTitle.replace(/cours/i, 'CORSO');
        if (l === 'DE') tTitle = tTitle.replace(/cours/i, 'KURS');
        if (l === 'JA') tTitle = 'Pythonレッスン';
        if (l === 'ZH') tTitle = 'Python课程';
      }
      baseTranslations[l] = { title: tTitle, description: `[${l}] ${tDesc}` };
    });

    const finalGallery = postDraft.gallery && postDraft.gallery.length > 0 ? postDraft.gallery : media.gallery;

    const finalCategory = ((postDraft.category === 'Autre' || postDraft.category === 'Autre / Domaine personnalisé') && postDraft.customCategoryName?.trim())
      ? postDraft.customCategoryName.trim()
      : postDraft.category;

    if (postDraft.customCategoryName?.trim() && !customCategories.includes(postDraft.customCategoryName.trim())) {
      setCustomCategories(prev => [...prev, postDraft.customCategoryName.trim()]);
    }

    const isBlurred = postDraft.locationPrivacy === 'blurred';
    const blurOffsetLat = isBlurred ? (Math.random() - 0.5) * 0.009 : 0;
    const blurOffsetLng = isBlurred ? (Math.random() - 0.5) * 0.009 : 0;
    const baseCoords = postDraft.coordinates || getCoordinatesForLocation(postDraft.location) || (userCoords ? userCoords : [48.8566, 2.3522]);
    const resolvedCoords = [baseCoords[0] + blurOffsetLat, baseCoords[1] + blurOffsetLng];

    const newListing = {
      ...(isEditingListing ? editingOriginalListing : {}),
      id: isEditingListing ? editingOriginalListing.id : Date.now(),
      title: rawTitle,
      author: profile.name || 'Utilisateur',
      category: finalCategory,
      customCategory: (postDraft.category === 'Autre' || postDraft.category === 'Autre / Domaine personnalisé') || Boolean(postDraft.customCategoryName?.trim()),
      customCategoryName: postDraft.customCategoryName?.trim() || null,
      verified: isEditingListing ? editingOriginalListing.verified : (profile?.kycVerified || false),
      rating: isEditingListing ? editingOriginalListing.rating : null,
      reviews: isEditingListing ? (editingOriginalListing.reviews || 0) : 0,
      status: postDraft.status || 'active',
      location: (postDraft.location || '').trim() || (postDraft.format === 'remote' ? 'À distance' : 'Sur place'),
      locationPrivacy: postDraft.locationPrivacy || 'exact',
      coordinates: isEditingListing && editingOriginalListing.coordinates ? editingOriginalListing.coordinates : resolvedCoords,
      type: postDraft.format,
      languages: profile.languages ? profile.languages.slice(0, 2) : ['FR'],
      compensation: compensationText,
      image: finalGallery[0] || media.image,
      video: postDraft.videoUrl || media.video,
      videoUrl: postDraft.videoUrl || media.video,
      videoTrimStart: Number(postDraft.videoTrimStart || 0),
      videoTrimEnd: Number(postDraft.videoTrimEnd || 0),
      cropRatio: postDraft.cropRatio || '16:9',
      videoMetadata: postDraft.videoMetadata || {
        trimStart: Number(postDraft.videoTrimStart || 0),
        trimEnd: Number(postDraft.videoTrimEnd || 0),
        cropRatio: postDraft.cropRatio || '16:9'
      },
      gallery: finalGallery,
      urgent: wantsUrgent,
      caution: cautionText,
      description: rawDescription,
      tags: generatedTags,
      isCollaborative: postDraft.type === 'collaborative_project' || Boolean(postDraft.isCollaborative),
      postType: postDraft.type || 'offer',
      nativeLang: 'FR',
      translations: baseTranslations,
    };

    const textChanged = isEditingListing
      ? (rawTitle !== (editingOriginalListing?.title || '') || rawDescription !== (editingOriginalListing?.description || ''))
      : false;
    const invoiceCalc = calculateListingInvoice({
      isUrgent: wantsUrgent,
      photoCount: finalGallery.length,
      isEditing: isEditingListing,
      isEditingContentChanged: textChanged,
    });

    const totalToPay = invoiceCalc.totalTTC;

    if (totalToPay > 0 && (profile.euroBalance || 0) < totalToPay) {
      openCheckout({
        mode: 'publish-options',
        amount: totalToPay,
        label: isEditingListing ? `Options modification annonce (${totalToPay.toFixed(2)} €)` : `Options de publication (${totalToPay.toFixed(2)} €)`,
        payload: { newListing, invoiceCalc }
      });
      return;
    }

    if (totalToPay > 0) {
      setProfile(prev => ({ ...prev, euroBalance: Number(((prev.euroBalance || 0) - totalToPay).toFixed(2)) }));

      const invoiceRef = generateInvoiceRef();
      const txRecord = {
        id: `tx-${Date.now()}`,
        type: isEditingListing ? 'edit-listing' : 'publish-options',
        title: isEditingListing ? `Modification annonce — ${rawTitle}` : `Options publication — ${rawTitle}`,
        amount: totalToPay,
        currency: 'EUR',
        status: 'completed',
        invoiceRef: invoiceRef,
        date: new Date().toISOString(),
        createdAt: serverTimestamp(),
        userId: profile.uid || auth.currentUser?.uid || 'anonymous',
        items: invoiceCalc.items,
      };
      try {
        await addDoc(collection(db, 'transactions'), txRecord);
      } catch (e) {
        console.warn('[Firestore] transaction addDoc failed:', e);
      }
      setUserTransactions(prev => [txRecord, ...prev]);
    }

    if (isEditingListing) {
      setListings(prev => prev.map(item => item.id === newListing.id ? newListing : item));
      if (editingOriginalListing?.firestoreId) {
        try {
          const { id: _localId, firestoreId: _fid, ...firestorePayload } = newListing;
          await updateDoc(doc(db, 'listings', editingOriginalListing.firestoreId), {
            ...firestorePayload,
            updatedAt: serverTimestamp(),
          });
        } catch (e) {
          console.warn('[Firestore] updateDoc failed:', e);
        }
      }
    } else {
      setListings(prev => [newListing, ...prev]);
      try {
        const { id: _localId, ...firestorePayload } = newListing;
        await addDoc(collection(db, 'listings'), {
          ...firestorePayload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (e) {
        console.warn('[Firestore] addDoc failed:', e);
      }
    }

    const urgentMsg = wantsUrgent ? ' • Option Urgent activée' : '';
    const publishedMsg = isEditingListing
      ? (currentLang === 'FR' ? 'Annonce modifiée avec succès :' : 'Listing updated successfully:')
      : (currentLang === 'FR' ? 'Annonce publiée avec succès :' : 'Listing published successfully:');
    setPublishMessage(`${publishedMsg} ${newListing.title}${urgentMsg}`);

    playApplePaySound();

    const updatedListingDetail = getListingDetail(newListing);
    setPublishedListing(updatedListingDetail);
    setShowPublishedPopup(true);
    setSelectedListing(updatedListingDetail);

    setIsEditingListing(false);
    setEditingOriginalListing(null);
    setPostStep(1);
    setPostDraft({
      type: 'offer',
      status: 'active',
      title: '',
      category: 'Cours & Compétences',
      customCategoryName: '',
      format: 'onsite',
      description: '',
      compensation: 'credits',
      durationType: 'hourly',
      durationValue: '1',
      price: '20',
      location: '',
      availability: '',
      caution: '',
      requiresCaution: false,
      cautionAmount: '',
      trocoTokens: '1',
      euroAmount: '',
      isUrgent: false,
      locationPrivacy: 'exact',
      coordinates: null,
      image: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=800&q=80',
      imageUrl: '',
      videoUrl: '',
    });
  };

  return (
    <>
      <div style={{ backgroundColor: 'var(--bg-card)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', padding: '20px', borderRadius: '24px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)', color: 'var(--text-main)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '800', padding: '6px 10px', borderRadius: '999px', backgroundColor: 'var(--bg-subtle)', color: 'var(--accent-primary)', marginBottom: '8px' }}>
              <Sparkles size={12} /> {t('guidedPath')}
            </div>
            <h2 className="font-editorial-heading" style={{ fontSize: '24px', fontWeight: '600', color: 'var(--text-main)', margin: 0 }}>{t('postTitle')}</h2>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '700' }}>{postStep}/4</div>
        </div>
        {publishMessage && (
          <div style={{ marginBottom: '14px', padding: '12px 14px', borderRadius: '14px', backgroundColor: 'var(--bg-subtle)', color: 'var(--accent-primary)', fontSize: '13px', fontWeight: '700', lineHeight: 1.5, border: '1px solid var(--border-color)' }}>
            {publishMessage}
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          {[1, 2, 3, 4].map(step => (
            <div key={step} style={{ flex: 1, height: '6px', borderRadius: '999px', backgroundColor: postStep >= step ? 'var(--accent-primary)' : 'var(--border-color)', transition: 'all 0.3s ease' }} />
          ))}
        </div>

        {/* ÉTAPE 1 : TYPE D'ANNONCE */}
        {postStep === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{t('chooseAdTypePrompt')}</div>
            <button onClick={() => setPostDraft(prev => ({ ...prev, type: 'offer', isCollaborative: false }))} style={{ border: '1.5px solid', borderColor: postDraft.type === 'offer' ? 'var(--accent-primary)' : 'var(--border-color)', borderRadius: '16px', padding: '14px', backgroundColor: postDraft.type === 'offer' ? 'var(--bg-subtle)' : 'var(--bg-card)', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: postDraft.type === 'offer' ? 'var(--shadow-accent)' : 'none' }}>
              <div style={{ fontWeight: '800', color: postDraft.type === 'offer' ? 'var(--accent-primary)' : 'var(--text-main)' }}>{t('iOfferService')}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>{t('iOfferServiceSub')}</div>
            </button>
            <button onClick={() => setPostDraft(prev => ({ ...prev, type: 'request', isCollaborative: false }))} style={{ border: '1.5px solid', borderColor: postDraft.type === 'request' ? 'var(--accent-primary)' : 'var(--border-color)', borderRadius: '16px', padding: '14px', backgroundColor: postDraft.type === 'request' ? 'var(--bg-subtle)' : 'var(--bg-card)', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: postDraft.type === 'request' ? 'var(--shadow-accent)' : 'none' }}>
              <div style={{ fontWeight: '800', color: postDraft.type === 'request' ? 'var(--accent-primary)' : 'var(--text-main)' }}>{t('iRequestService')}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>{t('iRequestServiceSub')}</div>
            </button>
            <button onClick={() => setPostDraft(prev => ({ ...prev, type: 'collaborative_project', isCollaborative: true }))} style={{ border: '1.5px solid', borderColor: postDraft.type === 'collaborative_project' ? 'var(--accent-primary)' : 'var(--border-color)', borderRadius: '16px', padding: '14px', backgroundColor: postDraft.type === 'collaborative_project' ? 'var(--bg-subtle)' : 'var(--bg-card)', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: postDraft.type === 'collaborative_project' ? 'var(--shadow-accent)' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800', color: postDraft.type === 'collaborative_project' ? 'var(--accent-primary)' : 'var(--text-main)' }}>
                <span>🚀 {t('collaborativeProjectTitle') && t('collaborativeProjectTitle') !== 'collaborativeProjectTitle' ? t('collaborativeProjectTitle') : 'Projet Collaboratif'}</span>
                <span style={{ fontSize: '10px', backgroundColor: 'var(--accent-primary)', color: '#FFF', padding: '2px 8px', borderRadius: '999px', fontWeight: '800' }}>Nouveau</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {t('collaborativeProjectSub') && t('collaborativeProjectSub') !== 'collaborativeProjectSub' ? t('collaborativeProjectSub') : 'Monter une équipe, un collectif ou un projet à plusieurs avec rétribution en Jetons Troco et groupe dédié.'}
              </div>
            </button>
          </div>
        )}

        {/* ÉTAPE 2 : INFORMATIONS ET MÉDIAS */}
        {postStep === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {postDraft.type === 'collaborative_project' && (
              <div style={{
                padding: '12px 14px',
                borderRadius: '14px',
                backgroundColor: 'rgba(198, 125, 91, 0.12)',
                border: '1px solid var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
                fontWeight: '700',
                color: 'var(--accent-primary)',
                animation: 'fadeSlideUp 0.2s ease'
              }}>
                <span>🚀 Mode Projet Collaboratif : définissez les talents recherchés, les rôles et l'organisation collective.</span>
              </div>
            )}

            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
                {postDraft.type === 'collaborative_project' ? 'Titre du projet collectif' : t('adTitleLabel')}
              </label>
              <input
                value={postDraft.title}
                onChange={(e) => setPostDraft(prev => ({ ...prev, title: e.target.value }))}
                type="text"
                placeholder={postDraft.type === 'collaborative_project' ? "Ex : Création d'une application mobile, Rénovation d'un studio, Tournage..." : t('adTitlePlaceholder')}
                style={{ width: '100%', padding: '10px 12px', marginTop: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-main)', borderRadius: '12px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>{t('adCategoryLabel')}</label>
              <select
                value={postDraft.category}
                onChange={(e) => setPostDraft(prev => ({ ...prev, category: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', marginTop: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-main)', borderRadius: '12px', fontSize: '13px' }}
              >
                <option value="Cours & Compétences">🎓 Cours, Langues & Compétences</option>
                <option value="Bricolage, Travaux & Jardin">🛠️ Bricolage, Travaux & Jardin</option>
                <option value="Tech, Digital & Bureautique">💻 Tech, Digital & Bureautique</option>
                <option value="Prêt d’Outillage & Équipements">🔨 Prêt d’Outillage & Équipements</option>
                <option value="Véhicules & Mobilité">🚗 Véhicules & Mobilité</option>
                <option value="Logement, Espaces & Stay Swap">🏠 Logement, Espaces & Stay Swap</option>
                <option value="Audiovisuel, Photo & Son">📷 Audiovisuel, Photo & Son</option>
                <option value="Services à la personne & Entraide">🤝 Services à la personne & Entraide</option>
                <option value="Santé, Sport & Bien-être">🧘 Santé, Sport & Bien-être</option>
                <option value="Événements & Fêtes">🎉 Événements & Matériel de fête</option>
                <option value="Mode & Beauté">✂️ Mode, Beauté & Accessoires</option>
                <option value="Autre">✨ Autre / Domaine personnalisé</option>
              </select>

              {(postDraft.category === 'Autre' || postDraft.category === 'Autre / Domaine personnalisé') && (
                <div style={{ marginTop: '8px', animation: 'fadeIn 0.25s ease' }}>
                  <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--accent-primary)', display: 'block', marginBottom: '4px' }}>
                    ✍️ Précisez votre catégorie personnalisée (optimisée SEO) :
                  </label>
                  <input
                    type="text"
                    value={postDraft.customCategoryName || ''}
                    onChange={(e) => setPostDraft(prev => ({ ...prev, customCategoryName: e.target.value }))}
                    placeholder="Ex : Apiculture urbaine, Restauration de meubles anciens..."
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1.5px solid var(--accent-primary)',
                      backgroundColor: 'var(--bg-subtle)',
                      color: 'var(--text-main)',
                      borderRadius: '12px',
                      fontSize: '13px',
                    }}
                  />
                </div>
              )}
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>{t('adFormatLabel')}</label>
              <select value={postDraft.format} onChange={(e) => setPostDraft(prev => ({ ...prev, format: e.target.value }))} style={{ width: '100%', padding: '10px 12px', marginTop: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-main)', borderRadius: '12px' }}>
                <option value="onsite">{t('onsite')}</option>
                <option value="remote">{t('remote')}</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
                {postDraft.type === 'collaborative_project' ? 'Quels profils recherchez-vous pour ce projet ?' : t('adDescriptionLabel')}
              </label>
              <textarea
                value={postDraft.description}
                onChange={(e) => setPostDraft(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
                placeholder={postDraft.type === 'collaborative_project' ? "Précisez les profils recherchés (ex: 1 dev React, 1 photographe, 1 menuisier...), les objectifs du projet et le planning." : t('adDescriptionPlaceholder')}
                style={{ width: '100%', padding: '10px 12px', marginTop: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-main)', borderRadius: '12px', resize: 'vertical' }}
              />
            </div>

            {/* MÉDIAS INTELLIGENTS */}
            <div style={{ padding: '16px', borderRadius: '18px', backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {t('adMediaDesc')}
              </p>

              {/* GRILLE VISUELLE DE PHOTOS */}
              <Suspense fallback={null}>
                <PhotoGrid
                  photos={postDraft.gallery && postDraft.gallery.length > 0 ? postDraft.gallery : (postDraft.imageUrl ? [postDraft.imageUrl] : [])}
                  onAddPhoto={handlePhotoGridAdd}
                  onRemovePhoto={handlePhotoGridRemove}
                  onUpdatePhoto={handlePhotoGridUpdate}
                  onAutoGenerate={handlePhotoGridAutoGenerate}
                  maxPhotos={8}
                  darkMode={darkMode}
                  t={t}
                  currentLang={currentLang}
                />
              </Suspense>

              {/* SECTION VIDÉO */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>{t('miniVideoLabel')}</div>
                  {postDraft.cropRatio && (
                    <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--accent-primary)', backgroundColor: 'var(--bg-card)', padding: '2px 8px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      Format: {postDraft.cropRatio}
                      {postDraft.videoTrimEnd > 0 ? ` • ${postDraft.videoTrimStart?.toFixed(1) || 0}s-${postDraft.videoTrimEnd?.toFixed(1)}s` : ''}
                    </span>
                  )}
                </div>
                <input value={postDraft.videoUrl} onChange={(e) => setPostDraft(prev => ({ ...prev, videoUrl: e.target.value }))} placeholder={t('videoUrlPlaceholder')} style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', borderRadius: '10px', fontSize: '12px', marginBottom: '8px' }} />
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ width: '90px', height: '65px', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', position: 'relative' }}>
                    <video src={getSuggestedMedia(postDraft.title, postDraft.description, postDraft.imageUrl, postDraft.videoUrl).video} autoPlay loop muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <label style={{ flex: 1, minWidth: '120px', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '8px 12px', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', fontSize: '11px', fontWeight: '800', cursor: 'pointer', textAlign: 'center' }}>
                    <Plus size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> {t('importVideo')}
                    <input type="file" accept="video/*" onChange={handleVideoFileUpload} style={{ display: 'none' }} />
                  </label>
                  <button
                    type="button"
                    onClick={() => handleOpenVideoEditor()}
                    className="premium-button"
                    style={{
                      border: '1px solid var(--accent-primary)',
                      borderRadius: '10px',
                      padding: '8px 14px',
                      backgroundColor: 'rgba(198, 125, 91, 0.12)',
                      color: 'var(--accent-primary)',
                      fontSize: '11.5px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Sliders size={13} /> ✂️ Éditer (Trim & Crop)
                  </button>
                </div>
              </div>

              {/* TAGS */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '6px' }}>{currentLang === 'FR' ? 'Tags (Mots-clés)' : 'Tags (Keywords)'}</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px', alignItems: 'center' }}>
                  {(postDraft.tags || []).map(tag => (
                    <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: 'var(--accent-primary)', color: '#FFF', borderRadius: '999px', padding: '4px 9px', fontSize: '10px', fontWeight: '800' }}>
                      <Tag size={10} /> {tag}
                      <button type="button" onClick={() => setPostDraft(prev => ({ ...prev, tags: (prev.tags || []).filter(t => t !== tag) }))} style={{ background: 'none', border: 'none', color: '#FFF', cursor: 'pointer', padding: 0, marginLeft: '2px', display: 'flex' }}><X size={10} /></button>
                    </span>
                  ))}
                  <input
                    type="text"
                    placeholder={currentLang === 'FR' ? 'Ajouter un tag...' : 'Add a tag...'}
                    value={tagInputValue}
                    onChange={e => setTagInputValue(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const newTag = tagInputValue.trim();
                        if (newTag && !(postDraft.tags || []).includes(newTag)) {
                          setPostDraft(prev => ({ ...prev, tags: [...(prev.tags || []), newTag] }));
                        }
                        setTagInputValue('');
                      }
                    }}
                    style={{ border: 'none', outline: 'none', background: 'transparent', color: 'var(--text-main)', fontSize: '11px', width: '130px', padding: '4px' }}
                  />
                </div>

                <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '6px' }}>{currentLang === 'FR' ? 'Suggestions (cliquez pour ajouter) :' : 'Suggestions (click to add):'}</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {generateTags(postDraft.title, postDraft.description).filter(t => !(postDraft.tags || []).includes(t)).map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setPostDraft(prev => ({ ...prev, tags: [...(prev.tags || []), tag] }))}
                      style={{ border: '1px dashed var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', borderRadius: '999px', padding: '3px 9px', fontSize: '10px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Plus size={10} /> {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ÉTAPE 3 : RÉTRIBUTION, DURÉE & LOCALISATION */}
        {postStep === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* PRESETS RAPIDES */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                ⚡ Formules et Presets rapides :
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setPostDraft(prev => ({ ...prev, compensation: 'credits', durationType: 'hourly', durationValue: '1', trocoTokens: '1' }))}
                  style={{
                    padding: '9px 10px', borderRadius: '12px',
                    border: (postDraft.compensation === 'credits' && postDraft.durationType === 'hourly') ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                    backgroundColor: (postDraft.compensation === 'credits' && postDraft.durationType === 'hourly') ? 'var(--bg-subtle)' : 'var(--bg-card)',
                    color: (postDraft.compensation === 'credits' && postDraft.durationType === 'hourly') ? 'var(--accent-primary)' : 'var(--text-secondary)', fontWeight: '800', fontSize: '11px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s ease'
                  }}
                >
                  🪙 1h / 1 Jeton
                </button>

                <button
                  type="button"
                  onClick={() => setPostDraft(prev => ({ ...prev, compensation: 'troc', durationType: 'daily', durationValue: '1' }))}
                  style={{
                    padding: '9px 10px', borderRadius: '12px',
                    border: (postDraft.compensation === 'troc' && postDraft.durationType === 'daily') ? '2px solid var(--accent-success, #22C55E)' : '1px solid var(--border-color)',
                    backgroundColor: (postDraft.compensation === 'troc' && postDraft.durationType === 'daily') ? 'var(--bg-subtle)' : 'var(--bg-card)',
                    color: (postDraft.compensation === 'troc' && postDraft.durationType === 'daily') ? 'var(--accent-success, #22C55E)' : 'var(--text-secondary)', fontWeight: '800', fontSize: '11px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s ease'
                  }}
                >
                  🔄 1 jour / Troc
                </button>

                <button
                  type="button"
                  onClick={() => setPostDraft(prev => ({ ...prev, compensation: 'troc', durationType: 'fixed', durationValue: '1' }))}
                  style={{
                    padding: '9px 10px', borderRadius: '12px',
                    border: (postDraft.compensation === 'troc' && postDraft.durationType === 'fixed') ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                    backgroundColor: (postDraft.compensation === 'troc' && postDraft.durationType === 'fixed') ? 'var(--bg-subtle)' : 'var(--bg-card)',
                    color: (postDraft.compensation === 'troc' && postDraft.durationType === 'fixed') ? 'var(--accent-primary)' : 'var(--text-secondary)', fontWeight: '800', fontSize: '11px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s ease'
                  }}
                >
                  💎 Forfait libre
                </button>

                <button
                  type="button"
                  onClick={() => setPostDraft(prev => ({ ...prev, compensation: 'cash', durationType: 'hourly', price: '25' }))}
                  style={{
                    padding: '9px 10px', borderRadius: '12px',
                    border: (postDraft.compensation === 'cash') ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                    backgroundColor: (postDraft.compensation === 'cash') ? 'var(--bg-subtle)' : 'var(--bg-card)',
                    color: (postDraft.compensation === 'cash') ? 'var(--accent-primary)' : 'var(--text-secondary)', fontWeight: '800', fontSize: '11px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s ease'
                  }}
                >
                  💶 Rémunéré (€)
                </button>
              </div>
            </div>

            {/* FORMAT DE DURÉE */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                ⏱️ Format & Unité de durée :
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px' }}>
                <select
                  value={postDraft.durationType || 'hourly'}
                  onChange={(e) => setPostDraft(prev => ({ ...prev, durationType: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-main)', borderRadius: '12px', fontSize: '13px' }}
                >
                  <option value="hourly">À l'heure (cours, visio, prestation)</option>
                  <option value="daily">À la journée (prêt, véhicule, chantier)</option>
                  <option value="monthly">Au mois (coworking, hébergement)</option>
                  <option value="fixed">Au forfait global (clé en main)</option>
                  <option value="indefinite">Indéfini / Libre négociation</option>
                </select>

                {postDraft.durationType !== 'indefinite' && postDraft.durationType !== 'fixed' && (
                  <input
                    type="number"
                    min="1"
                    value={postDraft.durationValue || '1'}
                    onChange={(e) => setPostDraft(prev => ({ ...prev, durationValue: e.target.value }))}
                    placeholder="Qté (ex: 1)"
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-main)', borderRadius: '12px', fontSize: '13px' }}
                  />
                )}
              </div>
            </div>

            {/* MODE DE RÉTRIBUTION */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>{t('retributionModeLabel')}</label>
              <select value={postDraft.compensation} onChange={(e) => setPostDraft(prev => ({ ...prev, compensation: e.target.value }))} style={{ width: '100%', padding: '10px 12px', marginTop: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-main)', borderRadius: '12px' }}>
                <option value="credits">{t('timeCreditOption')}</option>
                <option value="cash">{t('euroPaymentOption')}</option>
                <option value="troc">{t('directSwapOption')}</option>
                <option value="hybrid">{t('hybridOption')}</option>
              </select>
            </div>

            {postDraft.compensation === 'credits' && (
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-main)' }}>{t('trocoTokensAmountLabel')}</label>
                <input value={postDraft.trocoTokens || '1'} onChange={(e) => setPostDraft(prev => ({ ...prev, trocoTokens: e.target.value }))} type="number" min="1" placeholder="Ex : 1" style={{ width: '100%', padding: '10px 12px', marginTop: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-main)', borderRadius: '12px' }} />
              </div>
            )}

            {(postDraft.compensation === 'cash' || postDraft.compensation === 'hybrid') && (
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>{t('expectedAmountLabel')}</label>
                <input value={postDraft.compensation === 'hybrid' ? postDraft.euroAmount : postDraft.price} onChange={(e) => setPostDraft(prev => ({ ...prev, ...(prev.compensation === 'hybrid' ? { euroAmount: e.target.value } : { price: e.target.value }) }))} type="number" min="0" placeholder="Ex : 20" style={{ width: '100%', padding: '10px 12px', marginTop: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-main)', borderRadius: '12px' }} />
              </div>
            )}

            {postDraft.compensation === 'hybrid' && (
              <div style={{ padding: '12px', borderRadius: '14px', backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-main)' }}>{t('trocoTokensAmountLabel')}</label>
                  <input value={postDraft.trocoTokens} onChange={(e) => setPostDraft(prev => ({ ...prev, trocoTokens: e.target.value }))} type="number" min="1" placeholder="Ex : 2" style={{ width: '100%', padding: '10px 12px', marginTop: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', borderRadius: '12px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-main)' }}>{t('expectedAmountLabel')}</label>
                  <input value={postDraft.euroAmount} onChange={(e) => setPostDraft(prev => ({ ...prev, euroAmount: e.target.value }))} type="number" min="0" placeholder="Ex : 10" style={{ width: '100%', padding: '10px 12px', marginTop: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', borderRadius: '12px' }} />
                </div>
              </div>
            )}

            {/* LOCALISATION AVEC GÉOLOCALISATION NOMINATIM */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>{t('locationZoneLabel')}</label>
                <button
                  type="button"
                  onClick={() => {
                    if (navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition(
                        async pos => {
                          const lat = pos.coords.latitude;
                          const lng = pos.coords.longitude;
                          const rev = await reverseGeocodeNominatim(lat, lng);
                          const locName = rev?.shortDisplay || rev?.displayName || 'Position actuelle';
                          let finalCoords = [lat, lng];
                          if (postDraft.locationPrivacy === 'blurred') {
                            finalCoords = applyPrivacyBlur(lat, lng, 500);
                          }
                          setPostDraft(prev => ({
                            ...prev,
                            location: locName,
                            coordinates: finalCoords,
                          }));
                        },
                        err => {
                          console.warn('Geolocation error:', err);
                          alert('Impossible de récupérer automatiquement votre position GPS. Veuillez saisir votre ville manuellement.');
                        }
                      );
                    }
                  }}
                  className="premium-button"
                  style={{
                    border: 'none', background: 'none', color: 'var(--accent-primary)',
                    fontSize: '11px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px'
                  }}
                >
                  <MapPin size={12} /> {currentLang === 'FR' ? '📍 Me géolocaliser' : '📍 Use my location'}
                </button>
              </div>

              <div style={{ position: 'relative' }}>
                <input
                  value={postDraft.location}
                  onChange={(e) => {
                    const val = e.target.value;
                    const fallbackCoords = getCoordinatesForLocation(val);
                    setPostDraft(prev => ({ ...prev, location: val, coordinates: fallbackCoords }));

                    if (nominatimTimeoutRef.current) clearTimeout(nominatimTimeoutRef.current);
                    if (val.trim().length >= 2) {
                      setIsSearchingLocation(true);
                      nominatimTimeoutRef.current = setTimeout(async () => {
                        const results = await searchNominatim(val);
                        setNominatimSuggestions(results);
                        setIsSearchingLocation(false);
                      }, 300);
                    } else {
                      setNominatimSuggestions([]);
                      setIsSearchingLocation(false);
                    }
                  }}
                  type="text"
                  placeholder="Tapez une ville ou un code postal dans le monde..."
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-main)', borderRadius: '12px' }}
                />

                {isSearchingLocation && (
                  <div style={{ position: 'absolute', right: '12px', top: '12px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Recherche OpenStreetMap...
                  </div>
                )}

                {nominatimSuggestions.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: 'var(--bg-card)',
                    border: '1.5px solid var(--border-color)',
                    borderRadius: '14px',
                    marginTop: '4px',
                    boxShadow: '0 12px 32px rgba(0,0,0,0.25)',
                    zIndex: 100,
                    overflow: 'hidden',
                  }}>
                    {nominatimSuggestions.map((sug) => (
                      <div
                        key={sug.id}
                        onClick={() => {
                          let finalCoords = [sug.lat, sug.lon];
                          if (postDraft.locationPrivacy === 'blurred') {
                            finalCoords = applyPrivacyBlur(sug.lat, sug.lon, 500);
                          }
                          setPostDraft(prev => ({
                            ...prev,
                            location: sug.shortDisplay || sug.displayName,
                            coordinates: finalCoords,
                          }));
                          setNominatimSuggestions([]);
                        }}
                        className="hover-subtle"
                        style={{
                          padding: '10px 14px',
                          borderBottom: '1px solid var(--border-color)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                          <MapPin size={14} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '12.5px', fontWeight: '800', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {sug.shortDisplay}
                            </div>
                            <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {sug.displayName}
                            </div>
                          </div>
                        </div>
                        <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: 'var(--bg-subtle)', color: 'var(--accent-primary)', padding: '2px 6px', borderRadius: '6px', flexShrink: 0 }}>
                          {sug.countryCode || 'GPS'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* CONFIDENTIALITÉ POSITION */}
              <div style={{ marginTop: '8px', padding: '10px 12px', borderRadius: '12px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  🛡️ Confidentialité de la géolocalisation sur la carte :
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setPostDraft(prev => ({ ...prev, locationPrivacy: 'exact' }))}
                    className="premium-button"
                    style={{
                      padding: '7px 10px',
                      borderRadius: '10px',
                      border: (postDraft.locationPrivacy !== 'blurred') ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)',
                      backgroundColor: (postDraft.locationPrivacy !== 'blurred') ? 'var(--bg-subtle)' : 'transparent',
                      color: (postDraft.locationPrivacy !== 'blurred') ? 'var(--accent-primary)' : 'var(--text-main)',
                      fontSize: '11px',
                      fontWeight: '800',
                      cursor: 'pointer',
                    }}
                  >
                    🟢 Position exacte
                  </button>
                  <button
                    type="button"
                    onClick={() => setPostDraft(prev => ({ ...prev, locationPrivacy: 'blurred' }))}
                    className="premium-button"
                    style={{
                      padding: '7px 10px',
                      borderRadius: '10px',
                      border: postDraft.locationPrivacy === 'blurred' ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)',
                      backgroundColor: postDraft.locationPrivacy === 'blurred' ? 'var(--bg-subtle)' : 'transparent',
                      color: postDraft.locationPrivacy === 'blurred' ? 'var(--accent-primary)' : 'var(--text-main)',
                      fontSize: '11px',
                      fontWeight: '800',
                      cursor: 'pointer',
                    }}
                  >
                    🛡️ Flou ~500m
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>{t('availabilityLabel')}</label>
              <textarea value={postDraft.availability} onChange={(e) => setPostDraft(prev => ({ ...prev, availability: e.target.value }))} rows={2} placeholder="Ex : disponibilités ce week-end, en visio le soir" style={{ width: '100%', padding: '10px 12px', marginTop: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-main)', borderRadius: '12px', resize: 'vertical' }} />
            </div>

            {postDraft.type === 'offer' && (
              <div style={{ padding: '14px', borderRadius: '16px', backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-color)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '800', color: 'var(--text-main)' }}>
                  <input type="checkbox" checked={postDraft.requiresCaution} onChange={(e) => setPostDraft(prev => ({ ...prev, requiresCaution: e.target.checked }))} style={{ accentColor: 'var(--accent-primary)', width: '16px', height: '16px' }} />
                  {t('requireCautionLabel')}
                </label>
                {postDraft.requiresCaution && (
                  <div style={{ marginTop: '8px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: darkMode ? '#D4C5B5' : '#6B5E54' }}>{t('cautionAmountLabel')}</label>
                    <input value={postDraft.cautionAmount} onChange={(e) => setPostDraft(prev => ({ ...prev, cautionAmount: e.target.value }))} type="number" min="0" placeholder="Ex : 50" style={{ width: '100%', padding: '10px 12px', marginTop: '6px', border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3', backgroundColor: darkMode ? '#1A1715' : '#FFF', color: darkMode ? '#FAF7F2' : '#3D3530', borderRadius: '12px' }} />
                  </div>
                )}
              </div>
            )}

            <div style={{ padding: '14px', borderRadius: '16px', backgroundColor: darkMode ? 'rgba(198,125,91,0.15)' : '#F5EAE4', border: postDraft.isUrgent ? '1.5px solid #C67D5B' : (darkMode ? '1px solid rgba(198,125,91,0.3)' : '1px solid #E8DDD3') }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                <input type="checkbox" checked={postDraft.isUrgent} onChange={(e) => setPostDraft(prev => ({ ...prev, isUrgent: e.target.checked }))} style={{ marginTop: '3px', accentColor: '#C67D5B', width: '16px', height: '16px' }} />
                <span style={{ flex: 1 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '800', color: darkMode ? '#FAF7F2' : '#3D3530' }}>
                    <Flame size={15} color="#C67D5B" /> {t('setUrgentLabel')}
                  </span>
                  <span style={{ display: 'block', fontSize: '12px', color: darkMode ? '#D4C5B5' : '#6B5E54', marginTop: '4px', lineHeight: 1.5 }}>
                    {t('urgentBadgeDesc')}
                  </span>
                </span>
                <span style={{ fontSize: '12px', fontWeight: '900', color: '#A8644A', backgroundColor: darkMode ? '#1A1715' : '#FFF', border: '1px solid #E8DDD3', borderRadius: '999px', padding: '5px 12px', whiteSpace: 'nowrap', boxShadow: '0 4px 10px rgba(198,125,91,0.15)' }}>{formatCompensation('1.99€ ou 1 Jeton')}</span>
              </label>
              {postDraft.isUrgent && (
                <div style={{ marginTop: '10px', fontSize: '12px', color: darkMode ? '#FAF7F2' : '#3D3530', lineHeight: 1.6, backgroundColor: darkMode ? 'rgba(127,29,29,0.3)' : '#FEF2F2', borderRadius: '12px', padding: '10px 12px' }}>
                  {(profile.euroBalance || 0) >= 1.99 ? (
                    <span>Un supplément de <strong>1,99€</strong> sera débité de ton solde Euro (<strong>{(profile.euroBalance || 0).toFixed(2)}€</strong> disponibles) automatiquement à la publication.</span>
                  ) : (
                    <span>Solde Euro insuffisant (<strong>{(profile.euroBalance || 0).toFixed(2)}€</strong> disponibles sur les <strong>1,99€</strong> requis). Recharge ton portefeuille pour activer l'option Urgent.</span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ÉTAPE 4 : APERÇU ET DEVIS FACTURATION */}
        {postStep === 4 && (() => {
          const currentPhotoList = postDraft.gallery && postDraft.gallery.length > 0
            ? postDraft.gallery
            : (postDraft.imageUrl ? [postDraft.imageUrl] : []);
          const isEditingContentChanged = isEditingListing
            ? ((postDraft.title || '').trim() !== (editingOriginalListing?.title || '') || (postDraft.description || '').trim() !== (editingOriginalListing?.description || ''))
            : false;

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ padding: '14px', borderRadius: '16px', backgroundColor: darkMode ? '#1A1715' : '#F5F0E8', border: darkMode ? '1px solid rgba(232,221,211,0.12)' : '1px solid #E8DDD3' }}>
                <div style={{ fontSize: '11px', color: darkMode ? '#D4C5B5' : '#6B5E54', marginBottom: '6px' }}>{t('previewLabel')}</div>
                <img src={postDraft.imageUrl.trim() || getSuggestedImage(postDraft.title, postDraft.description)} alt="aperçu" style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '14px', marginBottom: '10px' }} />
                <div className="font-editorial-heading" style={{ fontSize: '18px', fontWeight: '600', color: darkMode ? '#FAF7F2' : '#3D3530' }}>{postDraft.title || t('titleToBeDefined')}</div>
                <div style={{ fontSize: '12px', color: darkMode ? '#D4C5B5' : '#6B5E54', margin: '6px 0' }}>{postDraft.category === 'Cours & Compétences' ? t('catSkills') : postDraft.category === 'Prêt de Matériel' ? t('catTools') : postDraft.category === 'Services & Dépannage' ? t('catServices') : postDraft.category === 'Logement & Stay Swap' ? t('catHousing') : postDraft.category} • {postDraft.format === 'remote' ? t('remote') : t('onsite')}</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  {((postDraft.tags && postDraft.tags.length > 0) ? postDraft.tags : (generateTags(postDraft.title, postDraft.description) || [])).map(tag => (
                    <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: darkMode ? 'rgba(198,125,91,0.2)' : '#F5EAE4', color: darkMode ? '#FAF7F2' : '#A8644A', borderRadius: '999px', padding: '4px 9px', fontSize: '10px', fontWeight: '800' }}><Tag size={10} /> {tag}</span>
                  ))}
                </div>
                <div style={{ fontSize: '13px', color: darkMode ? '#D4C5B5' : '#6B5E54', lineHeight: 1.6 }}>{postDraft.description || t('addDescriptionConvincing')}</div>
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#C67D5B', fontWeight: '800' }}>{t('compensationLabel')} {postDraft.compensation === 'credits' ? t('timeCreditOption') : postDraft.compensation === 'cash' ? `${postDraft.price || '20'}€` : postDraft.compensation === 'hybrid' ? `${postDraft.price || '20'}€ + ${t('timeCreditOption')}` : t('directSwapOption')}</div>
                {postDraft.isUrgent && (
                  <div style={{ marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: darkMode ? 'rgba(198,125,91,0.2)' : '#F5EAE4', color: '#A8644A', fontSize: '11px', fontWeight: '800', padding: '5px 10px', borderRadius: '10px' }}>
                    <Flame size={12} /> {t('priorityNotice')}
                  </div>
                )}
              </div>

              {/* CALCULATEUR DE DEVIS & FACTURATION TVA */}
              <Suspense fallback={null}>
                <InvoiceCalculator
                  isUrgent={!!postDraft.isUrgent}
                  photoCount={currentPhotoList.length}
                  isEditing={isEditingListing}
                  isEditingContentChanged={isEditingContentChanged}
                  darkMode={darkMode}
                  t={t}
                  currentLang={currentLang}
                />
              </Suspense>

              <div style={{ fontSize: '13px', color: darkMode ? '#D4C5B5' : '#6B5E54' }}>{t('publishVisibilityNotice')}</div>
            </div>
          );
        })()}

        {/* NAVIGATION TUNNEL */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '18px' }}>
          {postStep > 1 ? (
            <button onClick={() => setPostStep(prev => prev - 1)} className="premium-button" style={{ border: darkMode ? '1px solid rgba(232,221,211,0.2)' : '1px solid #E8DDD3', borderRadius: '999px', padding: '10px 16px', backgroundColor: darkMode ? '#1A1715' : '#FFF', color: darkMode ? '#FAF7F2' : '#3D3530', fontWeight: '700', cursor: 'pointer' }}>{t('backButton')}</button>
          ) : <span />}
          {postStep < 4 ? (
            <button
              onClick={() => setPostStep(prev => prev + 1)}
              className="premium-button"
              style={{
                border: 'none',
                borderRadius: 'var(--border-radius-main, 999px)',
                padding: '10px 18px',
                background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)',
                color: 'var(--accent-contrast-text, #FFF)',
                fontWeight: '800',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-accent)'
              }}
            >
              {t('continueButton')}
            </button>
          ) : (() => {
            const currentPhotoList = postDraft.gallery && postDraft.gallery.length > 0
              ? postDraft.gallery
              : (postDraft.imageUrl ? [postDraft.imageUrl] : []);
            const isEditingContentChanged = isEditingListing
              ? ((postDraft.title || '').trim() !== (editingOriginalListing?.title || '') || (postDraft.description || '').trim() !== (editingOriginalListing?.description || ''))
              : false;
            const quote = calculateListingInvoice({
              isUrgent: !!postDraft.isUrgent,
              photoCount: currentPhotoList.length,
              isEditing: isEditingListing,
              isEditingContentChanged: isEditingContentChanged,
            });

            const buttonLabel = isEditingListing
              ? (quote.totalTTC > 0
                ? (currentLang === 'FR' ? `Valider et payer ${quote.totalTTC.toFixed(2)} €` : `Confirm & Pay €${quote.totalTTC.toFixed(2)}`)
                : (currentLang === 'FR' ? 'Sauvegarder les modifications' : 'Save changes'))
              : (quote.totalTTC > 0
                ? (currentLang === 'FR' ? `Publier et payer ${quote.totalTTC.toFixed(2)} €` : `Publish & Pay €${quote.totalTTC.toFixed(2)}`)
                : t('publishAdButton'));

            return (
              <button
                onClick={handlePublishAnnouncement}
                className="premium-button"
                style={{
                  border: 'none',
                  borderRadius: 'var(--border-radius-main, 999px)',
                  padding: '10px 20px',
                  background: quote.totalTTC > 0 ? '#F59E0B' : 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)',
                  color: 'var(--accent-contrast-text, #FFF)',
                  fontWeight: '800',
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-accent)'
                }}
              >
                {buttonLabel}
              </button>
            );
          })()}
        </div>
      </div>

      {/* ÉDITEUR VIDÉO INTÉGRÉ MODALE */}
      {isVideoEditorOpen && (
        <Suspense fallback={<SkeletonModalFallback title="Édition vidéo..." />}>
          <VideoEditorModal
            isOpen={isVideoEditorOpen}
            videoUrl={editingVideoData?.url || postDraft.videoUrl || getSuggestedMedia(postDraft.title, postDraft.description, postDraft.imageUrl, postDraft.videoUrl).video}
            initialTrimStart={editingVideoData?.trimStart || Number(postDraft.videoTrimStart || 0)}
            initialTrimEnd={editingVideoData?.trimEnd || Number(postDraft.videoTrimEnd || 0)}
            initialCropRatio={editingVideoData?.cropRatio || postDraft.cropRatio || '16:9'}
            onClose={() => setIsVideoEditorOpen(false)}
            onSave={handleSaveVideoEdits}
            darkMode={darkMode}
          />
        </Suspense>
      )}
    </>
  );
}
