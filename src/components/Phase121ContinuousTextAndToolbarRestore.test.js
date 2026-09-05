import fs from 'fs';
import path from 'path';

describe('Phase 120 & 121 : Restauration Barre Whiteboard (Swipe) & Mode Texte Continu / Resize Tactile', () => {
  const whiteboardPath = path.join(__dirname, 'CollaborativeWhiteboardModal.jsx');
  const whiteboardContent = fs.readFileSync(whiteboardPath, 'utf-8');

  describe('Phase 120 : Restauration Barre d\'outils Swipe & Masquage', () => {
    test('1. État isToolbarVisible et bouton masquer / afficher', () => {
      expect(whiteboardContent).toContain('const [isToolbarVisible, setIsToolbarVisible] = useState(true);');
      expect(whiteboardContent).toContain('!isToolbarVisible &&');
      expect(whiteboardContent).toContain('isToolbarVisible &&');
      expect(whiteboardContent).toContain('Afficher les outils');
      expect(whiteboardContent).toContain('title="Masquer la barre d\'outils"');
    });

    test('2. Classes exactes sur le wrapper principal de la barre d\'outils (flex-row, flex-nowrap, swipe)', () => {
      expect(whiteboardContent).toContain(
        'absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] w-[95vw] max-w-3xl bg-[#2A2624]/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl flex flex-row items-center p-2'
      );
      expect(whiteboardContent).toContain(
        'flex flex-row flex-nowrap items-center gap-2 overflow-x-auto overflow-y-hidden touch-pan-x no-scrollbar w-full px-2 h-12 scroll-smooth'
      );
    });

    test('3. Ordre obligatoire des contrôles dans la barre', () => {
      // 1. Historique
      const undoIndex = whiteboardContent.indexOf('title="Annuler (Ctrl+Z)"');
      const redoIndex = whiteboardContent.indexOf('title="Rétablir (Ctrl+Y)"');
      expect(undoIndex).toBeGreaterThan(0);
      expect(redoIndex).toBeGreaterThan(undoIndex);

      // 2. Suppression de l'élément sélectionné
      const deleteSelectedIndex = whiteboardContent.indexOf('title="Supprimer l\'élément sélectionné (Suppr / Backspace)"');
      expect(deleteSelectedIndex).toBeGreaterThan(redoIndex);

      // 3. Outils principaux : Sélection, Pinceau/Crayon, Texte, Formes
      const selectIndex = whiteboardContent.indexOf('title="Sélectionner & Manipuler (Curseur)"');
      const pencilIndex = whiteboardContent.indexOf("title: 'Crayon'");
      const textIndex = whiteboardContent.indexOf("title: 'Texte'");
      const shapesIndex = whiteboardContent.indexOf('title="Bibliothèque étendue de formes vectorielles"');
      expect(selectIndex).toBeGreaterThan(deleteSelectedIndex);
      expect(pencilIndex).toBeGreaterThan(selectIndex);
      expect(textIndex).toBeGreaterThan(pencilIndex);
      expect(shapesIndex).toBeGreaterThan(textIndex);

      // 4. Styles : Palette & Range Slider
      const colorIndex = whiteboardContent.indexOf('title="Ouvrir le spectre de couleurs complet"');
      const bgIndex = whiteboardContent.indexOf('title="Personnaliser la couleur d\'arrière-plan"');
      const sliderIndex = whiteboardContent.indexOf('type="range"');
      expect(colorIndex).toBeGreaterThan(shapesIndex);
      expect(bgIndex).toBeGreaterThan(colorIndex);
      expect(sliderIndex).toBeGreaterThan(bgIndex);
    });

    test('4. Conservation intégrale des contrôles existants (Non-régression)', () => {
      expect(whiteboardContent).toContain('handleCopy');
      expect(whiteboardContent).toContain('handlePaste');
      expect(whiteboardContent).toContain('title="Tout effacer"');
      expect(whiteboardContent).toContain('setIsImmersiveMode');
      expect(whiteboardContent).toContain('id="shapes-popover-portal"');
    });
  });

  describe('Phase 121 : Mode Texte Continu & Redimensionnement Tactile Proportionnel', () => {
    test('1. Suppression du piège d\'état (ne force plus le mode select)', () => {
      // Dans le textarea onBlur, pas de setToolMode('select')
      const blurSection = whiteboardContent.slice(
        whiteboardContent.indexOf('onBlur={() => {'),
        whiteboardContent.indexOf('onChange={(e) => {')
      );
      expect(blurSection).not.toContain("setToolMode('select')");
      expect(blurSection).not.toContain("setTool('select')");
    });

    test('2. Mode texte infini continu : handlePointerDown accepte toolMode === "text"', () => {
      expect(whiteboardContent).toContain("if (tool === 'text' || toolMode === 'text')");
    });

    test('3. Stockage initial startX, startY, startFontSize au pointer down sur la poignée de redimensionnement', () => {
      expect(whiteboardContent).toContain('startFontSize: t.fontSize || 24');
      expect(whiteboardContent).toContain('setIsResizing(true)');
    });

    test('4. Formule de redimensionnement proportionnel ultra-doux avec dx et facteur 0.005', () => {
      expect(whiteboardContent).toContain('const dx = currentX - startX;');
      expect(whiteboardContent).toContain('const scale = Math.max(0.1, 1 + (dx * 0.005));');
      expect(whiteboardContent).toContain('const newFontSize = Math.max(8, Math.round(startFontSize * scale));');
    });

    test('5. Libération propre de l\'état de redimensionnement au pointer up', () => {
      expect(whiteboardContent).toContain('setIsResizing(false)');
      expect(whiteboardContent).toContain('resizingTextRef.current = null');
    });
  });
});
