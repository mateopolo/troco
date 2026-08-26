import { getInstantOrQueueTranslation } from './translator';
import { knownTitles, knownMessageTranslations } from '../data/translationsData';

/**
 * Traduction d'un titre d'annonce via le dictionnaire ou retour du titre natif.
 */
export const getListingTitleTranslation = (title, targetLang) => {
  if (!title) return '';
  if (targetLang === 'FR' || !targetLang) return title;
  if (knownTitles[title] && knownTitles[title][targetLang]) {
    return knownTitles[title][targetLang];
  }
  return title;
};

/**
 * Traduction dynamique en temps réel ou statique des messages du chat et contre-propositions.
 */
export const getChatMessageDisplayContent = (message, targetLang, forceOriginal = false) => {
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
      IT: "Prestito Trapano a percussione Bosch questo fine weekend. Per 2 Gettoni Troco.",
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

/**
 * Traduction de la biographie d'un profil utilisateur.
 */
export const getBioTranslation = (bioText, targetLang, forceOriginal = false) => {
  if (!bioText || forceOriginal || targetLang === 'FR' || !targetLang) return bioText;
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

/**
 * Traduction d'un avis reçu par un utilisateur.
 */
export const getReviewTranslation = (reviewText, targetLang, forceOriginal = false) => {
  if (!reviewText || forceOriginal || targetLang === 'FR' || !targetLang) return reviewText;
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

/**
 * Traduction universelle d'une annonce (Titre, Description, Contrepartie).
 */
export const getListingDisplayContent = (item, targetLang, forceOriginal = false) => {
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
