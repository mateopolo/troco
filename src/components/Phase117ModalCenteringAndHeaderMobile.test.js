import React from 'react';
import { render, screen } from '@testing-library/react';
import fs from 'fs';
import path from 'path';
import PublishSuccessModal from './PublishSuccessModal';
import { AppHeader } from './layout/AppHeader';

describe('Phase 117 : Centrage absolu des Modales et Alignement Header Mobile', () => {
  describe('1. Centrage parfait de la modale de succès (PublishSuccessModal)', () => {
    test('PublishSuccessModal possède les classes Tailwind exactes sur parent et enfant', () => {
      render(
        <PublishSuccessModal
          isOpen={true}
          listing={{ title: 'Vélo de course vintage' }}
          currentLang="FR"
        />
      );

      // Parent container
      const modalTitle = screen.getByText(/Annonce publiée/i);
      const childCard = modalTitle.closest('.relative');
      expect(childCard).toBeTruthy();
      expect(childCard.className).toContain('relative');
      expect(childCard.className).toContain('w-full');
      expect(childCard.className).toContain('max-w-md');
      expect(childCard.className).toContain('mx-auto');
      expect(childCard.className).toContain('bg-[var(--bg-card)]');
      expect(childCard.className).toContain('rounded-3xl');
      expect(childCard.className).toContain('shadow-2xl');
      expect(childCard.className).toContain('flex');
      expect(childCard.className).toContain('flex-col');
      expect(childCard.className).toContain('items-center');
      expect(childCard.className).toContain('text-center');
      expect(childCard.className).toContain('overflow-hidden');

      const parentBackdrop = childCard.parentElement;
      expect(parentBackdrop.className).toContain('fixed');
      expect(parentBackdrop.className).toContain('inset-0');
      expect(parentBackdrop.className).toContain('z-[999999]');
      expect(parentBackdrop.className).toContain('flex');
      expect(parentBackdrop.className).toContain('items-center');
      expect(parentBackdrop.className).toContain('justify-center');
      expect(parentBackdrop.className).toContain('p-4');
      expect(parentBackdrop.className).toContain('bg-black/60');
      expect(parentBackdrop.className).toContain('backdrop-blur-sm');

      // Aucune marge parasite
      expect(childCard.className).not.toContain('mt-20');
      expect(childCard.className).not.toContain('absolute top-0');
    });

    test('App.js contient les classes de centrage requises pour la popup de confirmation', () => {
      const appJsContent = fs.readFileSync(path.join(__dirname, '../App.js'), 'utf-8');
      expect(appJsContent).toContain('fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm');
      expect(appJsContent).toContain('relative w-full max-w-md mx-auto bg-[var(--bg-card)] rounded-3xl shadow-2xl flex flex-col items-center text-center overflow-hidden');
    });

    test('PostListingFeature.jsx contient les classes de centrage requises pour la modale de succès', () => {
      const postFeatureContent = fs.readFileSync(
        path.join(__dirname, '../features/post/PostListingFeature.jsx'),
        'utf-8'
      );
      expect(postFeatureContent).toContain('fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm');
      expect(postFeatureContent).toContain('relative w-full max-w-md mx-auto bg-[var(--bg-card)] rounded-3xl shadow-2xl flex flex-col items-center text-center overflow-hidden');
    });
  });

  describe('2. Sauvetage du bouton de langue (AppHeader & MobileHeader)', () => {
    test('AppHeader applique le Flexbox contraint max-w-[50%] et flex-shrink-0 sur header-actions', () => {
      const { container } = render(
        <AppHeader
          isMobile={true}
          currentLang="FR"
          profile={{ euroBalance: 42, trocoTokens: 15 }}
        />
      );

      const headerActions = container.querySelector('.header-actions');
      expect(headerActions).toBeTruthy();
      expect(headerActions.className).toContain('flex');
      expect(headerActions.className).toContain('items-center');
      expect(headerActions.className).toContain('justify-end');
      expect(headerActions.className).toContain('gap-2');
      expect(headerActions.className).toContain('flex-shrink-0');
      expect(headerActions.className).toContain('max-w-[50%]');
    });

    test('Le bouton de langue (LanguageSelector) possède flex-shrink-0 et ne se fait jamais écraser', () => {
      const { container } = render(
        <AppHeader
          isMobile={true}
          currentLang="FR"
          profile={{ euroBalance: 42, trocoTokens: 15 }}
        />
      );

      const langBtn = container.querySelector('.lang-btn');
      expect(langBtn).toBeTruthy();
      expect(langBtn.className).toContain('flex-shrink-0');
      expect(langBtn.textContent).toContain('FR');
    });

    test('Sur mobile, le texte Jetons est condensé au montant seul pour libérer de la place', () => {
      const { container } = render(
        <AppHeader
          isMobile={true}
          currentLang="FR"
          profile={{ euroBalance: 42, trocoTokens: 15 }}
        />
      );

      const headerActions = container.querySelector('.header-actions');
      // En mobile, on ne doit pas trouver "Jetons" affiché dans les badges du header
      expect(headerActions.textContent).not.toContain('Jetons');
      expect(headerActions.textContent).toContain('15');
      expect(headerActions.textContent).toContain('FR');
    });

    test('MobileHeader contient la classe flex-shrink-0 et max-w-[50%] pour rightAction', () => {
      const mobileHeaderContent = fs.readFileSync(
        path.join(__dirname, 'common/MobileHeader.jsx'),
        'utf-8'
      );
      expect(mobileHeaderContent).toContain('flex items-center justify-end gap-2 flex-shrink-0 max-w-[50%]');
    });

    test('index.css applique max-width 50% sur .header-actions en responsive mobile', () => {
      const indexCss = fs.readFileSync(path.join(__dirname, '../index.css'), 'utf-8');
      expect(indexCss).toContain('max-width: 50% !important;');
      expect(indexCss).not.toContain('.header-actions {\n    gap: 3px !important;\n    max-width: 100% !important;');
    });
  });
});
