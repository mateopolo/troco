import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import NotesModal from './NotesModal';

// Mock Firebase
jest.mock('../firebase', () => ({
  db: { id: 'mock-db' },
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(() => ({ id: 'mock-doc' })),
  onSnapshot: jest.fn(() => () => {}),
  setDoc: jest.fn(() => Promise.resolve()),
  addDoc: jest.fn(() => Promise.resolve()),
  collection: jest.fn(() => ({})),
  serverTimestamp: jest.fn(() => 'mock-timestamp'),
}));

describe('PHASE 140: NotesModal Premium Alignment with Global Workspace Theme', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onSendToChat: jest.fn(),
    handleSendMessage: jest.fn(),
    note: { title: 'Notes de cadrage Troco', content: '# Plan stratégique' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('1. Header has exact flex justify-between items-center p-4 border-b border-white/10 structure', () => {
    const { baseElement } = render(<NotesModal {...defaultProps} />);

    const header = baseElement.querySelector('header');
    expect(header).toBeInTheDocument();
    expect(header.className).toContain('flex');
    expect(header.className).toContain('justify-between');
    expect(header.className).toContain('items-center');
    expect(header.className).toContain('p-4');
    expect(header.className).toContain('border-b');
    expect(header.className).toContain('border-white/10');
  });

  test('2. Enforces identical pill buttons: Fermer and Partager/Sauvegarder', () => {
    const handleClose = jest.fn();
    render(<NotesModal {...defaultProps} onClose={handleClose} />);

    // Bouton Fermer
    const closeBtn = screen.getByRole('button', { name: /Fermer/i });
    expect(closeBtn).toBeInTheDocument();
    expect(closeBtn.className).toContain('flex');
    expect(closeBtn.className).toContain('items-center');
    expect(closeBtn.className).toContain('gap-2');
    expect(closeBtn.className).toContain('px-4');
    expect(closeBtn.className).toContain('py-2');
    expect(closeBtn.className).toContain('bg-white');
    expect(closeBtn.className).toContain('text-black');
    expect(closeBtn.className).toContain('dark:bg-[#2A2624]');
    expect(closeBtn.className).toContain('dark:text-white');
    expect(closeBtn.className).toContain('rounded-full');
    expect(closeBtn.className).toContain('shadow-md');
    expect(closeBtn.className).toContain('hover:bg-gray-100');
    expect(closeBtn.className).toContain('transition-colors');
    expect(closeBtn.className).toContain('font-medium');
    expect(closeBtn.className).toContain('text-sm');

    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    // Bouton Partager/Sauvegarder
    const shareBtn = screen.getByRole('button', { name: /Partager au Chat/i });
    expect(shareBtn).toBeInTheDocument();
    expect(shareBtn.className).toContain('px-6');
    expect(shareBtn.className).toContain('py-2.5');
    expect(shareBtn.className).toContain('rounded-full');
    expect(shareBtn.className).toContain('bg-[var(--accent-primary)]');
    expect(shareBtn.className).toContain('text-white');
    expect(shareBtn.className).toContain('font-bold');
    expect(shareBtn.className).toContain('shadow-lg');
    expect(shareBtn.className).toContain('hover:opacity-90');
    expect(shareBtn.className).toContain('transition-opacity');
    expect(shareBtn.className).toContain('whitespace-nowrap');
  });

  test('3. Seamless textarea without dark borders, full width & height with requested classes', () => {
    render(<NotesModal {...defaultProps} />);

    const textarea = screen.getByPlaceholderText(/Rédigez vos notes partagées ici/i);
    expect(textarea).toBeInTheDocument();
    expect(textarea.className).toContain('w-full');
    expect(textarea.className).toContain('h-full');
    expect(textarea.className).toContain('bg-transparent');
    expect(textarea.className).toContain('text-[var(--text-primary)]');
    expect(textarea.className).toContain('p-6');
    expect(textarea.className).toContain('md:p-8');
    expect(textarea.className).toContain('outline-none');
    expect(textarea.className).toContain('border-none');
    expect(textarea.className).toContain('resize-none');
    expect(textarea.className).toContain('text-lg');
    expect(textarea.className).toContain('leading-relaxed');
  });
});
