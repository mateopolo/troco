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

export function getLegalNoticeData(lang = 'FR') {
  const normalized = typeof lang === 'string' ? lang.toUpperCase() : 'FR';
  return legalNoticeMap[normalized] || legalNoticeMap.FR;
}

export function getRefundPolicyData(lang = 'FR') {
  const normalized = typeof lang === 'string' ? lang.toUpperCase() : 'FR';
  return refundPolicyMap[normalized] || refundPolicyMap.FR;
}
