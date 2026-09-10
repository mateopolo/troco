import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCheckout } from '../hooks/useCheckout';
import { walletService } from '../services/walletService';
import { paymentService } from '../services/paymentService';

vi.mock('../services/walletService', () => ({
  walletService: {
    transferAtomically: vi.fn().mockResolvedValue({ success: true, newSenderTokens: 8 }),
  },
}));

vi.mock('../services/paymentService', () => ({
  paymentService: {
    applyPayment: vi.fn().mockResolvedValue({ success: true }),
  },
}));

describe('💳 P0-FIN-03: Separation of cancelCheckout and applyCheckout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('cancelCheckout closes the session with zero financial side-effects', () => {
    const onPaymentSuccess = vi.fn();
    const onOpenNotification = vi.fn();
    const profile = { uid: 'u1', euroBalance: 50, trocoTokens: 10 };
    const setProfile = vi.fn();

    const { result } = renderHook(() =>
      useCheckout({ profile, setProfile, onPaymentSuccess, onOpenNotification })
    );

    // 1. Open checkout
    act(() => {
      result.current.openCheckout({
        mode: 'topup-cash',
        amountTtc: 20,
      });
    });

    expect(result.current.checkoutSession).not.toBeNull();
    expect(result.current.checkoutSession.amountTtc).toBe(20);

    // 2. User clicks "X" or cancels
    act(() => {
      result.current.cancelCheckout();
    });

    expect(result.current.checkoutSession).toBeNull();
    expect(result.current.paymentStatus).toBe('cancelled');

    // VERIFY ZERO CALLS to paymentService or walletService
    expect(paymentService.applyPayment).not.toHaveBeenCalled();
    expect(walletService.transferAtomically).not.toHaveBeenCalled();
    expect(onPaymentSuccess).not.toHaveBeenCalled();
  });

  it('applyCheckout performs payment and prevents duplicate execution via applied guard', async () => {
    const onPaymentSuccess = vi.fn();
    const profile = { uid: 'u1', euroBalance: 50, trocoTokens: 10 };
    const setProfile = vi.fn();

    const { result } = renderHook(() =>
      useCheckout({ profile, setProfile, onPaymentSuccess })
    );

    act(() => {
      result.current.openCheckout({
        mode: 'topup-cash',
        amountTtc: 30,
      });
    });

    // Execute applyCheckout
    await act(async () => {
      await result.current.applyCheckout({ provider: 'mock' });
    });

    expect(paymentService.applyPayment).toHaveBeenCalledTimes(1);
    expect(onPaymentSuccess).toHaveBeenCalledTimes(1);

    // Replay attempt must be blocked by anti-double execution guard
    await act(async () => {
      await result.current.applyCheckout({ provider: 'mock' });
    });

    // Must STILL be called only once
    expect(paymentService.applyPayment).toHaveBeenCalledTimes(1);
  });
});
