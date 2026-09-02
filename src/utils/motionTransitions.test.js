import { pageTransitionVariants, pageTransitionConfig } from './motionTransitions';

describe('motionTransitions (Phase 60)', () => {
  it('exports standardized pageTransitionVariants with fade and scale', () => {
    expect(pageTransitionVariants).toBeDefined();
    expect(pageTransitionVariants.initial).toEqual({ opacity: 0, scale: 0.98 });
    expect(pageTransitionVariants.animate).toEqual({ opacity: 1, scale: 1 });
    expect(pageTransitionVariants.exit).toEqual({ opacity: 0, scale: 0.98 });
  });

  it('exports standardized pageTransitionConfig with smooth duration and easeOut', () => {
    expect(pageTransitionConfig).toBeDefined();
    expect(pageTransitionConfig.duration).toBe(0.2);
    expect(pageTransitionConfig.ease).toBe('easeOut');
  });
});
