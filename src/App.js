import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, MapPin, Video, Star, Globe, Filter, MessageSquare, PlusCircle, User, ShieldCheck, Clock, CheckCircle, X, Sparkles, Coins, Plus, Trash2, Camera, Pencil, Mic, PhoneOff, Flame, History, Check, Lock, CreditCard, Tag, Phone, UserPlus, ChevronLeft, ChevronRight, ChevronUp, Eye, EyeOff, Minimize2, MicOff, VideoOff, Sun, Moon, Upload, Repeat, SwitchCamera, LogOut, Scale, ShieldAlert, FileText, Monitor, MonitorOff, Crown, GripHorizontal, Mail, Image as ImageIcon } from 'lucide-react';
import { auth, db } from './firebase';
import { collection, addDoc, doc, updateDoc, serverTimestamp, onSnapshot, query, orderBy, setDoc, deleteDoc, getDoc, getDocs, where, increment, runTransaction } from 'firebase/firestore';
import { RecaptchaVerifier, signInWithPhoneNumber, sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink, GoogleAuthProvider, GithubAuthProvider, FacebookAuthProvider, OAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import ChatView from './components/ChatView';
import { useWebRTC } from './hooks/useWebRTC';
import { useTheme } from './contexts/ThemeContext';
import AdminPanel from './components/AdminPanel';
import ReportModal from './components/ReportModal';
import PaymentModal from './components/PaymentModal';
import TransactionsHistoryModal from './components/TransactionsHistoryModal';
import CguModal from './components/CguModal';
import PrivacyCenterModal from './components/PrivacyCenterModal';
import CookieBanner from './components/CookieBanner';
import OnboardingWizardModal from './components/OnboardingWizardModal';
import WelcomeGiftCelebrationModal from './components/WelcomeGiftCelebrationModal';
import VisioSettlementModal from './components/VisioSettlementModal';
import KycModal from './components/KycModal';
import CounterOfferModal from './components/CounterOfferModal';
import { analyzeContent } from './utils/contentModeration';
import { validateListingContent, validateChatMessage, validateProfileContent } from './utils/moderationBlacklist';
import { DIVERSE_AVATARS, TROCO_CATEGORIES } from './data/categoriesData';
import { getInstantOrQueueTranslation, subscribeTranslations } from './utils/translator';
import { playApplePaySound, playBetclicBalanceSound, playWelcomeGiftFanfare } from './utils/audioService';
import { AnimatedEuroBalance, AnimatedTokenBalance } from './components/AnimatedBalances';
import FeedCardItem from './components/FeedCardItem';
import PhotoGrid from './components/PhotoGrid';
import InvoiceCalculator, { generateInvoiceRef, calculateListingInvoice } from './components/InvoiceCalculator';
import CallOverlay from './components/CallOverlay';
import {
  translations,
  calculateHaversineDistance,
  localizeLocation,
  localizeTags,
  localizeReview,
  knownTitles,
  knownMessageTranslations,
} from './data/translationsData';

export default function App() {
  const { themeId, theme, isDark: darkMode, setThemeId, toggleTheme: toggleDarkMode, allThemes, customColors, setCustomColors } = useTheme();
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const [currentLang, setCurrentLang] = useState('FR');
  const [isLangModalOpen, setIsLangModalOpen] = useState(false);
  const [userCoords, setUserCoords] = useState([48.8566, 2.3522]); // Paris par défaut
  const [isGeolocated, setIsGeolocated] = useState(false);
  const [isGeolocating, setIsGeolocating] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [geolocMsg, setGeolocMsg] = useState('');

  const t = (key) => (translations[currentLang] && translations[currentLang][key]) || translations['FR'][key] || key;

  const getCategoryLabel = (categoryKey) => {
    if (categoryKey === 'Tous' || categoryKey === 'all') return t('all');
    if (categoryKey === 'Cours/Compétences' || categoryKey === 'Cours & Compétences') return t('catSkills');
    if (categoryKey === 'Outillage' || categoryKey === 'Prêt de Matériel') return t('catTools');
    if (categoryKey === 'Services/Dépannage' || categoryKey === 'Services & Dépannage') return t('catServices');
    if (categoryKey === 'Logement/Swap' || categoryKey === 'Logement & Stay Swap') return t('catHousing');
    return categoryKey;
  };

  const getListingTitleTranslation = (title, targetLang) => {
    if (!title) return '';
    if (targetLang === 'FR') return title;
    if (knownTitles[title] && knownTitles[title][targetLang]) {
      return knownTitles[title][targetLang];
    }
    return title;
  };

  const formatStatus = (st) => {
    if (st === 'Négociation en cours') return t('negotiationInProgress');
    if (st === 'Deal Validé') return t('dealValidated');
    if (st === 'À confirmer') return t('toConfirm');
    if (st === 'Nouvelle discussion') return t('newDiscussion');
    if (st === 'Clôturé' || st === 'Terminé' || st === 'Cloture' || st === 'Closed') return t('closed');
    if (st === 'En cours' || st === 'In progress') return t('inProgress');
    if (st === 'Planifié' || st === 'Planned') return t('planned');
    return st;
  };

  const getChatMessageDisplayContent = (message, targetLang, forceOriginal = false) => {
    if (!message) return '';
    const rawText = (typeof message === 'string' ? message : (message.text || message.conditions || '')).trim();

    if (forceOriginal || targetLang === 'FR' || !targetLang) {
      return (typeof message === 'object' && message.originalText) ? message.originalText : rawText;
    }

    if (typeof message === 'object' && message.translations && message.translations[targetLang]) {
      return message.translations[targetLang];
    }

    if (rawText.includes("Bonne contre-proposition")) {
      const summaryMatch = rawText.match(/\(([^)]+)\)/);
      const summaryText = summaryMatch ? summaryMatch[1] : '';
      let translatedSummary = '';
      if (summaryText) {
        let sumTrans = summaryText;
        if (targetLang === 'EN') sumTrans = sumTrans.replace(/Jetons?/g, 'Token').replace(/Crédits?/g, 'Token');
        else if (targetLang === 'ES') sumTrans = sumTrans.replace(/Jetons?/g, 'Ficha').replace(/Crédits?/g, 'Ficha');
        else if (targetLang === 'IT') sumTrans = sumTrans.replace(/Jetons?/g, 'Gettone').replace(/Crédits?/g, 'Gettone');
        else if (targetLang === 'DE') sumTrans = sumTrans.replace(/Jetons?/g, 'Token').replace(/Crédits?/g, 'Token');
        else if (targetLang === 'JA') sumTrans = sumTrans.replace(/Jetons?/g, 'トークン').replace(/Crédits?/g, 'トークン');
        else if (targetLang === 'ZH') sumTrans = sumTrans.replace(/Jetons?/g, '个代币').replace(/Crédits?/g, '个代币');
        translatedSummary = ` (${sumTrans})`;
      }

      const templates = {
        FR: `Bonne contre-proposition${translatedSummary}. Le cadre me convient — j'attends ta confirmation pour valider le deal.`,
        EN: `Good counter-proposal${translatedSummary}. The terms look good to me — I'm waiting for your confirmation to validate the deal.`,
        ES: `Buena contrapropuesta${translatedSummary}. Las condiciones me parecen bien — espero tu confirmación para validar el trato.`,
        IT: `Buona controproposta${translatedSummary}. Le condizioni mi stanno bene — aspetto la tua conferma per convalidare l'accordo.`,
        DE: `Guter Gegenvorschlag${translatedSummary}. Die Bedingungen passen mir — ich warte auf deine Bestätigung, um den Deal zu validieren.`,
        JA: `良いカウンターオファー${translatedSummary}ですね。条件に同意します。取引を確定するために確認をお待ちしています。`,
        ZH: `不错的反向提议${translatedSummary}。条件符合我的要求 — 我等待你的确认以验证此交易。`
      };
      return templates[targetLang] || rawText;
    }

    if (rawText.includes("Contre 20€ + 1 Jeton Troco")) {
      const transMap = {
        EN: "Session de 2h Initiation Figma (UI/UX) ce samedi à 14h. For €20 + 1 Troco Token.",
        ES: "Sesión de 2h de Figma (UI/UX) este sábado a las 14h. Por 20€ + 1 Ficha Troco.",
        IT: "Sessione di 2h di Figma (UI/UX) questo sabato alle 14:00. Per 20€ + 1 Gettone Troco.",
        DE: "2 Std. Figma UI/UX Sitzung diesen Samstag um 14 Uhr. Für 20€ + 1 Troco-Token.",
        JA: "今週土曜14時〜 Figma UI/UX 2時間セッション。20ユーロ＋1 Trocoトークン。",
        ZH: "本周六下午2点 2小时 Figma UI/UX 课程。对价为 20欧元 + 1个 Troco 代币。"
      };
      return transMap[targetLang] || rawText;
    }

    if (rawText.includes("Contre 3 Jetons Troco")) {
      const transMap = {
        EN: "Pro Photo Studio booking (3h) this Friday 2pm-5pm with equipment included. For 3 Troco Tokens.",
        ES: "Reserva Estudio Foto Pro (3h) este viernes 14h-17h con equipo incluido. Por 3 Fichas Troco.",
        IT: "Prenotazione Studio Fotografico (3h) venerdì 14:00-17:00 con materiale incluso. Per 3 Gettoni Troco.",
        DE: "Pro-Fotostudio Buchung (3 Std) diesen Freitag 14-17 Uhr inkl. Equipment. Für 3 Troco-Tokens.",
        JA: "プロフォトスタジオ予約（3時間）金曜14時〜17時 機材込み。3 Trocoトークン。",
        ZH: "专业摄影棚预订（3小时）本周五14:00-17:00，包含设备。对价为 3个 Troco 代币。"
      };
      return transMap[targetLang] || rawText;
    }

    if (rawText.includes("Contre 2 Jetons Troco")) {
      const transMap = {
        EN: "Bosch Hammer Drill Loan this weekend (Saturday - Sunday). For 2 Troco Tokens.",
        ES: "Préstamo de Taladro percutor Bosch este fin de semana. Por 2 Fichas Troco.",
        IT: "Prestito Trapano a percussione Bosch questo fine settimana. Per 2 Gettoni Troco.",
        DE: "Bosch Schlagbohrmaschinen-Verleih dieses Wochenende. Für 2 Troco-Tokens.",
        JA: "今週末ボッシュ振動ドリル貸出（土・日）。2 Trocoトークン。",
        ZH: "本周末博世冲击钻租借（周六-周日）。对价为 2个 Troco 代币。"
      };
      return transMap[targetLang] || rawText;
    }
    if (knownMessageTranslations[rawText] && knownMessageTranslations[rawText][targetLang]) {
      return knownMessageTranslations[rawText][targetLang];
    }

    const normalizedRaw = rawText.replace(/[’']/g, "'").trim();
    for (const [k, v] of Object.entries(knownMessageTranslations)) {
      if (k.replace(/[’']/g, "'").trim() === normalizedRaw && v[targetLang]) {
        return v[targetLang];
      }
    }

    if (rawText.includes("Début de discussion pour")) {
      const listingTitle = rawText.replace("Début de discussion pour", "").trim();
      const localizedTitle = getListingTitleTranslation(listingTitle, targetLang);
      const startTemplates = {
        FR: `Début de discussion pour ${localizedTitle}`,
        EN: `Start of discussion for ${localizedTitle}`,
        ES: `Inicio de conversación para ${localizedTitle}`,
        IT: `Inizio discussione per ${localizedTitle}`,
        DE: `Beginn der Diskussion für ${localizedTitle}`,
        JA: `「${localizedTitle}」の会話の開始`,
        ZH: `关于“${localizedTitle}”的讨论开始`
      };
      if (startTemplates[targetLang]) return startTemplates[targetLang];
    }

    if (rawText.includes("Je peux te proposer un échange fluide sur")) {
      const titleMatch = rawText.match(/«\s*(.*?)\s*»/) || rawText.match(/"\s*(.*?)\s*"/) || rawText.match(/“\s*(.*?)\s*”/);
      const listingTitle = titleMatch ? titleMatch[1] : '';
      const localizedTitle = getListingTitleTranslation(listingTitle, targetLang);
      const propTemplates = {
        FR: `Bonjour ! Je peux te proposer un échange fluide sur « ${localizedTitle} ».`,
        EN: `Hello! I can offer a smooth exchange regarding "${localizedTitle}".`,
        ES: `¡Hola! Puedo ofrecerte un intercambio fluido en "${localizedTitle}".`,
        IT: `Ciao! Posso proporti uno scambio fluido per "${localizedTitle}".`,
        DE: `Hallo! Ich kann einen reibungslosen Tausch für "${localizedTitle}" anbieten.`,
        JA: `こんにちは！「${localizedTitle}」に関するスムーズな交換を提案できます。`,
        ZH: `你好！我可以就“${localizedTitle}”为你提供顺畅的交换。`
      };
      if (propTemplates[targetLang]) return propTemplates[targetLang];
    }

    const knownMatch = knownMessageTranslations[rawText];
    if (knownMatch && knownMatch[targetLang]) {
      return knownMatch[targetLang];
    }

    // Traduction automatique dynamique en temps réel
    return getInstantOrQueueTranslation(rawText, targetLang, 'auto');
  };

  const formatTokenCount = (count, lang) => {
    const c = Number(count) || 0;
    if (lang === 'FR') return c <= 1 ? `${c} Jeton` : `${c} Jetons`;
    if (lang === 'EN') return c <= 1 ? `${c} Token` : `${c} Tokens`;
    if (lang === 'ES') return c <= 1 ? `${c} Ficha` : `${c} Fichas`;
    if (lang === 'IT') return c <= 1 ? `${c} Gettone` : `${c} Gettoni`;
    if (lang === 'DE') return c <= 1 ? `${c} Token` : `${c} Tokens`;
    if (lang === 'JA') return `${c} トークン`;
    if (lang === 'ZH') return `${c} 个代币`;
    return c <= 1 ? `${c} Token` : `${c} Tokens`;
  };

  const getBioTranslation = (bioText, targetLang, forceOriginal = false) => {
    if (!bioText || forceOriginal || targetLang === 'FR') return bioText;
    const bioMap = {
      FR: "Créateur de contenus, développeur Python et passionné de musique. Je propose des services flexibles et des échanges de qualité.",
      EN: "Content creator, Python developer, and music enthusiast. I offer flexible services and high-quality exchanges.",
      ES: "Creador de contenido, desarrollador de Python y apasionado de la música. Ofrezco servicios flexibles e intercambios de calidad.",
      IT: "Creatore di contenuti, sviluppatore Python e appassionato di musica. Offro servizi flessibili e scambi di qualità.",
      DE: "Content Creator, Python-Entwickler und Musikliebhaber. Ich biete flexible Dienstleistungen und hochwertige Tausche.",
      JA: "コンテンツクリエイター、Pythonデベロッパー、音楽愛好家。柔軟なサービスと高品質な交換を提供しています。",
      ZH: "内容创作者、Python 开发者及音乐爱好者。我提供灵活的服务与高质量的互换。"
    };
    return bioMap[targetLang] || getInstantOrQueueTranslation(bioText, targetLang, 'auto');
  };

  const getReviewTranslation = (reviewText, targetLang, forceOriginal = false) => {
    if (!reviewText || forceOriginal || targetLang === 'FR') return reviewText;
    const reviewMap = {
      "Super session de cours ! Explications très claires et très sympa.": {
        FR: "Super session de cours ! Explications très claires et très sympa.",
        EN: "Great lesson session! Very clear explanations and super friendly.",
        ES: "¡Gran sesión de clase! Explicaciones muy claras y muy amable.",
        IT: "Ottima lezione! Spiegazioni molto chiare e molto simpatico.",
        DE: "Tolle Unterrichtsstunde! Sehr klare Erklärungen und sehr nett.",
        JA: "素晴らしいレッスンでした！説明がとても明確で親切でした。",
        ZH: "非常棒的课程！解释非常清晰，非常友善。"
      },
      "Matériel en parfait état. Rendu comme prévu. Impeccable.": {
        FR: "Matériel en parfait état. Rendu comme prévu. Impeccable.",
        EN: "Equipment in perfect condition. Returned on time. Impeccable.",
        ES: "Equipo en perfecto estado. Devuelto a tiempo. Impecable.",
        IT: "Attrezzatura in perfette condizioni. Restituita nei tempi. Impeccabile.",
        DE: "Gerät in einwandfreiem Zustand. Pünktlich zurückgegeben. Makellos.",
        JA: "完璧な状態の機材でした。予定通り返却されました。素晴らしい。",
        ZH: "设备完好无损。按时归还。无可挑剔。"
      },
      "Échange ultra fluide, Sofia est pédagogue et très à l'écoute. Les 3 séances se sont parfaitement déroulées, je recommande à 100%.": {
        FR: "Échange ultra fluide, Sofia est pédagogue et très à l'écoute. Les 3 séances se sont parfaitement déroulées, je recommande à 100%.",
        EN: "Ultra-smooth exchange, Sofia is a great teacher and very attentive. All 3 sessions went perfectly, 100% recommended.",
        ES: "Intercambio súper fluido, Sofia es muy pedagógica y atenta. Las 3 sesiones salieron perfectas, recomiendo al 100%.",
        IT: "Scambio ultra fluido, Sofia è pedagogica e molto attenta. Le 3 sessioni sono andate perfettamente, raccomando al 100%.",
        DE: "Super reibungsloser Tausch, Sofia ist sehr pädagogisch und aufmerksam. Alle 3 Sitzungen liefen perfekt, 100% Empfehlung.",
        JA: "非常にスムーズな交換でした。ソフィアさんはとても教え方が上手で親切です。3回のセッション全てが完璧で、100%おすすめします。",
        ZH: "极其顺畅的交流，索菲亚教学水平高且非常细心。3次课程都非常顺利，100%推荐。"
      },
      "Prêt rapide et propre, caution virtuelle bien gérée. Matériel en parfait état, rendu sans accroc dans les délais.": {
        FR: "Prêt rapide et propre, caution virtuelle bien gérée. Matériel en parfait état, rendu sans accroc dans les délais.",
        EN: "Fast and clean loan, virtual deposit handled smoothly. Equipment in perfect condition, returned on time without issues.",
        ES: "Préstamo rápido y limpio, fianza virtual bien gestionada. Equipo en perfecto estado, devuelto a tiempo sin problemas.",
        IT: "Prestito veloce e pulito, deposito virtuale ben gestito. Attrezzatura in perfette condizioni, restituita in tempo senza intoppi.",
        DE: "Schneller und sauberer Verleih, virtuelle Kaution gut verwaltet. Gerät in einwandfreiem Zustand, pünktlich zurückgegeben.",
        JA: "迅速で綺麗な貸出、バーチャル保証金の管理もスムーズでした。機材も完璧な状態で期限内に返却されました。",
        ZH: "快捷清洁的租借，虚拟押金管理妥当。设备完好无损，按时顺利归还。"
      },
      "Intervention programmée cette semaine, créneau confirmé par Karim. Échange de modèle et de devis en cours dans le chat.": {
        FR: "Intervention programmée cette semaine, créneau confirmé par Karim. Échange de modèle et de devis en cours dans le chat.",
        EN: "Service scheduled this week, time slot confirmed by Karim. Model details and quote being discussed in chat.",
        ES: "Intervención programada esta semana, franja confirmada por Karim. Intercambio de modelo y presupuesto en curso en el chat.",
        IT: "Intervento programmato questa settimana, orario confermato da Karim. Scambio di modello e preventivo in corso nella chat.",
        DE: "Einsatz diese Woche geplant, Zeitfenster von Karim bestätigt. Austausch von Modell und Angebot im Chat im Gange.",
        JA: "今週作業予定、カリムさんとの日時確認済み。モデルと見積もりの話し合いがチャットで進行中。",
        ZH: "本周已安排服务，Karim 已确认时间段。型号和报价正在聊天中沟通。"
      },
      "Séance visio planifiée vendredi à 18h00. Conditions validées : 1 Crédit + 10€.": {
        FR: "Séance visio planifiée vendredi à 18h00. Conditions validées : 1 Jeton + 10€.",
        EN: "Video session scheduled Friday at 6:00 PM. Confirmed terms: 1 Token + €10.",
        ES: "Sesión en visio planificada el viernes a las 18:00. Condiciones validadas: 1 Ficha + 10€.",
        IT: "Sessione video pianificata venerdì alle 18:00. Condizioni verificate: 1 Gettone + 10€.",
        DE: "Video-Sitzung für Freitag um 18:00 Uhr geplant. Bedingungen bestätigt: 1 Token + 10€.",
        JA: "金曜日18:00にビデオセッションが予定されています。確認済み条件：1トークン＋10€。",
        ZH: "已预约周五 18:00 视频课程。已确认条件：1个代币 + 10欧。"
      }
    };
    return reviewMap[reviewText]?.[targetLang] || getInstantOrQueueTranslation(reviewText, targetLang, 'auto');
  };

  const formatCompensation = (comp) => {
    if (!comp) return '';

    const knownCompMap = {
      "15€ séance ou 1 Crédit": {
        FR: "15€ / séance ou 1 Jeton",
        EN: "€15 / session or 1 Token",
        ES: "15€ / sesión o 1 Ficha",
        IT: "15€ / sessione o 1 Gettone",
        DE: "15€ / Sitzung oder 1 Token",
        JA: "1セッション15ユーロまたは1トークン",
        ZH: "每节15欧或1个代币"
      },
      "15€ séance ou 1 Jeton": {
        FR: "15€ / séance ou 1 Jeton",
        EN: "€15 / session or 1 Token",
        ES: "15€ / sesión o 1 Ficha",
        IT: "15€ / sessione o 1 Gettone",
        DE: "15€ / Sitzung oder 1 Token",
        JA: "1セッション15ユーロまたは1トークン",
        ZH: "每节15欧或1个代币"
      },
      "15€ séance ou 1 Tokens": {
        FR: "15€ / séance ou 1 Jeton",
        EN: "€15 / session or 1 Token",
        ES: "15€ / sesión o 1 Ficha",
        IT: "15€ / sessione o 1 Gettone",
        DE: "15€ / Sitzung oder 1 Token",
        JA: "1セッション15ユーロまたは1トークン",
        ZH: "每节15欧或1个代币"
      },
      "15€ séance ou 1 Fichas": {
        FR: "15€ / séance ou 1 Jeton",
        EN: "€15 / session or 1 Token",
        ES: "15€ / sesión o 1 Ficha",
        IT: "15€ / sessione o 1 Gettone",
        DE: "15€ / Sitzung oder 1 Token",
        JA: "1セッション15ユーロまたは1トークン",
        ZH: "每节15欧或1个代币"
      },
      "Troc ou 5€ consommables": {
        FR: "Troc ou 5€ consommables",
        EN: "Swap or €5 consumables",
        ES: "Trueque o 5€ consumibles",
        IT: "Baratto o 5€ consumabili",
        DE: "Tausch oder 5€ Verbrauchsmaterial",
        JA: "物物交換または5ユーロ消耗品",
        ZH: "易货或 5 欧易耗品"
      },
      "30€ ou 2 Jetons": {
        FR: "30€ ou 2 Jetons",
        EN: "€30 or 2 Tokens",
        ES: "30€ o 2 Fichas",
        IT: "30€ o 2 Gettoni",
        DE: "30€ oder 2 Tokens",
        JA: "30ユーロまたは2トークン",
        ZH: "30欧或2个代币"
      },
      "1h = 1 Crédit temps (Visio)": {
        FR: "1h = 1 Jeton temps (Visio)",
        EN: "1h = 1 Time Token (Video)",
        ES: "1h = 1 Ficha de tiempo (Visio)",
        IT: "1ora = 1 Gettone tempo (Video)",
        DE: "1 Std = 1 Zeit-Token (Video)",
        JA: "1時間＝1タイムトークン（ビデオ）",
        ZH: "1小时 = 1 时间代币（视频）"
      },
      "3 Crédits temps": {
        FR: "3 Jetons temps",
        EN: "3 Time Tokens",
        ES: "3 Fichas de tiempo",
        IT: "3 Gettoni tempo",
        DE: "3 Zeit-Tokens",
        JA: "3 タイムトークン",
        ZH: "3 时间代币"
      },
      "3 Jetons temps": {
        FR: "3 Jetons temps",
        EN: "3 Time Tokens",
        ES: "3 Fichas de tiempo",
        IT: "3 Gettoni tempo",
        DE: "3 Zeit-Tokens",
        JA: "3 タイムトークン",
        ZH: "3 时间代币"
      },
      "Troc direct + Caution 30€": {
        FR: "Troc direct + Caution 30€",
        EN: "Direct swap + €30 deposit",
        ES: "Trueque directo + Fianza 30€",
        IT: "Baratto diretto + Deposito 30€",
        DE: "Direkter Tausch + 30€ Kaution",
        JA: "直接交換＋30ユーロ保証金",
        ZH: "直接易货 + 30欧押金"
      },
      "Intervention locale / batterie ou écran": {
        FR: "Intervention locale / batterie ou écran",
        EN: "Local repair / battery or screen",
        ES: "Intervención local / batería o pantalla",
        IT: "Intervento locale / batteria o schermo",
        DE: "Reparatur vor Ort / Akku oder Display",
        JA: "現地サポート／バッテリーまたは画面",
        ZH: "现场服务 / 电池或屏幕"
      },
      "2 séances de 45 min en visio contre 2 Crédits temps (remboursables si indisponibilité).": {
        FR: "2 séances de 45 min en visio contre 2 Jetons temps (remboursables si indisponibilité).",
        EN: "2 x 45 min video sessions for 2 Time Tokens (refundable if unavailable).",
        ES: "2 sesiones de 45 min en visio por 2 Fichas de tiempo (reembolsables si hay indisponibilidad).",
        IT: "2 sessioni da 45 min in video per 2 Gettoni tempo (rimborsabili in caso di indisponibilità).",
        DE: "2 x 45 Min. Video-Sitzungen für 2 Zeit-Tokens (rückerstattbar bei Verfügbarkeitsproblemen).",
        JA: "45分間のビデオセッション2回（2タイムトークン、利用不可の場合は返金可）。",
        ZH: "2次45分钟视频课程，兑换2个时间代币（不可用时可退款）。"
      },
      "2h = 2 Jetons": {
        FR: "2h = 2 Jetons",
        EN: "2h = 2 Tokens",
        ES: "2h = 2 Fichas",
        IT: "2h = 2 Gettoni",
        DE: "2 Std = 2 Tokens",
        JA: "2時間＝2トークン",
        ZH: "2小时 = 2 代币"
      },
      "1 session = 1 Jeton": {
        FR: "1 session = 1 Jeton",
        EN: "1 session = 1 Token",
        ES: "1 sesión = 1 Ficha",
        IT: "1 sessione = 1 Gettone",
        DE: "1 Sitzung = 1 Token",
        JA: "1セッション＝1トークン",
        ZH: "1次课程 = 1 代币"
      },
      "2 Jetons ou 35$": {
        FR: "2 Jetons ou 35$",
        EN: "2 Tokens or $35",
        ES: "2 Fichas o 35$",
        IT: "2 Gettoni o 35$",
        DE: "2 Tokens oder 35$",
        JA: "2トークンまたは35ドル",
        ZH: "2个代币或35美元"
      },
      "Échange direct / Swap": {
        FR: "Échange direct / Swap",
        EN: "Direct Exchange / Swap",
        ES: "Intercambio directo / Trueque",
        IT: "Scambio diretto / Baratto",
        DE: "Direkttausch",
        JA: "直接交換／スワップ",
        ZH: "直接交换 / 互换"
      }
    };

    if (knownCompMap[comp] && knownCompMap[comp][currentLang]) {
      return knownCompMap[comp][currentLang];
    }

    let res = comp;
    const tokenWord = t('tokens');
    res = res.replace(/\b(Jetons?|Crédits?|Tokens?|Fichas?|Gettoni?)\b/gi, tokenWord);
    if (res.includes('Échange direct') || res.includes('Swap')) {
      res = res.replace(/Échange direct \/ Swap|Échange direct|Swap/gi, t('exchange'));
    }
    if (currentLang === 'ES') res = res.replace(/\btemps\b/gi, 'de tiempo');
    else if (currentLang === 'EN') res = res.replace(/\btemps\b/gi, 'time');
    else if (currentLang === 'IT') res = res.replace(/\btemps\b/gi, 'tempo');
    else if (currentLang === 'DE') res = res.replace(/\btemps\b/gi, 'Zeit');
    else if (currentLang === 'JA') res = res.replace(/\btemps\b/gi, '時間');
    else if (currentLang === 'ZH') res = res.replace(/\btemps\b/gi, '时间');
    return res;
  };
  const [showingOriginalListings, setShowingOriginalListings] = useState({});
  const [showingOriginalMessages, setShowingOriginalMessages] = useState({});
  const [showingOriginalBio, setShowingOriginalBio] = useState(false);
  const profileAvatarFileInputRef = useRef(null);

  const compressImage = (file, maxWidth = 300, maxHeight = 300, quality = 0.75) => {
    return new Promise((resolve) => {
      if (!file || !file.type || !file.type.startsWith('image/')) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const img = new Image();
        img.onload = () => {
          try {
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
          } catch (err) {
            resolve(uploadEvent.target.result);
          }
        };
        img.onerror = () => resolve(uploadEvent.target.result);
        img.src = uploadEvent.target.result;
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  };

  const handleAvatarFileUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      const compressedDataUrl = await compressImage(file, 300, 300, 0.75);
      if (compressedDataUrl) {
        setProfileDraft(prev => ({ ...prev, avatar: compressedDataUrl }));
        setProfile(prev => ({ ...prev, avatar: compressedDataUrl }));
      }
    }
  };
  const [showingOriginalReviews, setShowingOriginalReviews] = useState({});
  const toggleOriginalReview = (id) => setShowingOriginalReviews(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleOriginalMessage = (id) => setShowingOriginalMessages(prev => ({ ...prev, [id]: !prev[id] }));

  const toggleOriginalListing = (id, event) => {
    if (event) event.stopPropagation();
    setShowingOriginalListings(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // ---- LOGIQUE DE TRADUCTION UNIVERSELLE ----
  // Règle appliquée à 100% des annonces :
  //   1. forceOriginal = true → renvoie TOUJOURS le titre/description natif
  //   2. item.translations[targetLang] disponible → traduction exacte dans la langue de l'interface
  //   3. targetLang === nativeLang → contenu natif
  //   4. fallback item.translations['EN'] si présent
  //   5. dernier recours → contenu natif
  const getListingDisplayContent = (item, targetLang, forceOriginal = false) => {
    if (!item) return { title: '', description: '', compensation: '' };
    const nativeLang = item.nativeLang || 'FR';

    // Mode "voir l'original" forcé -> renvoyer immédiatement les textes natifs
    if (forceOriginal) {
      return { title: item.title, description: item.description || '', compensation: item.compensation || '' };
    }

    const trans = item.translations;
    // Si une traduction existe pour la langue actuelle de l'interface -> l'utiliser
    if (trans && trans[targetLang] && trans[targetLang].title) {
      return {
        title: trans[targetLang].title,
        description: trans[targetLang].description || item.description || '',
        compensation: trans[targetLang].compensation || item.compensation || ''
      };
    }

    // Si la langue de l'interface est la langue native de l'annonce -> texte natif
    if (targetLang === nativeLang) {
      return { title: item.title, description: item.description || '', compensation: item.compensation || '' };
    }

    // Traduction automatique dynamique en temps réel pour toute annonce
    const dynamicTitle = getInstantOrQueueTranslation(item.title, targetLang, nativeLang);
    const dynamicDesc = item.description ? getInstantOrQueueTranslation(item.description, targetLang, nativeLang) : '';
    const dynamicComp = item.compensation ? getInstantOrQueueTranslation(item.compensation, targetLang, nativeLang) : '';

    return {
      title: dynamicTitle || item.title,
      description: dynamicDesc || item.description || '',
      compensation: dynamicComp || item.compensation || ''
    };
  };

  // ---- GEOPRIVACY : FLOUTAGE ET TRONCATURE DE SÉCURITÉ DE LA POSITION GPS ----
  const fuzzCoordinates = (lat, lng) => {
    // Troncature de sécurité à 2 décimales (~1km) pour protéger la vie privée de l'utilisateur
    const fLat = Math.round(lat * 100) / 100;
    const fLng = Math.round(lng * 100) / 100;
    return [fLat, fLng];
  };

  const handleRequestGeolocation = () => {
    if (!navigator.geolocation) return;
    setIsGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const fuzzed = fuzzCoordinates(position.coords.latitude, position.coords.longitude);
        setUserCoords(fuzzed);
        setIsGeolocated(true);
        setIsGeolocating(false);
      },
      () => {
        setIsGeolocating(false);
      },
      { enableHighAccuracy: false, timeout: 6000 }
    );
  };
  const [activeTab, setActiveTab] = useState('feed');
  const [profile, setProfile] = useState(() => {
    const saved = window.localStorage.getItem('troco_user_profile');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { }
    }
    return {
      name: 'MATEO POLO',
      username: '@mateopolo',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
      bio: 'Créateur de contenus, développeur Python et passionné de musique. Je propose des services flexibles et des échanges de qualité.',
      location: 'Paris, France',
      languages: ['FR', 'EN', 'ES', 'IT'],
      loginMethod: 'Google',
      euroBalance: 128,
      trocoTokens: 12,
    };
  });
  const [profileDraft, setProfileDraft] = useState(profile);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [skills, setSkills] = useState([
    'Prod musicale & Ableton Live',
    'Scripts Python',
  ]);
  const [equipment, setEquipment] = useState([
    'MacBook Pro 14',
    'Microphone USB',
  ]);
  const [skillInput, setSkillInput] = useState('');
  const [equipmentInput, setEquipmentInput] = useState('');
  const [portfolioImages, setPortfolioImages] = useState(() => profile?.portfolioImages || []);
  const [portfolioUrlInput, setPortfolioUrlInput] = useState('');
  const [formatFilter, setFormatFilter] = useState('all');

  const [selectedChat, setSelectedChat] = useState(null);
  const [readChats, setReadChats] = useState(() => {
    try {
      const saved = window.localStorage.getItem('troco_read_chats');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return new Set(parsed);
      }
    } catch (_) { }
    return new Set();
  }); // IDs des convos déjà lues

  useEffect(() => {
    try {
      window.localStorage.setItem('troco_read_chats', JSON.stringify([...readChats]));
    } catch (_) { }
  }, [readChats]);
  const [selectedListing, setSelectedListing] = useState(null);
  const [messageDraft, setMessageDraft] = useState('');
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  // eslint-disable-next-line no-unused-vars
  const [selectedMapItem, setSelectedMapItem] = useState(null);
  const [isBoostModalOpen, setIsBoostModalOpen] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [isEditingListing, setIsEditingListing] = useState(false);
  const [editingOriginalListing, setEditingOriginalListing] = useState(null);
  const [boostingListing, setBoostingListing] = useState(null);
  const [boostMessage, setBoostMessage] = useState('');
  const [mapCenter] = useState([48.8566, 2.3522]);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return window.localStorage.getItem('troco_is_authenticated') === 'true';
  });
  // eslint-disable-next-line no-unused-vars
  const [authModalOpen, setAuthModalOpen] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [authMethod, setAuthMethod] = useState('Google');
  const [authStep, setAuthStep] = useState('select'); // 'select' | 'phone' | 'sms-verify' | 'email' | 'email-sent'
  const [authPhoneNumber, setAuthPhoneNumber] = useState('+336');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authModeEmail, setAuthModeEmail] = useState('password'); // 'password' | 'magic-link'
  const [authSmsCode, setAuthSmsCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authTab, setAuthTab] = useState('login'); // 'login' | 'signup'
  const [signupName, setSignupName] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupEmailOrPhone, setSignupEmailOrPhone] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupLocation, setSignupLocation] = useState('Paris, France');
  const [signupBio, setSignupBio] = useState('');
  const [signupAvatar, setSignupAvatar] = useState('https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80');
  const [signupSkills, setSignupSkills] = useState([]);
  const [signupLanguages, setSignupLanguages] = useState(['FR']);
  const [signupSkillInput, setSignupSkillInput] = useState('');
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  // ---- ÉTATS MODÉRATION & PANEL ADMINISTRATEUR ----
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState({ listing: null, user: null });
  const [allReports, setAllReports] = useState([]);
  const [allFirestoreUsers, setAllFirestoreUsers] = useState([]);
  const categoryScrollRef = useRef(null);

  const scrollCategories = (direction) => {
    if (categoryScrollRef.current) {
      const scrollAmount = direction === 'left' ? -220 : 220;
      categoryScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // ---- ÉTATS PAIEMENT & FACTURATION (BLOC 5) ----
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentModalConfig, setPaymentModalConfig] = useState({
    mode: 'pack-tokens',
    payload: null,
  });
  const [isTransactionsModalOpen, setIsTransactionsModalOpen] = useState(false);
  // ---- ÉTATS CADRE JURIDIQUE, CGU & RGPD (BLOC 6) ----
  const [isPrivacyCenterOpen, setIsPrivacyCenterOpen] = useState(false);
  const [isCguViewerOpen, setIsCguViewerOpen] = useState(false);
  // ---- ÉTAT VÉRIFICATION D'IDENTITÉ KYC ----
  const [isKycModalOpen, setIsKycModalOpen] = useState(false);
  // ---- ÉTAT DU PARCOURS D'ONBOARDING INTERACTIF (CHANTIER 1) ----
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  const handleKycComplete = async () => {
    const updatedProfile = {
      ...profile,
      kycVerified: true,
      kycVerifiedAt: new Date().toISOString(),
    };
    setProfile(updatedProfile);
    setProfileDraft(updatedProfile);
    try {
      localStorage.setItem('troco_user_profile', JSON.stringify(updatedProfile));
    } catch (_) { }
    if (auth.currentUser?.uid) {
      try {
        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
          kycVerified: true,
          kycVerifiedAt: serverTimestamp(),
        });
      } catch (err) {
        console.warn('[Firestore] Update KYC error:', err);
      }
    }
  };
  const [userTransactions, setUserTransactions] = useState(() => {
    try {
      const saved = localStorage.getItem('troco_user_transactions');
      return saved ? JSON.parse(saved) : [
        {
          id: 'tx-seed-1',
          transactionId: 'TRK-202603-4819',
          label: 'Achat 5 Jetons Troco (Essentiel)',
          mode: 'pack-tokens',
          amountTtc: 49.99,
          amountHt: 41.66,
          tva: 8.33,
          currency: 'EUR',
          paymentMethod: 'Apple Pay',
          authRef: 'APL-92KDA81',
          date: '2026-03-10T14:23:00.000Z',
          tokensPurchased: 5,
        },
        {
          id: 'tx-seed-2',
          transactionId: 'TRK-202603-3102',
          label: 'Recharge Portefeuille Troco (20.00 €)',
          mode: 'topup-cash',
          amountTtc: 20.00,
          amountHt: 16.67,
          tva: 3.33,
          currency: 'EUR',
          paymentMethod: 'Carte Bancaire (VISA •••• 4242)',
          authRef: 'STR-71NXL90',
          date: '2026-03-05T09:12:00.000Z',
          cashTopUp: 20.00,
        },
      ];
    } catch (e) {
      return [];
    }
  });

  // Écoute temps réel des transactions de l'utilisateur sur Firestore
  useEffect(() => {
    const uid = profile?.uid || auth.currentUser?.uid;
    if (!uid) return;
    try {
      const qTx = query(
        collection(db, 'transactions'),
        where('userId', '==', uid),
        orderBy('createdAt', 'desc')
      );
      const unsub = onSnapshot(qTx, (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          setUserTransactions(list);
          try {
            localStorage.setItem('troco_user_transactions', JSON.stringify(list));
          } catch (e) { }
        }
      }, (err) => console.warn('[Firestore] Transactions listener:', err));
      return () => unsub();
    } catch (e) {
      console.warn('Transactions listener error:', e);
    }
  }, [profile?.uid]);

  // Handler d'ouverture du module de paiement
  const handleOpenPayment = (mode = 'pack-tokens', payload = null) => {
    setPaymentModalConfig({ mode, payload });
    setIsPaymentModalOpen(true);
  };

  // Handler de succès de paiement (crédit solde, enregistrement transaction Firestore)
  // Handler de succès de paiement (crédit solde, abonnement Troco Plus, enregistrement transaction Firestore)
  const handlePaymentSuccess = async (txData) => {
    const uid = profile?.uid || auth.currentUser?.uid;

    // 1. Mise à jour des soldes et du statut d'abonnement de l'utilisateur
    let updatedEuro = profile.euroBalance;
    let updatedTokens = profile.trocoTokens;
    let updatedTrocoPlus = profile.isTrocoPlus || false;
    let updatedTrocoPlusPlan = profile.trocoPlusPlan || null;

    if (txData.mode === 'troco-plus' || txData.mode === 'pack-tokens') {
      updatedTokens += (txData.tokensPurchased || 0);
      updatedTrocoPlus = true;
      updatedTrocoPlusPlan = txData.subscriptionPlan?.planKey || 'essential';
      setSaveMessage(`⭐ Abonnement ${txData.subscriptionPlan?.title || 'Troco Plus'} activé avec succès ! +${txData.tokensPurchased} jetons crédités.`);
      setTimeout(() => setSaveMessage(''), 6000);
    } else if (txData.mode === 'topup-cash') {
      const topUpAmount = Number(txData.cashTopUp) || 0;
      if (topUpAmount > 0) {
        updatedEuro = Number((updatedEuro + topUpAmount).toFixed(2));
        setSaveMessage(`💳 Solde rechargé avec succès (+${topUpAmount.toFixed(2)} € via ${txData.paymentMethod}).`);
        setTimeout(() => setSaveMessage(''), 5000);
      }
    } else if (txData.mode === 'boost') {
      if (txData.paymentMethod?.includes('Solde')) {
        updatedEuro = Math.max(0, Number((updatedEuro - (txData.amountTtc || 0)).toFixed(2)));
      }
      if (txData.boostDetails?.listingId) {
        setListings(prev => prev.map(item => item.id === txData.boostDetails.listingId ? { ...item, isBoosted: true } : item));
      }
    } else if (txData.mode === 'deal') {
      if (txData.paymentMethod?.includes('Solde')) {
        updatedEuro = Math.max(0, Number((updatedEuro - (txData.amountTtc || 0)).toFixed(2)));
      }
      if (txData.payload?.chatId && txData.payload?.dealId) {
        const { chatId, dealId, terms, partnerName, partnerUid } = txData.payload;
        const tokensAmount = Number(terms?.trocoTokens) || 0;
        const euroAmount = Number(terms?.euroAmount) || 0;
        if (tokensAmount > 0) {
          updatedTokens = Math.max(0, updatedTokens - tokensAmount);
        }
        // Crédit du partenaire si montant euro spécifié
        if (euroAmount > 0 && partnerUid) {
          try {
            const partnerRef = doc(db, 'users', String(partnerUid));
            const partnerSnap = await getDoc(partnerRef);
            if (partnerSnap.exists()) {
              const currentPartnerBal = Number(partnerSnap.data().euroBalance) || 0;
              await updateDoc(partnerRef, {
                euroBalance: Number((currentPartnerBal + euroAmount).toFixed(2)),
                updatedAt: serverTimestamp(),
              });
            }
          } catch (e) {
            console.warn('[Firestore] Credit partner error:', e);
          }
        }
        setChatThreads(prev => ({
          ...prev,
          [chatId]: (prev[chatId] || []).map(m => m.id === dealId ? { ...m, status: 'confirmed' } : m),
        }));
        setChatStatusOverrides(prev => ({ ...prev, [chatId]: 'Deal Validé' }));
        setSaveMessage(`🤝 Deal validé et réglé avec succès avec ${partnerName || 'votre partenaire'} !`);
        setTimeout(() => setSaveMessage(''), 5000);
      }
    }

    const updatedProfile = {
      ...profile,
      euroBalance: Number(updatedEuro.toFixed(2)),
      trocoTokens: updatedTokens,
      isTrocoPlus: updatedTrocoPlus,
      trocoPlusPlan: updatedTrocoPlusPlan,
    };
    setProfile(updatedProfile);

    // 2. Sauvegarde de la transaction dans le state local
    const newTxRecord = {
      id: 'tx-' + Date.now(),
      ...txData,
      userId: uid || 'guest',
      userName: profile.name,
      createdAt: new Date().toISOString(),
    };
    setUserTransactions(prev => [newTxRecord, ...prev]);
    try {
      localStorage.setItem('troco_user_transactions', JSON.stringify([newTxRecord, ...userTransactions]));
    } catch (e) { }

    // 3. Persistance sur Firestore users/{uid} et transactions
    if (uid) {
      try {
        await updateDoc(doc(db, 'users', uid), {
          euroBalance: updatedProfile.euroBalance,
          trocoTokens: updatedProfile.trocoTokens,
          updatedAt: serverTimestamp(),
        });
        await addDoc(collection(db, 'transactions'), {
          ...txData,
          userId: uid,
          userName: profile.name,
          userEmail: profile.email || '',
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        console.warn('[Firestore] Error saving transaction:', err);
      }
    }
  };

  // ---- GESTION DU CADRE JURIDIQUE & RGPD (BLOC 6) ----
  const handleDeleteAccount = async () => {
    const uid = profile?.uid || auth.currentUser?.uid;
    try {
      if (uid) {
        // Suppression du document utilisateur dans Firestore
        await deleteDoc(doc(db, 'users', uid));
      }
      localStorage.clear();
      if (auth.currentUser) {
        await signOut(auth);
      }
      window.location.reload();
    } catch (err) {
      console.error('Account deletion error:', err);
      localStorage.clear();
      window.location.reload();
    }
  };

  // ---- ÉCOUTE TEMPS RÉEL DES SIGNALEMENTS (MODÉRATION ADMIN) ----
  useEffect(() => {
    try {
      const qReports = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
      const unsub = onSnapshot(qReports, (snap) => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setAllReports(list);
      }, (err) => console.warn('[Firestore] Reports listener:', err));
      return () => unsub();
    } catch (e) {
      console.warn('Reports listener setup error:', e);
    }
  }, []);

  // ---- ÉCOUTE TEMPS RÉEL DES UTILISATEURS (ANNUAIRE ADMIN) ----
  useEffect(() => {
    try {
      const unsub = onSnapshot(collection(db, 'users'), (snap) => {
        const list = snap.docs.map(d => ({ id: d.id, uid: d.id, ...d.data() }));
        setAllFirestoreUsers(list);
      }, (err) => console.warn('[Firestore] Users listener:', err));
      return () => unsub();
    } catch (e) {
      console.warn('Users listener setup error:', e);
    }
  }, []);

  // Handlers actions administrateur
  const handleAdminUpdateUser = async (uid, updates) => {
    if (!uid) return;
    try {
      await updateDoc(doc(db, 'users', uid), {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('[Firestore] handleAdminUpdateUser error:', err);
      setAllFirestoreUsers(prev => prev.map(u => (u.uid === uid || u.id === uid) ? { ...u, ...updates } : u));
    }
  };

  const handleAdminDeleteListing = async (listingOrId) => {
    if (!listingOrId) return;
    const targetId = typeof listingOrId === 'object' ? listingOrId.id : listingOrId;
    setListings(prev => prev.filter(l => String(l.id) !== String(targetId)));
    try {
      const firestoreId = typeof listingOrId === 'object' && listingOrId.firestoreId
        ? listingOrId.firestoreId
        : listings.find(l => String(l.id) === String(targetId))?.firestoreId;
      if (firestoreId) {
        await deleteDoc(doc(db, 'listings', String(firestoreId)));
      }
    } catch (err) {
      console.warn('[Firestore] handleAdminDeleteListing error:', err);
    }
  };

  const handleAdminResolveReport = async (reportId, status = 'resolved') => {
    if (!reportId) return;
    try {
      await updateDoc(doc(db, 'reports', reportId), {
        status,
        resolvedAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('[Firestore] handleAdminResolveReport error:', err);
      setAllReports(prev => prev.map(r => r.id === reportId ? { ...r, status } : r));
    }
  };

  // ---- RÉINITIALISATION TOTALE D'UN UTILISATEUR (WIPE & RESET ADMIN) ----
  const handleAdminResetUser = async (uid, userData = null) => {
    if (!uid) return;
    try {
      const resetData = {
        euroBalance: 0.00,
        trocoTokens: 10,
        dealsCompleted: 0,
        dealsInProgress: 0,
        skills: [],
        equipment: [],
        bio: 'Nouvel utilisateur sur Troco ! Prêt à partager mes compétences et échanger des services.',
        kycVerified: false,
        onboardingCompleted: false,
        hasClaimedWelcomeGift: false,
        isBanned: false,
        isShadowBanned: false,
        updatedAt: serverTimestamp(),
      };

      // 1. Mise à jour Firestore users/{uid}
      await updateDoc(doc(db, 'users', String(uid)), resetData);

      // 2. Suppression de toutes les annonces de cet utilisateur sur Firestore et en local
      const userName = userData?.name || allFirestoreUsers.find(u => u.uid === uid || u.id === uid)?.name;
      const userListings = listings.filter(l =>
        (l.userId && String(l.userId) === String(uid)) ||
        (userName && l.author === userName)
      );

      for (const l of userListings) {
        if (l.firestoreId) {
          try {
            await deleteDoc(doc(db, 'listings', String(l.firestoreId)));
          } catch (e) {
            console.warn('[Firestore] Delete user listing error:', e);
          }
        }
      }

      setListings(prev => prev.filter(l =>
        !(l.userId && String(l.userId) === String(uid)) &&
        !(userName && l.author === userName)
      ));

      // 3. Mise à jour de l'état allFirestoreUsers
      setAllFirestoreUsers(prev => prev.map(u => (u.uid === uid || u.id === uid) ? { ...u, ...resetData } : u));

      // 4. Si c'est l'utilisateur courant, réinitialiser son profil local + déclencher l'onboarding
      if (profile?.uid === uid || auth.currentUser?.uid === uid) {
        setProfile(prev => ({
          ...prev,
          ...resetData,
        }));
        setSkills([]);
        setEquipment([]);
        try {
          localStorage.removeItem('troco_onboarding_completed');
          localStorage.removeItem('troco_welcome_gift_claimed');
        } catch (_) { }
      }

      alert(`✅ Le profil ${userName || uid} a été réinitialisé avec succès (solde 0.00€, 10 jetons, onboarding réactivé, annonces supprimées).`);
    } catch (err) {
      console.warn('[Firestore] handleAdminResetUser error:', err);
      alert(`Erreur lors de la réinitialisation du profil : ${err.message}`);
    }
  };

  const handleAdminEditListing = (listing) => {
    setIsAdminPanelOpen(false);
    handleStartEditListing(listing);
  };

  // ---- ÉCOUTE ET SYNCHRONISATION EN TEMPS RÉEL DU PROFIL FIREBASE USERS/{UID} ----
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const uid = firebaseUser.uid;
        const userDocRef = doc(db, 'users', uid);

        // Écoute temps réel des changements de solde, infos et statut CGU du profil
        const unsubDoc = onSnapshot(userDocRef, async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setProfile(prev => ({
              ...prev,
              ...data,
              uid: uid,
            }));
            if (Array.isArray(data.skills)) setSkills(data.skills);
            if (Array.isArray(data.equipment)) setEquipment(data.equipment);
          } else {
            // Initialisation automatique du profil sur Firestore si nouveau provider
            const defaultUserDoc = {
              uid: uid,
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0].toUpperCase() || 'Utilisateur Troco',
              username: '@' + (firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'user').toLowerCase().replace(/\s+/g, ''),
              email: firebaseUser.email || '',
              phoneNumber: firebaseUser.phoneNumber || '',
              avatar: firebaseUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
              bio: 'Nouvel utilisateur sur Troco ! Prêt à partager mes compétences et échanger des services.',
              location: 'Paris, France',
              languages: ['FR'],
              skills: [],
              equipment: [],
              euroBalance: 0.00,
              trocoTokens: 10,
              dealsCompleted: 0,
              dealsInProgress: 0,
              rating: null,
              onboardingCompleted: false,
              loginMethod: firebaseUser.providerData?.[0]?.providerId || 'Email',
              cguAcceptedAt: null,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            };
            try {
              await setDoc(userDocRef, defaultUserDoc, { merge: true });
              setProfile(prev => ({ ...prev, ...defaultUserDoc }));
            } catch (e) {
              console.warn('[Firestore] Failed to init user doc:', e);
            }
          }
        });

        setIsAuthenticated(true);
        window.localStorage.setItem('troco_is_authenticated', 'true');
        setIsLoadingSession(false);
        return () => unsubDoc();
      } else {
        const hasSession = window.localStorage.getItem('troco_is_authenticated') === 'true';
        if (!hasSession) {
          setIsAuthenticated(false);
        }
        setIsLoadingSession(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // ---- ÉCOUTE ET RÉACTUALISATION EN TEMPS RÉEL DES TRADUCTIONS DYNAMIQUES ----
  const [, setTranslationRevision] = useState(0);
  useEffect(() => {
    const unsub = subscribeTranslations(() => {
      setTranslationRevision(r => r + 1);
    });
    return () => unsub();
  }, []);

  // ---- DÉTECTION ET OUVERTURE DU WIZARD D'ONBOARDING POUR NOUVEAUX COMPTES (CHANTIER 1) ----
  useEffect(() => {
    if (isAuthenticated && profile) {
      const needsOnboarding = profile.onboardingCompleted === false || (profile.onboardingCompleted === undefined && profile.uid && profile.uid !== 'demo_mateopolo');
      if (needsOnboarding) {
        setIsOnboardingOpen(true);
      }
    }
  }, [isAuthenticated, profile?.onboardingCompleted, profile?.uid]);

  const [isWelcomeGiftModalOpen, setIsWelcomeGiftModalOpen] = useState(false);

  // Déclencheur automatique de célébration de bienvenue à l'atterrissage sur le profil
  useEffect(() => {
    if (activeTab === 'profile' && isAuthenticated) {
      const alreadyCelebrated = window.localStorage.getItem('troco_welcome_gift_celebrated') === 'true';
      if (!alreadyCelebrated && profile?.trocoTokens === 10 && (profile?.euroBalance === 0 || profile?.euroBalance === 0.00)) {
        window.localStorage.setItem('troco_welcome_gift_celebrated', 'true');
        playWelcomeGiftFanfare();
        setIsWelcomeGiftModalOpen(true);
      }
    }
  }, [activeTab, isAuthenticated, profile?.trocoTokens, profile?.euroBalance]);

  // ---- FINALISATION DU PARCOURS D'ONBOARDING (CHANTIER 1 & CADEAU DE BIENVENUE) ----
  const handleCompleteOnboarding = async (completedData) => {
    const finalEuroBalance = 0.00; // Toujours 0€ à la création de compte
    const finalTokens = 10; // Toujours 10 Jetons offerts à la bienvenue
    const updatedProfile = {
      ...profile,
      ...completedData,
      euroBalance: finalEuroBalance,
      trocoTokens: finalTokens,
      onboardingCompleted: true,
      dealsCompleted: profile.dealsCompleted ?? 0,
      dealsInProgress: profile.dealsInProgress ?? 0,
      rating: profile.rating ?? null,
    };
    setProfile(updatedProfile);
    setProfileDraft(updatedProfile);
    if (Array.isArray(completedData.skills)) setSkills(completedData.skills);
    if (Array.isArray(completedData.equipment)) setEquipment(completedData.equipment);
    window.localStorage.setItem('troco_user_profile', JSON.stringify(updatedProfile));
    window.localStorage.setItem('troco_welcome_gift_celebrated', 'true');

    const uid = profile?.uid || auth.currentUser?.uid;
    if (uid) {
      try {
        await setDoc(doc(db, 'users', uid), {
          ...completedData,
          euroBalance: finalEuroBalance,
          trocoTokens: finalTokens,
          onboardingCompleted: true,
          dealsCompleted: profile.dealsCompleted ?? 0,
          dealsInProgress: profile.dealsInProgress ?? 0,
          rating: profile.rating ?? null,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } catch (e) {
        console.warn('[Firestore] Failed to save onboarding to Firestore:', e);
      }
    }
    setIsOnboardingOpen(false);
    playWelcomeGiftFanfare();
    setIsWelcomeGiftModalOpen(true);
    setSaveMessage('🎁 +10 Jetons Troco offerts ! Bienvenue sur Troco.');
    setTimeout(() => setSaveMessage(''), 5000);
  };

  useEffect(() => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      let email = window.localStorage.getItem('emailForSignIn');
      if (!email) {
        email = window.prompt('Veuillez entrer votre email pour valider la connexion :');
      }
      if (email) {
        setAuthLoading(true);
        signInWithEmailLink(auth, email, window.location.href)
          .then((result) => {
            window.localStorage.removeItem('emailForSignIn');
            const userName = result.user.email?.split('@')[0].toUpperCase() || 'UTILISATEUR';
            const userHandle = '@' + (result.user.email?.split('@')[0] || 'user').toLowerCase().replace(/\s+/g, '');
            setProfile(prev => {
              const updated = { ...prev, loginMethod: 'Email Link', name: userName, username: userHandle, uid: result.user.uid };
              window.localStorage.setItem('troco_user_profile', JSON.stringify(updated));
              return updated;
            });
            setIsAuthenticated(true);
            window.localStorage.setItem('troco_is_authenticated', 'true');
          })
          .catch((err) => {
            console.error(err);
            setAuthError(err.message || 'Lien invalide ou expiré.');
          })
          .finally(() => setAuthLoading(false));
      }
    }
  }, []);


  // État d'édition profil initialisé plus haut
  const [categoryInput, setCategoryInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [customCategories, setCustomCategories] = useState([]);
  const [radiusKm, setRadiusKm] = useState(20);
  const [isInfiniteRadius, setIsInfiniteRadius] = useState(true);
  const [hoveredCardId, setHoveredCardId] = useState(null);
  const [hoverSlideIndex, setHoverSlideIndex] = useState(0);
  const [isChatFullscreen, setIsChatFullscreen] = useState(false);
  const [localZoom, setLocalZoom] = useState(false);

  useEffect(() => {
    if (viewMode === 'map') {
      setIsInfiniteRadius(true);
    }
  }, [viewMode]);

  useEffect(() => {
    if (!hoveredCardId) {
      setHoverSlideIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setHoverSlideIndex(prev => (prev + 1) % 3);
    }, 1600);
    return () => clearInterval(interval);
  }, [hoveredCardId]);
  const [detailMediaTab, setDetailMediaTab] = useState('video');
  const [selectedDetailImageIndex, setSelectedDetailImageIndex] = useState(0);

  const modalTouchStartRef = useRef(null);

  const handleModalTouchStart = (e) => {
    if (!e.touches || e.touches.length === 0) return;
    modalTouchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleModalTouchMove = (e) => {
    // Touch move listener for passive swipe tracking if needed
  };

  const handleModalTouchEnd = (e) => {
    if (!modalTouchStartRef.current) return;
    const touch = e.changedTouches && e.changedTouches.length > 0 ? e.changedTouches[0] : null;

    if (touch && selectedListing) {
      const deltaX = touch.clientX - modalTouchStartRef.current.x;
      const deltaY = touch.clientY - modalTouchStartRef.current.y;
      const gallery = selectedListing.gallery && selectedListing.gallery.length > 0 ? selectedListing.gallery : [selectedListing.image];

      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 20 && gallery.length > 1) {
        if (deltaX < 0) {
          // Swiped left -> next photo
          setSelectedDetailImageIndex(prev => (prev < gallery.length - 1 ? prev + 1 : 0));
        } else {
          // Swiped right -> prev photo
          setSelectedDetailImageIndex(prev => (prev > 0 ? prev - 1 : gallery.length - 1));
        }
      }
    }
    modalTouchStartRef.current = null;
  };

  const [selectedLanguages, setSelectedLanguages] = useState(['FR', 'EN']);
  const [selectedPayment, setSelectedPayment] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [postStep, setPostStep] = useState(1);
  const [publishMessage, setPublishMessage] = useState('');
  const [tagInputValue, setTagInputValue] = useState('');
  const defaultPostDraft = {
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
    image: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=800&q=80',
    imageUrl: '',
    videoUrl: '',
  };
  const [postDraft, setPostDraft] = useState(defaultPostDraft);
  const [showPublishedPopup, setShowPublishedPopup] = useState(false);
  const [publishedListing, setPublishedListing] = useState(null);

  // ---- CHECKOUT (PAIEMENT SIMULÉ) ----
  const [checkout, setCheckout] = useState({
    open: false,
    mode: null,
    amount: 0,
    label: '',
    payload: null,
    method: 'applePay',
    step: 'method',
  });

  // ---- CONTRE-PROPOSITION ----
  const [isCounterOfferOpen, setIsCounterOfferOpen] = useState(false);
  const [counterOfferDraft, setCounterOfferDraft] = useState({ euroAmount: '', trocoTokens: '', conditions: '' });
  const [chatStatusOverrides, setChatStatusOverrides] = useState({});

  // ---- GESTION WEBRTC AUDIO/VIDÉO & APPELS TEMPS RÉEL (SIGNALISATION FIRESTORE) ----
  const {
    callState,
    localStream,
    remoteStream,
    incomingCall,
    localVideoRef,
    remoteVideoRef,
    facingMode,
    hasMultipleCameras,
    switchCamera,
    startCall,
    acceptIncomingCall,
    declineIncomingCall,
    endCall,
    toggleMic,
    toggleCam,
    toggleScreenShare,
    hostMuteParticipant,
    hostStopParticipantScreenShare,
    copyInviteLink,
  } = useWebRTC({ profileName: profile.name, profileUid: profile?.uid || (auth.currentUser && auth.currentUser.uid), selectedChat });

  // Attacheurs de flux universels sans conflit de ref (évite les écrans noirs sur tous navigateurs)
  const attachLocalStream = useCallback((el) => {
    if (el && localStream) {
      if (el.srcObject !== localStream) {
        el.srcObject = localStream;
      }
      el.play().catch(() => { });
    }
  }, [localStream]);

  const attachRemoteStream = useCallback((el) => {
    if (el && remoteStream) {
      if (el.srcObject !== remoteStream) {
        el.srcObject = remoteStream;
      }
      el.play().catch(() => { });
    }
  }, [remoteStream]);

  // Décrochage universel direct avec bascule immédiate vers la visio plein écran
  const handleAcceptIncomingCall = async () => {
    try {
      const res = await acceptIncomingCall();
      if (res?.chatId) {
        const foundChat = (chatsList || []).find(c => String(c.id) === String(res.chatId)) || (mockChats || []).find(c => String(c.id) === String(res.chatId));
        if (foundChat) {
          setSelectedChat(foundChat);
        } else {
          setSelectedChat({ id: res.chatId, user: res.from || 'Interlocuteur' });
        }
      }
      setIsCallPip(false);
      setIsSwapVideo(false);
      setShowCallControls(true);
    } catch (e) {
      console.warn('[WebRTC] Accept incoming call error:', e);
    }
  };

  // État de gestion tactile d'annonce mobile (Chantier 4)
  const [mobileListingActionTarget, setMobileListingActionTarget] = useState(null);

  // ---- ÉTATS APPEL WEBRTC AVANCÉ (PIP, DRAG POINTER EVENTS, SWAP, PROFESSEUR & PARTAGE D'ÉCRAN) ----
  const [isCallPip, setIsCallPip] = useState(false);
  const [isSwapVideo, setIsSwapVideo] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [showCallControls, setShowCallControls] = useState(true);
  const [isTeacherMenuOpen, setIsTeacherMenuOpen] = useState(false);
  const isTeacher = Boolean(
    callState?.isHost ||
    (selectedChat?.author && selectedChat.author.toLowerCase() === profile?.name?.toLowerCase()) ||
    (selectedListing?.authorProfile?.name && selectedListing.authorProfile.name.toLowerCase() === profile?.name?.toLowerCase()) ||
    (selectedChat?.listing && profile?.skills?.some(s => selectedChat.listing.toLowerCase().includes(s.toLowerCase())))
  );
  const [pipPosition, setPipPosition] = useState({
    x: typeof window !== 'undefined' ? Math.max(10, window.innerWidth - 230) : 100,
    y: typeof window !== 'undefined' ? Math.max(10, window.innerHeight - 240) : 100
  });

  const [localVideoPosition, setLocalVideoPosition] = useState({
    x: typeof window !== 'undefined' ? Math.max(16, window.innerWidth - 130) : 250,
    y: 85
  });
  const localVideoPointerDragRef = useRef({
    isDragging: false,
    startX: 0,
    startY: 0,
    initialPosX: 0,
    initialPosY: 0,
    movedDistance: 0,
  });

  const handleLocalVideoPointerDown = (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) { }
    localVideoPointerDragRef.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      initialPosX: localVideoPosition.x,
      initialPosY: localVideoPosition.y,
      movedDistance: 0,
    };
  };

  const handleLocalVideoPointerMove = (e) => {
    if (!localVideoPointerDragRef.current.isDragging) return;
    const deltaX = e.clientX - localVideoPointerDragRef.current.startX;
    const deltaY = e.clientY - localVideoPointerDragRef.current.startY;
    localVideoPointerDragRef.current.movedDistance = Math.hypot(deltaX, deltaY);

    const vidW = 110;
    const vidH = 150;
    const maxX = Math.max(10, window.innerWidth - vidW - 10);
    const maxY = Math.max(10, window.innerHeight - vidH - 80);

    const nextX = Math.max(10, Math.min(maxX, localVideoPointerDragRef.current.initialPosX + deltaX));
    const nextY = Math.max(10, Math.min(maxY, localVideoPointerDragRef.current.initialPosY + deltaY));

    setLocalVideoPosition({ x: nextX, y: nextY });
  };

  const handleLocalVideoPointerUp = (e) => {
    if (!localVideoPointerDragRef.current.isDragging) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) { }
    localVideoPointerDragRef.current.isDragging = false;
  };

  const handleLocalVideoClick = () => {
    if (localVideoPointerDragRef.current.movedDistance >= 6) return;
    setIsSwapVideo(true);
  };

  // ---- MODE IMMERSION & TRANSPARENCE AUTOMATIQUE (INACTIVITÉ 5 SECONDES) ----
  const [isCallInactive, setIsCallInactive] = useState(false);
  const callInactivityTimerRef = useRef(null);

  const resetCallInactivity = useCallback(() => {
    setIsCallInactive(false);
    if (callInactivityTimerRef.current) {
      clearTimeout(callInactivityTimerRef.current);
    }
    callInactivityTimerRef.current = setTimeout(() => {
      setIsCallInactive(true);
    }, 5000);
  }, []);

  useEffect(() => {
    if (callState?.active && !isCallPip) {
      resetCallInactivity();
      return () => {
        if (callInactivityTimerRef.current) {
          clearTimeout(callInactivityTimerRef.current);
        }
      };
    } else {
      setIsCallInactive(false);
    }
  }, [callState?.active, isCallPip, resetCallInactivity]);

  // Masquage automatique des commandes lors du lancement d'un partage d'écran pour 100% de visibilité
  useEffect(() => {
    if (callState?.isScreenSharing || callState?.remoteScreenSharing) {
      setShowCallControls(false);
    }
  }, [callState?.isScreenSharing, callState?.remoteScreenSharing]);

  // ---- DÉPLACEMENT TACTILE FLUIDE DE LA BARRE DE CONTRÔLES D'APPEL ----
  const [callControlsPos, setCallControlsPos] = useState({ x: 0, y: 0 });
  const [isDraggingCallControls, setIsDraggingCallControls] = useState(false);
  const dragCallControlsRef = useRef({ startX: 0, startY: 0, initialX: 0, initialY: 0 });

  const handleCallControlsPointerDown = (e) => {
    if (e.target.closest('button')) return;
    setIsDraggingCallControls(true);
    dragCallControlsRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: callControlsPos.x,
      initialY: callControlsPos.y,
    };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) { }
  };

  const handleCallControlsPointerMove = (e) => {
    if (!isDraggingCallControls) return;
    const dx = e.clientX - dragCallControlsRef.current.startX;
    const dy = e.clientY - dragCallControlsRef.current.startY;
    setCallControlsPos({
      x: dragCallControlsRef.current.initialX + dx,
      y: dragCallControlsRef.current.initialY + dy,
    });
  };

  const handleCallControlsPointerUp = (e) => {
    if (isDraggingCallControls) {
      setIsDraggingCallControls(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (_) { }
    }
  };

  // ---- GESTION DU STATUT EN LIGNE RÉEL (HEARTBEAT FIRESTORE < 30S) ----
  const [presenceMap, setPresenceMap] = useState({});

  useEffect(() => {
    const uid = profile?.uid || (auth.currentUser && auth.currentUser.uid);
    if (!uid) return;

    const sendHeartbeat = async () => {
      try {
        await setDoc(doc(db, 'presence', String(uid)), {
          uid: String(uid),
          name: profile.name || 'Membre',
          lastSeenMs: Date.now(),
          lastSeen: serverTimestamp(),
          online: true,
        }, { merge: true });
      } catch (_) { }
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 15000); // Heartbeat toutes les 15s

    const handleBeforeUnload = () => {
      try {
        setDoc(doc(db, 'presence', String(uid)), {
          online: false,
          lastSeenMs: Date.now() - 60000,
        }, { merge: true }).catch(() => {});
      } catch (_) { }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [profile?.uid, profile?.name]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'presence'), (snapshot) => {
      const map = {};
      const now = Date.now();
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const lastSeenMs = data.lastSeenMs || (data.lastSeen?.toMillis ? data.lastSeen.toMillis() : (data.lastSeen?.seconds ? data.lastSeen.seconds * 1000 : 0));
        // Seuil strict de 30 secondes pour le battement de coeur
        const isOnline = data.online !== false && (now - lastSeenMs < 30000);
        map[docSnap.id] = isOnline;
        if (data.name) {
          map[data.name.trim().toLowerCase()] = isOnline;
        }
      });
      setPresenceMap(map);
    }, (err) => {
      console.debug('[Firestore] presence subscription error:', err);
    });

    return () => unsub();
  }, []);

  // Gestion Pointer Events API unifiée pour le Drag-and-Drop (toucher/souris à 60fps)
  const pipPointerDragRef = useRef({
    isDragging: false,
    startX: 0,
    startY: 0,
    initialPosX: 0,
    initialPosY: 0,
    movedDistance: 0,
  });

  // Condensation et élévation du header supérieur au défilement (Micro-interactions)
  const [isScrolled, setIsScrolled] = useState(false);
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 40;
      setIsScrolled(prev => prev !== scrolled ? scrolled : prev);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [settlementCallDuration, setSettlementCallDuration] = useState(0);
  const prevActiveRef = useRef(false);

  // Chronomètre de Deal en temps réel pendant l'appel (1h = 1 Jeton Troco)
  useEffect(() => {
    let timer = null;
    if (callState.active && !callState.ringing) {
      timer = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
      prevActiveRef.current = true;
    } else {
      if (prevActiveRef.current && callDuration > 5) {
        setSettlementCallDuration(callDuration);
        setIsSettlementModalOpen(true);
      }
      prevActiveRef.current = false;
      setCallDuration(0);
      setIsCallPip(false);
      setIsSwapVideo(false);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [callState.active, callState.ringing]); // eslint-disable-line

  // Rétribution en jetons & structure transparente de frais (Étape 5)
  const handleTransferCallTokens = async ({ tokens, insurance, duration }) => {
    const costTokens = Number(tokens) || 1;
    const insuranceFee = insurance ? 1.99 : 0;

    setProfile(prev => ({
      ...prev,
      trocoTokens: Math.max(0, prev.trocoTokens - costTokens),
      euroBalance: insuranceFee > 0 ? Number((prev.euroBalance - insuranceFee).toFixed(2)) : prev.euroBalance,
      dealsCompleted: (prev.dealsCompleted || 0) + 1,
    }));

    playApplePaySound();
    playBetclicBalanceSound(true);

    const partner = selectedChat?.user || 'Interlocuteur';
    const newTx = {
      id: `tx-visio-${Date.now()}`,
      title: `Rétribution Visio (${partner})`,
      amount: insuranceFee,
      tokens: costTokens,
      type: 'token_transfer',
      status: 'completed',
      date: new Date().toISOString(),
      partner: partner,
      duration: duration,
      freeServiceFee: true,
    };
    setUserTransactions(prev => [newTx, ...prev]);

    // PERSISTANCE TRANSACTIONNELLE ATOMIQUE FIRESTORE (runTransaction)
    const uid = profile?.uid || auth.currentUser?.uid;
    if (uid) {
      try {
        let partnerUid = selectedChat?.authorUid || selectedChat?.partnerUid;
        if (!partnerUid && partner) {
          try {
            const userQuery = query(collection(db, 'users'), where('name', '==', partner));
            const uSnap = await getDocs(userQuery);
            if (!uSnap.empty) {
              partnerUid = uSnap.docs[0].id;
            }
          } catch (_) { }
        }

        await runTransaction(db, async (transaction) => {
          // 1. Lecture atomique du payeur
          const payerRef = doc(db, 'users', uid);
          const payerSnap = await transaction.get(payerRef);

          let currentTokens = profile.trocoTokens || 10;
          let currentEuro = profile.euroBalance || 0;
          let currentDeals = profile.dealsCompleted || 0;

          if (payerSnap.exists()) {
            const pData = payerSnap.data();
            currentTokens = pData.trocoTokens !== undefined ? pData.trocoTokens : currentTokens;
            currentEuro = pData.euroBalance !== undefined ? pData.euroBalance : currentEuro;
            currentDeals = pData.dealsCompleted !== undefined ? pData.dealsCompleted : currentDeals;
          }

          // 2. Lecture atomique du partenaire (si identifié)
          let partnerRef = null;
          let partnerSnap = null;
          if (partnerUid) {
            partnerRef = doc(db, 'users', partnerUid);
            partnerSnap = await transaction.get(partnerRef);
          }

          // 3. Écriture atomique débit payeur
          transaction.set(payerRef, {
            trocoTokens: Math.max(0, currentTokens - costTokens),
            euroBalance: insuranceFee > 0 ? Number(Math.max(0, currentEuro - insuranceFee).toFixed(2)) : currentEuro,
            dealsCompleted: currentDeals + 1,
            updatedAt: serverTimestamp(),
          }, { merge: true });

          // 4. Écriture atomique crédit partenaire
          if (partnerRef && partnerSnap && partnerSnap.exists()) {
            const partData = partnerSnap.data();
            const partTokens = partData.trocoTokens || 0;
            const partDeals = partData.dealsCompleted || 0;

            transaction.update(partnerRef, {
              trocoTokens: partTokens + costTokens,
              dealsCompleted: partDeals + 1,
              updatedAt: serverTimestamp(),
            });
          }

          // 5. Enregistrement atomique de la transaction
          const txDocRef = doc(collection(db, 'transactions'));
          transaction.set(txDocRef, {
            ...newTx,
            userId: uid,
            userName: profile.name,
            partnerUid: partnerUid || null,
            createdAt: serverTimestamp(),
          });
        });
      } catch (e) {
        console.warn('[Firestore] Atomic runTransaction visio error:', e);
      }
    }

    setSaveMessage(`🤝 ${costTokens} Jeton${costTokens > 1 ? 's' : ''} Troco transféré(s) à ${partner} (Frais de service : 0,00 €) !`);
    setTimeout(() => setSaveMessage(''), 5000);
  };

  // Formateur du chronomètre de deal (HH:MM:SS ou MM:SS)
  const formatCallTimer = (totalSeconds) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handlers Pointer Events (pointerdown, pointermove, pointerup, pointercancel)
  const handlePipPointerDown = (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) { }
    pipPointerDragRef.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      initialPosX: pipPosition.x,
      initialPosY: pipPosition.y,
      movedDistance: 0,
    };
  };

  const handlePipPointerMove = (e) => {
    if (!pipPointerDragRef.current.isDragging) return;
    const deltaX = e.clientX - pipPointerDragRef.current.startX;
    const deltaY = e.clientY - pipPointerDragRef.current.startY;
    pipPointerDragRef.current.movedDistance = Math.hypot(deltaX, deltaY);

    const bottomNavOffset = 75;
    const minX = 0;
    const maxX = Math.max(0, window.innerWidth - 45);
    const maxY = Math.max(10, window.innerHeight - 150 - bottomNavOffset);

    const nextX = Math.max(minX, Math.min(maxX, pipPointerDragRef.current.initialPosX + deltaX));
    const nextY = Math.max(10, Math.min(maxY, pipPointerDragRef.current.initialPosY + deltaY));

    setPipPosition({ x: nextX, y: nextY });
  };

  const handlePipPointerUp = (e) => {
    if (!pipPointerDragRef.current.isDragging) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) { }
    pipPointerDragRef.current.isDragging = false;
  };

  const handlePipPointerCancel = (e) => {
    if (!pipPointerDragRef.current.isDragging) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) { }
    pipPointerDragRef.current.isDragging = false;
  };

  const handlePipContentClick = (e) => {
    // Si la distance parcourue est >= 6px, c'est un glisser-déposer : ignorer le clic pour éviter les faux déclenchements
    if (pipPointerDragRef.current.movedDistance >= 6) {
      e.stopPropagation();
      return;
    }
    setIsCallPip(false);
  };

  // ---- BASE DE DONNÉES MONDIALE — TRADUCTIONS 100% INLINE (item.translations) ----
  // Chaque annonce intègre ses propres traductions. Aucune dépendance externe.
  const mockListings = [

    // ═══════════════════════════════════════
    // 🇫🇷 PARIS, FRANCE (nativeLang: FR)
    // ═══════════════════════════════════════
    {
      id: 1,
      title: "Prêt Perceuse à percussion + coffret forets",
      description: "Perceuse à percussion professionnelle 800W avec coffret complet de forets béton, bois et métal.",
      author: "Marc L.",
      category: "Prêt de Matériel",
      verified: true, rating: 5.0, reviews: 14,
      location: "Paris 11e (À 1.2 km)",
      coordinates: [48.8584, 2.3785],
      type: "onsite", nativeLang: "FR",
      languages: ["FR", "EN"],
      compensation: "Troc ou 5€ consommables",
      image: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&w=600&q=80",
      video: "https://assets.mixkit.co/videos/preview/mixkit-man-working-with-a-drill-in-a-workshop-43285-large.mp4",
      urgent: true, caution: "Caution 40€",
      translations: {
        EN: { title: "Impact Drill Loan + Bit Set", description: "Heavy-duty 800W impact drill with complete wood, metal and concrete bit kit. Perfect for DIY." },
        ES: { title: "Préstamo de Taladro percutor + Brocas", description: "Taladro percutor 800W con juego completo de brocas para madera, metal y hormigón." },
        IT: { title: "Prestito Trapano a percussione + Set punte", description: "Trapano a percussione 800W con set completo di punte per legno, metallo e cemento." },
        DE: { title: "Schlagbohrmaschinen-Verleih + Bohrersatz", description: "Leistungsstarke 800W Schlagbohrmaschine mit komplettem Bohrersatz für Holz, Metall und Beton." },
        JA: { title: "振動ドリル＆ドリル刃セットの貸出", description: "800W高性能振動ドリルと木工・金属・コンクリート用ドリル刃セット。DIYに最適。" },
        ZH: { title: "冲击钻借用 + 钻头套装", description: "800W 强力冲击钻，配全套木材、金属和混凝土钻头，非常适合 DIY 家装。" },
      },
    },
    {
      id: 2,
      title: "Coaching Musculation à domicile sur mesure",
      description: "Séances personnalisées de renforcement musculaire et conseils en nutrition sportive à Paris et en visio.",
      author: "Nico D.",
      category: "Cours & Compétences",
      verified: true, rating: 4.8, reviews: 22,
      location: "Paris 15e (À 2.4 km)",
      coordinates: [48.8412, 2.2985],
      type: "both", nativeLang: "FR",
      languages: ["FR", "EN"],
      compensation: "15€ séance ou 1 Crédit",
      image: "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=600&q=80",
      video: "https://assets.mixkit.co/videos/preview/mixkit-man-training-in-a-gym-41372-large.mp4",
      urgent: false, caution: null,
      translations: {
        EN: { title: "Custom At-Home Fitness Coaching", description: "Personalized strength training and nutrition advice. Tailored workout plans for your goals." },
        ES: { title: "Entrenamiento Personal a Domicilio", description: "Sesiones de musculación a medida y asesoramiento nutricional personalizado." },
        IT: { title: "Personal Trainer a Domicilio su Misura", description: "Lezioni di fitness e pianificazione nutrizionale personalizzata a domicilio." },
        DE: { title: "Individuelles Fitness-Coaching zu Hause", description: "Personalisiertes Krafttraining und Ernährungsberatung für zu Hause." },
        JA: { title: "出張パーソナルボディメイク＆フィットネス", description: "一人ひとりに合わせた筋力トレーニングと栄養指導で目標達成をサポート。" },
        ZH: { title: "上门定制健身与力量辅导", description: "个性化力量训练与营养建议，针对个人目标制定高效健身计划。" },
      },
    },
    {
      id: 3,
      title: "Réparation écran iPhone & Dépannage Express",
      description: "Remplacement écran et batterie iPhone en moins de 30 minutes avec pièces de haute qualité.",
      author: "Jules T.",
      category: "Services & Dépannage",
      verified: true, rating: 4.7, reviews: 29,
      location: "Paris 10e (À 3.1 km)",
      coordinates: [48.8762, 2.3582],
      type: "onsite", nativeLang: "FR",
      languages: ["FR"],
      compensation: "30€ ou 2 Jetons",
      image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=600&q=80",
      urgent: true, caution: null,
      translations: {
        EN: { title: "iPhone Screen Repair & Express Troubleshooting", description: "Quick iPhone screen and battery replacement in under 30 minutes with certified parts." },
        ES: { title: "Reparación Exprés de Pantalla iPhone", description: "Cambio rápido de pantalla y batería de iPhone en menos de 30 minutos." },
        IT: { title: "Riparazione Schermo iPhone & Assistenza Rapida", description: "Sostituzione rapida schermo e batteria iPhone in meno di 30 minuti con parti certificate." },
        DE: { title: "iPhone Display-Reparatur & Express-Service", description: "Schneller Austausch von iPhone-Displays und Akkus in unter 30 Minuten." },
        JA: { title: "iPhone画面修理＆即日スピードサポート", description: "30分以内の迅速な液晶・バッテリー交換。認定パーツ使用。" },
        ZH: { title: "iPhone 屏幕快修与故障排除", description: "30分钟内快速更换 iPhone 屏幕与电池，使用认证零件。" },
      },
    },
    {
      id: 4,
      title: "Prêt Vélo VTC & Casque de ville",
      description: "Vélo VTC hollandais très confortable en parfait état pour balades urbaines ou trajets quotidiens.",
      author: "Camille V.",
      category: "Prêt de Matériel",
      verified: true, rating: 4.9, reviews: 18,
      location: "Paris 4e (À 4.2 km)",
      coordinates: [48.8543, 2.3578],
      type: "onsite", nativeLang: "FR",
      languages: ["FR"],
      compensation: "1 Jeton / jour",
      image: "https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=600&q=80",
      urgent: false, caution: "Caution 60€",
      translations: {
        EN: { title: "Hybrid City Bike & Helmet Rental", description: "Very comfortable Dutch city bike in excellent condition for urban commutes and rides." },
        ES: { title: "Préstamo de Bicicleta Híbrida y Casco", description: "Bicicleta holandesa muy cómoda en perfecto estado para desplazamientos urbanos." },
        IT: { title: "Noleggio Bici Ibrida da Città con Casco", description: "Bicicletta da città olandese in ottime condizioni per muoversi in città." },
        DE: { title: "City-Bike-Verleih & Helm", description: "Sehr komfortables holländisches Citybike in perfektem Zustand für Stadtfahrten." },
        JA: { title: "シティサイクル・クロスバイク＆ヘルメット貸出", description: "街乗りに快適なオランダ式クロスバイク。ヘルメット付き。" },
        ZH: { title: "城市混合动力自行车与头盔借用", description: "舒适耐用的城市混合动力自行车，适合日常通勤与城市骑行。" },
      },
    },
    {
      id: 5,
      title: "Dépannage Plomberie & Réparation rapide",
      description: "Intervention rapide pour fuite d'eau, débouchage d'évier et changement de joints.",
      author: "Karim B.",
      category: "Services & Dépannage",
      verified: true, rating: 4.8, reviews: 31,
      location: "Boulogne-Billancourt (À 8.5 km)",
      coordinates: [48.8397, 2.2399],
      type: "onsite", nativeLang: "FR",
      languages: ["FR"],
      compensation: "2 Crédits ou 25€",
      image: "https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=600&q=80",
      urgent: true, caution: null,
      translations: {
        EN: { title: "Emergency Plumbing & Quick Repair", description: "Fast response for water leaks, drain unclogging and seal replacement." },
        ES: { title: "Fontanería de Urgencia y Reparación Rápida", description: "Servicio rápido de fontanería para fugas de agua, desatascos y cambio de juntas." },
        IT: { title: "Servizio Idraulico d'Emergenza", description: "Intervento rapido per perdite d'acqua, disostruzione lavandini e sostituzione guarnizioni." },
        DE: { title: "Notfall-Sanitärdienst & Schnelle Reparatur", description: "Schnelle Hilfe bei Wasserlecks, Rohrverstopfungen und Dichtungsaustausch." },
        JA: { title: "緊急水回り修理サービス", description: "水漏れ・詰まり・パッキン交換など迅速に対応。" },
        ZH: { title: "紧急水管维修上门服务", description: "快速处理漏水、疏通下水道及更换密封圈。" },
      },
    },

    // ═══════════════════════════════════════
    // 🇯🇵 TOKYO, JAPON (nativeLang: JA)
    // ═══════════════════════════════════════
    {
      id: 6,
      title: "日本語会話 & スキル交換レッスン",
      description: "日常会話、ビジネス日本語、文化交流を楽しく学びましょう。経験豊富な講師が担当します。",
      author: "Kenji S.",
      category: "Cours & Compétences",
      verified: true, rating: 5.0, reviews: 38,
      location: "Tokyo, Shinjuku (Japon - 9700 km)",
      coordinates: [35.6762, 139.6503],
      type: "both", nativeLang: "JA",
      languages: ["JA", "EN"],
      compensation: "1h = 1 Jeton",
      image: "https://images.unsplash.com/photo-1528164344705-47542687990d?auto=format&fit=crop&w=600&q=80",
      urgent: false, caution: null,
      translations: {
        FR: { title: "Cours de Conversation Japonaise & Échange de Compétences", description: "Pratiquez le japonais naturel avec un locuteur natif de Tokyo. Tous niveaux bienvenus." },
        EN: { title: "Japanese Conversation & Skill Swap Lesson", description: "Practice natural Japanese conversation with a Tokyo native speaker. All levels welcome." },
        ES: { title: "Clases de Conversación en Japonés e Intercambio", description: "Practica japonés natural con un hablante nativo de Tokio. Todos los niveles." },
        IT: { title: "Lezioni di Conversazione Giapponese e Scambio", description: "Pratica la conversazione in giapponese con un madrelingua di Tokyo. Tutti i livelli." },
        DE: { title: "Japanisch-Konversationskurs & Fähigkeitenaustausch", description: "Üben Sie natürliches Japanisch mit einem Muttersprachler aus Tokio. Alle Niveaus." },
        ZH: { title: "日语日常会话与技能互换课程", description: "与东京母语者进行实战日语口语练习，适合各阶段学员。" },
      },
    },
    {
      id: 7,
      title: "ドローン空撮 & 4K映像編集",
      description: "東京の美しい景観やイベントの4K空撮撮影とCinematic編集を提供します。",
      author: "Ren T.",
      category: "Services & Dépannage",
      verified: true, rating: 4.95, reviews: 21,
      location: "Tokyo, Shibuya (Japon - 9705 km)",
      coordinates: [35.6580, 139.7016],
      type: "both", nativeLang: "JA",
      languages: ["JA", "EN"],
      compensation: "3 Jetons ou 50€",
      image: "https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=600&q=80",
      urgent: true, caution: null,
      translations: {
        FR: { title: "Prise de vue Drone & Montage Vidéo 4K", description: "Captation aérienne 4K professionnelle avec drone DJI Mavic et montage cinématographique à Tokyo." },
        EN: { title: "4K Drone Aerial Videography & Editing", description: "Professional 4K aerial footage of Tokyo with DJI Mavic drone and cinematic video editing." },
        ES: { title: "Grabación Aérea con Dron 4K y Edición", description: "Filmación aérea profesional en 4K con dron DJI Mavic y montaje cinematográfico en Tokio." },
        IT: { title: "Riprese Aeree con Drone 4K & Montaggio", description: "Video aerei professionali in 4K a Tokyo con drone DJI Mavic e montaggio cinematografico." },
        DE: { title: "4K-Drohnenaufnahmen & Videoschnitt Tokio", description: "Professionelle 4K-Luftaufnahmen in Tokio mit DJI Mavic Drohne und kinematographischer Schnitt." },
        ZH: { title: "无人机航拍与 4K 影视剪辑（东京）", description: "使用 DJI Mavic 专业无人机进行东京 4K 航拍，提供电影质感后期剪辑。" },
      },
    },

    // ═══════════════════════════════════════
    // 🇺🇸 NEW YORK, USA (nativeLang: EN)
    // ═══════════════════════════════════════
    {
      id: 8,
      title: "Professional Portrait Photography Session",
      description: "High-end portrait photo session in Manhattan or remote Lightroom color grading masterclass.",
      author: "Aria T.",
      category: "Services & Dépannage",
      verified: true, rating: 4.9, reviews: 24,
      location: "New York, SoHo (USA - 5830 km)",
      coordinates: [40.7128, -74.0060],
      type: "both", nativeLang: "EN",
      languages: ["EN", "ES"],
      compensation: "3 Jetons ou 40$",
      image: "https://images.unsplash.com/photo-1554048612-b6a482bc67e5?auto=format&fit=crop&w=600&q=80",
      urgent: false, caution: null,
      translations: {
        FR: { title: "Session Photo Portrait Professionnel NYC", description: "Séance photo portrait HD à New York ou coaching Lightroom en visio." },
        ES: { title: "Sesión de Fotografía de Retrato Profesional", description: "Sesión de fotos de retrato en Nueva York o asesoría de edición Lightroom online." },
        IT: { title: "Sessione Fotografica di Ritratto Professionale", description: "Servizio fotografico professionale a New York o consulenza Lightroom online." },
        DE: { title: "Professionelles Porträt-Fotoshooting NYC", description: "HD-Porträt-Shooting in New York oder Lightroom-Bildbearbeitungscoaching online." },
        JA: { title: "プロポートレート撮影＆Lightroom指導（NY）", description: "ニューヨークでの高解像度ポートレート撮影または遠隔Lightroomレタッチ指導。" },
        ZH: { title: "纽约专业人像摄影与 Lightroom 后期", description: "纽约曼哈顿高端人像摄影，支持远程 Lightroom 调色教程。" },
      },
    },
    {
      id: 9,
      title: "Manhattan Loft Short Stay Swap",
      description: "Bright designer loft in SoHo New York available for residential stay swap with Europe.",
      author: "Ethan R.",
      category: "Logement & Stay Swap",
      verified: true, rating: 4.95, reviews: 17,
      location: "New York, SoHo (USA - 5832 km)",
      coordinates: [40.7241, -74.0001],
      type: "onsite", nativeLang: "EN",
      languages: ["EN", "FR"],
      compensation: "Stay Swap / Troc logement",
      image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=600&q=80",
      urgent: false, caution: "Caution 200$",
      translations: {
        FR: { title: "Échange Loft Design Manhattan (SoHo)", description: "Superbe loft baigné de lumière au cœur de SoHo New York disponible pour échange logement." },
        ES: { title: "Intercambio de Loft de Diseño en Manhattan", description: "Espectacular loft luminoso en SoHo Nueva York disponible para intercambio residencial." },
        IT: { title: "Scambio Loft di Design a Manhattan", description: "Splendido loft luminoso nel cuore di SoHo a New York disponibile per scambio casa." },
        DE: { title: "Manhattan Designer Loft Wohnungstausch", description: "Lichtdurchflutetes Designer-Loft in SoHo New York zum Wohnungstausch." },
        JA: { title: "マンハッタンSoHoデザイナーズロフト滞在交換", description: "ニューヨークSoHoの中心にある明るいロフトアパートメントの滞在交換。" },
        ZH: { title: "曼哈顿 SoHo 设计师 Loft 短期互换", description: "位于纽约 SoHo 核心区的采光极佳设计感 Loft，开放房屋互换体验。" },
      },
    },

    // ═══════════════════════════════════════
    // 🇩🇪 BERLIN, ALLEMAGNE (nativeLang: DE)
    // ═══════════════════════════════════════
    {
      id: 10,
      title: "UI/UX Design Workshop & Figma Advanced",
      description: "Lernen Sie professionelles Design System, Auto Layout und interaktive Prototypen in Figma.",
      author: "Lukas K.",
      category: "Cours & Compétences",
      verified: true, rating: 4.95, reviews: 42,
      location: "Berlin, Mitte (Allemagne - 878 km)",
      coordinates: [52.5200, 13.4050],
      type: "remote", nativeLang: "DE",
      languages: ["DE", "EN"],
      compensation: "2h = 2 Jetons",
      image: "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&w=600&q=80",
      urgent: false, caution: null,
      translations: {
        FR: { title: "Atelier Design UI/UX & Figma Avancé", description: "Maîtrisez les Design Systems, Auto Layout et Prototypage interactif sous Figma." },
        EN: { title: "UI/UX Design Workshop & Advanced Figma", description: "Master Design Systems, Auto Layout and interactive prototyping in Figma." },
        ES: { title: "Taller de Diseño UI/UX y Figma Avanzado", description: "Domina Design Systems, Auto Layout y Prototipado interactivo en Figma." },
        IT: { title: "Workshop UI/UX e Figma Avanzato", description: "Impara i Design System, l'Auto Layout e la prototipazione avanzata in Figma." },
        JA: { title: "UI/UXデザインワークショップ＆Figma応用", description: "FigmaのデザインシステムとAuto Layoutをマスターしよう。" },
        ZH: { title: "UI/UX 设计研讨会与 Figma 进阶", description: "深入掌握 Figma 设计系统、Auto Layout 与高级原型制作技巧。" },
      },
    },
    {
      id: 11,
      title: "Techno Music Production & Ableton Live Coaching",
      description: "Produzieren Sie Ihre eigenen Techno-Tracks mit Ableton Live. Sounddesign, Abmischung und Mastering.",
      author: "Max V.",
      category: "Cours & Compétences",
      verified: true, rating: 4.9, reviews: 35,
      location: "Berlin, Friedrichshain (Allemagne - 882 km)",
      coordinates: [52.5159, 13.4540],
      type: "both", nativeLang: "DE",
      languages: ["DE", "EN"],
      compensation: "1h = 1 Jeton",
      image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80",
      urgent: true, caution: null,
      translations: {
        FR: { title: "Production Musique Techno & Coaching Ableton Live", description: "Créez vos propres morceaux Techno/House sur Ableton Live : Sound design, mixage, mastering." },
        EN: { title: "Techno Music Production & Ableton Live Coaching", description: "Build your own Techno & House tracks in Ableton Live. Sound design, mixing, mastering." },
        ES: { title: "Producción Musical Techno y Coaching Ableton Live", description: "Crea tus propios temas Techno/House en Ableton Live con diseño de sonido y mezcla." },
        IT: { title: "Produzione Musica Techno e Coaching Ableton Live", description: "Crea i tuoi brani Techno e House su Ableton Live (Sound design, mixaggio, mastering)." },
        JA: { title: "テクノ制作＆Ableton Liveサウンドデザイン指導", description: "Ableton Liveを使ったテクノ／ハウス楽曲制作。ミキシングまで徹底指導。" },
        ZH: { title: "Techno 电子乐制作与 Ableton Live 指导", description: "学习用 Ableton Live 创作 Techno/House 音乐，含合成音色设计与混音。" },
      },
    },

    // ═══════════════════════════════════════
    // 🇪🇸 BARCELONE & MADRID, ESPAGNE (nativeLang: ES)
    // ═══════════════════════════════════════
    {
      id: 12,
      title: "Clases de Guitarra Flamenca y Ritmo",
      description: "Aprende los rasgueados, falsetas y compás del flamenco tradicional español a tu ritmo.",
      author: "Carlos N.",
      category: "Cours & Compétences",
      verified: true, rating: 5.0, reviews: 19,
      location: "Barcelone (Espagne - 830 km)",
      coordinates: [41.3851, 2.1734],
      type: "both", nativeLang: "ES",
      languages: ["ES", "EN"],
      compensation: "1h = 1 Jeton",
      image: "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?auto=format&fit=crop&w=600&q=80",
      urgent: false, caution: null,
      translations: {
        FR: { title: "Cours de Guitare Flamenco & Rythme", description: "Apprenez les rasgueados, falsetas et compás du flamenco traditionnel espagnol à votre rythme." },
        EN: { title: "Flamenco Guitar & Rhythm Coaching", description: "Master traditional Spanish flamenco rasgueados, falsetas and compás rhythm." },
        IT: { title: "Lezioni di Chitarra Flamenco e Ritmo", description: "Impara i rasgueados, le falsetas e il compás del flamenco tradizionale spagnolo." },
        DE: { title: "Flamenco-Gitarrenunterricht & Rhythmus-Coaching", description: "Lernen Sie traditionelle spanische Rasgueados, Falsetas und Flamenco-Rhythmen." },
        JA: { title: "フラメンコギター＆リズムコーチング", description: "本場スペインのラスゲアードやファルセータを丁寧に指導。" },
        ZH: { title: "西班牙弗拉明戈吉他与节奏辅导", description: "系统学习地道弗拉明戈扫弦、指弹与节奏律动技巧。" },
      },
    },
    {
      id: 13,
      title: "Alquiler Cámara 4K y Kit de Iluminación",
      description: "Kit completo de grabación 4K con iluminación LED de estudio y micrófonos inalámbricos.",
      author: "Elena V.",
      category: "Prêt de Matériel",
      verified: true, rating: 4.9, reviews: 12,
      location: "Madrid (Espagne - 1050 km)",
      coordinates: [40.4168, -3.7038],
      type: "onsite", nativeLang: "ES",
      languages: ["ES", "EN"],
      compensation: "Troc matériel ou 15€/jour",
      image: "https://images.unsplash.com/photo-1512790182412-b19e6d62bc39?auto=format&fit=crop&w=600&q=80",
      urgent: false, caution: "Caution 100€",
      translations: {
        FR: { title: "Location Caméra 4K & Kit d'Éclairage Studio", description: "Kit complet de tournage 4K avec éclairage LED de studio et microphones sans fil." },
        EN: { title: "4K Camera & Studio Lighting Kit Rental", description: "Complete 4K filming kit with studio LED lighting and wireless microphones." },
        IT: { title: "Noleggio Fotocamera 4K e Kit Luci Studio", description: "Kit completo per riprese 4K con illuminazione LED da studio e microfoni wireless." },
        DE: { title: "4K-Kamera-Verleih & Studio-Licht-Set", description: "Komplettes 4K-Filmset mit Studio-LED-Beleuchtung und kabellosen Mikrofonen." },
        JA: { title: "4Kカメラ＆スタジオ照明キット貸出（マドリード）", description: "4K撮影フルキット：LEDスタジオ照明＋ワイヤレスマイク付き。" },
        ZH: { title: "4K 摄像机与演播室灯光套装租借", description: "完整 4K 拍摄套件，含 LED 演播室灯光及无线麦克风。" },
      },
    },

    // ═══════════════════════════════════════
    // 🇮🇹 FLORENCE & ROME, ITALIE (nativeLang: IT)
    // ═══════════════════════════════════════
    {
      id: 14,
      title: "Scambio Appartamento centro Firenze ↔ Parigi",
      description: "Splendido appartamento storico con vista sul Duomo nel cuore di Firenze, disponibile per scambio casa.",
      author: "Matteo R.",
      category: "Logement & Stay Swap",
      verified: true, rating: 4.9, reviews: 8,
      location: "Florence (Italie - 880 km)",
      coordinates: [43.7696, 11.2558],
      type: "onsite", nativeLang: "IT",
      languages: ["IT", "EN", "FR"],
      compensation: "Échange direct / Swap",
      image: "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=600&q=80",
      urgent: false, caution: "Caution 150€",
      translations: {
        FR: { title: "Échange Appartement Historique — Florence ↔ Paris", description: "Splendide appartement historique avec vue sur le Dôme au cœur de Florence, prêt pour un échange logement." },
        EN: { title: "Historic Florence Apartment Swap ↔ Paris", description: "Beautiful historic apartment overlooking the Duomo in central Florence, available for home swap." },
        ES: { title: "Intercambio de Apartamento Histórico Florencia ↔ París", description: "Espléndido apartamento histórico con vistas al Duomo en el centro de Florencia para intercambio." },
        DE: { title: "Historische Wohnung Florenz ↔ Paris Wohnungstausch", description: "Wunderschöne historische Wohnung mit Dom-Blick im Zentrum von Florenz zum Wohnungstausch." },
        JA: { title: "フィレンツェ歴史的アパート交換（↔パリ）", description: "フィレンツェ中心部のドゥオーモを望む歴史的アパートの滞在交換。" },
        ZH: { title: "佛罗伦萨历史公寓互换（↔巴黎）", description: "位于佛罗伦萨核心区、可俯瞰大教堂的历史公寓，开放房屋互换。" },
      },
    },
    {
      id: 17,
      title: "Lezioni di Cucina Romana Tradizionale",
      description: "Scopri i segreti della cucina romana autentica: cacio e pepe, carbonara, supplì e molto altro.",
      author: "Giulia M.",
      category: "Cours & Compétences",
      verified: true, rating: 5.0, reviews: 44,
      location: "Rome (Italie - 1105 km)",
      coordinates: [41.9028, 12.4964],
      type: "both", nativeLang: "IT",
      languages: ["IT", "EN", "FR"],
      compensation: "1 séance = 1 Jeton",
      image: "https://images.unsplash.com/photo-1528137871618-79d2761e3fd5?auto=format&fit=crop&w=600&q=80",
      urgent: false, caution: null,
      translations: {
        FR: { title: "Cours de Cuisine Romaine Traditionnelle", description: "Découvrez les secrets de la vraie cuisine romaine : cacio e pepe, carbonara, supplì et bien plus." },
        EN: { title: "Traditional Roman Cooking Lessons", description: "Discover the secrets of authentic Roman cuisine: cacio e pepe, carbonara, supplì and much more." },
        ES: { title: "Clases de Cocina Romana Tradicional", description: "Descubre los secretos de la auténtica cocina romana: cacio e pepe, carbonara, supplì y más." },
        DE: { title: "Traditionelle Römische Kochstunden", description: "Entdecken Sie die Geheimnisse der echten römischen Küche: Cacio e pepe, Carbonara, Supplì." },
        JA: { title: "ローマ伝統料理レッスン", description: "本場ローマ料理の秘密を学ぶ：カチョエペペ、カルボナーラ、スップリなど。" },
        ZH: { title: "罗马传统料理课程", description: "探索地道罗马菜肴秘方：卡乔内佩珀、意式培根蛋黄面、炸饭团等。" },
      },
    },

    // ═══════════════════════════════════════
    // 🇨🇳 PÉKIN & SHANGHAI, CHINE (nativeLang: ZH)
    // ═══════════════════════════════════════
    {
      id: 15,
      title: "中文与书法艺术线上交流",
      description: "地道中文普通话交流与传统软笔书法体验，含视频课件与汉字艺术辅导。",
      author: "Wei L.",
      category: "Cours & Compétences",
      verified: true, rating: 5.0, reviews: 26,
      location: "Pékin (Chine - 8200 km)",
      coordinates: [39.9042, 116.4074],
      type: "remote", nativeLang: "ZH",
      translations: {
        FR: { title: "Cours de Mandarin & Art de la Calligraphie Chinoise", description: "Échanges conversationnels en mandarin authentique et initiation à la calligraphie traditionnelle au pinceau." },
        EN: { title: "Mandarin Conversation & Chinese Calligraphy Art", description: "Authentic Mandarin conversation exchange and traditional Chinese brush calligraphy coaching." },
        ES: { title: "Conversación en Mandarín y Arte de la Caligrafía China", description: "Intercambio de conversación auténtico en mandarín y tutoría de caligrafía china tradicional." },
        IT: { title: "Conversazione Mandarino & Arte della Calligrafia Cinese", description: "Scambio di conversazione autentica in mandarino e lezioni di calligrafia cinese tradizionale." },
        DE: { title: "Mandarin-Konversation & Chinesische Kalligraphie-Kunst", description: "Authentischer Mandarin-Gesprächsaustausch und traditionelles chinesisches Pinsel-Kalligraphie-Coaching." },
        JA: { title: "中国語会話＆伝統書道アートオンライン交流", description: "本物の普通話会話交流と伝統的な毛筆書道体験。動画教材付き。" },
        ZH: { title: "中文与书法艺术线上交流", description: "地道中文普通话交流与传统软笔书法体验，含视频课件与汉字艺术辅导。" },
      },
    },
    {
      id: 18,
      title: "上海国际商务中文培训",
      description: "针对外籍商务人士的专业普通话培训，涵盖商务谈判、邮件写作及跨文化沟通。",
      author: "Lin X.",
      category: "Cours & Compétences",
      verified: true, rating: 4.85, reviews: 31,
      location: "Shanghai (Chine - 9100 km)",
      coordinates: [31.2304, 121.4737],
      type: "remote", nativeLang: "ZH",
      languages: ["ZH", "EN"],
      compensation: "2h = 2 Jetons",
      image: "https://images.unsplash.com/photo-1486325212027-8081e485255e?auto=format&fit=crop&w=600&q=80",
      urgent: false, caution: null,
      translations: {
        FR: { title: "Formation Mandarin Business International (Shanghai)", description: "Formation professionnelle en mandarin pour expatriés : négociation, rédaction d'e-mails, communication interculturelle." },
        EN: { title: "Shanghai International Business Mandarin Training", description: "Professional Mandarin training for expats: business negotiation, email writing and cross-cultural communication." },
        ES: { title: "Formación en Chino Mandarín Empresarial Internacional", description: "Formación profesional en mandarín para expatriados: negociación, redacción de emails y comunicación intercultural." },
        IT: { title: "Formazione Mandarino Business Internazionale Shanghai", description: "Formazione professionale in mandarino per expat: negoziazione, scrittura email e comunicazione interculturale." },
        DE: { title: "Shanghai Internationales Business-Mandarin Training", description: "Professionelles Mandarin-Training für Expats: Verhandlung, E-Mail-Schreiben und interkulturelle Kommunikation." },
        JA: { title: "上海国際ビジネス中国語トレーニング", description: "海外赴任者向けビジネス中国語：商談・メール・異文化コミュニケーション対応。" },
      },
    },

    // ═══════════════════════════════════════
    // 🇧🇷 SÃO PAULO, BRÉSIL (nativeLang: PT)
    // ═══════════════════════════════════════
    {
      id: 19,
      title: "Aulas de Capoeira & Cultura Afro-Brasileira",
      description: "Aprenda capoeira Angola e Regional com mestre experiente, incluindo música (berimbau, atabaque) e história.",
      author: "Mestre Bimba Jr.",
      category: "Cours & Compétences",
      verified: true, rating: 5.0, reviews: 52,
      location: "São Paulo (Brésil - 9380 km)",
      coordinates: [-23.5505, -46.6333],
      type: "both", nativeLang: "PT",
      languages: ["PT", "EN", "ES"],
      compensation: "1h = 1 Jeton",
      image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=600&q=80",
      urgent: false, caution: null,
      translations: {
        FR: { title: "Cours de Capoeira & Culture Afro-Brésilienne", description: "Apprenez la capoeira Angola et Régionale avec un maître expérimenté, incluant musique (berimbau) et histoire." },
        EN: { title: "Capoeira Lessons & Afro-Brazilian Culture", description: "Learn Capoeira Angola and Regional with an experienced master, including music (berimbau, atabaque) and history." },
        ES: { title: "Clases de Capoeira & Cultura Afrobrasileña", description: "Aprende Capoeira Angola y Regional con un maestro experimentado, incluyendo música y cultura." },
        IT: { title: "Lezioni di Capoeira & Cultura Afro-Brasiliana", description: "Impara la Capoeira Angola e Regionale con un maestro esperto, musica (berimbau) e storia inclusi." },
        DE: { title: "Capoeira-Unterricht & Afro-Brasilianische Kultur", description: "Lernen Sie Capoeira Angola und Regional mit einem erfahrenen Meister, inklusive Musik und Geschichte." },
        JA: { title: "カポエイラ教室＆アフロ・ブラジル文化体験", description: "経験豊富なメストレによるカポエイラ・アンゴラと南部地域スタイルのレッスン。音楽・歴史も含む。" },
        ZH: { title: "卡波耶拉（Capoeira）课程与非裔巴西文化体验", description: "跟随经验丰富的大师学习卡波耶拉格斗舞蹈，包含乐器（贝林包）与历史文化。" },
      },
    },

    // ═══════════════════════════════════════
    // 🇬🇧 LONDRES, ROYAUME-UNI (nativeLang: EN)
    // ═══════════════════════════════════════
    {
      id: 20,
      title: "London Rooftop Yoga & Mindfulness Sessions",
      description: "Weekly rooftop yoga sessions with breathtaking views of the London skyline. All levels welcome.",
      author: "Sophie H.",
      category: "Cours & Compétences",
      verified: true, rating: 4.95, reviews: 67,
      location: "Londres (UK - 340 km)",
      coordinates: [51.5074, -0.1278],
      type: "both", nativeLang: "EN",
      languages: ["EN", "FR"],
      compensation: "1 session = 1 Jeton",
      image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=600&q=80",
      urgent: false, caution: null,
      translations: {
        FR: { title: "Yoga Rooftop & Pleine Conscience à Londres", description: "Séances hebdomadaires de yoga sur les toits de Londres avec vue imprenable sur la skyline. Tous niveaux." },
        ES: { title: "Yoga en Azotea & Mindfulness en Londres", description: "Sesiones semanales de yoga en las azoteas de Londres con vistas impresionantes. Todos los niveles." },
        IT: { title: "Yoga sul Rooftop & Mindfulness a Londra", description: "Sessioni settimanali di yoga sui tetti di Londra con vista mozzafiato sullo skyline." },
        DE: { title: "London Rooftop Yoga & Achtsamkeitstraining", description: "Wöchentliche Yoga-Sessions auf Londoner Dachterrassen mit atemberaubender Skyline-Aussicht." },
        JA: { title: "ロンドン屋上ヨガ＆マインドフルネス体験", description: "ロンドンのスカイラインを望む屋上で行う週次ヨガセッション。全レベル歓迎。" },
        ZH: { title: "伦敦屋顶瑜伽与正念冥想课程", description: "每周在伦敦屋顶举行的瑜伽冥想课，俯瞰绝美城市天际线，全水平学员均可报名。" },
      },
    },

    // ═══════════════════════════════════════
    // 🇰🇷 SÉOUL, CORÉE DU SUD (nativeLang: KO)
    // ═══════════════════════════════════════
    {
      id: 21,
      title: "K-Pop 댄스 레슨 & 한국어 회화 교환",
      description: "K-Pop 안무, 한국어 기초 회화 및 한국 문화 교류 레슨. 초급부터 중급까지 환영합니다.",
      author: "Ji-Yeon P.",
      category: "Cours & Compétences",
      verified: true, rating: 4.9, reviews: 41,
      location: "Séoul (Corée du Sud - 8900 km)",
      coordinates: [37.5665, 126.9780],
      type: "both", nativeLang: "KO",
      languages: ["KO", "EN"],
      compensation: "1h = 1 Jeton",
      image: "https://images.unsplash.com/photo-1508700929628-666bc8bd84ea?auto=format&fit=crop&w=600&q=80",
      urgent: false, caution: null,
      translations: {
        FR: { title: "Cours de Danse K-Pop & Échange de Coréen", description: "Apprenez les chorégraphies K-Pop, le coréen conversationnel et la culture coréenne. Débutants bienvenus." },
        EN: { title: "K-Pop Dance Lessons & Korean Conversation Swap", description: "Learn K-Pop choreography, conversational Korean and Korean culture. Beginners to intermediate welcome." },
        ES: { title: "Clases de Baile K-Pop & Intercambio de Coreano", description: "Aprende coreografías K-Pop, coreano conversacional y cultura coreana. Principiantes bienvenidos." },
        IT: { title: "Lezioni di Danza K-Pop & Scambio di Coreano", description: "Impara le coreografie K-Pop, il coreano colloquiale e la cultura coreana. Tutti i livelli." },
        DE: { title: "K-Pop Tanzunterricht & Koreanisch Konversationsaustausch", description: "Lernen Sie K-Pop Choreografien, Koreanisch und koreanische Kultur. Anfänger willkommen." },
        JA: { title: "K-POPダンスレッスン＆韓国語会話交換", description: "K-POPの振り付け・韓国語・韓国文化を楽しく学ぶ。初中級者歓迎。" },
        ZH: { title: "K-Pop 舞蹈课程与韩语会话交换", description: "学习 K-Pop 编舞、韩语日常对话与韩国文化，初级到中级均可报名。" },
      },
    },

    // ═══════════════════════════════════════
    // 🇦🇺 SYDNEY, AUSTRALIE (nativeLang: EN)
    // ═══════════════════════════════════════
    {
      id: 16,
      title: "Surfing Lessons & Board Rental",
      description: "Guided surf lessons at Bondi Beach Sydney with surfboard and wetsuit included.",
      author: "Oliver W.",
      category: "Cours & Compétences",
      verified: true, rating: 4.95, reviews: 33,
      location: "Sydney, Bondi (Australie - 16900 km)",
      coordinates: [-33.8688, 151.2093],
      type: "onsite", nativeLang: "EN",
      languages: ["EN"],
      compensation: "2 Jetons ou 35$",
      image: "https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&w=600&q=80",
      urgent: false, caution: null,
      translations: {
        FR: { title: "Cours de Surf & Location de Board (Bondi Beach)", description: "Cours de surf encadrés sur la célèbre plage de Bondi à Sydney, planche et combinaison incluses." },
        ES: { title: "Clases de Surf & Alquiler de Tabla (Bondi Beach)", description: "Clases de surf guiadas en la famosa playa de Bondi en Sídney, tabla y traje incluidos." },
        IT: { title: "Lezioni di Surf & Noleggio Tavola (Bondi Beach)", description: "Lezioni di surf guidate sulla famosa spiaggia di Bondi a Sydney, tavola e muta incluse." },
        DE: { title: "Surfunterricht & Boardverleih (Bondi Beach)", description: "Geführte Surfstunden am berühmten Bondi Beach in Sydney, Board und Neoprenanzug inklusive." },
        JA: { title: "ボンダイビーチサーフレッスン＆ボードレンタル", description: "シドニーの名所ボンダイビーチでのガイド付きサーフレッスン。ボードとウェットスーツ込み。" },
        ZH: { title: "邦迪海滩冲浪课程与冲浪板租借", description: "在悉尼著名的邦迪海滩参加专业冲浪课，冲浪板和潜水服均已包含。" },
      },
    },
  ];

  // Conversations de démo enrichies (intelligentes & réalistes)
  const mockChats = [
    {
      id: 201,
      isDemo: true,
      user: "Emma Roche",
      listing: "Initiation au Design UI/UX (Figma)",
      lastMessage: "Je te propose 20€ + 1 Jeton pour 2h de cours ce samedi !",
      status: "Proposition reçue",
      terms: "2h de cours • 20€ + 1 Jeton",
      persona: {
        role: 'Designer Junior',
        skills: ['Figma', 'UI/UX', 'Mobile'],
        style: 'enthousiaste',
        availability: 'samedi',
        negotiation: 'souhaite une formation express contre paiement hybride',
      },
    },
    {
      id: 202,
      isDemo: true,
      user: "Thomas V.",
      listing: "Studio Photo Pro Paris",
      lastMessage: "Disponible ce vendredi pour un shooting contre 3 jetons ?",
      status: "Proposition reçue",
      terms: "3h Studio Photo • 3 Jetons",
      persona: {
        role: 'Photographe Mode',
        skills: ['shooting', 'studio', 'éclairage'],
        style: 'professionnel',
        availability: 'vendredi après-midi',
        negotiation: 'propose un échange de 3 jetons pour 3h de réservation',
      },
    },
    {
      id: 101,
      isDemo: true,
      user: "Sofia M.",
      listing: "Cours de Piano",
      lastMessage: "D'accord pour 1 crédit l'heure ! Tu es libre samedi ?",
      status: "Négociation en cours",
      terms: "2 cours 45 min • 2 Jetons",
      persona: {
        role: 'Professeure de piano',
        skills: ['débutant', 'avancé', 'visio'],
        style: 'chaleureuse et structurée',
        availability: 'soirées et week-ends',
        negotiation: 'propose une heure d’essai contre 1 crédit',
      },
    },
    {
      id: 102,
      isDemo: true,
      user: "Marc L.",
      listing: "Prêt Perceuse Bosch",
      lastMessage: "Perceuse et coffret forets béton prêts. Prêt gratuit avec caution 30€.",
      status: "Deal Validé",
      terms: "Troc direct + Caution 30€",
      persona: {
        role: 'Bricoleur local',
        skills: ['perceuse', 'forets', 'caution virtuelle'],
        style: 'direct et fiable',
        availability: 'week-end',
        negotiation: 'parle de la caution virtuelle et du prêt des forets',
      },
    },
    {
      id: 103,
      isDemo: true,
      user: "Karim B.",
      listing: "Réparation iPhone 13",
      lastMessage: "D'accord pour 25€ avec changement d'écran d'origine.",
      status: "Négociation en cours",
      terms: "Réparation Écran • 25€",
      persona: {
        role: 'Technicien dépannage',
        skills: ['iPhone', 'batterie', 'écran', 'local'],
        style: 'pragmatique et rassurant',
        availability: 'matin et fin de journée',
        negotiation: 'propose un tarif préférentiel à 25€ sur place',
      },
    },
    {
      id: 104,
      isDemo: true,
      user: "Camille & Lucas",
      listing: "Stay Swap Marseille Vieux-Port",
      lastMessage: "Super ! Échange d'appartement confirmé pour le week-end du 20 mai !",
      status: "Deal Validé",
      terms: "Échange de logement • 0€",
      persona: {
        role: 'Voyageurs Troco',
        skills: ['Stay Swap', 'Marseille', 'Paris'],
        style: 'accueillants',
        availability: 'week-ends prolongés',
        negotiation: 'échange réciproque de studio sans frais',
      },
    }
  ];

  const [chatThreads, setChatThreads] = useState({
    201: [
      { id: 1, sender: 'them', text: 'Bonjour Mateo ! J’ai vu ton annonce d’initiation UI/UX sur Figma, elle m’intéresse énormément pour mon projet d’application mobile !' },
      { id: 2, sender: 'me', text: 'Salut Emma ! Avec grand plaisir, on peut voir les bases des composants, autolayout et prototypes interactifs.' },
      { id: 3, sender: 'them', text: 'Super ! Est-ce que tu serais disponible pour 2h de formation ce samedi en visio ?' },
      { id: 4, sender: 'them', kind: 'deal', dealId: 'deal-201-1', status: 'pending', terms: { euroAmount: 20, trocoTokens: 1, conditions: 'Session de 2h Initiation Figma (UI/UX) ce samedi à 14h. Contre 20€ + 1 Jeton Troco.' } },
    ],
    202: [
      { id: 1, sender: 'them', text: 'Hello Mateo ! Je cherche un studio photo bien équipé à Paris pour un shoot produit. Ton annonce est toujours disponible ?' },
      { id: 2, sender: 'me', text: 'Oui Thomas ! Il y a tout le matos : flashs Bowens, softbox, déclencheurs et fonds papier.' },
      { id: 3, sender: 'them', text: 'Parfait ! Je peux te proposer un échange contre 3 jetons Troco pour 3h de réservation ce vendredi.' },
      { id: 4, sender: 'them', kind: 'deal', dealId: 'deal-202-1', status: 'pending', terms: { euroAmount: 0, trocoTokens: 3, conditions: 'Réservation Studio Photo Pro (3h) ce vendredi 14h-17h avec matériel inclus. Contre 3 Jetons Troco.' } },
    ],
    101: [
      { id: 1, sender: 'them', text: 'Bonjour ! Je propose des cours de piano flexibles pour tous niveaux avec accompagnement sur mesure.' },
      { id: 2, sender: 'me', text: 'Parfait, je cherche à retravailler mes enchaînements d’accords en visio.' },
      { id: 3, sender: 'them', kind: 'deal', dealId: 'deal-101-1', status: 'pending', terms: { euroAmount: 0, trocoTokens: 2, conditions: '2 séances de piano de 45 min en visio avec partitions fournies. Échange contre 2 Jetons Troco.' } },
    ],
    102: [
      { id: 1, sender: 'them', text: 'Bonjour ! Tu as besoin d’une perceuse avec forets béton ou bois ?' },
      { id: 2, sender: 'me', text: 'Plutôt béton pour poser des étagères murales.' },
      { id: 3, sender: 'them', text: 'Parfait, je te prépare le coffret complet avec la poignée de sécurité.' },
      { id: 4, sender: 'them', kind: 'deal', dealId: 'deal-102-1', status: 'confirmed', terms: { euroAmount: 0, trocoTokens: 0, conditions: 'Prêt gratuit 48h de la perceuse Bosch + coffret forets. Caution virtuelle de 30€ activée pendant la durée du prêt.' } },
    ],
    103: [
      { id: 1, sender: 'them', text: 'Salut ! Je peux réparer ton écran d’iPhone 13 dans la journée si tu veux.' },
      { id: 2, sender: 'me', text: 'Top ! C’est un écran d’origine garanti ?' },
      { id: 3, sender: 'them', kind: 'deal', dealId: 'deal-103-1', status: 'pending', terms: { euroAmount: 25, trocoTokens: 0, conditions: 'Remplacement écran d’origine iPhone 13 + test d’étanchéité Paris 11ème. Échange contre 25€.' } },
    ],
    104: [
      { id: 1, sender: 'them', text: 'Bonjour ! On adorerait échanger notre studio au Vieux-Port de Marseille contre ton appartement à Paris le temps d’un long week-end !' },
      { id: 2, sender: 'me', text: 'Excellente idée ! Les dates du 20 mai fonctionnent très bien.' },
      { id: 3, sender: 'them', kind: 'deal', dealId: 'deal-104-1', status: 'confirmed', terms: { euroAmount: 0, trocoTokens: 0, conditions: 'Échange réciproque 3 nuitées (Studio Marseille Vieux-Port vs Studio Paris Marais). Sans aucun frais.' } },
    ],
  });

  // État des discussions (fusionne mockChats et Firestore chats filtrés par utilisateur)
  const [chatsList, setChatsList] = useState(mockChats);

  // Synchronisation temps réel des discussions depuis Firestore (CONFIDENTIALITÉ STRICTE : filtrage par participant)
  useEffect(() => {
    if (!profile?.name) return;
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', profile.name)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      // Détection des nouveaux messages entrants en temps réel pour incrémenter le badge (+1)
      snapshot.docChanges().forEach(change => {
        if (change.type === 'modified' || change.type === 'added') {
          const d = change.doc.data();
          const fChatId = d.id || change.doc.id;
          const isFromThem = d.lastSenderName && d.lastSenderName.trim().toLowerCase() !== profile.name.trim().toLowerCase();

          // Seulement si c'est un nouveau message entrant et qu'on n'a pas cette conversation activement ouverte
          if (isFromThem && change.type === 'modified') {
            setReadChats(prev => {
              const next = new Set(prev);
              next.delete(fChatId);
              next.delete(String(fChatId));
              next.delete(Number(fChatId));
              return next;
            });
          }
        }
      });

      const firestoreChats = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        // Identifier le nom de l'interlocuteur (l'autre participant)
        const otherUser = Array.isArray(data.participants)
          ? data.participants.find(p => p && p.trim().toLowerCase() !== profile.name.trim().toLowerCase()) || data.user || 'Interlocuteur'
          : data.user || 'Interlocuteur';

        const fChatId = data.id || docSnap.id;

        return {
          id: fChatId,
          firestoreId: docSnap.id,
          ...data,
          user: otherUser,
        };
      });
      const merged = [...mockChats];
      firestoreChats.forEach(fChat => {
        const idx = merged.findIndex(m => String(m.id) === String(fChat.id));
        if (idx >= 0) {
          merged[idx] = { ...merged[idx], ...fChat };
        } else {
          merged.unshift(fChat);
        }
      });
      setChatsList(merged);
    }, (err) => {
      console.warn('[Firestore] chats onSnapshot error:', err);
    });
    return () => unsub();
  }, [profile?.name]);

  const handleSelectChat = async (chat) => {
    setSelectedChat(chat);
    if (chat?.id) {
      const cidStr = String(chat.id);
      setReadChats(prev => new Set([...prev, chat.id, cidStr, Number(chat.id)]));

      // Mettre à jour Firestore pour marquer le chat et ses messages comme lus
      try {
        setDoc(doc(db, 'chats', cidStr), {
          unreadCount: 0,
          updatedAt: serverTimestamp(),
        }, { merge: true }).catch(() => { });

        const msgsSnap = await getDocs(collection(db, 'chats', cidStr, 'messages'));
        msgsSnap.forEach((dSnap) => {
          const d = dSnap.data();
          if (d.read !== true && (d.sender === 'them' || (d.senderName && d.senderName !== profile?.name))) {
            updateDoc(doc(db, 'chats', cidStr, 'messages', dSnap.id), {
              read: true,
              status: 'read'
            }).catch(() => { });
          }
        });
      } catch (_) { }
    }
  };

  // ---- COMPTEUR NON-LUS GLOBAL (Total exact et persistant des messages non lus) ----
  const unreadCount = useMemo(() => {
    const allChats = chatsList && chatsList.length > 0 ? chatsList : mockChats;
    return allChats.reduce((total, chat) => {
      const cidStr = String(chat.id);
      const isCurrentlyViewing = selectedChat && String(selectedChat.id) === cidStr && activeTab === 'chat';
      if (isCurrentlyViewing) return total;

      const isMarkedRead = readChats.has(chat.id) || readChats.has(cidStr) || readChats.has(Number(chat.id));
      if (isMarkedRead) return total;

      const thread = chatThreads[chat.id] || chatThreads[cidStr];
      if (thread && thread.length > 0) {
        const unreadInThread = thread.filter(m => 
          !m.read && 
          m.status !== 'read' && 
          (m.sender === 'them' || m.kind === 'deal' || (m.senderName && m.senderName !== profile?.name))
        );
        return total + unreadInThread.length;
      }

      if (chat.lastSenderName && chat.lastSenderName.trim().toLowerCase() !== profile?.name?.trim().toLowerCase()) {
        return total + (chat.unreadCount || 1);
      }
      return total;
    }, 0);
  }, [chatsList, mockChats, chatThreads, readChats, selectedChat, activeTab, profile?.name]);

  const createModernMapIcon = useCallback(() => {
    const primaryBg = theme?.variables?.['--accent-primary'] || '#B98B73';
    const innerDot = theme?.variables?.['--bg-global'] || '#FAF7F2';

    return L.divIcon({
      className: 'custom-modern-pin',
      html: `
        <div style="
          position: relative;
          width: 24px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          filter: drop-shadow(0 6px 12px rgba(0,0,0,0.25));
          cursor: pointer;
        ">
          <svg width="24" height="30" viewBox="0 0 24 30" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 0C5.37 0 0 5.37 0 12C0 21 12 30 12 30C12 30 24 21 24 12C24 5.37 18.63 0 12 0Z" 
                  fill="${primaryBg}" 
                  stroke="#FFFFFF" 
                  stroke-width="1.8" />
            <circle cx="12" cy="11" r="4.5" fill="${innerDot}" />
          </svg>
        </div>
      `,
      iconSize: [24, 30],
      iconAnchor: [12, 30],
      popupAnchor: [0, -28],
    });
  }, [theme]);

  // eslint-disable-next-line no-unused-vars
  const groupParticipants = [
    { name: 'Sofia', role: 'Mentor', color: '#C67D5B' },
    { name: 'Marc', role: 'Expert', color: '#D4C5B5' },
    { name: 'Lina', role: 'Apprenante', color: '#FDBA74' },
    { name: 'Kai', role: 'Coach', color: '#F9A8D4' },
    { name: 'Noa', role: 'Modérateur', color: '#A7F3D0' },
  ];

  const avatarOptions = DIVERSE_AVATARS;

  // ---- COHÉRENCE DES AVATARS & NOMS ----
  const femaleAvatars = [
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80',
  ];
  const maleAvatars = [
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
  ];
  const authorAvatars = {
    'Sofia M.': femaleAvatars[0],
    'Marc L.': maleAvatars[0],
    'Matteo R.': maleAvatars[1],
    'Karim B.': maleAvatars[2],
    'Elisa V.': femaleAvatars[1],
    'Nico D.': maleAvatars[0],
    'Amélie P.': femaleAvatars[2],
    'Jules T.': maleAvatars[1],
    'Laura B.': femaleAvatars[1],
    'Rayan K.': maleAvatars[2],
    'Hugo L.': maleAvatars[0],
    'Clara N.': femaleAvatars[2],
    'Giulia S.': femaleAvatars[0],
    'Mina C.': femaleAvatars[1],
    'Theo R.': maleAvatars[1],
    'David H.': maleAvatars[2],
    'Inès W.': femaleAvatars[0],
    'Romain P.': maleAvatars[1],
    'Pauline M.': femaleAvatars[2],
    'Claire R.': femaleAvatars[1],
    'Sacha B.': maleAvatars[0],
    'Martin J.': maleAvatars[2],
    'Julie C.': femaleAvatars[0],
    'Baptiste F.': maleAvatars[1],
    'Noémie A.': femaleAvatars[2],
    'Sabrina M.': femaleAvatars[0],
    'Léa D.': femaleAvatars[1],
    'Hana T.': femaleAvatars[2],
    'Noa K.': maleAvatars[0],
    'Samir M.': maleAvatars[1],
  };
  const feminineFirstNames = ['sofia', 'elisa', 'amélie', 'amelie', 'laura', 'clara', 'giulia', 'mina', 'inès', 'ines', 'pauline', 'claire', 'julie', 'noémie', 'noemie', 'sabrina', 'léa', 'lea', 'hana', 'emma', 'chloé', 'chloe', 'lina', 'anna', 'maria', 'eva', 'nina', 'lucie', 'camille', 'sara', 'julia'];

  const getAuthorAvatar = (name) => {
    const firstName = String(name || '').split(' ')[0].toLowerCase();
    if (authorAvatars[name]) return authorAvatars[name];
    if (feminineFirstNames.includes(firstName)) return femaleAvatars[firstName.length % femaleAvatars.length];
    return maleAvatars[firstName.length % maleAvatars.length];
  };

  // ---- COORDONNÉES GPS RÉELLES ET RÉSOLUTION MONDIALE ----
  const locationCoordinatesMap = {
    'Florence (Italie)': [43.7696, 11.2558],
    'New York (USA)': [40.7128, -74.0060],
    'Londres (UK)': [51.5074, -0.1278],
    'Tokyo (Japon)': [35.6762, 139.6503],
    'Montréal (Canada)': [45.5017, -73.5673],
    'Barcelone (Espagne)': [41.3851, 2.1734],
    'Rome (Italie)': [41.9028, 12.4964],
    'Nice / Barcelone': [43.7102, 7.2620],
    'Alpes (France)': [45.5646, 6.3900],
    'Savoie (France)': [45.5646, 6.3900],
    'Paris 15e (À 1.1 km)': [48.8412, 2.2985],
    'Biarritz (France)': [43.4832, -1.5586],
    'Strasbourg (France)': [48.5734, 7.7521],
  };

  const getCoordinatesForLocation = (location = '') => {
    if (!location) return [48.8566, 2.3522];
    if (locationCoordinatesMap[location]) return locationCoordinatesMap[location];

    const locLower = String(location).toLowerCase();
    if (locLower.includes('tokyo') || locLower.includes('shibuya') || locLower.includes('japon')) return [35.6580, 139.7016];
    if (locLower.includes('new york') || locLower.includes('soho') || locLower.includes('manhattan') || locLower.includes('usa')) return [40.7128, -74.0060];
    if (locLower.includes('londres') || locLower.includes('london') || locLower.includes('uk')) return [51.5074, -0.1278];
    if (locLower.includes('barcelone') || locLower.includes('barcelona') || locLower.includes('espagne')) return [41.3851, 2.1734];
    if (locLower.includes('montréal') || locLower.includes('montreal') || locLower.includes('canada')) return [45.5017, -73.5673];
    if (locLower.includes('florence') || locLower.includes('italie') || locLower.includes('rome')) return [43.7696, 11.2558];
    if (locLower.includes('biarritz')) return [43.4832, -1.5586];
    if (locLower.includes('strasbourg')) return [48.5734, 7.7521];

    const match = String(location).match(/(\d+(?:\.\d+)?)\s*km/i);
    const dist = match ? parseFloat(match[1]) : 3.0;
    const angle = (dist * 137.5) * (Math.PI / 180);
    const latOffset = (dist / 111) * Math.cos(angle);
    const lngOffset = (dist / (111 * Math.cos(48.8566 * Math.PI / 180))) * Math.sin(angle);
    return [48.8566 + latOffset, 2.3522 + lngOffset];
  };

  // ---- BIBLIOTHÈQUE DE MÉDIAS INTELLIGENTS & GARANTIS (PHOTOS & VIDÉOS MP4 SANS DOUBLONS) ----
  const themeMedia = {
    camping: {
      images: [
        'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&w=800&q=80',
      ],
      videos: ['https://assets.mixkit.co/videos/preview/mixkit-drone-view-of-a-harbor-41588-large.mp4'],
    },
    surf: {
      images: [
        'https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1455729552865-3ef5885ab656?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=800&q=80',
      ],
      videos: ['https://assets.mixkit.co/videos/preview/mixkit-man-riding-a-bicycle-in-the-city-41376-large.mp4'],
    },
    piano: {
      images: [
        'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1552422535-c45813c61732?auto=format&fit=crop&w=800&q=80',
      ],
      videos: ['https://assets.mixkit.co/videos/preview/mixkit-playing-a-grand-piano-close-up-41589-large.mp4'],
    },
    guitare: {
      images: [
        'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1525201548942-d8732f6617a0?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1564186763535-ebb21ef5277f?auto=format&fit=crop&w=800&q=80',
      ],
      videos: ['https://assets.mixkit.co/videos/preview/mixkit-playing-a-grand-piano-close-up-41589-large.mp4'],
    },
    ikea: {
      images: [
        'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80',
      ],
      videos: ['https://assets.mixkit.co/videos/preview/mixkit-man-working-with-a-drill-in-a-workshop-43285-large.mp4'],
    },
    drone: {
      images: [
        'https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1507582020474-9a35b7d455d9?auto=format&fit=crop&w=800&q=80',
      ],
      videos: ['https://assets.mixkit.co/videos/preview/mixkit-drone-view-of-a-harbor-41588-large.mp4'],
    },
    iphone: {
      images: [
        'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1580910051074-3eb694886505?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1565849904461-04a58ad377e0?auto=format&fit=crop&w=800&q=80',
      ],
      videos: ['https://assets.mixkit.co/videos/preview/mixkit-hands-typing-on-a-laptop-keyboard-41380-large.mp4'],
    },
    cuisine: {
      images: [
        'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=800&q=80',
      ],
      videos: ['https://assets.mixkit.co/videos/preview/mixkit-chef-preparing-a-dish-in-a-restaurant-kitchen-42795-large.mp4'],
    },
    musique: {
      images: [
        'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1526142684086-7ebd69df27a5?auto=format&fit=crop&w=800&q=80',
      ],
      videos: ['https://assets.mixkit.co/videos/preview/mixkit-playing-a-grand-piano-close-up-41589-large.mp4'],
    },
    photo: {
      images: [
        'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1452696193712-6cabf5103b63?auto=format&fit=crop&w=800&q=80',
      ],
      videos: ['https://assets.mixkit.co/videos/preview/mixkit-camera-lens-zooming-in-and-out-41381-large.mp4'],
    },
    bricolage: {
      images: [
        'https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?auto=format&fit=crop&w=800&q=80',
      ],
      videos: ['https://assets.mixkit.co/videos/preview/mixkit-man-working-with-a-drill-in-a-workshop-43285-large.mp4'],
    },
    tech: {
      images: [
        'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80',
      ],
      videos: ['https://assets.mixkit.co/videos/preview/mixkit-hands-typing-on-a-laptop-keyboard-41380-large.mp4'],
    },
    logement: {
      images: [
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=800&q=80',
      ],
      videos: ['https://assets.mixkit.co/videos/preview/mixkit-cozy-living-room-with-a-fireplace-41385-large.mp4'],
    },
    montagne: {
      images: [
        'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80',
      ],
      videos: ['https://assets.mixkit.co/videos/preview/mixkit-cozy-living-room-with-a-fireplace-41385-large.mp4'],
    },
    sport: {
      images: [
        'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?auto=format&fit=crop&w=800&q=80',
      ],
      videos: ['https://assets.mixkit.co/videos/preview/mixkit-man-training-in-a-gym-41372-large.mp4'],
    },
    yoga: {
      images: [
        'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1545205597-3d9d02c29597?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1575052814086-f385e2e2ad1b?auto=format&fit=crop&w=800&q=80',
      ],
      videos: ['https://assets.mixkit.co/videos/preview/mixkit-woman-doing-yoga-on-a-mat-41595-large.mp4'],
    },
    animaux: {
      images: [
        'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1477884213360-7e9d7dcc1e48?auto=format&fit=crop&w=800&q=80',
      ],
      videos: ['https://assets.mixkit.co/videos/preview/mixkit-dog-running-in-a-park-41370-large.mp4'],
    },
    velo: {
      images: [
        'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1571068316344-75bc76f77890?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1507035895480-2b3156c31fc8?auto=format&fit=crop&w=800&q=80',
      ],
      videos: ['https://assets.mixkit.co/videos/preview/mixkit-man-riding-a-bicycle-in-the-city-41376-large.mp4'],
    },
    jardin: {
      images: [
        'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1561215186-f8d5f62c23c5?auto=format&fit=crop&w=800&q=80',
      ],
      videos: ['https://assets.mixkit.co/videos/preview/mixkit-gardener-watering-plants-in-a-greenhouse-41390-large.mp4'],
    },
    langue: {
      images: [
        'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=800&q=80',
      ],
      videos: ['https://assets.mixkit.co/videos/preview/mixkit-hands-typing-on-a-laptop-keyboard-41380-large.mp4'],
    },
    etude: {
      images: [
        'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=800&q=80',
      ],
      videos: ['https://assets.mixkit.co/videos/preview/mixkit-hands-typing-on-a-laptop-keyboard-41380-large.mp4'],
    },
    remorque: {
      images: [
        'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=800&q=80',
      ],
      videos: ['https://assets.mixkit.co/videos/preview/mixkit-man-working-with-a-drill-in-a-workshop-43285-large.mp4'],
    },
    default: {
      images: [
        'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=800&q=80',
      ],
      videos: ['https://assets.mixkit.co/videos/preview/mixkit-hands-typing-on-a-laptop-keyboard-41380-large.mp4'],
    },
  };

  const getSuggestedMedia = (title = '', description = '', userImage = '', userVideo = '') => {
    const text = `${title} ${description}`.toLowerCase();
    let themeKey = 'default';

    if (/(camping|tente|sac de couchage|bivouac)/.test(text)) themeKey = 'camping';
    else if (/(surf|planche de surf|vague|océan|ocean)/.test(text)) themeKey = 'surf';
    else if (/(piano|solfège|solfege|partition|piano à queue)/.test(text)) themeKey = 'piano';
    else if (/(guitare|guitare acoustique|rock|chanson|guitare électrique)/.test(text)) themeKey = 'guitare';
    else if (/(ikea|montage meuble|étagère|etagere|armoire|meuble flat)/.test(text)) themeKey = 'ikea';
    else if (/(drone|quadcopter|dji|vol aérien|vol aerien)/.test(text)) themeKey = 'drone';
    else if (/(iphone|réparation iphone|reparation iphone|écran iphone|ecran iphone)/.test(text)) themeKey = 'iphone';
    else if (/(pizza|cuisine|pâtisserie|patisserie|pâte|pate|recette|robot pâtissier|robot patissier|chef|bière|biere|brassage)/.test(text)) themeKey = 'cuisine';
    else if (/(musique|beatmaking|ableton|production musicale|chant|violon|batterie|studio)/.test(text)) themeKey = 'musique';
    else if (/(photo|camera|appareil photo|objectif|montage vidéo|cinéma)/.test(text)) themeKey = 'photo';
    else if (/(plomberie|perceuse|marteau|bricolage|électrique|electricite|nettoyeur|kärcher|karcher|ponceuse|escabeau)/.test(text)) themeKey = 'bricolage';
    else if (/(smartphone|écran cassé|ecran casse|electronique|ordinateur|macbook|pc|python|code|informatique|développement|developpement|script|data|ux|ui|figma|seo|wordpress)/.test(text)) themeKey = 'tech';
    else if (/(appartement|maison|logement|échange|echange|swap|chalet|studio|vacances|weekend|soho|villa|sejour|séjour)/.test(text)) themeKey = /(chalet|montagne|savoie|alpes)/.test(text) ? 'montagne' : 'logement';
    else if (/(musculation|coaching sportif|fitness|cardio|entraînement|entrainement|remise en forme|marathon|boxe|running)/.test(text)) themeKey = 'sport';
    else if (/(yoga|posture|mobilité|mobilite|méditation|meditation|souplesse|pilates)/.test(text)) themeKey = 'yoga';
    else if (/(chien|animal|garde de chien|chat|pets)/.test(text)) themeKey = 'animaux';
    else if (/(vélo|velo|cyclisme|bicyclette|piste cyclable|vélos)/.test(text)) themeKey = 'velo';
    else if (/(jardin|jardinage|tondeuse|haie|plantes|pelouse)/.test(text)) themeKey = 'jardin';
    else if (/(anglais|espagnol|japonais|allemand|chinois|arabe|fle|langue étrangère|cours de langues|conversationnel)/.test(text)) themeKey = 'langue';
    else if (/(math|maths|révision|revision|examen|scolaire|lycée|lycee|étudiant|etudiant|bac|brevet)/.test(text)) themeKey = 'etude';
    else if (/(remorque|déménagement|demenagement|transport|utilitaire)/.test(text)) themeKey = 'remorque';

    const itemTheme = themeMedia[themeKey] || themeMedia.default;

    // RÈGLE : si l'utilisateur a fourni sa propre image, galerie = ses images UNIQUEMENT.
    // Les Unsplash ne servent que de fallback unique quand aucune image n'est fournie.
    const hasUserImage = userImage && typeof userImage === 'string' && userImage.trim() !== '';

    let uniqueImages;
    if (hasUserImage) {
      uniqueImages = [userImage];
    } else {
      const fallbackImg = (itemTheme.images && itemTheme.images[0]) || defaultPostDraft.image;
      uniqueImages = [fallbackImg];
    }

    const mainImage = uniqueImages[0] || defaultPostDraft.image;
    const chosenVideo = userVideo && userVideo.trim() ? userVideo : (itemTheme.videos?.[0] || '');

    return {
      image: mainImage,
      video: chosenVideo,
      gallery: uniqueImages,
    };
  };

  const getSuggestedImage = (title = '', description = '', fallback = defaultPostDraft.image) => {
    return getSuggestedMedia(title, description, fallback).image;
  };

  const fallbackCategoryImages = {
    'Cours & Compétences': 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=800&q=80',
    'Prêt de Matériel': 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&w=800&q=80',
    'Services & Dépannage': 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=800&q=80',
    'Logement & Stay Swap': 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80',
    'Tech': 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=800&q=80',
    'Bien-être': 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80',
    default: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=800&q=80',
  };

  const getFallbackImage = (category = '', title = '') => {
    if (fallbackCategoryImages[category]) return fallbackCategoryImages[category];
    return getSuggestedImage(title, category) || fallbackCategoryImages.default;
  };

  // ---- TAGS AUTOMATIQUES ----
  const generateTags = (title = '', description = '') => {
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
    rules.forEach(rule => {
      if (rule.re.test(text) && !tags.includes(rule.tag)) tags.push(rule.tag);
    });
    if (tags.length === 0) tags.push('Échange');
    return tags.slice(0, 4);
  };

  // ---- HISTORIQUE DES SWAPS & DEALS ----
  const statusStyles = {
    'Clôturé': { bg: '#EBF0E6', text: '#3D4A35' },
    'En cours': { bg: '#F5EAE4', text: '#A8644A' },
    'Planifié': { bg: '#FEF3C7', text: '#92400E' },
    'En attente': { bg: '#F5F0E8', text: '#6B5E54' },
  };

  const swapHistory = [
    {
      id: 1,
      counterparty: 'Sofia M.',
      deal: "Cours de Piano & Solfège (3 séances en visio)",
      date: '12 mars 2025',
      status: 'Clôturé',
      rating: 5,
      review: "Échange ultra fluide, Sofia est pédagogue et très à l'écoute. Les 3 séances se sont parfaitement déroulées, je recommande à 100%.",
      compensation: '3 Crédits temps',
    },
    {
      id: 2,
      counterparty: 'Marc L.',
      deal: 'Prêt Perceuse à percussion + coffret forets',
      date: '28 février 2025',
      status: 'Clôturé',
      rating: 4,
      review: "Prêt rapide et propre, caution virtuelle bien gérée. Matériel en parfait état, rendu sans accroc dans les délais.",
      compensation: 'Troc direct + Caution 30€',
    },
    {
      id: 3,
      counterparty: 'Karim B.',
      deal: 'Dépannage iPhone 13 (écran)',
      date: 'Prévu cette semaine',
      status: 'En cours',
      rating: null,
      review: 'Intervention programmée cette semaine, créneau confirmé par Karim. Échange de modèle et de devis en cours dans le chat.',
      compensation: '30€ ou 2 Crédits',
    },
    {
      id: 4,
      counterparty: 'Elisa V.',
      deal: "Cours d'Italien conversationnel (1h)",
      date: 'Vendredi 18h00',
      status: 'Planifié',
      rating: null,
      review: 'Séance visio planifiée vendredi à 18h00. Conditions validées : 1 Crédit + 10€.',
      compensation: '1 Crédit + 10€',
    },
  ];

  const isDemoProfile = Boolean(profile?.isDemo || (profile?.uid && profile.uid.startsWith('demo_')));
  const isAdmin = profile?.email === 'mateopolo91@gmail.com' || auth.currentUser?.email === 'mateopolo91@gmail.com' || profile?.role === 'admin';
  const closedDealsCount = isDemoProfile ? swapHistory.filter(entry => entry.status === 'Clôturé').length : (profile?.dealsCompleted ?? 0);
  const inProgressCount = isDemoProfile ? swapHistory.filter(entry => entry.status === 'En cours' || entry.status === 'Planifié').length : (profile?.dealsInProgress ?? 0);
  const ratedEntries = isDemoProfile ? swapHistory.filter(entry => entry.rating) : [];
  const averageRating = isDemoProfile
    ? (ratedEntries.length ? (ratedEntries.reduce((sum, entry) => sum + entry.rating, 0) / ratedEntries.length).toFixed(1) : '—')
    : (profile?.rating ? Number(profile.rating).toFixed(1) : '—');
  const userSwapHistory = isDemoProfile ? swapHistory : (profile?.swapHistory || []);

  const baseCategories = ['Tous', ...TROCO_CATEGORIES.filter(c => c.id !== 'all').map(c => c.label)];
  const allCategories = [...baseCategories, ...customCategories];

  // ---- GESTION COMPÉTENCES & MATÉRIEL AVEC PERSISTANCE FIRESTORE IMMÉDIATE ----
  const handleAddSkill = async () => {
    const value = skillInput.trim();
    if (!value || skills.includes(value)) return;
    const nextSkills = [...skills, value];
    setSkills(nextSkills);
    setProfile(prev => ({ ...prev, skills: nextSkills }));
    setProfileDraft(prev => ({ ...prev, skills: nextSkills }));
    setSkillInput('');

    const uid = profile?.uid || auth.currentUser?.uid;
    if (uid) {
      try {
        await setDoc(doc(db, 'users', String(uid)), { skills: nextSkills, updatedAt: serverTimestamp() }, { merge: true });
      } catch (e) {
        console.warn('[Firestore] Skill save failed:', e);
      }
    }
  };

  const handleRemoveSkill = async (skill) => {
    const nextSkills = skills.filter(item => item !== skill);
    setSkills(nextSkills);
    setProfile(prev => ({ ...prev, skills: nextSkills }));
    setProfileDraft(prev => ({ ...prev, skills: nextSkills }));

    const uid = profile?.uid || auth.currentUser?.uid;
    if (uid) {
      try {
        await setDoc(doc(db, 'users', String(uid)), { skills: nextSkills, updatedAt: serverTimestamp() }, { merge: true });
      } catch (e) {
        console.warn('[Firestore] Skill remove failed:', e);
      }
    }
  };

  const handleAddEquipment = async () => {
    const value = equipmentInput.trim();
    if (!value || equipment.includes(value)) return;
    const nextEquipment = [...equipment, value];
    setEquipment(nextEquipment);
    setProfile(prev => ({ ...prev, equipment: nextEquipment }));
    setProfileDraft(prev => ({ ...prev, equipment: nextEquipment }));
    setEquipmentInput('');

    const uid = profile?.uid || auth.currentUser?.uid;
    if (uid) {
      try {
        await setDoc(doc(db, 'users', String(uid)), { equipment: nextEquipment, updatedAt: serverTimestamp() }, { merge: true });
      } catch (e) {
        console.warn('[Firestore] Equipment save failed:', e);
      }
    }
  };

  const handleRemoveEquipment = async (item) => {
    const nextEquipment = equipment.filter(entry => entry !== item);
    setEquipment(nextEquipment);
    setProfile(prev => ({ ...prev, equipment: nextEquipment }));
    setProfileDraft(prev => ({ ...prev, equipment: nextEquipment }));

    const uid = profile?.uid || auth.currentUser?.uid;
    if (uid) {
      try {
        await setDoc(doc(db, 'users', String(uid)), { equipment: nextEquipment, updatedAt: serverTimestamp() }, { merge: true });
      } catch (e) {
        console.warn('[Firestore] Equipment remove failed:', e);
      }
    }
  };

  const handleAddCategory = () => {
    const value = categoryInput.trim();
    if (!value) return;
    setCustomCategories(prev => [...prev, value]);
    setSelectedCategory(value);
    setCategoryInput('');
    setIsCategoryModalOpen(false);
  };

  const toggleLanguageFilter = (language) => {
    setSelectedLanguages(prev => prev.includes(language) ? prev.filter(item => item !== language) : [...prev, language]);
  };

  const paymentOptions = ['all', 'credits', 'cash', 'troc', 'hybrid'];
  const paymentLabels = { all: 'Tous', credits: 'Crédits', cash: 'Cash', troc: 'Troc', hybrid: 'Hybride' };

  const toggleLanguage = (language) => {
    setProfile(prev => ({
      ...prev,
      languages: prev.languages.includes(language)
        ? prev.languages.filter(entry => entry !== language)
        : [...prev.languages, language],
    }));
  };

  const [listings, setListings] = useState(() => {
    try {
      const saved = localStorage.getItem('troco_user_listings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Erreur chargement localStorage des annonces', e);
    }
    const defaultUserListing = {
      id: 9999,
      title: "Coaching React, Node.js & Firebase (1h)",
      description: "Session individuelle de mentorat web moderne : React, Firebase, API Rest & architecture. Support vidéo et exercices pratiques inclus.",
      author: "Matéo Polo",
      category: "Cours & Compétences",
      verified: true,
      rating: 5.0,
      reviews: 6,
      status: "active",
      location: "Paris 11e (à 0.5 km)",
      coordinates: [48.8584, 2.3785],
      type: "remote",
      nativeLang: "FR",
      languages: ["FR", "EN"],
      compensation: "1h = 1 Crédit",
      image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80",
      video: "https://assets.mixkit.co/videos/preview/mixkit-software-developer-working-on-his-laptop-34440-large.mp4",
      urgent: true,
      caution: null,
      tags: ["React", "Firebase", "WebDev", "Mentorat"],
      translations: {
        EN: { title: "React, Node.js & Firebase Coaching (1h)", description: "1-on-1 modern web development coaching: React, Firebase, REST APIs. Includes video recording and hands-on exercises." },
        ES: { title: "Clase de React, Node.js y Firebase (1h)", description: "Sesión individual de desarrollo web moderno: React, Firebase y APIs REST." }
      }
    };
    return [defaultUserListing, ...mockListings.map(l => ({ ...l, status: 'active' }))];
  });

  useEffect(() => {
    try {
      localStorage.setItem('troco_user_listings', JSON.stringify(listings));
    } catch (e) {
      console.warn('Erreur sauvegarde localStorage des annonces', e);
    }
  }, [listings]);

  // ---- SYNC TEMPS RÉEL FIRESTORE → état listings ----
  // Fusionne les mockListings (isDemo: true, source immuable hors composant)
  // avec les vraies annonces publiées dans la collection Firestore 'listings'.
  // On lit directement mockListings au lieu de prev.filter() pour éviter
  // que le feed soit vide si prev a été écrasé avant l'arrivée du snapshot.
  useEffect(() => {
    const demoBase = mockListings.map(l => ({ ...l, status: 'active', isDemo: true }));

    const unsub = onSnapshot(
      collection(db, 'listings'),
      (snapshot) => {
        // Annonces réelles depuis Firestore
        const firestoreListings = snapshot.docs.map((docSnap) => ({
          id: docSnap.data().id || docSnap.id,
          firestoreId: docSnap.id,
          ...docSnap.data(),
          status: docSnap.data().status || 'active',
          isDemo: false,
        }));
        // Fusion garantie : démos toujours présentes + annonces Firestore
        setListings([...demoBase, ...firestoreListings]);
      },
      (error) => {
        // En cas d'erreur réseau : on affiche au moins les démos
        console.warn('[Firestore] onSnapshot error:', error);
        setListings(prev => prev.length > 0 ? prev : demoBase);
      }
    );
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- SYNC MESSAGES EN TEMPS RÉEL (chat actif) ----
  // Dès qu'un message arrive dans Firestore, il apparaît instantanément dans la vue.
  useEffect(() => {
    if (!selectedChat?.id) return;
    const chatId = String(selectedChat.id);
    const q = query(collection(db, 'chats', chatId, 'messages'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) return;
      const msgs = snapshot.docs.map(d => {
        const data = d.data();
        // Attribution stricte de l'auteur : si senderName correspond à l'utilisateur connecté => 'me' (aligné à droite), sinon 'them' (aligné à gauche)
        const isMe = data.senderName?.trim().toLowerCase() === profile.name?.trim().toLowerCase();
        return {
          id: d.id,
          ...data,
          sender: isMe ? 'me' : 'them',
          senderName: data.senderName || (isMe ? profile.name : (selectedChat.user || 'Interlocuteur')),
          text: data.text || '',
          status: data.status || 'sent',
          createdAt: data.createdAt || data.timestamp || Date.now(),
          translations: data.translations || { FR: data.text || '' },
        };
      });
      setChatThreads(prev => ({
        ...prev,
        [selectedChat.id]: msgs,
      }));

      // Si le chat est ouvert dans l'onglet 'chat', marquer automatiquement les messages reçus comme "lu" (✓✓ bleu)
      if (activeTab === 'chat' && String(selectedChat.id) === String(chatId)) {
        snapshot.docs.forEach(d => {
          const data = d.data();
          const isFromThem = data.senderName?.trim().toLowerCase() !== profile.name?.trim().toLowerCase();
          if (isFromThem && data.status !== 'read' && !data.read) {
            updateDoc(doc(db, 'chats', chatId, 'messages', d.id), {
              status: 'read',
              read: true,
              readAt: serverTimestamp(),
            }).catch(() => { });
          }
        });
      }

      // Synchronisation immédiate de l'aperçu du dernier message dans chatsList
      if (msgs.length > 0) {
        const lastMsg = msgs[msgs.length - 1];
        const previewTxt = lastMsg.kind === 'deal' || lastMsg.type === 'deal'
          ? (lastMsg.terms?.conditions || 'Proposition de deal')
          : (lastMsg.text || '');
        setChatsList(prev => prev.map(c => String(c.id) === String(selectedChat.id) ? {
          ...c,
          lastMessage: previewTxt,
          lastSenderName: lastMsg.senderName,
        } : c));
      }

      // Si la conversation est activement consultée, marquer comme lue
      setReadChats(prev => new Set([...prev, selectedChat.id, String(selectedChat.id), Number(selectedChat.id)]));
    }, (err) => {
      console.warn('[Firestore] chat messages onSnapshot:', err);
    });
    return () => unsub();
  }, [selectedChat?.id, profile.name]);

  const getListingDistance = (item) => {
    if (typeof item.distanceKm === 'number') return item.distanceKm;
    if (item.coordinates && userCoords) {
      return calculateHaversineDistance(userCoords[0], userCoords[1], item.coordinates[0], item.coordinates[1]);
    }
    const match = String(item.location || '').match(/(\d+(?:\.\d+)?)\s*km/i);
    if (match) return parseFloat(match[1]);
    return null;
  };

  const CITY_ALIASES = {
    'parie': 'paris',
    'pari': 'paris',
    'pariss': 'paris',
    'bordeau': 'bordeaux',
    'bordeaux': 'bordeaux',
    'lyons': 'lyon',
    'lion': 'lyon',
    'marseiles': 'marseille',
    'marseil': 'marseille',
    'biariz': 'biarritz',
    'strasburg': 'strasbourg',
    'nantes': 'nantes',
    'toulouse': 'toulouse',
    'lille': 'lille',
    'nice': 'nice',
    'tokyo': 'tokyo',
    'london': 'london',
    'londres': 'london',
    'nyc': 'new york',
    'newyork': 'new york',
  };

  const removeAccents = (str = '') => {
    return String(str).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  };

  const filteredListings = useMemo(() => {
    return listings.filter((item) => {
      const rawQuery = searchQuery.trim();
      const cleanQuery = removeAccents(rawQuery);
      const words = cleanQuery.split(/\s+/).filter(Boolean);
      const expandedWords = words.map(w => CITY_ALIASES[w] || w);

      const itemLocationNorm = removeAccents(item.location || '');
      const itemTitleNorm = removeAccents(item.title || '');
      const itemCategoryNorm = removeAccents(item.category || '');
      const itemCompNorm = removeAccents(item.compensation || '');
      const allTags = [
        ...(Array.isArray(item.tags) ? item.tags : []),
        ...(typeof generateTags === 'function' ? (generateTags(item.title || '', item.description || '') || []) : [])
      ];
      const itemTagsNorm = removeAccents(allTags.join(' '));
      const itemDescNorm = removeAccents(item.description || '');
      const transText = item.translations ? Object.values(item.translations).map(t => `${t.title || ''} ${t.description || ''}`).join(' ') : '';
      const itemTransNorm = removeAccents(transText);

      const searchText = `${itemTitleNorm} ${itemCategoryNorm} ${itemLocationNorm} ${itemCompNorm} ${itemTagsNorm} ${itemDescNorm} ${itemTransNorm}`;

      const matchesSearch = (() => {
        if (!cleanQuery) return true;

        // 1. Match direct du texte
        if (searchText.includes(cleanQuery)) return true;

        // 2. Match via alias étendu (ex: "parie" -> "paris")
        const expandedQuery = expandedWords.join(' ');
        if (searchText.includes(expandedQuery)) return true;

        // 3. Match mot par mot
        return expandedWords.every(w => searchText.includes(w));
      })();
      const matchesFormat = (() => {
        if (formatFilter === 'all' || !formatFilter) return true;
        const itemFormat = item.format || item.type || 'onsite';
        if (formatFilter === 'remote') {
          return itemFormat === 'remote' || itemFormat === 'both';
        }
        if (formatFilter === 'onsite') {
          return itemFormat === 'onsite' || itemFormat === 'both';
        }
        return itemFormat === formatFilter;
      })();

      const matchesCategory = (() => {
        if (!selectedCategory || selectedCategory === 'all' || selectedCategory === 'Tous') return true;
        const cat = String(item.category || '').toLowerCase();
        const selCat = String(selectedCategory || '').toLowerCase();


        if (selCat.includes('cours') || selCat.includes('compétence')) {
          return cat.includes('cours') || cat.includes('compétence') || cat.includes('formation') || cat.includes('coaching');
        }
        if (selCat.includes('outillage') || selCat.includes('matériel')) {
          return cat.includes('outillage') || cat.includes('matériel') || cat.includes('prêt');
        }
        if (selCat.includes('services') || selCat.includes('dépannage')) {
          return cat.includes('services') || cat.includes('dépannage') || cat.includes('réparation');
        }
        if (selCat.includes('logement') || selCat.includes('swap')) {
          return cat.includes('logement') || cat.includes('swap') || cat.includes('hébergement');
        }
        return cat.includes(selCat);
      })();

      const itemLangs = item.languages ? [...item.languages, ...(item.translations ? Object.keys(item.translations) : []), item.nativeLang || 'FR'] : [item.nativeLang || 'FR', ...(item.translations ? Object.keys(item.translations) : [])];
      const matchesLanguage = selectedLanguages.length === 0 || itemLangs.some(lang => selectedLanguages.includes(lang));
      const matchesPayment = selectedPayment === 'all' || (selectedPayment === 'credits' && item.compensation.includes('Crédit')) || (selectedPayment === 'cash' && item.compensation.includes('€')) || (selectedPayment === 'troc' && item.compensation.includes('Troc')) || (selectedPayment === 'hybrid' && item.compensation.includes('+'));

      const distance = getListingDistance(item);
      const matchesDistance = (() => {
        if (isInfiniteRadius || radiusKm >= 2000) return true;
        // Si on n'a pas pu calculer la distance (pas de coordonnées) :
        // on affiche l'annonce quand même pour ne pas vider le feed.
        if (distance === null) return true;
        return distance <= radiusKm;
      })();

      // Filtrage Shadow-Ban & Utilisateurs bannis
      const authorUser = allFirestoreUsers.find(u => (u.name && u.name.trim().toLowerCase() === (item.author || '').trim().toLowerCase()) || (u.uid && item.authorUid && u.uid === item.authorUid));
      if (authorUser?.isBanned) return false;
      if (authorUser?.isShadowBanned && item.author !== profile.name) return false;

      return item.status !== 'paused' && matchesSearch && matchesFormat && matchesCategory && matchesLanguage && matchesPayment && matchesDistance;
    }).sort((a, b) => {
      // 1. Annonces boostées / sponsorisées en priorité absolue (PC & Mobile)
      const aBoost = (a.isBoosted || a.sponsored) ? 1 : 0;
      const bBoost = (b.isBoosted || b.sponsored) ? 1 : 0;
      if (bBoost !== aBoost) return bBoost - aBoost;

      // 2. Annonces créées par de vrais utilisateurs (humains) avant les annonces Démo / IA
      const aDemo = (a.isDemo || a.persona || (typeof a.id === 'number' && a.id < 300)) ? 1 : 0;
      const bDemo = (b.isDemo || b.persona || (typeof b.id === 'number' && b.id < 300)) ? 1 : 0;
      if (aDemo !== bDemo) return aDemo - bDemo;

      // 3. Annonces urgentes en priorité
      const aUrgent = (a.urgent || a.isUrgent) ? 1 : 0;
      const bUrgent = (b.urgent || b.isUrgent) ? 1 : 0;
      if (bUrgent !== aUrgent) return bUrgent - aUrgent;

      // 4. Tri chronologique par date de création ou identifiant
      const getTime = (item) => {
        if (item.createdAt?.toMillis) return item.createdAt.toMillis();
        if (item.createdAt?.seconds) return item.createdAt.seconds * 1000;
        if (typeof item.createdAt === 'string') return new Date(item.createdAt).getTime() || 0;
        if (typeof item.createdAt === 'number') return item.createdAt;
        const numId = Number(String(item.id).replace(/\D/g, ''));
        return isNaN(numId) ? 0 : numId;
      };
      return getTime(b) - getTime(a);
    });
  }, [
    listings,
    searchQuery,
    formatFilter,
    selectedCategory,
    selectedLanguages,
    selectedPayment,
    radiusKm,
    isInfiniteRadius,
    profile.name,
    allFirestoreUsers
  ]);

  const getListingDetail = (listing) => {
    const media = getSuggestedMedia(listing.title, listing.description || '', listing.image, listing.video);
    const generic = {
      id: listing.id,
      isBoosted: listing.isBoosted || false,
      title: listing.title,
      description: listing.description || 'Ce service combine flexibilité, qualité de partage et une vraie expérience premium. Le créateur a déjà accompagné plusieurs personnes dans des échanges rapides et fiables.',
      image: media.image,
      video: media.video,
      gallery: media.gallery,
      wallet: { euros: 20, tokens: 2 },
      tags: generateTags(listing.title, listing.description || ''),
      compensation: listing.compensation,
      nativeLang: listing.nativeLang || 'FR',
      translations: listing.translations || {},
      authorProfile: {
        name: listing.author,
        avatar: listing.author === profile.name ? profile.avatar : getAuthorAvatar(listing.author),
        bio: listing.author === profile.name ? profile.bio : 'Créateur de contenus, expert en échange de services et passionné de communautés locales.',
        socials: listing.author === profile.name ? (profile.socials || []) : ['LinkedIn', 'Instagram'],
        portfolio: listing.author === profile.name ? (profile.portfolio || []) : [
          'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=600&q=80',
          'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=600&q=80',
          'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=600&q=80',
        ],
        reviews: listing.author === profile.name ? (profile.reviews || []) : [
          { rating: 5, text: 'Très clair sur les conditions, super communication et qualité de service.' },
          { rating: 5, text: 'J’ai trouvé un vrai partenaire de confiance, avec un échange fluide et premium.' },
        ],
      },
    };

    if (listing.author === 'Sofia M.') {
      return {
        ...generic,
        description: listing.description || 'Cours de piano et accompagnement musical pensé pour les débutants et les profils en reconversion. Le cadre est très structuré, chaleureux et adapté à un usage flexible.',
        wallet: { euros: 15, tokens: 1 },
        authorProfile: {
          ...generic.authorProfile,
          avatar: femaleAvatars[0],
          bio: 'Professeure de piano, coach de créativité et experte en échanges à distance.',
          socials: ['LinkedIn', 'Instagram', 'TikTok'],
          portfolio: [
            'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=80',
            'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=600&q=80',
          ],
          reviews: [
            { rating: 5, text: 'Très pédagogique et hyper réactif, j’ai eu un échange de qualité dès le premier message.' },
            { rating: 4, text: 'Un vrai plaisir de travailler avec elle, le format visio est simple et agréable.' },
          ],
        },
      };
    }

    if (listing.author === 'Marc L.') {
      return {
        ...generic,
        description: listing.description || 'Prêt d’outillage et service de dépannage local. Tout est pensé pour qu’un échange soit rapide, concret et sécurisé.',
        wallet: { euros: 12, tokens: 2 },
        authorProfile: {
          ...generic.authorProfile,
          avatar: maleAvatars[0],
          bio: 'Bricoleur local, passionné de matériel et de partage de services de proximité.',
          socials: ['LinkedIn', 'Instagram'],
          portfolio: [
            'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=600&q=80',
            'https://images.unsplash.com/photo-1487958449943-2429e8be8625?auto=format&fit=crop&w=600&q=80',
          ],
          reviews: [
            { rating: 5, text: 'Très fiable pour les prêts et les dépannages rapides, j’ai apprécié la transparence.' },
            { rating: 5, text: 'Parfait pour les échanges de proximité, le service est simple et rassurant.' },
          ],
        },
      };
    }

    return generic;
  };

  const handleOpenListing = (listing) => {
    setSelectedListing(getListingDetail(listing));
  };

  const handleDeleteListing = async (id) => {
    if (window.confirm(t('confirmDeleteText') || 'Voulez-vous vraiment supprimer cette annonce ?')) {
      const targetListing = listings.find(item => item.id === id);
      setListings(prev => prev.filter(item => item.id !== id));
      if (targetListing?.firestoreId) {
        try {
          await deleteDoc(doc(db, 'listings', String(targetListing.firestoreId)));
        } catch (e) {
          console.warn('[Firestore] deleteDoc failed:', e);
        }
      }
      setMobileListingActionTarget(null);
      if (selectedListing?.id === id) {
        setSelectedListing(null);
      }
    }
  };

  const handleTogglePauseListing = (id) => {
    setListings(prev => prev.map(item => item.id === id ? { ...item, status: item.status === 'paused' ? 'active' : 'paused' } : item));
  };

  const handleStartEditListing = (listing) => {
    setIsEditingListing(true);
    setEditingOriginalListing(listing);
    setPostDraft({
      ...listing,
      title: listing.title || '',
      description: listing.description || '',
      category: listing.category || 'Cours & Compétences',
      location: listing.location || '',
      imageUrl: listing.image || listing.imageUrl || '',
      videoUrl: listing.video || listing.videoUrl || '',
      status: listing.status || 'active',
      caution: listing.caution || '',
      cautionAmount: listing.cautionAmount || '',
      requiresCaution: !!listing.cautionAmount || (typeof listing.caution === 'string' && listing.caution.includes('Caution')),
      isUrgent: !!listing.urgent,
      tags: listing.tags || [],
    });
    setPostStep(1);
    setActiveTab('post');
  };

  const handleBoostListing = (listing) => {
    handleOpenPayment('boost', listing);
  };

  const closeCheckout = () => {
    const { mode, amount, payload, method } = checkout;
    setCheckout(prev => ({ ...prev, open: false, step: 'method', payload: null }));

    // ---- GARDE ANTI-DOUBLE-EXÉCUTION ----
    if (checkoutAppliedRef.current) return;
    checkoutAppliedRef.current = true;

    // Si paiement par solde Troco existant : décrémenter le solde de l'utilisateur
    const isPaidWithWallet = method === 'troco' || method === 'wallet';
    const chargedFromWallet = isPaidWithWallet && amount > 0;

    if (chargedFromWallet) {
      if (profile.euroBalance < amount) {
        alert('Solde Euros insuffisant dans votre portefeuille Troco.');
        return;
      }
      setProfile(prev => {
        const newBal = Number(Math.max(0, prev.euroBalance - amount).toFixed(2));
        if (profile?.uid) {
          updateDoc(doc(db, 'users', profile.uid), {
            euroBalance: newBal,
            updatedAt: serverTimestamp(),
          }).catch(e => console.warn('[Firestore] update balance error:', e));
        }
        return { ...prev, euroBalance: newBal };
      });
    }

    if (mode === 'boost') {
      window.setTimeout(() => {
        setListings(prev => prev.map(item => item.id === payload?.listingId ? { ...item, isBoosted: true } : item));
        setBoostMessage(`Annonce boostée avec succès pendant 7 jours !`);
      }, 400);
      return;
    }

    if (mode === 'deal') {
      window.setTimeout(async () => {
        setChatThreads(prev => ({
          ...prev,
          [payload?.chatId]: (prev[payload?.chatId] || []).map(m => m.id === payload?.dealId ? { ...m, status: 'confirmed' } : m),
        }));
        setChatStatusOverrides(prev => ({ ...prev, [payload?.chatId]: 'Deal Validé' }));

        // Si le deal comprenait des euros et un vendeur identifié, créditer le vendeur
        if (payload?.partnerUid && payload?.euroAmount && Number(payload.euroAmount) > 0) {
          try {
            const partnerRef = doc(db, 'users', String(payload.partnerUid));
            const partnerSnap = await getDoc(partnerRef);
            if (partnerSnap.exists()) {
              const currentPartnerBal = Number(partnerSnap.data().euroBalance) || 0;
              await updateDoc(partnerRef, {
                euroBalance: Number((currentPartnerBal + Number(payload.euroAmount)).toFixed(2)),
                updatedAt: serverTimestamp(),
              });
            }
          } catch (e) {
            console.warn('[Firestore] Credit partner in deal error:', e);
          }
        }
      }, 400);
      return;
    }

    if (mode === 'edit-listing' || mode === 'publish-options') {
      window.setTimeout(async () => {
        const { newListing, invoiceCalc } = payload || {};
        if (!newListing) return;

        // Enregistrement de la transaction avec référence unique TRK-YYYYMM-XXXX
        const invoiceRef = generateInvoiceRef();
        const txRecord = {
          id: `tx-${Date.now()}`,
          type: isEditingListing ? 'edit-listing' : 'publish-options',
          title: isEditingListing ? `Modification annonce — ${newListing.title}` : `Options publication — ${newListing.title}`,
          amount: amount,
          currency: 'EUR',
          status: 'completed',
          invoiceRef: invoiceRef,
          date: new Date().toISOString(),
          createdAt: serverTimestamp(),
          userId: profile.uid || auth.currentUser?.uid || 'anonymous',
          items: invoiceCalc?.items || [],
        };
        try {
          await addDoc(collection(db, 'transactions'), txRecord);
        } catch (e) {
          console.warn('[Firestore] transaction addDoc failed:', e);
        }
        setUserTransactions(prev => [txRecord, ...prev]);

        if (isEditingListing) {
          setListings(prev => prev.map(item => item.id === newListing.id ? newListing : item));
          if (editingOriginalListing?.firestoreId) {
            try {
              const { id: _localId, firestoreId: _fid, ...firestorePayload } = newListing;
              updateDoc(doc(db, 'listings', editingOriginalListing.firestoreId), {
                ...firestorePayload,
                updatedAt: serverTimestamp(),
              }).catch(e => console.warn('[Firestore] updateDoc failed:', e));
            } catch (e) {
              console.warn('[Firestore] updateDoc error:', e);
            }
          }
        } else {
          setListings(prev => [newListing, ...prev]);
          try {
            const { id: _localId, ...firestorePayload } = newListing;
            addDoc(collection(db, 'listings'), {
              ...firestorePayload,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            }).catch(e => console.warn('[Firestore] addDoc failed:', e));
          } catch (e) {
            console.warn('[Firestore] addDoc error:', e);
          }
        }

        playApplePaySound();
        const updatedDetail = getListingDetail(newListing);
        setPublishedListing(updatedDetail);
        setShowPublishedPopup(true);
        setSelectedListing(updatedDetail);

        setIsEditingListing(false);
        setEditingOriginalListing(null);
        setPostStep(1);
        setPostDraft(defaultPostDraft);
      }, 400);
      return;
    }
  };

  const openCheckout = ({ mode, amount, label, payload }) => {
    setCheckout({ open: true, mode, amount, label, payload: payload || null, method: 'applePay', step: 'method' });
  };

  const checkoutAppliedRef = useRef(false);

  const handleConfirmPayment = () => {
    // Vérification de sécurité si paiement par solde
    if ((checkout.method === 'troco' || checkout.method === 'wallet') && (profile.euroBalance || 0) < (checkout.amount || 0)) {
      alert(`Solde insuffisant (${(profile.euroBalance || 0).toFixed(2)} € disponibles sur ${(checkout.amount || 0).toFixed(2)} € requis). Veuillez recharger votre portefeuille.`);
      return;
    }
    checkoutAppliedRef.current = false; // reset guard for this payment
    setCheckout(prev => ({ ...prev, step: 'processing' }));
    window.setTimeout(() => {
      playApplePaySound();
      setCheckout(prev => ({ ...prev, step: 'success' }));
      // Auto-close after 1.6s — will call closeCheckout which applies the balance changes once
      window.setTimeout(() => {
        closeCheckout();
      }, 1600);
    }, 1400);
  };

  const confirmBoostListing = () => {
    if (!boostingListing) return;
    if (profile.euroBalance < 2.99) {
      setBoostMessage('Solde insuffisant pour booster cette annonce.');
      return;
    }
    setBoostMessage('');
    setIsBoostModalOpen(false);
    openCheckout({ mode: 'boost', amount: 2.99, label: `Boost 7 jours — ${boostingListing.title}`, payload: { listingId: boostingListing.id } });
    setBoostingListing(null);
  };


  const handlePhotoGridAdd = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    const currentGallery = postDraft.gallery && postDraft.gallery.length > 0
      ? [...postDraft.gallery]
      : (postDraft.imageUrl ? [postDraft.imageUrl] : []);

    const remainingSlots = 8 - currentGallery.length;
    if (remainingSlots <= 0) return;

    const filesToProcess = files.slice(0, remainingSlots);
    const newPhotos = [];
    for (const file of filesToProcess) {
      const compressed = await compressImage(file, 800, 800, 0.75);
      if (compressed) newPhotos.push(compressed);
    }

    const updatedGallery = [...currentGallery, ...newPhotos].slice(0, 8);
    setPostDraft(prev => ({
      ...prev,
      gallery: updatedGallery,
      imageUrl: updatedGallery[0] || prev.imageUrl,
    }));
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

  const handleImageFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const compressedDataUrl = await compressImage(file, 800, 800, 0.75);
    if (compressedDataUrl) {
      setPostDraft(prev => {
        const curGallery = prev.gallery && prev.gallery.length > 0 ? prev.gallery : [];
        return {
          ...prev,
          imageUrl: compressedDataUrl,
          gallery: curGallery.length === 0 ? [compressedDataUrl] : curGallery,
        };
      });
    }
  };

  const handleVideoFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPostDraft(prev => ({ ...prev, videoUrl: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handlePublishAnnouncement = async () => {
    const rawTitle = (postDraft.title || '').trim();
    const rawDescription = (postDraft.description || '').trim();

    if (!rawTitle || !rawDescription) {
      setPublishMessage(currentLang === 'FR' ? 'Ajoute un titre et une description pour publier ton annonce.' : currentLang === 'EN' ? 'Add a title and a description to publish your ad.' : currentLang === 'ES' ? 'Añade un título y una descripción para publicar tu anuncio.' : currentLang === 'IT' ? 'Aggiungi un titre e una descrizione per pubblicare il tuo annuncio.' : currentLang === 'DE' ? 'Füge einen Titel und eine Beschreibung hinzu, um deine Anzeige zu veröffentlichen.' : currentLang === 'JA' ? 'タイトルと説明を追加して広告を公開してください。' : '添加标题和描述以发布您的广告。');
      return;
    }

    // ---- MODÉRATION DE CONTENU AUTOMATIQUE & LISTE NOIRE ----
    const blacklistCheck = validateListingContent({
      title: rawTitle,
      description: rawDescription,
      tags: postDraft.tags || []
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

    // Calcul précis des coordonnées géographiques (~300-500m autour de la position)
    const jitterLat = (Math.random() - 0.5) * 0.007;
    const jitterLng = (Math.random() - 0.5) * 0.007;
    const resolvedCoords = postDraft.coordinates || (userCoords ? [userCoords[0] + jitterLat, userCoords[1] + jitterLng] : [48.8566 + jitterLat, 2.3522 + jitterLng]);

    const newListing = {
      ...(isEditingListing ? editingOriginalListing : {}),
      id: isEditingListing ? editingOriginalListing.id : Date.now(),
      title: rawTitle,
      author: profile.name,
      category: finalCategory,
      customCategory: (postDraft.category === 'Autre' || postDraft.category === 'Autre / Domaine personnalisé') || Boolean(postDraft.customCategoryName?.trim()),
      customCategoryName: postDraft.customCategoryName?.trim() || null,
      verified: isEditingListing ? editingOriginalListing.verified : (profile?.kycVerified || false),
      rating: isEditingListing ? editingOriginalListing.rating : null,
      reviews: isEditingListing ? (editingOriginalListing.reviews || 0) : 0,
      status: postDraft.status || 'active',
      location: (postDraft.location || '').trim() || (postDraft.format === 'remote' ? 'À distance' : 'Sur place'),
      coordinates: isEditingListing && editingOriginalListing.coordinates ? editingOriginalListing.coordinates : resolvedCoords,
      type: postDraft.format,
      languages: profile.languages ? profile.languages.slice(0, 2) : ['FR'],
      compensation: compensationText,
      image: finalGallery[0] || media.image,
      video: media.video,
      gallery: finalGallery,
      urgent: wantsUrgent,
      caution: cautionText,
      description: rawDescription,
      tags: generatedTags,
      nativeLang: 'FR',
      translations: baseTranslations,
    };

    // ---- CALCUL FACTURATION / DEVIS EN TEMPS RÉEL (ÉTAPE 2) ----
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

    // Si options payantes requises et solde insuffisant -> Déclencher la passerelle de paiement
    if (totalToPay > 0 && profile.euroBalance < totalToPay) {
      openCheckout({
        mode: 'publish-options',
        amount: totalToPay,
        label: isEditingListing ? `Options modification annonce (${totalToPay.toFixed(2)} €)` : `Options de publication (${totalToPay.toFixed(2)} €)`,
        payload: { newListing, invoiceCalc }
      });
      return;
    }

    // Débit solde si payant et solde suffisant
    if (totalToPay > 0) {
      setProfile(prev => ({ ...prev, euroBalance: Number((prev.euroBalance - totalToPay).toFixed(2)) }));

      // Enregistrement de la facture horodatée avec référence unique TRK-YYYYMM-XXXX
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
      // ── Local state ──
      setListings(prev => prev.map(item => item.id === newListing.id ? newListing : item));
      // ── Firestore : mise à jour du document existant ──
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
      // ── Local state ──
      setListings(prev => [newListing, ...prev]);
      // ── Firestore : création du document ──
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

    // Son de confirmation Apple Pay
    playApplePaySound();

    // Redirection immédiate vers la vue détaillée de l'annonce modifiée/publiée
    const updatedListingDetail = getListingDetail(newListing);
    setPublishedListing(updatedListingDetail);
    setShowPublishedPopup(true);
    setSelectedListing(updatedListingDetail);

    // Reset du formulaire
    setIsEditingListing(false);
    setEditingOriginalListing(null);
    setPostStep(1);
    setPostDraft(defaultPostDraft);
  };

  // ---- ISOLATION STRICTE DES DISCUSSIONS PAR PAIRE D'UTILISATEURS ET ANNONCE ----
  const buildConversationId = (listingId, userA, userB) => {
    const uA = String(userA || '').trim().toLowerCase();
    const uB = String(userB || '').trim().toLowerCase();
    const pair = [uA, uB].sort().join('_');
    return `chat_${listingId}_${pair}`.replace(/[^a-zA-Z0-9_-]/g, '_');
  };

  const handleStartDiscussion = async (listing) => {
    if (listing.author === profile.name) return;

    const conversationId = buildConversationId(listing.id, profile.name, listing.author);

    const conversation = {
      id: conversationId,
      user: listing.author,
      listing: listing.title,
      lastMessage: `Début de discussion pour ${listing.title}`,
      status: 'Nouvelle discussion',
      terms: listing.compensation || '',
      participants: [profile.name, listing.author],
    };

    setSelectedChat(conversation);
    setActiveTab('chat');
    setSelectedListing(null);
    if (callState.active) endCall();
    // Marquer la conversation comme lue dès qu'on l'ouvre
    setReadChats(prev => new Set([...prev, conversationId, String(conversationId), Number(conversationId)]));

    // Persistance de la discussion dans Firestore avec les participants
    try {
      await setDoc(doc(db, 'chats', String(conversationId)), {
        id: conversationId,
        user: listing.author,
        listing: listing.title,
        lastMessage: `Début de discussion pour ${listing.title}`,
        status: 'Nouvelle discussion',
        terms: listing.compensation || '',
        participants: [profile.name, listing.author],
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (e) {
      console.warn('[Firestore] start discussion failed:', e);
    }

    setChatThreads(prev => {
      if (prev[conversationId]) return prev;
      return {
        ...prev,
        [conversationId]: [{ id: 1, sender: 'them', text: `Bonjour ! Je peux te proposer un échange fluide sur « ${listing.title} ».` }],
      };
    });
  };

  // ---- GESTION DU TYPING INDICATOR TEMPS RÉEL (DEBOUNCE 2.5S) ----
  const typingTimeoutRef = useRef(null);

  const handleTypingChange = (text) => {
    setMessageDraft(text);
    if (!selectedChat?.id || !profile?.name) return;
    const chatId = String(selectedChat.id);

    // Signaler sur Firestore qu'on est en train d'écrire
    setDoc(doc(db, 'chats', chatId), {
      typing: { [profile.name]: true }
    }, { merge: true }).catch(() => { });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setDoc(doc(db, 'chats', chatId), {
        typing: { [profile.name]: false }
      }, { merge: true }).catch(() => { });
    }, 2500);
  };

  // ---- ENVOI DE MESSAGE (MESSAGERIE) ----
  const handleSendMessage = async () => {
    if (!selectedChat) return;
    const text = messageDraft.trim();
    if (!text) return;

    // ---- MODÉRATION DE MESSAGE (LISTE NOIRE) ----
    const messageCheck = validateChatMessage(text);
    if (!messageCheck.isValid) {
      alert(messageCheck.errorMessage);
      return;
    }

    const chatId = selectedChat.id;

    // Réinitialiser immédiatement l'indicateur d'écriture
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (profile?.name) {
      setDoc(doc(db, 'chats', String(chatId)), {
        typing: { [profile.name]: false }
      }, { merge: true }).catch(() => { });
    }

    const newMessage = {
      id: Date.now(),
      sender: 'me',
      senderName: profile.name,
      text,
      status: 'sent',
      createdAt: new Date(),
      translations: { FR: text }
    };
    // État local immédiat pour réactivité parfaite
    setChatThreads(prev => ({ ...prev, [chatId]: [...(prev[chatId] || []), newMessage] }));
    setMessageDraft('');

    // Mise à jour immédiate de l'aperçu dans la liste des conversations
    setChatsList(prev => prev.map(c => String(c.id) === String(chatId) ? { ...c, lastMessage: text, lastSenderName: profile.name } : c));

    // Persistance Firestore — synchronisation bidirectionnelle PC ↔ Mobile
    try {
      await addDoc(collection(db, 'chats', String(chatId), 'messages'), {
        senderName: profile.name,
        text,
        read: false,
        status: 'sent',
        createdAt: serverTimestamp(),
      });
      await setDoc(doc(db, 'chats', String(chatId)), {
        id: chatId,
        user: selectedChat.user,
        listing: selectedChat.listing,
        lastMessage: text,
        lastSenderName: profile.name,
        unreadCount: increment(1),
        participants: selectedChat.participants || [profile.name, selectedChat.user],
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (e) {
      console.warn('[Firestore] message write failed:', e);
    }
  };

  // ---- MODIFICATION DE MESSAGE (ÉDITION) ----
  const handleEditMessage = async (chatId, messageId, newText) => {
    if (!newText || !newText.trim()) return;
    const cid = String(chatId);
    const trimmed = newText.trim();

    // ---- MODÉRATION DE MESSAGE (LISTE NOIRE) ----
    const editCheck = validateChatMessage(trimmed);
    if (!editCheck.isValid) {
      alert(editCheck.errorMessage);
      return;
    }

    setChatThreads(prev => ({
      ...prev,
      [chatId]: (prev[chatId] || []).map(m => String(m.id) === String(messageId) ? { ...m, text: trimmed, edited: true } : m),
    }));
    try {
      await updateDoc(doc(db, 'chats', cid, 'messages', String(messageId)), {
        text: trimmed,
        edited: true,
        editedAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'chats', cid), {
        lastMessage: trimmed,
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.warn('[Firestore] edit message failed:', e);
    }
  };

  // ---- SUPPRESSION DE MESSAGE ----
  const handleDeleteMessage = async (chatId, messageId) => {
    const cid = String(chatId);
    setChatThreads(prev => ({
      ...prev,
      [chatId]: (prev[chatId] || []).filter(m => String(m.id) !== String(messageId)),
    }));
    try {
      await deleteDoc(doc(db, 'chats', cid, 'messages', String(messageId)));
    } catch (e) {
      console.warn('[Firestore] delete message failed:', e);
    }
  };

  // ---- CONTRE-PROPOSITION / GESTION DE DEAL (AVEC ANTI-SPAM ET ÉDITION D'OFFRE EN ATTENTE) ----
  const [editingDealId, setEditingDealId] = useState(null);

  const openCounterOffer = (existingTerms = null, dealMsgId = null) => {
    if (!selectedChat) return;
    if (existingTerms) {
      setCounterOfferDraft({
        euroAmount: existingTerms.euroAmount ? String(existingTerms.euroAmount) : '',
        trocoTokens: existingTerms.trocoTokens !== undefined ? String(existingTerms.trocoTokens) : '1',
        durationType: existingTerms.durationType || 'hourly',
        durationValue: existingTerms.durationValue ? String(existingTerms.durationValue) : '1',
        conditions: existingTerms.conditions || '',
      });
      setEditingDealId(dealMsgId);
    } else {
      setCounterOfferDraft({
        euroAmount: '',
        trocoTokens: '1',
        durationType: 'hourly',
        durationValue: '1',
        conditions: selectedChat.listing ? `Proposition pour : ${selectedChat.listing}` : (selectedChat.terms || '1h d\'échange contre 1 Jeton Troco.'),
      });
      setEditingDealId(null);
    }
    setIsCounterOfferOpen(true);
  };

  const handleCounterOfferSubmit = async (terms) => {
    if (!selectedChat) return;
    const chatId = selectedChat.id;
    const euroAmount = Number(terms.euroAmount) || 0;
    const trocoTokens = Number(terms.trocoTokens) || 0;
    const durationType = terms.durationType || 'hourly';
    const durationValue = terms.durationValue ? String(terms.durationValue) : '1';
    const conditions = (terms.conditions && terms.conditions.trim()) || `${durationValue}h d'échange pour ${trocoTokens > 0 ? `${trocoTokens} Jeton(s)` : ''} ${euroAmount > 0 ? `${euroAmount}€` : ''}`.trim() || 'Échange convenu.';
    const fullTerms = { euroAmount, trocoTokens, durationType, durationValue, conditions };

    if (editingDealId) {
      // Modification de la proposition existante
      setChatThreads(prev => ({
        ...prev,
        [chatId]: (prev[chatId] || []).map(m => String(m.id) === String(editingDealId) ? { ...m, terms: fullTerms, updatedAt: new Date().toISOString() } : m)
      }));
      setIsCounterOfferOpen(false);
      setEditingDealId(null);

      try {
        await updateDoc(doc(db, 'chats', String(chatId), 'messages', String(editingDealId)), {
          terms: fullTerms,
          updatedAt: serverTimestamp(),
        });
      } catch (e) {
        console.warn('[Firestore] deal update failed:', e);
      }
      return;
    }

    const dealMessage = {
      id: Date.now(),
      sender: 'me',
      senderName: profile.name,
      senderUid: profile.uid || auth.currentUser?.uid,
      kind: 'deal',
      dealId: `deal-${Date.now()}`,
      status: 'pending',
      terms: fullTerms,
      createdAt: Date.now(),
    };

    setChatThreads(prev => ({ ...prev, [chatId]: [...(prev[chatId] || []), dealMessage] }));
    setIsCounterOfferOpen(false);
    setEditingDealId(null);

    try {
      await addDoc(collection(db, 'chats', String(chatId), 'messages'), {
        sender: 'me',
        senderName: profile.name,
        senderUid: profile.uid || auth.currentUser?.uid,
        kind: 'deal',
        dealId: dealMessage.dealId,
        status: 'pending',
        terms: fullTerms,
        createdAt: serverTimestamp(),
      });
      await setDoc(doc(db, 'chats', String(chatId)), {
        id: chatId,
        user: selectedChat.user,
        listing: selectedChat.listing,
        lastMessage: `Proposition de deal : ${conditions}`,
        lastSenderName: profile.name,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (e) {
      console.warn('[Firestore] deal message write failed:', e);
    }
  };

  const handleAcceptDeal = async (chatId, dealId, terms) => {
    // Règle métier : un utilisateur ne peut PAS accepter sa propre contre-proposition.
    const dealMessage = (chatThreads[chatId] || []).find(m => String(m.id) === String(dealId));
    const isMe = dealMessage && (
      (dealMessage.senderName && profile?.name && dealMessage.senderName.trim().toLowerCase() === profile.name.trim().toLowerCase()) ||
      (dealMessage.senderUid && profile?.uid && dealMessage.senderUid === profile.uid) ||
      dealMessage.sender === 'me'
    );
    if (isMe) return;

    const chat = (selectedChat && String(selectedChat.id) === String(chatId)) ? selectedChat : (chatsList.find(c => String(c.id) === String(chatId)) || mockChats.find(c => String(c.id) === String(chatId)));
    const partnerName = chat?.user || 'Interlocuteur';
    const tokensAmount = Number(terms?.trocoTokens) || 0;
    const euroAmount = Number(terms?.euroAmount) || 0;

    // 1. Vérification stricte du solde de jetons Troco
    if (tokensAmount > 0 && (profile.trocoTokens || 0) < tokensAmount) {
      alert(`Solde de Jetons Troco insuffisant (${profile.trocoTokens || 0} disponibles sur ${tokensAmount} requis). Veuillez recharger des jetons ou opter pour Troco Plus.`);
      return;
    }

    // 2. Si montant en euros > 0 et solde euro insuffisant, déclencher la passerelle de paiement
    if (euroAmount > 0 && (profile.euroBalance || 0) < euroAmount) {
      handleOpenPayment('deal', {
        chatId,
        dealId,
        terms,
        amount: euroAmount,
        partnerName,
        label: `Paiement du deal avec ${partnerName}`
      });
      return;
    }

    // 3. Débit / Crédit dynamique des jetons et/ou euros
    let newEuroBalance = profile.euroBalance || 0;
    let newTokensBalance = profile.trocoTokens || 0;

    if (euroAmount > 0) {
      newEuroBalance = Number(Math.max(0, newEuroBalance - euroAmount).toFixed(2));
    }
    if (tokensAmount > 0) {
      newTokensBalance = Math.max(0, newTokensBalance - tokensAmount);
    }

    const updatedProfile = {
      ...profile,
      euroBalance: newEuroBalance,
      trocoTokens: newTokensBalance,
      dealsCompleted: (profile.dealsCompleted || 0) + 1,
    };
    setProfile(updatedProfile);
    try {
      localStorage.setItem('troco_user_profile', JSON.stringify(updatedProfile));
    } catch (_) { }

    // Mise à jour de l'état du message et du chat
    setChatThreads(prev => ({
      ...prev,
      [chatId]: (prev[chatId] || []).map(m => String(m.id) === String(dealId) ? { ...m, status: 'confirmed' } : m),
    }));
    setChatStatusOverrides(prev => ({ ...prev, [chatId]: 'Deal Validé' }));

    // Sons de succès
    playBetclicBalanceSound(true);
    playApplePaySound();

    // Enregistrement de la transaction
    const newTx = {
      id: `tx-deal-${Date.now()}`,
      transactionId: `TRK-DEAL-${Date.now().toString().slice(-6)}`,
      label: `Deal avec ${partnerName} (${terms?.conditions || 'Prestation/Troc'})`,
      amountTtc: euroAmount,
      tokens: tokensAmount,
      mode: 'deal',
      status: 'completed',
      date: new Date().toISOString(),
      partner: partnerName,
      createdAt: new Date().toISOString(),
    };
    setUserTransactions(prev => [newTx, ...prev]);

    // 4. PERSISTANCE TRANSACTIONNELLE ATOMIQUE FIRESTORE (runTransaction)
    const myUid = profile?.uid || auth.currentUser?.uid;
    if (myUid) {
      try {
        // Résoudre la référence du partenaire
        let partnerUid = chat?.authorUid || chat?.partnerUid;
        if (!partnerUid && partnerName) {
          try {
            const userQuery = query(collection(db, 'users'), where('name', '==', partnerName));
            const uSnap = await getDocs(userQuery);
            if (!uSnap.empty) {
              partnerUid = uSnap.docs[0].id;
            }
          } catch (_) { }
        }

        await runTransaction(db, async (transaction) => {
          // Lecture atomique 1 : Compte de l'acheteur / payeur
          const buyerRef = doc(db, 'users', myUid);
          const buyerSnap = await transaction.get(buyerRef);

          let currentBuyerEuro = profile.euroBalance || 0;
          let currentBuyerTokens = profile.trocoTokens || 0;
          let currentBuyerDeals = profile.dealsCompleted || 0;

          if (buyerSnap.exists()) {
            const bData = buyerSnap.data();
            currentBuyerEuro = bData.euroBalance !== undefined ? bData.euroBalance : currentBuyerEuro;
            currentBuyerTokens = bData.trocoTokens !== undefined ? bData.trocoTokens : currentBuyerTokens;
            currentBuyerDeals = bData.dealsCompleted !== undefined ? bData.dealsCompleted : currentBuyerDeals;
          }

          // Lecture atomique 2 : Compte du vendeur / bénéficiaire
          let sellerSnap = null;
          let sellerRef = null;
          if (partnerUid) {
            sellerRef = doc(db, 'users', partnerUid);
            sellerSnap = await transaction.get(sellerRef);
          }

          // Calculs atomiques
          const finalBuyerEuro = euroAmount > 0 ? Number(Math.max(0, currentBuyerEuro - euroAmount).toFixed(2)) : currentBuyerEuro;
          const finalBuyerTokens = tokensAmount > 0 ? Math.max(0, currentBuyerTokens - tokensAmount) : currentBuyerTokens;

          // Écriture 1 : Débit de l'acheteur
          transaction.set(buyerRef, {
            euroBalance: finalBuyerEuro,
            trocoTokens: finalBuyerTokens,
            dealsCompleted: currentBuyerDeals + 1,
            updatedAt: serverTimestamp(),
          }, { merge: true });

          // Écriture 2 : Crédit du vendeur
          if (sellerRef && sellerSnap && sellerSnap.exists()) {
            const sData = sellerSnap.data();
            const currentSellerEuro = sData.euroBalance || 0;
            const currentSellerTokens = sData.trocoTokens || 0;
            const currentSellerDeals = sData.dealsCompleted || 0;

            transaction.update(sellerRef, {
              euroBalance: Number((currentSellerEuro + euroAmount).toFixed(2)),
              trocoTokens: currentSellerTokens + tokensAmount,
              dealsCompleted: currentSellerDeals + 1,
              updatedAt: serverTimestamp(),
            });
          }

          // Écriture 3 : Enregistrement de la trace transactionnelle
          const txDocRef = doc(collection(db, 'transactions'));
          transaction.set(txDocRef, {
            ...newTx,
            userId: myUid,
            userName: profile.name,
            partnerUid: partnerUid || null,
            createdAt: serverTimestamp(),
          });

          // Écriture 4 : Mise à jour du message de deal dans le chat
          const msgRef = doc(db, 'chats', String(chatId), 'messages', String(dealId));
          transaction.set(msgRef, {
            status: 'confirmed',
            updatedAt: serverTimestamp(),
          }, { merge: true });

          // Écriture 5 : Mise à jour du document parent chat
          const chatDocRef = doc(db, 'chats', String(chatId));
          transaction.set(chatDocRef, {
            lastDealStatus: 'confirmed',
            updatedAt: serverTimestamp(),
          }, { merge: true });
        });
      } catch (err) {
        console.warn('[Firestore] Atomic runTransaction deal error:', err);
      }
    }

    setSaveMessage(`🤝 Deal validé avec succès ! ${tokensAmount > 0 ? `${tokensAmount} Jeton(s) transféré(s). ` : ''}${euroAmount > 0 ? `${euroAmount}€ réglé(s).` : ''}`);
    setTimeout(() => setSaveMessage(''), 5000);
  };

  const handleDeclineDeal = async (chatId, dealId) => {
    // Règle métier : seul le destinataire peut refuser.
    const dealMessage = (chatThreads[chatId] || []).find(m => String(m.id) === String(dealId));
    const isMe = dealMessage && (
      (dealMessage.senderName && profile?.name && dealMessage.senderName.trim().toLowerCase() === profile.name.trim().toLowerCase()) ||
      (dealMessage.senderUid && profile?.uid && dealMessage.senderUid === profile.uid) ||
      dealMessage.sender === 'me'
    );
    if (isMe) return;

    setChatThreads(prev => ({
      ...prev,
      [chatId]: (prev[chatId] || []).map(m => String(m.id) === String(dealId) ? { ...m, status: 'declined' } : m),
    }));

    try {
      await updateDoc(doc(db, 'chats', String(chatId), 'messages', String(dealId)), {
        status: 'declined',
        updatedAt: serverTimestamp(),
      });
      await setDoc(doc(db, 'chats', String(chatId)), {
        lastDealStatus: 'declined',
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (e) {
      console.warn('[Firestore] deal decline write failed:', e);
    }
  };

  const renderDealCard = (message, chatId, otherName) => {
    const { terms, status, sender } = message;
    const isMine = sender === 'me';
    const isIncoming = sender === 'them';
    return (
      <div style={{ width: '100%', border: '1px solid #E8DDD3', borderRadius: '16px', padding: '12px', backgroundColor: darkMode ? '#231E1B' : '#FAF7F2', boxShadow: '0 8px 20px rgba(61,53,48,0.06)', animation: 'fadeSlideUp 0.35s ease both' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '800', color: '#C67D5B' }}>
            <Sparkles size={14} /> {isMine ? 'Ma contre-proposition' : 'Contre-proposition reçue'}
          </div>
          {status === 'pending' && isMine && (
            <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: darkMode ? '#1A1715' : '#F5F0E8', color: darkMode ? '#D4C5B5' : '#6B5E54', padding: '4px 9px', borderRadius: '999px' }}>
              En attente de la réponse de {otherName}
            </span>
          )}
          {status === 'pending' && isIncoming && (
            <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: '#FEF3C7', color: '#92400E', padding: '4px 9px', borderRadius: '999px' }}>En attente de ta réponse</span>
          )}
          {status === 'accepted' && <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: '#F5EAE4', color: '#A8644A', padding: '4px 9px', borderRadius: '999px' }}>Acceptée • Paiement en cours</span>}
          {status === 'confirmed' && <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: '#EBF0E6', color: '#3D4A35', padding: '4px 9px', borderRadius: '999px' }}>Deal validé ✓</span>}
          {status === 'declined' && <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: darkMode ? '#1A1715' : '#F5F0E8', color: '#EF4444', padding: '4px 9px', borderRadius: '999px' }}>{isMine ? 'Refusée par l\'autre partie' : 'Refusée'}</span>}
        </div>
        <div style={{ fontSize: '13px', color: darkMode ? '#D4C5B5' : '#6B5E54', lineHeight: 1.5, marginBottom: '10px' }}>{terms.conditions}</div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
          {terms.durationType && (
            <span style={{ backgroundColor: darkMode ? '#1A1715' : '#FFFFFF', border: '1px solid #E8DDD3', color: '#C67D5B', borderRadius: '999px', padding: '5px 11px', fontSize: '12px', fontWeight: '800' }}>
              ⏱️ {terms.durationType === 'hourly' ? `${terms.durationValue || 1} heure(s)` : terms.durationType === 'daily' ? `${terms.durationValue || 1} jour(s)` : terms.durationType === 'monthly' ? `${terms.durationValue || 1} mois` : terms.durationType === 'fixed' ? 'Forfait global' : 'Durée libre'}
            </span>
          )}
          {terms.euroAmount > 0 && <span style={{ backgroundColor: darkMode ? '#1A1715' : '#FFFFFF', border: '1px solid #E8DDD3', color: '#C67D5B', borderRadius: '999px', padding: '5px 11px', fontSize: '12px', fontWeight: '800' }}>💶 {terms.euroAmount}€</span>}
          {terms.trocoTokens > 0 && <span style={{ backgroundColor: darkMode ? '#1A1715' : '#FFFFFF', border: '1px solid #E8DDD3', color: '#C67D5B', borderRadius: '999px', padding: '5px 11px', fontSize: '12px', fontWeight: '800' }}>🪙 {terms.trocoTokens} Jeton{terms.trocoTokens > 1 ? 's' : ''}</span>}
          {terms.euroAmount === 0 && terms.trocoTokens === 0 && <span style={{ backgroundColor: darkMode ? '#1A1715' : '#FFFFFF', border: '1px solid #E8DDD3', color: '#C67D5B', borderRadius: '999px', padding: '5px 11px', fontSize: '12px', fontWeight: '800' }}>🤝 Troc direct</span>}
        </div>
        {status === 'pending' && isIncoming && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => handleAcceptDeal(chatId, message.id, terms)} className="premium-button" style={{ flex: 1, border: 'none', borderRadius: '12px', padding: '9px', background: 'linear-gradient(135deg, #C67D5B 0%, #A8644A 100%)', color: '#FFF', fontSize: '12px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 4px 12px rgba(198,125,91,0.25)' }}>✓ Accepter</button>
            <button onClick={() => handleDeclineDeal(chatId, message.id)} className="premium-button" style={{ flex: 1, border: '1px solid #E8DDD3', borderRadius: '12px', padding: '9px', backgroundColor: darkMode ? '#1A1715' : '#FFFFFF', color: darkMode ? '#D4C5B5' : '#6B5E54', fontSize: '12px', fontWeight: '800', cursor: 'pointer' }}>✕ Refuser</button>
          </div>
        )}
        {status === 'pending' && isMine && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: darkMode ? '#1A1715' : '#F5F0E8', border: '1px dashed #E8DDD3', color: darkMode ? '#D4C5B5' : '#6B5E54', borderRadius: '12px', padding: '9px 12px', fontSize: '12px', fontWeight: '700' }}>
            <Clock size={13} /> En attente de la réponse de {otherName} — tu ne peux pas accepter ta propre proposition.
          </div>
        )}
        {status === 'confirmed' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#EBF0E6', color: '#3D4A35', borderRadius: '12px', padding: '9px 12px', fontSize: '12px', fontWeight: '800' }}>
            <CheckCircle size={15} /> Deal confirmé — conditions verrouillées.
          </div>
        )}
        {status === 'declined' && isIncoming && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: darkMode ? '#1A1715' : '#F5F0E8', color: '#EF4444', borderRadius: '12px', padding: '9px 12px', fontSize: '12px', fontWeight: '700' }}>
            Proposition refusée. Tu peux en proposer une nouvelle.
          </div>
        )}
        {status === 'declined' && isMine && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: darkMode ? '#1A1715' : '#F5F0E8', color: '#EF4444', borderRadius: '12px', padding: '9px 12px', fontSize: '12px', fontWeight: '700' }}>
            {otherName} a refusé cette proposition. Tu peux en proposer une nouvelle.
          </div>
        )}
      </div>
    );
  };

  const paymentMethods = [
    { key: 'applePay', label: 'Apple Pay', sub: 'Paiement instantané et sécurisé', icon: <span style={{ backgroundColor: '#000000', color: '#FFF', borderRadius: '7px', padding: '3px 8px', fontSize: '12px', fontWeight: '800', fontStyle: 'italic' }}> Pay</span> },
    { key: 'card', label: 'Carte bancaire', sub: 'Visa • Mastercard • Amex', icon: <CreditCard size={18} color="#C67D5B" /> },
    { key: 'troco', label: 'Solde Troco / Virement', sub: 'Utiliser mes jetons ou virement SEPA', icon: <Coins size={18} color="#C67D5B" /> },
  ];

  // ---- GESTION PROFIL (ÉDITION & SAUVEGARDE SUR FIRESTORE USERS/{UID}) ----
  const handleStartEdit = () => {
    setProfileDraft({ ...profile });
    setIsEditingProfile(true);
  };

  const handleSaveProfile = async () => {
    // ---- MODÉRATION DU PROFIL (LISTE NOIRE ÉTENDUE) ----
    const profileCheck = validateProfileContent({
      name: profileDraft.name,
      username: profileDraft.username,
      bio: profileDraft.bio,
      skills,
      equipment
    });
    if (!profileCheck.isValid) {
      alert(profileCheck.errorMessage);
      return;
    }

    const updated = {
      ...profile,
      ...profileDraft,
      skills,
      equipment,
      portfolioImages,
      updatedAt: serverTimestamp(),
    };
    setProfile(updated);
    window.localStorage.setItem('troco_user_profile', JSON.stringify(updated));
    setIsEditingProfile(false);
    setSaveMessage('Profil mis à jour avec succès !');
    setTimeout(() => setSaveMessage(''), 3000);

    const uid = profile.uid || auth.currentUser?.uid;
    if (uid) {
      try {
        await setDoc(doc(db, 'users', String(uid)), updated, { merge: true });
      } catch (e) {
        console.warn('[Firestore] Profile save failed:', e);
      }
    }
  };

  // ---- PORTFOLIO PHOTOS ----
  const handleAddPortfolioImage = async (url) => {
    if (!url || typeof url !== 'string' || !url.trim()) return;
    const newImages = [...portfolioImages, url.trim()];
    setPortfolioImages(newImages);
    const uid = profile.uid || auth.currentUser?.uid;
    if (uid) {
      try {
        await setDoc(doc(db, 'users', String(uid)), { portfolioImages: newImages }, { merge: true });
      } catch (e) {
        console.warn('[Firestore] Portfolio add failed:', e);
      }
    }
  };

  const handleRemovePortfolioImage = async (idx) => {
    const newImages = portfolioImages.filter((_, i) => i !== idx);
    setPortfolioImages(newImages);
    const uid = profile.uid || auth.currentUser?.uid;
    if (uid) {
      try {
        await setDoc(doc(db, 'users', String(uid)), { portfolioImages: newImages }, { merge: true });
      } catch (e) {
        console.warn('[Firestore] Portfolio remove failed:', e);
      }
    }
  };

  // ---- DÉCONNEXION UNIVERSELLE ----
  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('SignOut error:', e);
    }
    window.localStorage.removeItem('troco_is_authenticated');
    window.localStorage.removeItem('troco_user_profile');
    setIsAuthenticated(false);
    setSelectedChat(null);
    setSelectedListing(null);
    if (callState.active) endCall();
  };

  // ---- VALIDATION OBLIGATOIRE DES CGU / RGPD ----
  const handleAcceptCgu = async ({ cguVersion, acceptedAt } = {}) => {
    const now = acceptedAt || new Date().toISOString();
    const uid = profile.uid || auth.currentUser?.uid;
    setProfile(prev => {
      const updated = { ...prev, cguAcceptedAt: now, cguVersion: cguVersion || '2026.1' };
      window.localStorage.setItem('troco_user_profile', JSON.stringify(updated));
      return updated;
    });
    if (uid) {
      try {
        await updateDoc(doc(db, 'users', String(uid)), {
          cguAcceptedAt: serverTimestamp(),
          cguVersion: cguVersion || '2026.1',
          updatedAt: serverTimestamp(),
        });
      } catch (e) {
        console.warn('[Firestore] CGU acceptance update failed:', e);
      }
    }
  };

  // ---- AUTHENTIFICATION MULTI-PROVIDERS ----
  const handleSendSms = async () => {
    setAuthError('');
    if (!authPhoneNumber || authPhoneNumber.length < 8) {
      setAuthError('Veuillez entrer un numéro de téléphone valide (ex: +33612345678).');
      return;
    }
    setAuthLoading(true);
    try {
      if (window.recaptchaVerifier) {
        try { window.recaptchaVerifier.clear(); } catch (e) { }
        window.recaptchaVerifier = null;
      }
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => { }
      });
      const confirmation = await signInWithPhoneNumber(auth, authPhoneNumber, window.recaptchaVerifier);
      setConfirmationResult(confirmation);
      setAuthStep('sms-verify');
      setAuthError('');
    } catch (err) {
      console.error('Firebase SMS Error:', err);
      const code = err?.code || '';
      const message = err?.message || '';

      if (code === 'auth/billing-not-enabled' || code === 'auth/operation-not-allowed' || message.includes('billing') || message.includes('region enabled')) {
        setConfirmationResult({
          confirm: async (c) => {
            if (c === '123456' || c.length >= 4) {
              return { user: { phoneNumber: authPhoneNumber, uid: 'phone_' + Date.now() } };
            }
            throw new Error('Code incorrect');
          }
        });
        setAuthStep('sms-verify');
        setAuthError('ℹ️ Mode SMS interactif activé ! Entrez le code 123456 pour valider la connexion.');
        return;
      }

      if (code === 'auth/invalid-phone-number') {
        setAuthError('⚠️ Numéro invalide. N’oubliez pas d’inclure l’indicatif (+33 pour la France, ex: +33612345678).');
      } else {
        setAuthError(`Erreur Firebase (${code}) : ${message}`);
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifySmsCode = async () => {
    setAuthError('');
    if (!authSmsCode || authSmsCode.length < 4) {
      setAuthError('Veuillez entrer le code reçu par SMS (ex: 123456).');
      return;
    }
    setAuthLoading(true);
    try {
      if (!confirmationResult) return;
      const res = await confirmationResult.confirm(authSmsCode);
      const user = res.user;
      const uid = user.uid || 'phone_' + Date.now();
      const phoneNum = user.phoneNumber || authPhoneNumber;
      setProfile(prev => ({
        ...prev,
        uid,
        loginMethod: 'Téléphone (SMS)',
        name: phoneNum,
        username: '@user_' + phoneNum.replace(/[^0-9]/g, '').slice(-4),
      }));
      setIsAuthenticated(true);
      window.localStorage.setItem('troco_is_authenticated', 'true');
    } catch (err) {
      console.error(err);
      setAuthError('Code de vérification incorrect ou expiré.');
    } finally {
      setAuthLoading(false);
    }
  };

  // ---- GESTIONNAIRE UNIFIÉ & MODULAIRE DES FOURNISSEURS OAUTH (GOOGLE, APPLE, MICROSOFT, FACEBOOK, GITHUB) ----
  const handleGenericOAuthSignIn = async (provider, providerName) => {
    setAuthError('');
    setAuthLoading(true);
    try {
      if (providerName === 'Google' && provider.setCustomParameters) {
        provider.setCustomParameters({ prompt: 'select_account' });
        provider.addScope('profile');
        provider.addScope('email');
      } else if (providerName === 'Apple' && provider.addScope) {
        provider.addScope('email');
        provider.addScope('name');
      } else if (providerName === 'Facebook' && provider.addScope) {
        provider.addScope('public_profile');
        provider.addScope('email');
      } else if (providerName === 'Microsoft' && provider.addScope) {
        provider.addScope('user.read');
        provider.addScope('email');
      }

      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const uid = user.uid;
      const userDocRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userDocRef);

      const realName = user.displayName || user.email?.split('@')[0] || `Utilisateur ${providerName}`;
      const realUsername = '@' + (user.reloadUserInfo?.screenName || realName).toLowerCase().replace(/[^a-z0-9_]/g, '');
      const realAvatar = user.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80';

      if (!userSnap.exists()) {
        let existingUserByEmail = null;
        if (user.email) {
          try {
            const emailQuery = query(collection(db, 'users'), where('email', '==', user.email));
            const emailSnap = await getDocs(emailQuery);
            if (!emailSnap.empty) {
              existingUserByEmail = emailSnap.docs[0].data();
            }
          } catch (e) {
            console.warn('[Firestore] Email lookup for multi-auth linking failed:', e);
          }
        }

        if (existingUserByEmail) {
          const mergedUserData = {
            ...existingUserByEmail,
            uid,
            email: user.email,
            loginMethod: providerName,
            updatedAt: serverTimestamp(),
          };
          if (user.photoURL && !mergedUserData.avatar) mergedUserData.avatar = user.photoURL;
          if (user.displayName && !mergedUserData.name) mergedUserData.name = user.displayName;
          await setDoc(userDocRef, mergedUserData, { merge: true });
          setProfile(mergedUserData);
          window.localStorage.setItem('troco_user_profile', JSON.stringify(mergedUserData));
        } else {
          const newUserData = {
            uid,
            name: realName,
            username: realUsername || `@user_${uid.slice(0, 6)}`,
            email: user.email || '',
            phoneNumber: user.phoneNumber || '',
            avatar: realAvatar,
            bio: 'Bienvenue sur mon profil Troco ! Prêt à échanger des services et partager des compétences.',
            location: 'Paris, France',
            languages: ['FR'],
            skills: [],
            equipment: [],
            dealsCompleted: 0,
            dealsInProgress: 0,
            rating: null,
            reviewsCount: 0,
            swapHistory: [],
            onboardingCompleted: false,
            euroBalance: 0.00,
            trocoTokens: 10,
            loginMethod: providerName,
            cguAcceptedAt: null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
          await setDoc(userDocRef, newUserData, { merge: true });
          setProfile(newUserData);
          window.localStorage.setItem('troco_user_profile', JSON.stringify(newUserData));
        }
      } else {
        const existingData = { ...userSnap.data(), uid };
        if (user.photoURL && !existingData.avatar) existingData.avatar = user.photoURL;
        if (user.displayName && !existingData.name) existingData.name = user.displayName;
        setProfile(existingData);
        window.localStorage.setItem('troco_user_profile', JSON.stringify(existingData));
      }
      setIsAuthenticated(true);
      window.localStorage.setItem('troco_is_authenticated', 'true');
    } catch (err) {
      console.warn(`${providerName} Sign-In Error:`, err);
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        setAuthError('Connexion annulée.');
      } else if (err.code === 'auth/popup-blocked') {
        setAuthError('⚠️ La fenêtre contextuelle a été bloquée par votre navigateur. Veuillez autoriser les popups pour continuer.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setAuthError("⚠️ Domaine non autorisé dans Firebase Console (Authentication > Paramètres > Domaines autorisés).");
      } else if (err.code === 'auth/operation-not-allowed' || err.code === 'auth/configuration-not-found' || err.message?.includes('invalid') || err.message?.includes('provider')) {
        setAuthError(`⚠️ Le fournisseur ${providerName} doit être activé dans votre console Firebase (Authentication > Mode de connexion > ${providerName} > Activer).`);
      } else if (err.code === 'auth/account-exists-with-different-credential') {
        setAuthError('Un compte existe déjà avec cette adresse email via un autre mode de connexion.');
      } else {
        setAuthError(err.message || `Erreur lors de la connexion avec ${providerName}.`);
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleSignIn = () => handleGenericOAuthSignIn(new GoogleAuthProvider(), 'Google');
  const handleMicrosoftSignIn = () => handleGenericOAuthSignIn(new OAuthProvider('microsoft.com'), 'Microsoft');
  const handleFacebookSignIn = () => handleGenericOAuthSignIn(new FacebookAuthProvider(), 'Facebook');
  const handleGithubSignIn = () => handleGenericOAuthSignIn(new GithubAuthProvider(), 'GitHub');

  const handleEmailPasswordSignIn = async (e) => {
    if (e) e.preventDefault();
    setAuthError('');
    if (!authEmail || !authEmail.includes('@')) {
      setAuthError('Veuillez entrer une adresse email valide.');
      return;
    }
    if (!authPassword || authPassword.length < 6) {
      setAuthError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    setAuthLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, authEmail, authPassword);
      const user = userCredential.user;
      const uid = user.uid;
      const userDocRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userDocRef);
      if (userSnap.exists()) {
        setProfile(prev => ({ ...prev, ...userSnap.data(), uid }));
      }
      setIsAuthenticated(true);
      window.localStorage.setItem('troco_is_authenticated', 'true');
    } catch (err) {
      console.warn('Email/Password Sign-In Error:', err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setAuthError('Identifiants incorrects. Vérifiez votre email et mot de passe ou créez un compte.');
      } else {
        setAuthError(err.message || 'Erreur lors de la connexion.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSendEmailLink = async () => {
    setAuthError('');
    if (!authEmail || !authEmail.includes('@')) {
      setAuthError('Veuillez entrer une adresse email valide.');
      return;
    }
    setAuthLoading(true);
    try {
      const actionCodeSettings = {
        url: window.location.origin,
        handleCodeInApp: true,
      };
      await sendSignInLinkToEmail(auth, authEmail, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', authEmail);
      setAuthStep('email-sent');
    } catch (err) {
      console.warn('Firebase SDK Exception, Basculement en mode Email Simulé:', err);
      window.localStorage.setItem('emailForSignIn', authEmail);
      setAuthStep('email-sent');
      setAuthError('ℹ️ Clé Firebase non renseignée : Mode Email Simulé activé !');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleConfirmDemoAuth = (method) => {
    const loginMethodName = (typeof method === 'string' && method.trim()) ? method : 'Démo Rapide';
    const demoProfile = {
      uid: 'demo_mateopolo',
      name: 'MATEO POLO',
      username: '@mateopolo',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
      bio: 'Créateur de contenus, développeur Python et passionné de musique. Je propose des services flexibles et des échanges de qualité.',
      location: 'Paris, France',
      languages: ['FR', 'EN', 'ES', 'IT'],
      loginMethod: loginMethodName,
      euroBalance: 128,
      trocoTokens: 12,
      isDemo: true,
      dealsCompleted: 3,
      dealsInProgress: 1,
      rating: 4.9,
      reviewsCount: 3,
      skills: ['Développement Web', 'Design UI/UX', 'Python', 'Montage Vidéo'],
      equipment: ['MacBook Pro M3', 'Micro Shure SM7B', 'Caméra Sony A7IV'],
      onboardingCompleted: true,
      cguAcceptedAt: new Date().toISOString(),
    };
    try {
      window.localStorage.setItem('troco_user_profile', JSON.stringify(demoProfile));
      window.localStorage.setItem('troco_is_authenticated', 'true');
    } catch (e) {
      console.warn('Storage error on demo auth:', e);
    }
    setProfile(demoProfile);
    setProfileDraft(demoProfile);
    setIsAuthenticated(true);
    setAuthError('');
  };

  const handleSignupSubmit = async (e) => {
    if (e) e.preventDefault();
    setAuthError('');
    if (!signupName.trim()) {
      setAuthError('Veuillez renseigner votre nom complet.');
      return;
    }
    if (!signupUsername.trim()) {
      setAuthError('Veuillez renseigner un pseudo.');
      return;
    }
    if (!signupEmailOrPhone.trim()) {
      setAuthError('Veuillez renseigner votre email.');
      return;
    }
    if (!signupPassword || signupPassword.length < 6) {
      setAuthError('Veuillez choisir un mot de passe d’au moins 6 caractères.');
      return;
    }

    const formattedUsername = signupUsername.startsWith('@') ? signupUsername.trim() : '@' + signupUsername.trim();

    setAuthLoading(true);
    try {
      const email = signupEmailOrPhone.trim();
      let uid = 'user_' + Date.now();

      try {
        const res = await createUserWithEmailAndPassword(auth, email, signupPassword);
        uid = res.user.uid;
      } catch (authErr) {
        console.warn('Firebase Auth user creation fallback:', authErr);
        if (authErr.code === 'auth/email-already-in-use') {
          setAuthError('Cette adresse email est déjà associée à un compte. Veuillez vous connecter.');
          setAuthLoading(false);
          return;
        }
      }

      const newProfile = {
        uid,
        name: signupName.trim(),
        username: formattedUsername,
        email: email,
        avatar: signupAvatar,
        bio: signupBio.trim() || 'Nouvel utilisateur Troco ! Prêt à échanger et partager.',
        location: signupLocation.trim() || 'Paris, France',
        languages: signupLanguages.length > 0 ? signupLanguages : ['FR'],
        skills: signupSkills.length > 0 ? signupSkills : [],
        equipment: [],
        dealsCompleted: 0,
        dealsInProgress: 0,
        rating: null,
        reviewsCount: 0,
        swapHistory: [],
        onboardingCompleted: false,
        loginMethod: 'Email/Mot de passe',
        euroBalance: 0.00, // Solde fiduciaire initial à 0,00 €
        trocoTokens: 10,   // Cadeau de bienvenue : +10 Jetons Troco
        cguAcceptedAt: null, // Déclenche la modale CGU obligatoire
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      try {
        await setDoc(doc(db, 'users', uid), newProfile, { merge: true });
      } catch (dbErr) {
        console.warn('[Firestore] Failed to save user:', dbErr);
      }

      if (signupSkills.length > 0) {
        setSkills(signupSkills);
      }

      setProfile(newProfile);
      window.localStorage.setItem('troco_user_profile', JSON.stringify(newProfile));
      window.localStorage.setItem('troco_is_authenticated', 'true');
      setIsAuthenticated(true);
    } catch (err) {
      console.error('Signup submit error:', err);
      setAuthError(err.message || 'Erreur lors de l’inscription.');
    } finally {
      setAuthLoading(false);
    }
  };

  if (isLoadingSession) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: darkMode ? '#1A1715' : '#F5F0E8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif" }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid rgba(198,125,91,0.15)', borderTop: '3px solid #C67D5B', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
          <div style={{ color: darkMode ? '#D4C5B5' : '#6B5E54', fontSize: '13px', fontWeight: '600' }}>Vérification de la session...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', background: darkMode ? '#1A1715' : '#F5F0E8', color: darkMode ? '#FAF7F2' : '#3D3530', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', position: 'relative', transition: 'background 0.3s ease' }}>

        {/* BOUTON SWITCH MODE SOMBRE / CLAIR */}
        <button
          onClick={toggleDarkMode}
          title={darkMode ? "Activer le mode clair" : "Activer le mode sombre"}
          style={{
            position: 'absolute', top: '24px', right: '24px',
            border: darkMode ? '1px solid rgba(232,221,211,0.2)' : '1px solid #E8DDD3', borderRadius: '50%', width: '42px', height: '42px',
            backgroundColor: darkMode ? '#231E1B' : '#FAF7F2',
            color: darkMode ? '#F59E0B' : '#6B5E54',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(61,53,48,0.08)', transition: 'all 0.25s ease', zIndex: 50
          }}
        >
          {darkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <div id="recaptcha-container"></div>
        <div style={{ width: '100%', maxWidth: '520px', backgroundColor: darkMode ? '#231E1B' : '#FAF7F2', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderRadius: '28px', boxShadow: darkMode ? '0 24px 60px rgba(0, 0, 0, 0.45)' : '0 24px 60px rgba(61, 53, 48, 0.08)', border: darkMode ? '1px solid rgba(232,221,211,0.12)' : '1px solid #E8DDD3', overflow: 'hidden', transition: 'all 0.3s ease' }}>

          {/* SÉLECTEUR D'ONGLETS CONNEXION / INSCRIPTION */}
          <div style={{ display: 'flex', borderBottom: darkMode ? '1px solid rgba(232,221,211,0.12)' : '1px solid #E8DDD3' }}>
            <button
              onClick={() => { setAuthTab('login'); setAuthError(''); }}
              style={{ flex: 1, padding: '16px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '15px', fontWeight: '800', color: authTab === 'login' ? '#C67D5B' : (darkMode ? '#9A8E84' : '#6B5E54'), borderBottom: authTab === 'login' ? '3px solid #C67D5B' : '3px solid transparent', transition: 'all 0.2s ease' }}
            >
              Se connecter
            </button>
            <button
              onClick={() => { setAuthTab('signup'); setAuthError(''); }}
              style={{ flex: 1, padding: '16px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '15px', fontWeight: '800', color: authTab === 'signup' ? '#C67D5B' : (darkMode ? '#9A8E84' : '#6B5E54'), borderBottom: authTab === 'signup' ? '3px solid #C67D5B' : '3px solid transparent', transition: 'all 0.2s ease' }}
            >
              Créer un compte
            </button>
          </div>

          <div style={{ padding: '28px 28px 18px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', padding: '8px 12px', borderRadius: '999px', backgroundColor: darkMode ? 'rgba(198,125,91,0.2)' : '#F5EAE4', color: darkMode ? '#FAF7F2' : '#A8644A', fontSize: '12px', fontWeight: '700', marginBottom: '14px' }}>
              <Sparkles size={14} style={{ marginRight: '6px' }} />
              {authTab === 'login' ? 'Bienvenue sur Troco' : 'Rejoindre la communauté'}
            </div>
            <h1 className="font-editorial-heading" style={{ fontSize: '28px', fontWeight: '600', margin: '0 0 12px', color: darkMode ? '#FAF7F2' : '#3D3530', letterSpacing: '-0.02em', lineHeight: 1.25 }}>
              {authTab === 'login' ? 'Échange, partage, crée sans limites.' : 'Créez votre compte Troco.'}
            </h1>
            <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.7, color: darkMode ? '#D4C5B5' : '#6B5E54' }}>
              {authTab === 'login'
                ? 'Troco réinvente les services, les swaps et les prêts avec une expérience premium pensée pour les échanges humains.'
                : 'Créez un profil personnalisé pour proposer vos compétences et négocier des échanges.'
              }
            </p>
          </div>

          <div style={{ padding: '0 28px 28px' }}>
            {authError && (
              <div style={{ marginBottom: '14px', padding: '10px 14px', borderRadius: '12px', backgroundColor: darkMode ? '#2D1B1B' : '#FEF2F2', color: '#DC2626', fontSize: '12px', fontWeight: '600', border: '1px solid #FECACA' }}>
                {authError}
              </div>
            )}

            {/* FLUX DE CONNEXION MULTI-PROVIDERS */}
            {authTab === 'login' && (
              <>
                {authStep === 'select' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                    {/* BOUTON GOOGLE */}
                    <button
                      onClick={handleGoogleSignIn}
                      disabled={authLoading}
                      style={{
                        border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3',
                        borderRadius: '16px', padding: '13px 14px',
                        backgroundColor: darkMode ? '#1A1715' : '#FFFFFF',
                        boxShadow: '0 4px 14px rgba(61,53,48,0.05)', cursor: authLoading ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                        fontWeight: '700', color: darkMode ? '#FAF7F2' : '#3D3530'
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                      Continuer avec Google
                    </button>

                    {/* BOUTON MICROSOFT */}
                    <button
                      onClick={handleMicrosoftSignIn}
                      disabled={authLoading}
                      style={{
                        border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3',
                        borderRadius: '16px', padding: '13px 14px',
                        backgroundColor: darkMode ? '#1A1715' : '#FFFFFF',
                        color: darkMode ? '#FAF7F2' : '#3D3530',
                        boxShadow: '0 4px 14px rgba(61,53,48,0.05)', cursor: authLoading ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                        fontWeight: '700'
                      }}
                    >
                      <svg width="19" height="19" viewBox="0 0 21 21" fill="none">
                        <rect x="1" y="1" width="9" height="9" fill="#F25022" />
                        <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
                        <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
                        <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
                      </svg>
                      Continuer avec Microsoft
                    </button>

                    {/* BOUTON FACEBOOK */}
                    <button
                      onClick={handleFacebookSignIn}
                      disabled={authLoading}
                      style={{
                        border: 'none',
                        borderRadius: '16px', padding: '13px 14px',
                        backgroundColor: '#1877F2',
                        color: '#FFFFFF',
                        boxShadow: '0 8px 18px rgba(24,119,242,0.25)', cursor: authLoading ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                        fontWeight: '700'
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                      Continuer avec Facebook
                    </button>

                    {/* BOUTON TÉLÉPHONE */}
                    <button
                      onClick={() => { setAuthStep('phone'); setAuthError(''); }}
                      disabled={authLoading}
                      style={{
                        border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3',
                        borderRadius: '16px', padding: '13px 14px',
                        backgroundColor: darkMode ? '#1A1715' : '#FFFFFF',
                        color: darkMode ? '#FAF7F2' : '#3D3530',
                        boxShadow: '0 4px 14px rgba(61,53,48,0.05)', cursor: authLoading ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                        fontWeight: '700'
                      }}
                    >
                      <Phone size={18} color="#C67D5B" />
                      Continuer avec mon Numéro
                    </button>

                    {/* BOUTON EMAIL */}
                    <button
                      onClick={() => { setAuthStep('email'); setAuthError(''); }}
                      disabled={authLoading}
                      style={{
                        border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3',
                        borderRadius: '16px', padding: '13px 14px',
                        backgroundColor: darkMode ? '#1A1715' : '#FFFFFF',
                        color: darkMode ? '#FAF7F2' : '#3D3530',
                        boxShadow: '0 4px 14px rgba(61,53,48,0.05)', cursor: authLoading ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                        fontWeight: '700'
                      }}
                    >
                      <Mail size={18} color="#C67D5B" />
                      Continuer avec un Email
                    </button>

                    {/* ACCÈS DÉMO RAPIDE */}
                    <button
                      type="button"
                      onClick={() => handleConfirmDemoAuth('Démo Rapide')}
                      style={{
                        border: '1px dashed var(--border-color)',
                        borderRadius: '16px', padding: '10px 14px',
                        backgroundColor: 'var(--bg-subtle)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        gap: '8px', fontWeight: '700', color: 'var(--text-secondary)', fontSize: '12px',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      ⚡ Accès Rapide Démo
                    </button>
                  </div>
                )}

                {/* SOUS-FLUX TÉLÉPHONE (SMS) */}
                {authStep === 'phone' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '700', color: darkMode ? '#D4C5B5' : '#3D3530' }}>Numéro de téléphone :</label>
                    <input
                      type="tel"
                      value={authPhoneNumber}
                      onChange={(e) => setAuthPhoneNumber(e.target.value)}
                      placeholder="+33612345678"
                      style={{ width: '100%', padding: '12px', border: darkMode ? '1px solid rgba(232,221,211,0.2)' : '1px solid #E8DDD3', borderRadius: '14px', fontSize: '14px', fontWeight: '600', backgroundColor: darkMode ? '#1A1715' : '#FFFFFF', color: darkMode ? '#FAF7F2' : '#3D3530', outline: 'none' }}
                    />
                    <button disabled={authLoading} onClick={handleSendSms} style={{ border: 'none', borderRadius: '14px', padding: '12px', backgroundColor: '#C67D5B', color: '#FFF', fontWeight: '700', cursor: authLoading ? 'not-allowed' : 'pointer', opacity: authLoading ? 0.7 : 1 }}>
                      {authLoading ? 'Envoi du SMS...' : 'Envoyer le code par SMS'}
                    </button>
                    <button onClick={() => { setAuthStep('select'); setAuthError(''); }} style={{ background: 'none', border: 'none', color: '#6B5E54', fontSize: '12px', cursor: 'pointer', textAlign: 'center' }}>
                      ← Retour aux options
                    </button>
                  </div>
                )}

                {authStep === 'sms-verify' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ fontSize: '13px', color: darkMode ? '#D4C5B5' : '#6B5E54' }}>Un SMS contenant un code de confirmation a été envoyé au <strong>{authPhoneNumber}</strong>.</div>
                    <label style={{ fontSize: '13px', fontWeight: '700', color: darkMode ? '#D4C5B5' : '#3D3530' }}>Code de confirmation :</label>
                    <input
                      type="text"
                      value={authSmsCode}
                      onChange={(e) => setAuthSmsCode(e.target.value)}
                      placeholder="123456"
                      style={{ width: '100%', padding: '12px', border: darkMode ? '1px solid rgba(232,221,211,0.2)' : '1px solid #E8DDD3', borderRadius: '14px', fontSize: '16px', fontWeight: '700', letterSpacing: '4px', textAlign: 'center', backgroundColor: darkMode ? '#1A1715' : '#FFFFFF', color: darkMode ? '#FAF7F2' : '#3D3530', outline: 'none' }}
                    />
                    <button disabled={authLoading} onClick={handleVerifySmsCode} style={{ border: 'none', borderRadius: '14px', padding: '12px', background: 'linear-gradient(135deg, #9CAF88 0%, #7A8F6A 100%)', color: '#FFF', fontWeight: '700', cursor: authLoading ? 'not-allowed' : 'pointer', opacity: authLoading ? 0.7 : 1 }}>
                      {authLoading ? 'Vérification...' : 'Valider et se connecter'}
                    </button>
                    <button onClick={() => { setAuthStep('phone'); setAuthError(''); }} style={{ background: 'none', border: 'none', color: '#6B5E54', fontSize: '12px', cursor: 'pointer', textAlign: 'center' }}>
                      ← Modifier le numéro
                    </button>
                  </div>
                )}

                {/* SOUS-FLUX EMAIL */}
                {authStep === 'email' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                      <button
                        type="button"
                        onClick={() => setAuthModeEmail('password')}
                        style={{
                          flex: 1, padding: '8px', borderRadius: '10px', fontSize: '12px', fontWeight: '800',
                          border: authModeEmail === 'password' ? '1px solid #C67D5B' : '1px solid #E8DDD3',
                          backgroundColor: authModeEmail === 'password' ? (darkMode ? 'rgba(198,125,91,0.25)' : '#F5EAE4') : 'transparent',
                          color: authModeEmail === 'password' ? (darkMode ? '#FAF7F2' : '#A8644A') : (darkMode ? '#D4C5B5' : '#6B5E54'),
                          cursor: 'pointer'
                        }}
                      >
                        Mot de passe
                      </button>
                      <button
                        type="button"
                        onClick={() => setAuthModeEmail('magic-link')}
                        style={{
                          flex: 1, padding: '8px', borderRadius: '10px', fontSize: '12px', fontWeight: '800',
                          border: authModeEmail === 'magic-link' ? '1px solid #C67D5B' : '1px solid #E8DDD3',
                          backgroundColor: authModeEmail === 'magic-link' ? (darkMode ? 'rgba(198,125,91,0.25)' : '#F5EAE4') : 'transparent',
                          color: authModeEmail === 'magic-link' ? (darkMode ? '#FAF7F2' : '#A8644A') : (darkMode ? '#D4C5B5' : '#6B5E54'),
                          cursor: 'pointer'
                        }}
                      >
                        Lien magique
                      </button>
                    </div>

                    <label style={{ fontSize: '13px', fontWeight: '700', color: darkMode ? '#D4C5B5' : '#3D3530' }}>Adresse Email :</label>
                    <input
                      type="email"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      placeholder="exemple@email.com"
                      style={{ width: '100%', padding: '12px', border: darkMode ? '1px solid rgba(232,221,211,0.2)' : '1px solid #E8DDD3', borderRadius: '14px', fontSize: '14px', backgroundColor: darkMode ? '#1A1715' : '#FFFFFF', color: darkMode ? '#FAF7F2' : '#3D3530', outline: 'none' }}
                    />

                    {authModeEmail === 'password' && (
                      <>
                        <label style={{ fontSize: '13px', fontWeight: '700', color: darkMode ? '#D4C5B5' : '#3D3530' }}>Mot de passe :</label>
                        <input
                          type="password"
                          value={authPassword}
                          onChange={(e) => setAuthPassword(e.target.value)}
                          placeholder="••••••••"
                          onKeyDown={(e) => e.key === 'Enter' && handleEmailPasswordSignIn()}
                          style={{ width: '100%', padding: '12px', border: darkMode ? '1px solid rgba(232,221,211,0.2)' : '1px solid #E8DDD3', borderRadius: '14px', fontSize: '14px', backgroundColor: darkMode ? '#1A1715' : '#FFFFFF', color: darkMode ? '#FAF7F2' : '#3D3530', outline: 'none' }}
                        />
                        <button disabled={authLoading} onClick={handleEmailPasswordSignIn} style={{ border: 'none', borderRadius: '14px', padding: '12px', backgroundColor: '#C67D5B', color: '#FFF', fontWeight: '700', cursor: authLoading ? 'not-allowed' : 'pointer', opacity: authLoading ? 0.7 : 1 }}>
                          {authLoading ? 'Connexion en cours...' : 'Se connecter'}
                        </button>
                      </>
                    )}

                    {authModeEmail === 'magic-link' && (
                      <button disabled={authLoading} onClick={handleSendEmailLink} style={{ border: 'none', borderRadius: '14px', padding: '12px', backgroundColor: '#C67D5B', color: '#FFF', fontWeight: '700', cursor: authLoading ? 'not-allowed' : 'pointer', opacity: authLoading ? 0.7 : 1 }}>
                        {authLoading ? 'Envoi...' : 'Recevoir le lien magique'}
                      </button>
                    )}

                    <button onClick={() => { setAuthStep('select'); setAuthError(''); }} style={{ background: 'none', border: 'none', color: '#6B5E54', fontSize: '12px', cursor: 'pointer', textAlign: 'center' }}>
                      ← Retour aux options
                    </button>
                  </div>
                )}

                {authStep === 'email-sent' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px', textAlign: 'center' }}>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#C67D5B' }}>✉️ Vérifiez votre boîte mail</div>
                    <div style={{ fontSize: '13px', color: darkMode ? '#D4C5B5' : '#6B5E54', lineHeight: 1.6 }}>Un lien de connexion magique a été envoyé à <strong>{authEmail}</strong>. Cliquez dessus pour vous connecter.</div>
                    <button onClick={() => { setAuthStep('select'); setAuthError(''); }} style={{ background: 'none', border: 'none', color: '#6B5E54', fontSize: '12px', cursor: 'pointer', textAlign: 'center', marginTop: '8px' }}>
                      ← Retour aux options
                    </button>
                  </div>
                )}
              </>
            )}

            {/* FORMULAIRE DE CRÉATION DE COMPTE */}
            {authTab === 'signup' && (
              <form onSubmit={handleSignupSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '16px' }}>

                {/* NOM COMPLET */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: darkMode ? '#D4C5B5' : '#3D3530', marginBottom: '6px' }}>Nom Complet</label>
                  <input
                    type="text"
                    required
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    placeholder="ex: Mateo Polo"
                    style={{ width: '100%', padding: '12px 14px', border: darkMode ? '1px solid rgba(232,221,211,0.2)' : '1px solid #E8DDD3', borderRadius: '14px', fontSize: '14px', fontWeight: '600', backgroundColor: darkMode ? '#1A1715' : '#FFFFFF', color: darkMode ? '#FAF7F2' : '#3D3530', outline: 'none' }}
                  />
                </div>

                {/* PSEUDO */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: darkMode ? '#D4C5B5' : '#3D3530', marginBottom: '6px' }}>Pseudo (@)</label>
                  <input
                    type="text"
                    required
                    value={signupUsername}
                    onChange={(e) => setSignupUsername(e.target.value)}
                    placeholder="ex: mateopolo"
                    style={{ width: '100%', padding: '12px 14px', border: darkMode ? '1px solid rgba(232,221,211,0.2)' : '1px solid #E8DDD3', borderRadius: '14px', fontSize: '14px', fontWeight: '600', backgroundColor: darkMode ? '#1A1715' : '#FFFFFF', color: darkMode ? '#FAF7F2' : '#3D3530', outline: 'none' }}
                  />
                </div>

                {/* EMAIL */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: darkMode ? '#D4C5B5' : '#3D3530', marginBottom: '6px' }}>Adresse Email</label>
                  <input
                    type="email"
                    required
                    value={signupEmailOrPhone}
                    onChange={(e) => setSignupEmailOrPhone(e.target.value)}
                    placeholder="ex: mateo@troco.app"
                    style={{ width: '100%', padding: '12px 14px', border: darkMode ? '1px solid rgba(232,221,211,0.2)' : '1px solid #E8DDD3', borderRadius: '14px', fontSize: '14px', fontWeight: '600', backgroundColor: darkMode ? '#1A1715' : '#FFFFFF', color: darkMode ? '#FAF7F2' : '#3D3530', outline: 'none' }}
                  />
                </div>

                {/* MOT DE PASSE */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: darkMode ? '#D4C5B5' : '#3D3530', marginBottom: '6px' }}>Mot de passe (min 6 caractères)</label>
                  <input
                    type="password"
                    required
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{ width: '100%', padding: '12px 14px', border: darkMode ? '1px solid rgba(232,221,211,0.2)' : '1px solid #E8DDD3', borderRadius: '14px', fontSize: '14px', fontWeight: '600', backgroundColor: darkMode ? '#1A1715' : '#FFFFFF', color: darkMode ? '#FAF7F2' : '#3D3530', outline: 'none' }}
                  />
                </div>

                {/* VILLE / LOCALISATION */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: darkMode ? '#D4C5B5' : '#3D3530', marginBottom: '6px' }}>Ville / Localisation</label>
                  <input
                    type="text"
                    required
                    value={signupLocation}
                    onChange={(e) => setSignupLocation(e.target.value)}
                    placeholder="ex: Paris, France"
                    style={{ width: '100%', padding: '12px 14px', border: darkMode ? '1px solid rgba(232,221,211,0.2)' : '1px solid #E8DDD3', borderRadius: '14px', fontSize: '14px', fontWeight: '600', backgroundColor: darkMode ? '#1A1715' : '#FFFFFF', color: darkMode ? '#FAF7F2' : '#3D3530', outline: 'none' }}
                  />
                </div>

                {/* BIOGRAPHIE */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: darkMode ? '#D4C5B5' : '#3D3530', marginBottom: '6px' }}>Bio / Description</label>
                  <textarea
                    rows={2}
                    value={signupBio}
                    onChange={(e) => setSignupBio(e.target.value)}
                    placeholder="Parlez-nous de vous, de vos services ou de ce que vous cherchez..."
                    style={{ width: '100%', padding: '12px 14px', border: darkMode ? '1px solid rgba(232,221,211,0.2)' : '1px solid #E8DDD3', borderRadius: '14px', fontSize: '13px', backgroundColor: darkMode ? '#1A1715' : '#FFFFFF', color: darkMode ? '#FAF7F2' : '#3D3530', outline: 'none', resize: 'none' }}
                  />
                </div>

                {/* CHOIX DE L'AVATAR PRESET */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: darkMode ? '#D4C5B5' : '#3D3530', marginBottom: '6px' }}>Choisissez un Avatar</label>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '6px' }}>
                    {[
                      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
                      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
                      'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=200&q=80',
                      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80',
                      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
                    ].map((av) => (
                      <button
                        key={av}
                        type="button"
                        onClick={() => setSignupAvatar(av)}
                        style={{
                          border: signupAvatar === av ? '3px solid #C67D5B' : '3px solid transparent',
                          borderRadius: '50%', padding: 0, background: 'none', cursor: 'pointer', transition: 'all 0.2s ease',
                          transform: signupAvatar === av ? 'scale(1.1)' : 'scale(1)',
                        }}
                      >
                        <img src={av} alt="avatar option" style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover' }} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* LANGUES PARLÉES */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: darkMode ? '#D4C5B5' : '#3D3530', marginBottom: '8px' }}>Langues Parlées</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {['FR', 'EN', 'ES', 'IT'].map((lang) => {
                      const selected = signupLanguages.includes(lang);
                      return (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => {
                            if (selected) {
                              setSignupLanguages(prev => prev.filter(l => l !== lang));
                            } else {
                              setSignupLanguages(prev => [...prev, lang]);
                            }
                          }}
                          style={{
                            border: selected
                              ? '1px solid #C67D5B'
                              : (darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3'),
                            backgroundColor: selected
                              ? (darkMode ? 'rgba(198,125,91,0.25)' : '#F5EAE4')
                              : (darkMode ? '#1A1715' : '#FAF7F2'),
                            color: selected
                              ? (darkMode ? '#FAF7F2' : '#A8644A')
                              : (darkMode ? '#D4C5B5' : '#6B5E54'),
                            padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s ease'
                          }}
                        >
                          {lang}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* COMPÉTENCES / SKILLS */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: darkMode ? '#D4C5B5' : '#3D3530', marginBottom: '6px' }}>Vos Compétences (CV)</label>
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                    <input
                      type="text"
                      value={signupSkillInput}
                      onChange={(e) => setSignupSkillInput(e.target.value)}
                      placeholder="ex: Bricolage, Ableton..."
                      style={{ flex: 1, padding: '10px 12px', border: darkMode ? '1px solid rgba(232,221,211,0.2)' : '1px solid #E8DDD3', borderRadius: '12px', fontSize: '13px', outline: 'none', backgroundColor: darkMode ? '#1A1715' : '#FFFFFF', color: darkMode ? '#FAF7F2' : '#3D3530' }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (signupSkillInput.trim() && !signupSkills.includes(signupSkillInput.trim())) {
                            setSignupSkills(prev => [...prev, signupSkillInput.trim()]);
                            setSignupSkillInput('');
                          }
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (signupSkillInput.trim() && !signupSkills.includes(signupSkillInput.trim())) {
                          setSignupSkills(prev => [...prev, signupSkillInput.trim()]);
                          setSignupSkillInput('');
                        }
                      }}
                      style={{ border: 'none', borderRadius: '12px', backgroundColor: '#C67D5B', color: '#FFF', padding: '10px 14px', fontWeight: '700', cursor: 'pointer' }}
                    >
                      Ajouter
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {signupSkills.map((sk) => (
                      <span key={sk} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: darkMode ? 'rgba(198,125,91,0.2)' : '#F5EAE4', color: darkMode ? '#FAF7F2' : '#A8644A', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' }}>
                        {sk}
                        <button
                          type="button"
                          onClick={() => setSignupSkills(prev => prev.filter(s => s !== sk))}
                          style={{ border: 'none', background: 'transparent', color: '#C67D5B', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                        >
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* BOUTON SOUMISSION */}
                <button
                  type="submit"
                  disabled={authLoading}
                  style={{
                    border: 'none', borderRadius: '16px', padding: '14px', marginTop: '10px',
                    background: 'linear-gradient(135deg, #C67D5B 0%, #A8644A 100%)', color: '#FFF',
                    cursor: authLoading ? 'not-allowed' : 'pointer', fontWeight: '800', fontSize: '15px', boxShadow: '0 12px 24px -6px rgba(198, 125, 91, 0.35)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    opacity: authLoading ? 0.7 : 1
                  }}
                >
                  {authLoading ? 'Création du compte...' : 'Créer mon compte & Commencer'}
                </button>
              </form>
            )}

            <div style={{ padding: '16px', borderRadius: '18px', backgroundColor: darkMode ? '#1A1715' : '#F5F0E8', border: darkMode ? '1px solid rgba(232,221,211,0.12)' : '1px solid #E8DDD3', color: darkMode ? '#D4C5B5' : '#6B5E54', fontSize: '13px', lineHeight: 1.7, transition: 'all 0.3s ease' }}>
              <div style={{ fontWeight: '700', color: darkMode ? '#FAF7F2' : '#3D3530', marginBottom: '6px' }}>Pourquoi les utilisateurs aiment Troco</div>
              <div>• Connexion sécurisée Google, SMS & Email</div>
              <div>• Profils vérifiés avec réputation et compétences transparentes</div>
              <div>• Espaces de négociation et d'appels vidéo intégrés</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: 'var(--bg-global)', color: 'var(--text-main)', minHeight: '100vh', transition: 'background-color 0.3s ease, color 0.3s ease', paddingBottom: isMobile && activeTab === 'chat' ? '0' : '90px', WebkitFontSmoothing: 'antialiased', position: 'relative', overflowX: 'hidden' }}>
      {/* ORBES DE LUEUR AMBIANTE FLUIDES */}
      <div className="glow-orb glow-orb-primary" style={{ top: '8%', left: '-100px', width: '380px', height: '380px' }} />
      <div className="glow-orb glow-orb-secondary" style={{ top: '40%', right: '-120px', width: '420px', height: '420px' }} />

      {/* MODALE BLOQUANTE CGU & RGPD OBLIGATOIRE */}
      {isAuthenticated && !profile.cguAcceptedAt && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99999,
          backgroundColor: 'var(--overlay-bg)',
          backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
          animation: 'fadeSlideUp 0.3s ease both'
        }}>
          <div style={{
            maxWidth: '560px', width: '100%',
            backgroundColor: 'var(--bg-card)',
            borderRadius: '28px', padding: '28px',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-modal)',
            color: 'var(--text-main)',
            maxHeight: '90vh', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)' }}>
                <Scale size={22} />
              </div>
              <div>
                <h3 className="font-editorial-heading" style={{ margin: 0, fontSize: '22px', fontWeight: '600', color: 'var(--text-main)' }}>Conditions Générales & RGPD</h3>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>Cadre juridique et engagement communautaire</p>
              </div>
            </div>

            <div style={{
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: '16px', padding: '16px', fontSize: '13px', lineHeight: 1.65,
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-color)',
              marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '12px'
            }}>
              <div>
                <strong style={{ color: 'var(--text-main)' }}>1. Plateforme d'intermédiation technique</strong>
                <p style={{ margin: '4px 0 0' }}>Troco met à disposition une infrastructure logicielle permettant aux utilisateurs de publier des annonces, échanger des services et communiquer. Troco n'est pas partie prenante aux contrats conclus entre utilisateurs.</p>
              </div>

              <div>
                <strong style={{ color: 'var(--text-main)' }}>2. Clause de non-responsabilité (P2P)</strong>
                <p style={{ margin: '4px 0 0' }}>Les échanges, interventions physiques et prêts de matériel relèvent de la responsabilité exclusive des parties prenantes. Chaque membre s'engage à faire preuve de prudence et de diligence.</p>
              </div>

              <div>
                <strong style={{ color: 'var(--text-main)' }}>3. Protection des données & RGPD</strong>
                <p style={{ margin: '4px 0 0' }}>Vos données personnelles (nom, email, ville, compétences) sont strictement isolées sur votre espace sécurisé <code>users/{profile.uid || 'uid'}</code> et ne sont jamais revendues à des tiers.</p>
              </div>
            </div>

            <button
              onClick={handleAcceptCgu}
              style={{
                width: '100%', border: 'none', borderRadius: '16px', padding: '14px',
                background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)', color: '#FFF',
                fontWeight: '800', fontSize: '14px', cursor: 'pointer',
                boxShadow: 'var(--shadow-accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
              }}
            >
              <CheckCircle size={18} /> J'accepte les CGU et la Politique RGPD
            </button>
          </div>
        </div>
      )}
      <style>{`
        * { box-sizing: border-box; }
        .premium-main { animation: fadeSlideUp 0.45s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .premium-card, .premium-nav-btn, .premium-pill, .premium-panel, .premium-button {
          transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.3s ease, border-color 0.3s ease, background-color 0.3s ease;
        }
        .premium-card { border-radius: 20px !important; }
        .premium-card:hover {
          transform: translateY(-4px) scale(1.02) !important;
          box-shadow: var(--shadow-card) !important;
        }
        .premium-nav-btn:hover, .premium-pill:hover, .premium-panel:hover, .premium-button:hover {
          transform: scale(1.02);
          box-shadow: var(--shadow-card);
        }
        .glass-surface {
          background: var(--bg-glass);
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes popIn {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(214,69,110,0.35); }
          50% { box-shadow: 0 0 0 6px rgba(214,69,110,0); }
        }
        @keyframes pulseRing {
          0% { box-shadow: 0 0 0 0 rgba(255,255,255,0.35); }
          70% { box-shadow: 0 0 0 16px rgba(255,255,255,0); }
          100% { box-shadow: 0 0 0 0 rgba(255,255,255,0); }
        }
        @keyframes soundWave {
          0%, 100% { transform: scaleY(0.4); }
          50% { transform: scaleY(1); }
        }
        .sponsored-badge { animation: pulseGlow 2s ease-in-out infinite; }
        .call-ring { animation: pulseRing 1.8s ease-out infinite; }
        .wave-bar {
          width: 4px; border-radius: 999px; background: var(--accent-primary);
          animation: soundWave 1.1s ease-in-out infinite;
        }
        input, select, textarea { font-family: inherit; }
      `}</style>

      {/* HEADER FIXE GLASSMORPHISM FLUIDE AVEC CONDENSATION AU SCROLL */}
      <header style={{
        backgroundColor: 'var(--bg-glass)',
        backdropFilter: isScrolled ? 'blur(28px) saturate(200%)' : 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: isScrolled ? 'blur(28px) saturate(200%)' : 'blur(20px) saturate(180%)',
        borderBottom: '1px solid var(--border-color)',
        padding: isScrolled ? '9px 16px' : '12px 16px',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        boxShadow: isScrolled
          ? 'var(--shadow-card)'
          : '0 1px 24px rgba(0,0,0,0.03)',
        width: '100%',
        boxSizing: 'border-box',
        transition: 'padding 0.3s var(--ease-quiet), background-color 0.3s var(--ease-quiet), box-shadow 0.3s var(--ease-quiet), border-color 0.3s var(--ease-quiet)'
      }}>
        <div className="header-container" style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', width: '100%', boxSizing: 'border-box' }}>
          {/* PARTIE 3 : LOGO TROCO CLICKABLE -> RETOUR ACCUEIL */}
          <button onClick={() => { setActiveTab('feed'); setSelectedListing(null); setSelectedChat(null); if (callState.active) endCall(); }} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: '12px', textAlign: 'left', flexShrink: 0 }}>
            <h1 className="font-editorial-heading" style={{ fontSize: isScrolled ? '19px' : '22px', fontWeight: '700', color: 'var(--text-main)', margin: 0, letterSpacing: '-0.02em', whiteSpace: 'nowrap', transition: 'font-size 0.3s var(--ease-quiet)' }}>Troco</h1>
            <p className="logo-slogan font-editorial" style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic', margin: 0, whiteSpace: 'nowrap' }}>{t('slogan')}</p>
          </button>
          <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'nowrap' }}>
            <button onClick={() => handleOpenPayment('topup-cash')} title="Recharger mon solde Euros" className="premium-button balance-badge" style={{ border: '1px solid var(--border-color)', borderRadius: '999px', padding: isScrolled ? '5px 10px' : '6px 12px', backgroundColor: 'var(--bg-subtle)', color: 'var(--accent-primary)', fontWeight: '700', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', position: 'relative', overflow: 'visible', whiteSpace: 'nowrap', flexShrink: 0, transition: 'padding 0.3s var(--ease-quiet)' }}>
              <Coins size={13} style={{ flexShrink: 0 }} /> <AnimatedEuroBalance value={profile.euroBalance} prefix="€ " suffix="" style={{ fontSize: '11px', fontWeight: '700', whiteSpace: 'nowrap' }} />
            </button>
            <button onClick={() => handleOpenPayment('troco-plus')} title="S'abonner à Troco Plus" className="premium-button balance-badge" style={{ border: '1px solid var(--accent-warning)', borderRadius: '999px', padding: isScrolled ? '5px 10px' : '6px 12px', backgroundColor: 'var(--bg-subtle)', color: 'var(--accent-warning)', fontWeight: '800', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', position: 'relative', overflow: 'visible', whiteSpace: 'nowrap', flexShrink: 0, transition: 'padding 0.3s var(--ease-quiet)' }}>
              <Sparkles size={13} color="var(--accent-warning)" style={{ flexShrink: 0 }} /> <AnimatedTokenBalance value={profile.trocoTokens} formatFn={(v) => formatTokenCount(v, currentLang)} style={{ fontSize: '11px', fontWeight: '800', whiteSpace: 'nowrap' }} />
            </button>
            <button onClick={toggleDarkMode} title={darkMode ? "Activer le mode clair" : "Activer le mode sombre"} className="premium-button darkmode-btn" style={{ border: '1px solid var(--border-color)', borderRadius: '50%', width: isScrolled ? '32px' : '34px', height: isScrolled ? '32px' : '34px', backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s var(--ease-quiet)', flexShrink: 0 }}>
              {darkMode ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <button onClick={() => setIsLangModalOpen(true)} className="premium-button lang-btn" style={{ border: '1px solid var(--border-color)', borderRadius: '20px', padding: isScrolled ? '4px 9px' : '5px 10px', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', fontWeight: '700', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', whiteSpace: 'nowrap', flexShrink: 0, transition: 'padding 0.3s var(--ease-quiet)' }}>
              <Globe size={13} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
              <span>{currentLang === 'FR' ? '🇫🇷 FR' : currentLang === 'EN' ? '🇬🇧 EN' : currentLang === 'ES' ? '🇪🇸 ES' : currentLang === 'IT' ? '🇮🇹 IT' : currentLang === 'DE' ? '🇩🇪 DE' : currentLang === 'JA' ? '🇯🇵 JA' : '🇨🇳 ZH'}</span>
            </button>
          </div>
        </div>
      </header>

      {isBoostModalOpen && boostingListing && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(61,53,48,0.72)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 80 }}>
          <div style={{ width: '100%', maxWidth: '440px', backgroundColor: darkMode ? '#231E1B' : '#FAF7F2', borderRadius: '24px', padding: '24px', boxShadow: darkMode ? '0 25px 60px rgba(0,0,0,0.8)' : '0 25px 60px rgba(61,53,48,0.25)', border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3', position: 'relative' }}>
            <button onClick={() => setIsBoostModalOpen(false)} style={{ position: 'absolute', top: '14px', right: '14px', border: 'none', backgroundColor: darkMode ? 'rgba(232,221,211,0.1)' : '#F5EAE4', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: darkMode ? '#FAF7F2' : '#3D3530' }}>
              <X size={16} />
            </button>
            <div className="font-editorial-heading" style={{ fontWeight: '600', color: darkMode ? '#FAF7F2' : '#3D3530', marginBottom: '8px', fontSize: '20px' }}>🔥 Booster cette annonce</div>
            <div style={{ fontSize: '13px', color: darkMode ? '#D4C5B5' : '#6B5E54', lineHeight: 1.6, marginBottom: '16px' }}>Mets en avant <strong>{boostingListing.title}</strong> pendant 7 jours pour <strong>2,99€</strong>.</div>
            <button onClick={confirmBoostListing} className="premium-button" style={{ width: '100%', border: 'none', borderRadius: '14px', padding: '12px', background: 'linear-gradient(135deg, #C67D5B 0%, #A8644A 100%)', color: '#FFFFFF', fontWeight: '800', cursor: 'pointer', boxShadow: '0 10px 20px rgba(198,125,91,0.25)' }}>Valider le boost — procéder au paiement</button>
            {boostMessage && <div style={{ marginTop: '10px', fontSize: '12px', color: '#C67D5B', fontWeight: '700' }}>{boostMessage}</div>}
          </div>
        </div>
      )}

      {/* ---- CHECKOUT / TUNNEL DE PAIEMENT SIMULÉ ---- */}
      {checkout.open && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(61,53,48,0.7)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 75 }}>
          <div style={{ width: '100%', maxWidth: '460px', backgroundColor: darkMode ? '#231E1B' : '#FAF7F2', backdropFilter: 'blur(28px) saturate(180%)', WebkitBackdropFilter: 'blur(28px) saturate(180%)', borderRadius: '28px', padding: '24px', boxShadow: '0 30px 80px rgba(61,53,48,0.30)', border: darkMode ? '1px solid rgba(232,221,211,0.2)' : '1px solid #E8DDD3', position: 'relative' }}>
            {checkout.step === 'success' ? (
              <div style={{ textAlign: 'center', padding: '18px 8px' }}>
                <div style={{ width: '76px', height: '76px', borderRadius: '50%', backgroundColor: '#EBF0E6', color: '#3D4A35', margin: '0 auto 18px', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'popIn 0.5s cubic-bezier(0.22,1,0.36,1) both' }}>
                  <Check size={36} strokeWidth={3} />
                </div>
                <h3 className="font-editorial-heading" style={{ margin: '0 0 10px', fontSize: '22px', fontWeight: '600', color: darkMode ? '#FAF7F2' : '#3D3530', lineHeight: 1.4 }}>{t('transactionSuccess')}</h3>
                <p style={{ margin: '0 0 6px', fontSize: '13px', color: darkMode ? '#D4C5B5' : '#6B5E54' }}>{checkout.label}</p>
                <p style={{ margin: '0 0 20px', fontSize: '24px', fontWeight: '800', color: '#C67D5B' }}>{(checkout.amount || 0).toFixed(2)} €</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px', color: '#7A8F6A', fontWeight: '700', marginBottom: '18px' }}>
                  <ShieldCheck size={14} /> {t('encryptedPayment')}
                </div>
                <button onClick={closeCheckout} className="premium-button" style={{ width: '100%', border: 'none', borderRadius: '16px', padding: '14px', background: 'linear-gradient(135deg, #C67D5B 0%, #A8644A 100%)', color: '#FFF', fontWeight: '800', cursor: 'pointer', boxShadow: '0 10px 22px rgba(198,125,91,0.25)' }}>{t('doneButton')}</button>
              </div>
            ) : checkout.step === 'processing' ? (
              <div style={{ textAlign: 'center', padding: '34px 8px' }}>
                <div style={{ width: '46px', height: '46px', margin: '0 auto 20px', border: '3px solid rgba(198,125,91,0.2)', borderTopColor: '#C67D5B', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <div style={{ fontWeight: '800', color: darkMode ? '#FAF7F2' : '#3D3530', fontSize: '15px' }}>{t('transactionProcessing')}</div>
                <p style={{ fontSize: '12px', color: darkMode ? '#D4C5B5' : '#6B5E54', marginTop: '8px' }}>{t('secureBankConnection')}</p>
              </div>
            ) : (
              <>
                <button onClick={closeCheckout} style={{ position: 'absolute', top: '16px', right: '16px', border: 'none', backgroundColor: darkMode ? 'rgba(232,221,211,0.1)' : '#F5EAE4', width: '34px', height: '34px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <X size={16} color={darkMode ? '#FAF7F2' : '#3D3530'} />
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <Lock size={16} color="#C67D5B" />
                  <span style={{ fontSize: '12px', fontWeight: '800', color: '#C67D5B', letterSpacing: '0.04em' }}>{t('securePaymentHeader')}</span>
                </div>
                <h3 className="font-editorial-heading" style={{ margin: '0 0 16px', fontSize: '22px', fontWeight: '600', color: darkMode ? '#FAF7F2' : '#3D3530' }}>{checkout.label || 'Paiement'}</h3>

                <div style={{ border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3', borderRadius: '16px', padding: '14px', backgroundColor: darkMode ? '#1A1715' : '#F5F0E8', marginBottom: '18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', color: darkMode ? '#D4C5B5' : '#6B5E54' }}>{t('amountToPay')}</span>
                  <span style={{ fontSize: '22px', fontWeight: '800', color: darkMode ? '#FAF7F2' : '#3D3530' }}>{(checkout.amount || 0).toFixed(2)} €</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                  {paymentMethods.map(method => (
                    <button key={method.key} onClick={() => setCheckout(prev => ({ ...prev, method: method.key }))} style={{ display: 'flex', alignItems: 'center', gap: '12px', border: checkout.method === method.key ? '1.5px solid #C67D5B' : (darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3'), borderRadius: '14px', padding: '12px 14px', backgroundColor: checkout.method === method.key ? (darkMode ? 'rgba(198,125,91,0.25)' : '#F5EAE4') : (darkMode ? '#1A1715' : '#FFFFFF'), cursor: 'pointer', textAlign: 'left' }}>
                      {method.icon}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: '800', color: darkMode ? '#FAF7F2' : '#3D3530' }}>{method.label}</div>
                        <div style={{ fontSize: '11px', color: darkMode ? '#D4C5B5' : '#6B5E54' }}>{method.sub}</div>
                      </div>
                      <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: checkout.method === method.key ? '5px solid #C67D5B' : '1.5px solid #E8DDD3' }} />
                    </button>
                  ))}
                </div>

                {checkout.method === 'card' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', padding: '12px', borderRadius: '14px', backgroundColor: darkMode ? '#1A1715' : '#F5F0E8', border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3' }}>
                    <input placeholder="1234 5678 9012 3456" style={{ width: '100%', padding: '10px 12px', border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3', borderRadius: '10px', fontSize: '13px', backgroundColor: darkMode ? '#231E1B' : '#FFF', color: darkMode ? '#FAF7F2' : '#3D3530' }} />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input placeholder="MM/AA" style={{ flex: 1, padding: '10px 12px', border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3', borderRadius: '10px', fontSize: '13px', backgroundColor: darkMode ? '#231E1B' : '#FFF', color: darkMode ? '#FAF7F2' : '#3D3530' }} />
                      <input placeholder="CVC" style={{ flex: 1, padding: '10px 12px', border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3', borderRadius: '10px', fontSize: '13px', backgroundColor: darkMode ? '#231E1B' : '#FFF', color: darkMode ? '#FAF7F2' : '#3D3530' }} />
                    </div>
                  </div>
                )}

                {checkout.method === 'troco' && (
                  <div style={{ marginBottom: '16px', padding: '12px', borderRadius: '14px', backgroundColor: darkMode ? 'rgba(217,119,6,0.15)' : '#FEF3C7', border: '1px solid #E8DDD3', fontSize: '12px', color: darkMode ? '#FDE68A' : '#92400E', lineHeight: 1.6 }}>
                    💡 Recharge depuis ton solde Troco ou par virement SEPA. Tes jetons seront convertis automatiquement si le solde est insuffisant.
                  </div>
                )}

                <button onClick={handleConfirmPayment} className="premium-button" style={{ width: '100%', border: 'none', borderRadius: '16px', padding: '14px', background: 'linear-gradient(135deg, #C67D5B 0%, #A8644A 100%)', color: '#FFF', fontWeight: '800', cursor: 'pointer', boxShadow: '0 10px 22px rgba(198,125,91,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <Lock size={15} /> Payer {(checkout.amount || 0).toFixed(2)} €
                </button>
              </>
            )}
          </div>
        </div>
      )}



      {isLangModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(61,53,48,0.7)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 65 }}>
          <div style={{ backgroundColor: darkMode ? '#231E1B' : '#FAF7F2', backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)', borderRadius: '24px', width: '100%', maxWidth: '380px', padding: '24px', boxShadow: '0 24px 60px rgba(61,53,48,0.25)', border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3', position: 'relative' }}>
            <button onClick={() => setIsLangModalOpen(false)} style={{ position: 'absolute', top: '16px', right: '16px', border: 'none', backgroundColor: darkMode ? 'rgba(232,221,211,0.1)' : '#F5EAE4', width: '34px', height: '34px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: darkMode ? '#FAF7F2' : '#3D3530' }}>
              <X size={16} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#C67D5B' }}>
              <Globe size={20} />
              <h3 className="font-editorial-heading" style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: darkMode ? '#FAF7F2' : '#3D3530' }}>{t('selectLanguage')}</h3>
            </div>
            <p style={{ fontSize: '12px', color: darkMode ? '#D4C5B5' : '#6B5E54', margin: '0 0 16px', lineHeight: 1.5 }}>
              L'interface et les annonces seront instantanément traduites dans la langue choisie.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { code: 'FR', label: 'Français', flag: '🇫🇷' },
                { code: 'EN', label: 'English', flag: '🇬🇧' },
                { code: 'ES', label: 'Español', flag: '🇪🇸' },
                { code: 'IT', label: 'Italiano', flag: '🇮🇹' },
                { code: 'DE', label: 'Deutsch', flag: '🇩🇪' },
                { code: 'JA', label: '日本語', flag: '🇯🇵' },
                { code: 'ZH', label: '中文', flag: '🇨🇳' },
              ].map(lang => (
                <button
                  key={lang.code}
                  onClick={() => { setCurrentLang(lang.code); setIsLangModalOpen(false); }}
                  className="premium-button"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justify: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '14px',
                    border: currentLang === lang.code ? '2px solid #C67D5B' : (darkMode ? '1px solid rgba(232,221,211,0.12)' : '1px solid #E8DDD3'),
                    backgroundColor: currentLang === lang.code ? (darkMode ? 'rgba(198,125,91,0.25)' : '#F5EAE4') : (darkMode ? '#1A1715' : '#FAF7F2'),
                    cursor: 'pointer',
                    color: currentLang === lang.code ? (darkMode ? '#FAF7F2' : '#A8644A') : (darkMode ? '#D4C5B5' : '#3D3530'),
                    fontWeight: currentLang === lang.code ? '800' : '600',
                    fontSize: '13px'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '18px' }}>{lang.flag}</span>
                    <span>{lang.label}</span>
                  </span>
                  {currentLang === lang.code && <CheckCircle size={16} color="#C67D5B" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {isFilterDrawerOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(61,53,48,0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 55, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '100%', maxWidth: '360px', height: '100%', backgroundColor: darkMode ? '#231E1B' : '#FAF7F2', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', padding: '20px', boxShadow: '-12px 0 40px rgba(0,0,0,0.25)', overflowY: 'auto', borderLeft: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 className="font-editorial-heading" style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: darkMode ? '#FAF7F2' : '#3D3530' }}>{t('filtersTitle')}</h3>
              <button onClick={() => setIsFilterDrawerOpen(false)} style={{ border: 'none', background: darkMode ? 'rgba(255,255,255,0.08)' : '#E8DDD3', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: darkMode ? '#FFF' : '#3D3530' }}><X size={16} /></button>
            </div>
            <div style={{ padding: '10px 14px', borderRadius: '14px', backgroundColor: darkMode ? 'rgba(198,125,91,0.2)' : '#F5EAE4', border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3', color: darkMode ? '#FAF7F2' : '#A8644A', fontSize: '12px', fontWeight: '800', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={16} />
              <span>
                {isInfiniteRadius || radiusKm >= 100
                  ? `🎉 ${filteredListings.length} annonces au total (Mode Infini & Visio)`
                  : `📍 ${filteredListings.length} annonce${filteredListings.length > 1 ? 's' : ''} disponible${filteredListings.length > 1 ? 's' : ''} dans ${radiusKm} km`}
              </span>
            </div>
            {/* GEOLOCALISATION SILENCIEUSE GEOPRIVACY BOUTON */}
            <div style={{ marginBottom: '14px' }}>
              <button
                onClick={handleRequestGeolocation}
                disabled={isGeolocating}
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
                <MapPin size={15} color={isGeolocated ? '#9CAF88' : '#C67D5B'} />
                {isGeolocating ? 'Localisation...' : isGeolocated ? '📍 Position sécurisée active' : t('useMyLocation')}
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: darkMode ? '#D4C5B5' : '#3D3530' }}>{t('searchRadius')}</label>
              <button
                onClick={() => setIsInfiniteRadius(prev => !prev)}
                style={{
                  border: isInfiniteRadius || radiusKm >= 2000 ? '1px solid #C67D5B' : (darkMode ? '1px solid rgba(232,221,211,0.2)' : '1px solid #E8DDD3'),
                  backgroundColor: isInfiniteRadius || radiusKm >= 2000 ? (darkMode ? 'rgba(198,125,91,0.25)' : '#F5EAE4') : (darkMode ? '#1A1715' : '#FAF7F2'),
                  color: isInfiniteRadius || radiusKm >= 2000 ? (darkMode ? '#FAF7F2' : '#A8644A') : (darkMode ? '#D4C5B5' : '#6B5E54'),
                  borderRadius: '999px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: '800',
                  cursor: 'pointer'
                }}
              >
                {t('infiniteWorld')}
              </button>
            </div>
            <input
              type="range"
              min="5"
              max="2000"
              step="5"
              value={isInfiniteRadius ? 2000 : radiusKm}
              onChange={(e) => {
                const val = Number(e.target.value);
                setRadiusKm(val);
                if (val >= 2000) {
                  setIsInfiniteRadius(true);
                } else {
                  setIsInfiniteRadius(false);
                }
              }}
              style={{
                width: '100%',
                marginTop: '4px',
                accentColor: '#C67D5B',
                background: `linear-gradient(to right, #C67D5B 0%, #C67D5B ${(isInfiniteRadius ? 2000 : radiusKm) / 2000 * 100}%, ${darkMode ? '#3D3530' : '#E8DDD3'} ${(isInfiniteRadius ? 2000 : radiusKm) / 2000 * 100}%, ${darkMode ? '#3D3530' : '#E8DDD3'} 100%)`
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ fontSize: '12px', color: darkMode ? '#FAF7F2' : '#3D3530', fontWeight: '800' }}>
                {isInfiniteRadius || radiusKm >= 2000 ? '♾️ Infini (Monde entier)' : `📍 Jusqu'à ${radiusKm} km`}
              </div>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {[5, 25, 100, 500, 2000].map(preset => (
                  <button
                    key={preset}
                    onClick={() => { setRadiusKm(preset); setIsInfiniteRadius(preset >= 2000); }}
                    style={{
                      border: !isInfiniteRadius && radiusKm === preset ? '1px solid #C67D5B' : (darkMode ? '1px solid rgba(232,221,211,0.12)' : '1px solid #E8DDD3'),
                      backgroundColor: !isInfiniteRadius && radiusKm === preset ? (darkMode ? 'rgba(198,125,91,0.25)' : '#F5EAE4') : (darkMode ? '#1A1715' : '#FAF7F2'),
                      color: !isInfiniteRadius && radiusKm === preset ? (darkMode ? '#FAF7F2' : '#A8644A') : (darkMode ? '#D4C5B5' : '#6B5E54'),
                      borderRadius: '8px',
                      padding: '3px 7px',
                      fontSize: '10px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    {preset >= 2000 ? 'Monde' : `${preset}km`}
                  </button>
                ))}
              </div>
            </div>
            <label style={{ fontSize: '12px', fontWeight: '700', color: darkMode ? '#D4C5B5' : '#3D3530' }}>{t('languages') || 'Langues'}</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px', marginBottom: '12px' }}>
              {[
                { code: 'FR', label: '🇫🇷 FR' },
                { code: 'EN', label: '🇬🇧 EN' },
                { code: 'ES', label: '🇪🇸 ES' },
                { code: 'IT', label: '🇮🇹 IT' },
                { code: 'DE', label: '🇩🇪 DE' },
                { code: 'JA', label: '🇯🇵 JA' },
                { code: 'ZH', label: '🇨🇳 ZH' }
              ].map(({ code, label }) => (
                <button
                  key={code}
                  onClick={() => toggleLanguageFilter(code)}
                  style={{
                    border: selectedLanguages.includes(code) ? '1px solid #C67D5B' : (darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3'),
                    backgroundColor: selectedLanguages.includes(code) ? (darkMode ? 'rgba(198,125,91,0.25)' : '#F5EAE4') : (darkMode ? '#1A1715' : '#FAF7F2'),
                    color: selectedLanguages.includes(code) ? (darkMode ? '#FAF7F2' : '#A8644A') : (darkMode ? '#D4C5B5' : '#6B5E54'),
                    borderRadius: '999px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <label style={{ fontSize: '12px', fontWeight: '700', color: darkMode ? '#D4C5B5' : '#3D3530' }}>Rétribution</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
              {paymentOptions.map(option => (
                <button key={option} onClick={() => setSelectedPayment(option)} style={{ border: selectedPayment === option ? '1px solid #C67D5B' : (darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3'), backgroundColor: selectedPayment === option ? (darkMode ? 'rgba(198,125,91,0.25)' : '#F5EAE4') : (darkMode ? '#1A1715' : '#FAF7F2'), color: selectedPayment === option ? (darkMode ? '#FAF7F2' : '#A8644A') : (darkMode ? '#D4C5B5' : '#6B5E54'), borderRadius: '999px', padding: '6px 10px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>{paymentLabels[option]}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {isCategoryModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(61,53,48,0.65)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 60 }}>
          <div style={{ backgroundColor: darkMode ? '#231E1B' : '#FAF7F2', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderRadius: '20px', width: '100%', maxWidth: '360px', padding: '20px', border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <h3 className="font-editorial-heading" style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: darkMode ? '#FAF7F2' : '#3D3530' }}>{t('addCategory')}</h3>
              <button onClick={() => setIsCategoryModalOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: darkMode ? '#FFF' : '#3D3530' }}><X size={16} /></button>
            </div>
            <input value={categoryInput} onChange={(e) => setCategoryInput(e.target.value)} placeholder={t('categoryPlaceholder')} style={{ width: '100%', border: '1px solid #E8DDD3', borderRadius: '12px', padding: '10px 12px', marginBottom: '10px', backgroundColor: darkMode ? '#1A1715' : '#FFF', color: darkMode ? '#FAF7F2' : '#3D3530', outline: 'none' }} />
            <button onClick={handleAddCategory} style={{ width: '100%', border: 'none', borderRadius: '12px', padding: '10px 12px', background: 'linear-gradient(135deg, #C67D5B 0%, #A8644A 100%)', color: '#FFF', fontWeight: '700', cursor: 'pointer' }}>{t('addButton')}</button>
          </div>
        </div>
      )}

      {selectedListing && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(61, 53, 48, 0.72)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', zIndex: 80, overflowY: 'auto', padding: '16px' }}>
          <div style={{ maxWidth: '760px', margin: '0 auto', backgroundColor: darkMode ? '#231E1B' : '#FAF7F2', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderRadius: '28px', overflow: 'hidden', boxShadow: darkMode ? '0 30px 90px rgba(0,0,0,0.65)' : '0 30px 90px rgba(61,53,48,0.2)', border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3', color: darkMode ? '#FAF7F2' : '#3D3530' }}>

            {/* CARROUSEL HÉRO INTERACTIF */}
            <div
              onTouchStart={handleModalTouchStart}
              onTouchMove={handleModalTouchMove}
              onTouchEnd={handleModalTouchEnd}
              style={{ position: 'relative', width: '100%', height: '340px', backgroundColor: '#1A1715', touchAction: 'pan-y', userSelect: 'none', WebkitUserSelect: 'none', overflow: 'hidden' }}
            >
              {detailMediaTab === 'video' && selectedListing.video ? (
                <video
                  src={selectedListing.video}
                  poster={selectedListing.image}
                  autoPlay
                  loop
                  muted
                  playsInline
                  onError={() => setDetailMediaTab('image')}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                (() => {
                  const gallery = selectedListing.gallery && selectedListing.gallery.length > 0 ? selectedListing.gallery : [selectedListing.image];
                  return (
                    <div style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                      {gallery.map((imgSrc, idx) => {
                        const isActive = idx === selectedDetailImageIndex;
                        return (
                          <img
                            key={idx}
                            src={imgSrc}
                            alt={selectedListing.title}
                            draggable={false}
                            onError={(e) => { e.target.src = getFallbackImage(selectedListing.category, selectedListing.title); }}
                            style={{
                              position: 'absolute',
                              inset: 0,
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              opacity: isActive ? 1 : 0,
                              transition: 'opacity 0.4s ease-in-out, transform 0.4s ease-in-out',
                              transform: isActive ? 'scale(1)' : 'scale(1.03)',
                              pointerEvents: 'none',
                              WebkitUserDrag: 'none',
                              userSelect: 'none',
                              WebkitUserSelect: 'none',
                              zIndex: isActive ? 2 : 1
                            }}
                          />
                        );
                      })}
                    </div>
                  );
                })()
              )}

              {/* BOUTON FERMER */}
              <button onClick={() => { setSelectedListing(null); setSelectedDetailImageIndex(0); setDetailMediaTab('image'); }} style={{ position: 'absolute', top: '14px', right: '14px', border: 'none', width: '38px', height: '38px', borderRadius: '50%', backgroundColor: 'rgba(250,247,242,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10, boxShadow: '0 4px 12px rgba(61,53,48,0.15)', color: '#3D3530' }}><X size={18} /></button>

              {selectedListing.isBoosted && <span className="sponsored-badge" style={{ position: 'absolute', top: '14px', left: '14px', backgroundColor: '#F59E0B', color: '#FFF', fontSize: '11px', fontWeight: '800', padding: '6px 10px', borderRadius: '10px', boxShadow: '0 6px 16px rgba(245,158,11,0.45)', zIndex: 10 }}>🔥 Sponsorisé</span>}

              {/* FLÈCHES DE NAVIGATION LATÉRALE */}
              {detailMediaTab === 'image' && (selectedListing.gallery?.length || 0) > 1 && (
                <>
                  <button
                    onClick={() => setSelectedDetailImageIndex(prev => (prev > 0 ? prev - 1 : (selectedListing.gallery.length - 1)))}
                    style={{
                      position: 'absolute', top: '50%', left: '12px',
                      transform: 'translateY(-50%)',
                      border: 'none',
                      width: '38px', height: '38px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(61,53,48,0.4)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', zIndex: 10,
                      transition: 'all 0.2s ease',
                      outline: 'none',
                      boxShadow: 'none'
                    }}
                  >
                    <ChevronLeft size={20} color="#FFFFFF" strokeWidth={2.5} />
                  </button>
                  <button
                    onClick={() => setSelectedDetailImageIndex(prev => (prev < (selectedListing.gallery.length - 1) ? prev + 1 : 0))}
                    style={{
                      position: 'absolute', top: '50%', right: '12px',
                      transform: 'translateY(-50%)',
                      border: 'none',
                      width: '38px', height: '38px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(61,53,48,0.4)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', zIndex: 10,
                      transition: 'all 0.2s ease',
                      outline: 'none',
                      boxShadow: 'none'
                    }}
                  >
                    <ChevronRight size={20} color="#FFFFFF" strokeWidth={2.5} />
                  </button>
                </>
              )}

              {/* PUCES INDICATRICES */}
              {detailMediaTab === 'image' && (selectedListing.gallery?.length || 0) > 1 && (
                <div style={{ position: 'absolute', bottom: '14px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '6px', zIndex: 10, backgroundColor: 'rgba(61,53,48,0.6)', padding: '6px 12px', borderRadius: '999px', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
                  {selectedListing.gallery.map((_, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedDetailImageIndex(idx)}
                      style={{
                        width: selectedDetailImageIndex === idx ? '20px' : '8px',
                        height: '8px',
                        borderRadius: '999px',
                        backgroundColor: selectedDetailImageIndex === idx ? '#C67D5B' : 'rgba(255,255,255,0.5)',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                    />
                  ))}
                </div>
              )}

              {/* COMMUTATEUR MÉDIA BASCULE VIDÉO / GALERIE */}
              <div style={{ position: 'absolute', bottom: '14px', left: '14px', display: 'flex', gap: '8px', zIndex: 10 }}>
                {selectedListing.video && (
                  <button onClick={() => setDetailMediaTab('video')} style={{ border: 'none', borderRadius: '999px', padding: '7px 14px', backgroundColor: detailMediaTab === 'video' ? '#C67D5B' : 'rgba(61,53,48,0.75)', color: '#FFF', fontSize: '12px', fontWeight: '800', cursor: 'pointer', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Video size={13} /> {t('demoVideo')}
                  </button>
                )}
                <button onClick={() => setDetailMediaTab('image')} style={{ border: 'none', borderRadius: '999px', padding: '7px 14px', backgroundColor: detailMediaTab === 'image' ? '#C67D5B' : 'rgba(61,53,48,0.75)', color: '#FFF', fontSize: '12px', fontWeight: '800', cursor: 'pointer', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Camera size={13} /> Photos ({selectedListing.gallery?.length || 1})
                </button>
              </div>
            </div>

            <div style={{ padding: '20px' }}>
              {(() => {
                const isDetailShowingOriginal = !!showingOriginalListings[selectedListing.id];
                const detailDisplayContent = getListingDisplayContent(selectedListing, currentLang, isDetailShowingOriginal);
                return (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', gap: '10px', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 10px', borderRadius: '999px', backgroundColor: darkMode ? 'rgba(198,125,91,0.2)' : '#F5EAE4', color: darkMode ? '#FAF7F2' : '#A8644A', fontSize: '11px', fontWeight: '800' }}>
                            <Sparkles size={12} /> {t('verifiedOffer')}
                          </div>
                          {(selectedListing.isDemo || (typeof selectedListing.id === 'number' && selectedListing.id <= 20)) && (
                            <span style={{
                              fontSize: '11px',
                              fontWeight: '800',
                              padding: '5px 10px',
                              borderRadius: '999px',
                              backgroundColor: darkMode ? 'rgba(107,94,84,0.4)' : '#EDE6DF',
                              color: darkMode ? '#D4C5B5' : '#6B5E54',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              🤖 Annonce IA (Démo)
                            </span>
                          )}
                        </div>
                        <h3 className="font-editorial-heading" style={{ margin: '0 0 4px 0', fontSize: '24px', fontWeight: '600', color: darkMode ? '#FAF7F2' : '#3D3530' }}>{detailDisplayContent.title}</h3>
                        {currentLang !== (selectedListing.nativeLang || 'FR') && (
                          <button
                            onClick={(e) => toggleOriginalListing(selectedListing.id, e)}
                            className="premium-button"
                            style={{
                              border: 'none',
                              backgroundColor: 'transparent',
                              color: '#C67D5B',
                              fontSize: '12px',
                              fontWeight: '800',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '2px 0 6px 0'
                            }}
                          >
                            <Globe size={13} color="#C67D5B" />
                            {isDetailShowingOriginal ? t('showTranslation') : t('showOriginal')}
                          </button>
                        )}
                      </div>
                      {selectedListing.authorProfile.name !== profile.name ? (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <button
                            onClick={() => {
                              setReportTarget({
                                listing: selectedListing,
                                user: { name: selectedListing.authorProfile.name, uid: selectedListing.authorProfile.uid || null }
                              });
                              setIsReportModalOpen(true);
                            }}
                            className="premium-button"
                            title="Signaler un contenu abusif ou suspect"
                            style={{
                              border: 'none',
                              borderRadius: '999px',
                              padding: '11px 14px',
                              backgroundColor: darkMode ? 'rgba(239,68,68,0.2)' : '#FEF2F2',
                              color: '#EF4444',
                              fontWeight: '700',
                              fontSize: '12px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px',
                            }}
                          >
                            <ShieldAlert size={14} /> Signaler
                          </button>
                          <button onClick={() => handleStartDiscussion({ id: selectedListing.id, title: selectedListing.title, author: selectedListing.authorProfile.name, compensation: selectedListing.compensation })} className="premium-button" style={{ border: 'none', borderRadius: '999px', padding: '11px 16px', background: 'linear-gradient(135deg, #C67D5B 0%, #A8644A 100%)', color: '#FFF', fontWeight: '800', cursor: 'pointer', boxShadow: '0 8px 20px rgba(198,125,91,0.35)' }}>{t('startDiscussion')}</button>
                        </div>
                      ) : (
                        <div style={{ backgroundColor: darkMode ? '#1A1715' : '#F5F0E8', color: darkMode ? '#D4C5B5' : '#6B5E54', padding: '10px 16px', borderRadius: '999px', fontSize: '13px', fontWeight: '700', border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3' }}>{t('authorAnnc')}</div>
                      )}
                    </div>
                    <p style={{ margin: '0 0 14px', lineHeight: 1.7, color: darkMode ? '#D4C5B5' : '#6B5E54', fontSize: '14px' }}>{detailDisplayContent.description}</p>
                  </>
                );
              })()}

              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
                {localizeTags(selectedListing.tags, currentLang).map(tag => (
                  <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: darkMode ? 'rgba(198,125,91,0.2)' : '#F5EAE4', color: darkMode ? '#FAF7F2' : '#A8644A', borderRadius: '999px', padding: '5px 10px', fontSize: '11px', fontWeight: '800' }}><Tag size={11} /> {tag}</span>
                ))}
              </div>

              <div style={{ border: darkMode ? '1px solid rgba(232,221,211,0.12)' : '1px solid #E8DDD3', borderRadius: '16px', padding: '14px', backgroundColor: darkMode ? '#1A1715' : '#F5F0E8', marginBottom: '14px' }}>
                <div style={{ fontWeight: '800', fontSize: '13px', color: darkMode ? '#FAF7F2' : '#3D3530', marginBottom: '6px' }}>{t('compensation')}</div>
                <div style={{ fontSize: '13px', color: '#C67D5B', fontWeight: '700' }}>{formatCompensation(selectedListing.compensation)}</div>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '14px', padding: '14px', borderRadius: '16px', backgroundColor: darkMode ? '#1A1715' : '#F5F0E8', border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3' }}>
                <img src={selectedListing.authorProfile.avatar} alt={selectedListing.authorProfile.name} style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #E8DDD3' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '800', color: darkMode ? '#FAF7F2' : '#3D3530' }}>{selectedListing.authorProfile.name}</div>
                  <div style={{ fontSize: '13px', color: darkMode ? '#D4C5B5' : '#6B5E54', marginTop: '4px' }}>{getBioTranslation(selectedListing.authorProfile.bio, currentLang, !!showingOriginalListings[selectedListing.id])}</div>
                </div>
              </div>
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontWeight: '800', fontSize: '13px', color: darkMode ? '#FAF7F2' : '#3D3530', marginBottom: '8px' }}>{t('socialNetworks')}</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {selectedListing.authorProfile.socials.map(link => <span key={link} style={{ border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3', borderRadius: '999px', padding: '6px 10px', fontSize: '12px', color: '#C67D5B', fontWeight: '700', backgroundColor: darkMode ? '#1A1715' : '#FAF7F2' }}>{link}</span>)}
                </div>
              </div>
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontWeight: '800', fontSize: '13px', color: darkMode ? '#FAF7F2' : '#3D3530', marginBottom: '8px' }}>{t('portfolio')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px' }}>
                  {selectedListing.authorProfile.portfolio.map((image, index) => <img key={image + index} src={image} alt="portfolio" style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '14px' }} />)}
                </div>
              </div>
              <div>
                <div style={{ fontWeight: '800', fontSize: '13px', color: darkMode ? '#FAF7F2' : '#3D3530', marginBottom: '8px' }}>{t('reviews')}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedListing.authorProfile.reviews.map((review, index) => (
                    <div key={review.text + index} style={{ border: darkMode ? '1px solid rgba(232,221,211,0.12)' : '1px solid #E8DDD3', borderRadius: '14px', padding: '12px', backgroundColor: darkMode ? '#1A1715' : '#F5F0E8' }}>
                      <div style={{ color: '#F59E0B', marginBottom: '4px' }}>{'⭐'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</div>
                      <div style={{ fontSize: '13px', color: darkMode ? '#D4C5B5' : '#6B5E54' }}>{localizeReview(review.text, currentLang)}</div>
                    </div>
                  ))}
                </div>
              </div>

              {isAdmin && (
                <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: darkMode ? '1px solid rgba(239,68,68,0.3)' : '1px solid #FEE2E2' }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`[ADMINISTRATEUR]\nConfirmez-vous la suppression définitive de l'annonce "${selectedListing.title}" ?`)) {
                        handleAdminDeleteListing(selectedListing);
                        setSelectedListing(null);
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '14px',
                      backgroundColor: '#EF4444',
                      color: '#FFFFFF',
                      fontWeight: '800',
                      fontSize: '13px',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 6px 16px rgba(239,68,68,0.25)'
                    }}
                  >
                    <Trash2 size={16} /> Supprimer cette annonce (Action Administrateur)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CONTENU DYNAMIQUE SELON L'ONGLET SÉLECTIONNÉ */}
      <main
        key={`${activeTab}-${viewMode}`}
        className={`premium-main fade-up-in ${activeTab === 'chat' ? 'chat-mode' : ''}`}
        style={{
          maxWidth: activeTab === 'feed' ? '1460px' : '1200px',
          margin: '0 auto',
          width: '100%',
          boxSizing: 'border-box',
          padding: isMobile ? '12px' : '20px 20px 90px',
          display: 'block',
          overflow: 'visible',
          transition: 'max-width 0.3s ease'
        }}
      >

        {/* ONGLET 1 : EXPLORER / FEED */}
        {activeTab === 'feed' && (
          <div className="feed-layout-container">
            {/* BANNIÈRE LATÉRALE GAUCHE (DESKTOP) */}
            <aside className="desktop-ad-banner" aria-label="Espace Partenaires Troco">
              <div className="ad-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '9px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: darkMode ? '#FAF7F2' : '#A8644A', backgroundColor: darkMode ? 'rgba(198,125,91,0.25)' : '#F5EAE4', padding: '3px 7px', borderRadius: '6px' }}>
                    🌟 Partenaire Pro
                  </span>
                  <span style={{ fontSize: '9px', color: darkMode ? '#D4C5B5' : '#6B5E54' }}>Sponsorisé</span>
                </div>
                <img
                  src="https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=400&q=80"
                  alt="Partenaire Outillage"
                  style={{ width: '100%', height: '85px', objectFit: 'cover', borderRadius: '12px', marginBottom: '8px' }}
                />
                <div style={{ fontSize: '13px', fontWeight: '800', color: darkMode ? '#FAF7F2' : '#3D3530', marginBottom: '4px', lineHeight: 1.3 }}>
                  Brico & Outillage Pro
                </div>
                <div style={{ fontSize: '11px', color: darkMode ? '#D4C5B5' : '#6B5E54', lineHeight: 1.4, marginBottom: '8px' }}>
                  Matériel certifié disponible en prêt immédiat avec caution Troco.
                </div>
                <div style={{ display: 'inline-block', fontSize: '10px', fontWeight: '800', color: '#3D4A35', backgroundColor: '#EBF0E6', padding: '2px 8px', borderRadius: '999px', marginBottom: '8px', border: '1px solid #D4DFCE' }}>
                  -15% membres Troco
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('Outillage');
                    alert("🏷️ Code promo partenaire 'TROCO15' appliqué sur la catégorie Outillage !");
                  }}
                  className="premium-button"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #C67D5B 0%, #A8644A 100%)',
                    color: '#FFF',
                    fontSize: '11px',
                    fontWeight: '700',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Voir les offres
                </button>
              </div>

              <div className="ad-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '9px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#D97706', backgroundColor: '#FEF3C7', padding: '3px 7px', borderRadius: '6px' }}>
                    🎓 Mentorat
                  </span>
                  <span style={{ fontSize: '9px', color: darkMode ? '#D4C5B5' : '#6B5E54' }}>Publicité</span>
                </div>
                <img
                  src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=400&q=80"
                  alt="Academia Code"
                  style={{ width: '100%', height: '85px', objectFit: 'cover', borderRadius: '12px', marginBottom: '8px' }}
                />
                <div style={{ fontSize: '13px', fontWeight: '800', color: darkMode ? '#FAF7F2' : '#3D3530', marginBottom: '4px', lineHeight: 1.3 }}>
                  Academia Code & Langues
                </div>
                <div style={{ fontSize: '11px', color: darkMode ? '#D4C5B5' : '#6B5E54', lineHeight: 1.4, marginBottom: '8px' }}>
                  Mentorat accéléré et cours en visioconférence HD.
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('Cours/Compétences');
                    setFormatFilter('remote');
                  }}
                  className="premium-button"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '10px',
                    backgroundColor: darkMode ? '#1A1715' : '#FAF7F2',
                    color: darkMode ? '#FAF7F2' : '#3D3530',
                    fontSize: '11px',
                    fontWeight: '700',
                    border: '1px solid #E8DDD3',
                    cursor: 'pointer'
                  }}
                >
                  Trouver un mentor
                </button>
              </div>
            </aside>

            {/* CONTENU CENTRAL DU FEED */}
            <div className="feed-main-content">
              {/* Ligne Recherche + Filtre Rayon + Bascule Vue Liste / Carte */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ flex: 1, minWidth: '220px', display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg-card)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '10px 14px', boxShadow: 'var(--shadow-card)' }}>
                  <Search size={18} color="var(--accent-primary)" style={{ marginRight: '10px' }} />
                  <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} type="text" placeholder={t('searchPlaceholder')} style={{ border: 'none', outline: 'none', width: '100%', fontSize: '14px', backgroundColor: 'transparent', color: 'var(--text-main)' }} />
                </div>
                <button
                  onClick={() => setIsFilterDrawerOpen(true)}
                  className="premium-button"
                  style={{
                    backgroundColor: isInfiniteRadius || radiusKm >= 100 ? 'var(--bg-subtle)' : 'var(--bg-card)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border: isInfiniteRadius || radiusKm >= 100 ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                    borderRadius: '16px',
                    padding: '10px 14px',
                    cursor: 'pointer',
                    boxShadow: 'var(--shadow-card)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: isInfiniteRadius || radiusKm >= 100 ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    fontWeight: '700',
                    fontSize: '13px'
                  }}
                >
                  <Filter size={18} color={isInfiniteRadius || radiusKm >= 100 ? 'var(--accent-primary)' : 'var(--text-secondary)'} />
                  <span>{isInfiniteRadius || radiusKm >= 100 ? `♾️ ${t('infinite')}` : `${radiusKm} km`}</span>
                </button>

                {/* Sélecteur de vue (Liste / Carte) dédié et étanche */}
                <div className="premium-panel" style={{ display: 'inline-flex', flexShrink: 0, border: '1px solid var(--border-color)', borderRadius: '999px', padding: '3px', backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-card)' }}>
                  <button onClick={() => setViewMode('list')} className="premium-nav-btn" style={{ border: 'none', borderRadius: '999px', padding: '8px 14px', backgroundColor: viewMode === 'list' ? 'var(--accent-primary)' : 'transparent', color: viewMode === 'list' ? '#FFF' : 'var(--text-secondary)', fontWeight: '700', cursor: 'pointer', fontSize: '12px' }}>{t('viewList')}</button>
                  <button onClick={() => { setViewMode('map'); setIsInfiniteRadius(true); }} className="premium-nav-btn" style={{ border: 'none', borderRadius: '999px', padding: '8px 14px', backgroundColor: viewMode === 'map' ? 'var(--accent-primary)' : 'transparent', color: viewMode === 'map' ? '#FFF' : 'var(--text-secondary)', fontWeight: '700', cursor: 'pointer', fontSize: '12px' }}>{t('viewMap')}</button>
                </div>
              </div>

              {/* Barre des catégories avec Carrousel fluide et flèches de navigation latérales */}
              <div style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                marginBottom: '16px',
                width: '100%',
                minWidth: 0,
                gap: '8px'
              }}>
                {/* Flèche de défilement gauche */}
                <button
                  type="button"
                  onClick={() => scrollCategories('left')}
                  title="Faire défiler vers la gauche"
                  className="premium-button"
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--accent-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    flexShrink: 0,
                    boxShadow: 'var(--shadow-card)',
                    zIndex: 2,
                    transition: 'all 0.2s ease'
                  }}
                >
                  <ChevronLeft size={16} />
                </button>

                {/* Conteneur de défilement des catégories */}
                <div
                  ref={categoryScrollRef}
                  className="category-scroll-container"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    paddingBottom: '4px',
                    scrollBehavior: 'smooth'
                  }}
                >
                  {allCategories.map(category => {
                    const isSel = selectedCategory === category;
                    return (
                      <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className="premium-button category-pill"
                        style={{
                          border: isSel ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                          backgroundColor: isSel ? 'var(--bg-subtle)' : 'var(--bg-card)',
                          color: isSel ? 'var(--accent-primary)' : 'var(--text-secondary)',
                          boxShadow: isSel ? 'var(--shadow-accent)' : 'var(--shadow-card)',
                          cursor: 'pointer'
                        }}
                      >
                        {getCategoryLabel(category)}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setIsCategoryModalOpen(true)}
                    className="premium-button category-pill"
                    style={{
                      border: '1px dashed var(--accent-primary)',
                      backgroundColor: 'var(--bg-subtle)',
                      color: 'var(--accent-primary)',
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                  >
                    + {t('newCategory')}
                  </button>
                </div>

                {/* Flèche de défilement droite */}
                <button
                  type="button"
                  onClick={() => scrollCategories('right')}
                  title="Faire défiler vers la droite"
                  className="premium-button"
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--accent-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    flexShrink: 0,
                    boxShadow: 'var(--shadow-card)',
                    zIndex: 2,
                    transition: 'all 0.2s ease'
                  }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* SÉLECTEUR SEGMENTÉ FORMAT */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                maxWidth: isMobile ? '100%' : '480px',
                width: '100%',
                margin: '0 auto 20px auto',
                padding: '4px',
                borderRadius: '16px',
                backgroundColor: 'var(--bg-card)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid var(--border-color)',
                boxShadow: 'var(--shadow-card)',
                boxSizing: 'border-box',
                gap: '4px'
              }}>
                <button
                  type="button"
                  onClick={() => setFormatFilter('all')}
                  className="premium-button"
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '12px',
                    border: 'none',
                    backgroundColor: formatFilter === 'all'
                      ? 'var(--accent-primary)'
                      : 'transparent',
                    color: formatFilter === 'all'
                      ? '#FFFFFF'
                      : 'var(--text-secondary)',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: formatFilter === 'all'
                      ? 'var(--shadow-accent)'
                      : 'none',
                    transition: 'all 0.2s cubic-bezier(0.22, 1, 0.36, 1)'
                  }}
                >
                  <Globe size={13} />
                  <span>{t('all')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormatFilter('onsite')}
                  className="premium-button"
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '12px',
                    border: 'none',
                    backgroundColor: formatFilter === 'onsite'
                      ? 'var(--accent-primary)'
                      : 'transparent',
                    color: formatFilter === 'onsite'
                      ? '#FFFFFF'
                      : 'var(--text-secondary)',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: formatFilter === 'onsite'
                      ? 'var(--shadow-accent)'
                      : 'none',
                    transition: 'all 0.2s cubic-bezier(0.22, 1, 0.36, 1)'
                  }}
                >
                  <MapPin size={13} />
                  <span>{t('onsite')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormatFilter('remote')}
                  className="premium-button"
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '12px',
                    border: 'none',
                    backgroundColor: formatFilter === 'remote'
                      ? 'var(--accent-primary)'
                      : 'transparent',
                    color: formatFilter === 'remote'
                      ? '#FFFFFF'
                      : 'var(--text-secondary)',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: formatFilter === 'remote'
                      ? 'var(--shadow-accent)'
                      : 'none',
                    transition: 'all 0.2s cubic-bezier(0.22, 1, 0.36, 1)'
                  }}
                >
                  <Video size={13} />
                  <span>{t('remote')}</span>
                </button>
              </div>

              {filteredListings.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: 'var(--bg-card)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderRadius: '24px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)', animation: 'fadeSlideUp 0.3s ease both' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--bg-subtle)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: 'var(--shadow-accent)' }}>
                    <Search size={28} />
                  </div>
                  <h3 className="font-editorial-heading" style={{ fontSize: '20px', fontWeight: '600', color: 'var(--text-main)', margin: '0 0 8px' }}>Aucune annonce ne correspond à ta recherche</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 20px', maxWidth: '420px', marginInline: 'auto', lineHeight: 1.6 }}>Essaie d'élargir ton rayon de recherche, de changer de catégorie ou de réinitialiser tes filtres pour découvrir les annonces des membres Troco.</p>
                  <button
                    onClick={() => { setSearchQuery(''); setSelectedCategory('all'); setRadiusKm(100); setIsInfiniteRadius(true); setSelectedLanguages([]); setSelectedPayment('all'); setFormatFilter('all'); }}
                    className="premium-button"
                    style={{ border: 'none', borderRadius: '999px', padding: '10px 22px', background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)', color: '#FFF', fontWeight: '800', fontSize: '13px', cursor: 'pointer', boxShadow: 'var(--shadow-accent)' }}
                  >
                    Réinitialiser tous les filtres
                  </button>
                </div>
              ) : viewMode === 'map' ? (
                <div className="premium-panel" style={{ backgroundColor: 'var(--bg-card)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderRadius: '24px', padding: '10px', boxShadow: 'var(--shadow-card)', border: '1px solid var(--border-color)' }}>
                  <div style={{ position: 'relative', width: '100%', height: '550px', borderRadius: '18px', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
                    <MapContainer
                      center={mapCenter}
                      zoom={4}
                      minZoom={2}
                      maxBounds={[[-85, -180], [85, 180]]}
                      maxBoundsViscosity={1.0}
                      worldCopyJump={true}
                      style={{ width: '100%', height: '100%' }}
                    >
                      <TileLayer
                        noWrap={true}
                        bounds={[[-85, -180], [85, 180]]}
                        attribution='&copy; Google Maps'
                        url={`https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=${currentLang.toLowerCase()}`}
                      />

                      {filteredListings.map(item => {
                        const coords = item.coordinates || getCoordinatesForLocation(item.location);
                        const media = getSuggestedMedia(item.title, item.description || '', item.image, item.video);
                        const displayContent = getListingDisplayContent(item, currentLang, !!showingOriginalListings[item.id]);
                        const localizedLoc = localizeLocation(item.location, currentLang);
                        return (
                          <Marker key={item.id} position={coords} icon={createModernMapIcon(darkMode)}>
                            <Popup>
                              <div style={{ minWidth: '190px', maxWidth: '280px', display: 'flex', flexDirection: 'column', gap: '6px', padding: '2px' }}>
                                <div style={{ position: 'relative' }}>
                                  <img src={media.image} alt={displayContent.title} style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '10px' }} />
                                  {(item.isDemo || (typeof item.id === 'number' && item.id <= 20)) && (
                                    <span style={{ position: 'absolute', top: '6px', left: '6px', backgroundColor: '#C67D5B', color: '#FFF', fontSize: '9px', fontWeight: '800', padding: '2px 6px', borderRadius: '6px' }}>
                                      🤖 Annonce IA
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontWeight: '800', fontSize: '12px', color: '#3D3530', lineHeight: 1.3 }}>{displayContent.title}</div>
                                <div style={{ fontSize: '11px', color: '#6B5E54', lineHeight: 1.4 }}>📍 {localizedLoc}</div>
                                <div style={{ fontSize: '11px', color: '#C67D5B', fontWeight: '800' }}>{item.compensation}</div>
                                <button onClick={(event) => { event.stopPropagation(); handleOpenListing(item); }} className="premium-button" style={{ border: 'none', borderRadius: '10px', padding: '7px 10px', background: 'linear-gradient(135deg, #C67D5B 0%, #A8644A 100%)', color: '#FFF', fontWeight: '700', cursor: 'pointer', marginTop: '2px', fontSize: '11px' }}>{t('viewListingButton')}</button>
                              </div>
                            </Popup>
                          </Marker>
                        );
                      })}
                    </MapContainer>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
                  {filteredListings.map((item) => (
                    <FeedCardItem
                      key={item.id}
                      item={item}
                      darkMode={darkMode}
                      hoveredCardId={hoveredCardId}
                      setHoveredCardId={setHoveredCardId}
                      hoverSlideIndex={hoverSlideIndex}
                      handleOpenListing={handleOpenListing}
                      getSuggestedMedia={getSuggestedMedia}
                      getFallbackImage={getFallbackImage}
                      formatCompensation={formatCompensation}
                      getListingDisplayContent={getListingDisplayContent}
                      currentLang={currentLang}
                      showingOriginalListings={showingOriginalListings}
                      toggleOriginalListing={toggleOriginalListing}
                      localizeLocation={localizeLocation}
                      localizeTags={localizeTags}
                      generateTags={generateTags}
                      getAuthorAvatar={getAuthorAvatar}
                      profile={profile}
                      handleStartDiscussion={handleStartDiscussion}
                      isAdmin={isAdmin}
                      onAdminDeleteListing={handleAdminDeleteListing}
                      onOpenMobileActions={setMobileListingActionTarget}
                      t={t}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* BANNIÈRE LATÉRALE DROITE (DESKTOP) */}
            <aside className="desktop-ad-banner" aria-label="Monétisation & Boost Troco">
              <div className="ad-card" style={{ border: darkMode ? '1px solid rgba(245,158,11,0.3)' : '1px solid #FDE68A' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '9px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#B45309', backgroundColor: '#FEF3C7', padding: '3px 7px', borderRadius: '6px' }}>
                    🔥 Troco Boost
                  </span>
                  <span style={{ fontSize: '9px', color: darkMode ? '#94A3B8' : '#94A3B8' }}>Visibilité</span>
                </div>
                <img
                  src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=400&q=80"
                  alt="Booster annonce"
                  style={{ width: '100%', height: '85px', objectFit: 'cover', borderRadius: '12px', marginBottom: '8px' }}
                />
                <div style={{ fontSize: '13px', fontWeight: '800', color: darkMode ? '#FFFFFF' : '#0F172A', marginBottom: '4px', lineHeight: 1.3 }}>
                  Passez en tête du Feed !
                </div>
                <div style={{ fontSize: '11px', color: darkMode ? '#94A3B8' : '#64748B', lineHeight: 1.4, marginBottom: '6px' }}>
                  Multipliez par 5 vos contacts en plaçant vos annonces en tête d'affiche.
                </div>
                <div style={{ fontSize: '11px', fontWeight: '800', color: darkMode ? '#FBBF24' : '#D97706', marginBottom: '8px' }}>
                  À partir de 2,99€ / 7 jours
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const myListing = listings.find(l => l.author === profile.name) || listings[0];
                    if (myListing) {
                      setBoostingListing(myListing);
                      setIsBoostModalOpen(true);
                    } else {
                      setActiveTab('profile');
                      alert("💡 Créez ou sélectionnez l'une de vos annonces depuis votre profil pour activer le Boost !");
                    }
                  }}
                  className="premium-button"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '10px',
                    backgroundColor: '#D97706',
                    color: '#FFF',
                    fontSize: '11px',
                    fontWeight: '800',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    boxShadow: '0 4px 12px rgba(217,119,6,0.25)'
                  }}
                >
                  <Flame size={13} /> Booster mon annonce
                </button>
              </div>

              <div className="ad-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '9px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#7E22CE', backgroundColor: '#F3E8FF', padding: '3px 7px', borderRadius: '6px' }}>
                    🏢 Espace Pro
                  </span>
                  <span style={{ fontSize: '9px', color: darkMode ? '#94A3B8' : '#94A3B8' }}>Offre Pro</span>
                </div>
                <img
                  src="https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=400&q=80"
                  alt="Troco Entreprise"
                  style={{ width: '100%', height: '85px', objectFit: 'cover', borderRadius: '12px', marginBottom: '8px' }}
                />
                <div style={{ fontSize: '13px', fontWeight: '800', color: darkMode ? '#FFFFFF' : '#0F172A', marginBottom: '4px', lineHeight: 1.3 }}>
                  Vous êtes une Entreprise ?
                </div>
                <div style={{ fontSize: '11px', color: darkMode ? '#94A3B8' : '#64748B', lineHeight: 1.4, marginBottom: '8px' }}>
                  Abonnement Pro avec facturation TVA et échanges illimités.
                </div>
                <button
                  type="button"
                  onClick={() => setIsCguViewerOpen(true)}
                  className="premium-button"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '10px',
                    backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : '#F1F5F9',
                    color: darkMode ? '#FFF' : '#0F172A',
                    fontSize: '11px',
                    fontWeight: '700',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  En savoir plus
                </button>
              </div>
            </aside>
          </div>
        )}

        {/* ONGLET 2 : MESSAGERIE & NÉGOCIATIONS */}
        {activeTab === 'chat' && (() => {
          const activeChatData = chatsList.find(c => String(c.id) === String(selectedChat?.id));
          const otherUserName = activeChatData?.user || selectedChat?.user;
          const isThemTyping = !!(activeChatData?.typing && otherUserName && activeChatData.typing[otherUserName]);

          return (
            <ChatView
              activeTab={activeTab}
              mockChats={chatsList}
              selectedChat={selectedChat}
              setSelectedChat={handleSelectChat}
              chatThreads={chatThreads}
              readChats={readChats}
              chatInputText={messageDraft}
              setChatInputText={setMessageDraft}
              onTypingChange={handleTypingChange}
              isThemTyping={isThemTyping}
              handleSendMessage={handleSendMessage}
              handleEditMessage={handleEditMessage}
              handleDeleteMessage={handleDeleteMessage}
              openCounterOffer={openCounterOffer}
              startCall={startCall}
              handleAcceptDeal={handleAcceptDeal}
              handleDeclineDeal={handleDeclineDeal}
              profile={profile}
              currentLang={currentLang}
              t={t}
              darkMode={darkMode}
              getChatMessageDisplayContent={getChatMessageDisplayContent}
              getListingTitleTranslation={getListingTitleTranslation}
              formatStatus={formatStatus}
              showingOriginalMessages={showingOriginalMessages}
              toggleOriginalMessage={toggleOriginalMessage}
              isMobile={isMobile}
              presenceMap={presenceMap}
            />
          );
        })()}

        {/* ONGLET 3 : DÉPOSER UNE ANNONCE */}
        {activeTab === 'post' && (
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

            {postStep === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{t('chooseAdTypePrompt')}</div>
                <button onClick={() => setPostDraft(prev => ({ ...prev, type: 'offer' }))} style={{ border: '1.5px solid', borderColor: postDraft.type === 'offer' ? 'var(--accent-primary)' : 'var(--border-color)', borderRadius: '16px', padding: '14px', backgroundColor: postDraft.type === 'offer' ? 'var(--bg-subtle)' : 'var(--bg-card)', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: postDraft.type === 'offer' ? 'var(--shadow-accent)' : 'none' }}>
                  <div style={{ fontWeight: '800', color: postDraft.type === 'offer' ? 'var(--accent-primary)' : 'var(--text-main)' }}>{t('iOfferService')}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>{t('iOfferServiceSub')}</div>
                </button>
                <button onClick={() => setPostDraft(prev => ({ ...prev, type: 'request' }))} style={{ border: '1.5px solid', borderColor: postDraft.type === 'request' ? 'var(--accent-primary)' : 'var(--border-color)', borderRadius: '16px', padding: '14px', backgroundColor: postDraft.type === 'request' ? 'var(--bg-subtle)' : 'var(--bg-card)', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: postDraft.type === 'request' ? 'var(--shadow-accent)' : 'none' }}>
                  <div style={{ fontWeight: '800', color: postDraft.type === 'request' ? 'var(--accent-primary)' : 'var(--text-main)' }}>{t('iRequestService')}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>{t('iRequestServiceSub')}</div>
                </button>
              </div>
            )}

            {postStep === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>{t('adTitleLabel')}</label>
                  <input value={postDraft.title} onChange={(e) => setPostDraft(prev => ({ ...prev, title: e.target.value }))} type="text" placeholder={t('adTitlePlaceholder')} style={{ width: '100%', padding: '10px 12px', marginTop: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-main)', borderRadius: '12px' }} />
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
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>{t('adDescriptionLabel')}</label>
                  <textarea value={postDraft.description} onChange={(e) => setPostDraft(prev => ({ ...prev, description: e.target.value }))} rows={4} placeholder={t('adDescriptionPlaceholder')} style={{ width: '100%', padding: '10px 12px', marginTop: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-main)', borderRadius: '12px', resize: 'vertical' }} />
                </div>

                {/* ---- MÉDIAS INTELLIGENTS (PHOTO & VIDÉO) ---- */}
                <div style={{ padding: '16px', borderRadius: '18px', backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {t('adMediaDesc')}
                  </p>

                  {/* GRILLE VISUELLE DE PHOTOS */}
                  <PhotoGrid
                    photos={postDraft.gallery && postDraft.gallery.length > 0 ? postDraft.gallery : (postDraft.imageUrl ? [postDraft.imageUrl] : [])}
                    onAddPhoto={handlePhotoGridAdd}
                    onRemovePhoto={handlePhotoGridRemove}
                    onAutoGenerate={handlePhotoGridAutoGenerate}
                    maxPhotos={8}
                    darkMode={darkMode}
                    t={t}
                    currentLang={currentLang}
                  />

                  {/* SECTION VIDÉO */}
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px' }}>{t('miniVideoLabel')}</div>
                    <input value={postDraft.videoUrl} onChange={(e) => setPostDraft(prev => ({ ...prev, videoUrl: e.target.value }))} placeholder={t('videoUrlPlaceholder')} style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', borderRadius: '10px', fontSize: '12px', marginBottom: '8px' }} />
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <div style={{ width: '90px', height: '65px', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)' }}>
                        <video src={getSuggestedMedia(postDraft.title, postDraft.description, postDraft.imageUrl, postDraft.videoUrl).video} autoPlay loop muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <label style={{ flex: 1, border: '1px solid var(--border-color)', borderRadius: '10px', padding: '8px', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', fontSize: '11px', fontWeight: '800', cursor: 'pointer', textAlign: 'center' }}>
                        <Plus size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> {t('importVideo')}
                        <input type="file" accept="video/*" onChange={handleVideoFileUpload} style={{ display: 'none' }} />
                      </label>
                    </div>
                  </div>

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
            {postStep === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* PRESETS RAPIDES DE RÉTRIBUTION & DURÉE */}
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
                        border: (postDraft.compensation === 'troc' && postDraft.durationType === 'daily') ? '2px solid var(--accent-success)' : '1px solid var(--border-color)',
                        backgroundColor: (postDraft.compensation === 'troc' && postDraft.durationType === 'daily') ? 'var(--bg-subtle)' : 'var(--bg-card)',
                        color: (postDraft.compensation === 'troc' && postDraft.durationType === 'daily') ? 'var(--accent-success)' : 'var(--text-secondary)', fontWeight: '800', fontSize: '11px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s ease'
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

                {/* SÉLECTEUR DE FORMAT DE DURÉE */}
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

                {/* SÉLECTEUR DU MODE DE RÉTRIBUTION */}
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
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>{t('locationZoneLabel')}</label>
                  <input value={postDraft.location} onChange={(e) => setPostDraft(prev => ({ ...prev, location: e.target.value }))} type="text" placeholder="Paris, Lyon, à distance, etc." style={{ width: '100%', padding: '10px 12px', marginTop: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-main)', borderRadius: '12px' }} />
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
                      {profile.euroBalance >= 1.99 ? (
                        <span>Un supplément de <strong>1,99€</strong> sera débité de ton solde Euro (<strong>{profile.euroBalance.toFixed(2)}€</strong> disponibles) automatiquement à la publication.</span>
                      ) : (
                        <span>Solde Euro insuffisant (<strong>{profile.euroBalance.toFixed(2)}€</strong> disponibles sur les <strong>1,99€</strong> requis). Recharge ton portefeuille pour activer l'option Urgent.</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {postStep === 4 && (() => {
              const currentPhotoList = postDraft.gallery && postDraft.gallery.length > 0
                ? postDraft.gallery
                : (postDraft.imageUrl ? [postDraft.imageUrl] : []);
              const isEditingContentChanged = isEditingListing
                ? ((postDraft.title || '').trim() !== (editingOriginalListing?.title || '') || (postDraft.description || '').trim() !== (editingOriginalListing?.description || ''))
                : false;

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* APERÇU DE L'ANNONCE */}
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
                  <InvoiceCalculator
                    isUrgent={!!postDraft.isUrgent}
                    photoCount={currentPhotoList.length}
                    isEditing={isEditingListing}
                    isEditingContentChanged={isEditingContentChanged}
                    darkMode={darkMode}
                    t={t}
                    currentLang={currentLang}
                  />

                  <div style={{ fontSize: '13px', color: darkMode ? '#D4C5B5' : '#6B5E54' }}>{t('publishVisibilityNotice')}</div>
                </div>
              );
            })()}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '18px' }}>
              {postStep > 1 ? (
                <button onClick={() => setPostStep(prev => prev - 1)} className="premium-button" style={{ border: darkMode ? '1px solid rgba(232,221,211,0.2)' : '1px solid #E8DDD3', borderRadius: '999px', padding: '10px 16px', backgroundColor: darkMode ? '#1A1715' : '#FFF', color: darkMode ? '#FAF7F2' : '#3D3530', fontWeight: '700', cursor: 'pointer' }}>{t('backButton')}</button>
              ) : <span />}
              {postStep < 4 ? (
                <button onClick={() => setPostStep(prev => prev + 1)} className="premium-button" style={{ border: 'none', borderRadius: '999px', padding: '10px 16px', background: 'linear-gradient(135deg, #C67D5B 0%, #A8644A 100%)', color: '#FFF', fontWeight: '800', cursor: 'pointer', boxShadow: '0 8px 18px rgba(198,125,91,0.3)' }}>{t('continueButton')}</button>
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
                  <button onClick={handlePublishAnnouncement} className="premium-button" style={{ border: 'none', borderRadius: '999px', padding: '10px 20px', background: quote.totalTTC > 0 ? '#F59E0B' : 'linear-gradient(135deg, #C67D5B 0%, #A8644A 100%)', color: '#FFF', fontWeight: '800', cursor: 'pointer', boxShadow: '0 8px 18px rgba(198,125,91,0.3)' }}>
                    {buttonLabel}
                  </button>
                );
              })()}
            </div>
          </div>
        )}

        {/* ONGLET 4 : PROFIL UTILISATEUR */}
        {activeTab === 'profile' && (
          <div style={{ backgroundColor: darkMode ? '#231E1B' : '#FAF7F2', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', padding: '22px', borderRadius: '28px', border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3', boxShadow: '0 10px 30px rgba(61,53,48,0.06)', color: darkMode ? '#FAF7F2' : '#3D3530' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  {profile.kycVerified ? (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '800', padding: '6px 12px', borderRadius: '999px', backgroundColor: darkMode ? 'rgba(156,175,136,0.25)' : '#EBF0E6', color: '#3D4A35', border: '1px solid #D4DFCE' }}>
                      <ShieldCheck size={13} /> {t('verifiedProfile') || 'Identité Vérifiée'} ✅
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsKycModalOpen(true)}
                      className="premium-button"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '800', padding: '6px 12px', borderRadius: '999px',
                        backgroundColor: darkMode ? 'rgba(156,175,136,0.15)' : '#EBF0E6', color: '#3D4A35',
                        border: '1px solid #D4DFCE', cursor: 'pointer'
                      }}
                    >
                      <ShieldCheck size={13} /> Vérifier mon identité (+ Badge ✅)
                    </button>
                  )}
                  {profile.accountType && (
                    <span style={{
                      fontSize: '11px',
                      fontWeight: '800',
                      padding: '5px 10px',
                      borderRadius: '999px',
                      backgroundColor: 'var(--bg-subtle)',
                      color: 'var(--accent-primary)',
                      border: '1px solid var(--border-color)'
                    }}>
                      {profile.accountType === 'professional' && '💼 Pro / Freelance'}
                      {profile.accountType === 'company' && '🏢 Organisation / Asso'}
                      {profile.accountType === 'particular' && '👤 Particulier'}
                    </span>
                  )}
                </div>
                <h3 className="font-editorial-heading" style={{ margin: 0, fontSize: '24px', fontWeight: '600', color: 'var(--text-main)', letterSpacing: '-0.01em' }}>{isEditingProfile ? profileDraft.name : profile.name}</h3>
                <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--accent-primary)', marginTop: '2px' }}>{isEditingProfile ? (profileDraft.username || '@user') : (profile.username || '@mateopolo')}</div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                {!isEditingProfile && !profile.kycVerified && (
                  <button
                    type="button"
                    onClick={() => setIsKycModalOpen(true)}
                    className="premium-button"
                    style={{
                      border: '1.5px solid var(--accent-primary)',
                      borderRadius: '999px',
                      padding: '10px 16px',
                      backgroundColor: 'var(--bg-card)',
                      color: 'var(--accent-primary)',
                      fontWeight: '800',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: 'var(--shadow-accent)'
                    }}
                  >
                    <ShieldCheck size={14} color="var(--accent-primary)" /> Vérifier mon profil
                  </button>
                )}
                <button
                  onClick={() => setIsAdminPanelOpen(true)}
                  className="premium-button"
                  style={{
                    border: '1px solid var(--border-color)',
                    borderRadius: '999px',
                    padding: '10px 14px',
                    backgroundColor: 'var(--bg-subtle)',
                    color: 'var(--text-main)',
                    fontWeight: '800',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: 'var(--shadow-card)'
                  }}
                >
                  <ShieldAlert size={14} color="var(--accent-primary)" /> Panel Modération
                </button>
                <button onClick={() => isEditingProfile ? handleSaveProfile() : handleStartEdit()} className="premium-button" style={{ border: '1px solid var(--border-color)', borderRadius: '999px', padding: '10px 14px', backgroundColor: isEditingProfile ? 'var(--accent-primary)' : 'var(--bg-card)', color: isEditingProfile ? '#FFF' : 'var(--text-main)', fontWeight: '700', cursor: 'pointer', boxShadow: 'var(--shadow-card)' }}>
                  {isEditingProfile ? t('saveProfile') : t('editProfile')}
                </button>
                {!isEditingProfile && (
                  <button onClick={handleSignOut} className="premium-button" style={{ border: '1px solid var(--border-color)', borderRadius: '999px', padding: '10px 14px', backgroundColor: 'transparent', color: 'var(--text-secondary)', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <LogOut size={13} /> Se déconnecter
                  </button>
                )}
              </div>
            </div>

            <input type="file" ref={profileAvatarFileInputRef} onChange={handleAvatarFileUpload} accept="image/*" style={{ display: "none" }} />
            <div style={{ position: "relative", marginBottom: "18px", display: "inline-block", cursor: isEditingProfile ? "pointer" : "default" }} onClick={() => isEditingProfile && profileAvatarFileInputRef.current && profileAvatarFileInputRef.current.click()}>
              <img src={isEditingProfile ? profileDraft.avatar : profile.avatar} alt={profile.name} style={{ width: "112px", height: "112px", borderRadius: "50%", objectFit: "cover", border: "3px solid var(--accent-primary)", boxShadow: "var(--shadow-card)", transition: "all 0.3s ease" }} />
              {isEditingProfile && (
                <button title={t("uploadProfilePhoto")} onClick={(e) => { e.stopPropagation(); profileAvatarFileInputRef.current && profileAvatarFileInputRef.current.click(); }} style={{ position: "absolute", right: "0", bottom: "0", width: "38px", height: "38px", borderRadius: "50%", border: "none", backgroundColor: "var(--accent-primary)", color: "#FFF", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "var(--shadow-accent)" }}>
                  <Pencil size={16} />
                </button>
              )}
            </div>

            {isEditingProfile && (
              <>
                <div style={{ marginBottom: "14px" }}>
                  <button
                    onClick={() => profileAvatarFileInputRef.current && profileAvatarFileInputRef.current.click()}
                    className="premium-button"
                    style={{
                      width: "100%",
                      border: "1.5px dashed var(--accent-primary)",
                      borderRadius: "14px",
                      padding: "12px 14px",
                      backgroundColor: "var(--bg-subtle)",
                      color: "var(--accent-primary)",
                      fontWeight: "800",
                      fontSize: "13px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      boxShadow: "var(--shadow-card)"
                    }}
                  >
                    <Upload size={16} /> {t("uploadProfilePhoto")}
                  </button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: "8px", maxHeight: "120px", overflowY: "auto", padding: "4px", marginBottom: "12px" }}>
                  {avatarOptions.map((avatar) => (
                    <button key={avatar} onClick={() => setProfileDraft(prev => ({ ...prev, avatar }))} style={{ border: profileDraft.avatar === avatar ? "2.5px solid var(--accent-primary)" : "2px solid transparent", borderRadius: "50%", padding: 0, background: "none", cursor: "pointer", transform: profileDraft.avatar === avatar ? "scale(1.08)" : "scale(1)", transition: "all 0.2s" }}>
                      <img src={avatar} alt="avatar option" style={{ width: "42px", height: "42px", borderRadius: "50%", objectFit: "cover" }} />
                    </button>
                  ))}
                </div>
                <div style={{ marginBottom: "14px" }}>
                  <label style={{ fontSize: "12px", fontWeight: "800", color: "var(--text-secondary)" }}>URL de ta photo de profil (aperçu instantané)</label>
                  <input value={profileDraft.avatar} onChange={(e) => setProfileDraft(prev => ({ ...prev, avatar: e.target.value }))} placeholder="https://exemple.com/avatar.jpg" style={{ width: "100%", padding: "10px 12px", marginTop: "6px", border: "1px solid var(--border-color)", backgroundColor: "var(--bg-subtle)", color: "var(--text-main)", borderRadius: "12px", fontSize: "13px" }} />
                </div>
              </>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' }}>
              {isEditingProfile ? (
                <>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)' }}>Nom complet</label>
                      <input value={profileDraft.name} onChange={(e) => setProfileDraft(prev => ({ ...prev, name: e.target.value }))} placeholder="Nom" style={{ width: '100%', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-subtle)', borderRadius: '12px', padding: '10px 12px', fontSize: '14px', fontWeight: '700', color: 'var(--text-main)' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)' }}>Pseudo (@)</label>
                      <input value={profileDraft.username || ''} onChange={(e) => setProfileDraft(prev => ({ ...prev, username: e.target.value }))} placeholder="@pseudo" style={{ width: '100%', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-subtle)', borderRadius: '12px', padding: '10px 12px', fontSize: '14px', fontWeight: '700', color: 'var(--accent-primary)' }} />
                    </div>
                  </div>
                  <textarea value={profileDraft.bio} onChange={(e) => setProfileDraft(prev => ({ ...prev, bio: e.target.value }))} rows={3} style={{ width: '100%', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-subtle)', borderRadius: '14px', padding: '12px 14px', resize: 'vertical', fontSize: '13px', color: 'var(--text-main)' }} />
                  <input value={profileDraft.location} onChange={(e) => setProfileDraft(prev => ({ ...prev, location: e.target.value }))} style={{ width: '100%', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-subtle)', borderRadius: '14px', padding: '12px 14px', fontSize: '13px', color: 'var(--text-main)' }} />
                </>
              ) : (
                <>
                  <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '14px 16px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '14px', lineHeight: 1.7, color: 'var(--text-main)' }}>
                      {getBioTranslation(profile.bio, currentLang, showingOriginalBio)}
                    </div>
                    {currentLang !== 'FR' && (
                      <button
                        onClick={() => setShowingOriginalBio(prev => !prev)}
                        className="premium-button"
                        style={{ border: 'none', backgroundColor: 'transparent', color: 'var(--accent-primary)', fontSize: '11px', fontWeight: '800', cursor: 'pointer', marginTop: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: 0 }}
                      >
                        <Globe size={12} color="var(--accent-primary)" />
                        {showingOriginalBio ? t('showTranslation') : t('showOriginal')}
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}><MapPin size={14} color="var(--accent-primary)" /> {profile.location}</div>
                </>
              )}
            </div>

            <div style={{ marginBottom: '18px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '8px' }}>{t('spokenLanguages')}</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[
                  { code: 'FR', label: 'FR 🇫🇷' },
                  { code: 'EN', label: 'EN 🇬🇧' },
                  { code: 'ES', label: 'ES 🇪🇸' },
                  { code: 'IT', label: 'IT 🇮🇹' },
                  { code: 'DE', label: 'DE 🇩🇪' },
                  { code: 'PT', label: 'PT 🇵🇹' },
                  { code: 'AR', label: 'AR 🇸🇦' },
                  { code: 'ZH', label: 'ZH 🇨🇳' },
                  { code: 'JA', label: 'JA 🇯🇵' },
                  { code: 'RU', label: 'RU 🇷🇺' },
                  { code: 'NL', label: 'NL 🇳🇱' },
                  { code: 'KO', label: 'KO 🇰🇷' },
                ].map(({ code, label }) => {
                  const active = (isEditingProfile ? (profileDraft.languages || []) : (profile.languages || [])).includes(code);
                  return (
                    <button
                      key={code}
                      onClick={() => isEditingProfile ? toggleLanguage(code) : null}
                      style={{
                        border: active ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)',
                        backgroundColor: active ? 'var(--bg-subtle)' : 'var(--bg-card)',
                        color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        padding: '7px 12px',
                        borderRadius: '999px',
                        fontSize: '12px',
                        fontWeight: '800',
                        cursor: isEditingProfile ? 'pointer' : 'default',
                        transition: 'all 0.2s ease',
                        boxShadow: active ? 'var(--shadow-card)' : 'none'
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', borderRadius: '20px', backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-color)', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{t('euroBalance')}</div>
                  <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-main)', position: 'relative', overflow: 'visible' }}>
                    <AnimatedEuroBalance value={profile.euroBalance} suffix=" €" style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-main)' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => handleOpenPayment('topup-cash')} className="premium-button" style={{ border: 'none', borderRadius: '999px', padding: '9px 16px', background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)', color: '#FFF', fontWeight: '800', fontSize: '12px', cursor: 'pointer', boxShadow: 'var(--shadow-accent)' }}>
                    + Recharger (€)
                  </button>
                  <button onClick={() => setIsTransactionsModalOpen(true)} className="premium-button" style={{ border: '1px solid var(--border-color)', borderRadius: '999px', padding: '9px 14px', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', fontWeight: '700', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <FileText size={13} /> Factures
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{t('trocoTokensLabel')}</div>
                  <div style={{ fontSize: '19px', fontWeight: '800', color: 'var(--text-main)', position: 'relative', overflow: 'visible' }}>
                    <AnimatedTokenBalance value={profile.trocoTokens} formatFn={(v) => formatTokenCount(v, currentLang)} style={{ fontSize: '19px', fontWeight: '800', color: 'var(--text-main)' }} />
                  </div>
                </div>
                <button onClick={() => handleOpenPayment('troco-plus')} className="premium-button" style={{ border: 'none', borderRadius: '999px', padding: '9px 16px', background: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)', color: '#FFF', fontWeight: '800', fontSize: '12px', cursor: 'pointer', boxShadow: '0 8px 16px rgba(217,119,6,0.25)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={14} /> {profile.isTrocoPlus ? '⭐ Gérer Troco Plus' : '+ S\'abonner à Troco Plus'}
                </button>
              </div>
            </div>

            {saveMessage && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-success)', fontSize: '12px', fontWeight: '800', marginTop: '10px' }}>
                <Check size={14} /> {saveMessage}
              </div>
            )}

            {/* ---- PORTFOLIO PHOTOS ---- */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', marginTop: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <ImageIcon size={17} color="var(--accent-primary)" />
                <h4 className="font-editorial-heading" style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: 'var(--text-main)' }}>📸 Mon Portfolio</h4>
                <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700' }}>{portfolioImages.length} photo{portfolioImages.length !== 1 ? 's' : ''}</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 14px' }}>
                Ajoute des photos authentiques pour mettre en valeur ton savoir-faire.
              </p>

              {portfolioImages.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '14px' }}>
                  {portfolioImages.map((src, idx) => (
                    <div key={idx} style={{ position: 'relative', aspectRatio: '1', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
                      <img src={src} alt={`Portfolio ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={(e) => { e.target.style.display = 'none'; }} />
                      <button
                        onClick={() => handleRemovePortfolioImage(idx)}
                        style={{
                          position: 'absolute', top: '5px', right: '5px',
                          border: 'none', width: '24px', height: '24px', borderRadius: '50%',
                          backgroundColor: 'var(--overlay-bg)', color: '#FFF', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          backdropFilter: 'blur(4px)', fontSize: '12px', fontWeight: '800'
                        }}
                        title="Supprimer"
                      >✕</button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{
                  textAlign: 'center', padding: '24px 16px', marginBottom: '14px',
                  borderRadius: '14px',
                  border: '2px dashed var(--border-color)',
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600'
                }}>
                  Aucune photo — ajoute des images pour te démarquer 📷
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                  id="portfolio-url-input"
                  type="text"
                  value={portfolioUrlInput}
                  onChange={(e) => setPortfolioUrlInput(e.target.value)}
                  placeholder="Colle une URL d'image..."
                  style={{
                    flex: 1, minWidth: '180px', padding: '10px 14px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px', fontSize: '13px',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-main)', outline: 'none'
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && portfolioUrlInput.trim()) {
                      handleAddPortfolioImage(portfolioUrlInput.trim());
                      setPortfolioUrlInput('');
                    }
                  }}
                />
                <button
                  onClick={() => {
                    if (portfolioUrlInput.trim()) {
                      handleAddPortfolioImage(portfolioUrlInput.trim());
                      setPortfolioUrlInput('');
                    }
                  }}
                  className="premium-button"
                  style={{
                    border: 'none', borderRadius: '12px', padding: '10px 14px',
                    background: portfolioUrlInput.trim() ? 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)' : 'var(--bg-subtle)',
                    color: portfolioUrlInput.trim() ? '#FFF' : 'var(--text-muted)',
                    fontWeight: '800', cursor: portfolioUrlInput.trim() ? 'pointer' : 'not-allowed', fontSize: '13px',
                    display: 'flex', alignItems: 'center', gap: '6px'
                  }}
                >
                  <Plus size={16} /> Ajouter
                </button>
                <button
                  onClick={() => document.getElementById('portfolio-file-input')?.click()}
                  style={{
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px', padding: '10px 14px',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--accent-primary)',
                    fontWeight: '800', cursor: 'pointer', fontSize: '13px',
                    display: 'flex', alignItems: 'center', gap: '6px'
                  }}
                >
                  📷 Photo
                </button>
                <input
                  id="portfolio-file-input"
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => handleAddPortfolioImage(ev.target.result);
                    reader.readAsDataURL(file);
                    e.target.value = '';
                  }}
                />
              </div>

            </div>

            {/* ---- HISTORIQUE DES SWAPS & DEALS ---- */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <History size={17} color="var(--accent-primary)" />
                <h4 className="font-editorial-heading" style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: 'var(--text-main)' }}>{t('swapHistory')}</h4>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 14px' }}>{t('swapHistorySub')}</p>

              <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '130px', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '12px 14px', backgroundColor: 'var(--bg-subtle)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{t('closedDeals')}</div>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)' }}>{closedDealsCount}</div>
                </div>
                <div style={{ flex: 1, minWidth: '130px', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '12px 14px', backgroundColor: 'var(--bg-subtle)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{t('averageRating')}</div>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: '#F59E0B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {averageRating} {averageRating !== '—' && <Star size={15} fill="#F59E0B" color="#F59E0B" />}
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: '130px', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '12px 14px', backgroundColor: 'var(--bg-subtle)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{t('inProgressPlanned')}</div>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--accent-primary)' }}>{inProgressCount}</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {userSwapHistory.length === 0 ? (
                  <div style={{ padding: '28px 20px', textAlign: 'center', borderRadius: '20px', backgroundColor: 'var(--bg-card)', border: '1px dashed var(--border-color)' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--bg-subtle)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                      <Sparkles size={22} />
                    </div>
                    <div className="font-editorial-heading" style={{ fontWeight: '600', fontSize: '16px', color: 'var(--text-main)', marginBottom: '6px' }}>
                      Nouveau profil (0 deal clôturé)
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '380px', margin: '0 auto 16px', lineHeight: 1.6 }}>
                      Vous n'avez pas encore d'échange clôturé. Parcourez l'explorateur ou proposez un deal sur une annonce pour démarrer !
                    </p>
                    <button
                      onClick={() => setActiveTab('feed')}
                      className="premium-button"
                      style={{
                        border: 'none',
                        borderRadius: '999px',
                        padding: '10px 20px',
                        background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)',
                        color: '#FFF',
                        fontWeight: '800',
                        fontSize: '12px',
                        cursor: 'pointer',
                        boxShadow: 'var(--shadow-accent)'
                      }}
                    >
                      Explorer les annonces
                    </button>
                  </div>
                ) : (
                  userSwapHistory.map((entry) => {
                    const isClosed = entry.status === 'Clôturé';
                    const statusStyle = statusStyles[entry.status] || { bg: 'var(--bg-subtle)', text: 'var(--text-secondary)' };
                    return (
                      <div key={entry.id} className="premium-card" style={{ border: '1px solid var(--border-color)', borderRadius: '18px', padding: '14px', backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-card)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '6px' }}>
                          <div>
                            <div className="font-editorial-heading" style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text-main)', lineHeight: 1.4 }}>{getListingTitleTranslation(entry.deal, currentLang)}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '3px' }}>{entry.counterparty} • {entry.date}</div>
                          </div>
                          <span style={{ fontSize: '10px', fontWeight: '800', padding: '5px 10px', borderRadius: '999px', backgroundColor: statusStyle.bg, color: statusStyle.text, whiteSpace: 'nowrap' }}>{formatStatus(entry.status)}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--accent-primary)', fontWeight: '800', marginBottom: '8px' }}>{formatCompensation(entry.compensation)}</div>
                        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                          {isClosed ? (() => {
                            const isRevOrig = !!showingOriginalReviews[entry.id];
                            const revTxt = entry.review ? getReviewTranslation(entry.review, currentLang, isRevOrig) : null;
                            return (
                              <>
                                {entry.rating != null && (
                                  <div style={{ display: 'flex', gap: '2px', marginBottom: '6px' }}>
                                    {[1, 2, 3, 4, 5].map(star => (
                                      <Star key={star} size={13} fill={star <= entry.rating ? '#F59E0B' : 'none'} color={star <= entry.rating ? '#F59E0B' : '#E2E8F0'} />
                                    ))}
                                  </div>
                                )}
                                {revTxt && (
                                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6, fontStyle: 'italic' }}>« {revTxt} »</div>
                                )}
                                {!entry.rating && !revTxt && (
                                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Deal clôturé — aucun avis laissé.</div>
                                )}
                                {currentLang !== 'FR' && revTxt && (
                                  <button
                                    onClick={() => toggleOriginalReview(entry.id)}
                                    className="premium-button"
                                    style={{ border: 'none', backgroundColor: 'transparent', color: 'var(--accent-primary)', fontSize: '10px', fontWeight: '800', cursor: 'pointer', marginTop: '4px', display: 'inline-flex', alignItems: 'center', gap: '3px', padding: 0 }}
                                  >
                                    <Globe size={10} color="var(--accent-primary)" />
                                    {showingOriginalReviews[entry.id] ? t('showTranslation') : t('showOriginal')}
                                  </button>
                                )}
                              </>
                            );
                          })() : (
                            <div style={{ fontSize: '12px', color: entry.status === 'En cours' ? 'var(--accent-primary)' : 'var(--accent-warning)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {entry.status === 'En cours' ? '🔄' : '📅'} {entry.status === 'En cours' ? 'Échange en cours...' : 'Rendez-vous planifié'}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* ---- PERSONNALISATION DE L'ESPACE (THEME ENGINE) ---- */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', marginTop: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <Sparkles size={17} color="var(--accent-primary)" />
                <h4 className="font-editorial-heading" style={{ margin: 0, fontSize: '17px', fontWeight: '600', color: 'var(--text-main)' }}>
                  🎨 Personnalisation de l'espace
                </h4>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
                Choisis ton ambiance visuelle préférée. Toutes les couleurs de Troco s'adaptent instantanément.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)', gap: '12px', marginBottom: '16px' }}>
                {allThemes.map((tItem) => {
                  const isSelected = themeId === tItem.id;
                  return (
                    <button
                      key={tItem.id}
                      type="button"
                      onClick={() => setThemeId(tItem.id)}
                      className="premium-button"
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        padding: '14px 10px',
                        borderRadius: '20px',
                        border: isSelected ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                        backgroundColor: isSelected ? 'var(--bg-subtle)' : 'var(--bg-card)',
                        cursor: 'pointer',
                        boxShadow: isSelected ? 'var(--shadow-accent)' : 'var(--shadow-card)',
                        transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                        transition: 'all 0.25s var(--ease-quiet)',
                        position: 'relative'
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        border: '2px solid rgba(255,255,255,0.6)',
                        marginBottom: '8px'
                      }}>
                        {tItem.previewColors.map((col, idx) => (
                          <div key={idx} style={{ flex: 1, backgroundColor: col, height: '100%' }} />
                        ))}
                      </div>

                      <div style={{ fontSize: '12.5px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '2px', textAlign: 'center' }}>
                        {tItem.name}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.25 }}>
                        {tItem.description}
                      </div>

                      {isSelected && (
                        <div style={{
                          position: 'absolute',
                          top: '6px',
                          right: '6px',
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--accent-primary)',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          fontWeight: '900'
                        }}>
                          ✓
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* CONSTRUCTEUR DE THÈME SUR-MESURE EN DIRECT */}
              {themeId === 'custom' && (
                <div style={{
                  backgroundColor: 'var(--bg-card)',
                  borderRadius: '20px',
                  padding: '18px',
                  border: '1.5px solid var(--accent-primary)',
                  boxShadow: 'var(--shadow-card)',
                  marginBottom: '20px',
                  animation: 'fadeSlideUp 0.3s ease both'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '18px' }}>🎨</span>
                      <div>
                        <div style={{ fontSize: '13.5px', fontWeight: '800', color: 'var(--text-main)' }}>
                          Palette Sur-Mesure
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          Ajustez les 3 teintes maîtresses pour recalculer tout le thème en temps réel
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCustomColors && setCustomColors({ primary: '#B98B73', bg: '#FAF7F2', text: '#3F4238' })}
                      className="premium-button"
                      style={{
                        border: '1px solid var(--border-color)',
                        borderRadius: '999px',
                        padding: '4px 12px',
                        backgroundColor: 'var(--bg-subtle)',
                        color: 'var(--text-secondary)',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      Réinitialiser
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '12px' }}>
                    {/* 1. COULEUR PRINCIPALE / ACCENT */}
                    <div style={{
                      backgroundColor: 'var(--bg-subtle)',
                      borderRadius: '16px',
                      padding: '12px',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <input
                        type="color"
                        value={customColors?.primary || '#B98B73'}
                        onChange={(e) => setCustomColors && setCustomColors({ primary: e.target.value })}
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '12px',
                          border: '2px solid var(--border-color)',
                          cursor: 'pointer',
                          backgroundColor: 'transparent',
                          padding: '0',
                          flexShrink: 0
                        }}
                      />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-main)' }}>Couleur d'accent</div>
                        <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{customColors?.primary || '#B98B73'}</div>
                      </div>
                    </div>

                    {/* 2. COULEUR DE FOND */}
                    <div style={{
                      backgroundColor: 'var(--bg-subtle)',
                      borderRadius: '16px',
                      padding: '12px',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <input
                        type="color"
                        value={customColors?.bg || '#FAF7F2'}
                        onChange={(e) => setCustomColors && setCustomColors({ bg: e.target.value })}
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '12px',
                          border: '2px solid var(--border-color)',
                          cursor: 'pointer',
                          backgroundColor: 'transparent',
                          padding: '0',
                          flexShrink: 0
                        }}
                      />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-main)' }}>Couleur de fond</div>
                        <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{customColors?.bg || '#FAF7F2'}</div>
                      </div>
                    </div>

                    {/* 3. COULEUR DE TEXTE */}
                    <div style={{
                      backgroundColor: 'var(--bg-subtle)',
                      borderRadius: '16px',
                      padding: '12px',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <input
                        type="color"
                        value={customColors?.text || '#3F4238'}
                        onChange={(e) => setCustomColors && setCustomColors({ text: e.target.value })}
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '12px',
                          border: '2px solid var(--border-color)',
                          cursor: 'pointer',
                          backgroundColor: 'transparent',
                          padding: '0',
                          flexShrink: 0
                        }}
                      />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-main)' }}>Couleur de texte</div>
                        <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{customColors?.text || '#3F4238'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ---- CADRE JURIDIQUE & RGPD ---- */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', marginTop: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <ShieldCheck size={17} color="var(--accent-primary)" />
                <h4 className="font-editorial-heading" style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: 'var(--text-main)' }}>Sécurité, Juridique & RGPD</h4>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 14px' }}>
                Gérez vos données personnelles, exportez vos archives ou consultez les Conditions Générales de Troco.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  onClick={() => setIsPrivacyCenterOpen(true)}
                  className="premium-button"
                  style={{
                    border: '1px solid var(--border-color)',
                    borderRadius: '16px',
                    padding: '14px 16px',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    fontWeight: '700',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    boxShadow: 'var(--shadow-card)',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Lock size={16} color="var(--accent-primary)" /> Centre de Confidentialité & Export RGPD (JSON)
                  </span>
                  <ChevronRight size={16} color="var(--accent-primary)" />
                </button>

                <button
                  onClick={() => setIsCguViewerOpen(true)}
                  className="premium-button"
                  style={{
                    border: '1px solid var(--border-color)',
                    borderRadius: '16px',
                    padding: '14px 16px',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    fontWeight: '700',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    boxShadow: 'var(--shadow-card)',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Scale size={16} color="var(--accent-primary)" /> Conditions Générales & Charte Communautaire (v2026.1)
                  </span>
                  <ChevronRight size={16} color="var(--accent-primary)" />
                </button>

                <button
                  onClick={() => setIsAdminPanelOpen(true)}
                  className="premium-button"
                  style={{
                    border: '1px solid var(--border-color)',
                    borderRadius: '16px',
                    padding: '14px 16px',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    fontWeight: '700',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    boxShadow: 'var(--shadow-card)',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <ShieldAlert size={16} color="var(--accent-success)" /> Panel Administrateur & Modération
                  </span>
                  <ChevronRight size={16} color="var(--accent-primary)" />
                </button>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* BARRE DE NAVIGATION EN BAS (GLASSMORPHISM WARM THEMED) */}
      <nav style={{
        display: (isMobile && activeTab === 'chat' && selectedChat) ? 'none' : 'block',
        position: 'fixed', bottom: 0, left: 0, right: 0,
        backgroundColor: 'var(--bg-glass)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        borderTop: '1px solid var(--border-color)',
        padding: '10px 0', zIndex: 40,
        boxShadow: 'var(--shadow-card)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>

          <button onClick={() => { setActiveTab('feed'); setSelectedChat(null); }} className="premium-nav-btn" style={{ border: 'none', background: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', color: activeTab === 'feed' ? 'var(--accent-primary)' : 'var(--text-secondary)', cursor: 'pointer', padding: '6px 14px', borderRadius: '16px' }}>
            <Search size={20} />
            <span style={{ fontSize: '10.5px', fontWeight: '700' }}>{t('explorer')}</span>
          </button>

          <button onClick={() => { setActiveTab('chat'); setSelectedChat(null); }} className="premium-nav-btn" style={{ border: 'none', background: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', color: activeTab === 'chat' ? 'var(--accent-primary)' : 'var(--text-secondary)', cursor: 'pointer', padding: '6px 14px', borderRadius: '16px', position: 'relative' }}>
            <span style={{ position: 'relative', display: 'inline-flex' }}>
              <MessageSquare size={20} />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-6px',
                  right: '-8px',
                  minWidth: '16px',
                  height: '16px',
                  backgroundColor: 'var(--text-main)',
                  color: 'var(--bg-global)',
                  fontSize: '9px',
                  fontWeight: '900',
                  borderRadius: '999px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 3px',
                  border: '1.5px solid var(--bg-card)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                  letterSpacing: '-0.3px',
                }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </span>
            <span style={{ fontSize: '10.5px', fontWeight: '700' }}>{t('messages')}</span>
          </button>

          <button
            onClick={() => {
              setSelectedChat(null);
              if (activeTab === 'post') {
                setPostStep(1);
                setPostDraft(defaultPostDraft);
                setPublishMessage('');
                setIsEditingListing(false);
              } else {
                setActiveTab('post');
              }
            }}
            style={{ border: 'none', background: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', color: activeTab === 'post' ? 'var(--accent-primary)' : 'var(--text-secondary)', cursor: 'pointer', padding: '6px 14px', borderRadius: '16px' }}
          >
            <PlusCircle size={26} color={activeTab === 'post' ? 'var(--accent-primary)' : 'var(--text-secondary)'} />
            <span style={{ fontSize: '10.5px', fontWeight: '700' }}>{t('post')}</span>
          </button>

          <button onClick={() => { setActiveTab('profile'); setSelectedChat(null); }} className="premium-nav-btn" style={{ border: 'none', background: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', color: activeTab === 'profile' ? 'var(--accent-primary)' : 'var(--text-secondary)', cursor: 'pointer', padding: '6px 14px', borderRadius: '16px' }}>
            <User size={20} />
            <span style={{ fontSize: '10.5px', fontWeight: '700' }}>{t('profile')}</span>
          </button>

        </div>
      </nav>

      {/* POPUP CONFIRMATION PUBLICATION */}
      {showPublishedPopup && publishedListing && (
        <div
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', zIndex: 9000 }}
          onClick={() => {
            setShowPublishedPopup(false);
            setSelectedListing(publishedListing);
            setActiveTab('feed');
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: 'var(--bg-card)', backdropFilter: 'blur(24px)', borderRadius: '28px', padding: '32px 28px', maxWidth: '380px', width: '100%', boxShadow: 'var(--shadow-modal)', border: '1px solid var(--border-color)', textAlign: 'center', animation: 'popupIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both' }}
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
                    currentLang === 'IT' ? 'Il tuo annuncio è ora visibile nel feed, sulla mappa e nei risultati di recherche.' :
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
          style={{
            position: 'fixed', inset: 0,
            backgroundColor: 'rgba(61, 53, 48, 0.72)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0', zIndex: 4000,
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
                onClick={() => {
                  const targetId = mobileListingActionTarget.id;
                  handleTogglePauseListing(targetId);
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

      {isLangModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(61, 53, 48, 0.72)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 3500 }}>
          <div style={{ backgroundColor: darkMode ? '#231E1B' : '#FAF7F2', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderRadius: '24px', width: '100%', maxWidth: '400px', padding: '24px', boxShadow: '0 24px 60px rgba(61,53,48,0.25)', border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3', position: 'relative' }}>
            <button onClick={() => setIsLangModalOpen(false)} style={{ position: 'absolute', top: '16px', right: '16px', border: 'none', backgroundColor: darkMode ? 'rgba(232,221,211,0.1)' : '#F5EAE4', color: darkMode ? '#FAF7F2' : '#3D3530', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <X size={16} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Globe size={20} color="#C67D5B" />
              <h3 className="font-editorial-heading" style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: darkMode ? '#FAF7F2' : '#3D3530' }}>{t('selectLanguage')}</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { code: 'FR', label: 'Français', flag: '🇫🇷' },
                { code: 'EN', label: 'English', flag: '🇬🇧' },
                { code: 'ES', label: 'Español', flag: '🇪🇸' },
                { code: 'IT', label: 'Italiano', flag: '🇮🇹' },
                { code: 'DE', label: 'Deutsch', flag: '🇩🇪' },
                { code: 'JA', label: '日本語', flag: '🇯🇵' },
                { code: 'ZH', label: '中文', flag: '🇨🇳' },
              ].map(lang => (
                <button
                  key={lang.code}
                  onClick={() => { setCurrentLang(lang.code); setIsLangModalOpen(false); }}
                  className="premium-button"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '14px',
                    border: currentLang === lang.code ? '1.5px solid #C67D5B' : (darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3'),
                    backgroundColor: currentLang === lang.code ? (darkMode ? 'rgba(198,125,91,0.25)' : '#F5EAE4') : (darkMode ? '#1A1715' : '#FFF'),
                    color: darkMode ? '#FAF7F2' : '#3D3530',
                    fontWeight: '700',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '18px' }}>{lang.flag}</span> {lang.label}
                  </span>
                  {currentLang === lang.code && <Check size={18} color="#C67D5B" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {incomingCall && !callState.active && (
        <div style={{
          position: 'fixed', top: '16px', left: '50%', transform: 'translateX(-50%)',
          width: 'calc(100% - 32px)', maxWidth: '520px', zIndex: 999999,
          background: darkMode ? 'rgba(35,30,27,0.98)' : 'rgba(250,247,242,0.98)',
          backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
          border: '1.5px solid #C67D5B',
          borderRadius: '24px',
          padding: '14px 18px',
          display: 'flex', alignItems: 'center', gap: '14px',
          boxShadow: '0 16px 48px rgba(61,53,48,0.3)',
          animation: 'slideDownIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #C67D5B 0%, #A8644A 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', color: '#FFF', fontWeight: '800', flexShrink: 0, boxShadow: '0 4px 12px rgba(198,125,91,0.3)' }}>
            {incomingCall.from ? incomingCall.from[0].toUpperCase() : 'T'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: darkMode ? '#FAF7F2' : '#3D3530', fontWeight: '800', fontSize: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {incomingCall.from}
            </div>
            <div style={{ color: '#C67D5B', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: '600' }}>
              {incomingCall.type === 'video' ? <Video size={13} color="#C67D5B" /> : <Phone size={13} color="#C67D5B" />}
              <span>{incomingCall.type === 'video' ? 'Appel vidéo entrant...' : 'Appel audio entrant...'}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            <button
              onClick={declineIncomingCall}
              style={{
                border: 'none', width: '44px', height: '44px', borderRadius: '50%',
                backgroundColor: '#EF4444', color: '#FFF', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(239,68,68,0.4)',
              }}
              title="Refuser l'appel"
            >
              <PhoneOff size={18} />
            </button>
            <button
              onClick={handleAcceptIncomingCall}
              style={{
                border: 'none', width: '44px', height: '44px', borderRadius: '50%',
                backgroundColor: '#9CAF88', color: '#FFF', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(156,175,136,0.4)',
              }}
              title="Accepter l'appel"
            >
              <Phone size={18} />
            </button>
          </div>
        </div>
      )}

      {/* ---- MODAL DE VISIO / APPEL PLEIN ÉCRAN (QUAND PAS EN MODE PIP) ---- */}
      {callState.active && !isCallPip && (
        <div
          onPointerDown={resetCallInactivity}
          onPointerMove={resetCallInactivity}
          onTouchStart={resetCallInactivity}
          onClick={resetCallInactivity}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            backgroundColor: 'var(--call-bg)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            animation: 'fadeSlideUp 0.3s ease both',
            userSelect: 'none',
            WebkitUserSelect: 'none'
          }}
        >
          {!isSwapVideo ? (
            callState.type === 'video' && remoteStream && !callState.ringing ? (
              <video
                ref={attachRemoteStream}
                autoPlay
                playsInline
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  zIndex: 2,
                }}
              />
            ) : null
          ) : (
            callState.type === 'video' && localStream && callState.camOn ? (
              <video
                ref={attachLocalStream}
                muted
                autoPlay
                playsInline
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                  zIndex: 2,
                }}
              />
            ) : null
          )}

          {remoteStream && (
            <audio ref={attachRemoteStream} autoPlay playsInline style={{ display: 'none' }} />
          )}

          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 50% 40%, var(--accent-primary) 0%, transparent 60%)', opacity: 0.25, zIndex: 1 }} />

          {/* BANDEAU SUPÉRIEUR CENTRÉ & ÉQUILIBRÉ UNIFIÉ */}
          <div style={{
            position: 'fixed',
            top: 'max(12px, env(safe-area-inset-top, 12px))',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'calc(100% - 24px)',
            maxWidth: '440px',
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            boxSizing: 'border-box',
            transition: 'all 500ms cubic-bezier(0.22, 1, 0.36, 1)',
            opacity: isCallInactive ? 0.35 : 1,
            pointerEvents: isCallInactive ? 'none' : 'auto'
          }}>
            {/* CAPSULE PRINCIPALE INFOS APPEL & RÉTRIBUTION */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: isCallInactive ? 'transparent' : 'var(--call-card)',
              backdropFilter: isCallInactive ? 'none' : 'blur(20px)',
              WebkitBackdropFilter: isCallInactive ? 'none' : 'blur(20px)',
              padding: '6px 12px',
              borderRadius: '999px',
              border: isCallInactive ? '1px solid transparent' : '1.5px solid var(--border-color)',
              boxShadow: isCallInactive ? 'none' : '0 12px 35px rgba(0,0,0,0.5), 0 0 20px rgba(214,69,110,0.2)',
              flex: '1',
              minWidth: 0,
              overflow: 'hidden'
            }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <img
                  src={getAuthorAvatar(selectedChat?.user || 'Thomas G.')}
                  alt={selectedChat?.user || 'Thomas G.'}
                  style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid var(--accent-primary)', objectFit: 'cover' }}
                />
                <div style={{
                  position: 'absolute', bottom: '0', right: '0',
                  width: '9px', height: '9px', borderRadius: '50%',
                  backgroundColor: 'var(--accent-primary)', border: '1.5px solid var(--call-bg)'
                }} />
              </div>

              <div style={{ minWidth: 0, flex: '1 1 auto', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '1px' }}>
                <div style={{ color: '#FFF', fontSize: '12.5px', fontWeight: '800', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {selectedChat?.user || 'Thomas G.'}
                </div>
                <div style={{ color: 'var(--accent-primary)', fontSize: '10.5px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap' }}>
                  <Clock size={11} color="var(--accent-primary)" />
                  <span>{formatCallTimer(callDuration)}</span>
                  <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.7)', fontWeight: '600' }}>
                    (🪙 {(callDuration / 3600).toFixed(2)})
                  </span>
                </div>
              </div>

              {!callState.ringing && (
                <button
                  onClick={() => {
                    setSettlementCallDuration(callDuration);
                    setIsSettlementModalOpen(true);
                  }}
                  title="Ouvrir le bilan & transférer des jetons"
                  style={{
                    border: '1px solid #D97706',
                    backgroundColor: 'rgba(217,119,6,0.25)',
                    color: '#FDE68A',
                    padding: '4px 8px',
                    borderRadius: '999px',
                    fontSize: '10.5px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                    boxShadow: '0 0 10px rgba(217,119,6,0.25)'
                  }}
                >
                  <Coins size={11} color="#D97706" />
                  <span>Rétribuer</span>
                </button>
              )}

              {isTeacher && (
                <div style={{
                  padding: '3px 7px',
                  backgroundColor: 'rgba(217,119,6,0.25)', border: '1px solid #D97706',
                  color: '#FDE68A', borderRadius: '999px', fontSize: '10px', fontWeight: '800',
                  display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0, whiteSpace: 'nowrap'
                }}>
                  <Crown size={11} color="#D97706" />
                  <span>Hôte</span>
                </div>
              )}
            </div>

            {/* BOUTONS ACTIONS RAPIDES DU HEADER */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
              <button
                onClick={() => setIsCallPip(true)}
                title="Réduire en bulle flottante (PiP)"
                style={{
                  border: '1px solid var(--border-color)', width: '36px', height: '36px', borderRadius: '50%',
                  backgroundColor: 'var(--call-card)', backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)', color: '#FFF',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', transition: 'all 0.2s ease'
                }}
              >
                <Minimize2 size={16} />
              </button>

              <button
                onClick={endCall}
                title="Quitter l'appel"
                style={{
                  border: '1px solid var(--border-color)', width: '36px', height: '36px', borderRadius: '50%',
                  backgroundColor: 'var(--call-card)', color: '#FFF',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', transition: 'all 0.2s ease',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {callState.ringing && (
            <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '18px',
              zIndex: 30,
              pointerEvents: 'none',
              padding: '20px',
              boxSizing: 'border-box'
            }}>
              <div style={{ position: 'relative', width: '130px', height: '130px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {[1, 2, 3].map(i => (
                  <div key={i} style={{
                    position: 'absolute',
                    width: `${130 + i * 44}px`,
                    height: `${130 + i * 44}px`,
                    borderRadius: '50%',
                    border: '2px solid var(--accent-primary)',
                    opacity: 0.35,
                    animation: `notifPulse ${1 + i * 0.3}s ease-in-out infinite`,
                    animationDelay: `${i * 0.2}s`,
                  }} />
                ))}
                <img
                  src={getAuthorAvatar(selectedChat?.user || 'Thomas G.')}
                  alt={selectedChat?.user || 'Thomas G.'}
                  style={{
                    width: '110px',
                    height: '110px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '3px solid var(--accent-primary)',
                    boxShadow: '0 0 30px rgba(214,69,110,0.4)',
                    position: 'relative',
                    zIndex: 2,
                  }}
                />
              </div>

              <div style={{ textAlign: 'center' }}>
                <h3 className="font-editorial-heading" style={{ color: '#FFF', fontSize: '24px', fontWeight: '600', margin: '0 0 6px 0' }}>
                  {selectedChat?.user || 'Thomas G.'}
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '13px', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <Sparkles size={14} color="var(--accent-primary)" />
                  <span>{callState.type === 'video' ? 'Appel vidéo en cours...' : 'Appel vocal HD en cours...'}</span>
                </p>
              </div>
            </div>
          )}

          {/* PLACEHOLDER UNIQUEMENT EN APPEL AUDIO OU SI AUCUNE VIDÉO DISPONIBLE */}
          {(callState.type === 'audio' || (callState.type === 'video' && !remoteStream && !isSwapVideo && !callState.camOn)) && !callState.ringing && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', zIndex: 10 }}>
              <div style={{ position: 'relative' }}>
                <img
                  src={getAuthorAvatar(selectedChat?.user || 'Thomas G.')}
                  alt={selectedChat?.user || 'Thomas G.'}
                  style={{
                    width: '120px',
                    height: '120px',
                    borderRadius: '50%',
                    border: '4px solid var(--accent-primary)',
                    boxShadow: '0 0 40px rgba(214, 69, 110, 0.35)',
                    objectFit: 'cover'
                  }}
                />
                <div style={{
                  position: 'absolute', bottom: '6px', right: '6px',
                  width: '18px', height: '18px', borderRadius: '50%',
                  backgroundColor: 'var(--accent-primary)', border: '3px solid var(--call-bg)',
                  boxShadow: '0 0 10px rgba(214,69,110,0.6)'
                }} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <h2 className="font-editorial-heading" style={{ color: '#FFF', fontSize: '26px', fontWeight: '600', margin: '0 0 4px 0' }}>
                  {selectedChat?.user || 'Thomas G.'}
                </h2>
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: '600' }}>
                  {callState.type === 'video' ? "Caméra distante désactivée" : "Appel audio sécurisé WebRTC"}
                </span>
              </div>
            </div>
          )}

          {/* VIGNETTE FLOTTANTE DU FLUX SECONDAIRE */}
          {callState.type === 'video' && !callState.ringing && (
            (isSwapVideo ? remoteStream : (localStream && callState.camOn)) ? (
              <div
                onPointerDown={handleLocalVideoPointerDown}
                onPointerMove={handleLocalVideoPointerMove}
                onPointerUp={handleLocalVideoPointerUp}
                onPointerCancel={handleLocalVideoPointerUp}
                onClick={handleLocalVideoClick}
                title="Cliquer pour inverser les flux / Glisser pour déplacer"
                style={{
                  position: 'fixed',
                  left: `${localVideoPosition.x}px`,
                  top: `${localVideoPosition.y}px`,
                  width: '110px',
                  height: '150px',
                  borderRadius: '18px',
                  overflow: 'hidden',
                  border: '2px solid var(--accent-primary)',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                  backgroundColor: 'var(--call-card)',
                  zIndex: 40,
                  cursor: 'grab',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  touchAction: 'none',
                  opacity: isCallInactive ? 0.5 : 1
                }}
              >
                {isSwapVideo ? (
                  <video
                    ref={attachRemoteStream}
                    autoPlay
                    playsInline
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      pointerEvents: 'none'
                    }}
                  />
                ) : (
                  <video
                    ref={attachLocalStream}
                    muted
                    autoPlay
                    playsInline
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                      pointerEvents: 'none'
                    }}
                  />
                )}
                <div style={{
                  position: 'absolute', bottom: '6px', left: '6px',
                  backgroundColor: 'rgba(0,0,0,0.75)', padding: '2px 6px',
                  borderRadius: '6px', color: '#FFF', fontSize: '9px', fontWeight: '700',
                  pointerEvents: 'none'
                }}>
                  {isSwapVideo ? (selectedChat?.user || 'Interlocuteur') : 'Moi'}
                </div>
              </div>
            ) : null
          )}

          {!showCallControls && (
            <button
              onClick={() => setShowCallControls(true)}
              className="premium-button"
              style={{
                position: 'fixed',
                bottom: 'max(24px, env(safe-area-inset-bottom, 24px))',
                left: 'max(16px, env(safe-area-inset-left, 16px))',
                right: 'auto',
                transform: 'none',
                backgroundColor: 'var(--call-card)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid var(--border-color)',
                borderRadius: '999px',
                padding: '8px 18px',
                color: '#FFF',
                fontSize: '12px',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.5), 0 0 16px rgba(214,69,110,0.2)',
                zIndex: 50,
                animation: 'fadeSlideUp 0.25s ease both'
              }}
            >
              <Eye size={14} color="var(--accent-primary)" />
              <span>Afficher les commandes</span>
              <ChevronUp size={14} />
            </button>
          )}

          {showCallControls && (
            <div
              className="call-controls-dock"
              onPointerDown={handleCallControlsPointerDown}
              onPointerMove={handleCallControlsPointerMove}
              onPointerUp={handleCallControlsPointerUp}
              onPointerCancel={handleCallControlsPointerUp}
              style={{
                transform: `translate(${callControlsPos.x}px, ${callControlsPos.y}px)`,
                opacity: isCallInactive ? 0.35 : 1,
                cursor: isDraggingCallControls ? 'grabbing' : 'grab',
                backgroundColor: 'var(--call-card)',
                borderColor: 'var(--border-color)',
              }}
            >
              {/* LIGNE 1 : CONTRÔLES VITAUX (RACCROCHER, MICRO, CAMÉRA, PIP, POIGNÉE) */}
              <div className="call-controls-row">
                <div
                  title="Glisser pour déplacer"
                  style={{
                    color: 'rgba(255,255,255,0.5)',
                    cursor: isDraggingCallControls ? 'grabbing' : 'grab',
                    paddingRight: '2px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <GripHorizontal size={16} />
                </div>

                <button
                  className="call-btn-circle call-btn-hangup"
                  onClick={endCall}
                  title="Raccrocher et quitter l'appel"
                  style={{
                    backgroundColor: '#DC2626',
                    color: '#FFF',
                    border: '1.5px solid rgba(255,255,255,0.3)',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.6)'
                  }}
                >
                  <PhoneOff size={18} />
                </button>

                <button
                  className="call-btn-circle"
                  onClick={toggleMic}
                  style={{
                    backgroundColor: callState.micOn ? 'rgba(255,255,255,0.18)' : '#DC2626',
                    border: callState.micOn ? 'none' : '1.5px solid rgba(255,255,255,0.3)'
                  }}
                  title={callState.micOn ? "Couper le micro" : "Activer le micro"}
                >
                  {callState.micOn ? <Mic size={18} /> : <MicOff size={18} />}
                </button>

                {callState.type === 'video' && (
                  <button
                    className="call-btn-circle"
                    onClick={toggleCam}
                    style={{
                      backgroundColor: callState.camOn ? 'rgba(255,255,255,0.18)' : '#DC2626',
                      border: callState.camOn ? 'none' : '1.5px solid rgba(255,255,255,0.3)'
                    }}
                    title={callState.camOn ? "Couper la caméra" : "Activer la caméra"}
                  >
                    {callState.camOn ? <Camera size={18} /> : <VideoOff size={18} />}
                  </button>
                )}

                <button
                  className="call-btn-circle"
                  onClick={() => setIsCallPip(true)}
                  title="Réduire l'appel (PiP)"
                >
                  <Minimize2 size={18} />
                </button>
              </div>

              {/* LIGNE 2 : OUTILS ÉTENDUS (ÉCRAN, FLIP, SWAP, INVITER, IMMERSION, PROF) */}
              <div className="call-controls-row">
                {callState.type === 'video' && (
                  <button
                    className="call-btn-circle"
                    onClick={toggleScreenShare}
                    style={{
                      backgroundColor: callState.isScreenSharing ? 'var(--accent-primary)' : 'rgba(255,255,255,0.14)',
                      boxShadow: callState.isScreenSharing ? '0 0 16px var(--accent-primary)' : 'none'
                    }}
                    title={callState.isScreenSharing ? "Arrêter le partage d'écran" : "Partager mon écran"}
                  >
                    {callState.isScreenSharing ? <MonitorOff size={18} /> : <Monitor size={18} />}
                  </button>
                )}

                {callState.type === 'video' && callState.camOn && !callState.isScreenSharing && hasMultipleCameras && (
                  <button
                    className="call-btn-circle"
                    onClick={switchCamera}
                    style={{
                      backgroundColor: facingMode === 'environment' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.14)',
                      color: '#FFF'
                    }}
                    title={facingMode === 'user' ? "Caméra arrière" : "Caméra avant"}
                  >
                    <SwitchCamera size={18} />
                  </button>
                )}

                {callState.type === 'video' && (
                  <button
                    className="call-btn-circle"
                    onClick={() => setIsSwapVideo(s => !s)}
                    style={{
                      backgroundColor: isSwapVideo ? 'var(--accent-primary)' : 'rgba(255,255,255,0.14)',
                      color: '#FFF'
                    }}
                    title="Inverser les caméras"
                  >
                    <Repeat size={18} />
                  </button>
                )}

                <button
                  className="call-btn-circle"
                  onClick={copyInviteLink}
                  title="Copier le lien d'invitation"
                >
                  <UserPlus size={18} />
                </button>

                <button
                  className="call-btn-circle"
                  onClick={() => setShowCallControls(false)}
                  title="Mode Immersion (Masquer commandes)"
                  style={{ color: 'rgba(255,255,255,0.8)' }}
                >
                  <EyeOff size={18} />
                </button>

                {isTeacher && (
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <button
                      className="call-btn-circle"
                      onClick={() => setIsTeacherMenuOpen(o => !o)}
                      title="Outils Professeur / Modération"
                      style={{
                        backgroundColor: isTeacherMenuOpen ? '#D97706' : 'rgba(217,119,6,0.25)',
                        border: '1.5px solid #D97706',
                        color: '#FFF'
                      }}
                    >
                      <Crown size={18} />
                    </button>

                    {isTeacherMenuOpen && (
                      <div style={{
                        position: 'absolute', bottom: '56px', left: '0',
                        backgroundColor: 'var(--call-card)', backdropFilter: 'blur(16px)',
                        borderRadius: '16px', border: '1.5px solid var(--border-color)',
                        boxShadow: '0 16px 40px rgba(0,0,0,0.6)', padding: '8px',
                        display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '230px', zIndex: 120
                      }}>
                        <div style={{ padding: '6px 8px', fontSize: '11px', fontWeight: '800', color: '#FDE68A', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Crown size={12} color="#D97706" /> Modération du cours
                        </div>
                        <button
                          onClick={() => { hostMuteParticipant(); setIsTeacherMenuOpen(false); }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '8px 10px', borderRadius: '10px', border: '1px solid var(--border-color)',
                            backgroundColor: 'rgba(0,0,0,0.3)', color: '#FFF',
                            fontSize: '12px', fontWeight: '700', cursor: 'pointer', textAlign: 'left',
                          }}
                        >
                          <MicOff size={14} /> Couper le micro de l'élève
                        </button>
                        <button
                          onClick={() => { hostStopParticipantScreenShare(); setIsTeacherMenuOpen(false); }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '8px 10px', borderRadius: '10px', border: 'none',
                            backgroundColor: 'rgba(255,255,255,0.1)', color: '#FFF',
                            fontSize: '12px', fontWeight: '700', cursor: 'pointer', textAlign: 'left',
                          }}
                        >
                          <MonitorOff size={14} /> Arrêter le partage élève
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---- BULLE FLOTTANTE PIP (PICTURE-IN-PICTURE & DRAG-AND-DROP AVEC POINTER EVENTS) ---- */}
      <CallOverlay
        callState={callState}
        isCallPip={isCallPip}
        setIsCallPip={setIsCallPip}
        pipPosition={pipPosition}
        setPipPosition={setPipPosition}
        handlePipPointerDown={handlePipPointerDown}
        handlePipPointerMove={handlePipPointerMove}
        handlePipPointerUp={handlePipPointerUp}
        handlePipPointerCancel={handlePipPointerCancel}
        handlePipContentClick={handlePipContentClick}
        selectedChat={selectedChat}
        callDuration={callDuration}
        formatCallTimer={formatCallTimer}
        remoteStream={remoteStream}
        localStream={localStream}
        facingMode={facingMode}
        attachRemoteStream={attachRemoteStream}
        attachLocalStream={attachLocalStream}
        hasMultipleCameras={hasMultipleCameras}
        switchCamera={switchCamera}
        toggleMic={toggleMic}
        endCall={endCall}
      />

      {/* PANEL ADMINISTRATEUR & MODÉRATION (/admin) */}
      <AdminPanel
        isOpen={isAdminPanelOpen}
        onClose={() => setIsAdminPanelOpen(false)}
        darkMode={darkMode}
        currentUser={profile}
        allUsers={allFirestoreUsers}
        allListings={listings}
        allReports={allReports}
        onUpdateUser={handleAdminUpdateUser}
        onDeleteListing={handleAdminDeleteListing}
        onResolveReport={handleAdminResolveReport}
        onResetUser={handleAdminResetUser}
        onEditListing={handleAdminEditListing}
      />

      {/* MODALE DE SIGNALEMENT COMMUNAUTAIRE */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => {
          setIsReportModalOpen(false);
          setReportTarget({ listing: null, user: null });
        }}
        targetListing={reportTarget.listing}
        targetUser={reportTarget.user}
        currentUser={profile}
        darkMode={darkMode}
      />

      {/* MODALE DE PROPOSITION DE DEAL & CONTRE-OFFRE */}
      <CounterOfferModal
        isOpen={isCounterOfferOpen}
        onClose={() => {
          setIsCounterOfferOpen(false);
          setEditingDealId(null);
        }}
        onSubmit={handleCounterOfferSubmit}
        initialTerms={editingDealId ? (chatThreads[selectedChat?.id] || []).find(m => String(m.id) === String(editingDealId))?.terms : counterOfferDraft}
        isEditing={Boolean(editingDealId)}
        partnerName={selectedChat?.user || 'Interlocuteur'}
        listingTitle={selectedChat?.listing || ''}
        darkMode={darkMode}
        t={t}
      />

      {/* PASSERELLE DE PAIEMENT SÉCURISÉE (BLOC 5) */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        darkMode={darkMode}
        currentUser={profile}
        initialMode={paymentModalConfig.mode}
        initialPayload={paymentModalConfig.payload}
        onSuccess={handlePaymentSuccess}
        playBetclicSound={playBetclicBalanceSound}
        playApplePaySound={playApplePaySound}
      />

      {/* HISTORIQUE DES TRANSACTIONS & FACTURES (BLOC 5) */}
      <TransactionsHistoryModal
        isOpen={isTransactionsModalOpen}
        onClose={() => setIsTransactionsModalOpen(false)}
        darkMode={darkMode}
        currentUser={profile}
        transactions={userTransactions}
        onOpenPaymentModal={(mode) => {
          setIsTransactionsModalOpen(false);
          handleOpenPayment(mode);
        }}
      />

      {/* PARCOURS D'ONBOARDING INTERACTIF POUR NOUVEAUX COMPTES (CHANTIER 1) */}
      <OnboardingWizardModal
        isOpen={isOnboardingOpen}
        darkMode={darkMode}
        currentUser={profile}
        onComplete={handleCompleteOnboarding}
      />

      {/* CÉLÉBRATION CADEAU DE BIENVENUE (+10 JETONS ET 0.00€ INITIALISÉ) */}
      <WelcomeGiftCelebrationModal
        isOpen={isWelcomeGiftModalOpen}
        onClose={() => setIsWelcomeGiftModalOpen(false)}
        darkMode={darkMode}
        trocoTokens={10}
        euroBalance={0}
      />

      {/* BILAN DE SÉANCE VISIO & RÉTRIBUTION EN JETONS (CHANTIER 5) */}
      <VisioSettlementModal
        isOpen={isSettlementModalOpen}
        onClose={() => setIsSettlementModalOpen(false)}
        callDuration={settlementCallDuration || callDuration}
        partnerName={selectedChat?.user || 'Interlocuteur'}
        onTransferTokens={handleTransferCallTokens}
        darkMode={darkMode}
        currentUserTokens={profile?.trocoTokens ?? 10}
      />

      {/* MODULE DE VÉRIFICATION D'IDENTITÉ (KYC) */}
      <KycModal
        isOpen={isKycModalOpen}
        onClose={() => setIsKycModalOpen(false)}
        onComplete={handleKycComplete}
        profile={profile}
        darkMode={darkMode}
      />

      {/* MODALE D'ACCEPTATION & CONSULTATION DES CGU (BLOC 6) */}
      <CguModal
        isOpen={isCguViewerOpen || (Boolean(profile?.name) && !profile?.cguAcceptedAt && profile?.onboardingCompleted)}
        isMandatory={Boolean(profile?.name) && !profile?.cguAcceptedAt && profile?.onboardingCompleted}
        onClose={() => setIsCguViewerOpen(false)}
        onAccept={handleAcceptCgu}
        darkMode={darkMode}
        currentUser={profile}
      />

      {/* CENTRE DE CONFIDENTIALITÉ & GESTION DES DROITS RGPD (BLOC 6) */}
      <PrivacyCenterModal
        isOpen={isPrivacyCenterOpen}
        onClose={() => setIsPrivacyCenterOpen(false)}
        darkMode={darkMode}
        currentUser={profile}
        userListings={listings}
        userTransactions={userTransactions}
        onDeleteAccount={handleDeleteAccount}
      />

      {/* BANNIÈRE COOKIES & TRACEURS CONFORME CNIL / RGPD (BLOC 6) */}
      <CookieBanner
        darkMode={darkMode}
        onOpenPrivacyCenter={() => setIsPrivacyCenterOpen(true)}
      />

    </div>
  );
}
