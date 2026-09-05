import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import TransactionSuccessModal from './TransactionSuccessModal';
import BalanceDisplay from './BalanceDisplay';
import { AppHeader } from './layout/AppHeader';
import { playBetclicBalanceSound, playApplePaySound } from '../utils/audioService';

jest.mock('../firebase', () => ({
  auth: {
    currentUser: { uid: 'user_123', email: 'user@troco.fr' },
  },
  db: { app: {} },
}));

jest.mock('firebase/firestore', () => ({
  getDoc: jest.fn(() => Promise.resolve({ exists: () => true, data: () => ({ trocoTokens: 25 }) })),
  setDoc: jest.fn(() => Promise.resolve({})),
  updateDoc: jest.fn(() => Promise.resolve({})),
  deleteDoc: jest.fn(() => Promise.resolve({})),
  addDoc: jest.fn(() => Promise.resolve({ id: 'mock_doc_id' })),
  onSnapshot: jest.fn(() => () => {}),
  doc: jest.fn((...args) => ({ id: args[args.length - 1] || 'mock_doc', path: args.slice(1).join('/') })),
  collection: jest.fn((...args) => ({ path: args.slice(1).join('/') })),
  query: jest.fn((col, ...args) => ({ col, args })),
  where: jest.fn(),
  orderBy: jest.fn(),
  getDocs: jest.fn(() => Promise.resolve({ empty: true, docs: [] })),
  runTransaction: jest.fn(),
  increment: jest.fn((val) => `increment(${val})`),
  serverTimestamp: jest.fn(() => 'MOCK_TIMESTAMP'),
}));

jest.mock('../utils/audioService', () => ({
  playBetclicBalanceSound: jest.fn(),
  playApplePaySound: jest.fn(),
  playSwooshSound: jest.fn(),
  playWelcomeGiftFanfare: jest.fn(),
}));

jest.mock('../utils/haptics', () => ({
  hapticLight: jest.fn(),
  hapticSuccess: jest.fn(),
  hapticError: jest.fn(),
}));

