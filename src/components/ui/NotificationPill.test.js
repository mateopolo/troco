import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { NotificationPill } from './NotificationPill';
import { notificationService, showDynamicIslandNotification } from '../../services/notificationService';

describe('Phase 55 : NotificationPill Component', () => {
  beforeEach(() => {
    notificationService.dismiss();
  });

  it('ne rend rien quand aucune notification n\'est active', () => {
    const { container } = render(<NotificationPill />);
    expect(container.querySelector('.dynamic-island-pill')).toBeNull();
  });

  it('affiche la pilule avec l\'avatar et le message tronqué lorsqu\'une alerte est émise', async () => {
    render(<NotificationPill />);

    act(() => {
      showDynamicIslandNotification({
        title: 'Lucas',
        message: 'Salut ! Ton offre pour le vélo est-elle toujours disponible ?',
        avatar: 'Lucas',
      });
    });

    expect(screen.getByText('Lucas')).toBeInTheDocument();
    expect(screen.getByText('Salut ! Ton offre pour le vélo est-elle toujours disponible ?')).toBeInTheDocument();
  });

  it('déclenche le callback onClick lors du clic sur la pilule', () => {
    const onClickMock = jest.fn();
    render(<NotificationPill />);

    act(() => {
      showDynamicIslandNotification({
        title: 'Deal confirmé',
        message: 'Transaction validée',
        onClick: onClickMock,
      });
    });

    const pill = screen.getByText('Deal confirmé').closest('.dynamic-island-pill');
    fireEvent.click(pill);

    expect(onClickMock).toHaveBeenCalledTimes(1);
  });
});
