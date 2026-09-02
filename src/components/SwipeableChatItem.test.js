import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SwipeableChatItem } from './SwipeableChatItem';

describe('Phase 53 : SwipeableChatItem Component', () => {
  const dummyChat = { id: 101, user: 'Lucas', listing: 'Vélo de route' };

  it('rend les enfants et les boutons d\'action épingler et supprimer', () => {
    render(
      <SwipeableChatItem
        chat={dummyChat}
        isPinned={false}
        onTogglePin={jest.fn()}
        onDelete={jest.fn()}
      >
        <div data-testid="chat-inner">Lucas - Vélo</div>
      </SwipeableChatItem>
    );

    expect(screen.getByTestId('chat-inner')).toBeInTheDocument();
    expect(screen.getByText('Épingler')).toBeInTheDocument();
    expect(screen.getByText('Supprimer')).toBeInTheDocument();
  });

  it('appelle onTogglePin lors du clic sur le bouton épingler', () => {
    const onTogglePinMock = jest.fn();
    render(
      <SwipeableChatItem
        chat={dummyChat}
        isPinned={false}
        onTogglePin={onTogglePinMock}
        onDelete={jest.fn()}
      >
        <div>Contenu</div>
      </SwipeableChatItem>
    );

    const pinBtn = screen.getByText('Épingler');
    fireEvent.click(pinBtn);
    expect(onTogglePinMock).toHaveBeenCalledWith(dummyChat);
  });
});
