import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CloudOfficeSuiteModal from './CloudOfficeSuiteModal';

// Mock Firebase
jest.mock('../firebase', () => ({
  db: { id: 'mock-db' },
  storage: {},
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(() => ({ id: 'mock-doc' })),
  onSnapshot: jest.fn(() => () => {}),
  setDoc: jest.fn(() => Promise.resolve()),
  updateDoc: jest.fn(() => Promise.resolve()),
  collection: jest.fn(),
  addDoc: jest.fn(() => Promise.resolve()),
  serverTimestamp: jest.fn(() => 'mock-timestamp'),
}));

describe('PHASE 138: Workspace Fullscreen Modal & Glassmorphism Header Refactor', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onSendToChat: jest.fn(),
    handleSendMessage: jest.fn(),
    document: { title: 'Document Stratégique 2026', content: '<p>Plan de lancement</p>' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('1. Modal container is strictly fullscreen with fixed inset-0 md:inset-4 z-[9999] overflow-hidden', () => {
    const { baseElement } = render(<CloudOfficeSuiteModal {...defaultProps} />);

    // Check main modal container
    const modalContainer = baseElement.querySelector('.fixed.inset-0.md\\:inset-4.z-\\[9999\\]');
    expect(modalContainer).toBeInTheDocument();
    expect(modalContainer.className).toContain('bg-[var(--bg-global)]');
    expect(modalContainer.className).toContain('md:rounded-3xl');
    expect(modalContainer.className).toContain('shadow-2xl');
    expect(modalContainer.className).toContain('border');
    expect(modalContainer.className).toContain('border-white/10');
    expect(modalContainer.className).toContain('flex');
    expect(modalContainer.className).toContain('flex-col');
    expect(modalContainer.className).toContain('overflow-hidden');

    // Limiting classes (max-w-6xl, max-h-[90dvh]) have been destroyed
    expect(modalContainer.className).not.toContain('max-h-[90dvh]');
    expect(modalContainer.className).not.toContain('max-w-6xl');
  });

  test('2. Strict glassmorphism tabs container and tab pill button styling', () => {
    const { baseElement } = render(<CloudOfficeSuiteModal {...defaultProps} />);

    // Glassmorphism tab container
    const tabsContainer = baseElement.querySelector(
      '.flex.items-center.gap-1.p-1.bg-black\\/5.backdrop-blur-md'
    );
    expect(tabsContainer).toBeInTheDocument();
    expect(tabsContainer.className).toContain('rounded-full');

    // Docs tab (active)
    const docsTab = screen.getByText('Troco Docs').closest('button');
    expect(docsTab).toBeInTheDocument();
    expect(docsTab.className).toContain('px-4');
    expect(docsTab.className).toContain('py-1.5');
    expect(docsTab.className).toContain('rounded-full');
    expect(docsTab.className).toContain('text-sm');
    expect(docsTab.className).toContain('font-medium');
    expect(docsTab.className).toContain('transition-all');
    expect(docsTab.className).toContain('bg-white'); // solid active background

    // Sheets tab (inactive initially)
    const sheetsTab = screen.getByText('Troco Sheets').closest('button');
    expect(sheetsTab).toBeInTheDocument();
    expect(sheetsTab.className).toContain('bg-transparent');

    // Click Sheets tab to switch
    fireEvent.click(sheetsTab);
    expect(sheetsTab.className).toContain('bg-white');
    expect(docsTab.className).toContain('bg-transparent');
  });

  test('3. Strict styling for Global Header, Close button and Share to Chat button', () => {
    const handleClose = jest.fn();
    const { baseElement } = render(
      <CloudOfficeSuiteModal {...defaultProps} onClose={handleClose} />
    );

    // Global Header
    const header = baseElement.querySelector(
      '.flex.items-center.justify-between.p-4.border-b.border-white\\/10'
    );
    expect(header).toBeInTheDocument();
    expect(header.className).toContain('bg-[var(--bg-card)]');

    // Close button (left)
    const closeBtn = screen.getByRole('button', { name: /Fermer/i });
    expect(closeBtn).toBeInTheDocument();
    expect(closeBtn.className).toContain('px-4');
    expect(closeBtn.className).toContain('py-2');
    expect(closeBtn.className).toContain('rounded-full');
    expect(closeBtn.className).toContain('shadow-md');
    expect(closeBtn.className).toContain('bg-white');
    expect(closeBtn.className).toContain('text-black');

    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    // Share to Chat button (right)
    const shareBtn = screen.getByRole('button', { name: /Partager au Chat/i });
    expect(shareBtn).toBeInTheDocument();
    expect(shareBtn.className).toContain('px-6');
    expect(shareBtn.className).toContain('py-2.5');
    expect(shareBtn.className).toContain('rounded-full');
    expect(shareBtn.className).toContain('bg-[var(--accent-primary)]');
    expect(shareBtn.className).toContain('text-white');
    expect(shareBtn.className).toContain('font-bold');
    expect(shareBtn.className).toContain('shadow-lg');
    expect(shareBtn.className).toContain('whitespace-nowrap');
  });
});
