import { renderHook, act } from '@testing-library/react';
import fs from 'fs';
import path from 'path';
import { useUIStore } from '../stores/useUIStore';

describe('UX-01: Masquage dynamique BottomNav & Unification Backdrop Modales', () => {
  const bottomNavPath = path.join(__dirname, 'layout/AppBottomNav.jsx');
  const universalModalPath = path.join(__dirname, 'ui/UniversalModal.jsx');

  const bottomNavContent = fs.readFileSync(bottomNavPath, 'utf-8');
  const universalModalContent = fs.readFileSync(universalModalPath, 'utf-8');

  beforeEach(() => {
    act(() => {
      useUIStore.getState().closeAllModals();
    });
  });

  test('1. useUIStore manages stacked modalOpenCount safely', () => {
    const { result } = renderHook(() => useUIStore());

    expect(result.current.modalOpenCount).toBe(0);
    expect(result.current.hasAnyModalOpen()).toBe(false);

    // Open first modal
    act(() => {
      result.current.openModal();
    });
    expect(result.current.modalOpenCount).toBe(1);
    expect(result.current.hasAnyModalOpen()).toBe(true);

    // Open stacked second modal
    act(() => {
      result.current.openModal();
    });
    expect(result.current.modalOpenCount).toBe(2);

    // Close one modal
    act(() => {
      result.current.closeModal();
    });
    expect(result.current.modalOpenCount).toBe(1);

    // Close second modal
    act(() => {
      result.current.closeModal();
    });
    expect(result.current.modalOpenCount).toBe(0);
    expect(result.current.hasAnyModalOpen()).toBe(false);

    // Guard against negative counts
    act(() => {
      result.current.closeModal();
    });
    expect(result.current.modalOpenCount).toBe(0);
  });

  test('2. useUIStore closeAllModals resets modalOpenCount to 0', () => {
    const { result } = renderHook(() => useUIStore());

    act(() => {
      result.current.openModal();
      result.current.openModal();
    });
    expect(result.current.modalOpenCount).toBe(2);

    act(() => {
      result.current.closeAllModals();
    });
    expect(result.current.modalOpenCount).toBe(0);
    expect(result.current.hasAnyModalOpen()).toBe(false);
  });

  test('3. UniversalModal enforces central BACKDROP_CLASSNAME overlay and preserves z-index 99990', () => {
    expect(universalModalContent).toContain('BACKDROP_CLASSNAME');
    expect(universalModalContent).toContain('z-[99990]');
    expect(universalModalContent).toContain('zIndex: 99990');
    // Ensure old padding hack is removed
    expect(universalModalContent).not.toContain('pb-[calc(76px+env(safe-area-inset-bottom,12px))]');
  });

  test('4. AppBottomNav hides via motion when modal is open and disables pointer events', () => {
    expect(bottomNavContent).toContain("isModalOpen ? '100%' : 0");
    expect(bottomNavContent).toContain("isModalOpen ? 0 : 1");
    expect(bottomNavContent).toContain("pointerEvents: isModalOpen ? 'none' : 'auto'");
    expect(bottomNavContent).toContain('zIndex: 100050');
  });
});
