import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ReviewsSection from './ReviewsSection';
import * as firestore from 'firebase/firestore';

// Mock Firestore functions
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => 'mock-collection'),
  query: jest.fn(() => 'mock-query'),
  orderBy: jest.fn(() => 'mock-order-by'),
  doc: jest.fn(() => 'mock-doc-ref'),
  updateDoc: jest.fn(() => Promise.resolve()),
  serverTimestamp: jest.fn(() => 'mock-server-timestamp'),
  onSnapshot: jest.fn((q, callback) => {
    return jest.fn();
  }),
}));

// Mock firebase module
jest.mock('../firebase', () => ({
  auth: { currentUser: { uid: 'user_123', displayName: 'Thomas Test' } },
  db: {},
}));

describe('ReviewsSection Component', () => {
  beforeEach(() => {
    firestore.doc.mockReturnValue('mock-doc-ref');
    firestore.serverTimestamp.mockReturnValue('mock-server-timestamp');
    firestore.updateDoc.mockResolvedValue();
    firestore.collection.mockReturnValue('mock-collection');
    firestore.query.mockReturnValue('mock-query');
    firestore.orderBy.mockReturnValue('mock-order-by');
    firestore.onSnapshot.mockReturnValue(jest.fn());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders "Avis et Évaluations" section title and empty state fallback', () => {
    // onSnapshot returns empty doc list
    firestore.onSnapshot.mockImplementation((q, callback) => {
      callback({ docs: [] });
      return jest.fn();
    });

    render(
      <ReviewsSection
        profileUid="user_target"
        ownerName="Alice"
        currentUser={{ uid: 'other_user' }}
      />
    );

    expect(screen.getByText(/Avis et Évaluations/i)).toBeInTheDocument();
    expect(screen.getByText("Cet utilisateur n'a pas encore reçu d'avis.")).toBeInTheDocument();
  });

  test('displays review cards with author, rating, date, and text', () => {
    firestore.onSnapshot.mockImplementation((q, callback) => {
      callback({
        docs: [
          {
            id: 'rev_1',
            data: () => ({
              author: 'Marc V.',
              rating: 5,
              timestamp: '12 févr. 2026',
              text: 'Super troc, ponctuel et arrangeant !',
            }),
          },
        ],
      });
      return jest.fn();
    });

    render(
      <ReviewsSection
        profileUid="user_target"
        ownerName="Alice"
        currentUser={{ uid: 'other_user' }}
      />
    );

    expect(screen.getByText('Marc V.')).toBeInTheDocument();
    expect(screen.getByText(/Super troc, ponctuel et arrangeant !/i)).toBeInTheDocument();
    expect(screen.getByText('5.0')).toBeInTheDocument();
  });

  test('only profile owner sees "Répondre" button when review has no reply', () => {
    firestore.onSnapshot.mockImplementation((q, callback) => {
      callback({
        docs: [
          {
            id: 'rev_1',
            data: () => ({
              author: 'Marc V.',
              rating: 5,
              timestamp: '12 févr. 2026',
              text: 'Super troc, ponctuel et arrangeant !',
            }),
          },
        ],
      });
      return jest.fn();
    });

    // 1. As non-owner
    const { unmount } = render(
      <ReviewsSection
        profileUid="user_owner_456"
        ownerName="Alice Owner"
        currentUser={{ uid: 'stranger_789' }}
      />
    );

    expect(screen.queryByText('Répondre')).not.toBeInTheDocument();
    unmount();

    // 2. As owner
    render(
      <ReviewsSection
        profileUid="user_owner_456"
        ownerName="Alice Owner"
        currentUser={{ uid: 'user_owner_456' }}
      />
    );

    const replyBtn = screen.getByText('Répondre');
    expect(replyBtn).toBeInTheDocument();
  });

  test('owner clicking "Répondre" opens textarea and sends updateDoc with serverTimestamp', async () => {
    firestore.onSnapshot.mockImplementation((q, callback) => {
      callback({
        docs: [
          {
            id: 'rev_1',
            data: () => ({
              author: 'Marc V.',
              rating: 5,
              text: 'Super troc, merci !',
            }),
          },
        ],
      });
      return jest.fn();
    });

    render(
      <ReviewsSection
        profileUid="user_owner_456"
        ownerName="Alice Owner"
        currentUser={{ uid: 'user_owner_456' }}
      />
    );

    const replyBtn = screen.getByText('Répondre');
    fireEvent.click(replyBtn);

    const textarea = screen.getByPlaceholderText(/Écrivez votre réponse publique/i);
    expect(textarea).toBeInTheDocument();

    fireEvent.change(textarea, { target: { value: 'Merci Marc avec grand plaisir !' } });

    const sendBtn = screen.getByText('Envoyer');
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(firestore.updateDoc).toHaveBeenCalledTimes(1);
    });

    expect(firestore.updateDoc).toHaveBeenCalledWith(
      'mock-doc-ref',
      expect.objectContaining({
        reply: expect.objectContaining({
          text: 'Merci Marc avec grand plaisir !',
        }),
      })
    );
  });

  test('displays nested reply when review has reply with "Réponse de [Nom du propriétaire]"', () => {
    firestore.onSnapshot.mockImplementation((q, callback) => {
      callback({
        docs: [
          {
            id: 'rev_2',
            data: () => ({
              author: 'Sophie L.',
              rating: 4.8,
              text: 'Matériel impeccable, bonne communication.',
              reply: {
                text: 'Merci Sophie pour ta gentillesse !',
                timestamp: '14 févr. 2026',
              },
            }),
          },
        ],
      });
      return jest.fn();
    });

    render(
      <ReviewsSection
        profileUid="user_owner_456"
        ownerName="Alice Owner"
        currentUser={{ uid: 'user_owner_456' }}
      />
    );

    // "Répondre" should not be visible because reply exists
    expect(screen.queryByText('Répondre')).not.toBeInTheDocument();

    // Nested reply header and text
    expect(screen.getByText(/Réponse de Alice Owner/i)).toBeInTheDocument();
    expect(screen.getByText('Merci Sophie pour ta gentillesse !')).toBeInTheDocument();
  });
});
