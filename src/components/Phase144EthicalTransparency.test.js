import React from 'react';
import fs from 'fs';
import path from 'path';
import { render, screen } from '@testing-library/react';
import { DEFAULT_GLOBAL_CONTENT } from '../features/admin/useGlobalContent';
import DealMessageCard from './DealMessageCard';
import SponsoredFeedCard from './SponsoredFeedCard';
import UserProfile from './UserProfile';

jest.mock('../firebase', () => ({
  db: {},
  auth: { currentUser: { uid: 'test-user-123' } },
  storage: {},
}));

jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'test-user-123', email: 'test@troco.fr' },
    profile: {
      uid: 'test-user-123',
      name: 'Test User',
      email: 'test@troco.fr',
      reviews: 0,
      reviewsCount: 0,
      rating: null,
      trocoTokens: 10,
      euroBalance: 50,
    },
    updateProfile: jest.fn(),
  }),
}));

beforeAll(() => {
  global.IntersectionObserver = class {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe('TÂCHE 4 : Transparence Éthique, Purge des Faux Avis & Labels Contractuels Clairs', () => {

  describe('1. Absence d\'allégations trompeuses (useGlobalContent.js)', () => {
    test('le message d\'accueil ne contient aucune allégation non étayée de "1ère plateforme"', () => {
      expect(DEFAULT_GLOBAL_CONTENT.welcome_message).not.toContain('1ère plateforme');
      expect(DEFAULT_GLOBAL_CONTENT.welcome_message).not.toContain('première plateforme');
      expect(DEFAULT_GLOBAL_CONTENT.welcome_message).toContain('Plateforme collaborative de troc de compétences et services');
    });

    test('le fichier useGlobalContent.js est exempt d\'affirmation publicitaire trompeuse', () => {
      const filePath = path.resolve(__dirname, '../features/admin/useGlobalContent.js');
      const content = fs.readFileSync(filePath, 'utf8');
      expect(content).not.toContain('La 1ère plateforme');
    });
  });

  describe('2. Absence de notes fictives par défaut (UserProfile.jsx)', () => {
    test('affiche un message explicite "Pas d\'évaluation pour l\'instant (0 avis)" pour un nouveau profil', () => {
      const zeroReviewProfile = {
        name: 'Alexandre Dupont',
        username: '@alex',
        bio: 'Nouveau troqueur sur Troco.',
        location: 'Lyon, France',
        reviews: 0,
        reviewsCount: 0,
        rating: null,
        skills: ['Jardinage'],
        equipment: ['Tondeuse'],
      };

      render(
        <UserProfile
          profile={zeroReviewProfile}
          isOwnProfile={true}
          darkMode={false}
          t={(k) => k}
        />
      );

      expect(screen.getByText(/Pas d'évaluation pour l'instant \(0 avis\)/i)).toBeInTheDocument();
      expect(screen.queryByText(/5\.0 \(0 avis\)/)).not.toBeInTheDocument();
    });

    test('affiche la note réelle et le nombre d\'avis uniquement si le membre a des avis vérifiés', () => {
      const ratedProfile = {
        name: 'Claire Martin',
        username: '@clairem',
        bio: 'Artiste peintre.',
        location: 'Marseille, France',
        reviews: 4,
        reviewsCount: 4,
        rating: 4.75,
        skills: ['Peinture'],
        equipment: ['Chevalet'],
      };

      render(
        <UserProfile
          profile={ratedProfile}
          isOwnProfile={false}
          darkMode={false}
          t={(k) => k}
        />
      );

      expect(screen.getByText(/4\.8 \(4 avis\)/i)).toBeInTheDocument();
      expect(screen.queryByText(/Pas d'évaluation pour l'instant/i)).not.toBeInTheDocument();
    });
  });

  describe('3. Absence de faux avis & fausses notes partenaires (SponsoredFeedCard.jsx)', () => {
    test('les cartes partenaires ne contiennent aucun faux avis ni note simulée', () => {
      const filePath = path.resolve(__dirname, './SponsoredFeedCard.jsx');
      const content = fs.readFileSync(filePath, 'utf8');
      expect(content).not.toContain('reviewsCount: 128');
      expect(content).not.toContain('reviewsCount: 84');
      expect(content).not.toContain('reviewsCount: 62');
      expect(content).not.toContain('reviewsCount: 210');
      expect(content).toContain('Partenaire certifié');
    });

    test('affiche le badge transparent "Partenaire certifié" sans note étoilée simulée', () => {
      render(<SponsoredFeedCard index={0} darkMode={false} />);
      expect(screen.getAllByText(/Partenaire certifié/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText(/★/)).not.toBeInTheDocument();
    });
  });

  describe('4. Clarté contractuelle des boutons de négociation (DealMessageCard.jsx)', () => {
    const mockMsg = {
      id: 'deal-msg-456',
      senderId: 'partner-user-999',
      dealProposal: {
        itemTitle: 'Cours de mixage audio',
        tokens: 3,
        euroAmount: 0,
        status: 'pending',
      },
      createdAt: new Date().toISOString(),
    };

    test('affiche "Accepter & sceller le deal" avec accessibilité claire', () => {
      render(
        <DealMessageCard
          msg={mockMsg}
          currentUserId="test-user-123"
          onAcceptDeal={jest.fn()}
          openCounterOffer={jest.fn()}
          onDeclineDeal={jest.fn()}
          t={(k) => k}
        />
      );

      const acceptBtn = screen.getByRole('button', { name: /Accepter et sceller le deal/i });
      expect(acceptBtn).toBeInTheDocument();
      expect(acceptBtn).toHaveTextContent(/Accepter & sceller le deal/i);
    });

    test('affiche "Contre-offre" avec aria-label et titre explicite', () => {
      render(
        <DealMessageCard
          msg={mockMsg}
          currentUserId="test-user-123"
          onAcceptDeal={jest.fn()}
          openCounterOffer={jest.fn()}
          onDeclineDeal={jest.fn()}
          t={(k) => k}
        />
      );

      const counterBtn = screen.getByRole('button', { name: /Faire une contre-offre/i });
      expect(counterBtn).toBeInTheDocument();
      expect(counterBtn).toHaveTextContent(/Contre-offre/i);
    });

    test('affiche "Décliner l\'offre" avec aria-label et titre explicite', () => {
      render(
        <DealMessageCard
          msg={mockMsg}
          currentUserId="test-user-123"
          onAcceptDeal={jest.fn()}
          openCounterOffer={jest.fn()}
          onDeclineDeal={jest.fn()}
          t={(k) => k}
        />
      );

      const declineBtn = screen.getByRole('button', { name: /Décliner l'offre/i });
      expect(declineBtn).toBeInTheDocument();
      expect(declineBtn).toHaveTextContent(/Décliner l'offre/i);
    });
  });

  describe('5. Mentions obligatoires de paiement (PaymentModal.jsx & ChatView.jsx)', () => {
    test('PaymentModal contient les mentions légales d\'obligation de paiement (Art. L. 221-14)', () => {
      const filePath = path.resolve(__dirname, './PaymentModal.jsx');
      const content = fs.readFileSync(filePath, 'utf8');

      // Doit comporter la mention légale d'obligation de paiement
      expect(content).toContain('(obligation de paiement)');
      expect(content).toContain('(avec obligation de paiement)');
      expect(content).toContain('Confirmer le transfert et sceller le deal');
      expect(content).toContain('Valider l\'authentification et payer');
    });

    test('ChatView contient la validation explicite du transfert de jetons Troco', () => {
      const filePath = path.resolve(__dirname, './ChatView.jsx');
      const content = fs.readFileSync(filePath, 'utf8');

      expect(content).toContain('Confirmer le transfert de ${directTokensCount} Jetons Troco');
    });

    test('App.js ne contient plus de faux avis hardcodés pour Sofia M. et Marc L.', () => {
      const filePath = path.resolve(__dirname, '../App.js');
      const content = fs.readFileSync(filePath, 'utf8');

      expect(content).not.toContain('Très pédagogique et hyper réactif');
      expect(content).not.toContain('Très fiable pour les prêts et les dépannages');
    });
  });
});
