import fs from 'fs';
import path from 'path';

describe('Phase 129 : Restauration Esthétique Stricte du Commit 977354d & Barre Mono-Ligne Swipeable', () => {
  const whiteboardPath = path.join(__dirname, 'CollaborativeWhiteboardModal.jsx');
  const whiteboardContent = fs.readFileSync(whiteboardPath, 'utf-8');

  test('1. Conteneur externe : positionnement exact fixed bottom-6 et structure pill arrondie', () => {
    expect(whiteboardContent).toContain(
      'fixed bottom-6 left-1/2 -translate-x-1/2 z-[1000] max-w-[94vw] md:max-w-3xl w-auto flex items-center'
    );
    // Vérification des styles 977354d (borderRadius: 24px, rgba(26,22,19,0.92), blur 20px)
    expect(whiteboardContent).toContain("borderRadius: '24px'");
    expect(whiteboardContent).toContain("rgba(26,22,19,0.92)");
    expect(whiteboardContent).toContain("blur(20px)");
    expect(whiteboardContent).toContain("0 20px 40px -10px rgba(0,0,0,0.25)");
  });

  test('2. Conteneur interne : défilement horizontal strict mono-ligne avec swipe tactile', () => {
    expect(whiteboardContent).toContain(
      'flex flex-row flex-nowrap items-center gap-2 overflow-x-auto overflow-y-hidden touch-pan-x no-scrollbar px-3 py-2 scroll-smooth'
    );
    expect(whiteboardContent).toContain("touchAction: 'pan-x'");
    expect(whiteboardContent).toContain("overscrollBehaviorX: 'contain'");
  });

  test('3. Absence stricte de flex-wrap ou de grid sur les conteneurs de la barre', () => {
    const parentMatch = whiteboardContent.match(/className="fixed bottom-6 left-1\/2[^"]*"/);
    expect(parentMatch).toBeTruthy();
    expect(parentMatch[0]).not.toContain('flex-wrap');
    expect(parentMatch[0]).not.toContain('grid');

    const innerMatch = whiteboardContent.match(/className="flex flex-row flex-nowrap items-center gap-2[^"]*"/);
    expect(innerMatch).toBeTruthy();
    expect(innerMatch[0]).not.toContain('flex-wrap');
    expect(innerMatch[0]).not.toContain('grid');
  });

  test('4. Bouton Masquer / Afficher élégant avec style 977354d', () => {
    expect(whiteboardContent).toContain('setIsToolbarVisible(true)');
    expect(whiteboardContent).toContain('setIsToolbarVisible(false)');
    expect(whiteboardContent).toContain('title="Afficher la barre d\'outils"');
    expect(whiteboardContent).toContain('title="Masquer la barre d\'outils"');
  });

  test('5. Conservation intégrale de tous les outils (Non-régression absolue)', () => {
    // 1. Historique & Édition
    expect(whiteboardContent).toContain('title="Annuler (Ctrl+Z)"');
    expect(whiteboardContent).toContain('title="Rétablir (Ctrl+Y)"');
    expect(whiteboardContent).toContain('title="Copier l\'élément sélectionné (Ctrl+C)"');
    expect(whiteboardContent).toContain('title="Coller l\'élément copié (Ctrl+V)"');
    expect(whiteboardContent).toContain('title="Supprimer l\'élément sélectionné (Suppr / Backspace)"');

    // 2. Outils de création
    expect(whiteboardContent).toContain('title="Sélectionner & Manipuler (Curseur)"');
    expect(whiteboardContent).toContain("title: 'Crayon'");
    expect(whiteboardContent).toContain("title: 'Pinceau Artistique'");
    expect(whiteboardContent).toContain("title: 'Surligneur'");
    expect(whiteboardContent).toContain("title: 'Gomme'");
    expect(whiteboardContent).toContain("title: 'Texte'");
    expect(whiteboardContent).toContain('title="Bibliothèque étendue de formes vectorielles"');
    expect(whiteboardContent).toContain("title: 'Post-it'");
    expect(whiteboardContent).toContain("title: 'Déplacer (Pan)'");

    // 3. Styles & Propriétés
    expect(whiteboardContent).toContain('CURATED_PALETTE.slice(0, 5)');
    expect(whiteboardContent).toContain('title="Ouvrir le spectre de couleurs complet"');
    expect(whiteboardContent).toContain('BG_PRESETS.slice(0, 4)');
    expect(whiteboardContent).toContain('title="Personnaliser la couleur d\'arrière-plan"');
    expect(whiteboardContent).toContain('type="range"');
    expect(whiteboardContent).toContain('[2, 4, 8, 16].map((w)');

    // 4. Actions globales
    expect(whiteboardContent).toContain('title="Tout effacer"');
    expect(whiteboardContent).toContain("title={isImmersiveMode ? 'Quitter le mode plein écran' : 'Plein écran (Immersion)'}");
  });

  test('6. Popover des formes vectorielles via React Portal dans le body', () => {
    expect(whiteboardContent).toContain('id="shapes-popover-portal"');
    expect(whiteboardContent).toContain('createPortal(');
    expect(whiteboardContent).toContain('document.body');
  });

  test('7. Forçage strict de flex-shrink-0 sur tous les éléments de la barre', () => {
    expect(whiteboardContent).toContain('flex-shrink-0');
    expect(whiteboardContent).toContain("flexShrink: 0");
  });
});
