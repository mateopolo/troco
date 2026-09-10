import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as admin from 'firebase-admin';
import { handleSetAdminClaim } from '../src/admin/setAdminClaim';
import { handleDeleteListingAsAdmin } from '../src/admin/deleteListingAsAdmin';
import { handleResetUserSafely } from '../src/admin/resetUserSafely';
import { handleResolveReport } from '../src/admin/resolveReport';
import { enforceAdminRateLimit } from '../src/middleware/rateLimit';

// Mocks pour Firebase Admin Auth
export const mockSetCustomUserClaims = vi.fn().mockResolvedValue(undefined);
export const mockGetUser = vi.fn().mockResolvedValue({
  uid: 'target_user_1',
  email: 'target@troco.app',
  customClaims: {},
});

vi.mock('firebase-admin/auth', () => ({
  getAuth: vi.fn(() => ({
    setCustomUserClaims: mockSetCustomUserClaims,
    getUser: mockGetUser,
    updateUser: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('firebase-admin', async () => {
  const actual: any = await vi.importActual('firebase-admin');
  return {
    ...actual,
    auth: vi.fn(() => ({
      setCustomUserClaims: mockSetCustomUserClaims,
      getUser: mockGetUser,
    })),
    firestore: Object.assign(vi.fn(), {
      FieldValue: {
        serverTimestamp: () => ({ _methodName: 'serverTimestamp' }),
        increment: (n: number) => n,
      },
    }),
  };
});



describe('👑 Cloud Functions Admin & Rate Limiting Tests', () => {
  let mockDb: any;
  let inMemoryDb: Map<string, any>;

  beforeEach(() => {
    vi.clearAllMocks();
    inMemoryDb = new Map();

    // Mock Firestore minimal et fidèle
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
            collection: vi.fn((subCol: string) => ({
              doc: vi.fn((subDocId?: string) => {
                const sId = subDocId || `sub_${Date.now()}`;
                const subPath = `${fullPath}/${subCol}/${sId}`;
                return {
                  id: sId,
                  path: subPath,
                  set: vi.fn(async (subData: any) => inMemoryDb.set(subPath, subData)),
                  get: vi.fn(async () => ({ exists: inMemoryDb.has(subPath), data: () => inMemoryDb.get(subPath) })),
                };
              }),
              add: vi.fn().mockImplementation(async (subData: any) => {
                const subId = `sub_${Date.now()}`;
                inMemoryDb.set(`${fullPath}/${subCol}/${subId}`, subData);
                return { id: subId };
              }),
            })),
          };
        }),
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockImplementation(async () => {
          return { docs: [], empty: true };
        }),
      })),
      batch: vi.fn(() => ({
        delete: vi.fn(),
        set: vi.fn(),
        update: vi.fn(),
        commit: vi.fn().mockResolvedValue([]),
      })),
      runTransaction: vi.fn(async (updateFn: any) => {
        const transaction = {
          get: vi.fn(async (ref: any) => ref.get()),
          set: vi.fn(async (ref: any, data: any, opts: any) => ref.set(data, opts)),
          update: vi.fn(async (ref: any, data: any) => ref.update(data)),
          delete: vi.fn(async (ref: any) => ref.delete()),
        };
        return updateFn(transaction);
      }),
    };
  });

  // -------------------------------------------------------------
  // 1. Rate Limiting Middleware
  // -------------------------------------------------------------
  describe('⏱️ Rate Limiting Middleware', () => {
    it('permet 10 requêtes par minute pour un même utilisateur', async () => {
      // Simule 5 requêtes récentes
      const docPath = `_admin_rate_limits/admin_user_test`;
      inMemoryDb.set(docPath, {
        timestamps: [Date.now() - 1000, Date.now() - 2000, Date.now() - 3000],
        count: 3,
      });

      await expect(enforceAdminRateLimit(mockDb, 'admin_user_test')).resolves.not.toThrow();
    });

    it('bloque avec resource-exhausted à partir du 11ème appel dans la même minute', async () => {
      const docPath = `_admin_rate_limits/admin_abuser`;
      inMemoryDb.set(docPath, {
        timestamps: Array(10).fill(Date.now() - 500),
        count: 10, // limite atteinte
      });

      await expect(enforceAdminRateLimit(mockDb, 'admin_abuser'))
        .rejects.toThrow(/Limite de 10 opérations/);
    });
  });


  // -------------------------------------------------------------
  // 2. setAdminClaim
  // -------------------------------------------------------------
  describe('🔑 setAdminClaim', () => {
    it('rejette un appel non-authentifié', async () => {
      const request: any = { auth: null, data: { uid: 'u1', admin: true } };
      await expect(handleSetAdminClaim(request, mockDb)).rejects.toThrow(/Authentification/);
    });

    it('rejette un appel par un utilisateur non-admin (token.admin !== true)', async () => {
      const request: any = {
        auth: { uid: 'hacker_1', token: { admin: false } },
        data: { uid: 'u1', admin: true },
      };
      await expect(handleSetAdminClaim(request, mockDb)).rejects.toThrow(/réservé exclusivement aux administrateurs/);
    });

    it('rejette un payload invalide (uid absent ou admin non booléen)', async () => {
      const request: any = {
        auth: { uid: 'legit_admin', token: { admin: true } },
        data: { uid: null, admin: 'oui' },
      };
      await expect(handleSetAdminClaim(request, mockDb)).rejects.toThrow(/Paramètres uid/);
    });

    it('accorde les droits admin et met à jour Firebase Auth & Firestore', async () => {
      const request: any = {
        auth: { uid: 'super_admin', token: { admin: true } },
        data: { uid: 'target_user_1', admin: true },
      };

      const result = await handleSetAdminClaim(request, mockDb);

      expect(result.success).toBe(true);
      expect(result.admin).toBe(true);
      expect(mockSetCustomUserClaims).toHaveBeenCalledWith('target_user_1', { admin: true });

      // Vérifie la synchro Firestore
      const userInDb = inMemoryDb.get('users/target_user_1');
      expect(userInDb).toBeDefined();
      expect(userInDb.isAdmin).toBe(true);
      expect(userInDb.role).toBe('admin');
      expect(userInDb.adminGrantedBy).toBe('super_admin');
    });
  });

  // -------------------------------------------------------------
  // 3. deleteListingAsAdmin
  // -------------------------------------------------------------
  describe('🗑️ deleteListingAsAdmin', () => {
    it('refuse les requêtes de non-admin', async () => {
      const request: any = {
        auth: { uid: 'regular_user', token: {} },
        data: { listingId: 'listing_123', reason: 'Spam' },
      };
      await expect(handleDeleteListingAsAdmin(request, mockDb)).rejects.toThrow(/Accès réservé/);
    });

    it('retourne not-found si le listing n’existe pas', async () => {
      const request: any = {
        auth: { uid: 'admin_1', token: { admin: true } },
        data: { listingId: 'ghost_listing', reason: 'Spam' },
      };
      await expect(handleDeleteListingAsAdmin(request, mockDb)).rejects.toThrow(/n'existe pas|introuvable/i);
    });



    it('supprime le listing, notifie l’auteur et loggue l’action', async () => {
      // Pré-remplir le listing dans la base
      inMemoryDb.set('listings/listing_123', {
        title: 'Cours de guitare illicite',
        authorUid: 'author_456',
        category: 'Musique',
      });

      const request: any = {
        auth: { uid: 'admin_1', token: { admin: true } },
        data: { listingId: 'listing_123', reason: 'Non respect de la charte' },
      };

      const res = await handleDeleteListingAsAdmin(request, mockDb);
      expect(res.success).toBe(true);
      expect(res.deletedId).toBe('listing_123');

      // Le listing doit être supprimé
      expect(inMemoryDb.has('listings/listing_123')).toBe(false);
    });
  });

  // -------------------------------------------------------------
  // 4. resetUserSafely
  // -------------------------------------------------------------
  describe('🛡️ resetUserSafely', () => {
    it('refuse les non-admins', async () => {
      const request: any = {
        auth: { uid: 'user_x', token: {} },
        data: { uid: 'target_u' },
      };
      await expect(handleResetUserSafely(request, mockDb)).rejects.toThrow(/Accès réservé/);
    });

    it('préserve le portefeuille euroBalance et trocoTokens lorsque preserveWallet=true', async () => {
      inMemoryDb.set('users/user_vip', {
        name: 'VIP User',
        euroBalance: 250.75,
        trocoTokens: 85,
        bio: 'Ancienne bio suspecte',
        skills: ['Hacking', 'Spamming'],
        onboardingCompleted: true,
      });

      const request: any = {
        auth: { uid: 'admin_boss', token: { admin: true } },
        data: { uid: 'user_vip', preserveWallet: true },
      };

      const res = await handleResetUserSafely(request, mockDb);
      expect(res.success).toBe(true);
      expect(res.preservedWallet).toBe(true);
      expect(res.newProfile.euroBalance).toBe(250.75);
      expect(res.newProfile.trocoTokens).toBe(85);
      expect(res.newProfile.skills).toEqual([]);
      expect(res.newProfile.onboardingCompleted).toBe(false);

      const dbUser = inMemoryDb.get('users/user_vip');
      expect(dbUser.euroBalance).toBe(250.75);
      expect(dbUser.trocoTokens).toBe(85);
      expect(dbUser.skills).toEqual([]);
    });

    it('remet les soldes à zéro lorsque preserveWallet=false explicitement', async () => {
      inMemoryDb.set('users/user_spammer', {
        name: 'Spammer',
        euroBalance: 120.00,
        trocoTokens: 50,
      });

      const request: any = {
        auth: { uid: 'admin_boss', token: { admin: true } },
        data: { uid: 'user_spammer', preserveWallet: false },
      };

      const res = await handleResetUserSafely(request, mockDb);
      expect(res.success).toBe(true);
      expect(res.preservedWallet).toBe(false);
      expect(res.newProfile.euroBalance).toBe(0.00);
      expect(res.newProfile.trocoTokens).toBe(10);
    });
  });

  // -------------------------------------------------------------
  // 5. resolveReport
  // -------------------------------------------------------------
  describe('⚖️ resolveReport', () => {
    it('refuse les requêtes de non-admin', async () => {
      const request: any = {
        auth: { uid: 'user_1', token: {} },
        data: { reportId: 'rep_1', status: 'resolved' },
      };
      await expect(handleResolveReport(request, mockDb)).rejects.toThrow(/Accès réservé/);
    });

    it('refuse les statuts non autorisés', async () => {
      const request: any = {
        auth: { uid: 'admin_1', token: { admin: true } },
        data: { reportId: 'rep_1', status: 'super_resolu' },
      };
      await expect(handleResolveReport(request, mockDb)).rejects.toThrow(/Statut invalide/);
    });

    it('met à jour le signalement avec succès', async () => {
      inMemoryDb.set('reports/rep_1', {
        type: 'listing',
        targetId: 'listing_99',
        reason: 'Contenu inapproprié',
        status: 'pending',
      });

      const request: any = {
        auth: { uid: 'admin_mod', token: { admin: true } },
        data: {
          reportId: 'rep_1',
          status: 'resolved',
          resolution: 'Annonce supprimée et avertissement envoyé.',
        },
      };

      const res = await handleResolveReport(request, mockDb);
      expect(res.success).toBe(true);
      expect(res.status).toBe('resolved');

      const repInDb = inMemoryDb.get('reports/rep_1');
      expect(repInDb.status).toBe('resolved');
      expect(repInDb.resolvedBy).toBe('admin_mod');
      expect(repInDb.resolution).toBe('Annonce supprimée et avertissement envoyé.');
    });
  });
});
