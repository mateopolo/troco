import React from 'react';
import { render } from '@testing-library/react';
import GeometricBackground from './layout/GeometricBackground';
import { isIosOrTouchDevice } from '../utils/deviceDetection';

describe('Phase 114 : Neutralisation matérielle du WebGL / Canvas sur iOS (VRAM Fix)', () => {
  const originalUserAgent = navigator.userAgent;
  const originalMaxTouchPoints = navigator.maxTouchPoints;
  const originalPlatform = navigator.platform;

  afterEach(() => {
    Object.defineProperty(navigator, 'userAgent', {
      value: originalUserAgent,
      configurable: true,
    });
    Object.defineProperty(navigator, 'maxTouchPoints', {
      value: originalMaxTouchPoints,
      configurable: true,
    });
    Object.defineProperty(navigator, 'platform', {
      value: originalPlatform,
      configurable: true,
    });
    delete window.ontouchstart;
  });

  test('1. isIosOrTouchDevice triggers on ontouchstart, maxTouchPoints > 0, iOS user agents, or MacIntel with touch', () => {
    // Cas ontouchstart
    window.ontouchstart = () => {};
    expect(isIosOrTouchDevice()).toBe(true);
    delete window.ontouchstart;

    // Cas maxTouchPoints > 0
    Object.defineProperty(navigator, 'maxTouchPoints', { value: 5, configurable: true });
    expect(isIosOrTouchDevice()).toBe(true);

    // Cas iPad identifié comme MacIntel avec maxTouchPoints > 1
    Object.defineProperty(navigator, 'maxTouchPoints', { value: 2, configurable: true });
    Object.defineProperty(navigator, 'platform', { value: 'MacIntel', configurable: true });
    Object.defineProperty(navigator, 'userAgent', { value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', configurable: true });
    expect(isIosOrTouchDevice()).toBe(true);
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
    Object.defineProperty(navigator, 'platform', { value: 'Win32', configurable: true });
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      configurable: true,
    });
    delete window.ontouchstart;
    window.HTMLCanvasElement.prototype.getContext = jest.fn(() => null);

    expect(isIosOrTouchDevice()).toBe(false);

    const { container } = render(<GeometricBackground darkMode={false} />);

    // Sur desktop non-tactile, canvas est autorisé
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });
});
