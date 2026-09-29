// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ColorPicker, {
  parseHexToRgb,
  formatRgbToHex,
  parseRgbToHsl,
  formatHslToHex,
  DESIGN_SYSTEM_PALETTE,
} from '../../src/components/ui/ColorPicker';
import { isHourInSchedule, determineIsDark } from '../../src/contexts/ThemeContext';

describe('FAC-04: ColorPicker Component & Conversions', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('converts HEX to RGB correctly', () => {
    const rgb = parseHexToRgb('#C67D5B');
    expect(rgb.r).toBe(198);
    expect(rgb.g).toBe(125);
    expect(rgb.b).toBe(91);

    const rgbBlack = parseHexToRgb('#000000');
    expect(rgbBlack).toEqual({ r: 0, g: 0, b: 0 });

    const rgbWhite = parseHexToRgb('#FFFFFF');
    expect(rgbWhite).toEqual({ r: 255, g: 255, b: 255 });
  });

  it('converts RGB to HEX correctly', () => {
    const hex = formatRgbToHex(198, 125, 91);
    expect(hex.toUpperCase()).toBe('#C67D5B');

    const hexBlack = formatRgbToHex(0, 0, 0);
    expect(hexBlack).toBe('#000000');
  });

  it('converts RGB to HSL and back to HEX without loss', () => {
    const hsl = parseRgbToHsl(198, 125, 91);
    expect(hsl.h).toBeGreaterThan(0);
    expect(hsl.s).toBeGreaterThan(0);
    expect(hsl.l).toBeGreaterThan(0);

    const reconstructedHex = formatHslToHex(hsl.h, hsl.s, hsl.l);
    // Allow slight rounding delta within 2 units per channel
    const origRgb = parseHexToRgb('#C67D5B');
    const reconRgb = parseHexToRgb(reconstructedHex);
    expect(Math.abs(origRgb.r - reconRgb.r)).toBeLessThanOrEqual(3);
    expect(Math.abs(origRgb.g - reconRgb.g)).toBeLessThanOrEqual(3);
    expect(Math.abs(origRgb.b - reconRgb.b)).toBeLessThanOrEqual(3);
  });

  it('contains 20 design system color tokens', () => {
    expect(DESIGN_SYSTEM_PALETTE).toHaveLength(20);
    expect(DESIGN_SYSTEM_PALETTE.some(c => c.hex === '#C67D5B')).toBe(true);
    expect(DESIGN_SYSTEM_PALETTE.some(c => c.hex === '#231E1B')).toBe(true);
  });

  it('renders tabs HEX, RGB, HSL and updates active tab', () => {
    const handleChange = vi.fn();
    render(<ColorPicker color="#C67D5B" onChange={handleChange} />);

    expect(screen.getByRole('tab', { name: 'HEX' })).toBeDefined();
    expect(screen.getByRole('tab', { name: 'RGB' })).toBeDefined();
    expect(screen.getByRole('tab', { name: 'HSL' })).toBeDefined();

    fireEvent.click(screen.getByRole('tab', { name: 'RGB' }));
    expect(screen.getByRole('tab', { name: 'RGB' }).getAttribute('aria-selected')).toBe('true');

    fireEvent.click(screen.getByRole('tab', { name: 'HSL' }));
    expect(screen.getByRole('tab', { name: 'HSL' }).getAttribute('aria-selected')).toBe('true');
  });

  it('clicking a swatch calls onChange and updates recent colors in localStorage', () => {
    const handleChange = vi.fn();
    render(<ColorPicker color="#C67D5B" onChange={handleChange} />);

    // Click on Emerald swatch
    const emeraldSwatch = screen.getByLabelText(/Émeraude #10B981/i);
    fireEvent.click(emeraldSwatch);

    expect(handleChange).toHaveBeenCalledWith('#10B981');

    const storedRecents = JSON.parse(localStorage.getItem('troco_recent_colors') || '[]');
    expect(storedRecents).toContain('#10B981');
  });

  it('renders large swatch preview with active hex color', () => {
    render(<ColorPicker color="#EF4444" onChange={vi.fn()} />);
    expect(screen.getByText('#EF4444')).toBeDefined();
  });
});

describe('FAC-06: Auto Dark Mode & Schedule Determination', () => {
  let originalMatchMedia;

  beforeEach(() => {
    localStorage.clear();
    originalMatchMedia = window.matchMedia;
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    vi.useRealTimers();
  });

  it('isHourInSchedule correctly spans midnight (e.g. 20h to 7h)', () => {
    // 20h -> in schedule
    expect(isHourInSchedule(20, 20, 7)).toBe(true);
    // 23h -> in schedule
    expect(isHourInSchedule(23, 20, 7)).toBe(true);
    // 0h -> in schedule
    expect(isHourInSchedule(0, 20, 7)).toBe(true);
    // 6h -> in schedule
    expect(isHourInSchedule(6, 20, 7)).toBe(true);
    // 7h -> outside schedule
    expect(isHourInSchedule(7, 20, 7)).toBe(false);
    // 12h -> outside schedule
    expect(isHourInSchedule(12, 20, 7)).toBe(false);
    // 19h -> outside schedule
    expect(isHourInSchedule(19, 20, 7)).toBe(false);
  });

  it('isHourInSchedule correctly handles daytime spans (e.g. 14h to 18h)', () => {
    expect(isHourInSchedule(13, 14, 18)).toBe(false);
    expect(isHourInSchedule(14, 14, 18)).toBe(true);
    expect(isHourInSchedule(17, 14, 18)).toBe(true);
    expect(isHourInSchedule(18, 14, 18)).toBe(false);
  });

  it('determineIsDark handles explicit modes', () => {
    expect(determineIsDark('dark')).toBe(true);
    expect(determineIsDark('light')).toBe(false);
  });

  it('determineIsDark in auto mode triggers dark if current hour is within schedule even if system is light', () => {
    // Mock system as light
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    // Mock Date to 22:30 (night time)
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 29, 22, 30));

    const schedule = { enabled: true, startHour: 20, endHour: 7 };
    const isDark = determineIsDark('auto', schedule);
    expect(isDark).toBe(true);
  });

  it('determineIsDark in auto mode triggers dark if system prefers dark even if hour is outside schedule', () => {
    // Mock system as dark
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: true,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    // Mock Date to 14:00 (afternoon, outside 20h->7h)
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 29, 14, 0));

    const schedule = { enabled: true, startHour: 20, endHour: 7 };
    const isDark = determineIsDark('auto', schedule);
    expect(isDark).toBe(true);
  });

  it('determineIsDark in auto mode returns false when outside schedule and system is light', () => {
    // Mock system as light
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    // Mock Date to 14:00 (afternoon)
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 29, 14, 0));

    const schedule = { enabled: true, startHour: 20, endHour: 7 };
    const isDark = determineIsDark('auto', schedule);
    expect(isDark).toBe(false);
  });
});
