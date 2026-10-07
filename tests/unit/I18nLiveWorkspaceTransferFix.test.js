import { describe, it, expect } from 'vitest';
import { translations } from '../../src/locales/translations';

describe('I18N-12 & I18N-13: Live namespace, Token Transfer notifications, Workspace cards, and Author interpolation', () => {
  const languages = ['FR', 'EN', 'ES', 'IT', 'DE', 'JA', 'ZH'];

  describe('Tâche 1: Namespace live.*', () => {
    const liveKeys = [
      'live.chat_title',
      'live.live_badge',
      'live.connected_count',
      'live.stream_sounds',
      'live.role_member',
      'live.edited_by_admin',
      'live.edit_title',
      'live.delete_title',
      'live.delete_confirm_desc',
    ];

    it.each(languages)('should have all live.* keys present in %s', (lang) => {
      const dict = translations[lang];
      expect(dict).toBeDefined();
      liveKeys.forEach((key) => {
        expect(dict[key], `Missing ${key} in ${lang}`).toBeDefined();
        expect(dict[key].trim().length).toBeGreaterThan(0);
      });
    });

    it('interpolates {count} in live.connected_count', () => {
      languages.forEach((lang) => {
        const template = translations[lang]['live.connected_count'];
        const interpolated = template.replace('{count}', '5').replace('{n}', '5');
        expect(interpolated).toContain('5');
      });
    });

    it('has exact German values for live namespace', () => {
      expect(translations.DE['live.chat_title']).toBe('Globaler Chat');
      expect(translations.DE['live.live_badge']).toBe('LIVE');
      expect(translations.DE['live.role_member']).toBe('Mitglied');
      expect(translations.DE['live.connected_count'].replace('{count}', '42')).toBe('42 online');
    });
  });

  describe('Tâche 2: Token transfer notifications', () => {
    const transferKeys = [
      'tokenTransferSent',
      'tokenTransferSentSuccess',
      'tokenTransferReceived',
      'tokenTransferReceivedSuccess',
    ];

    it.each(languages)('should have token transfer keys in %s', (lang) => {
      const dict = translations[lang];
      transferKeys.forEach((key) => {
        expect(dict[key], `Missing ${key} in ${lang}`).toBeDefined();
        expect(dict[key].trim().length).toBeGreaterThan(0);
      });
    });

    it('correctly translates German token transfer messages with parameters', () => {
      const sent = translations.DE.tokenTransferSent.replace('{count}', '2');
      const sentSuccess = translations.DE.tokenTransferSentSuccess.replace('{partner}', 'MATMOT');
      const recv = translations.DE.tokenTransferReceived.replace('{count}', '2');
      const recvSuccess = translations.DE.tokenTransferReceivedSuccess.replace('{partner}', 'mateo polo');

      expect(sent).toBe('Übertragung von 2 Troco-Tokens');
      expect(sentSuccess).toBe('Erfolgreich an MATMOT übertragen');
      expect(recv).toBe('2 Troco-Tokens erhalten');
      expect(recvSuccess).toBe('Erhalten von mateo polo');
    });
  });

  describe('Tâche 3: Author placeholder resolution', () => {
    it.each(languages)('has authorBy key in %s', (lang) => {
      const dict = translations[lang];
      expect(dict.authorBy).toBeDefined();
      expect(dict.authorBy).toContain('{name}');
    });

    it('resolves authorBy correctly in German to "Von mateo polo"', () => {
      const template = translations.DE.authorBy;
      const resolved = template.replace('{name}', 'mateo polo');
      expect(resolved).toBe('Von mateo polo');
      expect(resolved).not.toContain('{author}');
    });

    it('resolves authorBy correctly in French, English, Spanish, Italian, Japanese, Chinese', () => {
      expect(translations.FR.authorBy.replace('{name}', 'Alice')).toBe('Par Alice');
      expect(translations.EN.authorBy.replace('{name}', 'Alice')).toBe('By Alice');
      expect(translations.ES.authorBy.replace('{name}', 'Alice')).toBe('Por Alice');
      expect(translations.IT.authorBy.replace('{name}', 'Alice')).toBe('Da Alice');
      expect(translations.JA.authorBy.replace('{name}', 'Alice')).toBe('Aliceより');
      expect(translations.ZH.authorBy.replace('{name}', 'Alice')).toBe('来自 Alice');
    });
  });

  describe('Tâche 4: Workspace cards tools translations', () => {
    const workspaceKeys = [
      'workspaceDocsTitle',
      'workspaceDocsDesc',
      'workspaceSheetsTitle',
      'workspaceSheetsDesc',
      'workspaceNotesTitle',
      'workspaceNotesDesc',
      'workspaceWhiteboardTitle',
      'workspaceWhiteboardDesc',
      'workspaceSlidesTitle',
      'workspaceSlidesDesc',
    ];

    it.each(languages)('should have all workspace card keys in %s', (lang) => {
      const dict = translations[lang];
      workspaceKeys.forEach((key) => {
        expect(dict[key], `Missing ${key} in ${lang}`).toBeDefined();
        expect(dict[key].trim().length).toBeGreaterThan(0);
      });
    });

    it('has correct German translations for workspace tools', () => {
      expect(translations.DE.workspaceDocsTitle).toBe('Troco Docs');
      expect(translations.DE.workspaceDocsDesc).toBe('Kollaborativer Texteditor');
      expect(translations.DE.workspaceSheetsTitle).toBe('Troco Sheets');
      expect(translations.DE.workspaceSheetsDesc).toBe('Kollaborative Tabellenkalkulation');
      expect(translations.DE.workspaceNotesTitle).toBe('Gemeinsame Notizen');
      expect(translations.DE.workspaceNotesDesc).toBe('Kollaborativer Notizblock');
      expect(translations.DE.workspaceWhiteboardTitle).toBe('Whiteboard');
      expect(translations.DE.workspaceWhiteboardDesc).toBe('Kollaboratives P2P-Whiteboard');
      expect(translations.DE.workspaceSlidesTitle).toBe('Troco Slides');
      expect(translations.DE.workspaceSlidesDesc).toBe('Kollaborative Präsentationen');
    });
  });
});
