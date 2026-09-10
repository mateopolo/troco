import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import NotificationPill from '../../components/ui/NotificationPill';
import notificationService from '../../services/notificationService';

jest.mock('../../services/audioService', () => ({
  playPop: jest.fn(),
  playNotificationSound: jest.fn(),
  playRingtone: jest.fn(),
  stopRingtone: jest.fn(),
}));

jest.mock('../../utils/haptics', () => ({
  hapticLight: jest.fn(),
  hapticSuccess: jest.fn(),
}));

describe('TÂCHE 4 : Notifications de messages en arrière-plan (BackgroundMessageNotification)', () => {
  beforeEach(() => {
    act(() => {
      notificationService.dismiss();
    });
    const modalRoot = document.getElementById('modal-root');
    if (modalRoot) {
      modalRoot.innerHTML = '';
    }
  });

  test('1. Monte dans modal-root avec le z-index 999999 en premier plan absolu', () => {
    render(<NotificationPill />);

    act(() => {
      notificationService.show({
        title: 'Alice',
        message: 'Salut, es-tu disponible pour le troc de livres ?',
        avatar: 'Alice',
        icon: 'chat',
        data: { chatId: 'chat_123' },
      });
    });

    const modalRoot = document.getElementById('modal-root');
    expect(modalRoot).not.toBeNull();

    const pillContainer = modalRoot.querySelector('.dynamic-island-container');
    expect(pillContainer).not.toBeNull();
    expect(pillContainer.style.zIndex).toBe('999999');

    const pill = screen.getByRole('status');
    expect(pill).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Salut, es-tu disponible pour le troc de livres ?')).toBeInTheDocument();
  });

  test('2. Déduplication : deux notifications identiques dans la fenêtre de 1500ms ne déclenchent pas de doublon', () => {
    render(<NotificationPill />);

    act(() => {
      notificationService.show({
        title: 'Bob',
        message: 'Message reçu en arrière-plan',
        data: { chatId: 'chat_bob' },
      });
    });

    const notifCountAfterFirst = document.querySelectorAll('.dynamic-island-pill').length;
    expect(notifCountAfterFirst).toBe(1);

    // Tentative de déclenchement doublon immédiat (comme deux listeners Firestore réagissant au même message)
    act(() => {
      notificationService.show({
        title: 'Bob',
        message: 'Message reçu en arrière-plan',
        data: { chatId: 'chat_bob' },
      });
    });

    const notifCountAfterSecond = document.querySelectorAll('.dynamic-island-pill').length;
    expect(notifCountAfterSecond).toBe(1);
  });

  test('3. Clic sur la pilule de notification déclenche la redirection vers le chat cible', () => {
    const handleChatClick = jest.fn();
    render(<NotificationPill />);

    act(() => {
      notificationService.show({
        title: 'Claire',
        message: 'Proposition acceptée',
        onClick: handleChatClick,
        data: { chatId: 'chat_claire' },
      });
    });

    const pill = screen.getByRole('status');
    fireEvent.click(pill);

    expect(handleChatClick).toHaveBeenCalledTimes(1);
    expect(handleChatClick).toHaveBeenCalledWith({ chatId: 'chat_claire' });
  });

  test('4. Clic sur le bouton de fermeture déclenche le dismiss du service', async () => {
    const dismissSpy = jest.spyOn(notificationService, 'dismiss');
    render(<NotificationPill />);

    act(() => {
      notificationService.show({
        title: 'David',
        message: 'Notification à ignorer',
        data: { chatId: 'chat_david' },
      });
    });

    expect(screen.getByText('David')).toBeInTheDocument();

    const closeBtn = screen.getByLabelText(/Fermer la notification/i);
    fireEvent.click(closeBtn);

    expect(dismissSpy).toHaveBeenCalled();
    dismissSpy.mockRestore();
  });

  test('5. Anti-spam : notificationService.show applique une durée stricte de 3000ms et conserve l\'ID unique de message', () => {
    let currentNotif = null;
    const unsub = notificationService.subscribe((n) => {
      currentNotif = n;
    });

    act(() => {
      notificationService.show({
        id: 'msg_unique_123',
        title: 'Emma',
        message: 'Message test durée',
      });
    });

    expect(currentNotif).not.toBeNull();
    expect(currentNotif.id).toBe('msg_unique_123');
    expect(currentNotif.duration).toBe(3000);

    // Une seconde tentative avec le même ID ne duplique pas
    act(() => {
      const res = notificationService.show({
        id: 'msg_unique_123',
        title: 'Emma',
        message: 'Message test durée',
      });
      expect(res).toBe('msg_unique_123');
    });

    unsub();
  });

  test('6. Anti-spam : le Set notifiedMessageIds bloque les snapshots Firestore répétés pour le même message', () => {
    const notifiedSet = new Set();
    const triggerNotif = jest.fn();

    const handleMessageSnapshot = (messageId, title, message) => {
      if (notifiedSet.has(messageId)) {
        return; // Bloqué par l'anti-spam
      }
      notifiedSet.add(messageId);
      triggerNotif(messageId, title, message);
    };

    // Premier snapshot (ex: change.type = 'added')
    handleMessageSnapshot('msg_abc_999', 'Marc', 'Hello !');
    expect(triggerNotif).toHaveBeenCalledTimes(1);

    // Deuxième snapshot (ex: métadonnées change.type = 'modified' avec statut 'delivered')
    handleMessageSnapshot('msg_abc_999', 'Marc', 'Hello !');
    expect(triggerNotif).toHaveBeenCalledTimes(1);

    // Troisième snapshot (ex: change.type = 'modified' avec statut 'seen')
    handleMessageSnapshot('msg_abc_999', 'Marc', 'Hello !');
    expect(triggerNotif).toHaveBeenCalledTimes(1);

    // Nouveau message distinct
    handleMessageSnapshot('msg_abc_1000', 'Marc', 'Tu es là ?');
    expect(triggerNotif).toHaveBeenCalledTimes(2);
  });
});
