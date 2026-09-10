import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isFirebaseUid,
  executeChatMigration,
} from '../../../functions/src/migration/migrateChatParticipants';
import { formatReportSummary } from '../../../functions/src/migration/migrationReport';

describe('👥 Chat Participants Migration Unit Tests [VERIF-02]', () => {
  let mockDb: any;
  let usersStore: Map<string, any>;
  let chatsStore: Map<string, any>;

  beforeEach(() => {
    vi.clearAllMocks();
    usersStore = new Map();
    chatsStore = new Map();

    const createDocSnapshot = (id: string, data: any) => ({
      id,
      exists: Boolean(data),
      data: () => data,
      ref: {
        id,
        update: vi.fn().mockImplementation(async (updates: any) => {
          const current = chatsStore.get(id) || {};
          chatsStore.set(id, { ...current, ...updates });
        }),
      },
    });

    mockDb = {
      collection: vi.fn((colName: string) => {
        if (colName === 'users') {
          return {
            get: vi.fn().mockImplementation(async () => {
              const docs: any[] = [];
              usersStore.forEach((val, id) => {
                docs.push(createDocSnapshot(id, val));
              });
              return {
                docs,
                size: docs.length,
                forEach: (cb: any) => docs.forEach(cb),
              };
            }),
          };
        }

        if (colName === 'chats') {
          return {
            get: vi.fn().mockImplementation(async () => {
              const docs: any[] = [];
              chatsStore.forEach((val, id) => {
                docs.push(createDocSnapshot(id, val));
              });
              return {
                docs,
                size: docs.length,
                forEach: (cb: any) => docs.forEach(cb),
              };
            }),
            limit: vi.fn().mockReturnThis(),
          };
        }

        return {
          get: vi.fn().mockResolvedValue({ docs: [], size: 0, forEach: () => {} }),
        };
      }),
    };
  });

  describe('1. Détecteur de Firebase UID (isFirebaseUid)', () => {
    it('reconnaît les UIDs Firebase standards (> 20 caractères alphanumériques)', () => {
      expect(isFirebaseUid('aBcDeFgHiJkLmNoPqRsTuVwXyZ12')).toBe(true);
      expect(isFirebaseUid('user_1234567890123456789012')).toBe(true);
      expect(isFirebaseUid('4Z9pL0qW8rT1yU3iO5pA7sD9fG2h')).toBe(true);
    });

    it('rejette les noms, prénoms ou pseudos historiques', () => {
      expect(isFirebaseUid('Marc Dupont')).toBe(false);
      expect(isFirebaseUid('Sofia')).toBe(false);
      expect(isFirebaseUid('alice_dev')).toBe(false);
      expect(isFirebaseUid('')).toBe(false);
      expect(isFirebaseUid(null)).toBe(false);
      expect(isFirebaseUid(undefined)).toBe(false);
    });
  });

  describe('2. Mode Simulation (dryRun = true)', () => {
    it('calcule la migration sans effectuer aucune écriture dans Firestore', async () => {
      // Données utilisateurs
      usersStore.set('uid_marc_12345678901234567890', { name: 'Marc Dupont', username: 'marcdupont' });
      usersStore.set('uid_sofia_12345678901234567890', { name: 'Sofia Benali', username: 'sofia' });

      // Chat avec noms historiques
      chatsStore.set('chat_1', {
        participants: ['Marc Dupont', 'sofia'],
        lastMessage: 'Bonjour',
      });

      const result = await executeChatMigration(mockDb, { dryRun: true }, 'admin_uid');

      expect(result.success).toBe(true);
      expect(result.dryRun).toBe(true);
      expect(result.report.totalChats).toBe(1);
      expect(result.report.migrated).toBe(1);
      expect(result.report.orphans).toBe(0);
      expect(result.report.alreadyMigrated).toBe(0);

      // Vérifier qu'aucune modification n'a été écrite en mode dry-run
      const chatDoc = chatsStore.get('chat_1');
      expect(chatDoc.participants).toEqual(['Marc Dupont', 'sofia']);
      expect(chatDoc.migrationStatus).toBeUndefined();
    });
  });

  describe('3. Mode Réel (dryRun = false)', () => {
    it('convertit les noms en UIDs, sauvegarde previousParticipants et synchronise participantUids', async () => {
      const uidMarc = 'uid_marc_12345678901234567890';
      const uidSofia = 'uid_sofia_12345678901234567890';

      usersStore.set(uidMarc, { name: 'Marc Dupont', username: 'marc' });
      usersStore.set(uidSofia, { name: 'Sofia', username: 'sofiab' });

      chatsStore.set('chat_historical', {
        participants: ['Marc Dupont', 'Sofia'],
        lastMessage: 'Deal conclu !',
      });

      const result = await executeChatMigration(mockDb, { dryRun: false }, 'admin_tester');

      expect(result.success).toBe(true);
      expect(result.report.migrated).toBe(1);

      const updatedChat = chatsStore.get('chat_historical');
      expect(updatedChat.participants).toEqual([uidMarc, uidSofia]);
      expect(updatedChat.participantUids).toEqual([uidMarc, uidSofia]);
      expect(updatedChat.previousParticipants).toEqual(['Marc Dupont', 'Sofia']);
      expect(updatedChat.migrationStatus).toBe('migrated');
      expect(updatedChat.migratedAt).toBeDefined();
    });

    it('gère les orphelins si un utilisateur est introuvable sans détruire le document', async () => {
      const uidAlice = 'uid_alice_12345678901234567890';
      usersStore.set(uidAlice, { name: 'Alice' });

      chatsStore.set('chat_orphan', {
        participants: ['Alice', 'UtilisateurInconnu'],
        lastMessage: 'Hello ?',
      });

      const result = await executeChatMigration(mockDb, { dryRun: false }, 'admin_tester');

      expect(result.report.orphans).toBe(1);
      expect(result.report.migrated).toBe(0);

      const orphanChat = chatsStore.get('chat_orphan');
      expect(orphanChat.migrationStatus).toBe('orphan');
      expect(orphanChat.orphanParticipants).toEqual(['UtilisateurInconnu']);
      // Les participants d'origine ne sont pas écrasés
      expect(orphanChat.participants).toEqual(['Alice', 'UtilisateurInconnu']);
    });

    it('détecte les chats déjà migrés et les comptabilise sans les altérer', async () => {
      const uid1 = 'uid_alice_12345678901234567890';
      const uid2 = 'uid_bobby_12345678901234567890';

      chatsStore.set('chat_already_ok', {
        participants: [uid1, uid2],
        participantUids: [uid1, uid2],
        migrationStatus: 'migrated',
      });

      const result = await executeChatMigration(mockDb, { dryRun: false }, 'admin_tester');

      expect(result.report.alreadyMigrated).toBe(1);
      expect(result.report.migrated).toBe(0);
      expect(result.report.orphans).toBe(0);
    });

    it('garantit l idempotence : exécuter deux fois la migration produit le même état stable', async () => {
      const uid1 = 'uid_user1_12345678901234567890';
      const uid2 = 'uid_user2_12345678901234567890';

      usersStore.set(uid1, { name: 'User Un' });
      usersStore.set(uid2, { name: 'User Deux' });

      chatsStore.set('chat_idemp', {
        participants: ['User Un', 'User Deux'],
      });

      // Passe 1 : Migration
      const pass1 = await executeChatMigration(mockDb, { dryRun: false }, 'admin_tester');
      expect(pass1.report.migrated).toBe(1);

      // Passe 2 : Déjà migré
      const pass2 = await executeChatMigration(mockDb, { dryRun: false }, 'admin_tester');
      expect(pass2.report.alreadyMigrated).toBe(1);
      expect(pass2.report.migrated).toBe(0);

      const stableChat = chatsStore.get('chat_idemp');
      expect(stableChat.participants).toEqual([uid1, uid2]);
      expect(stableChat.previousParticipants).toEqual(['User Un', 'User Deux']);
    });
  });

  describe('4. Générateur de Résumé (formatReportSummary)', () => {
    it('produit une synthèse textuelle claire et structurée', () => {
      const summary = formatReportSummary({
        totalChats: 10,
        alreadyMigrated: 4,
        migrated: 5,
        orphans: 1,
        skipped: 0,
        errors: [{ chatId: 'chat_99', reason: 'unmapped_participants', unmapped: ['Ghost'] }],
        durationMs: 42,
      }, true);

      expect(summary).toContain('DRY-RUN');
      expect(summary).toContain('Total chats analysés     : 10');
      expect(summary).toContain('Migrés avec succès       : 5');
      expect(summary).toContain('Orphelins (sans UID)     : 1');
      expect(summary).toContain('Chat chat_99');
    });
  });
});
