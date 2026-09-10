import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import TrocoLogo3D from './TrocoLogo3D';

describe('TrocoLogo3D — Liquid Chrome Infinity Engine', () => {
  it('renders default TrocoLogo3D with accessible attributes and CSS variable fallbacks', () => {
    const { container, getByRole } = render(<TrocoLogo3D size={48} />);
    const wrapper = getByRole('img', { name: /Troco — logo infini chromé/i });
    expect(wrapper).toBeInTheDocument();
    expect(wrapper.style.width).toBe(`${48 * 1.3}px`);
    expect(wrapper.style.height).toBe(`${48 * 0.85}px`);

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();

    // Verify ambient glow references primary CSS variable fallback
    const ambientStop = container.querySelector('radialGradient stop');
    expect(ambientStop).toBeInTheDocument();
    expect(ambientStop.getAttribute('stop-color')).toContain('var(--accent-primary');
  });

  it('adapts colors when a custom solid hex color is provided', () => {
    const { container } = render(<TrocoLogo3D size={60} customColor="#2563EB" />);
    const ambientStop = container.querySelector('radialGradient stop');
    expect(ambientStop.getAttribute('stop-color')).toBe('#2563EB');
  });

  it('adapts colors when a custom linear-gradient string is provided', () => {
    const gradient = 'linear-gradient(135deg, #FF416C, #FF4B2B)';
    const { container } = render(<TrocoLogo3D size={50} customColor={gradient} />);
    const ambientStop = container.querySelector('radialGradient stop');
    // from is #FF416C
    expect(ambientStop.getAttribute('stop-color')).toBe('#FF416C');
  });

  it('handles animated=true by injecting keyframes, shadow, and starlight particles', () => {
    const { container } = render(<TrocoLogo3D size={64} animated={true} />);
    expect(container.querySelector('style')).toBeInTheDocument();
    // Verify starlight paths exist
    const stars = container.querySelectorAll('path[transform*="translate"]');
    expect(stars.length).toBeGreaterThanOrEqual(3);
  });

  it('handles interactive=true desktop tilt and pointer move/leave without throwing', () => {
    const { getByRole } = render(<TrocoLogo3D size={70} interactive={true} />);
    const wrapper = getByRole('img');

    // Simulate pointer move
    fireEvent.pointerMove(wrapper, { clientX: 100, clientY: 100 });
    // Simulate pointer leave
    fireEvent.pointerLeave(wrapper);
    expect(wrapper).toBeInTheDocument();
  });
});
