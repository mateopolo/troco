import React from 'react';
import { render, screen, act } from '@testing-library/react';
import TrocoLogoNativeSvg from './common/TrocoLogoNativeSvg';
import { AnimatedEuroBalance, AnimatedTokenBalance } from './AnimatedBalances';
import { AppHeader } from './layout/AppHeader';

jest.mock('../firebase', () => ({
  db: {},
}));

describe('PHASE 108 : Éradication crash OOM iOS (Lazy loading, démontage WebGL et cleanup)', () => {
  test('TrocoLogoNativeSvg renders 100% pure SVG without any canvas element', () => {
    const { container } = render(<TrocoLogoNativeSvg size={100} animated={true} />);
    
    // Doit contenir un SVG
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();

    // RÈGLE ABSOLUE : Zéro balise canvas
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeNull();
  });

  test('AnimatedEuroBalance and AnimatedTokenBalance clean up requestAnimationFrame on unmount', () => {
    const cancelRafSpy = jest.spyOn(window, 'cancelAnimationFrame');

    const { rerender, unmount } = render(<AnimatedEuroBalance value={50} />);
    
    // Déclenche une mise à jour qui lance un RAF
    act(() => {
      rerender(<AnimatedEuroBalance value={120} />);
    });

    // Démonte le composant
    act(() => {
      unmount();
    });

    // cancelAnimationFrame DOIT avoir été appelé pour éviter les fuites mémoire
    expect(cancelRafSpy).toHaveBeenCalled();
    cancelRafSpy.mockRestore();
  });

  test('AnimatedTokenBalance cleans up requestAnimationFrame on unmount', () => {
    const cancelRafSpy = jest.spyOn(window, 'cancelAnimationFrame');

    const { rerender, unmount } = render(<AnimatedTokenBalance value={5} />);
    
    act(() => {
      rerender(<AnimatedTokenBalance value={25} />);
    });

    act(() => {
      unmount();
    });

    expect(cancelRafSpy).toHaveBeenCalled();
    cancelRafSpy.mockRestore();
  });

  test('AppHeader renders native SVG logo on mobile', () => {
    const { container } = render(
      <AppHeader
        isMobile={true}
        activeTab="feed"
      />
    );

    const nativeLogo = container.querySelector('.troco-logo-native-svg');
    expect(nativeLogo).toBeInTheDocument();
  });
});
