import React from 'react';
import { render, screen, act } from '@testing-library/react';
import CookieBanner from './CookieBanner';

describe('PHASE 104 : Centrage Global & Reformatage Bannière Cookies (Modale Flottante Compacte)', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('CookieBanner renders compact centered floating modal and single-line flexbox buttons', () => {
    render(<CookieBanner onOpenPrivacyCenter={jest.fn()} />);

    act(() => {
      jest.advanceTimersByTime(1500);
    });

    const overlay = document.body.querySelector('.fixed.inset-0');
    expect(overlay).toBeInTheDocument();

    const card = document.body.querySelector('.relative.w-full.max-w-lg');
    expect(card).toBeInTheDocument();
    expect(card).toHaveClass('rounded-3xl', 'shadow-2xl', 'flex', 'flex-col', 'items-center', 'text-center');

    const acceptBtn = screen.getByText('Tout accepter');
    expect(acceptBtn).toHaveClass('rounded-full');

    const declineBtn = screen.getByText('Décliner');
    expect(declineBtn).toHaveClass('rounded-full');
  });
});
