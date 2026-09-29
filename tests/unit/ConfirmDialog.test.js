// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ConfirmProvider, useConfirm } from '../../src/hooks/useConfirm';
import ConfirmDialog from '../../src/components/ui/ConfirmDialog';
import { useUIStore } from '../../src/stores/useUIStore';

// Test harness component calling useConfirm
function TestConsumer({ confirmOptions, onResult }) {
  const confirm = useConfirm();

  return (
    <button
      type="button"
      data-testid="trigger-btn"
      onClick={async () => {
        const res = await confirm(confirmOptions);
        if (onResult) onResult(res);
      }}
    >
      Open Dialog
    </button>
  );
}

describe('FAC-01: useConfirm() + ConfirmDialog', () => {
  beforeEach(() => {
    useUIStore.setState({ activeModalsCount: 0 });
  });

  it('renders ConfirmDialog and resolves with true on confirm', async () => {
    let result = null;

    render(
      <ConfirmProvider>
        <TestConsumer
          confirmOptions={{
            title: 'Supprimer cet élément ?',
            message: 'Cette action est irréversible.',
            confirmLabel: 'Supprimer',
            cancelLabel: 'Annuler',
            variant: 'danger',
          }}
          onResult={(val) => {
            result = val;
          }}
        />
        <ConfirmDialog />
      </ConfirmProvider>
    );

    // Initial state: modal not open
    expect(screen.queryByText('Supprimer cet élément ?')).toBeNull();

    // Trigger modal
    await act(async () => {
      fireEvent.click(screen.getByTestId('trigger-btn'));
    });

    // Modal is now open
    expect(screen.getByText('Supprimer cet élément ?')).toBeDefined();
    expect(screen.getByText('Cette action est irréversible.')).toBeDefined();
    expect(useUIStore.getState().hasAnyModalOpen()).toBe(true); // BottomNav is hidden

    // Click confirm
    await act(async () => {
      fireEvent.click(screen.getByText('Supprimer'));
    });

    // Result is true, modal closed, activeModalsCount reset
    expect(result).toBe(true);
    expect(screen.queryByText('Supprimer cet élément ?')).toBeNull();
    expect(useUIStore.getState().hasAnyModalOpen()).toBe(false);
  });

  it('resolves with false when user clicks cancel', async () => {
    let result = null;

    render(
      <ConfirmProvider>
        <TestConsumer
          confirmOptions={{
            title: 'Attention',
            message: 'Voulez-vous quitter ?',
            confirmLabel: 'Oui',
            cancelLabel: 'Annuler',
            variant: 'warning',
          }}
          onResult={(val) => {
            result = val;
          }}
        />
        <ConfirmDialog />
      </ConfirmProvider>
    );

    // Trigger modal
    await act(async () => {
      fireEvent.click(screen.getByTestId('trigger-btn'));
    });

    expect(screen.getByText('Attention')).toBeDefined();

    // Click cancel
    await act(async () => {
      fireEvent.click(screen.getByText('Annuler'));
    });

    expect(result).toBe(false);
    expect(screen.queryByText('Attention')).toBeNull();
  });
});
