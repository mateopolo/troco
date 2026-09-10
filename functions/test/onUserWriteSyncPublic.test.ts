import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleUserWriteSyncPublic } from '../src/users/onUserWriteSyncPublic';
import { handleMigrateUsersPublic } from '../src/users/migrateUsersPublic';
import { extractPublicUserFields } from '../src/utils/publicUserFields';

describe('🔄 Cloud Function onUserWriteSyncPublic & migrateUsersPublic Tests', () => {
  let mockDb: any;
  let inMemoryDb: Map<string, any>;

  beforeEach(() => {
    vi.clearAllMocks();
    inMemoryDb = new Map();

    mockDb = {
      collection: vi.fn((colName: string) => ({
        doc: vi.fn((docId: string) => {
          const fullPath = `${colName}/${docId}`;
          return {
            id: docId,
            path: fullPath,
            get: vi.fn().mockImplementation(async () => {
              const data = inMemoryDb.get(fullPath);
              return {
                exists: Boolean(data),
                id: docId,
                data: () => data,
              };
            }),
            set: vi.fn().mockImplementation(async (newData: any, opts?: any) => {
              if (opts?.merge && inMemoryDb.has(fullPath)) {
                inMemoryDb.set(fullPath, { ...inMemoryDb.get(fullPath), ...newData });
              } else {
                inMemoryDb.set(fullPath, newData);
              }
            }),
            update: vi.fn().mockImplementation(async (updates: any) => {
              const existing = inMemoryDb.get(fullPath) || {};
              inMemoryDb.set(fullPath, { ...existing, ...updates });
            }),
            delete: vi.fn().mockImplementation(async () => {
              inMemoryDb.delete(fullPath);
            }),
          };
        }),
        get: vi.fn().mockImplementation(async () => {
          const docs: any[] = [];
          for (const [key, val] of inMemoryDb.entries()) {
            if (key.startsWith(`${colName}/`)) {
              const id = key.replace(`${colName}/`, '');
              docs.push({
                id,
                data: () => val,
              });
            }
          }
          return { docs, size: docs.length, empty: docs.length === 0 };
        }),
      })),
      batch: vi.fn(() => ({
        set: vi.fn((ref: any, data: any, opts: any) => ref.set(data, opts)),
        delete: vi.fn((ref: any) => ref.delete()),
        commit: vi.fn().mockResolvedValue([]),
      })),
      runTransaction: vi.fn(async (updateFn: any) => {
        const transaction = {
          get: vi.fn(async (ref: any) => ref.get()),
          set: vi.fn(async (ref: any, data: any, opts: any) => ref.set(data, opts)),
        };
        return updateFn(transaction);
      }),
    };
  });

  // -------------------------------------------------------------
  // 1. extractPublicUserFields (Data Minimization RGPD)
  // -------------------------------------------------------------
  describe('🔒 extractPublicUserFields — RGPD Minimisation', () => {
    it('filtre strictement toutes les données sensibles et privées', () => {
      const fullPrivateUser = {
        name: 'Matéo Polo',
        username: 'mateopolo',
        avatar: 'https://images.unsplash.com/avatar.jpg',
        location: 'Paris 11e',
        city: 'Paris',
        country: 'France',
        languages: ['FR', 'EN'],
        kycVerified: true,
        rating: 4.9,
        dealsCompleted: 15,
        isTrocoPlus: true,
        isShadowBanned: false,
        // DONNÉES SENSIBLES À PROTÉGER :
        email: 'mateopolo91@gmail.com',
        phoneNumber: '+33612345678',
        euroBalance: 1250.00,
        trocoTokens: 350,
        role: 'admin',
        isBanned: false,
        bannedReason: null,
        subscriptionPlan: 'enterprise',
        passwordHash: 'secret_hash_value',
      };

      const publicUser = extractPublicUserFields(fullPrivateUser);

      // Champs publics autorisés
      expect(publicUser.name).toBe('Matéo Polo');
      expect(publicUser.username).toBe('mateopolo');
      expect(publicUser.avatar).toBe('https://images.unsplash.com/avatar.jpg');
      expect(publicUser.city).toBe('Paris');
      expect(publicUser.country).toBe('France');
      expect(publicUser.languages).toEqual(['FR', 'EN']);
      expect(publicUser.kycVerified).toBe(true);
      expect(publicUser.rating).toBe(4.9);
      expect(publicUser.dealsCompleted).toBe(15);
      expect(publicUser.isTrocoPlus).toBe(true);
      expect(publicUser.shadowBannedPublic).toBe(false);

      // Vérification FORMELLE de l'absence totale de champs sensibles
      expect((publicUser as any).email).toBeUndefined();
      expect((publicUser as any).phoneNumber).toBeUndefined();
      expect((publicUser as any).euroBalance).toBeUndefined();
      expect((publicUser as any).trocoTokens).toBeUndefined();
      expect((publicUser as any).role).toBeUndefined();
      expect((publicUser as any).isBanned).toBeUndefined();
      expect((publicUser as any).bannedReason).toBeUndefined();
      expect((publicUser as any).subscriptionPlan).toBeUndefined();
      expect((publicUser as any).passwordHash).toBeUndefined();
    });
  });

  // -------------------------------------------------------------
  // 2. onUserWriteSyncPublic (Trigger)
  // -------------------------------------------------------------
  describe('⚡ onUserWriteSyncPublic Trigger', () => {
    it('synchronise un nouvel utilisateur dans users_public', async () => {
      const event: any = {
        params: { uid: 'user_new_1' },
        data: {
          after: {
            exists: true,
            data: () => ({
              name: 'Sophie Bernard',
              username: 'sophieb',
              avatar: 'https://example.com/sophie.jpg',
              email: 'sophie@private.com',
              euroBalance: 50.0,
              trocoTokens: 20,
              kycVerified: true,
              isShadowBanned: true,
            }),
          },
        },
      };

      await handleUserWriteSyncPublic(event, mockDb);

      const publicDoc = inMemoryDb.get('users_public/user_new_1');
      expect(publicDoc).toBeDefined();
      expect(publicDoc.name).toBe('Sophie Bernard');
      expect(publicDoc.username).toBe('sophieb');
      expect(publicDoc.shadowBannedPublic).toBe(true);
      expect(publicDoc.email).toBeUndefined();
      expect(publicDoc.euroBalance).toBeUndefined();
    });

    it('supprime users_public/{uid} quand le compte users/{uid} est supprimé', async () => {
      inMemoryDb.set('users_public/deleted_user_42', {
        name: 'Compte Supprimé',
        username: 'deleted',
      });

      const event: any = {
        params: { uid: 'deleted_user_42' },
        data: {
          after: {
            exists: false,
          },
        },
      };

      await handleUserWriteSyncPublic(event, mockDb);

      expect(inMemoryDb.has('users_public/deleted_user_42')).toBe(false);
    });
  });

  // -------------------------------------------------------------
  // 3. migrateUsersPublic (Callable Backfill Idempotent)
  // -------------------------------------------------------------
  describe('📦 migrateUsersPublic Callable', () => {
    it('refuse les non-admins', async () => {
      const request: any = { auth: { uid: 'regular_user', token: {} } };
      await expect(handleMigrateUsersPublic(request, mockDb)).rejects.toThrow(/Accès réservé/);
    });

    it('migre tous les utilisateurs existants sans fuite de données et de façon idempotente', async () => {
      // Données pré-existantes dans users
      inMemoryDb.set('users/u1', { name: 'Alice', email: 'alice@troco.app', euroBalance: 100 });
      inMemoryDb.set('users/u2', { name: 'Bob', email: 'bob@troco.app', trocoTokens: 30 });
      inMemoryDb.set('users/u3', { name: 'Charlie', email: 'charlie@troco.app', isBanned: true });

      const request: any = { auth: { uid: 'admin_root', token: { admin: true } } };

      // Premier passage
      const res1 = await handleMigrateUsersPublic(request, mockDb);
      expect(res1.success).toBe(true);
      expect(res1.migratedCount).toBe(3);

      expect(inMemoryDb.get('users_public/u1').name).toBe('Alice');
      expect(inMemoryDb.get('users_public/u1').email).toBeUndefined();
      expect(inMemoryDb.get('users_public/u2').name).toBe('Bob');
      expect(inMemoryDb.get('users_public/u3').name).toBe('Charlie');

      // Deuxième passage (idempotence)
      const res2 = await handleMigrateUsersPublic(request, mockDb);
      expect(res2.success).toBe(true);
      expect(res2.migratedCount).toBe(3);
    });
  });
});
