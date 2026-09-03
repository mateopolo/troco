import React from 'react';
import { render, screen } from '@testing-library/react';
import GeometricBackground from './layout/GeometricBackground';

describe('Phase 114 : Neutralisation matérielle du WebGL / Canvas sur iOS (VRAM Fix)', () => {
  const originalUserAgent = navigator.userAgent;
  const originalMaxTouchPoints = navigator.maxTouchPoints;

  afterEach(() => {
    Object.defineProperty(navigator, 'userAgent', {
      value: originalUserAgent,
      configurable: true,
    });
    Object.defineProperty(navigator, 'maxTouchPoints', {
      value: originalMaxTouchPoints,
      configurable: true,
    });
  });

  test('1. Touch device detection triggers on maxTouchPoints > 0 (e.g. iPad, iPhone)', () => {
    Object.defineProperty(navigator, 'maxTouchPoints', { value: 5, configurable: true });
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPad; CPU OS 16_5 like Mac OS X) AppleWebKit/605.1.15',
      configurable: true,
    });

    const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || /iPad|iPhone|iPod/.test(navigator.userAgent);
    expect(isTouchDevice).toBe(true);
  });

  test('2. iPad with desktop-size viewport (e.g. 1024px) is identified as touch device and NEVER mounts canvas', () => {
    Object.defineProperty(navigator, 'maxTouchPoints', { value: 5, configurable: true });
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)',
      configurable: true,
    });

    // Simule une largeur de grand écran iPad (>= 768px)
    window.innerWidth = 1024;

    const { container } = render(<GeometricBackground darkMode={false} />);

    // Zéro canvas dans le DOM !
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeNull();

    // Doit afficher le fallback CSS
    const fallback = container.querySelector('[data-testid="ios-touch-geometric-fallback"]');
    expect(fallback).toBeInTheDocument();
  });

  test('3. iPhone user agent triggers touch detection and prevents canvas mounting', () => {
    Object.defineProperty(navigator, 'maxTouchPoints', { value: 1, configurable: true });
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
      configurable: true,
    });

    const { container } = render(<GeometricBackground darkMode={true} />);

    const canvas = container.querySelector('canvas');
    expect(canvas).toBeNull();

    const fallback = container.querySelector('[data-testid="ios-touch-geometric-fallback"]');
    expect(fallback).toBeInTheDocument();
  });

  test('4. Non-touch desktop without touch points renders canvas on desktop', () => {
    Object.defineProperty(navigator, 'maxTouchPoints', { value: 0, configurable: true });
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      configurable: true,
    });
    delete window.ontouchstart;
    window.HTMLCanvasElement.prototype.getContext = jest.fn(() => null);

    const { container } = render(<GeometricBackground darkMode={false} />);

    // Sur desktop non-tactile, canvas est autorisé
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });
});
