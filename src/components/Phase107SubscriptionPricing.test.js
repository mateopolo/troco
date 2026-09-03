import React from 'react';
import { render, screen } from '@testing-library/react';
import PaymentModal from './PaymentModal';
import { useWalletStore } from '../stores';

jest.mock('../firebase', () => ({
  db: {},
}));

jest.mock('../stores', () => {
  const original = jest.requireActual('../stores');
  return {
    ...original,
    useWalletStore: jest.fn((selector) => {
      const state = {
        currency: 'EUR',
        countryCode: 'FR',
        euroBalance: 100,
        trocoTokens: 10,
        isTrocoPlus: false,
        subscriptionPlan: null,
      };
      return selector ? selector(state) : state;
    }),
  };
});

describe('PHASE 107 : Nettoyage de la modale Troco Plus (Verrouillage Devise)', () => {
  test('PaymentModal removes manual country/currency select dropdown and internal PPP text', () => {
    const { container } = render(
      <PaymentModal
        isOpen={true}
        onClose={jest.fn()}
        initialMode="troco-plus"
      />
    );

    // Verification 1: No <select> element in the modal for picking country/currency
    const selects = container.querySelectorAll('select');
    expect(selects.length).toBe(0);

    // Verification 2: No mention of "Tarification Mondiale Équitable" or "PPP"
    expect(screen.queryByText(/Tarification Mondiale Équitable/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/équitable \(PPP\)/i)).not.toBeInTheDocument();

    // Verification 3: Plans are cleanly displayed with the region's currency
    expect(screen.getByText('Troco Plus Essentiel')).toBeInTheDocument();
    expect(screen.getByText('Troco Plus Illimité & Pro')).toBeInTheDocument();
  });

  test('PaymentModal dynamically locks prices to the store currency (e.g. USD / US)', () => {
    useWalletStore.mockImplementation((selector) => {
      const state = {
        currency: 'USD',
        countryCode: 'US',
        euroBalance: 100,
        trocoTokens: 10,
        isTrocoPlus: false,
        subscriptionPlan: null,
      };
      return selector ? selector(state) : state;
    });

    render(
      <PaymentModal
        isOpen={true}
        onClose={jest.fn()}
        initialMode="troco-plus"
      />
    );

    // Prices should be displayed in USD ($)
    const usdPrices = screen.getAllByText(/\$/);
    expect(usdPrices.length).toBeGreaterThan(0);
    expect(screen.queryByText(/Tarification Mondiale Équitable/i)).not.toBeInTheDocument();
  });
});
