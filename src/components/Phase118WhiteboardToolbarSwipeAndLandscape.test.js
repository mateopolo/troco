import fs from 'fs';
import path from 'path';

describe('Phase 118 : Reformatage de la barre d\'outils Whiteboard (Swipe & Paysage)', () => {
  const whiteboardPath = path.join(__dirname, 'CollaborativeWhiteboardModal.jsx');
  const whiteboardContent = fs.readFileSync(whiteboardPath, 'utf-8');

  test('1. Conteneur externe de positionnement paysage et zone de sécurité iOS', () => {
    // Vérifie le conteneur positionné en bas avec safe-area-inset-bottom
    expect(whiteboardContent).toContain(
      'absolute bottom-4 left-0 right-0 z-[1000] flex justify-center pb-[env(safe-area-inset-bottom)] px-2'
    );
  });

  test('2. Wrapper principal de la barre d\'outils contraint sur une seule ligne (flex-nowrap, h-14, swipe)', () => {
    // Vérifie les classes exactes obligatoires
    expect(whiteboardContent).toContain(
      'flex flex-nowrap items-center gap-3 overflow-x-auto overflow-y-hidden snap-x snap-mandatory touch-pan-x no-scrollbar w-full max-w-[95vw] md:max-w-2xl mx-auto px-4 py-2 bg-[#2A2624]/90 rounded-2xl border border-white/10 shadow-lg h-14'
    );
  });

  test('3. Aucune classe flex-wrap ou grid sur le wrapper principal de la toolbar', () => {
    const toolbarMatch = whiteboardContent.match(
      /<div\s+className="flex flex-nowrap items-center[^"]*"/
    );
    expect(toolbarMatch).toBeTruthy();
    expect(toolbarMatch[0]).not.toContain('flex-wrap');
    expect(toolbarMatch[0]).not.toContain('grid');
  });

  test('4. Conservation intégrale de tous les outils du Whiteboard (Règle de non-régression)', () => {
    // Curseur de sélection
    expect(whiteboardContent).toContain("title=\"Sélectionner & Manipuler (Curseur)\"");
    // Outils de dessin
    expect(whiteboardContent).toContain("{ id: 'pencil', icon: Pen, title: 'Crayon' }");
    expect(whiteboardContent).toContain("{ id: 'brush', icon: Brush, title: 'Pinceau Artistique' }");
    expect(whiteboardContent).toContain("{ id: 'highlighter', icon: Highlighter, title: 'Surligneur' }");
    expect(whiteboardContent).toContain("{ id: 'eraser', icon: Eraser, title: 'Gomme' }");
    // Formes géométriques
    expect(whiteboardContent).toContain("title=\"Bibliothèque étendue de formes vectorielles\"");
    // Post-it, texte, hand
    expect(whiteboardContent).toContain("{ id: 'sticky', icon: StickyNote, title: 'Post-it', mode: 'shape' }");
    expect(whiteboardContent).toContain("{ id: 'text', icon: Type, title: 'Texte', mode: 'text' }");
    expect(whiteboardContent).toContain("{ id: 'hand', icon: Hand, title: 'Déplacer (Pan)', mode: 'pan' }");
    // Palette de couleurs et input spectre complet
    expect(whiteboardContent).toContain("CURATED_PALETTE.slice(0, 5)");
    expect(whiteboardContent).toContain("ref={colorInputRef}");
    // Arrière-plan canvas
    expect(whiteboardContent).toContain("BG_PRESETS.slice(0, 4)");
    // Épaisseur de trait
    expect(whiteboardContent).toContain("[2, 4, 8, 16].map((w)");
    // Copier / Coller / Undo / Redo / Trash / Plein écran
    expect(whiteboardContent).toContain("handleCopy");
    expect(whiteboardContent).toContain("handlePaste");
    expect(whiteboardContent).toContain("handleUndo");
    expect(whiteboardContent).toContain("handleRedo");
    expect(whiteboardContent).toContain("setIsImmersiveMode");
  });

  test('5. Support du mode paysage (landscape:) préservant une hauteur fine et collé au centre bas', () => {
    expect(whiteboardContent).toContain('landscape:bottom-2');
    expect(whiteboardContent).toContain('landscape:h-14');
  });

  test('6. Classe no-scrollbar définie dans index.css pour un swipe sans ascenseur visuel', () => {
    const indexCssPath = path.join(__dirname, '../index.css');
    const indexCssContent = fs.readFileSync(indexCssPath, 'utf-8');
    expect(indexCssContent).toContain('.no-scrollbar::-webkit-scrollbar');
    expect(indexCssContent).toContain('scrollbar-width: none;');
  });
});
