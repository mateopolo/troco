import React from 'react';
import { render } from '@testing-library/react';
import {
  setMetaThemeColor,
  getMetaThemeColor,
  applyGlobalThemeColor,
  setThemeColorOverride,
  clearThemeColorOverride,
  isHexDark
} from './themeColor';
import MetaThemeColor from '../components/common/MetaThemeColor';

describe('Phase 50 : Meta Theme Color Dynamique', () => {
  beforeEach(() => {
    // Nettoyer les balises meta avant chaque test
    document.head.querySelectorAll('meta[name="theme-color"]').forEach(el => el.remove());
    document.head.querySelectorAll('meta[name="apple-mobile-web-app-status-bar-style"]').forEach(el => el.remove());
    clearThemeColorOverride();
  });

  it('crée et met à jour la balise meta theme-color correctement', () => {
    setMetaThemeColor('#123456');
    expect(getMetaThemeColor()).toBe('#123456');

    setMetaThemeColor('#AABBCC');
    expect(getMetaThemeColor()).toBe('#AABBCC');
  });

  it('bascule entre #0F172A (Dark Mode) et #FFFFFF (Light Mode)', () => {
    applyGlobalThemeColor(true);
    expect(getMetaThemeColor()).toBe('#0F172A');

    applyGlobalThemeColor(false);
    expect(getMetaThemeColor()).toBe('#FFFFFF');
  });

  it('gère l\'override de couleur pour le Whiteboard et restaure la couleur précédente', () => {
    applyGlobalThemeColor(false);
    expect(getMetaThemeColor()).toBe('#FFFFFF');

    // Override couleur canvas Whiteboard
    setThemeColorOverride('#22C55E');
    expect(getMetaThemeColor()).toBe('#22C55E');

    // Changement de mode en arrière-plan pendant l'override
    applyGlobalThemeColor(true);
    // L'override reste prioritaire
    expect(getMetaThemeColor()).toBe('#22C55E');

    // Nettoyage de l'override => restauration du mode sombre actif
    clearThemeColorOverride();
    expect(getMetaThemeColor()).toBe('#0F172A');
  });

  it('calcule la luminance correctement avec isHexDark', () => {
    expect(isHexDark('#000000')).toBe(true);
    expect(isHexDark('#0F172A')).toBe(true);
    expect(isHexDark('#FFFFFF')).toBe(false);
    expect(isHexDark('#FAF7F2')).toBe(false);
  });

  it('rend le composant MetaThemeColor et applique l\'override déclaratif', () => {
    const { unmount } = render(<MetaThemeColor isDark={true} overrideColor="#8B5CF6" />);
    expect(getMetaThemeColor()).toBe('#8B5CF6');

    // Unmount doit nettoyer l'override
    unmount();
    expect(getMetaThemeColor()).toBe('#0F172A');
  });
});
