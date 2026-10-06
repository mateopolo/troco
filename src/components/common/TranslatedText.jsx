import React, { useState, useEffect } from 'react';
import { getInstantOrQueueTranslation, subscribeTranslations } from '../../utils/translator';
import { knownTitles } from '../../data/translationsData';

// Cache mémoire local des textes traduits pour éviter tout appel redondant
const TRANSLATED_TEXT_CACHE = new Map();

/**
 * Composant de traduction dynamique en temps réel pour textes administratifs et UGC.
 * 
 * @param {Object} props
 * @param {string} props.text - Le texte à traduire (ex: globalAnnouncement)
 * @param {string} [props.targetLang='FR'] - La langue cible active (ex: 'IT', 'EN')
 * @param {string} [props.fallback=''] - Valeur de secours si text est vide
 * @returns {JSX.Element|null} Le texte traduit réactif
 */
export default function TranslatedText({ text, targetLang = 'FR', fallback = '' }) {
  const content = (text !== undefined && text !== null ? String(text) : String(fallback || '')).trim();
  const lang = (targetLang || 'FR').toUpperCase();

  const resolveTranslation = (rawText, target) => {
    if (!rawText) return '';
    if (target === 'FR') return rawText;

    // 1. Vérification dans knownTitles
    if (knownTitles?.[rawText]?.[target]) {
      return knownTitles[rawText][target];
    }

    // Recherche normalisée dans knownTitles
    const normalized = rawText.replace(/[’']/g, "'").trim();
    for (const [k, v] of Object.entries(knownTitles || {})) {
      if (k.replace(/[’']/g, "'").trim() === normalized && v?.[target]) {
        return v[target];
      }
    }

    // 2. Vérification dans le cache mémoire local
    const cacheKey = `${target}_${rawText}`;
    if (TRANSLATED_TEXT_CACHE.has(cacheKey)) {
      return TRANSLATED_TEXT_CACHE.get(cacheKey);
    }

    // 3. Appel au moteur de traduction universel (synchrone si en cache global, ou asynchrone)
    const instant = getInstantOrQueueTranslation(rawText, target, 'auto');
    if (instant && instant !== rawText) {
      TRANSLATED_TEXT_CACHE.set(cacheKey, instant);
      return instant;
    }

    return instant || rawText;
  };

  const [translated, setTranslated] = useState(() => resolveTranslation(content, lang));

  // Mise à jour immédiate si content ou targetLang change
  useEffect(() => {
    setTranslated(resolveTranslation(content, lang));
  }, [content, lang]);

  // Écoute des résolutions asynchrones via subscribeTranslations
  useEffect(() => {
    if (!content || lang === 'FR') return;

    const unsubscribe = subscribeTranslations(() => {
      const updated = resolveTranslation(content, lang);
      setTranslated(updated);
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [content, lang]);

  if (!content) return null;

  return <>{translated || content}</>;
}
