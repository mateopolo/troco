// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useCallTimer,
  formatCallTimer,
  calculateCallCost,
} from '../../src/hooks/useCallTimer';

describe('useCallTimer hook [MOY-03]', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('formatCallTimer helper', () => {
    it('formats seconds under an hour as MM:SS', () => {
      expect(formatCallTimer(0)).toBe('00:00');
      expect(formatCallTimer(9)).toBe('00:09');
      expect(formatCallTimer(45)).toBe('00:45');
      expect(formatCallTimer(60)).toBe('01:00');
      expect(formatCallTimer(3599)).toBe('59:59');
    });

    it('formats seconds over an hour as HH:MM:SS', () => {
      expect(formatCallTimer(3600)).toBe('01:00:00');
      expect(formatCallTimer(3665)).toBe('01:01:05');
      expect(formatCallTimer(7325)).toBe('02:02:05');
    });

    it('handles negative or invalid values safely', () => {
      expect(formatCallTimer(-10)).toBe('00:00');
      expect(formatCallTimer(null)).toBe('00:00');
      expect(formatCallTimer(undefined)).toBe('00:00');
      expect(formatCallTimer('abc')).toBe('00:00');
    });
  });

  describe('calculateCallCost helper', () => {
    it('returns 0 for 0 or negative duration', () => {
      expect(calculateCallCost(0)).toBe(0);
      expect(calculateCallCost(-50)).toBe(0);
    });

    it('charges minimum 1 token for short calls (1h = 1 token base)', () => {
      expect(calculateCallCost(10)).toBe(1);
      expect(calculateCallCost(1800)).toBe(1);
      expect(calculateCallCost(3600)).toBe(1);
    });

    it('rounds up to the next hourly token tranche', () => {
      expect(calculateCallCost(3601)).toBe(2);
      expect(calculateCallCost(7200)).toBe(2);
      expect(calculateCallCost(7201)).toBe(3);
    });

    it('supports custom hourly rates', () => {
      expect(calculateCallCost(3600, 2)).toBe(2);
      expect(calculateCallCost(3601, 2)).toBe(4);
    });
  });

  describe('Chronomètre WebRTC & cycle de vie', () => {
    it('initializes with duration 0 and closed settlement modal', () => {
      const { result } = renderHook(() =>
        useCallTimer({ callState: { active: false, ringing: false } })
      );

      expect(result.current.callDuration).toBe(0);
      expect(result.current.settlementCallDuration).toBe(0);
      expect(result.current.isSettlementModalOpen).toBe(false);
      expect(result.current.callCost).toBe(0);
      expect(result.current.formattedCallDuration).toBe('00:00');
    });

    it('does not increment timer when call is ringing', () => {
      const { result } = renderHook(() =>
        useCallTimer({ callState: { active: true, ringing: true } })
      );

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(result.current.callDuration).toBe(0);
    });

    it('increments duration every second when call is active and connected', () => {
      const { result } = renderHook(() =>
        useCallTimer({ callState: { active: true, ringing: false } })
      );

      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(result.current.callDuration).toBe(1);

      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(result.current.callDuration).toBe(6);
      expect(result.current.formattedCallDuration).toBe('00:06');
    });

    it('resets duration and does not trigger settlement modal if call lasts <= 5s', () => {
      const mockSetIsCallPip = vi.fn();
      const mockOnCallEnd = vi.fn();

      const { result, rerender } = renderHook(
        ({ callState }) =>
          useCallTimer({
            callState,
            setIsCallPip: mockSetIsCallPip,
            onCallEnd: mockOnCallEnd,
          }),
        { initialProps: { callState: { active: true, ringing: false } } }
      );

      act(() => {
        vi.advanceTimersByTime(4000);
      });
      expect(result.current.callDuration).toBe(4);

      // Call ends at 4 seconds
      rerender({ callState: { active: false, ringing: false } });

      expect(result.current.callDuration).toBe(0);
      expect(result.current.settlementCallDuration).toBe(0);
      expect(result.current.isSettlementModalOpen).toBe(false);
      expect(mockSetIsCallPip).toHaveBeenCalledWith(false);
      expect(mockOnCallEnd).not.toHaveBeenCalled();
    });

    it('opens settlement modal with accurate duration when call lasts > 5s', () => {
      const mockSetIsCallPip = vi.fn();
      const mockOnCallEnd = vi.fn();

      const { result, rerender } = renderHook(
        ({ callState }) =>
          useCallTimer({
            callState,
            setIsCallPip: mockSetIsCallPip,
            onCallEnd: mockOnCallEnd,
          }),
        { initialProps: { callState: { active: true, ringing: false } } }
      );

      act(() => {
        vi.advanceTimersByTime(12000); // 12 seconds
      });
      expect(result.current.callDuration).toBe(12);

      // Call ends
      rerender({ callState: { active: false, ringing: false } });

      expect(result.current.callDuration).toBe(0);
      expect(result.current.settlementCallDuration).toBe(12);
      expect(result.current.isSettlementModalOpen).toBe(true);
      expect(result.current.callCost).toBe(1); // 12s <= 3600s => 1 token
      expect(result.current.formattedSettlementDuration).toBe('00:12');
      expect(mockSetIsCallPip).toHaveBeenCalledWith(false);
      expect(mockOnCallEnd).toHaveBeenCalledWith(12);
    });

    it('provides helper methods to open, close, and reset modal/timer', () => {
      const { result } = renderHook(() =>
        useCallTimer({ callState: { active: false, ringing: false } })
      );

      act(() => {
        result.current.openSettlementModal(120);
      });
      expect(result.current.isSettlementModalOpen).toBe(true);
      expect(result.current.settlementCallDuration).toBe(120);
      expect(result.current.callCost).toBe(1);

      act(() => {
        result.current.closeSettlementModal();
      });
      expect(result.current.isSettlementModalOpen).toBe(false);

      act(() => {
        result.current.resetTimer();
      });
      expect(result.current.callDuration).toBe(0);
      expect(result.current.settlementCallDuration).toBe(0);
    });
  });
});
