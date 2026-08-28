import { useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot, setDoc, serverTimestamp, collection } from 'firebase/firestore';
import { db } from '../../firebase';

/**
 * Valeurs par défaut pour les clés globales de contenu
 */
export const DEFAULT_GLOBAL_CONTENT = {
  welcome_message: "Bienvenue sur Troco — La 1ère plateforme de troc de compétences et services en France !",
  hero_subtitle: "Échangez votre savoir-faire sans dépenser 1 euro. Développez votre réseau local.",
  community_rules: "1. Respect mutuel et bienveillance dans tous les échanges.\n2. Aucune transaction financière dissimulée.\n3. Respect des délais et des engagements de troc.",
  platform_announcement: "📢 Nouveauté : Hubs de Projets et Whiteboard Collaboratif 100% P2P disponibles !",
  footer_notice: "Troco France — L'économie circulaire et solidaire nouvelle génération.",
  trust_banner_text: "🔒 Échanges sécurisés par caution intelligente et tiers de confiance Troco.",
};

/**
 * Hook pour consommer un texte global en temps réel
 * @param {string} key - Clé du texte (ex: 'welcome_message')
 * @param {string} fallbackValue - Valeur de secours si non définie
 * @returns {string} Le texte en direct synchronisé avec Firestore
 */
export function useGlobalContent(key, fallbackValue = '') {
  const defaultVal = fallbackValue || DEFAULT_GLOBAL_CONTENT[key] || '';
  const [content, setContent] = useState(defaultVal);

  useEffect(() => {
    if (!db || !key) return;

    try {
      const docRef = doc(db, 'global_content', key);
      const unsubscribe = onSnapshot(
        docRef,
        (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setContent(data.value ?? data.text ?? defaultVal);
          } else {
            setContent(defaultVal);
          }
        },
        (err) => {
          console.warn(`[useGlobalContent] Erreur écoute '${key}':`, err);
        }
      );

      return () => unsubscribe();
    } catch (e) {
      console.warn(`[useGlobalContent] Exception init '${key}':`, e);
    }
  }, [key, defaultVal]);

  return content;
}

/**
 * Hook pour l'administration : écoute TOUTES les entrées de `global_content` en temps réel
 */
export function useAllGlobalContent() {
  const [items, setItems] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db) {
      setItems(DEFAULT_GLOBAL_CONTENT);
      setIsLoading(false);
      return;
    }

    try {
      const collRef = collection(db, 'global_content');
      const unsubscribe = onSnapshot(
        collRef,
        (snapshot) => {
          const map = { ...DEFAULT_GLOBAL_CONTENT };
          snapshot.forEach((d) => {
            const data = d.data();
            map[d.id] = data.value ?? data.text ?? '';
          });
          setItems(map);
          setIsLoading(false);
        },
        (err) => {
          console.warn('[useAllGlobalContent] Erreur Firestore:', err);
          setItems(DEFAULT_GLOBAL_CONTENT);
          setIsLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (e) {
      console.warn('[useAllGlobalContent] Exception:', e);
      setIsLoading(false);
    }
  }, []);

  const saveContent = useCallback(async (key, value, description = '') => {
    if (!db || !key) return;
    const docRef = doc(db, 'global_content', key);
    await setDoc(
      docRef,
      {
        value,
        key,
        description: description || '',
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }, []);

  return { items, isLoading, saveContent };
}

/**
 * Fonction impérative pour mettre à jour un texte global
 */
export async function updateGlobalContent(key, value, description = '') {
  if (!db || !key) return;
  const docRef = doc(db, 'global_content', key);
  await setDoc(
    docRef,
    {
      value,
      key,
      description: description || '',
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export default useGlobalContent;
