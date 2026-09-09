import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CookieBanner from './CookieBanner';
import {
  getConsentStatus,
  getPrivacySettings,
  isTrackerAllowed,
  saveConsent,
  revokeAllConsent,
  purgeTrackers,
  MAX_CONSENT_DURATION_MS,
  COOKIE_CONSENT_KEY,
  CONSENT_TIMESTAMP_KEY,
} from '../services/consentManager';
import { detectGeoCurrency } from '../services/pricingService';

describe('TÂCHE 2 : Consentement Strict et Audit des Trackers (RGPD / CNIL)', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('1. Gardien Anti-Trackers & ConsentManager', () => {
    test('bloque tous les traceurs par défaut avant tout consentement (Opt-in strict)', () => {
      expect(getConsentStatus()).toBe('pending');
      expect(isTrackerAllowed('analytics')).toBe(false);
      expect(isTrackerAllowed('external_geoip')).toBe(false);
      expect(isTrackerAllowed('marketingEmails')).toBe(false);
      expect(isTrackerAllowed('necessary')).toBe(true);
    });

    test('bloque les traceurs si l utilisateur refuse (declined)', () => {
      saveConsent('declined');
      expect(getConsentStatus()).toBe('declined');
      expect(isTrackerAllowed('analytics')).toBe(false);
      expect(isTrackerAllowed('external_geoip')).toBe(false);
      expect(isTrackerAllowed('necessary')).toBe(true);
    });

    test('autorise les traceurs d analyse uniquement si l utilisateur a explicitement accepté', () => {
      saveConsent('accepted', { analytics: true, proximityAlerts: true });
      expect(getConsentStatus()).toBe('accepted');
      expect(isTrackerAllowed('analytics')).toBe(true);
      expect(isTrackerAllowed('external_geoip')).toBe(true);
    });

    test('purgeTrackers désactive Google Analytics globalement', () => {
      purgeTrackers();
      expect(window['ga-disable-G-N0XT6XXYSZ']).toBe(true);
    });

    test('le consentement expire automatiquement après 6 mois (Norme CNIL)', () => {
      const expiredTimestamp = Date.now() - (MAX_CONSENT_DURATION_MS + 10000);
      localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
      localStorage.setItem(CONSENT_TIMESTAMP_KEY, String(expiredTimestamp));

      expect(getConsentStatus()).toBe('pending');
      expect(isTrackerAllowed('analytics')).toBe(false);
    });
  });

  describe('2. Minimisation des Données & Requêtes Réseau', () => {
    test('detectGeoCurrency n appelle pas ipapi.co sans consentement préalable', async () => {
      const fetchSpy = jest.spyOn(global, 'fetch');
      localStorage.clear(); // Consentement pending

      const geo = await detectGeoCurrency();
      expect(geo).toBeDefined();
      expect(geo.isGeoLocked).toBe(true);
      // Aucune fuite d'IP vers ipapi.co
      const ipapiCalls = fetchSpy.mock.calls.filter(call => String(call[0]).includes('ipapi.co'));
      expect(ipapiCalls.length).toBe(0);

      fetchSpy.mockRestore();
    });
  });

  describe('3. Composant CookieBanner & Interactions', () => {
    test('affiche la bannière et permet de refuser immédiatement en 1 clic', async () => {
      render(<CookieBanner darkMode={false} onOpenPrivacyCenter={jest.fn()} onNavigate={jest.fn()} />);

      // Attend l'apparition de la bannière
      await waitFor(() => {
        expect(screen.getByRole('region', { name: /gestion des cookies/i })).toBeInTheDocument();
      });

      const declineBtn = screen.getByRole('button', { name: /continuer sans accepter/i });
      expect(declineBtn).toBeInTheDocument();
      fireEvent.click(declineBtn);

      expect(getConsentStatus()).toBe('declined');
      expect(isTrackerAllowed('analytics')).toBe(false);
    });

    test('permet d ouvrir le panneau de personnalisation granulaire et d enregistrer ses choix', async () => {
      render(<CookieBanner darkMode={false} onOpenPrivacyCenter={jest.fn()} onNavigate={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /personnaliser/i })).toBeInTheDocument();
      });

      const customizeBtn = screen.getByRole('button', { name: /personnaliser/i });
      fireEvent.click(customizeBtn);

      expect(screen.getByText(/Préférences détaillées des traceurs/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Traceurs strictement nécessaires/i).length).toBeGreaterThan(0);
      expect(screen.getByRole('checkbox', { name: /mesure d'audience/i })).not.toBeChecked();

      const saveCustomBtn = screen.getByRole('button', { name: /confirmer mes choix sélectionnés/i });
      expect(saveCustomBtn).toBeInTheDocument();
      fireEvent.click(saveCustomBtn);

      expect(getConsentStatus()).toBe('accepted');
      expect(isTrackerAllowed('analytics')).toBe(false); // Laissé décoché
      expect(isTrackerAllowed('necessary')).toBe(true);
    });
  });
});
