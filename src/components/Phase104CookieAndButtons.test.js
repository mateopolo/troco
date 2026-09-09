import React from 'react';
import { render, screen, act } from '@testing-library/react';
import CookieBanner from './CookieBanner';

describe('PHASE 104 : Reformatage Bannière Cookies (Modale Flottante Compacte Photo 2)', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('CookieBanner renders compact centered floating card and pill buttons', () => {
    render(<CookieBanner onOpenPrivacyCenter={jest.fn()} />);

    act(() => {
      jest.advanceTimersByTime(1500);
    });

    const banner = document.body.querySelector('#troco-cookie-banner');
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveStyle({
      position: 'fixed',
      bottom: '86px',
      borderRadius: '24px',
    });

    const acceptBtn = screen.getByText('Tout accepter');
    expect(acceptBtn).toBeInTheDocument();

    const declineBtn = screen.getByText('Continuer sans accepter');
    expect(declineBtn).toBeInTheDocument();
  });
});
