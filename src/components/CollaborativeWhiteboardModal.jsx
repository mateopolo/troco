import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Pen, Highlighter, Eraser, Square, Circle, ArrowRight,
  RotateCcw, RotateCw, Trash2, Download, StickyNote,
  Palette, Maximize2, Minimize2, Send, Check, GripVertical,
  Type, Grid, Hand, ZoomIn, ZoomOut, Bold, Italic, Underline,
  Brush, Edit3, CheckSquare, List, Quote, Heading1, Heading2
} from 'lucide-react';
import { doc, setDoc, onSnapshot, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';

const COLOR_PALETTE = [
  { id: 'troco', hex: '#C67D5B', name: 'Troco Terracotta' },
  { id: 'dark', hex: '#1F2937', name: 'Anthracite' },
  { id: 'white', hex: '#FFFFFF', name: 'Blanc' },
  { id: 'red', hex: '#EF4444', name: 'Rouge' },
  { id: 'blue', hex: '#3B82F6', name: 'Bleu Pro' },
  { id: 'green', hex: '#10B981', name: 'Vert Émeraude' },
  { id: 'yellow', hex: '#F59E0B', name: 'Jaune Ambre' },
  { id: 'purple', hex: '#8B5CF6', name: 'Violet Électrique' },
];

const STROKE_SIZES = [
  { size: 2, label: 'Très fin', dotSize: 4 },
  { size: 4, label: 'Fin', dotSize: 7 },
  { size: 8, label: 'Moyen', dotSize: 11 },
  { size: 14, label: 'Large', dotSize: 16 },
  { size: 24, label: 'Extra', dotSize: 22 },
];

const STICKY_COLORS = [
  { hex: '#FEF08A', name: 'Jaune' },
  { hex: '#FECDD3', name: 'Rose' },
  { hex: '#A7F3D0', name: 'Menthe' },
  { hex: '#BAE6FD', name: 'Ciel' },
  { hex: '#E9D5FF', name: 'Lavande' },
];

const FONT_FAMILIES = [
  { id: 'sans', name: 'Moderne (Inter)', font: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' },
  { id: 'serif', name: 'Éditorial (Cormorant)', font: 'Cormorant Garamond, Georgia, serif' },
  { id: 'mono', name: 'Code (Mono)', font: 'Roboto Mono, monospace' },
];

const FONT_SIZES = [14, 18, 24, 32, 44, 56];

const DEFAULT_SHARED_NOTE = `# 📝 Notes de Session & Objectifs Collaboratifs\n\n` +
  `### Points d'action du projet\n` +
  `- [x] Cadrage initial et alignement des compétences\n` +
  `- [ ] Validation de la charte graphique et du prototype\n` +
  `- [ ] Finalisation des livrables et déblocage de l'Escrow\n\n` +
  `### 💡 Idées & Réflexions Clés\n` +
  `> "La simplicité est la sophistication suprême."\n\n` +
  `Partagez ici vos comptes-rendus, listes de tâches et spécifications en direct.`;

export default function CollaborativeWhiteboardModal({
  isOpen,
  onClose,
  groupId = 'demo_group_whiteboard',
  boardId = null,
  projectTitle = 'Tableau Blanc Collaboratif',
  currentUser = null,
  darkMode = false,
  onSendToChat = null,
  initialView = 'canvas', // 'canvas' | 'notes'
}) {
  const effectiveBoardId = boardId || groupId || 'default_board';

  // Onglet supérieur : 'canvas' (Tableau blanc 0ms) ou 'notes' (Notes Partagées Apple-Style)
  const [activeTab, setActiveTab] = useState(initialView);

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const notesTextareaRef = useRef(null);

  // Outils Whiteboard : 'pencil' | 'brush' | 'highlighter' | 'eraser' | 'rect' | 'circle' | 'arrow' | 'sticky' | 'text' | 'hand'
  const [tool, setTool] = useState('pencil');
  const [color, setColor] = useState('#C67D5B');
  const [lineWidth, setLineWidth] = useState(4);
  const [showGrid, setShowGrid] = useState(true);

  // État des objets du tableau (PERSISTANCE FIRESTORE VECTORIELLE)
  const [paths, setPaths] = useState([]);
  const [stickyNotes, setStickyNotes] = useState([]);
  const [textElements, setTextElements] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  // Caméra infinie (Viewport Pan & Zoom)
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  // Édition de texte en cours
  const [editingTextId, setEditingTextId] = useState(null);

  // État Notes Partagées (Apple-Style)
  const [noteTitle, setNoteTitle] = useState('Note de collaboration - ' + projectTitle);
  const [noteContent, setNoteContent] = useState(DEFAULT_SHARED_NOTE);
  const [noteLastSaved, setNoteLastSaved] = useState('Synchronisé en direct 🟢');

  // Multi-utilisateurs & Métadonnées
  const [activeUsers, setActiveUsers] = useState(['Mateo P.', 'Collaborateur']);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [saveStatus, setSaveStatus] = useState('Synchronisé en direct 🟢');
  const [isSendingToChat, setIsSendingToChat] = useState(false);
  const [sendSuccessToast, setSendSuccessToast] = useState(false);

  // Références d'interaction & dessin 0ms
  const isDrawingRef = useRef(false);
  const currentPathRef = useRef(null);
  const startPosRef = useRef({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, origPanX: 0, origPanY: 0 });
  const touchStartDistRef = useRef(0);
  const touchStartZoomRef = useRef(1);
  const draggingStickyRef = useRef(null);
  const draggingTextRef = useRef(null);
  const isDraggingTextBBoxRef = useRef(false);

  useEffect(() => {
    if (initialView) setActiveTab(initialView);
  }, [initialView]);

  // Conversion Coordonnées Écran (Pixel) -> Coordonnées Monde (World Canvas)
  const getCanvasCoords = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, screenX: 0, screenY: 0 };
    const rect = canvas.getBoundingClientRect();
    const screenX = (e.clientX !== undefined ? e.clientX : e.touches?.[0]?.clientX || 0) - rect.left;
    const screenY = (e.clientY !== undefined ? e.clientY : e.touches?.[0]?.clientY || 0) - rect.top;

    const worldX = (screenX - pan.x) / zoom;
    const worldY = (screenY - pan.y) / zoom;
    return { x: worldX, y: worldY, screenX, screenY };
  }, [pan.x, pan.y, zoom]);

  // Configuration des propriétés du contexte 2D selon l'outil (Moteur de brosses Apple-Style)
  const applyBrushStyleToContext = (ctx, brushTool, brushColor, brushWidth) => {
    ctx.lineWidth = brushWidth;
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';

    if (brushTool === 'pencil' || brushTool === 'pen') {
      // ✏️ Crayon : Trait dur, net, opacité 100%, lineCap butt
      ctx.lineCap = 'butt';
      ctx.lineJoin = 'miter';
      ctx.globalAlpha = 1.0;
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = brushColor;
    } else if (brushTool === 'brush') {
      // 🖌️ Pinceau : Trait doux avec dégradé d'ombre pour effet aquarelle
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = 0.88;
      ctx.globalCompositeOperation = 'source-over';
      ctx.shadowBlur = Math.max(2, brushWidth * 0.85);
      ctx.shadowColor = brushColor;
      ctx.strokeStyle = brushColor;
    } else if (brushTool === 'highlighter') {
      // 🖍️ Surligneur : Trait large translucide (globalAlpha = 0.3)
      ctx.lineCap = 'square';
      ctx.lineJoin = 'bevel';
      ctx.globalAlpha = 0.3;
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = brushColor;
    } else if (brushTool === 'eraser') {
      // 🧽 Gomme : destination-out pure sans toucher à la grille CSS
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = 1.0;
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = 1.0;
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = brushColor;
    }
  };

  // Redessine l'ensemble des vecteurs sur le canvas transparent
  const redrawCanvas = useCallback((drawPaths = paths) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const dpr = window.devicePixelRatio || 1;

    // Reset du canvas HiDPI transparent
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);

    // Application de la caméra (Translation + Zoom)
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Traçage de tous les vecteurs
    drawPaths.forEach((path) => {
      ctx.save();
      ctx.beginPath();
      applyBrushStyleToContext(ctx, path.tool, path.color, path.lineWidth);

      if (path.type === 'freehand') {
        if (path.points && path.points.length > 0) {
          ctx.moveTo(path.points[0].x, path.points[0].y);
          for (let i = 1; i < path.points.length; i++) {
            ctx.lineTo(path.points[i].x, path.points[i].y);
          }
          ctx.stroke();
        }
      } else if (path.type === 'rect') {
        ctx.strokeRect(path.x, path.y, path.width, path.height);
      } else if (path.type === 'circle') {
        ctx.beginPath();
        const rx = Math.abs(path.width) / 2;
        const ry = Math.abs(path.height) / 2;
        const cx = path.x + path.width / 2;
        const cy = path.y + path.height / 2;
        ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (path.type === 'arrow') {
        ctx.beginPath();
        ctx.moveTo(path.fromX, path.fromY);
        ctx.lineTo(path.toX, path.toY);
        ctx.stroke();

        const headlen = Math.max(12, path.lineWidth * 2.5);
        const angle = Math.atan2(path.toY - path.fromY, path.toX - path.fromX);
        ctx.beginPath();
        ctx.moveTo(path.toX, path.toY);
        ctx.lineTo(path.toX - headlen * Math.cos(angle - Math.PI / 6), path.toY - headlen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(path.toX, path.toY);
        ctx.lineTo(path.toX - headlen * Math.cos(angle + Math.PI / 6), path.toY - headlen * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
      }

      ctx.restore();
    });
  }, [paths, pan.x, pan.y, zoom]);

  // Initialisation de la taille du canvas
  const updateCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    redrawCanvas();
  }, [redrawCanvas]);

  useEffect(() => {
    if (isOpen && activeTab === 'canvas') {
      setTimeout(updateCanvasSize, 50);
      window.addEventListener('resize', updateCanvasSize);
      return () => window.removeEventListener('resize', updateCanvasSize);
    }
  }, [isOpen, activeTab, updateCanvasSize]);

  // ÉTAPE 4 : SYNCHRONISATION & MÉMOIRE PERSISTANTE FIRESTORE DU WHITEBOARD
  useEffect(() => {
    if (!isOpen || !effectiveBoardId || !db) return;

    const myName = currentUser?.name || 'Moi';
    setActiveUsers([myName, 'Collaborateur en direct']);

    try {
      const docRef = doc(db, 'project_whiteboards', String(effectiveBoardId));
      const unsubscribe = onSnapshot(docRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data.paths && Array.isArray(data.paths)) {
            setPaths(data.paths);
            redrawCanvas(data.paths);
          }
          if (data.stickyNotes && Array.isArray(data.stickyNotes)) {
            setStickyNotes(data.stickyNotes);
          }
          if (data.textElements && Array.isArray(data.textElements)) {
            setTextElements(data.textElements);
          }
          if (data.activeUsers && Array.isArray(data.activeUsers)) {
            setActiveUsers(data.activeUsers);
          }
          setSaveStatus('Mémoire persistante synchronisée 🟢');
        }
      }, (err) => {
        console.warn('[Firestore Whiteboard] snapshot notice:', err);
      });

      return () => unsubscribe();
    } catch (_) {}
  }, [isOpen, effectiveBoardId, redrawCanvas, currentUser]);

  // Synchronisation Multi-joueurs en temps réel pour la Note Partagée (Apple Notes)
  useEffect(() => {
    if (!isOpen || !groupId || !db) return;

    try {
      const noteDocRef = doc(db, 'chats', String(groupId), 'workspace', 'shared_note');
      const unsubscribe = onSnapshot(noteDocRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data.title) setNoteTitle(data.title);
          if (data.content && data.lastEditor !== (currentUser?.name || currentUser?.id)) {
            setNoteContent(data.content);
          }
          setNoteLastSaved('Synchronisé en direct 🟢');
        }
      }, (err) => {
        console.warn('[Firestore Shared Note] snapshot notice:', err);
      });

      return () => unsubscribe();
    } catch (_) {}
  }, [isOpen, groupId, currentUser]);

  // Sauvegarde des vecteurs du Whiteboard sur Firestore (Mémoire Persistante)
  const syncToFirestore = useCallback(async (
    newPaths = paths,
    newStickyNotes = stickyNotes,
    newTextElements = textElements
  ) => {
    if (!effectiveBoardId || !db) return;
    try {
      setSaveStatus('Diffusion en direct...');
      const myName = currentUser?.name || 'Moi';

      // 1. Sauvegarde sur project_whiteboards
      const docRef = doc(db, 'project_whiteboards', String(effectiveBoardId));
      const payload = {
        boardId: effectiveBoardId,
        groupId: groupId,
        title: projectTitle,
        paths: newPaths.slice(-300),
        stickyNotes: newStickyNotes,
        textElements: newTextElements,
        updatedAt: serverTimestamp(),
        lastEditor: myName,
        activeUsers: [myName, 'Collaborateur en direct'],
      };

      await setDoc(docRef, payload, { merge: true });

      // 2. Sauvegarde miroir dans la sous-collection du chat pour persistance locale
      if (groupId && groupId !== 'demo_group_whiteboard') {
        const chatBoardRef = doc(db, 'chats', String(groupId), 'whiteboards', String(effectiveBoardId));
        await setDoc(chatBoardRef, payload, { merge: true }).catch(() => {});
      }

      setSaveStatus('Mémoire persistante synchronisée 🟢');
    } catch (e) {
      console.warn('[Firestore Whiteboard] write notice:', e);
      setSaveStatus('Mode local');
    }
  }, [effectiveBoardId, groupId, projectTitle, currentUser?.name, paths, stickyNotes, textElements]);

  // Sauvegarde de la Note Partagée sur Firestore
  const saveNoteToFirestore = useCallback(async (newContent, newTitle = noteTitle) => {
    if (!groupId || !db) return;
    try {
      setNoteLastSaved('Enregistrement...');
      const myName = currentUser?.name || 'Moi';
      const noteRef = doc(db, 'chats', String(groupId), 'workspace', 'shared_note');
      await setDoc(noteRef, {
        title: newTitle,
        content: newContent,
        lastEditor: myName,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      setNoteLastSaved('Synchronisé en direct 🟢');
    } catch (err) {
      console.warn('[Shared Note] Save error:', err);
      setNoteLastSaved('Mode hors-ligne');
    }
  }, [groupId, currentUser, noteTitle]);

  // 1. POINTER DOWN : Traçage direct 0ms sur le contexte 2D + Détection Bounding Box Texte
  const handlePointerDown = (e) => {
    if (tool === 'hand' || e.button === 1) {
      isPanningRef.current = true;
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        origPanX: pan.x,
        origPanY: pan.y,
      };
      return;
    }

    const coords = getCanvasCoords(e);

    // Dépôt d'un Post-it
    if (tool === 'sticky') {
      const newSticky = {
        id: `sticky-${Date.now()}`,
        x: coords.x - 90,
        y: coords.y - 60,
        text: '',
        color: '#FEF08A',
        author: currentUser?.name || 'Moi',
      };
      const updated = [...stickyNotes, newSticky];
      setStickyNotes(updated);
      syncToFirestore(paths, updated, textElements);
      setTool('pencil');
      return;
    }

    // ÉTAPE 5 : TEXTE AVEC BOUNDING BOX ÉTIRABLE
    if (tool === 'text') {
      isDrawingRef.current = true;
      isDraggingTextBBoxRef.current = true;
      startPosRef.current = coords;
      return;
    }

    // Démarrage du tracé de dessin
    isDrawingRef.current = true;
    startPosRef.current = coords;

    const actualWidth = tool === 'highlighter' ? lineWidth * 3.5 : tool === 'eraser' ? lineWidth * 4 : lineWidth;

    if (tool === 'pencil' || tool === 'pen' || tool === 'brush' || tool === 'highlighter' || tool === 'eraser') {
      currentPathRef.current = {
        id: `p-${Date.now()}`,
        tool,
        color,
        lineWidth: actualWidth,
        type: 'freehand',
        points: [coords],
      };

      // MOTEUR ZÉRO LATENCE : Traçage immédiat sur le Canvas direct
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.save();
          const dpr = window.devicePixelRatio || 1;
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.scale(dpr, dpr);
          ctx.translate(pan.x, pan.y);
          ctx.scale(zoom, zoom);

          ctx.beginPath();
          applyBrushStyleToContext(ctx, tool, color, actualWidth);

          ctx.moveTo(coords.x, coords.y);
          ctx.lineTo(coords.x, coords.y);
          ctx.stroke();
          ctx.restore();
        }
      }
    }
  };

  // 2. POINTER MOVE : Traçage 0ms direct sous le doigt / souris sans re-render React
  const handlePointerMove = (e) => {
    if (isPanningRef.current) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      setPan({
        x: panStartRef.current.origPanX + dx,
        y: panStartRef.current.origPanY + dy,
      });
      return;
    }

    if (!isDrawingRef.current) return;
    const coords = getCanvasCoords(e);

    // ÉTAPE 5 : Prévisualisation de la Bounding Box de texte en étirement
    if (isDraggingTextBBoxRef.current) {
      redrawCanvas();
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.save();
          const dpr = window.devicePixelRatio || 1;
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.scale(dpr, dpr);
          ctx.translate(pan.x, pan.y);
          ctx.scale(zoom, zoom);

          const sx = Math.min(startPosRef.current.x, coords.x);
          const sy = Math.min(startPosRef.current.y, coords.y);
          const w = Math.abs(coords.x - startPosRef.current.x);
          const h = Math.abs(coords.y - startPosRef.current.y);

          ctx.strokeStyle = color;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([5, 4]);
          ctx.strokeRect(sx, sy, w, h);

          ctx.fillStyle = 'rgba(198, 125, 91, 0.08)';
          ctx.fillRect(sx, sy, w, h);

          const estFontSize = Math.min(72, Math.max(14, Math.round(h * 0.7)));
          ctx.fillStyle = color;
          ctx.font = `${estFontSize}px Inter, sans-serif`;
          ctx.fillText('Aa', sx + 8, sy + estFontSize);

          ctx.restore();
        }
      }
      return;
    }

    if (tool === 'pencil' || tool === 'pen' || tool === 'brush' || tool === 'highlighter' || tool === 'eraser') {
      if (!currentPathRef.current) return;
      const pts = currentPathRef.current.points;
      const prev = pts[pts.length - 1] || coords;
      pts.push(coords);

      // Traçage direct dans le DOM à 0ms de latence (120 FPS)
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.save();
          const dpr = window.devicePixelRatio || 1;
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.scale(dpr, dpr);
          ctx.translate(pan.x, pan.y);
          ctx.scale(zoom, zoom);

          ctx.beginPath();
          applyBrushStyleToContext(ctx, tool, currentPathRef.current.color, currentPathRef.current.lineWidth);

          ctx.moveTo(prev.x, prev.y);
          ctx.lineTo(coords.x, coords.y);
          ctx.stroke();
          ctx.restore();
        }
      }
    } else {
      // Prévisualisation des formes géométriques
      redrawCanvas();
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.save();
          const dpr = window.devicePixelRatio || 1;
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.scale(dpr, dpr);
          ctx.translate(pan.x, pan.y);
          ctx.scale(zoom, zoom);

          ctx.beginPath();
          ctx.strokeStyle = color;
          ctx.lineWidth = lineWidth;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.setLineDash([6, 4]);

          const sx = startPosRef.current.x;
          const sy = startPosRef.current.y;
          const w = coords.x - sx;
          const h = coords.y - sy;

          if (tool === 'rect') {
            ctx.strokeRect(sx, sy, w, h);
          } else if (tool === 'circle') {
            const rx = Math.abs(w) / 2;
            const ry = Math.abs(h) / 2;
            const cx = sx + w / 2;
            const cy = sy + h / 2;
            ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
            ctx.stroke();
          } else if (tool === 'arrow') {
            ctx.moveTo(sx, sy);
            ctx.lineTo(coords.x, coords.y);
            ctx.stroke();
          }
          ctx.restore();
        }
      }
    }
  };

  // 3. POINTER UP : Validation du tracé et commit dans le state & Firestore
  const handlePointerUp = (e) => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      return;
    }

    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const coords = getCanvasCoords(e);

    // ÉTAPE 5 : Validation Bounding Box Texte Étiré
    if (isDraggingTextBBoxRef.current) {
      isDraggingTextBBoxRef.current = false;
      const boxW = Math.abs(coords.x - startPosRef.current.x);
      const boxH = Math.abs(coords.y - startPosRef.current.y);
      const startX = Math.min(coords.x, startPosRef.current.x);
      const startY = Math.min(coords.y, startPosRef.current.y);

      let calcFontSize = 20;
      let finalW = Math.max(140, boxW);

      if (boxW > 25 && boxH > 15) {
        calcFontSize = Math.min(72, Math.max(14, Math.round(boxH * 0.7)));
      }

      const newText = {
        id: `text-${Date.now()}`,
        x: startX,
        y: startY,
        width: finalW,
        height: Math.max(30, boxH),
        text: 'Nouveau texte',
        fontFamily: 'Inter, sans-serif',
        fontSize: calcFontSize,
        color: color,
        isBold: false,
        isItalic: false,
        isUnderline: false,
        author: currentUser?.name || 'Moi',
      };

      const updated = [...textElements, newText];
      setTextElements(updated);
      setEditingTextId(newText.id);
      syncToFirestore(paths, stickyNotes, updated);
      setTool('pencil');
      redrawCanvas();
      return;
    }

    let newPath = null;
    if (tool === 'pencil' || tool === 'pen' || tool === 'brush' || tool === 'highlighter' || tool === 'eraser') {
      if (currentPathRef.current && currentPathRef.current.points.length > 0) {
        newPath = currentPathRef.current;
      }
    } else if (tool === 'rect') {
      newPath = {
        id: `rect-${Date.now()}`,
        type: 'rect',
        color,
        lineWidth,
        x: startPosRef.current.x,
        y: startPosRef.current.y,
        width: coords.x - startPosRef.current.x,
        height: coords.y - startPosRef.current.y,
      };
    } else if (tool === 'circle') {
      newPath = {
        id: `circle-${Date.now()}`,
        type: 'circle',
        color,
        lineWidth,
        x: startPosRef.current.x,
        y: startPosRef.current.y,
        width: coords.x - startPosRef.current.x,
        height: coords.y - startPosRef.current.y,
      };
    } else if (tool === 'arrow') {
      newPath = {
        id: `arrow-${Date.now()}`,
        type: 'arrow',
        color,
        lineWidth,
        fromX: startPosRef.current.x,
        fromY: startPosRef.current.y,
        toX: coords.x,
        toY: coords.y,
      };
    }

    if (newPath) {
      const updatedPaths = [...paths, newPath];
      setPaths(updatedPaths);
      setRedoStack([]);
      redrawCanvas(updatedPaths);
      syncToFirestore(updatedPaths, stickyNotes, textElements);
    }

    currentPathRef.current = null;
  };

  // GESTION DU DÉPLACEMENT TACTILE À 2 DOIGTS (PANNING & PINCH-ZOOM)
  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      isDrawingRef.current = false;
      isDraggingTextBBoxRef.current = false;
      isPanningRef.current = true;
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      touchStartDistRef.current = dist;
      touchStartZoomRef.current = zoom;
      panStartRef.current = {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2,
        origPanX: pan.x,
        origPanY: pan.y,
      };
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && isPanningRef.current) {
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const currentMidX = (t1.clientX + t2.clientX) / 2;
      const currentMidY = (t1.clientY + t2.clientY) / 2;
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

      if (touchStartDistRef.current > 0) {
        const factor = dist / touchStartDistRef.current;
        const newZoom = Math.min(3.0, Math.max(0.3, touchStartZoomRef.current * factor));
        setZoom(newZoom);
      }

      const dx = currentMidX - panStartRef.current.x;
      const dy = currentMidY - panStartRef.current.y;
      setPan({
        x: panStartRef.current.origPanX + dx,
        y: panStartRef.current.origPanY + dy,
      });
    }
  };

  // Annuler (Undo)
  const handleUndo = () => {
    if (paths.length === 0) return;
    const last = paths[paths.length - 1];
    const newPaths = paths.slice(0, -1);
    setPaths(newPaths);
    setRedoStack(prev => [last, ...prev]);
    redrawCanvas(newPaths);
    syncToFirestore(newPaths, stickyNotes, textElements);
  };

  // Rétablir (Redo)
  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[0];
    const newRedo = redoStack.slice(1);
    const newPaths = [...paths, next];
    setPaths(newPaths);
    setRedoStack(newRedo);
    redrawCanvas(newPaths);
    syncToFirestore(newPaths, stickyNotes, textElements);
  };

  // Réinitialiser tout
  const handleClearAll = () => {
    if (window.confirm("Voulez-vous réinitialiser l'ensemble du tableau blanc persistant, des textes et des post-its ?")) {
      setPaths([]);
      setRedoStack([]);
      setStickyNotes([]);
      setTextElements([]);
      redrawCanvas([]);
      syncToFirestore([], [], []);
    }
  };

  // Déplacement d'un Post-it
  const handleStickyPointerDown = (id, e) => {
    e.stopPropagation();
    const sticky = stickyNotes.find(s => s.id === id);
    if (!sticky) return;

    draggingStickyRef.current = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      origX: sticky.x,
      origY: sticky.y,
    };

    const handlePointerMoveSticky = (moveEvt) => {
      if (!draggingStickyRef.current) return;
      const dx = (moveEvt.clientX - draggingStickyRef.current.startX) / zoom;
      const dy = (moveEvt.clientY - draggingStickyRef.current.startY) / zoom;

      setStickyNotes(prev => prev.map(s => s.id === id ? {
        ...s,
        x: draggingStickyRef.current.origX + dx,
        y: draggingStickyRef.current.origY + dy,
      } : s));
    };

    const handlePointerUpSticky = () => {
      window.removeEventListener('pointermove', handlePointerMoveSticky);
      window.removeEventListener('pointerup', handlePointerUpSticky);
      if (draggingStickyRef.current) {
        draggingStickyRef.current = null;
        setStickyNotes(currentStickies => {
          syncToFirestore(paths, currentStickies, textElements);
          return currentStickies;
        });
      }
    };

    window.addEventListener('pointermove', handlePointerMoveSticky);
    window.addEventListener('pointerup', handlePointerUpSticky);
  };

  // Déplacement d'un Texte
  const handleTextPointerDown = (id, e) => {
    e.stopPropagation();
    const txt = textElements.find(t => t.id === id);
    if (!txt) return;

    draggingTextRef.current = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      origX: txt.x,
      origY: txt.y,
    };

    const handlePointerMoveText = (moveEvt) => {
      if (!draggingTextRef.current) return;
      const dx = (moveEvt.clientX - draggingTextRef.current.startX) / zoom;
      const dy = (moveEvt.clientY - draggingTextRef.current.startY) / zoom;

      setTextElements(prev => prev.map(t => t.id === id ? {
        ...t,
        x: draggingTextRef.current.origX + dx,
        y: draggingTextRef.current.origY + dy,
      } : t));
    };

    const handlePointerUpText = () => {
      window.removeEventListener('pointermove', handlePointerMoveText);
      window.removeEventListener('pointerup', handlePointerUpText);
      if (draggingTextRef.current) {
        draggingTextRef.current = null;
        setTextElements(currentTexts => {
          syncToFirestore(paths, stickyNotes, currentTexts);
          return currentTexts;
        });
      }
    };

    window.addEventListener('pointermove', handlePointerMoveText);
    window.addEventListener('pointerup', handlePointerUpText);
  };

  // Mise à jour de style de texte
  const updateTextStyle = (id, updates) => {
    const updated = textElements.map(t => t.id === id ? { ...t, ...updates } : t);
    setTextElements(updated);
    syncToFirestore(paths, stickyNotes, updated);
  };

  // Suppression d'un Texte
  const handleDeleteText = (id) => {
    const updated = textElements.filter(t => t.id !== id);
    setTextElements(updated);
    if (editingTextId === id) setEditingTextId(null);
    syncToFirestore(paths, stickyNotes, updated);
  };

  // Formatage rapide Markdown pour Notes Partagées
  const insertNoteFormatting = (prefix, suffix = '') => {
    const textarea = notesTextareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = noteContent;
    const selected = current.substring(start, end);
    const replacement = `${prefix}${selected || 'texte'}${suffix}`;
    const nextContent = current.substring(0, start) + replacement + current.substring(end);
    setNoteContent(nextContent);
    saveNoteToFirestore(nextContent);
  };

  // EXPORT INTELLIGENT AVEC RECADRAGE AUTOMATIQUE (SMART CROPPING / BOUNDING BOX)
  const generateCompositeSnapshotDataUrl = () => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    paths.forEach(p => {
      if (p.points) {
        p.points.forEach(pt => {
          minX = Math.min(minX, pt.x);
          maxX = Math.max(maxX, pt.x);
          minY = Math.min(minY, pt.y);
          maxY = Math.max(maxY, pt.y);
        });
      } else if (p.x !== undefined && p.width !== undefined) {
        minX = Math.min(minX, p.x, p.x + p.width);
        maxX = Math.max(maxX, p.x, p.x + p.width);
        minY = Math.min(minY, p.y, p.y + p.height);
        maxY = Math.max(maxY, p.y, p.y + p.height);
      } else if (p.fromX !== undefined) {
        minX = Math.min(minX, p.fromX, p.toX);
        maxX = Math.max(maxX, p.fromX, p.toX);
        minY = Math.min(minY, p.fromY, p.toY);
        maxY = Math.max(maxY, p.fromY, p.toY);
      }
    });

    stickyNotes.forEach(s => {
      minX = Math.min(minX, s.x);
      minY = Math.min(minY, s.y);
      maxX = Math.max(maxX, s.x + 200);
      maxY = Math.max(maxY, s.y + 140);
    });

    textElements.forEach(t => {
      minX = Math.min(minX, t.x);
      minY = Math.min(minY, t.y);
      maxX = Math.max(maxX, t.x + (t.width || 240));
      maxY = Math.max(maxY, t.y + (t.height || 80));
    });

    if (minX === Infinity) {
      minX = 0;
      minY = 0;
      maxX = 800;
      maxY = 600;
    }

    const padding = 30;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;

    const cropWidth = Math.max(200, maxX - minX);
    const cropHeight = Math.max(150, maxY - minY);

    const exportCanvas = document.createElement('canvas');
    const dpr = 2;
    exportCanvas.width = cropWidth * dpr;
    exportCanvas.height = cropHeight * dpr;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return null;

    ctx.scale(dpr, dpr);
    ctx.fillStyle = darkMode ? '#181513' : '#FAF8F5';
    ctx.fillRect(0, 0, cropWidth, cropHeight);

    if (showGrid) {
      ctx.strokeStyle = darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
      ctx.lineWidth = 1;
      const gSize = 28;
      for (let x = 0; x < cropWidth; x += gSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, cropHeight);
        ctx.stroke();
      }
      for (let y = 0; y < cropHeight; y += gSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(cropWidth, y);
        ctx.stroke();
      }
    }

    ctx.save();
    ctx.translate(-minX, -minY);

    paths.forEach(path => {
      ctx.save();
      ctx.beginPath();
      applyBrushStyleToContext(ctx, path.tool, path.color, path.lineWidth);

      if (path.tool === 'eraser') {
        ctx.strokeStyle = darkMode ? '#181513' : '#FAF8F5';
        ctx.lineWidth = path.lineWidth * 1.5;
      }

      if (path.type === 'freehand' && path.points?.length > 0) {
        ctx.moveTo(path.points[0].x, path.points[0].y);
        for (let i = 1; i < path.points.length; i++) {
          ctx.lineTo(path.points[i].x, path.points[i].y);
        }
        ctx.stroke();
      } else if (path.type === 'rect') {
        ctx.strokeRect(path.x, path.y, path.width, path.height);
      } else if (path.type === 'circle') {
        const rx = Math.abs(path.width) / 2;
        const ry = Math.abs(path.height) / 2;
        const cx = path.x + path.width / 2;
        const cy = path.y + path.height / 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (path.type === 'arrow') {
        ctx.beginPath();
        ctx.moveTo(path.fromX, path.fromY);
        ctx.lineTo(path.toX, path.toY);
        ctx.stroke();
        const headlen = Math.max(12, path.lineWidth * 2.5);
        const angle = Math.atan2(path.toY - path.fromY, path.toX - path.fromX);
        ctx.beginPath();
        ctx.moveTo(path.toX, path.toY);
        ctx.lineTo(path.toX - headlen * Math.cos(angle - Math.PI / 6), path.toY - headlen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(path.toX, path.toY);
        ctx.lineTo(path.toX - headlen * Math.cos(angle + Math.PI / 6), path.toY - headlen * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
      }
      ctx.restore();
    });

    stickyNotes.forEach(sticky => {
      ctx.save();
      const w = 180;
      const h = 120;
      ctx.fillStyle = sticky.color || '#FEF08A';
      ctx.beginPath();
      ctx.roundRect(sticky.x, sticky.y, w, h, 12);
      ctx.fill();

      ctx.strokeStyle = 'rgba(0,0,0,0.12)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#6B7280';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText(sticky.author || 'Post-it', sticky.x + 10, sticky.y + 18);

      ctx.fillStyle = '#1F2937';
      ctx.font = '12px sans-serif';
      const words = (sticky.text || '').split(' ');
      let line = '';
      let lineY = sticky.y + 36;
      for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i] + ' ';
        if (ctx.measureText(testLine).width > w - 24 && i > 0) {
          ctx.fillText(line, sticky.x + 10, lineY);
          line = words[i] + ' ';
          lineY += 15;
          if (lineY > sticky.y + h - 10) break;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, sticky.x + 10, lineY);
      ctx.restore();
    });

    textElements.forEach(txt => {
      ctx.save();
      let fontStyle = '';
      if (txt.isItalic) fontStyle += 'italic ';
      if (txt.isBold) fontStyle += 'bold ';
      fontStyle += `${txt.fontSize || 20}px ${txt.fontFamily || 'Inter, sans-serif'}`;

      ctx.font = fontStyle;
      ctx.fillStyle = txt.color || '#C67D5B';
      ctx.fillText(txt.text || '', txt.x, txt.y + (txt.fontSize || 20));

      if (txt.isUnderline) {
        const metrics = ctx.measureText(txt.text || '');
        ctx.strokeStyle = txt.color || '#C67D5B';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(txt.x, txt.y + (txt.fontSize || 20) + 3);
        ctx.lineTo(txt.x + metrics.width, txt.y + (txt.fontSize || 20) + 3);
        ctx.stroke();
      }
      ctx.restore();
    });

    ctx.restore();
    return exportCanvas.toDataURL('image/png');
  };

  // Télécharger le tableau recadré
  const handleDownload = () => {
    if (activeTab === 'canvas') {
      const dataUrl = generateCompositeSnapshotDataUrl();
      if (!dataUrl) return;
      const link = document.createElement('a');
      link.download = `whiteboard-${projectTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } else {
      const blob = new Blob([noteContent], { type: 'text/markdown;charset=utf-8' });
      const link = document.createElement('a');
      link.download = `${noteTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
      link.href = URL.createObjectURL(blob);
      link.click();
    }
  };

  // ÉTAPE 4 : ENVOI DE CARTE INTERACTIVE PERSISTANTE DANS LA CONVERSATION
  const handleSendToChatAction = async () => {
    setIsSendingToChat(true);
    try {
      if (activeTab === 'canvas') {
        // 1. Sauvegarde explicite de l'état persistant dans Firestore
        await syncToFirestore(paths, stickyNotes, textElements);

        if (db && groupId) {
          const authorName = currentUser?.name || 'Moi';
          const caption = `🎨 ${authorName} a partagé un Tableau Blanc Collaboratif`;

          await addDoc(collection(db, 'chats', String(groupId), 'messages'), {
            text: caption,
            type: 'workspace_invite',
            kind: 'workspace_invite',
            workspaceType: 'whiteboard',
            boardId: effectiveBoardId,
            workspaceTitle: projectTitle,
            sender: currentUser?.id || currentUser?.name || 'me',
            senderName: authorName,
            senderAvatar: currentUser?.avatar || '',
            timestamp: serverTimestamp(),
            createdAt: Date.now(),
          });

          await setDoc(doc(db, 'chats', String(groupId)), {
            lastMessage: caption,
            lastMessageTimestamp: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }, { merge: true });
        }

        if (onSendToChat) onSendToChat(effectiveBoardId);
      } else {
        if (db && groupId) {
          const authorName = currentUser?.name || 'Moi';
          const caption = `📝 Note partagée : ${noteTitle}`;
          await addDoc(collection(db, 'chats', String(groupId), 'messages'), {
            text: caption,
            type: 'workspace_invite',
            kind: 'workspace_invite',
            workspaceType: 'notes',
            workspaceTitle: noteTitle,
            sender: currentUser?.id || currentUser?.name || 'me',
            senderName: authorName,
            senderAvatar: currentUser?.avatar || '',
            timestamp: serverTimestamp(),
            createdAt: Date.now(),
          });
        }
      }

      setSendSuccessToast(true);
      setTimeout(() => {
        setSendSuccessToast(false);
        onClose();
      }, 1200);
    } catch (err) {
      console.warn('[Whiteboard] Send notice:', err);
    } finally {
      setIsSendingToChat(false);
    }
  };

  if (!isOpen) return null;

  // Calcul du background CSS pour la grille découplée
  const bgGridStyle = showGrid
    ? (darkMode
        ? `radial-gradient(circle, rgba(255, 255, 255, 0.12) 1.2px, transparent 1.2px)`
        : `radial-gradient(circle, rgba(45, 40, 37, 0.14) 1.2px, transparent 1.2px)`)
    : 'none';
  const bgGridSize = `${28 * zoom}px ${28 * zoom}px`;
  const bgGridPos = `${pan.x % (28 * zoom)}px ${pan.y % (28 * zoom)}px`;

  const modalElement = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000000,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isFullscreen ? 0 : '12px 12px max(80px, env(safe-area-inset-bottom, 24px)) 12px',
        animation: 'fadeIn 0.2s ease both',
        boxSizing: 'border-box',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: isFullscreen ? '100vw' : '100%',
          maxWidth: isFullscreen ? '100vw' : '1140px',
          height: isFullscreen ? '100dvh' : 'min(calc(100dvh - 80px), 860px)',
          backgroundColor: darkMode ? '#181412' : '#FAF8F5',
          borderRadius: isFullscreen ? 0 : '24px',
          border: isFullscreen ? 'none' : '1px solid var(--border-color)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'scaleUp 0.25s ease both',
          boxSizing: 'border-box',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* TOAST DE SUCCÈS D'INJECTION CHAT */}
        {sendSuccessToast && (
          <div
            style={{
              position: 'absolute',
              top: '70px',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: '#10B981',
              color: '#FFFFFF',
              padding: '8px 20px',
              borderRadius: '999px',
              fontWeight: '800',
              fontSize: '13px',
              zIndex: 100,
              boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              animation: 'fadeSlideDown 0.25s ease',
            }}
          >
            <Check size={16} />
            <span>Document synchronisé & injecté dans la discussion ! 💬🚀</span>
          </div>
        )}

        {/* 1. EN-TÊTE WORKSPACE AVEC SEGMENTED SWITCHER (TABLEAU BLANC / NOTES PARTAGÉES) */}
        <div
          style={{
            padding: '10px 16px',
            borderBottom: '1px solid var(--border-color)',
            backgroundColor: darkMode ? 'rgba(28, 24, 21, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            {/* SÉLECTEUR D'ONGLET DU WORKSPACE */}
            <div
              style={{
                display: 'flex',
                backgroundColor: 'var(--bg-subtle)',
                padding: '3px',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
              }}
            >
              <button
                type="button"
                onClick={() => setActiveTab('canvas')}
                style={{
                  border: 'none',
                  backgroundColor: activeTab === 'canvas' ? 'var(--accent-primary)' : 'transparent',
                  color: activeTab === 'canvas' ? '#FFFFFF' : 'var(--text-secondary)',
                  padding: '6px 12px',
                  borderRadius: '9px',
                  fontSize: '12px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                <Palette size={14} />
                <span>Tableau Blanc (0ms)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('notes')}
                style={{
                  border: 'none',
                  backgroundColor: activeTab === 'notes' ? '#F59E0B' : 'transparent',
                  color: activeTab === 'notes' ? '#FFFFFF' : 'var(--text-secondary)',
                  padding: '6px 12px',
                  borderRadius: '9px',
                  fontSize: '12px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                <Edit3 size={14} />
                <span>Notes Partagées (Apple-Style)</span>
              </button>
            </div>

            {/* PRÉSENCE & STATUT DE SAUVEGARDE */}
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10B981', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '2px 8px', borderRadius: '999px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block', animation: 'pulse 1.8s infinite' }} />
                  {activeUsers.length} en direct
                </span>
                <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                  {activeTab === 'canvas' ? saveStatus : noteLastSaved}
                </span>
              </div>
            </div>
          </div>

          {/* ACTIONS HEADER */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <button
              type="button"
              onClick={handleSendToChatAction}
              disabled={isSendingToChat}
              className="premium-button"
              style={{
                border: 'none',
                background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)',
                color: '#FFFFFF',
                borderRadius: '10px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: '800',
                cursor: isSendingToChat ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: 'var(--shadow-accent)',
              }}
              title="Partager et sauvegarder dans la conversation"
            >
              <Send size={13} />
              <span>{isSendingToChat ? 'Envoi...' : 'Partager au chat'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="premium-button"
              style={{
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-main)',
                borderRadius: '8px',
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              title={activeTab === 'canvas' ? "Télécharger l'image recadrée (PNG)" : "Télécharger la note (Markdown)"}
            >
              <Download size={13} />
            </button>

            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="premium-button"
              style={{
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-main)',
                borderRadius: '8px',
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              title={isFullscreen ? "Réduire" : "Plein écran"}
            >
              {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="premium-button"
              style={{
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-main)',
                borderRadius: '8px',
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              title="Fermer"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* 2. VUE A : TABLEAU BLANC AVEC MOTEUR DE BROSSES APPLE-STYLE */}
        {activeTab === 'canvas' && (
          <>
            {/* BARRE D'OUTILS PRINCIPALE */}
            <div
              style={{
                padding: '6px 12px',
                borderBottom: '1px solid var(--border-color)',
                backgroundColor: darkMode ? '#1F1B18' : '#FAF8F5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                flexWrap: 'wrap',
                flexShrink: 0,
              }}
            >
              {/* SÉLECTION DES OUTILS DE BROSSES STYLE APPLE NOTES */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px', backgroundColor: 'var(--bg-card)', padding: '2px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                {[
                  { id: 'pencil', icon: Pen, title: 'Crayon (Pencil) : Trait dur & précis' },
                  { id: 'brush', icon: Brush, title: 'Pinceau (Brush) : Trait aquarelle doux avec ombre' },
                  { id: 'highlighter', icon: Highlighter, title: 'Surligneur (Marker) : Translucide' },
                  { id: 'eraser', icon: Eraser, title: 'Gomme transparente' },
                  { id: 'rect', icon: Square, title: 'Rectangle' },
                  { id: 'circle', icon: Circle, title: 'Cercle' },
                  { id: 'arrow', icon: ArrowRight, title: 'Flèche' },
                  { id: 'text', icon: Type, title: 'Texte étirable (Bounding Box dynamique)' },
                  { id: 'sticky', icon: StickyNote, title: 'Post-it' },
                  { id: 'hand', icon: Hand, title: 'Déplacement (Pan)' },
                ].map(t => {
                  const Icon = t.icon;
                  const isActive = tool === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTool(t.id)}
                      style={{
                        border: 'none',
                        backgroundColor: isActive ? 'var(--accent-primary)' : 'transparent',
                        color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
                        width: '30px',
                        height: '30px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      title={t.title}
                    >
                      <Icon size={14} />
                    </button>
                  );
                })}
              </div>

              {/* PALETTE CHROMATIQUE */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                {COLOR_PALETTE.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setColor(c.hex)}
                    style={{
                      border: color === c.hex ? '2.5px solid var(--text-main)' : '1px solid rgba(0,0,0,0.1)',
                      backgroundColor: c.hex,
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      transform: color === c.hex ? 'scale(1.2)' : 'scale(1)',
                      transition: 'transform 0.15s ease',
                    }}
                    title={c.name}
                  />
                ))}
              </div>

              {/* ÉPAISSEUR DU TRAIT */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'var(--bg-card)', padding: '3px 6px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                {STROKE_SIZES.map(s => {
                  const isSelected = lineWidth === s.size;
                  return (
                    <button
                      key={s.size}
                      type="button"
                      onClick={() => setLineWidth(s.size)}
                      style={{
                        border: isSelected ? '1.5px solid var(--accent-primary)' : '1px solid transparent',
                        backgroundColor: isSelected ? 'rgba(198, 125, 91, 0.15)' : 'transparent',
                        width: '24px',
                        height: '24px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                      title={`${s.label} (${s.size}px)`}
                    >
                      <span
                        style={{
                          width: `${s.dotSize}px`,
                          height: `${s.dotSize}px`,
                          borderRadius: '50%',
                          backgroundColor: color,
                          display: 'inline-block',
                        }}
                      />
                    </button>
                  );
                })}
              </div>

              {/* ACTIONS : TOGGLE GRILLE + UNDO/REDO + CLEAR */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => setShowGrid(!showGrid)}
                  style={{
                    border: '1px solid var(--border-color)',
                    backgroundColor: showGrid ? 'rgba(198, 125, 91, 0.15)' : 'var(--bg-card)',
                    color: showGrid ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                  title={showGrid ? "Masquer la grille" : "Afficher la grille"}
                >
                  <Grid size={13} />
                </button>

                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={paths.length === 0}
                  style={{
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: paths.length === 0 ? 'not-allowed' : 'pointer',
                    opacity: paths.length === 0 ? 0.4 : 1,
                  }}
                  title="Annuler (Ctrl+Z)"
                >
                  <RotateCcw size={12} />
                </button>

                <button
                  type="button"
                  onClick={handleRedo}
                  disabled={redoStack.length === 0}
                  style={{
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: redoStack.length === 0 ? 'not-allowed' : 'pointer',
                    opacity: redoStack.length === 0 ? 0.4 : 1,
                  }}
                  title="Rétablir (Ctrl+Y)"
                >
                  <RotateCw size={12} />
                </button>

                <button
                  type="button"
                  onClick={handleClearAll}
                  style={{
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    color: '#EF4444',
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                  title="Effacer tout"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>

            {/* ZONE PRINCIPALE DU CANVAS AVEC DÉPLACEMENT FLUIDE 2 DOIGTS */}
            <div
              ref={containerRef}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              style={{
                flex: 1,
                minHeight: 0,
                position: 'relative',
                overflow: 'hidden',
                backgroundColor: darkMode ? '#181513' : '#FAF8F5',
                backgroundImage: bgGridStyle,
                backgroundSize: bgGridSize,
                backgroundPosition: bgGridPos,
                touchAction: 'none',
                cursor: tool === 'hand' ? (isPanningRef.current ? 'grabbing' : 'grab') : tool === 'text' ? 'crosshair' : tool === 'sticky' ? 'copy' : tool === 'eraser' ? 'cell' : 'crosshair',
              }}
            >
              <canvas
                ref={canvasRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                style={{
                  display: 'block',
                  width: '100%',
                  height: '100%',
                  touchAction: 'none',
                }}
              />

              {/* TEXTES BOUNDING BOX ÉTIRABLES */}
              {textElements.map((txt) => {
                const isEditing = editingTextId === txt.id;
                const screenPosX = txt.x * zoom + pan.x;
                const screenPosY = txt.y * zoom + pan.y;
                const screenW = (txt.width || 180) * zoom;

                return (
                  <div
                    key={txt.id}
                    style={{
                      position: 'absolute',
                      left: `${screenPosX}px`,
                      top: `${screenPosY}px`,
                      width: `${screenW}px`,
                      transformOrigin: 'top left',
                      zIndex: isEditing ? 25 : 15,
                      minWidth: '100px',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {isEditing && (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: '100%',
                          left: 0,
                          marginBottom: '6px',
                          backgroundColor: 'var(--bg-card)',
                          borderRadius: '12px',
                          padding: '4px 8px',
                          border: '1px solid var(--border-color)',
                          boxShadow: '0 8px 20px rgba(0,0,0,0.25)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          whiteSpace: 'nowrap',
                          animation: 'fadeSlideUp 0.15s ease',
                          zIndex: 30,
                        }}
                      >
                        <select
                          value={txt.fontFamily}
                          onChange={(e) => updateTextStyle(txt.id, { fontFamily: e.target.value })}
                          style={{ border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-main)', fontSize: '11px', borderRadius: '6px', padding: '2px 4px', outline: 'none' }}
                        >
                          {FONT_FAMILIES.map(f => (
                            <option key={f.id} value={f.font}>{f.name}</option>
                          ))}
                        </select>

                        <select
                          value={txt.fontSize}
                          onChange={(e) => updateTextStyle(txt.id, { fontSize: parseInt(e.target.value, 10) })}
                          style={{ border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-main)', fontSize: '11px', borderRadius: '6px', padding: '2px 4px', outline: 'none' }}
                        >
                          {FONT_SIZES.map(s => (
                            <option key={s} value={s}>{s}px</option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={() => updateTextStyle(txt.id, { isBold: !txt.isBold })}
                          style={{ border: 'none', backgroundColor: txt.isBold ? 'var(--accent-primary)' : 'transparent', color: txt.isBold ? '#FFF' : 'var(--text-main)', borderRadius: '4px', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                        >
                          <Bold size={12} />
                        </button>

                        <button
                          type="button"
                          onClick={() => updateTextStyle(txt.id, { isItalic: !txt.isItalic })}
                          style={{ border: 'none', backgroundColor: txt.isItalic ? 'var(--accent-primary)' : 'transparent', color: txt.isItalic ? '#FFF' : 'var(--text-main)', borderRadius: '4px', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                        >
                          <Italic size={12} />
                        </button>

                        <button
                          type="button"
                          onClick={() => updateTextStyle(txt.id, { isUnderline: !txt.isUnderline })}
                          style={{ border: 'none', backgroundColor: txt.isUnderline ? 'var(--accent-primary)' : 'transparent', color: txt.isUnderline ? '#FFF' : 'var(--text-main)', borderRadius: '4px', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                        >
                          <Underline size={12} />
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditingTextId(null)}
                          style={{ border: 'none', backgroundColor: '#10B981', color: '#FFF', borderRadius: '4px', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                          title="Valider"
                        >
                          <Check size={12} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteText(txt.id)}
                          style={{ border: 'none', backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#EF4444', borderRadius: '4px', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                          title="Supprimer"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}

                    <div
                      onPointerDown={(e) => handleTextPointerDown(txt.id, e)}
                      onDoubleClick={() => setEditingTextId(txt.id)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: isEditing ? '1.5px dashed var(--accent-primary)' : '1px solid transparent',
                        backgroundColor: isEditing ? 'rgba(198, 125, 91, 0.08)' : 'transparent',
                        cursor: 'move',
                        userSelect: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        width: '100%',
                        boxSizing: 'border-box',
                      }}
                    >
                      <GripVertical size={12} style={{ opacity: isEditing ? 0.7 : 0.2, flexShrink: 0 }} />
                      {isEditing ? (
                        <input
                          type="text"
                          autoFocus
                          value={txt.text}
                          onChange={(e) => updateTextStyle(txt.id, { text: e.target.value })}
                          onKeyDown={(e) => e.key === 'Enter' && setEditingTextId(null)}
                          style={{
                            width: '100%',
                            border: 'none',
                            backgroundColor: 'transparent',
                            color: txt.color || color,
                            fontFamily: txt.fontFamily || 'Inter, sans-serif',
                            fontSize: `${(txt.fontSize || 20) * zoom}px`,
                            fontWeight: txt.isBold ? 'bold' : 'normal',
                            fontStyle: txt.isItalic ? 'italic' : 'normal',
                            textDecoration: txt.isUnderline ? 'underline' : 'none',
                            outline: 'none',
                            minWidth: '80px',
                          }}
                        />
                      ) : (
                        <span
                          style={{
                            color: txt.color || color,
                            fontFamily: txt.fontFamily || 'Inter, sans-serif',
                            fontSize: `${(txt.fontSize || 20) * zoom}px`,
                            fontWeight: txt.isBold ? 'bold' : 'normal',
                            fontStyle: txt.isItalic ? 'italic' : 'normal',
                            textDecoration: txt.isUnderline ? 'underline' : 'none',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            width: '100%',
                          }}
                        >
                          {txt.text || 'Texte vide'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* POST-ITS */}
              {stickyNotes.map((sticky) => {
                const screenPosX = sticky.x * zoom + pan.x;
                const screenPosY = sticky.y * zoom + pan.y;

                return (
                  <div
                    key={sticky.id}
                    style={{
                      position: 'absolute',
                      left: `${screenPosX}px`,
                      top: `${screenPosY}px`,
                      width: `${200 * zoom}px`,
                      backgroundColor: sticky.color || '#FEF08A',
                      color: '#1F2937',
                      borderRadius: `${14 * zoom}px`,
                      boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                      border: '1px solid rgba(0,0,0,0.08)',
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden',
                      zIndex: 10,
                      boxSizing: 'border-box',
                      transformOrigin: 'top left',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div
                      onPointerDown={(e) => handleStickyPointerDown(sticky.id, e)}
                      style={{
                        padding: `${6 * zoom}px ${8 * zoom}px`,
                        backgroundColor: 'rgba(0,0,0,0.06)',
                        cursor: 'grab',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        userSelect: 'none',
                        touchAction: 'none',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <GripVertical size={Math.max(10, 13 * zoom)} style={{ opacity: 0.6 }} />
                        <span style={{ fontSize: `${Math.max(8, 10 * zoom)}px`, fontWeight: '800', color: 'rgba(0,0,0,0.7)' }}>
                          {sticky.author || 'Post-it'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <div style={{ display: 'flex', gap: '3px' }}>
                          {STICKY_COLORS.map(sc => (
                            <button
                              key={sc.hex}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const updated = stickyNotes.map(s => s.id === sticky.id ? { ...s, color: sc.hex } : s);
                                setStickyNotes(updated);
                                syncToFirestore(paths, updated, textElements);
                              }}
                              style={{
                                border: sticky.color === sc.hex ? '1.5px solid #000' : 'none',
                                backgroundColor: sc.hex,
                                width: `${Math.max(8, 12 * zoom)}px`,
                                height: `${Math.max(8, 12 * zoom)}px`,
                                borderRadius: '50%',
                                cursor: 'pointer',
                                padding: 0,
                              }}
                            />
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const updated = stickyNotes.filter(s => s.id !== sticky.id);
                            setStickyNotes(updated);
                            syncToFirestore(paths, updated, textElements);
                          }}
                          style={{
                            border: 'none',
                            background: 'rgba(0,0,0,0.1)',
                            width: `${Math.max(14, 18 * zoom)}px`,
                            height: `${Math.max(14, 18 * zoom)}px`,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: '#000',
                            padding: 0,
                          }}
                          title="Supprimer ce post-it"
                        >
                          <X size={Math.max(9, 11 * zoom)} />
                        </button>
                      </div>
                    </div>

                    <textarea
                      value={sticky.text}
                      onChange={(e) => {
                        const val = e.target.value;
                        setStickyNotes(prev => prev.map(s => s.id === sticky.id ? { ...s, text: val } : s));
                      }}
                      onBlur={() => syncToFirestore(paths, stickyNotes, textElements)}
                      placeholder="Écrire une note..."
                      rows={3}
                      style={{
                        width: '100%',
                        border: 'none',
                        backgroundColor: 'transparent',
                        padding: `${8 * zoom}px ${10 * zoom}px`,
                        fontSize: `${Math.max(10, 12 * zoom)}px`,
                        fontFamily: 'inherit',
                        color: '#1F2937',
                        resize: 'none',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                );
              })}

              {/* CONTRÔLES FLOTTANTS DE ZOOM */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '16px',
                  right: '16px',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '14px',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                  zIndex: 30,
                }}
              >
                <button
                  type="button"
                  onClick={() => setZoom(z => Math.max(0.3, z - 0.15))}
                  style={{ border: 'none', backgroundColor: 'transparent', color: 'var(--text-main)', width: '28px', height: '28px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  title="Zoom arrière"
                >
                  <ZoomOut size={14} />
                </button>

                <button
                  type="button"
                  onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
                  style={{ border: 'none', backgroundColor: 'var(--bg-subtle)', color: 'var(--accent-primary)', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}
                  title="Réinitialiser la vue (100%)"
                >
                  {Math.round(zoom * 100)}%
                </button>

                <button
                  type="button"
                  onClick={() => setZoom(z => Math.min(3.0, z + 0.15))}
                  style={{ border: 'none', backgroundColor: 'transparent', color: 'var(--text-main)', width: '28px', height: '28px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  title="Zoom avant"
                >
                  <ZoomIn size={14} />
                </button>
              </div>
            </div>
          </>
        )}

        {/* 2. VUE B : NOTES PARTAGÉES (RICH TEXT STYLE APPLE NOTES) */}
        {activeTab === 'notes' && (
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', backgroundColor: darkMode ? '#181412' : '#FCFBF7' }}>
            {/* BARRE D'OUTILS APPLE NOTES */}
            <div
              style={{
                padding: '8px 16px',
                borderBottom: '1px solid var(--border-color)',
                backgroundColor: darkMode ? '#1F1B18' : '#FAF8F5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                flexWrap: 'wrap',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => insertNoteFormatting('# ')}
                  style={{ border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', padding: '4px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '12px', fontWeight: '800', cursor: 'pointer' }}
                  title="Grand Titre"
                >
                  <Heading1 size={13} /> Titre
                </button>

                <button
                  type="button"
                  onClick={() => insertNoteFormatting('### ')}
                  style={{ border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', padding: '4px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                  title="Sous-titre"
                >
                  <Heading2 size={13} /> Sous-titre
                </button>

                <button
                  type="button"
                  onClick={() => insertNoteFormatting('- [ ] ')}
                  style={{ border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', padding: '4px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                  title="Checklist à cocher"
                >
                  <CheckSquare size={13} /> Checklist
                </button>

                <button
                  type="button"
                  onClick={() => insertNoteFormatting('- ')}
                  style={{ border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', width: '28px', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  title="Liste à puces"
                >
                  <List size={13} />
                </button>

                <button
                  type="button"
                  onClick={() => insertNoteFormatting('> ')}
                  style={{ border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', width: '28px', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  title="Citation"
                >
                  <Quote size={13} />
                </button>

                <button
                  type="button"
                  onClick={() => insertNoteFormatting('**', '**')}
                  style={{ border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', width: '28px', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  title="Gras"
                >
                  <Bold size={13} />
                </button>

                <button
                  type="button"
                  onClick={() => insertNoteFormatting('*', '*')}
                  style={{ border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', width: '28px', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  title="Italique"
                >
                  <Italic size={13} />
                </button>
              </div>

              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                {noteContent.trim().split(/\s+/).filter(Boolean).length} mots • Note partagée Apple-Style
              </div>
            </div>

            {/* TITRE DE LA NOTE STYLE APPLE */}
            <div style={{ padding: '16px 24px 6px 24px' }}>
              <input
                type="text"
                value={noteTitle}
                onChange={(e) => {
                  setNoteTitle(e.target.value);
                  saveNoteToFirestore(noteContent, e.target.value);
                }}
                placeholder="Titre de la note..."
                style={{
                  width: '100%',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: 'var(--text-main)',
                  fontSize: '22px',
                  fontWeight: '800',
                  fontFamily: 'Cormorant Garamond, Georgia, serif',
                  outline: 'none',
                }}
              />
            </div>

            {/* CORPS DE LA NOTE FLUIDE */}
            <div style={{ flex: 1, minHeight: 0, padding: '10px 24px 24px 24px', display: 'flex', flexDirection: 'column' }}>
              <textarea
                ref={notesTextareaRef}
                value={noteContent}
                onChange={(e) => {
                  setNoteContent(e.target.value);
                  saveNoteToFirestore(e.target.value);
                }}
                placeholder="Rédigez ici vos notes de session, tâches ou spécifications partagées..."
                style={{
                  width: '100%',
                  flex: 1,
                  minHeight: 0,
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: 'var(--text-main)',
                  fontSize: '14.5px',
                  lineHeight: 1.7,
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                  resize: 'none',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalElement, document.body);
}
