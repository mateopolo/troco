/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  getDitherBayerMatrix,
  applyDitherToImageData,
  generateCRTScanlinesSVG,
  generateNoiseSVG,
} from '../../src/utils/crtEffects';
import CRTOverlay from '../../src/components/onboarding/CRTOverlay';
import SplashScreen from '../../src/components/onboarding/SplashScreen';
import { playSplashSound } from '../../src/services/audioService';
import { translations } from '../../src/data/translationsData';

// Mock canvas 2D context pour JSDOM
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation(() => ({
    createRadialGradient: () => ({ addColorStop: vi.fn() }),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    stroke: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    getImageData: () => ({ width: 256, height: 256, data: new Uint8ClampedArray(256 * 256 * 4) }),
    putImageData: vi.fn(),
  }));
}

describe('TÂCHE 1 : Module src/utils/crtEffects.js', () => {
  it('getDitherBayerMatrix retourne une matrice 4x4 conforme', () => {
    const matrix4 = getDitherBayerMatrix(4);
    expect(matrix4).toBeDefined();
    expect(matrix4.length).toBe(4);
    expect(matrix4[0].length).toBe(4);
    expect(matrix4[0][0]).toBe(0);
    expect(matrix4[1][0]).toBe(12);
  });

  it('getDitherBayerMatrix retourne une matrice 8x8 conforme', () => {
    const matrix8 = getDitherBayerMatrix(8);
    expect(matrix8).toBeDefined();
    expect(matrix8.length).toBe(8);
    expect(matrix8[0].length).toBe(8);
  });

  it('applyDitherToImageData transforme les pixels en 1-bit noir/blanc pur', () => {
    const width = 4;
    const height = 4;
    const buffer = new Uint8ClampedArray(width * height * 4);
    // Remplir avec des nuances de gris
    for (let i = 0; i < buffer.length; i += 4) {
      const gray = (i / 4) * 15; // 0 à 225
      buffer[i] = gray;     // R
      buffer[i + 1] = gray; // G
      buffer[i + 2] = gray; // B
      buffer[i + 3] = 255;  // A
    }

    const mockImageData = {
      width,
      height,
      data: buffer,
    };

    const result = applyDitherToImageData(mockImageData, 128);
    expect(result).toBeDefined();
    expect(result.data.length).toBe(buffer.length);

    // Vérifier que chaque pixel RGB est soit 0 soit 255
    for (let i = 0; i < result.data.length; i += 4) {
      const r = result.data[i];
      const g = result.data[i + 1];
      const b = result.data[i + 2];
      expect([0, 255]).toContain(r);
      expect([0, 255]).toContain(g);
      expect([0, 255]).toContain(b);
      expect(result.data[i + 3]).toBe(255);
    }
  });

  it('generateCRTScanlinesSVG génère une chaîne SVG valide avec espacement 3px', () => {
    const svg = generateCRTScanlinesSVG(300, 200);
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
    expect(svg).toContain('stroke-opacity="0.15"');
    expect(svg).toContain('height="3"');
  });

  it('generateNoiseSVG génère une chaîne SVG de bruit statique CRT', () => {
    const svg = generateNoiseSVG(200, 150, 0.2);
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
    expect(svg).toContain('feTurbulence');
    expect(svg).toContain('filter="url(#crt-noise-filter)"');
  });
});

describe('TÂCHE 2 : Composant CRTOverlay.jsx', () => {
  it('rend le contenu enfant et les couches CRT sans crash', () => {
    const { container } = render(
      <CRTOverlay intensity={0.2} showNoise={true} showScanlines={true}>
        <div data-testid="child-content">Contenu Troco</div>
      </CRTOverlay>
    );

    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    expect(screen.getByText('Contenu Troco')).toBeInTheDocument();
    expect(container.querySelector('.crt-overlay-container')).toBeInTheDocument();
  });
});

describe('TÂCHE 3 : Audio playSplashSound()', () => {
  it('playSplashSound est défini et retourne une promesse résolue sans erreur', async () => {
    expect(typeof playSplashSound).toBe('function');
    const resultPromise = playSplashSound();
    expect(resultPromise).toBeInstanceOf(Promise);
    await expect(resultPromise).resolves.toBeUndefined();
  });
});

describe('TÂCHE 4 : Composant SplashScreen.jsx', () => {
  it('rend l’état idle avec TROCO, logo et bouton d’entrée', () => {
    const onCompleteMock = vi.fn();
    render(
      <SplashScreen
        onComplete={onCompleteMock}
        darkMode={true}
        t={(k, def) => def || k}
      />
    );

    expect(screen.getByText('TROCO')).toBeInTheDocument();
    expect(screen.getByText('Entrer sur Troco')).toBeInTheDocument();
    expect(screen.getByText("L'économie circulaire commence ici")).toBeInTheDocument();
    expect(screen.getByText('Appuyez pour commencer')).toBeInTheDocument();
  });

  it('cliquer sur le bouton déclenche l’animation et appelle onComplete', async () => {
    vi.useFakeTimers();
    const onCompleteMock = vi.fn();

    render(
      <SplashScreen
        onComplete={onCompleteMock}
        darkMode={true}
        t={(k, def) => def || k}
      />
    );

    const button = screen.getByText('Entrer sur Troco');
    fireEvent.click(button);

    // Avance le temps pour franchir les étapes d'animation (300ms + typewriter + 2000ms + 700ms)
    act(() => {
      vi.advanceTimersByTime(3500);
    });

    expect(onCompleteMock).toHaveBeenCalled();
    vi.useRealTimers();
  });
});

describe('TÂCHE 7 : Traductions dans les 7 langues', () => {
  const supportedLangs = ['FR', 'EN', 'ES', 'IT', 'DE', 'JA', 'ZH'];

  it.each(supportedLangs)('la langue %s possède les 4 clés splash traduites', (lang) => {
    const langDict = translations[lang];
    expect(langDict).toBeDefined();
    expect(langDict.splashEnter).toBeDefined();
    expect(typeof langDict.splashEnter).toBe('string');
    expect(langDict.splashSubtitle).toBeDefined();
    expect(typeof langDict.splashSubtitle).toBe('string');
    expect(langDict.splashLoading).toBeDefined();
    expect(typeof langDict.splashLoading).toBe('string');
    expect(langDict.splashPressAnyKey).toBeDefined();
    expect(typeof langDict.splashPressAnyKey).toBe('string');
  });
});
