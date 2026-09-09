import fs from 'fs';
import path from 'path';

describe('Phase 131 : Fusion & Reproduction Exacte de la Barre d\'outils Pillule Whiteboard (Réf. 3 Septembre)', () => {
  const whiteboardPath = path.join(__dirname, 'CollaborativeWhiteboardModal.jsx');
  const whiteboardContent = fs.readFileSync(whiteboardPath, 'utf-8');

  test('1. Conteneur principal : Pilule horizontale centrée en bas avec z-[9999] et dimensions exactes', () => {
    expect(whiteboardContent).toContain(
      'fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] h-14 bg-white dark:bg-[#1A1715] rounded-full shadow-2xl border border-gray-200 dark:border-white/10 flex items-center px-2 w-[95vw] md:w-max max-w-full'
    );
  });

  test('2. Piste de défilement interne : Strictement mono-ligne avec swipe fluide et tactile', () => {
    expect(whiteboardContent).toContain(
      'flex flex-row flex-nowrap items-center gap-1 overflow-x-auto no-scrollbar touch-pan-x h-full w-full'
    );
  });

  test('3. Absence stricte de flex-wrap ou grid sur les conteneurs de la barre', () => {
    const parentMatch = whiteboardContent.match(/className="fixed bottom-6 left-1\/2[^"]*"/);
    expect(parentMatch).toBeTruthy();
    expect(parentMatch[0]).not.toContain('flex-wrap');
    expect(parentMatch[0]).not.toContain('grid');

    const innerMatch = whiteboardContent.match(/className="flex flex-row flex-nowrap items-center gap-1[^"]*"/);
    expect(innerMatch).toBeTruthy();
    expect(innerMatch[0]).not.toContain('flex-wrap');
    expect(innerMatch[0]).not.toContain('grid');
  });

  test('4. Présence des séparateurs verticaux fins entre les 5 groupes fonctionnels', () => {
    expect(whiteboardContent).toContain(
      'w-px h-6 bg-gray-300 dark:bg-gray-700 mx-1 flex-shrink-0'
    );
    const dividers = whiteboardContent.split('w-px h-6 bg-gray-300 dark:bg-gray-700 mx-1 flex-shrink-0');
    // Il doit y avoir au moins 4 séparateurs pour séparer les 5 groupes fonctionnels
    expect(dividers.length).toBeGreaterThanOrEqual(5);
  });

  test('5. Groupe 1 (Outils) : Boutons carrés arrondis w-10 h-10 rounded-xl sans omission', () => {
    expect(whiteboardContent).toContain('title="Sélectionner & Manipuler (Curseur)"');
    expect(whiteboardContent).toContain("title: 'Crayon'");
    expect(whiteboardContent).toContain("title: 'Pinceau Artistique'");
    expect(whiteboardContent).toContain("title: 'Surligneur'");
    expect(whiteboardContent).toContain("title: 'Gomme'");
    expect(whiteboardContent).toContain('title="Bibliothèque étendue de formes vectorielles"');
    expect(whiteboardContent).toContain('title="Post-it"');
    expect(whiteboardContent).toContain('title="Texte"');
    expect(whiteboardContent).toContain('title="Déplacer (Pan)"');
    expect(whiteboardContent).toContain('ChevronDown');
  });

  test('6. Groupe 2 & 3 (Couleurs de Trait et de Fond) : Palettes et sélecteurs Hex', () => {
    expect(whiteboardContent).toContain('CURATED_PALETTE.slice(0, 5)');
    expect(whiteboardContent).toContain('ref={colorInputRef}');
    expect(whiteboardContent).toContain('BG_PRESETS.slice(0, 4)');
    expect(whiteboardContent).toContain('ref={bgColorInputRef}');
    expect(whiteboardContent).toContain('title="Ouvrir le spectre de couleurs complet"');
    expect(whiteboardContent).toContain('title="Personnaliser la couleur d\'arrière-plan"');
  });

  test('7. Groupe 4 & 5 (Épaisseurs, Historique & Actions globales) : Dots, Undo/Redo, Corbeille rouge, Plein écran', () => {
    expect(whiteboardContent).toContain('[2, 4, 8, 16].map((w)');
    expect(whiteboardContent).toContain('title="Annuler (Ctrl+Z)"');
    expect(whiteboardContent).toContain('title="Rétablir (Ctrl+Y)"');
    expect(whiteboardContent).toContain('title="Tout effacer"');
    expect(whiteboardContent).toContain("title={isImmersiveMode ? 'Quitter le mode plein écran' : 'Plein écran (Immersion)'}");
  });

  test('8. Sous-menu des Formes géométriques déporté dans un React Portal pour éviter le clipping', () => {
    expect(whiteboardContent).toContain('id="shapes-popover-portal"');
    expect(whiteboardContent).toContain('createPortal(');
  });

  test('9. Raccourcis et actions dupliquer/supprimer préservés (Non-régression)', () => {
    expect(whiteboardContent).toContain('handleCopy');
    expect(whiteboardContent).toContain('handlePaste');
    expect(whiteboardContent).toContain('handleDeleteSelected');
  });
});
