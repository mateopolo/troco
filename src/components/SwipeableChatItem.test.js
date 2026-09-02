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

  it('demande confirmation avant de supprimer la conversation', () => {
    jest.useFakeTimers();
    const onDeleteMock = jest.fn();
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <SwipeableChatItem
        chat={dummyChat}
        isPinned={false}
        onTogglePin={jest.fn()}
        onDelete={onDeleteMock}
      >
        <div>Contenu</div>
      </SwipeableChatItem>
    );

    const deleteBtn = screen.getByText('Supprimer');
    fireEvent.click(deleteBtn);

    expect(confirmSpy).toHaveBeenCalledWith(
      "Êtes-vous sûr de vouloir supprimer définitivement cette discussion ? L'historique sera perdu pour vous."
    );

    jest.advanceTimersByTime(200);
    expect(onDeleteMock).toHaveBeenCalledWith(dummyChat);

    confirmSpy.mockRestore();
    jest.useRealTimers();
  });

  it('n\'appelle pas onDelete si l\'utilisateur annule la confirmation', () => {
    const onDeleteMock = jest.fn();
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);

    render(
      <SwipeableChatItem
        chat={dummyChat}
        isPinned={false}
        onTogglePin={jest.fn()}
        onDelete={onDeleteMock}
      >
        <div>Contenu</div>
      </SwipeableChatItem>
    );

    const deleteBtn = screen.getByText('Supprimer');
    fireEvent.click(deleteBtn);

    expect(confirmSpy).toHaveBeenCalled();
    expect(onDeleteMock).not.toHaveBeenCalled();

    confirmSpy.mockRestore();
  });
});
