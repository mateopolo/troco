import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import CookieBanner from './CookieBanner';

describe('Phase 130 : Restauration Exacte de la Bannière Cookies (Commit e8869bd / Photo 2) & Portal', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('1. CookieBanner se monte dans document.body via createPortal avec z-[9999999]', () => {
    render(<CookieBanner onOpenPrivacyCenter={jest.fn()} />);

    act(() => {
      jest.advanceTimersByTime(1200);
    });

    const banner = document.body.querySelector('#troco-cookie-banner');
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveStyle({
      position: 'fixed',
      bottom: '86px',
      maxWidth: '640px',
      zIndex: 9999999,
    });
  });

  test('2. La carte flottante respecte l\'esthétique e8869bd (badge bouclier, coins arrondis 24px)', () => {
    render(<CookieBanner onOpenPrivacyCenter={jest.fn()} />);

    act(() => {
      jest.advanceTimersByTime(1200);
    });

    const banner = document.body.querySelector('#troco-cookie-banner');
    expect(banner).toHaveStyle({
      borderRadius: '24px',
      padding: '18px 22px',
    });

    // Titre et description
    expect(screen.getByText(/Respect de votre vie privée & Cookies/i)).toBeInTheDocument();
    expect(screen.getByText(/Troco utilise des traceurs nécessaires au bon fonctionnement/i)).toBeInTheDocument();
  });

  test('3. Les 3 boutons pilules sont conformes à la Photo 2 (Tout accepter, Continuer sans accepter, Personnaliser)', () => {
    render(<CookieBanner onOpenPrivacyCenter={jest.fn()} />);

    act(() => {
      jest.advanceTimersByTime(1200);
    });

    const acceptBtn = screen.getByText('Tout accepter');
    expect(acceptBtn).toBeInTheDocument();

    const declineBtn = screen.getByText('Continuer sans accepter');
    expect(declineBtn).toBeInTheDocument();

    const customizeBtn = screen.getByRole('button', { name: /personnaliser/i });
    expect(customizeBtn).toBeInTheDocument();
  });

  test('4. Clic sur Tout accepter enregistre le consentement et ferme la bannière', () => {
    render(<CookieBanner onOpenPrivacyCenter={jest.fn()} />);

    act(() => {
      jest.advanceTimersByTime(1200);
    });

    const acceptBtn = screen.getByText('Tout accepter');
    fireEvent.click(acceptBtn);

    expect(localStorage.getItem('troco_cookie_consent')).toBe('accepted');
    expect(screen.queryByText('Tout accepter')).not.toBeInTheDocument();
  });

  test('5. Clic sur Continuer sans accepter enregistre le refus et ferme la bannière', () => {
    render(<CookieBanner onOpenPrivacyCenter={jest.fn()} />);

    act(() => {
      jest.advanceTimersByTime(1200);
    });

    const declineBtn = screen.getByText('Continuer sans accepter');
    fireEvent.click(declineBtn);

    expect(localStorage.getItem('troco_cookie_consent')).toBe('declined');
    expect(screen.queryByText('Continuer sans accepter')).not.toBeInTheDocument();
  });
});
