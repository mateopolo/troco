import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import LiveCallSubtitles from './LiveCallSubtitles';
import { liveTranscriptionService } from '../services/liveTranscriptionService';

// Mock liveTranscriptionService
jest.mock('../services/liveTranscriptionService', () => ({
  liveTranscriptionService: {
    startListening: jest.fn(),
    stopListening: jest.fn(),
    subscribe: jest.fn(() => jest.fn()),
  },
}));

// Mock translator
jest.mock('../utils/translator', () => ({
  translateText: jest.fn((text, target) => Promise.resolve(`[${target}] ${text}`)),
}));

describe('Phase 124: WebRTC Call Subtitle Language Unlock', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  test('1. Opens settings modal and displays both language grids independently', () => {
    render(
      <LiveCallSubtitles
        isActive={true}
        currentLang="FR"
        speakerName="Alice"
      />
    );

    // Open settings popover
    const settingsBtn = screen.getByTitle(/Paramètres/i);
    expect(settingsBtn).toBeInTheDocument();
    fireEvent.click(settingsBtn);

    // Check headings
    expect(screen.getByText(/Langue parlée par l'interlocuteur/i)).toBeInTheDocument();
    expect(screen.getByText(/Langue de vos sous-titres \(Traduction à l'écran\)/i)).toBeInTheDocument();
  });

  test('2. Unlocks subtitle language selection: clicking target lang button updates state and applies bg-purple-600', () => {
    render(
      <LiveCallSubtitles
        isActive={true}
        currentLang="FR"
        speakerName="Alice"
      />
    );

    // Open settings
    fireEvent.click(screen.getByTitle(/Paramètres/i));

    const targetGrid = screen.getByText(/Langue de vos sous-titres/i).parentElement.nextElementSibling;
    const buttons = targetGrid.querySelectorAll('button');

    // Find the 'EN', 'ES', 'IT' buttons in targetGrid
    const enButton = Array.from(buttons).find(b => b.textContent.includes('EN'));
    const esButton = Array.from(buttons).find(b => b.textContent.includes('ES'));
    const itButton = Array.from(buttons).find(b => b.textContent.includes('IT'));

    expect(enButton).toBeInTheDocument();
    expect(esButton).toBeInTheDocument();

    // Click on ES
    fireEvent.click(esButton);

    // Verify ES is active with bg-purple-600
    expect(esButton.className).toContain('bg-purple-600');
    expect(esButton.className).toContain('text-white');

    // Click on IT
    fireEvent.click(itButton);
    expect(itButton.className).toContain('bg-purple-600');
    expect(esButton.className).not.toContain('bg-purple-600');
    expect(esButton.className).toContain('bg-gray-800');
  });

  test('3. Re-render with currentLang="FR" does NOT lock or reset the chosen target language', () => {
    const { rerender } = render(
      <LiveCallSubtitles
        isActive={true}
        currentLang="FR"
        speakerName="Alice"
      />
    );

    // Open settings and pick DE
    fireEvent.click(screen.getByTitle(/Paramètres/i));
    const targetGrid = screen.getByText(/Langue de vos sous-titres/i).parentElement.nextElementSibling;
    const deButton = Array.from(targetGrid.querySelectorAll('button')).find(b => b.textContent.includes('DE'));
    
    fireEvent.click(deButton);
    expect(deButton.className).toContain('bg-purple-600');

    // Re-render component with currentLang="FR"
    rerender(
      <LiveCallSubtitles
        isActive={true}
        currentLang="FR"
        speakerName="Alice"
      />
    );

    // DE must still be active, NOT reset to FR!
    const targetGridAfter = screen.getByText(/Langue de vos sous-titres/i).parentElement.nextElementSibling;
    const deButtonAfter = Array.from(targetGridAfter.querySelectorAll('button')).find(b => b.textContent.includes('DE'));
    const frButtonAfter = Array.from(targetGridAfter.querySelectorAll('button')).find(b => b.textContent.includes('FR'));

    expect(deButtonAfter.className).toContain('bg-purple-600');
    expect(frButtonAfter.className).not.toContain('bg-purple-600');
  });

  test('4. Selected target language propagates to liveTranscriptionService', () => {
    render(
      <LiveCallSubtitles
        isActive={true}
        currentLang="FR"
        speakerName="Alice"
      />
    );

    // Open settings and switch target language to JA
    fireEvent.click(screen.getByTitle(/Paramètres/i));
    const targetGrid = screen.getByText(/Langue de vos sous-titres/i).parentElement.nextElementSibling;
    const jaButton = Array.from(targetGrid.querySelectorAll('button')).find(b => b.textContent.includes('JA'));

    fireEvent.click(jaButton);

    // Verify liveTranscriptionService.startListening was called with target language 'JA'
    expect(liveTranscriptionService.startListening).toHaveBeenCalledWith(
      expect.any(String),
      'JA',
      'Alice'
    );
  });

  test('5. Source language and Subtitle language grids are completely independent', () => {
    render(
      <LiveCallSubtitles
        isActive={true}
        currentLang="FR"
        speakerName="Alice"
      />
    );

    fireEvent.click(screen.getByTitle(/Paramètres/i));

    const sourceGrid = screen.getByText(/Langue parlée par l'interlocuteur/i).parentElement.nextElementSibling;
    const targetGrid = screen.getByText(/Langue de vos sous-titres/i).parentElement.nextElementSibling;

    const sourceEs = Array.from(sourceGrid.querySelectorAll('button')).find(b => b.textContent.includes('ES'));
    const targetEn = Array.from(targetGrid.querySelectorAll('button')).find(b => b.textContent.includes('EN'));

    // Select Source ES
    fireEvent.click(sourceEs);
    expect(sourceEs.className).toContain('bg-emerald-600');

    // Select Target EN
    fireEvent.click(targetEn);
    expect(targetEn.className).toContain('bg-purple-600');

    // Both selections remain active without conflict
    expect(sourceEs.className).toContain('bg-emerald-600');
    expect(targetEn.className).toContain('bg-purple-600');
  });
});
