import React from 'react';
import fs from 'fs';
import path from 'path';

describe('Phase 135: Swap History Z-Index & Layout Confinement', () => {
  const bottomNavPath = path.join(__dirname, 'layout/AppBottomNav.jsx');
  const universalModalPath = path.join(__dirname, 'ui/UniversalModal.jsx');
  const publicProfileModalPath = path.join(__dirname, 'PublicProfileModal.jsx');
  const profileFeaturePath = path.join(__dirname, '../features/profile/ProfileFeature.jsx');
  const profileViewPath = path.join(__dirname, 'ProfileView.jsx');
  const indexCssPath = path.join(__dirname, '../index.css');

  const bottomNavContent = fs.readFileSync(bottomNavPath, 'utf-8');
  const universalModalContent = fs.readFileSync(universalModalPath, 'utf-8');
  const publicProfileModalContent = fs.readFileSync(publicProfileModalPath, 'utf-8');
  const profileFeatureContent = fs.readFileSync(profileFeaturePath, 'utf-8');
  const profileViewContent = fs.readFileSync(profileViewPath, 'utf-8');
  const indexCssContent = fs.readFileSync(indexCssPath, 'utf-8');

  test('1. AppBottomNav has zIndex 100050 and pointerEvents auto', () => {
    expect(bottomNavContent).toContain('zIndex: 100050');
    expect(bottomNavContent).toContain("pointerEvents: 'auto'");
  });

  test('2. UniversalModal has z-index 99990 and mobile clearance for AppBottomNav', () => {
    expect(universalModalContent).toContain('z-[99990]');
    expect(universalModalContent).toContain('zIndex: 99990');
    expect(universalModalContent).toContain('pb-[calc(76px+env(safe-area-inset-bottom,12px))]');
    expect(universalModalContent).toContain('max-h-[calc(100dvh-95px)]');
  });

  test('3. PublicProfileModal swap history tab is strictly contained with swap-history-container', () => {
    expect(publicProfileModalContent).toContain('swap-history-container');
    expect(publicProfileModalContent).toContain("boxSizing: 'border-box'");
    expect(publicProfileModalContent).toContain("maxHeight: 'min(780px, calc(100dvh - 120px))'");
  });

  test('4. ProfileFeature and ProfileView swap history sections use swap-history-section class', () => {
    expect(profileFeatureContent).toContain('swap-history-section');
    expect(profileViewContent).toContain('swap-history-section');
  });

  test('5. index.css enforces z-index 100050 and pointer-events auto for app-bottom-nav', () => {
    expect(indexCssContent).toContain('.app-bottom-nav');
    expect(indexCssContent).toContain('z-index: 100050 !important');
    expect(indexCssContent).toContain('pointer-events: auto !important');
    expect(indexCssContent).toContain('.swap-history-container');
  });
});
