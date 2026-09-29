import legalNoticeFr from './legal-notice-fr.js';
import legalNoticeEn from './legal-notice-en.js';
import legalNoticeEs from './legal-notice-es.js';
import legalNoticeIt from './legal-notice-it.js';
import legalNoticeDe from './legal-notice-de.js';
import legalNoticeJa from './legal-notice-ja.js';
import legalNoticeZh from './legal-notice-zh.js';

import refundPolicyFr from './refund-policy-fr.js';
import refundPolicyEn from './refund-policy-en.js';
import refundPolicyEs from './refund-policy-es.js';
import refundPolicyIt from './refund-policy-it.js';
import refundPolicyDe from './refund-policy-de.js';
import refundPolicyJa from './refund-policy-ja.js';
import refundPolicyZh from './refund-policy-zh.js';

import privacyPolicyFr from './privacy-policy-fr.js';
import privacyPolicyEn from './privacy-policy-en.js';
import privacyPolicyEs from './privacy-policy-es.js';
import privacyPolicyIt from './privacy-policy-it.js';
import privacyPolicyDe from './privacy-policy-de.js';
import privacyPolicyJa from './privacy-policy-ja.js';
import privacyPolicyZh from './privacy-policy-zh.js';

import cookiesPolicyFr from './cookies-policy-fr.js';
import cookiesPolicyEn from './cookies-policy-en.js';
import cookiesPolicyEs from './cookies-policy-es.js';
import cookiesPolicyIt from './cookies-policy-it.js';
import cookiesPolicyDe from './cookies-policy-de.js';
import cookiesPolicyJa from './cookies-policy-ja.js';
import cookiesPolicyZh from './cookies-policy-zh.js';

function normalizeLang(lang) {
  if (typeof lang !== 'string') return 'FR';
  const upper = lang.toUpperCase();
  if (upper === 'JP') return 'JA';
  if (upper === 'CN') return 'ZH';
  return upper;
}

export const legalNoticeMap = {
  FR: legalNoticeFr,
  EN: legalNoticeEn,
  ES: legalNoticeEs,
  IT: legalNoticeIt,
  DE: legalNoticeDe,
  JA: legalNoticeJa,
  ZH: legalNoticeZh,
};

export const refundPolicyMap = {
  FR: refundPolicyFr,
  EN: refundPolicyEn,
  ES: refundPolicyEs,
  IT: refundPolicyIt,
  DE: refundPolicyDe,
  JA: refundPolicyJa,
  ZH: refundPolicyZh,
};

export const privacyPolicyMap = {
  FR: privacyPolicyFr,
  EN: privacyPolicyEn,
  ES: privacyPolicyEs,
  IT: privacyPolicyIt,
  DE: privacyPolicyDe,
  JA: privacyPolicyJa,
  ZH: privacyPolicyZh,
};

export const cookiesPolicyMap = {
  FR: cookiesPolicyFr,
  EN: cookiesPolicyEn,
  ES: cookiesPolicyEs,
  IT: cookiesPolicyIt,
  DE: cookiesPolicyDe,
  JA: cookiesPolicyJa,
  ZH: cookiesPolicyZh,
};

export function getLegalNoticeData(lang = 'FR') {
  const norm = normalizeLang(lang);
  return legalNoticeMap[norm] || legalNoticeMap.FR;
}

export function getRefundPolicyData(lang = 'FR') {
  const norm = normalizeLang(lang);
  return refundPolicyMap[norm] || refundPolicyMap.FR;
}

export function getPrivacyPolicyData(lang = 'FR') {
  const norm = normalizeLang(lang);
  return privacyPolicyMap[norm] || privacyPolicyMap.FR;
}

export function getCookiesPolicyData(lang = 'FR') {
  const norm = normalizeLang(lang);
  return cookiesPolicyMap[norm] || cookiesPolicyMap.FR;
}
