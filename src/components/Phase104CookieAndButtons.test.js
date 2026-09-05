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
    const { container } = render(<CookieBanner onOpenPrivacyCenter={jest.fn()} />);

    act(() => {
      jest.advanceTimersByTime(1500);
    });

    const rootBanner = container.firstChild;
    expect(rootBanner).toBeInTheDocument();

    // Verification 1: Root container has required classes for centered floating card
    expect(rootBanner).toHaveClass('fixed');
    expect(rootBanner).toHaveClass('bottom-6');
    expect(rootBanner).toHaveClass('left-1/2');
    expect(rootBanner).toHaveClass('-translate-x-1/2');
    expect(rootBanner).toHaveClass('w-[90%]');
    expect(rootBanner).toHaveClass('max-w-2xl');
    expect(rootBanner).toHaveClass('rounded-2xl');
    expect(rootBanner).toHaveClass('shadow-2xl');
    expect(rootBanner).toHaveClass('flex');
    expect(rootBanner).toHaveClass('flex-col');
    expect(rootBanner).toHaveClass('items-center');
    expect(rootBanner).toHaveClass('text-center');

    // Verification 2: Buttons container has flex-row flex-nowrap items-center justify-center
    const acceptBtn = screen.getByText('Tout accepter');
    const buttonsContainer = acceptBtn.parentElement;
    expect(buttonsContainer).toHaveClass('flex');
    expect(buttonsContainer).toHaveClass('flex-row');
    expect(buttonsContainer).toHaveClass('flex-nowrap');
    expect(buttonsContainer).toHaveClass('items-center');
    expect(buttonsContainer).toHaveClass('justify-center');
    expect(buttonsContainer).toHaveClass('gap-2');
    expect(buttonsContainer).toHaveClass('w-full');
    expect(buttonsContainer).toHaveClass('mt-2');

    // Verification 3: Buttons have compact styling and rounded-full
    expect(acceptBtn).toHaveClass('whitespace-nowrap');
    expect(acceptBtn).toHaveClass('rounded-full');
    expect(acceptBtn).toHaveClass('px-4');
    expect(acceptBtn).toHaveClass('py-2');
    expect(acceptBtn).toHaveClass('text-sm');

    const declineBtn = screen.getByText('Continuer sans accepter');
    expect(declineBtn).toHaveClass('whitespace-nowrap');
    expect(declineBtn).toHaveClass('rounded-full');
    expect(declineBtn).toHaveClass('px-4');
    expect(declineBtn).toHaveClass('py-2');
  });
});
