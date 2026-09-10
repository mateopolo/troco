import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DealMessageCard from './DealMessageCard';
import DealRatingModal from './DealRatingModal';
import * as firestore from 'firebase/firestore';

// Mock audio & haptics
jest.mock('../services/audioService', () => ({
  playPop: jest.fn(),
  playSwoosh: jest.fn(),
  playSuccessChime: jest.fn(),
}));

jest.mock('../utils/haptics', () => ({
  hapticSuccess: jest.fn(),
  hapticLight: jest.fn(),
  hapticError: jest.fn(),
}));

// Mock Firestore
jest.mock('../firebase', () => ({
  db: {},
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => 'mock-collection'),
  doc: jest.fn(() => 'mock-doc'),
  addDoc: jest.fn(() => Promise.resolve({ id: 'new-review-id' })),
  updateDoc: jest.fn(() => Promise.resolve()),
  increment: jest.fn((n) => n),
  serverTimestamp: jest.fn(() => 'mock-timestamp'),
}));

describe('Phase 4: Moteur de Deal « Cinématique »', () => {
  const baseTerms = {
    title: 'Développement Web React & Tailwind',
    conditions: 'Création d’un site vitrine complet en échange d’un logo',
    tokens: 0,
    fiatAmount: 0,
    hours: 5,
  };

  describe('1. Workflow conversationnel de négociation (DealMessageCard)', () => {
    test('affiche les boutons natifs "Accepter", "Contre-offre" et "Refuser" pour le destinataire', () => {
      const mockAccept = jest.fn();
      const mockCounter = jest.fn();
      const mockDecline = jest.fn();

      render(
        <DealMessageCard
          messageId="msg-101"
          terms={baseTerms}
          status="pending"
          isSender={false}
          isRecipient={true}
          partnerName="Alice"
          onAcceptDeal={mockAccept}
          onOpenCounterOffer={mockCounter}
          onDeclineDeal={mockDecline}
        />
      );

      // Verify title & badges
      expect(screen.getByText('Développement Web React & Tailwind')).toBeInTheDocument();
      expect(screen.getByText('🤝 Troc direct / Service')).toBeInTheDocument();

      // Check the 3 buttons
      const acceptBtn = screen.getByRole('button', { name: /Accepter et sceller le deal/i });
      const counterBtn = screen.getByRole('button', { name: /Faire une contre-offre/i });
      const declineBtn = screen.getByRole('button', { name: /Décliner l'offre/i });

      expect(acceptBtn).toBeInTheDocument();
      expect(counterBtn).toBeInTheDocument();
      expect(declineBtn).toBeInTheDocument();

      // Interactions
      fireEvent.click(acceptBtn);
      expect(mockAccept).toHaveBeenCalledWith('msg-101', baseTerms);

      fireEvent.click(counterBtn);
      expect(mockCounter).toHaveBeenCalledWith(baseTerms, 'msg-101');

      fireEvent.click(declineBtn);
      expect(mockDecline).toHaveBeenCalledWith('msg-101');
    });

    test('affiche un statut d\'attente désactivé pour l\'expéditeur du deal', () => {
      render(
        <DealMessageCard
          messageId="msg-102"
          terms={baseTerms}
          status="pending"
          isSender={true}
          isRecipient={false}
          partnerName="Bob"
        />
      );

      expect(screen.getByText(/En attente de la réponse de Bob/i)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Accepter la proposition/i })).not.toBeInTheDocument();
    });
  });

  describe('2. Double validation de Troc sans monnaie (1/2 et 2/2)', () => {
    test('permet la première validation bilatérale quand le troc est en cours', () => {
      const mockConfirm = jest.fn();

      render(
        <DealMessageCard
          messageId="deal-troc-1"
          terms={baseTerms}
          status="troc_in_progress"
          currentUid="user-alice"
          completionConfirmations={{}}
          partnerName="Bob"
          onConfirmTrocCompletion={mockConfirm}
        />
      );

      expect(screen.getByText(/Troc en cours : 0\/2 validations/i)).toBeInTheDocument();
      expect(screen.getByText(/Pour sceller ce troc sans monnaie/i)).toBeInTheDocument();

      const finishBtn = screen.getByRole('button', { name: /Prestation terminée/i });
      expect(finishBtn).toBeInTheDocument();

      fireEvent.click(finishBtn);
      expect(mockConfirm).toHaveBeenCalledWith('deal-troc-1');
    });

    test('affiche l\'état d\'attente quand l\'utilisateur connecté a déjà validé sa part', () => {
      render(
        <DealMessageCard
          messageId="deal-troc-2"
          terms={baseTerms}
          status="troc_in_progress"
          currentUid="user-alice"
          completionConfirmations={{ 'user-alice': true }}
          partnerName="Bob"
        />
      );

      expect(screen.getByText(/Troc en cours : 1\/2 validations/i)).toBeInTheDocument();
      expect(screen.getByText(/Vous avez certifié la prestation/i)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Prestation terminée/i })).not.toBeInTheDocument();
    });
  });

  describe('3. Gamification de clôture et modale d\'évaluation (DealRatingModal)', () => {
    beforeEach(() => {
      firestore.collection.mockReturnValue('mock-collection');
      firestore.doc.mockReturnValue('mock-doc');
      firestore.addDoc.mockResolvedValue({ id: 'new-review-id' });
      firestore.updateDoc.mockResolvedValue();
    });

    test('permet de noter 5 étoiles, sélectionner des tags de compliment et soumettre un avis vérifié', async () => {
      const mockClose = jest.fn();
      const mockSubmitted = jest.fn();

      render(
        <DealRatingModal
          isOpen={true}
          onClose={mockClose}
          partnerName="Marie"
          partnerUid="user-marie-99"
          dealId="deal-456"
          serviceTitle="Cours de piano Jazz"
          currentUser={{ uid: 'user-lucas', name: 'Lucas P.' }}
          onReviewSubmitted={mockSubmitted}
        />
      );

      // Verify modal elements
      expect(screen.getByText(/Comment s'est passé votre échange \?/i)).toBeInTheDocument();
      expect(screen.getByText(/Évaluez votre expérience avec/i)).toBeInTheDocument();
      expect(screen.getByText(/Cours de piano Jazz/i)).toBeInTheDocument();

      // Toggle tags
      const tagPunctual = screen.getByText('Ponctuel ⏰');
      const tagNeat = screen.getByText('Service soigné ✨');
      fireEvent.click(tagPunctual);
      fireEvent.click(tagNeat);

      // Fill in comment
      const textarea = screen.getByLabelText(/Commentaire d'évaluation du deal/i);
      fireEvent.change(textarea, { target: { value: 'Super échange ! Très pédagogue et agréable.' } });

      // Click submit
      const submitBtn = screen.getByRole('button', { name: /Publier/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(firestore.addDoc).toHaveBeenCalled();
        expect(firestore.updateDoc).toHaveBeenCalled();
      });

      // Checks payload
      expect(firestore.addDoc).toHaveBeenCalledWith(
        'mock-collection',
        expect.objectContaining({
          author: 'Lucas P.',
          authorUid: 'user-lucas',
          rating: 5,
          comment: 'Super échange ! Très pédagogue et agréable.',
          tags: expect.arrayContaining(['Ponctuel ⏰', 'Service soigné ✨']),
          verifiedDeal: true,
          serviceTitle: 'Cours de piano Jazz',
        })
      );

      // Success view
      expect(await screen.findByText(/Merci pour votre (évaluation|avis)/i)).toBeInTheDocument();
    });

    test('affiche le bouton "Évaluer l\'échange" une fois le deal validé sur la carte', () => {
      const mockOpenRating = jest.fn();

      render(
        <DealMessageCard
          messageId="deal-confirmed-1"
          terms={baseTerms}
          status="confirmed"
          isSender={false}
          partnerName="David"
          onOpenRatingModal={mockOpenRating}
        />
      );

      expect(screen.getByText(/✓ Deal accepté et validé/i)).toBeInTheDocument();
      const rateBtn = screen.getByRole('button', { name: /Évaluer l'échange/i });
      expect(rateBtn).toBeInTheDocument();

      fireEvent.click(rateBtn);
      expect(mockOpenRating).toHaveBeenCalledWith(
        expect.objectContaining({
          dealId: 'deal-confirmed-1',
          partnerName: 'David',
        })
      );
    });
  });
});
