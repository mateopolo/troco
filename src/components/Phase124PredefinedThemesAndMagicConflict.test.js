import React from 'react';
import { render, act, fireEvent } from '@testing-library/react';
import {
  ThemeProvider,
  useTheme,
  THEMES_CONFIG,
  PRESET_THEME_PRIMARY_HEX,
  RESOLVE_PRESET_ID
} from '../contexts/ThemeContext';

function TestThemeConsumer() {
  const {
    themeId,
    applyPresetTheme,
    setThemeId,
    applyBrandColor,
    customBrandColor,
    brandColor,
  } = useTheme();

  return (
    <div>
      <div data-testid="theme-id">{themeId}</div>
      <div data-testid="custom-color">{customBrandColor || 'null'}</div>
      <div data-testid="brand-color">{brandColor || 'null'}</div>
      <button data-testid="btn-sakura" onClick={() => applyPresetTheme('sakura')}>
        Sakura
      </button>
      <button data-testid="btn-botanical" onClick={() => applyPresetTheme('botanical')}>
        Botanical
      </button>
      <button data-testid="btn-emerald" onClick={() => applyPresetTheme('emerald')}>
        Emerald
      </button>
      <button data-testid="btn-magic" onClick={() => applyBrandColor('#E11D48')}>
        Magic
      </button>
      <button data-testid="btn-set-sakura" onClick={() => setThemeId('sakura')}>
        Set Sakura
      </button>
    </div>
  );
}

describe('Phase 124 : Résolution conflit Thèmes Prédéfinis vs Générateur Magique', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.style.removeProperty('--accent-primary');
    document.documentElement.style.removeProperty('--accent-primary-hover');
    document.documentElement.style.removeProperty('--accent-secondary');
  });

  it('fournit les valeurs hex exactes pour Sakura (#FFB7C5) et Botanical (#8B9A80)', () => {
    expect(PRESET_THEME_PRIMARY_HEX.sakura).toBe('#FFB7C5');
    expect(PRESET_THEME_PRIMARY_HEX.emerald).toBe('#8B9A80');
    expect(PRESET_THEME_PRIMARY_HEX.botanical).toBe('#8B9A80');
    expect(THEMES_CONFIG.sakura.lightVariables['--accent-primary']).toBe('#FFB7C5');
    expect(THEMES_CONFIG.emerald.lightVariables['--accent-primary']).toBe('#8B9A80');
  });

  it('résout correctement les alias de noms de thèmes (botanical -> emerald, etc.)', () => {
    expect(RESOLVE_PRESET_ID('botanical')).toBe('emerald');
    expect(RESOLVE_PRESET_ID('Botanical Sage')).toBe('emerald');
    expect(RESOLVE_PRESET_ID('sakura')).toBe('sakura');
    expect(RESOLVE_PRESET_ID('Soft Sakura')).toBe('sakura');
    expect(RESOLVE_PRESET_ID('earthy')).toBe('earthy');
  });

  it('réinitialise customBrandColor et localStorage lors du choix d\'un thème prédéfini', () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <TestThemeConsumer />
      </ThemeProvider>
    );

    // 1. Appliquer une couleur personnalisée via le générateur magique
    act(() => {
      fireEvent.click(getByTestId('btn-magic'));
    });

    expect(getByTestId('theme-id').textContent).toBe('custom');
    expect(getByTestId('custom-color').textContent).toBe('#E11D48');
    expect(localStorage.getItem('troco_custom_color')).toBe('#E11D48');
    expect(document.documentElement.style.getPropertyValue('--accent-primary')).toBe('#E11D48');

    // 2. Sélectionner Sakura : doit écraser et vider le custom color et forcer #FFB7C5
    act(() => {
      fireEvent.click(getByTestId('btn-sakura'));
    });

    expect(getByTestId('theme-id').textContent).toBe('sakura');
    expect(getByTestId('custom-color').textContent).toBe('null');
    expect(localStorage.getItem('troco_custom_color')).toBeNull();
    expect(localStorage.getItem('troco_studio_brand_color')).toBeNull();
    expect(document.documentElement.style.getPropertyValue('--accent-primary')).toBe('#FFB7C5');

    // 3. Sélectionner Botanical : doit forcer #8B9A80
    act(() => {
      fireEvent.click(getByTestId('btn-botanical'));
    });

    expect(getByTestId('theme-id').textContent).toBe('emerald');
    expect(getByTestId('custom-color').textContent).toBe('null');
    expect(document.documentElement.style.getPropertyValue('--accent-primary')).toBe('#8B9A80');
  });

  it('setThemeId délègue à applyPresetTheme pour nettoyer la couleur magique', () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <TestThemeConsumer />
      </ThemeProvider>
    );

    act(() => {
      fireEvent.click(getByTestId('btn-magic'));
    });
    expect(getByTestId('custom-color').textContent).toBe('#E11D48');

    act(() => {
      fireEvent.click(getByTestId('btn-set-sakura'));
    });

    expect(getByTestId('theme-id').textContent).toBe('sakura');
    expect(getByTestId('custom-color').textContent).toBe('null');
    expect(document.documentElement.style.getPropertyValue('--accent-primary')).toBe('#FFB7C5');
  });

  it('respecte la priorité CSS : les thèmes prédéfinis écrasent toujours les résidus du générateur magique', () => {
    // Simuler un état corrompu où un résidu existe dans localStorage
    localStorage.setItem('troco_custom_color', '#FF00FF');
    localStorage.setItem('troco_theme_base', 'sakura');

    render(
      <ThemeProvider>
        <TestThemeConsumer />
      </ThemeProvider>
    );

    // Puisque le thème 'sakura' est actif, le CSS doit strictement injecter #FFB7C5 et ignorer le résidu
    expect(document.documentElement.style.getPropertyValue('--accent-primary')).toBe('#FFB7C5');
  });
});
