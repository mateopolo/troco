import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { PullToRefresh } from './PullToRefresh';

describe('Phase 51 : PullToRefresh Component', () => {
  it('rend les enfants et le conteneur de capture correctement', () => {
    render(
      <PullToRefresh onRefresh={jest.fn()}>
        <div data-testid="feed-content">Contenu du Feed</div>
      </PullToRefresh>
    );

    expect(screen.getByTestId('feed-content')).toBeInTheDocument();
  });

  it('déclenche onRefresh lors d\'un geste de tirage complet au-delà du seuil', async () => {
    const onRefreshMock = jest.fn().mockResolvedValue(true);
    const { container } = render(
      <PullToRefresh onRefresh={onRefreshMock} threshold={50}>
        <div>Contenu</div>
      </PullToRefresh>
    );

    const pullContainer = container.querySelector('.pull-to-refresh-container');
    expect(pullContainer).toBeInTheDocument();

    // Simuler le geste touch
    fireEvent.touchStart(pullContainer, {
      touches: [{ clientY: 100 }],
    });

    fireEvent.touchMove(pullContainer, {
      touches: [{ clientY: 400 }], // Tirage suffisant pour dépasser le seuil avec amorti
    });

    await act(async () => {
      fireEvent.touchEnd(pullContainer);
    });

    expect(onRefreshMock).toHaveBeenCalledTimes(1);
  });
});
