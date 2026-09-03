import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import CookieBanner from './CookieBanner';

describe('PHASE 104 : Centrage Global & Reformatage Bannière Cookies', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('CookieBanner renders centered container and flexbox buttons when visible', () => {
    const { container } = render(<CookieBanner onOpenPrivacyCenter={jest.fn()} />);

    act(() => {
      jest.advanceTimersByTime(1500);
    });

    const rootBanner = container.firstChild;
    expect(rootBanner).toBeInTheDocument();

    // Verification 1: Root container has required classes
    expect(rootBanner).toHaveClass('fixed');
    expect(rootBanner).toHaveClass('bottom-0');
    expect(rootBanner).toHaveClass('inset-x-0');
    expect(rootBanner).toHaveClass('mx-auto');
    expect(rootBanner).toHaveClass('max-w-4xl');
    expect(rootBanner).toHaveClass('flex');
    expect(rootBanner).toHaveClass('flex-col');
    expect(rootBanner).toHaveClass('items-center');
    expect(rootBanner).toHaveClass('text-center');

    // Verification 2: Buttons container has flex flex-row flex-wrap items-center justify-center
    const acceptBtn = screen.getByText('Tout accepter');
    const buttonsContainer = acceptBtn.parentElement;
    expect(buttonsContainer).toHaveClass('flex');
    expect(buttonsContainer).toHaveClass('flex-row');
    expect(buttonsContainer).toHaveClass('flex-wrap');
    expect(buttonsContainer).toHaveClass('items-center');
    expect(buttonsContainer).toHaveClass('justify-center');

    // Verification 3: Buttons have whitespace-nowrap and sizing constraints
    expect(acceptBtn).toHaveClass('whitespace-nowrap');
    expect(acceptBtn).toHaveClass('min-w-[120px]');
    expect(acceptBtn).toHaveClass('max-w-[200px]');
    expect(acceptBtn).toHaveClass('text-center');
    expect(acceptBtn).toHaveClass('justify-center');

    const declineBtn = screen.getByText('Continuer sans accepter');
    expect(declineBtn).toHaveClass('whitespace-nowrap');
    expect(declineBtn).toHaveClass('min-w-[120px]');
    expect(declineBtn).toHaveClass('max-w-[200px]');
  });
});
