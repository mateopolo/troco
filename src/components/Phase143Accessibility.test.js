import React from 'react';
import fs from 'fs';
import path from 'path';
import { render, screen, fireEvent, act } from '@testing-library/react';
import ListingCard from './ListingCard';
import ListingDetailModal from './ListingDetailModal';
import { NotificationPill } from './ui/NotificationPill';
import WhiteboardLobby from './WhiteboardLobby';
import ChatInputBar from './chat/ChatInputBar';
import VoiceNoteRecorder from './VoiceNoteRecorder';
import notificationService from '../services/notificationService';
import { onSnapshot } from 'firebase/firestore';

beforeAll(() => {
  global.IntersectionObserver = class {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

jest.mock('../firebase', () => ({
  db: {},
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  onSnapshot: jest.fn(),
}));

describe('TÂCHE 3 : Conformité Accessibilité (a11y), Clavier, Focus & Contrastes WCAG', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Vérification des tokens CSS & Focus Rings (index.css)', () => {
    const cssPath = path.resolve(__dirname, '../index.css');
    const cssContent = fs.readFileSync(cssPath, 'utf8');

    test('contient la règle :focus-visible avec contour haute visibilité', () => {
      expect(cssContent).toContain(':focus-visible');
      expect(cssContent).toMatch(/outline:\s*2\.5px solid/);
      expect(cssContent).toMatch(/outline-offset:\s*2px/);
    });

    test('contient l adaptation du contour de focus pour le mode sombre', () => {
      expect(cssContent).toMatch(/\.dark\s+:focus-visible|\[data-theme=["']dark["']\]\s+:focus-visible/);
      expect(cssContent).toContain('#D4A373');
    });

    test('contient la classe utilitaire .sr-only pour les lecteurs d écran', () => {
      expect(cssContent).toContain('.sr-only');
      expect(cssContent).toContain('position: absolute');
      expect(cssContent).toContain('clip: rect(0, 0, 0, 0)');
    });

    test('respecte prefers-reduced-motion pour l accessibilité cognitive et vestibulaire', () => {
      expect(cssContent).toContain('@media (prefers-reduced-motion: reduce)');
      expect(cssContent).toContain('animation-duration: 0.01ms');
    });

    test('utilise des contrastes de texte conformes WCAG AA', () => {
      // --text-secondary ajusté à #565A4A (> 5.5:1 sur #FAF7F2)
      expect(cssContent).toContain('--text-secondary: #565A4A');
      // --text-muted ajusté à #737563 (> 4:1 sur #FAF7F2)
      expect(cssContent).toContain('--text-muted: #737563');
    });
  });

  describe('2. ListingCard : Navigation Clavier & Attributs a11y', () => {
    const mockItem = {
      id: 'item-101',
      title: 'Perceuse à percussion sans fil',
      description: 'Outil de bricolage en excellent état',
      category: 'Bricolage',
      location: 'Paris 11e',
      gallery: [
        'https://images.unsplash.com/photo-1504148455328-c376907d081c',
        'https://images.unsplash.com/photo-1572981779307-38b8cabb2407',
      ],
      user: {
        name: 'Sophie Martin',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330',
      },
    };

    test('le conteneur de la carte est focalisable (tabIndex=0) et a le rôle button', () => {
      const handleOpen = jest.fn();
      render(
        <ListingCard
          item={mockItem}
          handleOpenListing={handleOpen}
        />
      );

      const card = screen.getByRole('button', {
        name: /Annonce : Perceuse à percussion sans fil/i,
      });
      expect(card).toBeInTheDocument();
      expect(card).toHaveAttribute('tabIndex', '0');
    });

    test('active l ouverture de l annonce sur la touche Enter au clavier', () => {
      const handleOpen = jest.fn();
      render(
        <ListingCard
          item={mockItem}
          handleOpenListing={handleOpen}
        />
      );

      const card = screen.getByRole('button', {
        name: /Annonce : Perceuse à percussion sans fil/i,
      });
      fireEvent.keyDown(card, { key: 'Enter' });
      expect(handleOpen).toHaveBeenCalledWith(mockItem);
    });

    test('active l ouverture de l annonce sur la touche Espace au clavier', () => {
      const handleOpen = jest.fn();
      render(
        <ListingCard
          item={mockItem}
          handleOpenListing={handleOpen}
        />
      );

      const card = screen.getByRole('button', {
        name: /Annonce : Perceuse à percussion sans fil/i,
      });
      fireEvent.keyDown(card, { key: ' ' });
      expect(handleOpen).toHaveBeenCalledWith(mockItem);
    });

    test('les images ont un attribut alt descriptif et non vide', () => {
      render(
        <ListingCard
          item={mockItem}
        />
      );

      const img = screen.getByAltText(/Perceuse à percussion sans fil - Photo 1/i);
      expect(img).toBeInTheDocument();
      expect(img.getAttribute('alt')).not.toBe('');
      expect(img.getAttribute('alt')).not.toMatch(/^(aperçu|preview|image|img)$/i);
    });
  });

  describe('3. ListingDetailModal : Accessibilité & Navigation complète', () => {
    const mockListing = {
      id: 'modal-listing-1',
      title: 'Vélo de ville vintage Peugeot',
      description: 'Superbe vélo révisé prêt à rouler',
      location: 'Lyon Croix-Rousse',
      price: 0,
      exchangeWith: 'Guitare acoustique',
      images: [
        'https://images.unsplash.com/photo-1485965120184-e220f721d03e',
        'https://images.unsplash.com/photo-1532298229144-0ec0c57515c7',
      ],
      user: {
        name: 'Alexandre B.',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde',
      },
    };

    test('le bouton de fermeture possède un aria-label explicite', () => {
      const handleClose = jest.fn();
      render(
        <ListingDetailModal
          selectedListing={mockListing}
          onClose={handleClose}
          currentLang="FR"
          t={(k) => k}
        />
      );

      const closeBtn = screen.getByLabelText(/Fermer les détails de l'annonce/i);
      expect(closeBtn).toBeInTheDocument();
      fireEvent.click(closeBtn);
      expect(handleClose).toHaveBeenCalled();
    });

    test('la galerie photo dispose de chevrons et d indicateurs accessibles', () => {
      render(
        <ListingDetailModal
          selectedListing={mockListing}
          onClose={jest.fn()}
          currentLang="FR"
          t={(k) => k}
        />
      );

      expect(screen.getByLabelText(/Photo précédente/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Photo suivante/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Afficher la photo 1/i)).toBeInTheDocument();
    });
  });

  describe('4. NotificationPill : Accessibilité du bandeau dynamique', () => {
    afterEach(() => {
      act(() => {
        notificationService.dismiss();
      });
    });

    test('affiche une notification avec role status et un bouton de fermeture accessible', () => {
      render(<NotificationPill />);

      act(() => {
        notificationService.show({
          id: 'test-notif-1',
          title: 'Nouvelle proposition',
          message: 'Lucas souhaite troquer son appareil photo',
        });
      });

      const pill = screen.getByRole('status');
      expect(pill).toBeInTheDocument();
      expect(pill).toHaveAttribute('aria-live', 'polite');

      const closeBtn = screen.getByLabelText(/Fermer la notification/i);
      expect(closeBtn).toBeInTheDocument();
    });
  });

  describe('5. WhiteboardLobby : Cartes de tableau blanc accessibles', () => {
    beforeEach(() => {
      onSnapshot.mockImplementation((q, callback) => {
        callback({
          forEach: (fn) => {
            fn({
              id: 'wb-test-1',
              data: () => ({
                id: 'wb-test-1',
                workspaceId: 'wb-test-1',
                title: 'Atelier Wireframing Application',
                versionNumber: 2,
                updatedAt: { toMillis: () => Date.now() },
                thumbnailBase64: 'https://images.unsplash.com/photo-1581291518655-9523c932edcf',
                lastModifiedByName: 'Marc',
              }),
            });
          },
        });
        return jest.fn();
      });
    });

    test('la carte de tableau possède role="button", tabIndex=0 et aria-label descriptif', async () => {
      const handleSelect = jest.fn();
      render(
        <WhiteboardLobby
          chatId="chat-accessibility-test"
          onSelectBoard={handleSelect}
          onClose={jest.fn()}
        />
      );

      const boardCard = await screen.findByRole('button', {
        name: /Ouvrir le tableau blanc : Atelier Wireframing Application/i,
      });
      expect(boardCard).toBeInTheDocument();
      expect(boardCard).toHaveAttribute('tabIndex', '0');

      // Test déclenchement touche Entrée
      fireEvent.keyDown(boardCard, { key: 'Enter' });
      expect(handleSelect).toHaveBeenCalled();
    });

    test('l image d aperçu possède un texte alt descriptif', async () => {
      render(
        <WhiteboardLobby
          chatId="chat-accessibility-test"
          onSelectBoard={jest.fn()}
          onClose={jest.fn()}
        />
      );

      const previewImg = await screen.findByAltText(/Aperçu du tableau blanc : Atelier Wireframing Application/i);
      expect(previewImg).toBeInTheDocument();
    });
  });

  describe('6. ChatInputBar & VoiceNoteRecorder : Boutons d action avec aria-label', () => {
    test('ChatInputBar fournit des aria-labels sur tous les boutons d action sans texte visible', () => {
      render(
        <ChatInputBar
          inputText=""
          onSendMessage={jest.fn()}
          onStartVoiceRecord={jest.fn()}
          onOpenDirectTransfer={jest.fn()}
          t={(k) => k}
        />
      );

      expect(screen.getByLabelText(/Ouvrir le menu des outils collaboratifs Workspace/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Joindre un fichier audio/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Envoyer une photo ou une image/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Transférer des Jetons Troco instantanément/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Enregistrer une note vocale/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Envoyer le message/i)).toBeInTheDocument();
    });

    test('VoiceNoteRecorder fournit des aria-labels sur les boutons de contrôle vocal', () => {
      render(
        <VoiceNoteRecorder
          onSendVoiceNote={jest.fn()}
          onCancel={jest.fn()}
        />
      );

      expect(screen.getByLabelText(/Arrêter l'enregistrement et réécouter/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Supprimer la note vocale et annuler/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Envoyer la note vocale/i)).toBeInTheDocument();
    });
  });
});
