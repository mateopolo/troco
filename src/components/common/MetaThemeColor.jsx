import React, { useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { applyGlobalThemeColor, setThemeColorOverride, clearThemeColorOverride } from '../../utils/themeColor';

/**
 * MetaThemeColor.jsx
 * Composant de synchronisation réactive de la balise <meta name="theme-color">
 * Écoute le ThemeContext et permet des overrides déclaratifs.
 *
 * @param {Object} props
 * @param {string} [props.overrideColor] - Couleur d'override forcée optionnelle
 * @param {boolean} [props.isDark] - Mode sombre explicite (sinon extrait du context)
 */
export function MetaThemeColor({ overrideColor, isDark: explicitIsDark }) {
  let contextIsDark = false;
  try {
    const themeContext = useTheme();
    contextIsDark = themeContext?.isDark ?? false;
  } catch (_) {
    // Si rendu en dehors du ThemeProvider
  }

  const isDark = explicitIsDark !== undefined ? explicitIsDark : contextIsDark;

  useEffect(() => {
    if (overrideColor) {
      setThemeColorOverride(overrideColor);
      return () => {
        clearThemeColorOverride();
      };
    } else {
      applyGlobalThemeColor(isDark);
    }
  }, [isDark, overrideColor]);

  return null;
}

export default MetaThemeColor;
