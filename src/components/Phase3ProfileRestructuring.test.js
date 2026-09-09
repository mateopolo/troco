import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ProfileView from './ProfileView';
import { ThemeProvider } from '../contexts/ThemeContext';

describe('PHASE 3 — TÂCHE 3.2 : Restructuration Profil (Avatar vs Studio)', () => {
  beforeAll(() => {
    window.matchMedia = window.matchMedia || function() {
      return {
        matches: false,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      };
    };
  });

  const dummyProfile = {
    uid: 'user-123',
    name: 'Jean Dupont',
    username: '@jdupont',
    avatar: 'https://example.com/avatar.png',
    bio: 'Passionné de bricolage et musique.',
    location: 'Lyon, France',
    dealsCompleted: 5,
    activeDeals: 2,
    reviewsCount: 3,
    averageRating: 4.8,
    trocoTokens: 12,
    euroBalance: 45.5,
    customFont: 'Inter',
    customThemeColor: '#C67D5B',
  };

  test('1. Bouton clair "Changer mon avatar" présent directement sous la photo de profil', () => {
    const mockAvatarUpload = jest.fn();
    render(
      <ThemeProvider>
        <ProfileView
          activeTab="profile"
          profile={dummyProfile}
          isEditingProfile={false}
          handleAvatarFileUpload={mockAvatarUpload}
          skills={[]}
          equipment={[]}
        />
      </ThemeProvider>
    );

    const changeAvatarBtn = screen.getByRole('button', { name: /Changer mon avatar/i });
    expect(changeAvatarBtn).toBeInTheDocument();

    // The hidden file input should exist and trigger when button is clicked
    const fileInput = document.body.querySelector('input[type="file"][aria-label="Changer mon avatar"]');
    expect(fileInput).toBeInTheDocument();

    const clickSpy = jest.spyOn(fileInput, 'click');
    fireEvent.click(changeAvatarBtn);
    expect(clickSpy).toHaveBeenCalled();
  });

  test('2. Bouton "Studio de Design" présent dans les Paramètres (loin de la photo)', () => {
    render(
      <ThemeProvider>
        <ProfileView
          activeTab="profile"
          profile={dummyProfile}
          isEditingProfile={false}
          skills={[]}
          equipment={[]}
        />
      </ThemeProvider>
    );

    // Modifier le profil should be present near the top
    expect(screen.getByRole('button', { name: /Modifier le profil/i })).toBeInTheDocument();

    // "Studio de Design" button should be present
    const studioBtn = screen.getByRole('button', { name: /Studio de Design/i });
    expect(studioBtn).toBeInTheDocument();

    // The section heading "Paramètres & Apparence" must exist
    expect(screen.getByText(/Paramètres & Apparence/i)).toBeInTheDocument();

    // Clicking "Studio de Design" opens the DesignStudioModal
    fireEvent.click(studioBtn);
    expect(screen.getByText(/Studio de Design & Accessibilité/i)).toBeInTheDocument();
  });

  test('3. Fusion de toutes les options de Thème et Couleurs d\'accentuation dans les Paramètres', () => {
    const mockSetProfile = jest.fn();
    render(
      <ThemeProvider>
        <ProfileView
          activeTab="profile"
          profile={dummyProfile}
          setProfile={mockSetProfile}
          isEditingProfile={false}
          skills={[]}
          equipment={[]}
        />
      </ThemeProvider>
    );

    // ProfileAppearanceCustomizer elements are displayed inside the settings section
    expect(screen.getByText(/Apparence & Ambiance de mon Profil Public/i)).toBeInTheDocument();
    expect(screen.getByText(/Thème & Couleur d'accentuation/i)).toBeInTheDocument();
    expect(screen.getByText(/Typographie du Profil Public/i)).toBeInTheDocument();

    // Test clicking a theme color
    const oceanBlueBtn = screen.getByTitle(/Ocean Blue/i);
    expect(oceanBlueBtn).toBeInTheDocument();
    fireEvent.click(oceanBlueBtn);
    expect(mockSetProfile).toHaveBeenCalled();
  });
});
