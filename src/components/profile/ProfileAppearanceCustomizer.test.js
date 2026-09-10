import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ProfileAppearanceCustomizer, {
  isGradient,
  buildGradient,
  accentBackground,
  PROFILE_FONTS,
  MOOD_PALETTES,
  GRADIENT_PRESETS,
  AMBIENCES,
} from './ProfileAppearanceCustomizer';

describe('ProfileAppearanceCustomizer Component', () => {
  const defaultProps = {
    customFont: 'Inter',
    customThemeColor: '#C67D5B',
    onFontChange: jest.fn(),
    onColorChange: jest.fn(),
    previewName: 'Sophie Martin',
    previewHandle: '@sophie.m',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  test('1. Rendu initial complet avec prévisualisation en direct et typographie Inter', () => {
    render(<ProfileAppearanceCustomizer {...defaultProps} />);

    // Header & preview
    expect(screen.getByText(/Apparence & Ambiance de mon Profil Public/i)).toBeInTheDocument();
    expect(screen.getByText('Sophie Martin')).toBeInTheDocument();
    expect(screen.getByText('@sophie.m')).toBeInTheDocument();
    expect(screen.getByText(/Aperçu en direct — Inter/i)).toBeInTheDocument();
  });

  test('2. Sélecteur de modes (Couleur unie et Dégradé) et application de dégradés', () => {
    const mockColorChange = jest.fn();
    render(<ProfileAppearanceCustomizer {...defaultProps} onColorChange={mockColorChange} />);

    const gradientTab = screen.getByRole('button', { name: /Dégradé/i });
    expect(gradientTab).toBeInTheDocument();
    fireEvent.click(gradientTab);

    // Click on a gradient preset like Aurore Boréale
    const auroreBtn = screen.getByRole('button', { name: /Aurore Boréale/i });
    expect(auroreBtn).toBeInTheDocument();
    fireEvent.click(auroreBtn);

    expect(mockColorChange).toHaveBeenCalledWith(
      expect.stringContaining('linear-gradient')
    );
  });

  test('3. Sélection de couleur dans la palette Signatures et mise à jour', () => {
    const mockColorChange = jest.fn();
    render(<ProfileAppearanceCustomizer {...defaultProps} onColorChange={mockColorChange} />);

    // Select Ocean Blue
    const oceanBlue = screen.getByRole('button', { name: /Ocean Blue/i });
    expect(oceanBlue).toBeInTheDocument();
    fireEvent.click(oceanBlue);

    expect(mockColorChange).toHaveBeenCalledWith('#2563EB');
  });

  test('4. Filtrage des polices par catégorie et changement de typographie', () => {
    const mockFontChange = jest.fn();
    render(<ProfileAppearanceCustomizer {...defaultProps} onFontChange={mockFontChange} />);

    // Filter by Serif
    const serifChip = screen.getByRole('button', { name: 'Serif' });
    fireEvent.click(serifChip);

    // Playfair Display should be visible
    const playfairBtn = screen.getByRole('button', { name: /Police Playfair Display/i });
    expect(playfairBtn).toBeInTheDocument();
    fireEvent.click(playfairBtn);

    expect(mockFontChange).toHaveBeenCalledWith('Playfair Display');
  });

  test('5. Application d\'une ambiance instantanée (Startup Pro, etc.)', () => {
    const mockFontChange = jest.fn();
    const mockColorChange = jest.fn();
    render(
      <ProfileAppearanceCustomizer
        {...defaultProps}
        onFontChange={mockFontChange}
        onColorChange={mockColorChange}
      />
    );

    const startupProBtn = screen.getByRole('button', { name: /Startup Pro/i });
    expect(startupProBtn).toBeInTheDocument();
    fireEvent.click(startupProBtn);

    expect(mockFontChange).toHaveBeenCalledWith('Plus Jakarta Sans');
    expect(mockColorChange).toHaveBeenCalledWith('#2563EB');
  });

  test('6. Bouton "Surprends-moi !" déclenche aléatoirement couleur et police', () => {
    const mockFontChange = jest.fn();
    const mockColorChange = jest.fn();
    render(
      <ProfileAppearanceCustomizer
        {...defaultProps}
        onFontChange={mockFontChange}
        onColorChange={mockColorChange}
      />
    );

    const shuffleBtn = screen.getByRole('button', { name: /Surprends-moi !/i });
    expect(shuffleBtn).toBeInTheDocument();
    fireEvent.click(shuffleBtn);

    expect(mockFontChange).toHaveBeenCalled();
    expect(mockColorChange).toHaveBeenCalled();
  });

  test('7. Helpers exportés isGradient, buildGradient et accentBackground', () => {
    expect(isGradient('linear-gradient(135deg, #FFF, #000)')).toBe(true);
    expect(isGradient('#C67D5B')).toBe(false);

    const grad = buildGradient('#FF0000', '#00FF00', 90);
    expect(grad).toBe('linear-gradient(90deg, #FF0000, #00FF00)');

    expect(accentBackground('#123456')).toEqual({ backgroundColor: '#123456' });
    expect(accentBackground(grad)).toEqual({ backgroundImage: grad });
  });
});
