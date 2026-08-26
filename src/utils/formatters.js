import { translations } from '../data/translationsData';

const defaultT = (key, lang = 'FR') => (translations[lang] && translations[lang][key]) || translations['FR']?.[key] || key;

/**
 * Traduit et formate le libellé d'une catégorie Troco.
 */
export const getCategoryLabel = (categoryKey, t = (k) => defaultT(k, 'FR')) => {
  if (!categoryKey) return '';
  if (categoryKey === 'Tous' || categoryKey === 'all') return t('all');
  if (categoryKey === 'Cours/Compétences' || categoryKey === 'Cours & Compétences') return t('catSkills');
  if (categoryKey === 'Outillage' || categoryKey === 'Prêt de Matériel') return t('catTools');
  if (categoryKey === 'Services/Dépannage' || categoryKey === 'Services & Dépannage') return t('catServices');
  if (categoryKey === 'Logement/Swap' || categoryKey === 'Logement & Stay Swap') return t('catHousing');
  return categoryKey;
};

/**
 * Formate le statut d'un deal ou d'une négociation selon la langue active.
 */
export const formatStatus = (st, t = (k) => defaultT(k, 'FR')) => {
  if (!st) return '';
  if (st === 'Négociation en cours') return t('negotiationInProgress');
  if (st === 'Deal Validé') return t('dealValidated');
  if (st === 'À confirmer') return t('toConfirm');
  if (st === 'Nouvelle discussion') return t('newDiscussion');
  if (st === 'Clôturé' || st === 'Terminé' || st === 'Cloture' || st === 'Closed') return t('closed');
  if (st === 'En cours' || st === 'In progress') return t('inProgress');
  if (st === 'Planifié' || st === 'Planned') return t('planned');
  return st;
};

/**
 * Formate le nombre de jetons avec le pluriel et la langue appropriée.
 */
export const formatTokenCount = (count, lang = 'FR') => {
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

/**
 * Dictionnaire et traducteur universel des contreparties & rétributions.
 */
export const formatCompensation = (comp, currentLang = 'FR', t = (k) => defaultT(k, currentLang)) => {
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
  const tokenWord = t('tokens') || (currentLang === 'FR' ? 'Jetons' : 'Tokens');
  res = res.replace(/\b(Jetons?|Crédits?|Tokens?|Fichas?|Gettoni?)\b/gi, tokenWord);
  if (res.includes('Échange direct') || res.includes('Swap')) {
    res = res.replace(/Échange direct \/ Swap|Échange direct|Swap/gi, t('exchange') || 'Échange');
  }
  if (currentLang === 'ES') res = res.replace(/\btemps\b/gi, 'de tiempo');
  else if (currentLang === 'EN') res = res.replace(/\btemps\b/gi, 'time');
  else if (currentLang === 'IT') res = res.replace(/\btemps\b/gi, 'tempo');
  else if (currentLang === 'DE') res = res.replace(/\btemps\b/gi, 'Zeit');
  else if (currentLang === 'JA') res = res.replace(/\btemps\b/gi, '時間');
  else if (currentLang === 'ZH') res = res.replace(/\btemps\b/gi, '时间');
  return res;
};
