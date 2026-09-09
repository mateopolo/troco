import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import LegalNotice from './LegalNotice';
import PrivacyPolicy from './PrivacyPolicy';
import CookiePolicy from './CookiePolicy';
import RefundPolicy from './RefundPolicy';
import Footer from './Footer';

describe('TÂCHE 1 : Conformité Légale, RGPD, Mentions Obligatoires et Footer', () => {
  describe('1. Mentions Légales (LegalNotice.jsx)', () => {
    test('affiche Mateo en tant que directeur de la publication et éditeur du site', () => {
      render(<LegalNotice onBack={jest.fn()} onNavigate={jest.fn()} darkMode={false} />);
      expect(screen.getByRole('heading', { level: 1, name: /mentions légales/i })).toBeInTheDocument();
      expect(screen.getAllByText(/mateo/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/éditeur de la plateforme/i)).toBeInTheDocument();
    });

    test('mentionne les hébergeurs Firebase/Google Cloud et Vercel', () => {
      render(<LegalNotice onBack={jest.fn()} onNavigate={jest.fn()} darkMode={false} />);
      expect(screen.getByText(/Google Cloud Platform \/ Firebase/i)).toBeInTheDocument();
      expect(screen.getByText(/Vercel Inc\./i)).toBeInTheDocument();
    });

    test('contient un bouton de retour fonctionnel avec aria-label accessible', () => {
      const handleBack = jest.fn();
      render(<LegalNotice onBack={handleBack} onNavigate={jest.fn()} darkMode={false} />);
      const backBtn = screen.getByRole('button', { name: /retour à l'accueil/i });
      expect(backBtn).toBeInTheDocument();
      fireEvent.click(backBtn);
      expect(handleBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('2. Politique de Confidentialité (PrivacyPolicy.jsx)', () => {
    test('détaille les données stockées sur Firebase et leurs durées de conservation', () => {
      render(<PrivacyPolicy onBack={jest.fn()} onNavigate={jest.fn()} onOpenPrivacyCenter={jest.fn()} darkMode={false} />);
      expect(screen.getByRole('heading', { level: 1, name: /politique de confidentialité/i })).toBeInTheDocument();
      expect(screen.getByText(/Données Précises Collectées & Stockées sur Google Firebase/i)).toBeInTheDocument();
      expect(screen.getByText(/Durée de Conservation des Données/i)).toBeInTheDocument();
      expect(screen.getAllByText(/24 mois/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/12 mois/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/10 ans/i).length).toBeGreaterThan(0);
    });

    test('mentionne les droits RGPD et le lien vers la CNIL', () => {
      render(<PrivacyPolicy onBack={jest.fn()} onNavigate={jest.fn()} onOpenPrivacyCenter={jest.fn()} darkMode={false} />);
      expect(screen.getAllByText(/Vos Droits RGPD/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/CNIL/i).length).toBeGreaterThan(0);
    });
  });

  describe('3. Politique des Cookies (CookiePolicy.jsx)', () => {
    test('dresse l inventaire des traceurs et clés locales utilisées', () => {
      render(<CookiePolicy onBack={jest.fn()} onNavigate={jest.fn()} onOpenCookieSettings={jest.fn()} darkMode={false} />);
      expect(screen.getByRole('heading', { level: 1, name: /politique des cookies/i })).toBeInTheDocument();
      expect(screen.getByText(/Inventaire Exhaustif des Traceurs & Stockages Locaux/i)).toBeInTheDocument();
      expect(screen.getByText(/firebase:authUser/i)).toBeInTheDocument();
      expect(screen.getByText(/troco_cookie_consent/i)).toBeInTheDocument();
      expect(screen.getByText(/troco_theme/i)).toBeInTheDocument();
      expect(screen.getAllByText(/6 mois/i).length).toBeGreaterThan(0);
    });

    test('permet de réinitialiser ses préférences de traceurs', () => {
      const handleOpenSettings = jest.fn();
      render(<CookiePolicy onBack={jest.fn()} onNavigate={jest.fn()} onOpenCookieSettings={handleOpenSettings} darkMode={false} />);
      const resetBtn = screen.getByRole('button', { name: /réinitialiser & configurer mes préférences/i });
      expect(resetBtn).toBeInTheDocument();
      fireEvent.click(resetBtn);
      expect(handleOpenSettings).toHaveBeenCalledTimes(1);
    });
  });

  describe('4. Politique de Remboursement (RefundPolicy.jsx)', () => {
    test('détaille le principe 1 heure = 1 jeton Troco, l Escrow et la rétractation de 14 jours', () => {
      render(<RefundPolicy onBack={jest.fn()} onNavigate={jest.fn()} darkMode={false} />);
      expect(screen.getByRole('heading', { level: 1, name: /politique de remboursement/i })).toBeInTheDocument();
      expect(screen.getByText(/1 heure partagée = 1 Jeton Troco/i)).toBeInTheDocument();
      expect(screen.getByText(/Délai légal de rétractation de 14 jours/i)).toBeInTheDocument();
      expect(screen.getByText(/Séquestre Sécurisé \(Escrow\) & Annulations de Deals P2P/i)).toBeInTheDocument();
    });

    test('définit la procédure de litiges P2P en 3 étapes claires', () => {
      render(<RefundPolicy onBack={jest.fn()} onNavigate={jest.fn()} darkMode={false} />);
      expect(screen.getByText(/Phase Amiable Directe/i)).toBeInTheDocument();
      expect(screen.getByText(/Saisine de la Modération Troco/i)).toBeInTheDocument();
      expect(screen.getByText(/Arbitrage & Restitution/i)).toBeInTheDocument();
    });
  });

  describe('5. Footer Global (Footer.jsx)', () => {
    test('affiche les liens vers toutes les pages légales et la mention de Mateo', () => {
      const handleNavigate = jest.fn();
      const handleOpenCgu = jest.fn();
      const handleOpenPrivacyCenter = jest.fn();

      render(
        <Footer
          onNavigate={handleNavigate}
          onOpenCgu={handleOpenCgu}
          onOpenPrivacyCenter={handleOpenPrivacyCenter}
          darkMode={false}
        />
      );

      expect(screen.getByRole('contentinfo')).toBeInTheDocument();
      expect(screen.getByText(/Édité par Mateo/i)).toBeInTheDocument();

      const legalNoticeLink = screen.getByRole('link', { name: /mentions légales/i });
      expect(legalNoticeLink).toBeInTheDocument();
      fireEvent.click(legalNoticeLink);
      expect(handleNavigate).toHaveBeenCalledWith('legal-notice');

      const privacyLink = screen.getByRole('link', { name: /politique de confidentialité/i });
      expect(privacyLink).toBeInTheDocument();
      fireEvent.click(privacyLink);
      expect(handleNavigate).toHaveBeenCalledWith('privacy-policy');

      const cookieLink = screen.getAllByRole('link', { name: /politique des cookies/i })[0];
      expect(cookieLink).toBeInTheDocument();
      fireEvent.click(cookieLink);
      expect(handleNavigate).toHaveBeenCalledWith('cookie-policy');

      const refundLink = screen.getByRole('link', { name: /politique de remboursement/i });
      expect(refundLink).toBeInTheDocument();
      fireEvent.click(refundLink);
      expect(handleNavigate).toHaveBeenCalledWith('refund-policy');
    });
  });
});
