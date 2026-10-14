import { describe, it, expect } from 'vitest';
import {
  getDisplayName,
  getDisplayUsername,
  getHumanName,
  isTechnicalId,
  isGenericPlaceholder,
  humanizeEmailPrefix,
} from '../../src/utils/displayName';

describe('displayName utility suite', () => {
  describe('getDisplayName resolution order', () => {
    it('prioritizes profile.displayName (e.g. Google Auth) over profile.name', () => {
      const profile = {
        displayName: 'Alexandre Troco',
        name: 'Membre Troco',
        username: '@alex',
        email: 'alex@troco.app',
      };
      expect(getDisplayName(profile)).toBe('Alexandre Troco');
    });

    it('resolves profile.name when displayName is empty or missing', () => {
      const profile = {
        name: 'Thomas Edison',
        username: 'tedison',
        email: 'tedison@troco.app',
      };
      expect(getDisplayName(profile)).toBe('Thomas Edison');
    });

    it('resolves profile.username (pseudo) when displayName and name are placeholders', () => {
      const profile = {
        name: 'Membre Troco',
        displayName: '',
        username: '@sophie_dev',
        email: 'sophie@troco.app',
      };
      expect(getDisplayName(profile)).toBe('sophie_dev');
    });

    it('falls back to humanized email prefix when name and username are placeholders', () => {
      const profile = {
        name: 'Utilisateur Troco',
        username: '@user',
        email: 'jean-marc.dupont@troco.app',
      };
      expect(getDisplayName(profile)).toBe('Jean Marc Dupont');
    });

    it('falls back to "Membre Troco" when no identifiers are available', () => {
      const profile = {};
      expect(getDisplayName(profile)).toBe('Membre Troco');
    });

    it('rejects raw technical Firebase UIDs from being used as display names', () => {
      const profile = {
        name: 'Ey8n3OHnwLM2dwbi66XdV5loCqW2',
        username: 'Ey8n3OHnwLM2dwbi66XdV5loCqW2',
        email: 'claire@troco.app',
      };
      expect(getDisplayName(profile)).toBe('Claire');
    });
  });

  describe('isGenericPlaceholder', () => {
    it('identifies default placeholder strings', () => {
      expect(isGenericPlaceholder('Membre Troco')).toBe(true);
      expect(isGenericPlaceholder('Utilisateur Troco')).toBe(true);
      expect(isGenericPlaceholder('anonymous')).toBe(true);
      expect(isGenericPlaceholder('user')).toBe(true);
      expect(isGenericPlaceholder('Alexandre Troco')).toBe(false);
    });
  });

  describe('humanizeEmailPrefix', () => {
    it('converts punctuated email prefixes into readable capitalized names', () => {
      expect(humanizeEmailPrefix('alexandre.troco')).toBe('Alexandre Troco');
      expect(humanizeEmailPrefix('marie-claire_martin')).toBe('Marie Claire Martin');
    });
  });
});
