import fs from 'fs';
import path from 'path';

describe('Phase 122 : Fix Absolu de la Barre d\'outils Whiteboard sur une seule ligne (Single-Line Swipe)', () => {
  const whiteboardPath = path.join(__dirname, 'CollaborativeWhiteboardModal.jsx');
  const whiteboardContent = fs.readFileSync(whiteboardPath, 'utf-8');

  test('1. Conteneur parent : centré en bas avec classes exactes requises', () => {
    expect(whiteboardContent).toContain(
      'absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] w-[95vw] max-w-3xl bg-[#2A2624]/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl flex flex-row items-center p-2'
    );
  });

  test('2. Conteneur interne : défilement horizontal strict sur une seule ligne avec hauteur h-12', () => {
    expect(whiteboardContent).toContain(
      'flex flex-row flex-nowrap items-center gap-2 overflow-x-auto overflow-y-hidden touch-pan-x no-scrollbar w-full px-2 h-12 scroll-smooth'
    );
  });

  test('3. Absence stricte de flex-wrap, grid ou h-auto sur les conteneurs de la barre', () => {
    const parentMatch = whiteboardContent.match(/className="absolute bottom-6 left-1\/2[^"]*"/);
    expect(parentMatch).toBeTruthy();
    expect(parentMatch[0]).not.toContain('flex-wrap');
    expect(parentMatch[0]).not.toContain('grid');
    expect(parentMatch[0]).not.toContain('h-auto');

    const innerMatch = whiteboardContent.match(/className="flex flex-row flex-nowrap items-center gap-2[^"]*"/);
    expect(innerMatch).toBeTruthy();
    expect(innerMatch[0]).not.toContain('flex-wrap');
    expect(innerMatch[0]).not.toContain('grid');
    expect(innerMatch[0]).not.toContain('h-auto');
  });

  test('4. Bouton Masquer / Afficher : positionné absolument si masqué, à droite avec flex-shrink-0 si affiché', () => {
    expect(whiteboardContent).toContain(
      'absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] px-4 py-2 bg-[#2A2624]/90 rounded-full shadow-lg text-sm text-white'
    );
    expect(whiteboardContent).toContain('title="Masquer la barre d\'outils"');
    expect(whiteboardContent).toContain('setIsToolbarVisible(false)');
    expect(whiteboardContent).toContain('setIsToolbarVisible(true)');
  });

  test('5. Forçage des boutons d\'outils en taille fixe flex-shrink-0 w-10 h-10', () => {
    expect(whiteboardContent).toContain('flex-shrink-0 w-10 h-10');
    // Vérifier les boutons d'outils
    expect(whiteboardContent).toContain('title="Annuler (Ctrl+Z)"');
    expect(whiteboardContent).toContain('title="Rétablir (Ctrl+Y)"');
    expect(whiteboardContent).toContain('title="Supprimer l\'élément sélectionné (Suppr / Backspace)"');
    expect(whiteboardContent).toContain('title="Sélectionner & Manipuler (Curseur)"');
    expect(whiteboardContent).toContain("title: 'Crayon'");
    expect(whiteboardContent).toContain("title: 'Pinceau Artistique'");
    expect(whiteboardContent).toContain("title: 'Surligneur'");
    expect(whiteboardContent).toContain("title: 'Gomme'");
    expect(whiteboardContent).toContain("title: 'Texte'");
    expect(whiteboardContent).toContain('title="Bibliothèque étendue de formes vectorielles"');
    expect(whiteboardContent).toContain("title: 'Post-it'");
    expect(whiteboardContent).toContain("title: 'Déplacer (Pan)'");
    expect(whiteboardContent).toContain('title="Copier l\'élément sélectionné (Ctrl+C)"');
    expect(whiteboardContent).toContain('title="Coller l\'élément copié (Ctrl+V)"');
    expect(whiteboardContent).toContain('title="Tout effacer"');
    expect(whiteboardContent).toContain('title={isImmersiveMode ? \'Quitter le mode plein écran\' : \'Plein écran (Immersion)\'}');
  });

  test('6. Non-régression totale : Préservation des fonctionnalités et sous-menus', () => {
    expect(whiteboardContent).toContain('CURATED_PALETTE.slice(0, 5)');
    expect(whiteboardContent).toContain('BG_PRESETS.slice(0, 4)');
    expect(whiteboardContent).toContain('ref={colorInputRef}');
    expect(whiteboardContent).toContain('ref={bgColorInputRef}');
    expect(whiteboardContent).toContain('id="shapes-popover-portal"');
  });
});
