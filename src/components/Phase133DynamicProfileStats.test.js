import React from 'react';
import fs from 'fs';
import path from 'path';

describe('Phase 133: Dynamic Profile Stats & Zero-state Fallbacks', () => {
  const publicProfileModalPath = path.join(__dirname, 'PublicProfileModal.jsx');
  const profileViewPath = path.join(__dirname, 'ProfileView.jsx');
  const profileFeaturePath = path.join(__dirname, '../features/profile/ProfileFeature.jsx');

  const publicProfileModalContent = fs.readFileSync(publicProfileModalPath, 'utf-8');
  const profileViewContent = fs.readFileSync(profileViewPath, 'utf-8');
  const profileFeatureContent = fs.readFileSync(profileFeaturePath, 'utf-8');

  test('1. PublicProfileModal.jsx uses dynamic user data with fallbacks to 0', () => {
    expect(publicProfileModalContent).toContain('user.dealsCompleted || 0');
    expect(publicProfileModalContent).toContain('user.activeDeals || 0');
    expect(publicProfileModalContent).toContain("user.reviewsCount > 0 ? (Math.round(user.averageRating * 10) / 10).toFixed(1) + ' ⭐' : t('profile.no_reviews', 'Pas d\\'évaluation pour l\\'instant')");
  });

  test('2. ProfileView.jsx uses dynamic user data with fallbacks to 0', () => {
    expect(profileViewContent).toContain('user.dealsCompleted || 0');
    expect(profileViewContent).toContain('user.activeDeals || 0');
    expect(profileViewContent).toContain("user.reviewsCount > 0 ? (Math.round(user.averageRating * 10) / 10).toFixed(1) + ' ⭐' : t('profile.no_reviews', 'Pas d\\'évaluation pour l\\'instant')");
  });

  test('3. ProfileFeature.jsx uses dynamic user data with fallbacks to 0', () => {
    expect(profileFeatureContent).toContain('user.dealsCompleted || 0');
    expect(profileFeatureContent).toContain('user.activeDeals || 0');
    expect(profileFeatureContent).toContain("user.reviewsCount > 0 ? (Math.round(user.averageRating * 10) / 10).toFixed(1) + ' ⭐' : t('profile.no_reviews', 'Pas d\\'évaluation pour l\\'instant')");
  });

  test('4. Zero hardcoded stats like "Deal clôturé: 7" or hardcoded 4,9 rating in swap history', () => {
    expect(publicProfileModalContent).not.toContain('Deal clôturé: 7');
    expect(publicProfileModalContent).not.toContain('En cours planifié: 1');
    expect(profileViewContent).not.toContain('Deal clôturé: 7');
    expect(profileViewContent).not.toContain('En cours planifié: 1');
    expect(profileFeatureContent).not.toContain('Deal clôturé: 7');
    expect(profileFeatureContent).not.toContain('En cours planifié: 1');
  });
});