describe('PHASE 129 : UI de Succès de Transaction & Animation Betclic Flottante', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('1. Modale de succès plein écran (TransactionSuccessModal.jsx)', () => {
    test('Ne rend rien lorsque isOpen est false', () => {
      const { container } = render(
        <TransactionSuccessModal
          isOpen={false}
          type="sent"
          amount={5}
          currency="tokens"
          partnerName="Alice"
          onClose={jest.fn()}
        />
      );
      expect(container.firstChild).toBeNull();
    });

    test('Rend en mode "sent" (expéditeur) avec texte, montant en jetons, partenaire et feedback audio', () => {
      const handleClose = jest.fn();
      render(
        <TransactionSuccessModal
          isOpen={true}
          type="sent"
          amount={3}
          currency="tokens"
          partnerName="Benoit"
          onClose={handleClose}
        />
      );

      // Titre
      expect(screen.getByText('Transfert finalisé !')).toBeInTheDocument();
      // Résumé
      expect(screen.getByText(/Vous avez envoyé 3 jetons à Benoit/i)).toBeInTheDocument();
      // Tag débit
      expect(screen.getByText('Débit Confirmé')).toBeInTheDocument();

      // Audio expéditeur
      expect(playApplePaySound).toHaveBeenCalled();

      // Clic sur Fermer
      const closeBtn = screen.getByRole('button', { name: 'Fermer' });
      fireEvent.click(closeBtn);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    test('Rend en mode "received" (destinataire) avec texte, montant et son Betclic', () => {
      const handleClose = jest.fn();
      render(
        <TransactionSuccessModal
          isOpen={true}
          type="received"
          amount={10}
          currency="tokens"
          partnerName="Claire"
          onClose={handleClose}
        />
      );

      // Titre
      expect(screen.getByText('Paiement reçu !')).toBeInTheDocument();
      // Résumé
      expect(screen.getByText(/Vous avez reçu 10 jetons de Claire/i)).toBeInTheDocument();
      // Tag crédit
      expect(screen.getByText('Crédit Solde')).toBeInTheDocument();

      // Audio destinataire
      expect(playBetclicBalanceSound).toHaveBeenCalledWith(true);

      // Bouton fermeture icône
      const iconCloseBtn = screen.getByLabelText('Fermer la confirmation');
      fireEvent.click(iconCloseBtn);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    test('Prend en compte la devise Fiat (€)', () => {
      render(
        <TransactionSuccessModal
          isOpen={true}
          type="received"
          amount={45.5}
          currency="fiat"
          partnerName="David"
          onClose={jest.fn()}
        />
      );

      expect(screen.getByText(/Vous avez reçu 45.50 € de David/i)).toBeInTheDocument();
      expect(screen.getByText(/Euros Fiat/i)).toBeInTheDocument();
    });
  });

  describe('2. Animation du solde façon "Betclic" (BalanceDisplay & AppHeader)', () => {
    test('BalanceDisplay : déclenche l\'animation flottante (+X) lors d\'une augmentation de jetons puis disparaît après 2s', () => {
      const { rerender } = render(
        <BalanceDisplay
          euroBalance={50}
          trocoTokens={10}
          onOpenWallet={jest.fn()}
          onOpenTrocoPlus={jest.fn()}
        />
      );

      // Au premier rendu, aucun floating gain
      expect(screen.queryByText('+5')).not.toBeInTheDocument();

      // Augmentation des jetons de 10 à 15 (+5)
      rerender(
        <BalanceDisplay
          euroBalance={50}
          trocoTokens={15}
          onOpenWallet={jest.fn()}
          onOpenTrocoPlus={jest.fn()}
        />
      );

      // L'élément flottant doit être affiché avec la classe animate-float-up-fade
      const floatingElement = screen.getByText('+5');
      expect(floatingElement).toBeInTheDocument();
      expect(floatingElement.className).toContain('animate-float-up-fade');
      expect(floatingElement.className).toContain('text-green-500');

      // Après 2000ms, l'élément disparaît
      act(() => {
        jest.advanceTimersByTime(2000);
      });
      expect(screen.queryByText('+5')).not.toBeInTheDocument();
    });

    test('BalanceDisplay : ne déclenche pas d\'animation lors d\'une diminution de solde', () => {
      const { rerender } = render(
        <BalanceDisplay
          euroBalance={50}
          trocoTokens={20}
          onOpenWallet={jest.fn()}
          onOpenTrocoPlus={jest.fn()}
        />
      );

      // Débit de jetons (20 -> 15)
      rerender(
        <BalanceDisplay
          euroBalance={50}
          trocoTokens={15}
          onOpenWallet={jest.fn()}
          onOpenTrocoPlus={jest.fn()}
        />
      );

      // Aucun gain flottant ne doit apparaître
      expect(screen.queryByText(/-5/)).not.toBeInTheDocument();
      expect(screen.queryByText(/\+5/)).not.toBeInTheDocument();
    });

    test('AppHeader : déclenche l\'animation flottante façon Betclic au-dessus du solde de jetons', () => {
      const profile = { trocoTokens: 8, euroBalance: 25 };
      const { rerender } = render(
        <AppHeader
          profile={profile}
          darkMode={false}
          toggleDarkMode={jest.fn()}
        />
      );

      expect(screen.queryByText('+4')).not.toBeInTheDocument();

      // Crédit de 4 jetons (8 -> 12)
      rerender(
        <AppHeader
          profile={{ trocoTokens: 12, euroBalance: 25 }}
          darkMode={false}
          toggleDarkMode={jest.fn()}
        />
      );

      // Le texte flottant façon Betclic apparaît
      const floatingGain = screen.getByText('+4');
      expect(floatingGain).toBeInTheDocument();
      expect(floatingGain.className).toContain('animate-float-up-fade');
      expect(floatingGain.className).toContain('text-green-500');
      expect(playBetclicBalanceSound).toHaveBeenCalledWith(true);

      // Disparaît après 2 secondes
      act(() => {
        jest.advanceTimersByTime(2000);
      });
      expect(screen.queryByText('+4')).not.toBeInTheDocument();
    });

    test('AppHeader : déclenche l\'animation flottante au-dessus du solde d\'euros (+X€)', () => {
      const profile = { trocoTokens: 10, euroBalance: 30 };
      const { rerender } = render(
        <AppHeader
          profile={profile}
          darkMode={false}
          toggleDarkMode={jest.fn()}
        />
      );

      // Crédit de 20 euros (30 -> 50)
      rerender(
        <AppHeader
          profile={{ trocoTokens: 10, euroBalance: 50 }}
          darkMode={false}
          toggleDarkMode={jest.fn()}
        />
      );

      const floatingEuroGain = screen.getByText('+20€');
      expect(floatingEuroGain).toBeInTheDocument();
      expect(floatingEuroGain.className).toContain('animate-float-up-fade');

      act(() => {
        jest.advanceTimersByTime(2000);
      });
      expect(screen.queryByText('+20€')).not.toBeInTheDocument();
    });
  });

  describe('3. Déclenchement global des notifications et marquage lu dans Firestore', () => {
    test('Simule la réception d\'une notification payment_received et son marquage read: true à la fermeture', async () => {
      const { updateDoc, onSnapshot } = require('firebase/firestore');
      let capturedSnapshotCallback = null;

      onSnapshot.mockImplementation((q, cb) => {
        capturedSnapshotCallback = cb;
        return () => {};
      });

      function NotificationsHarness({ userUid = 'receiver_456' }) {
        const [config, setConfig] = React.useState({ isOpen: false, notificationId: null });

        React.useEffect(() => {
          const unsub = onSnapshot({}, (snapshot) => {
            if (!snapshot.empty) {
              snapshot.docChanges().forEach((change) => {
                const notifData = change.doc.data();
                if (notifData?.type === 'payment_received' && notifData.read === false) {
                  setConfig({
                    isOpen: true,
                    type: 'received',
                    amount: notifData.amount || 1,
                    currency: notifData.currency || 'tokens',
                    partnerName: notifData.senderName || 'Expéditeur',
                    notificationId: change.doc.id,
                  });
                }
              });
            }
          });
          return () => unsub();
        }, [userUid]);

        const handleClose = async () => {
          if (config.notificationId) {
            await updateDoc({ id: config.notificationId }, { read: true });
          }
          setConfig(prev => ({ ...prev, isOpen: false }));
        };

        return (
          <TransactionSuccessModal
            isOpen={config.isOpen}
            type={config.type}
            amount={config.amount}
            currency={config.currency}
            partnerName={config.partnerName}
            onClose={handleClose}
          />
        );
      }

      render(<NotificationsHarness />);

      // Simule l'arrivée d'une notification payment_received
      act(() => {
        capturedSnapshotCallback({
          empty: false,
          docChanges: () => [
            {
              type: 'added',
              doc: {
                id: 'notif_999',
                data: () => ({
                  type: 'payment_received',
                  amount: 7,
                  currency: 'tokens',
                  senderName: 'Sophie',
                  read: false,
                }),
              },
            },
          ],
        });
      });

      // La modale s'ouvre automatiquement en mode received
      expect(screen.getByText('Paiement reçu !')).toBeInTheDocument();
      expect(screen.getByText(/Vous avez reçu 7 jetons de Sophie/i)).toBeInTheDocument();

      // Fermeture de la modale
      const closeButton = screen.getByRole('button', { name: 'Fermer' });
      await act(async () => {
        fireEvent.click(closeButton);
      });

      // Vérifie que updateDoc a été appelé avec read: true
      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ read: true })
      );

      // La modale est maintenant fermée
      expect(screen.queryByText('Paiement reçu !')).not.toBeInTheDocument();
    });
  });
});
