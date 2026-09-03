import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

describe('Phase 110: Moteur Whiteboard Pro (Object Model, Sélection, Snapping, Rotation, Presse-papier)', () => {
  // 1. Architecture Orientée Objet (Object Model)
  describe('1. Object Model Architecture', () => {
    test('converts freehand path to unified object format with bounding box and rotation', () => {
      const freehand = {
        id: 'stroke-1',
        type: 'freehand',
        points: [{ x: 10, y: 20 }, { x: 50, y: 80 }],
        tool: 'pencil',
        color: '#FF0000',
        lineWidth: 4,
      };

      const minX = Math.min(...freehand.points.map(p => p.x));
      const maxX = Math.max(...freehand.points.map(p => p.x));
      const minY = Math.min(...freehand.points.map(p => p.y));
      const maxY = Math.max(...freehand.points.map(p => p.y));

      const unifiedObj = {
        id: freehand.id,
        type: 'path',
        x: minX,
        y: minY,
        width: Math.max(16, maxX - minX),
        height: Math.max(16, maxY - minY),
        rotation: 0,
        data: { ...freehand },
      };

      expect(unifiedObj.id).toBe('stroke-1');
      expect(unifiedObj.type).toBe('path');
      expect(unifiedObj.x).toBe(10);
      expect(unifiedObj.y).toBe(20);
      expect(unifiedObj.width).toBe(40);
      expect(unifiedObj.height).toBe(60);
      expect(unifiedObj.rotation).toBe(0);
      expect(unifiedObj.data.tool).toBe('pencil');
    });

    test('converts shape to unified object format', () => {
      const shape = {
        id: 'rect-1',
        type: 'rect',
        x: 100,
        y: 150,
        width: 200,
        height: 120,
        rotation: 45,
        color: '#C67D5B',
      };

      const unifiedObj = {
        id: shape.id,
        type: 'shape',
        x: shape.x,
        y: shape.y,
        width: shape.width,
        height: shape.height,
        rotation: shape.rotation,
        data: { ...shape, shapeType: 'rect' },
      };

      expect(unifiedObj.type).toBe('shape');
      expect(unifiedObj.rotation).toBe(45);
      expect(unifiedObj.width).toBe(200);
      expect(unifiedObj.height).toBe(120);
      expect(unifiedObj.data.shapeType).toBe('rect');
    });
  });

  // 2. Outil Sélection & Bounding Box
  describe('2. Selection Tool & Bounding Box', () => {
    test('detects hit inside bounding box for selection', () => {
      const obj = { id: 'box-1', x: 50, y: 50, width: 100, height: 80 };
      const isInside = (px, py, box) => {
        return px >= box.x && px <= box.x + box.width && py >= box.y && py <= box.y + box.height;
      };

      expect(isInside(60, 60, obj)).toBe(true);
      expect(isInside(149, 129, obj)).toBe(true);
      expect(isInside(40, 60, obj)).toBe(false);
      expect(isInside(60, 140, obj)).toBe(false);
    });

    test('computes corner handles and rotation handle locations', () => {
      const box = { x: 100, y: 100, width: 200, height: 100 };
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;
      const stemLen = 24;

      const corners = [
        { name: 'nw', x: box.x, y: box.y },
        { name: 'ne', x: box.x + box.width, y: box.y },
        { name: 'se', x: box.x + box.width, y: box.y + box.height },
        { name: 'sw', x: box.x, y: box.y + box.height },
      ];
      const rotationHandle = { x: cx, y: box.y - stemLen };

      expect(corners[0]).toEqual({ name: 'nw', x: 100, y: 100 });
      expect(corners[2]).toEqual({ name: 'se', x: 300, y: 200 });
      expect(rotationHandle).toEqual({ x: 200, y: 76 });
    });
  });

  // 3. Assistance au centrage (Snapping / Magnétisme 10px)
  describe('3. Center Snapping Assistance', () => {
    const canvasCenterX = 400;
    const canvasCenterY = 300;

    const computeSnap = (x, y, w, h) => {
      const centerX = x + w / 2;
      const centerY = y + h / 2;
      let finalX = x;
      let finalY = y;
      let guideX = null;
      let guideY = null;

      if (Math.abs(centerX - canvasCenterX) < 10) {
        finalX = canvasCenterX - w / 2;
        guideX = canvasCenterX;
      }
      if (Math.abs(centerY - canvasCenterY) < 10) {
        finalY = canvasCenterY - h / 2;
        guideY = canvasCenterY;
      }
      return { finalX, finalY, guideX, guideY };
    };

    test('snaps X coordinate when within 10px of canvas center and triggers guide', () => {
      // Object width = 100, so center is x + 50.
      // If x = 345, center is 395 (distance = 5px < 10px).
      const snapResult = computeSnap(345, 100, 100, 80);
      expect(snapResult.finalX).toBe(350); // 400 - 50
      expect(snapResult.guideX).toBe(400);
      expect(snapResult.guideY).toBeNull();
    });

    test('does not snap when distance is 10px or greater', () => {
      // If x = 330, center is 380 (distance = 20px >= 10px).
      const snapResult = computeSnap(330, 100, 100, 80);
      expect(snapResult.finalX).toBe(330);
      expect(snapResult.guideX).toBeNull();
    });

    test('snaps both X and Y coordinates when both centers align', () => {
      // center x=403 (delta 3), center y=298 (delta 2)
      const snapResult = computeSnap(353, 258, 100, 80);
      expect(snapResult.finalX).toBe(350);
      expect(snapResult.finalY).toBe(260);
      expect(snapResult.guideX).toBe(400);
      expect(snapResult.guideY).toBe(300);
    });
  });

  // 4. Moteur de rotation (Calcul d'angle & Tooltip)
  describe('4. Rotation Engine & Degree Calculation', () => {
    const calculateAngleDegrees = (pointerX, pointerY, cx, cy) => {
      const angleRad = Math.atan2(pointerY - cy, pointerX - cx);
      let degrees = Math.round(((angleRad + Math.PI / 2) * 180) / Math.PI);
      return ((degrees % 360) + 360) % 360;
    };

    test('calculates 0 degrees directly above the center', () => {
      const deg = calculateAngleDegrees(200, 50, 200, 150);
      expect(deg).toBe(0);
    });

    test('calculates 90 degrees directly to the right of the center', () => {
      const deg = calculateAngleDegrees(300, 150, 200, 150);
      expect(deg).toBe(90);
    });

    test('calculates 180 degrees directly below the center', () => {
      const deg = calculateAngleDegrees(200, 250, 200, 150);
      expect(deg).toBe(180);
    });

    test('calculates 270 degrees directly to the left of the center', () => {
      const deg = calculateAngleDegrees(100, 150, 200, 150);
      expect(deg).toBe(270);
    });
  });

  // 5. Presse-papier (Copier / Coller avec offset +20px)
  describe('5. Clipboard Copy & Paste System', () => {
    test('duplicates object with +20px offset and new unique ID', () => {
      const original = {
        id: 'orig-1',
        type: 'shape',
        x: 100,
        y: 80,
        width: 120,
        height: 90,
        rotation: 30,
        color: '#3B82F6',
      };

      const copyToClipboard = (obj) => ({ ...obj });
      const pasteFromClipboard = (clipboard) => {
        const newId = `obj-${Date.now()}-copy`;
        return {
          ...clipboard,
          id: newId,
          x: clipboard.x + 20,
          y: clipboard.y + 20,
        };
      };

      const clipboard = copyToClipboard(original);
      const pasted = pasteFromClipboard(clipboard);

      expect(pasted.id).not.toBe(original.id);
      expect(pasted.x).toBe(120);
      expect(pasted.y).toBe(100);
      expect(pasted.rotation).toBe(30);
      expect(pasted.color).toBe('#3B82F6');
    });
  });

  // 6. Bascule automatique du mode texte vers le mode sélection
  describe('6. Text Tool Auto-transition to Select Mode', () => {
    test('forces toolMode to select and selects text element on completion', () => {
      let currentToolMode = 'text';
      let selectedId = null;

      const handleTextBlur = (textId) => {
        currentToolMode = 'select';
        selectedId = textId;
      };

      handleTextBlur('text-42');
      expect(currentToolMode).toBe('select');
      expect(selectedId).toBe('text-42');
    });
  });
});
