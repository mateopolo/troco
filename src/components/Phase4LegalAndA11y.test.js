import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CookieBanner from './CookieBanner';
import LegalNotice from './LegalNotice';
import * as consentManager from '../services/consentManager';

describe('TÂCHE 4.2 : Conformité Légale, RGPD/CNIL et Accessibilité A11Y', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('1. CookieBanner & Zéro-Traceur Pré-Consentement', () => {
    test('purge systématiquement les traceurs dès le montage si non accepté', () => {
      const purgeSpy = jest.spyOn(consentManager, 'purgeTrackers');
      render(<CookieBanner darkMode={false} />);
      expect(purgeSpy).toHaveBeenCalled();
      expect(consentManager.getConsentStatus()).toBe('pending');
      expect(consentManager.isTrackerAllowed('analytics')).toBe(false);
      purgeSpy.mockRestore();
    });

    test('le bouton de fermeture d urgence possède un aria-label explicite et focus:ring-2', async () => {
      render(<CookieBanner darkMode={false} />);
      await waitFor(() => {
        expect(screen.getByRole('region', { name: /gestion des cookies/i })).toBeInTheDocument();
      });

      const closeBtn = screen.getByRole('button', { name: /fermer la bannière et refuser les traceurs optionnels/i });
      expect(closeBtn).toBeInTheDocument();
      expect(closeBtn.className).toContain('focus:ring-2');
    });

    test('les boutons d action principaux possèdent des classes focus:ring-2 et des aria-label accessibles', async () => {
      render(<CookieBanner darkMode={false} />);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /tout accepter/i })).toBeInTheDocument();
      });

      const acceptBtn = screen.getByRole('button', { name: /tout accepter : autoriser l'ensemble des traceurs/i });
      const declineBtn = screen.getByRole('button', { name: /continuer sans accepter : refuser les traceurs optionnels/i });
      const customizeBtn = screen.getByRole('button', { name: /personnaliser les options de traceurs/i });

      expect(acceptBtn).toBeInTheDocument();
      expect(acceptBtn.className).toContain('focus:ring-2');

      expect(declineBtn).toBeInTheDocument();
      expect(declineBtn.className).toContain('focus:ring-2');

      expect(customizeBtn).toBeInTheDocument();
      expect(customizeBtn.className).toContain('focus:ring-2');
    });

    test('le volet de personnalisation affiche des interrupteurs de formulaire accessibles avec aria-label', async () => {
      render(<CookieBanner darkMode={false} />);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /personnaliser les options de traceurs/i })).toBeInTheDocument();
      });

      const customizeBtn = screen.getByRole('button', { name: /personnaliser les options de traceurs/i });
      fireEvent.click(customizeBtn);

      const analyticsSwitch = screen.getByRole('checkbox', { name: /autoriser la mesure d'audience anonyme/i });
      const proximitySwitch = screen.getByRole('checkbox', { name: /autoriser les alertes de proximité géographique/i });

      expect(analyticsSwitch).toBeInTheDocument();
      expect(proximitySwitch).toBeInTheDocument();
      expect(analyticsSwitch).not.toBeChecked();

      // Vérifie que le bouton de confirmation personnalisée a focus:ring-2
      const confirmCustomBtn = screen.getByRole('button', { name: /confirmer mes choix sélectionnés/i });
      expect(confirmCustomBtn).toBeInTheDocument();
      expect(confirmCustomBtn.className).toContain('focus:ring-2');
    });
  });

  describe('2. Mentions Légales (LegalNotice) & Accessibilité Clavier A11Y', () => {
    test('le bouton de retour possède un focus visible (focus:ring-2) et un aria-label', () => {
      const handleBack = jest.fn();
      render(<LegalNotice onBack={handleBack} onNavigate={jest.fn()} darkMode={false} />);

      const backBtn = screen.getByRole('button', { name: /retour à l'accueil troco/i });
      expect(backBtn).toBeInTheDocument();
      expect(backBtn.className).toContain('focus:ring-2');
      fireEvent.click(backBtn);
      expect(handleBack).toHaveBeenCalledTimes(1);
    });

    test('intègre un formulaire de signalement DSA accessible avec focus:ring-2 sur tous les champs', () => {
      render(<LegalNotice onBack={jest.fn()} onNavigate={jest.fn()} darkMode={false} />);

      const nameInput = screen.getByRole('textbox', { name: /votre nom complet ou raison sociale/i });
      const emailInput = screen.getByRole('textbox', { name: /votre adresse email de contact pour le suivi du signalement/i });
      const selectCategory = screen.getByRole('combobox', { name: /sélectionnez la catégorie de l'infraction signalée/i });
      const detailsInput = screen.getByRole('textbox', { name: /explication détaillée des motifs d'illicéité du contenu signalé/i });
      const submitBtn = screen.getByRole('button', { name: /transmettre le signalement à l'équipe de modération troco/i });
      const resetBtn = screen.getByRole('button', { name: /réinitialiser les champs du formulaire de signalement/i });

      expect(nameInput).toBeInTheDocument();
      expect(nameInput.className).toContain('focus:ring-2');

      expect(emailInput).toBeInTheDocument();
      expect(emailInput.className).toContain('focus:ring-2');

      expect(selectCategory).toBeInTheDocument();
      expect(selectCategory.className).toContain('focus:ring-2');

      expect(detailsInput).toBeInTheDocument();
      expect(detailsInput.className).toContain('focus:ring-2');

      expect(submitBtn).toBeInTheDocument();
      expect(submitBtn.className).toContain('focus:ring-2');

      expect(resetBtn).toBeInTheDocument();
      expect(resetBtn.className).toContain('focus:ring-2');
    });

    test('permet de soumettre un signalement DSA et affiche la confirmation d envoi', () => {
      render(<LegalNotice onBack={jest.fn()} onNavigate={jest.fn()} darkMode={false} />);

      const emailInput = screen.getByRole('textbox', { name: /votre adresse email de contact pour le suivi du signalement/i });
      const detailsInput = screen.getByRole('textbox', { name: /explication détaillée des motifs d'illicéité du contenu signalé/i });
      const submitBtn = screen.getByRole('button', { name: /transmettre le signalement à l'équipe de modération troco/i });

      fireEvent.change(emailInput, { target: { value: 'citoyen@example.fr' } });
      fireEvent.change(detailsInput, { target: { value: 'Contenu non conforme repéré sur l annonce #42.' } });
      fireEvent.click(submitBtn);

      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText(/signalement bien transmis au service de modération/i)).toBeInTheDocument();
      expect(screen.getByText(/citoyen@example\.fr/i)).toBeInTheDocument();
    });
  });
});
