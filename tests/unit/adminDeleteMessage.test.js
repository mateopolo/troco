// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import fs from 'fs';
import path from 'path';

// Polyfill scrollTo for jsdom
if (typeof Element !== 'undefined' && !Element.prototype.scrollTo) {
  Element.prototype.scrollTo = vi.fn();
}

// Mock Firestore operations
const mockDeleteDoc = vi.fn(() => Promise.resolve());
const mockUpdateDoc = vi.fn(() => Promise.resolve());

const createMockSnapshot = (docsList = []) => {
  const defaultDocs = docsList.length > 0 ? docsList : [
    {
      id: 'msg_test_100',
      data: () => ({
        author: 'Alice',
        authorUsername: '@alice',
        text: 'Bonjour la communauté Troco !',
        createdAt: Date.now() - 5000,
        timestamp: Date.now() - 5000,
        badge: 'MEMBRE',
      }),
    },
  ];
  return {
    empty: defaultDocs.length === 0,
    docs: defaultDocs,
    forEach: (callback) => defaultDocs.forEach(callback),
  };
};

const mockOnSnapshot = vi.fn((q, callback) => {
  callback(createMockSnapshot());
  return () => {};
});

vi.mock('../../src/firebase', () => ({
  db: { _mockDb: true },
  auth: { currentUser: { uid: 'admin_test_uid', email: 'admin@troco.app' } },
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((db, col) => ({ db, col })),
  addDoc: vi.fn(() => Promise.resolve({ id: 'new_msg' })),
  query: vi.fn((col) => ({ col })),
  orderBy: vi.fn(),
  limit: vi.fn(),
  onSnapshot: (...args) => mockOnSnapshot(...args),
  serverTimestamp: vi.fn(() => ({ _type: 'serverTimestamp' })),
  deleteDoc: (...args) => mockDeleteDoc(...args),
  updateDoc: (...args) => mockUpdateDoc(...args),
  doc: vi.fn((db, col, id) => ({ db, col, id })),
}));

vi.mock('../../src/hooks/useAdminGuard', () => ({
  useAdminGuard: vi.fn(() => ({ isAdmin: false, isAdminLoading: false })),
}));

vi.mock('../../src/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    currentLang: 'FR',
    t: (key) => key,
  }),
}));

import GlobalLiveChat from '../../src/components/GlobalLiveChat';
import { useAdminGuard } from '../../src/hooks/useAdminGuard';

describe('FAIL-10 / Prompt 13 — Suppression message admin dans GlobalLiveChat', () => {
  const componentPath = path.resolve(__dirname, '../../src/components/GlobalLiveChat.jsx');
  const rulesPath = path.resolve(__dirname, '../../firestore.rules');
  const componentCode = fs.readFileSync(componentPath, 'utf-8');
  const rulesCode = fs.readFileSync(rulesPath, 'utf-8');

  beforeEach(() => {
    vi.clearAllMocks();
    useAdminGuard.mockReturnValue({ isAdmin: false, isAdminLoading: false });
  });

  describe('1. Contrat de code & Règles de sécurité Firestore', () => {
    it('inclut data-testid="admin-delete-message" conditionné par isAdmin', () => {
      expect(componentCode).toContain('data-testid="admin-delete-message"');
      expect(componentCode).toMatch(/\{isAdmin\s*&&[\s\S]*?admin-delete-message/);
    });

    it('utilise l’icône Trash2 de Lucide', () => {
      expect(componentCode).toContain('<Trash2');
      expect(componentCode).toContain("from 'lucide-react'");
    });

    it('applique un style discret avec opacité 0.5 par défaut et 1 au hover', () => {
      expect(componentCode).toContain('opacity: 0.5');
      expect(componentCode).toContain("onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}");
      expect(componentCode).toContain("onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.5'; }}");
    });

    it('handleDelete appelle deleteDoc sur Firestore et met à jour l’état local', () => {
      expect(componentCode).toMatch(/const handleDelete\s*=\s*async/);
      expect(componentCode).toContain('setMessages(prev => prev.filter(m => m.id !== targetId))');
      expect(componentCode).toContain("deleteDoc(doc(db, 'global_chat', targetId))");
    });

    it('vérifie que firestore.rules autorise la suppression par un admin sur global_chat', () => {
      expect(rulesCode).toContain('match /global_chat/{msgId}');
      expect(rulesCode).toMatch(/allow update, delete:\s*if isAdmin\(\)/);
    });
  });

  describe('2. Rendu conditionnel Admin vs User', () => {
    it('affiche le bouton de suppression pour un utilisateur administrateur (currentUser.isAdmin = true)', async () => {
      const adminUser = {
        uid: 'admin_123',
        displayName: 'Super Admin',
        isAdmin: true,
        role: 'admin',
      };

      render(<GlobalLiveChat currentUser={adminUser} />);

      await waitFor(() => {
        const deleteButtons = screen.getAllByTestId('admin-delete-message');
        expect(deleteButtons.length).toBeGreaterThan(0);
      });

      const btn = screen.getAllByTestId('admin-delete-message')[0];
      expect(btn).toBeDefined();
      expect(btn.style.opacity).toBe('0.5');
    });

    it('affiche le bouton de suppression lorsque useAdminGuard retourne isAdmin: true', async () => {
      useAdminGuard.mockReturnValue({ isAdmin: true, isAdminLoading: false });

      const regularUserObj = {
        uid: 'user_456',
        displayName: 'Simple User',
        isAdmin: false,
        role: 'user',
      };

      render(<GlobalLiveChat currentUser={regularUserObj} />);

      await waitFor(() => {
        const deleteButtons = screen.getAllByTestId('admin-delete-message');
        expect(deleteButtons.length).toBeGreaterThan(0);
      });
    });

    it('NE PAS afficher le bouton de suppression pour un utilisateur standard non-admin', () => {
      useAdminGuard.mockReturnValue({ isAdmin: false, isAdminLoading: false });

      const standardUser = {
        uid: 'user_norm_789',
        displayName: 'Jean Dupont',
        isAdmin: false,
        role: 'user',
      };

      render(<GlobalLiveChat currentUser={standardUser} />);

      const deleteButtons = screen.queryAllByTestId('admin-delete-message');
      expect(deleteButtons.length).toBe(0);
    });
  });

  describe('3. Action de suppression handleDelete', () => {
    it('déclenche deleteDoc et retire le message du DOM lors du clic admin', async () => {
      const adminUser = {
        uid: 'admin_123',
        displayName: 'Super Admin',
        isAdmin: true,
        role: 'admin',
      };

      render(<GlobalLiveChat currentUser={adminUser} />);

      // Message présent
      expect(screen.getByText('Bonjour la communauté Troco !')).toBeDefined();

      const deleteBtn = await screen.findByTestId('admin-delete-message');
      expect(deleteBtn).toBeDefined();

      // Clic sur suppression
      await act(async () => {
        fireEvent.click(deleteBtn);
      });

      // deleteDoc appelé avec les bons paramètres
      expect(mockDeleteDoc).toHaveBeenCalledWith(
        expect.objectContaining({
          col: 'global_chat',
          id: 'msg_test_100',
        })
      );

      // Message immédiatement retiré de l'état local
      await waitFor(() => {
        expect(screen.queryByText('Bonjour la communauté Troco !')).toBeNull();
      });
    });
  });
});
