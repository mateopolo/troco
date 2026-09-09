import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import fs from 'fs';
import path from 'path';
import DesignStudioModal from './DesignStudioModal';
import { ThemeProvider } from '../contexts/ThemeContext';

describe('Phase 132 : Extraction du Studio de Design et Modale Dédiée', () => {
  const profileFeaturePath = path.join(__dirname, '../features/profile/ProfileFeature.jsx');
  const profileFeatureContent = fs.readFileSync(profileFeaturePath, 'utf-8');

  const profileViewPath = path.join(__dirname, 'ProfileView.jsx');
  const profileViewContent = fs.readFileSync(profileViewPath, 'utf-8');

  test('1. Bouton d\'accès présent dans ProfileFeature et ProfileView', () => {
    expect(profileFeatureContent).toContain("setIsDesignStudioOpen(true)");
    expect(profileFeatureContent).toContain("🎨 Personnaliser l'apparence");

    expect(profileViewContent).toContain("setIsDesignStudioOpen(true)");
    expect(profileViewContent).toContain("🎨 Personnaliser l'apparence");
  });

  test('2. Intégration de DesignStudioModal dans ProfileFeature et suppression du pavé massif inline', () => {
    expect(profileFeatureContent).toContain("<DesignStudioModal");
    expect(profileFeatureContent).toContain("isOpen={isDesignStudioOpen}");
    expect(profileFeatureContent).toContain("onClose={() => setIsDesignStudioOpen(false)}");

    // Vérifie que l'ancien pavé massif de prévisualisation de cours de guitare a été extrait de ProfileFeature
    expect(profileFeatureContent).not.toContain("Cours Particulier de Guitare & MAO");
  });

  test('3. DesignStudioModal ne s\'affiche pas quand isOpen={false}', () => {
    render(
      <ThemeProvider>
        <DesignStudioModal isOpen={false} onClose={jest.fn()} />
      </ThemeProvider>
    );

    expect(screen.queryByText(/Studio de Design & Accessibilité/i)).not.toBeInTheDocument();
  });

  test('4. DesignStudioModal s\'affiche dans document.body via Portal quand isOpen={true}', () => {
    render(
      <ThemeProvider>
        <DesignStudioModal isOpen={true} onClose={jest.fn()} />
      </ThemeProvider>
    );

    // Titre et en-tête
    expect(screen.getByText(/Studio de Design & Accessibilité/i)).toBeInTheDocument();

    // Section 1 : Carte de prévisualisation live
    expect(screen.getByText(/Cours Particulier de Guitare & MAO/i)).toBeInTheDocument();
    expect(screen.getByText(/Aperçu Live/i)).toBeInTheDocument();
    expect(screen.getByText(/Contraste Garanti \(WCAG AA\)/i)).toBeInTheDocument();

    // Section 2 : Thèmes & Ambiances Prédéfinies
    expect(screen.getByText(/Thèmes & Ambiances Prédéfinies/i)).toBeInTheDocument();

    // Section 3 : Générateur Magique
    expect(screen.getByText(/Générateur Magique \(1 Clic\)/i)).toBeInTheDocument();

    // Section 4 : Typographies, Zoom & Formes
    expect(screen.getByText(/Studio Design, Ambiances & Typographie/i)).toBeInTheDocument();
    expect(screen.getByText(/Typographie Globale/i)).toBeInTheDocument();
    expect(screen.getByText(/Échelle & Zoom d'Affichage/i)).toBeInTheDocument();
    expect(screen.getByText(/Forme des Boutons & Cartes/i)).toBeInTheDocument();
    expect(screen.getByText(/Ajustement Précis des Couleurs/i)).toBeInTheDocument();
  });

  test('5. Le bouton de fermeture (X) appelle onClose', () => {
    const handleClose = jest.fn();
    render(
      <ThemeProvider>
        <DesignStudioModal isOpen={true} onClose={handleClose} />
      </ThemeProvider>
    );

    const closeBtn = screen.getByRole('button', { name: /fermer le studio de design/i });
    expect(closeBtn).toBeInTheDocument();
    fireEvent.click(closeBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  test('6. La touche Échap ferme la modale', () => {
    const handleClose = jest.fn();
    render(
      <ThemeProvider>
        <DesignStudioModal isOpen={true} onClose={handleClose} />
      </ThemeProvider>
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
