import React from 'react';
import { render, screen, act } from '@testing-library/react';
import OfflineBanner from './OfflineBanner';

describe('Phase 49 : OfflineBanner Component', () => {
  it('ne s\'affiche pas lorsque le réseau est actif', () => {
    const { container } = render(<OfflineBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('affiche la bannière rouge persistante en cas de perte de connexion', () => {
    render(<OfflineBanner />);

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    expect(screen.getByText('Connexion internet perdue. Mode hors-ligne.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /réessayer/i })).toBeInTheDocument();
  });
});
