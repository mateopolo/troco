import { MAP_I18N, getMapTranslation } from './mapTranslations';

describe('Phase 44 : Carte Interactive & Localisation Multilingue', () => {
  describe('Traductions du Bouton de Fermeture', () => {
    it('traduit correctement en Français ("Fermer la carte")', () => {
      expect(getMapTranslation('FR', 'closeMap')).toBe('Fermer la carte');
      expect(getMapTranslation('fr', 'closeMap')).toBe('Fermer la carte');
    });

    it('traduit correctement en Anglais ("Close map")', () => {
      expect(getMapTranslation('EN', 'closeMap')).toBe('Close map');
      expect(getMapTranslation('en', 'closeMap')).toBe('Close map');
    });

    it('traduit correctement en Espagnol ("Cerrar el mapa")', () => {
      expect(getMapTranslation('ES', 'closeMap')).toBe('Cerrar el mapa');
      expect(getMapTranslation('es', 'closeMap')).toBe('Cerrar el mapa');
    });

    it('traduit correctement en Italien ("Chiudi la mappa")', () => {
      expect(getMapTranslation('IT', 'closeMap')).toBe('Chiudi la mappa');
      expect(getMapTranslation('it', 'closeMap')).toBe('Chiudi la mappa');
    });

    it('traduit correctement en Allemand ("Karte schließen")', () => {
      expect(getMapTranslation('DE', 'closeMap')).toBe('Karte schließen');
    });

    it('fournit un fallback par défaut sur le français pour une langue inconnue', () => {
      expect(getMapTranslation('XX', 'closeMap')).toBe('Fermer la carte');
      expect(getMapTranslation(undefined, 'closeMap')).toBe('Fermer la carte');
    });
  });

  describe('Dictionnaire de Traduction Complète MAP_I18N', () => {
    const requiredLanguages = ['FR', 'EN', 'ES', 'IT', 'DE'];
    const requiredKeys = ['closeMap', 'close', 'locateMe', 'locating', 'twoFingerHelp', 'openFullscreen'];

    requiredLanguages.forEach((lang) => {
      it(`contient toutes les clés obligatoires pour la langue ${lang}`, () => {
        expect(MAP_I18N[lang]).toBeDefined();
        requiredKeys.forEach((key) => {
          expect(MAP_I18N[lang][key]).toBeDefined();
          expect(typeof MAP_I18N[lang][key]).toBe('string');
          expect(MAP_I18N[lang][key].length).toBeGreaterThan(0);
        });
      });
    });
  });
});
