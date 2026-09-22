import {
  cleanLanguageTag,
  extractLanguageTag,
  parseAndTranslateDynamicText,
} from '../utils/dynamicTranslation';
import {
  getBioTranslation,
  getChatMessageDisplayContent,
  getReviewTranslation,
} from '../utils/translationHelpers';

describe('Phase 135: Traduction du contenu utilisateur (UGC)', () => {
  describe('1. Nettoyage des balises et détection de la langue', () => {
    test('extractLanguageTag extrait correctement les balises [EN], [FR], [ES], etc.', () => {
      expect(extractLanguageTag('[EN] Hello world')).toBe('EN');
      expect(extractLanguageTag('[FR] Bonjour monde')).toBe('FR');
      expect(extractLanguageTag('[ES] Hola a todos')).toBe('ES');
      expect(extractLanguageTag('Message sans balise')).toBeNull();
    });

    test('cleanLanguageTag supprime les balises et les espaces superflus', () => {
      expect(cleanLanguageTag('[EN] Hello world')).toBe('Hello world');
      expect(cleanLanguageTag('[FR] Bonjour monde')).toBe('Bonjour monde');
      expect(cleanLanguageTag('Texte direct')).toBe('Texte direct');
    });

    test('parseAndTranslateDynamicText respecte forceOriginal en enlevant la balise', () => {
      const result = parseAndTranslateDynamicText('[EN] Hello world', 'FR', { forceOriginal: true });
      expect(result).toBe('Hello world');
      expect(result).not.toContain('[EN]');
    });
  });

  describe('2. Traduction dynamique des biographies utilisateur', () => {
    test('getBioTranslation retourne la bio originale nettoyée quand forceOriginal est true', () => {
      const bio = '[FR] Développeur passionné par les technologies web.';
      const res = getBioTranslation(bio, 'EN', true);
      expect(res).toBe('Développeur passionné par les technologies web.');
      expect(res).not.toContain('[FR]');
    });

    test('getBioTranslation traduit ou renvoie la version cible si forceOriginal est false', () => {
      const bioFR = "Créateur de contenus, développeur Python et passionné de musique. Je propose des services flexibles et des échanges de qualité.";
      const resEN = getBioTranslation(bioFR, 'EN', false);
      expect(resEN).toContain('Python');
      expect(resEN).not.toContain('[FR]');
    });
  });

  describe('3. Traduction dynamique des messages de chat et DMs', () => {
    test('getChatMessageDisplayContent retourne le texte nettoyé sans balise quand forceOriginal est true', () => {
      const msg = { text: '[EN] Can we trade tomorrow at 2pm?' };
      const res = getChatMessageDisplayContent(msg, 'FR', true);
      expect(res).toBe('Can we trade tomorrow at 2pm?');
      expect(res).not.toContain('[EN]');
    });

    test('getChatMessageDisplayContent traduit les messages dynamiques quand forceOriginal est false', () => {
      const msg = { text: '[EN] Can we trade tomorrow at 2pm?' };
      const res = getChatMessageDisplayContent(msg, 'EN', false);
      expect(res).toBe('Can we trade tomorrow at 2pm?');
      expect(res).not.toContain('[EN]');
    });
  });

  describe('4. Traduction dynamique des avis (Reviews)', () => {
    test('getReviewTranslation retourne le texte nettoyé si forceOriginal est true', () => {
      const review = '[FR] Matériel en parfait état. Rendu comme prévu. Impeccable.';
      const res = getReviewTranslation(review, 'EN', true);
      expect(res).toBe('Matériel en parfait état. Rendu comme prévu. Impeccable.');
      expect(res).not.toContain('[FR]');
    });

    test('getReviewTranslation traduit un avis connu vers la langue cible', () => {
      const review = 'Matériel en parfait état. Rendu comme prévu. Impeccable.';
      const res = getReviewTranslation(review, 'EN', false);
      expect(res).toBe('Equipment in perfect condition. Returned on time. Impeccable.');
    });
  });
});
