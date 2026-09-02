import React from 'react';
import { render, screen } from '@testing-library/react';
import { EmptyState } from './EmptyState';

describe('Phase 48 : EmptyState Component', () => {
  it('affiche le titre, la description, l\'icône et le bouton d\'action', () => {
    render(
      <EmptyState
        icon={<span data-testid="empty-icon">💬</span>}
        title="Vous n'avez pas encore de conversation"
        description="Découvrez les annonces et échangez avec les membres !"
        action={<button data-testid="empty-action">Explorer les annonces</button>}
      />
    );

    expect(screen.getByText("Vous n'avez pas encore de conversation")).toBeInTheDocument();
    expect(screen.getByText("Découvrez les annonces et échangez avec les membres !")).toBeInTheDocument();
    expect(screen.getByTestId('empty-icon')).toBeInTheDocument();
    expect(screen.getByTestId('empty-action')).toBeInTheDocument();
  });

  it('prend en charge le mode compact', () => {
    const { container } = render(
      <EmptyState
        title="Aucun favori"
        description="Ajoutez des annonces en favoris."
        compact={true}
      />
    );

    expect(screen.getByText("Aucun favori")).toBeInTheDocument();
    expect(container.firstChild).toHaveClass('premium-empty-state');
  });
});
