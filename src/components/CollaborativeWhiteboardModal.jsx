import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Pen, Highlighter, Eraser, Square, Circle, ArrowRight,
  RotateCcw, RotateCw, Trash2, Download, StickyNote,
  Type, Hand, ZoomIn, ZoomOut, Brush, Eye, EyeOff, Share2, Tag, Check
} from 'lucide-react';
import { doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { whiteboardP2PService } from '../services/whiteboardP2PService';

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

/**
 * Fusion intelligente des vecteurs locaux et distants par identifiant unique
 * Empêche l'écrasement des traits locaux par les snapshots Firebase entrants.
 */
const mergeVectorPaths = (existingPaths, incomingPaths, myUid) => {
  const pathMap = new Map();
  // 1. Ingestion des chemins existants
  existingPaths.forEach((p) => {
    if (p && p.id) pathMap.set(p.id, p);
  });
  // 2. Fusion des chemins distants entrants (ajoute les nouveaux sans écraser les traits locaux en cours)
  incomingPaths.forEach((p) => {
    if (p && p.id) {
      const existing = pathMap.get(p.id);
      if (!existing) {
        pathMap.set(p.id, { ...p, isRemote: p.authorUid !== myUid });
      } else if (existing.isRemote) {
        pathMap.set(p.id, { ...p, isRemote: p.authorUid !== myUid });
      }
    }
  });
  return Array.from(pathMap.values()).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)).slice(-450);
};

export default function CollaborativeWhiteboardModal({
  isOpen,
  onClose,
  groupId = 'demo_group_whiteboard',
  boardId = null,
  projectTitle = 'Tableau Blanc Collaboratif',
  currentUser = null,
  darkMode = false,
  onSendToChat = null,
  onSendMessage = null,
  handleSendMessage = null,
}) {
  const effectiveBoardId = boardId || groupId || 'default_board';
  const myUid = currentUser?.uid || currentUser?.id || 'local_user';
  const myName = currentUser?.name || 'Moi';

  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Outils Whiteboard : 'pencil' | 'brush' | 'highlighter' | 'eraser' | 'rect' | 'circle' | 'arrow' | 'sticky' | 'text' | 'hand' | 'laser'
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

  // Multi-utilisateurs, Versioning & Immersion
  const [isImmersiveMode, setIsImmersiveMode] = useState(false);
  const [versionNumber, setVersionNumber] = useState(1);
  const [workspaceTitle, setWorkspaceTitle] = useState(projectTitle || 'Tableau Blanc Collaboratif');
  const [saveStatus, setSaveStatus] = useState('Synchronisé en direct 🟢');
  const [lastEditor, setLastEditor] = useState(myName);
  const [isSendingToChat, setIsSendingToChat] = useState(false);
  const [sendSuccessToast, setSendSuccessToast] = useState(false);

  // Verrouillage strict du scroll global du document lors de l'ouverture
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Modale de publication de version au chat
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [publishTitle, setPublishTitle] = useState(`${workspaceTitle} - V2`);
  const [publishChangelog, setPublishChangelog] = useState('');

  // Références d'interaction & synchronisation 0ms sans écrasement
  const isDrawingRef = useRef(false);
  const currentPathRef = useRef(null);
  const startPosRef = useRef({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, origPanX: 0, origPanY: 0 });
  const draggingStickyRef = useRef(null);

  // Buffer de snapshots reçus pendant le dessin local (File d'attente anti-écrasement)
  const pendingSnapshotRef = useRef(null);
  const firestoreDebounceTimerRef = useRef(null);

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
  const applyBrushStyleToContext = (ctx, brushTool, brushColor, brushWidth, isRemote = false) => {
    ctx.lineWidth = brushWidth;
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';

    if (brushTool === 'pencil' || brushTool === 'pen') {
      ctx.lineCap = 'butt';
      ctx.lineJoin = 'miter';
      ctx.globalAlpha = isRemote ? 0.9 : 1.0;
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = brushColor;
    } else if (brushTool === 'brush') {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = isRemote ? 0.82 : 0.88;
      ctx.globalCompositeOperation = 'source-over';
      ctx.shadowBlur = Math.max(2, brushWidth * 0.85);
      ctx.shadowColor = brushColor;
      ctx.strokeStyle = brushColor;
    } else if (brushTool === 'highlighter') {
      ctx.lineCap = 'square';
      ctx.lineJoin = 'bevel';
      ctx.globalAlpha = isRemote ? 0.25 : 0.32;
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = brushColor;
    } else if (brushTool === 'eraser') {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = 1.0;
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = isRemote ? 0.9 : 1.0;
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = brushColor;
    }
  };

  // Redessine l'ensemble des vecteurs sur le canvas transparent (60 FPS)
  const redrawCanvas = useCallback((drawPaths = paths) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const dpr = window.devicePixelRatio || 1;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);

    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    drawPaths.forEach((path) => {
      if (!path) return;
      ctx.save();
      ctx.beginPath();
      applyBrushStyleToContext(ctx, path.tool, path.color, path.lineWidth, !!path.isRemote);

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

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    redrawCanvas();
  }, [redrawCanvas]);

  useEffect(() => {
    if (isOpen) {
      updateCanvasSize();
      window.addEventListener('resize', updateCanvasSize);
      return () => window.removeEventListener('resize', updateCanvasSize);
    }
  }, [isOpen, updateCanvasSize]);

  // Sauvegarde debouncée vers Firestore pour garantir 60fps sans surcharger Firebase
  const debouncedSyncToFirestore = useCallback((
    currentPaths = paths,
    currentStickyNotes = stickyNotes,
    currentTextElements = textElements,
    currentVersion = versionNumber,
    currentTitle = workspaceTitle
  ) => {
    if (!effectiveBoardId || !db) return;

    if (firestoreDebounceTimerRef.current) {
      clearTimeout(firestoreDebounceTimerRef.current);
    }

    setSaveStatus('Enregistrement en cours...');

    firestoreDebounceTimerRef.current = setTimeout(async () => {
      try {
        const docRef = doc(db, 'project_whiteboards', String(effectiveBoardId));
        const payload = {
          boardId: effectiveBoardId,
          groupId,
          title: currentTitle,
          versionNumber: currentVersion,
          paths: currentPaths.slice(-350),
          stickyNotes: currentStickyNotes,
          textElements: currentTextElements,
          updatedAt: serverTimestamp(),
          lastEditor: myName,
          lastEditorUid: myUid,
          activeUsers: [myName, 'Collaborateurs P2P'],
        };

        await setDoc(docRef, payload, { merge: true });

        if (groupId && groupId !== 'demo_group_whiteboard') {
          const chatBoardRef = doc(db, 'chats', String(groupId), 'whiteboards', String(effectiveBoardId));
          await setDoc(chatBoardRef, payload, { merge: true }).catch(() => {});
        }

        setSaveStatus('Synchronisé en direct 🟢');
      } catch (err) {
        console.warn('[Firestore Whiteboard Sync] error:', err);
        setSaveStatus('Mode P2P Direct');
      }
    }, 350);
  }, [effectiveBoardId, groupId, paths, stickyNotes, textElements, versionNumber, workspaceTitle, myName, myUid]);

  // MOTEUR MULTIJOUEUR P2P & SNAPSHOT FIRESTORE SÉCURISÉ CONTRE L'EFFACEMENT DES TRAITS
  useEffect(() => {
    if (!isOpen || !effectiveBoardId) return;

    // 1. Écoute P2P WebRTC DataChannel (0ms de latence)
    whiteboardP2PService.joinRoom(effectiveBoardId, (event) => {
      if (event.authorName) setLastEditor(event.authorName);
      if (event.type === 'path_add' && event.path) {
        if (event.path.authorName) setLastEditor(event.path.authorName);
        setPaths((prev) => {
          const remotePath = { ...event.path, isRemote: true };
          const next = [...prev, remotePath].slice(-450);
          redrawCanvas(next);
          return next;
        });
      } else if (event.type === 'sticky_add' && event.sticky) {
        if (event.sticky.authorName) setLastEditor(event.sticky.authorName);
        setStickyNotes((prev) => [...prev, event.sticky]);
      } else if (event.type === 'sticky_update' && event.sticky) {
        setStickyNotes((prev) => prev.map((s) => (s.id === event.sticky.id ? event.sticky : s)));
      } else if (event.type === 'sticky_delete' && event.id) {
        setStickyNotes((prev) => prev.filter((s) => s.id !== event.id));
      } else if (event.type === 'text_add' && event.text) {
        setTextElements((prev) => [...prev, event.text]);
      } else if (event.type === 'text_update' && event.text) {
        setTextElements((prev) => prev.map((t) => (t.id === event.text.id ? event.text : t)));
      } else if (event.type === 'clear') {
        setPaths([]);
        setStickyNotes([]);
        setTextElements([]);
        redrawCanvas([]);
      }
    });

    // 2. Écoute Firestore Snapshot avec protection Anti-Écrasement
    if (db) {
      try {
        const docRef = doc(db, 'project_whiteboards', String(effectiveBoardId));
        const unsubFirestore = onSnapshot(docRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();

            if (data.lastEditor) setLastEditor(data.lastEditor);
            if (data.versionNumber) setVersionNumber(data.versionNumber);
            if (data.title) setWorkspaceTitle(data.title);

            // RÈGLE CRITIQUE : Si l'utilisateur est en train de dessiner, mettre en file d'attente
            if (isDrawingRef.current) {
              pendingSnapshotRef.current = data;
              return;
            }

            // Fusion intelligente sans écraser les traits locaux récents
            if (data.paths && Array.isArray(data.paths)) {
              setPaths((prevPaths) => {
                const merged = mergeVectorPaths(prevPaths, data.paths, myUid);
                redrawCanvas(merged);
                return merged;
              });
            }
            if (data.stickyNotes && Array.isArray(data.stickyNotes) && !draggingStickyRef.current) {
              setStickyNotes(data.stickyNotes);
            }
            if (data.textElements && Array.isArray(data.textElements) && !editingTextId) {
              setTextElements(data.textElements);
            }
            setSaveStatus('P2P Direct ⚡ 0ms Latence');
          }
        }, (err) => {
          console.warn('[Firestore Whiteboard] Snapshot note:', err);
        });

        return () => {
          unsubFirestore();
          whiteboardP2PService.leaveRoom();
        };
      } catch (_) {}
    }

    return () => {
      whiteboardP2PService.leaveRoom();
    };
  }, [isOpen, effectiveBoardId, myUid, myName, redrawCanvas, editingTextId]);

  // Traitement d'un snapshot en attente dès que l'utilisateur relâche le pinceau
  const processPendingSnapshot = useCallback(() => {
    if (pendingSnapshotRef.current) {
      const data = pendingSnapshotRef.current;
      pendingSnapshotRef.current = null;

      if (data.paths && Array.isArray(data.paths)) {
        setPaths((prevPaths) => {
          const merged = mergeVectorPaths(prevPaths, data.paths, myUid);
          redrawCanvas(merged);
          return merged;
        });
      }
      if (data.stickyNotes && Array.isArray(data.stickyNotes)) {
        setStickyNotes(data.stickyNotes);
      }
      if (data.textElements && Array.isArray(data.textElements)) {
        setTextElements(data.textElements);
      }
    }
  }, [myUid, redrawCanvas]);

  // GESTION DU DESSIN VECTORIEL & PAN
  const handlePointerDown = (e) => {
    const coords = getCanvasCoords(e);

    if (tool === 'hand' || e.button === 1 || e.spaceKey) {
      isPanningRef.current = true;
      panStartRef.current = {
        x: coords.screenX,
        y: coords.screenY,
        origPanX: pan.x,
        origPanY: pan.y,
      };
      return;
    }

    if (tool === 'sticky') {
      const newSticky = {
        id: `sticky_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        x: coords.x - 90,
        y: coords.y - 70,
        width: 180,
        height: 140,
        text: 'Nouvelle note...',
        color: STICKY_COLORS[0].hex,
        authorName: myName,
        authorUid: myUid,
        createdAt: Date.now(),
      };
      const nextStickies = [...stickyNotes, newSticky];
      setStickyNotes(nextStickies);
      whiteboardP2PService.broadcast({ type: 'sticky_add', sticky: newSticky });
      debouncedSyncToFirestore(paths, nextStickies, textElements);
      setTool('pencil');
      return;
    }

    if (tool === 'text') {
      const newText = {
        id: `text_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        x: coords.x,
        y: coords.y,
        text: 'Votre texte...',
        color: color === '#FFFFFF' ? (darkMode ? '#FFFFFF' : '#1F2937') : color,
        fontSize: 24,
        fontFamily: FONT_FAMILIES[0].id,
        isBold: false,
        isItalic: false,
        isUnderline: false,
        authorName: myName,
        authorUid: myUid,
        createdAt: Date.now(),
      };
      const nextTexts = [...textElements, newText];
      setTextElements(nextTexts);
      setEditingTextId(newText.id);
      whiteboardP2PService.broadcast({ type: 'text_add', text: newText });
      debouncedSyncToFirestore(paths, stickyNotes, nextTexts);
      setTool('pencil');
      return;
    }

    // Début de tracé vectoriel
    isDrawingRef.current = true;
    startPosRef.current = { x: coords.x, y: coords.y };

    const newPathId = `path_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    if (tool === 'rect' || tool === 'circle') {
      currentPathRef.current = {
        id: newPathId,
        type: tool,
        tool: 'pencil',
        x: coords.x,
        y: coords.y,
        width: 0,
        height: 0,
        color,
        lineWidth,
        authorUid: myUid,
        authorName: myName,
        createdAt: Date.now(),
      };
    } else if (tool === 'arrow') {
      currentPathRef.current = {
        id: newPathId,
        type: 'arrow',
        tool: 'pencil',
        fromX: coords.x,
        fromY: coords.y,
        toX: coords.x,
        toY: coords.y,
        color,
        lineWidth,
        authorUid: myUid,
        authorName: myName,
        createdAt: Date.now(),
      };
    } else {
      // Pinceaux libres (pencil, brush, highlighter, eraser)
      currentPathRef.current = {
        id: newPathId,
        type: 'freehand',
        tool,
        color,
        lineWidth: tool === 'eraser' ? lineWidth * 3 : lineWidth,
        points: [{ x: coords.x, y: coords.y }],
        authorUid: myUid,
        authorName: myName,
        createdAt: Date.now(),
      };
    }
  };

  const handlePointerMove = (e) => {
    const coords = getCanvasCoords(e);

    if (isPanningRef.current) {
      const dx = coords.screenX - panStartRef.current.x;
      const dy = coords.screenY - panStartRef.current.y;
      setPan({
        x: panStartRef.current.origPanX + dx,
        y: panStartRef.current.origPanY + dy,
      });
      return;
    }

    if (!isDrawingRef.current || !currentPathRef.current) return;

    const cur = currentPathRef.current;

    if (cur.type === 'freehand') {
      cur.points.push({ x: coords.x, y: coords.y });
      // Rendu 60 FPS immédiat
      redrawCanvas([...paths, cur]);
    } else if (cur.type === 'rect' || cur.type === 'circle') {
      cur.width = coords.x - startPosRef.current.x;
      cur.height = coords.y - startPosRef.current.y;
      redrawCanvas([...paths, cur]);
    } else if (cur.type === 'arrow') {
      cur.toX = coords.x;
      cur.toY = coords.y;
      redrawCanvas([...paths, cur]);
    }
  };

  const handlePointerUp = () => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      return;
    }

    if (isDrawingRef.current && currentPathRef.current) {
      const finishedPath = { ...currentPathRef.current };
      isDrawingRef.current = false;
      currentPathRef.current = null;

      const nextPaths = [...paths, finishedPath].slice(-450);
      setPaths(nextPaths);
      setRedoStack([]);
      redrawCanvas(nextPaths);

      // 1. Diffusion P2P immédiate
      whiteboardP2PService.broadcast({ type: 'path_add', path: finishedPath });

      // 2. Traitement d'un éventuel snapshot en file d'attente
      processPendingSnapshot();

      // 3. Sauvegarde debouncée Firestore
      debouncedSyncToFirestore(nextPaths, stickyNotes, textElements);
    }

    isDrawingRef.current = false;
  };

  // Annuler (Undo)
  const handleUndo = () => {
    if (paths.length === 0) return;
    const last = paths[paths.length - 1];
    const nextPaths = paths.slice(0, -1);
    setPaths(nextPaths);
    setRedoStack((prev) => [...prev, last]);
    redrawCanvas(nextPaths);
    debouncedSyncToFirestore(nextPaths, stickyNotes, textElements);
  };

  // Rétablir (Redo)
  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const restored = redoStack[redoStack.length - 1];
    const nextRedo = redoStack.slice(0, -1);
    const nextPaths = [...paths, restored];
    setPaths(nextPaths);
    setRedoStack(nextRedo);
    redrawCanvas(nextPaths);
    debouncedSyncToFirestore(nextPaths, stickyNotes, textElements);
  };

  // Effacer tout le tableau
  const handleClearAll = () => {
    if (window.confirm('Voulez-vous vraiment effacer l’ensemble du tableau blanc ?')) {
      setPaths([]);
      setStickyNotes([]);
      setTextElements([]);
      setRedoStack([]);
      redrawCanvas([]);
      whiteboardP2PService.broadcast({ type: 'clear' });
      debouncedSyncToFirestore([], [], []);
    }
  };

  // Zoomer / Dézoomer
  const handleZoomIn = () => setZoom((z) => Math.min(3, +(z + 0.15).toFixed(2)));
  const handleZoomOut = () => setZoom((z) => Math.max(0.3, +(z - 0.15).toFixed(2)));
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Export Image PNG
  const handleExportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tCtx = tempCanvas.getContext('2d');

    tCtx.fillStyle = darkMode ? '#181412' : '#FFFFFF';
    tCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    tCtx.drawImage(canvas, 0, 0);

    const link = document.createElement('a');
    link.download = `whiteboard-${workspaceTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-V${versionNumber}.png`;
    link.href = tempCanvas.toDataURL('image/png');
    link.click();
  };

  // Générer un snapshot thumbnail haute définition
  const generateSnapshotDataUrl = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    try {
      const snapCanvas = document.createElement('canvas');
      snapCanvas.width = 480;
      snapCanvas.height = 270;
      const sCtx = snapCanvas.getContext('2d');
      sCtx.fillStyle = darkMode ? '#181412' : '#FAF7F2';
      sCtx.fillRect(0, 0, snapCanvas.width, snapCanvas.height);
      sCtx.drawImage(canvas, 0, 0, snapCanvas.width, snapCanvas.height);
      return snapCanvas.toDataURL('image/png', 0.85);
    } catch (_) {
      return null;
    }
  };

  // Déclencher la modale de publication de version au chat
  const handleOpenPublishModal = () => {
    setPublishTitle(`${workspaceTitle} - V${versionNumber + 1}`);
    setPublishChangelog('');
    setIsPublishModalOpen(true);
  };

  // Confirmer l'envoi de la version dans le Chat
  const handleConfirmPublishToChat = async () => {
    if (isSendingToChat) return;
    setIsSendingToChat(true);

    const nextVer = versionNumber + 1;
    const finalTitle = publishTitle.trim() || `${workspaceTitle} - V${nextVer}`;
    const snapshotUrl = generateSnapshotDataUrl();

    try {
      setVersionNumber(nextVer);
      setWorkspaceTitle(finalTitle);

      const sendFn = onSendMessage || handleSendMessage;
      if (typeof sendFn === 'function') {
        sendFn({
          text: `Nouvelle version du tableau blanc disponible (${finalTitle} - V${nextVer})`,
          type: 'workspace_invite',
          kind: 'workspace_invite',
          workspaceType: 'whiteboard',
          workspaceTitle: finalTitle,
          boardId: effectiveBoardId,
          version: `V${nextVer}`,
          versionNumber: nextVer,
          previewUrl: snapshotUrl,
        });
      } else {
        console.error("CRITICAL ERROR: onSendMessage prop is missing in CollaborativeWhiteboardModal");
      }

      if (typeof onSendToChat === 'function') {
        onSendToChat(effectiveBoardId, nextVer);
      }

      setIsPublishModalOpen(false);
      setSendSuccessToast(true);
      setTimeout(() => setSendSuccessToast(false), 4000);
    } catch (err) {
      console.warn('[Whiteboard] Publish to chat error:', err);
    } finally {
      setIsSendingToChat(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        width: '100vw',
        height: '100dvh',
        backgroundColor: darkMode ? '#120F0D' : '#F5F0E8',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        pointerEvents: 'auto',
      }}
    >
      {/* BADGE DE TRAÇABILITÉ COLLABORATIVE ("Modifié par...") */}
      <div
        style={{
          position: 'absolute',
          top: isImmersiveMode ? '16px' : '72px',
          left: '16px',
          zIndex: 9999,
          backgroundColor: darkMode ? 'rgba(28,24,22,0.88)' : 'rgba(255,255,255,0.88)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: darkMode ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.1)',
          borderRadius: '999px',
          padding: '4px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '11px',
          fontWeight: '700',
          color: darkMode ? '#FAF7F2' : '#3D3530',
          boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
          pointerEvents: 'none',
          transition: 'top 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <span
          style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            backgroundColor: '#10B981',
            boxShadow: '0 0 6px #10B981',
          }}
        />
        <span>
          Dernière modification par : <strong style={{ color: 'var(--accent-primary, #C67D5B)' }}>{lastEditor || myName}</strong>
        </span>
      </div>

      {/* HEADER SUPÉRIEUR (MASQUÉ EN MODE IMMERSION) */}
      <header
        style={{
          padding: '12px 20px',
          borderBottom: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E8DDD3',
          backgroundColor: darkMode ? 'rgba(28,24,22,0.94)' : 'rgba(250,247,242,0.94)',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          zIndex: 30,
          transition: 'all 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
          opacity: isImmersiveMode ? 0 : 1,
          pointerEvents: isImmersiveMode ? 'none' : 'auto',
          transform: isImmersiveMode ? 'translateY(-100%)' : 'translateY(0)',
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              backgroundColor: 'rgba(198,125,91,0.18)',
              color: '#C67D5B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Brush size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="text"
                value={workspaceTitle}
                onChange={(e) => {
                  setWorkspaceTitle(e.target.value);
                  debouncedSyncToFirestore(paths, stickyNotes, textElements, versionNumber, e.target.value);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: '16px',
                  fontWeight: '800',
                  color: darkMode ? '#FAF7F2' : '#3D3530',
                  fontFamily: 'inherit',
                  maxWidth: '240px',
                }}
              />
              <span
                style={{
                  backgroundColor: 'rgba(198,125,91,0.2)',
                  color: '#C67D5B',
                  borderRadius: '999px',
                  padding: '2px 8px',
                  fontSize: '11px',
                  fontWeight: '800',
                }}
              >
                V{versionNumber}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#10B981', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>{saveStatus}</span>
              <span style={{ color: darkMode ? '#8E857E' : '#A89E95' }}>• {paths.length} traits vectoriels</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* BOUTON EXPORT PNG */}
          <button
            type="button"
            onClick={handleExportPNG}
            style={{
              border: 'none',
              backgroundColor: darkMode ? 'rgba(255,255,255,0.08)' : '#EFE8DE',
              color: darkMode ? '#FAF7F2' : '#3D3530',
              borderRadius: '10px',
              padding: '7px 12px',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            title="Exporter l'image PNG"
          >
            <Download size={14} />
            <span className="hidden-mobile">Exporter</span>
          </button>

          {/* BOUTON PUBLIER / ENVOYER AU CHAT */}
          <button
            type="button"
            onClick={handleOpenPublishModal}
            className="premium-button"
            style={{
              border: 'none',
              background: 'linear-gradient(135deg, #C67D5B 0%, #B86B49 100%)',
              color: '#FFFFFF',
              borderRadius: '10px',
              padding: '7px 14px',
              fontSize: '12px',
              fontWeight: '800',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 14px rgba(198,125,91,0.3)',
            }}
          >
            <Share2 size={14} />
            <span>Mettre à jour au Chat (V{versionNumber + 1})</span>
          </button>

          {/* BOUTON FERMER */}
          <button
            type="button"
            onClick={onClose}
            style={{
              border: 'none',
              backgroundColor: 'transparent',
              color: darkMode ? '#A89E95' : '#6B5E54',
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* BOUTON FLOTTANT DISCRET POUR LE MODE IMMERSION (100% VISIBLE EN TOUT TEMPS) */}
      <button
        type="button"
        onClick={() => setIsImmersiveMode(!isImmersiveMode)}
        style={{
          position: 'fixed',
          top: isImmersiveMode ? '16px' : '72px',
          right: '20px',
          zIndex: 100020,
          border: 'none',
          backgroundColor: isImmersiveMode ? 'rgba(198,125,91,0.92)' : 'rgba(28,24,22,0.72)',
          color: '#FFFFFF',
          padding: '8px 14px',
          borderRadius: '999px',
          fontSize: '12px',
          fontWeight: '800',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          transition: 'all 0.25s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
        title="Basculer le mode immersion (plein écran 100% Canvas)"
      >
        {isImmersiveMode ? <Eye size={15} /> : <EyeOff size={15} />}
        <span>{isImmersiveMode ? 'Quitter Immersion' : 'Mode Immersion'}</span>
      </button>

      {/* ZONE CENTRALE DU CANVAS VECTORIEL (CANVAS PRINCIPAL) */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={{
          flex: 1,
          width: '100%',
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
          cursor: tool === 'hand' ? (isPanningRef.current ? 'grabbing' : 'grab') : 'crosshair',
          backgroundColor: darkMode ? '#181412' : '#FAF7F2',
          backgroundImage: showGrid
            ? (darkMode
                ? 'radial-gradient(rgba(255, 255, 255, 0.12) 1.2px, transparent 1.2px)'
                : 'radial-gradient(rgba(61, 53, 48, 0.15) 1.2px, transparent 1.2px)')
            : 'none',
          backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
          touchAction: 'none',
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
          }}
        />

        {/* RENDU DES STICKY NOTES VECTORIELLES */}
        {stickyNotes.map((sticky) => (
          <div
            key={sticky.id}
            style={{
              position: 'absolute',
              left: `${sticky.x * zoom + pan.x}px`,
              top: `${sticky.y * zoom + pan.y}px`,
              width: `${sticky.width * zoom}px`,
              minHeight: `${sticky.height * zoom}px`,
              backgroundColor: sticky.color || '#FEF08A',
              color: '#1F2937',
              borderRadius: '12px',
              padding: '10px 12px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.18)',
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
              zIndex: 10,
              display: 'flex',
              flexDirection: 'column',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '10px', fontWeight: '800', opacity: 0.6 }}>{sticky.authorName || 'Note'}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const nextStickies = stickyNotes.filter((s) => s.id !== sticky.id);
                  setStickyNotes(nextStickies);
                  whiteboardP2PService.broadcast({ type: 'sticky_delete', id: sticky.id });
                  debouncedSyncToFirestore(paths, nextStickies, textElements);
                }}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', opacity: 0.5, padding: '2px' }}
              >
                <Trash2 size={12} />
              </button>
            </div>
            <textarea
              value={sticky.text}
              onChange={(e) => {
                const nextText = e.target.value;
                const nextStickies = stickyNotes.map((s) => (s.id === sticky.id ? { ...s, text: nextText } : s));
                setStickyNotes(nextStickies);
                whiteboardP2PService.broadcast({ type: 'sticky_update', sticky: { ...sticky, text: nextText } });
                debouncedSyncToFirestore(paths, nextStickies, textElements);
              }}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                resize: 'none',
                fontFamily: 'inherit',
                fontSize: '13px',
                lineHeight: 1.4,
                color: '#1F2937',
              }}
            />
          </div>
        ))}

        {/* RENDU DES ÉLÉMENTS DE TEXTE LIBRES */}
        {textElements.map((textItem) => {
          const isEditing = editingTextId === textItem.id;
          return (
            <div
              key={textItem.id}
              style={{
                position: 'absolute',
                left: `${textItem.x * zoom + pan.x}px`,
                top: `${textItem.y * zoom + pan.y}px`,
                transform: `scale(${zoom})`,
                transformOrigin: 'top left',
                zIndex: 12,
              }}
            >
              {isEditing ? (
                <input
                  type="text"
                  autoFocus
                  value={textItem.text}
                  onBlur={() => setEditingTextId(null)}
                  onChange={(e) => {
                    const nextVal = e.target.value;
                    const nextTexts = textElements.map((t) => (t.id === textItem.id ? { ...t, text: nextVal } : t));
                    setTextElements(nextTexts);
                    whiteboardP2PService.broadcast({ type: 'text_update', text: { ...textItem, text: nextVal } });
                    debouncedSyncToFirestore(paths, stickyNotes, nextTexts);
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter') setEditingTextId(null); }}
                  style={{
                    background: 'transparent',
                    border: '1px dashed #C67D5B',
                    outline: 'none',
                    fontSize: `${textItem.fontSize || 24}px`,
                    color: textItem.color || '#C67D5B',
                    fontWeight: textItem.isBold ? '800' : '500',
                    fontFamily: textItem.fontFamily === 'mono' ? 'Roboto Mono, monospace' : 'Inter, sans-serif',
                  }}
                />
              ) : (
                <div
                  onDoubleClick={() => setEditingTextId(textItem.id)}
                  style={{
                    fontSize: `${textItem.fontSize || 24}px`,
                    color: textItem.color || '#C67D5B',
                    fontWeight: textItem.isBold ? '800' : '500',
                    fontFamily: textItem.fontFamily === 'mono' ? 'Roboto Mono, monospace' : 'Inter, sans-serif',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  {textItem.text}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* DOCK BARRE D'OUTILS FLOTTANTE INFÉRIEURE (MASQUÉE EN MODE IMMERSION) */}
      <div
        style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: isImmersiveMode ? 'translate(-50%, 120%)' : 'translate(-50%, 0)',
          zIndex: 100015,
          backgroundColor: darkMode ? 'rgba(28,24,22,0.92)' : 'rgba(255,255,255,0.92)',
          border: darkMode ? '1px solid rgba(255,255,255,0.12)' : '1px solid #E5DCD3',
          boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
          borderRadius: '20px',
          padding: '8px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          transition: 'all 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
          pointerEvents: isImmersiveMode ? 'none' : 'auto',
          opacity: isImmersiveMode ? 0 : 1,
        }}
      >
        {/* OUTIL CRAYON */}
        <button
          type="button"
          onClick={() => setTool('pencil')}
          style={{
            border: 'none',
            backgroundColor: tool === 'pencil' ? '#C67D5B' : 'transparent',
            color: tool === 'pencil' ? '#FFFFFF' : (darkMode ? '#FAF7F2' : '#3D3530'),
            padding: '8px 10px',
            borderRadius: '10px',
            cursor: 'pointer',
          }}
          title="Crayon fin"
        >
          <Pen size={18} />
        </button>

        {/* OUTIL PINCEAU */}
        <button
          type="button"
          onClick={() => setTool('brush')}
          style={{
            border: 'none',
            backgroundColor: tool === 'brush' ? '#C67D5B' : 'transparent',
            color: tool === 'brush' ? '#FFFFFF' : (darkMode ? '#FAF7F2' : '#3D3530'),
            padding: '8px 10px',
            borderRadius: '10px',
            cursor: 'pointer',
          }}
          title="Pinceau aquarelle"
        >
          <Brush size={18} />
        </button>

        {/* OUTIL SURLIGNEUR */}
        <button
          type="button"
          onClick={() => setTool('highlighter')}
          style={{
            border: 'none',
            backgroundColor: tool === 'highlighter' ? '#C67D5B' : 'transparent',
            color: tool === 'highlighter' ? '#FFFFFF' : (darkMode ? '#FAF7F2' : '#3D3530'),
            padding: '8px 10px',
            borderRadius: '10px',
            cursor: 'pointer',
          }}
          title="Surligneur"
        >
          <Highlighter size={18} />
        </button>

        {/* OUTIL GOMME */}
        <button
          type="button"
          onClick={() => setTool('eraser')}
          style={{
            border: 'none',
            backgroundColor: tool === 'eraser' ? '#C67D5B' : 'transparent',
            color: tool === 'eraser' ? '#FFFFFF' : (darkMode ? '#FAF7F2' : '#3D3530'),
            padding: '8px 10px',
            borderRadius: '10px',
            cursor: 'pointer',
          }}
          title="Gomme vectorielle"
        >
          <Eraser size={18} />
        </button>

        <div style={{ width: '1px', height: '22px', backgroundColor: darkMode ? 'rgba(255,255,255,0.15)' : '#E5DCD3', margin: '0 2px' }} />

        {/* FORMES GÉOMÉTRIQUES */}
        <button
          type="button"
          onClick={() => setTool('rect')}
          style={{
            border: 'none',
            backgroundColor: tool === 'rect' ? '#C67D5B' : 'transparent',
            color: tool === 'rect' ? '#FFFFFF' : (darkMode ? '#FAF7F2' : '#3D3530'),
            padding: '8px 10px',
            borderRadius: '10px',
            cursor: 'pointer',
          }}
          title="Rectangle"
        >
          <Square size={18} />
        </button>

        <button
          type="button"
          onClick={() => setTool('circle')}
          style={{
            border: 'none',
            backgroundColor: tool === 'circle' ? '#C67D5B' : 'transparent',
            color: tool === 'circle' ? '#FFFFFF' : (darkMode ? '#FAF7F2' : '#3D3530'),
            padding: '8px 10px',
            borderRadius: '10px',
            cursor: 'pointer',
          }}
          title="Cercle"
        >
          <Circle size={18} />
        </button>

        <button
          type="button"
          onClick={() => setTool('arrow')}
          style={{
            border: 'none',
            backgroundColor: tool === 'arrow' ? '#C67D5B' : 'transparent',
            color: tool === 'arrow' ? '#FFFFFF' : (darkMode ? '#FAF7F2' : '#3D3530'),
            padding: '8px 10px',
            borderRadius: '10px',
            cursor: 'pointer',
          }}
          title="Flèche"
        >
          <ArrowRight size={18} />
        </button>

        <div style={{ width: '1px', height: '22px', backgroundColor: darkMode ? 'rgba(255,255,255,0.15)' : '#E5DCD3', margin: '0 2px' }} />

        {/* POST-IT & TEXTE */}
        <button
          type="button"
          onClick={() => setTool('sticky')}
          style={{
            border: 'none',
            backgroundColor: tool === 'sticky' ? '#C67D5B' : 'transparent',
            color: tool === 'sticky' ? '#FFFFFF' : (darkMode ? '#FAF7F2' : '#3D3530'),
            padding: '8px 10px',
            borderRadius: '10px',
            cursor: 'pointer',
          }}
          title="Ajouter un Post-it"
        >
          <StickyNote size={18} />
        </button>

        <button
          type="button"
          onClick={() => setTool('text')}
          style={{
            border: 'none',
            backgroundColor: tool === 'text' ? '#C67D5B' : 'transparent',
            color: tool === 'text' ? '#FFFFFF' : (darkMode ? '#FAF7F2' : '#3D3530'),
            padding: '8px 10px',
            borderRadius: '10px',
            cursor: 'pointer',
          }}
          title="Ajouter du Texte"
        >
          <Type size={18} />
        </button>

        <button
          type="button"
          onClick={() => setTool('hand')}
          style={{
            border: 'none',
            backgroundColor: tool === 'hand' ? '#C67D5B' : 'transparent',
            color: tool === 'hand' ? '#FFFFFF' : (darkMode ? '#FAF7F2' : '#3D3530'),
            padding: '8px 10px',
            borderRadius: '10px',
            cursor: 'pointer',
          }}
          title="Outil Main (Déplacement de la vue)"
        >
          <Hand size={18} />
        </button>

        <div style={{ width: '1px', height: '22px', backgroundColor: darkMode ? 'rgba(255,255,255,0.15)' : '#E5DCD3', margin: '0 2px' }} />

        {/* SÉLECTEUR DE COULEURS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {COLOR_PALETTE.slice(0, 4).map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setColor(c.hex)}
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                backgroundColor: c.hex,
                border: color === c.hex ? '2px solid #FFFFFF' : '1px solid rgba(0,0,0,0.2)',
                boxShadow: color === c.hex ? '0 0 0 2px #C67D5B' : 'none',
                cursor: 'pointer',
              }}
            />
          ))}
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            style={{
              width: '24px',
              height: '24px',
              padding: 0,
              border: 'none',
              borderRadius: '50%',
              cursor: 'pointer',
              background: 'transparent',
            }}
            title="Sélecteur de couleur personnalisé"
          />
        </div>

        <div style={{ width: '1px', height: '22px', backgroundColor: darkMode ? 'rgba(255,255,255,0.15)' : '#E5DCD3', margin: '0 2px' }} />

        {/* CONTRÔLES ZOOM & UNDO/REDO */}
        <button
          type="button"
          onClick={handleUndo}
          disabled={paths.length === 0}
          style={{ border: 'none', background: 'transparent', cursor: paths.length === 0 ? 'default' : 'pointer', opacity: paths.length === 0 ? 0.3 : 1, color: darkMode ? '#FAF7F2' : '#3D3530' }}
          title="Annuler (Undo)"
        >
          <RotateCcw size={16} />
        </button>

        <button
          type="button"
          onClick={handleRedo}
          disabled={redoStack.length === 0}
          style={{ border: 'none', background: 'transparent', cursor: redoStack.length === 0 ? 'default' : 'pointer', opacity: redoStack.length === 0 ? 0.3 : 1, color: darkMode ? '#FAF7F2' : '#3D3530' }}
          title="Rétablir (Redo)"
        >
          <RotateCw size={16} />
        </button>

        <button
          type="button"
          onClick={handleZoomIn}
          style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: darkMode ? '#FAF7F2' : '#3D3530' }}
          title="Zoom +"
        >
          <ZoomIn size={16} />
        </button>

        <button
          type="button"
          onClick={handleZoomOut}
          style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: darkMode ? '#FAF7F2' : '#3D3530' }}
          title="Zoom -"
        >
          <ZoomOut size={16} />
        </button>

        <button
          type="button"
          onClick={handleResetZoom}
          style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '11px', fontWeight: '800', color: darkMode ? '#FAF7F2' : '#3D3530' }}
          title="Réinitialiser le zoom"
        >
          {Math.round(zoom * 100)}%
        </button>

        <button
          type="button"
          onClick={handleClearAll}
          style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#EF4444', marginLeft: '4px' }}
          title="Effacer tout le tableau"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* MODALE DIALOGUE POUR PUBLIER LA VERSION DANS LE CHAT */}
      {isPublishModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            zIndex: 100030,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '480px',
              backgroundColor: darkMode ? '#221D1A' : '#FAF7F2',
              borderRadius: '24px',
              padding: '24px',
              border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid var(--border-color)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Tag size={18} color="#C67D5B" />
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: darkMode ? '#FAF7F2' : '#3D3530' }}>
                  Publier la Version V{versionNumber + 1}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPublishModalOpen(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: darkMode ? '#A89E95' : '#6B5E54' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ margin: '0 0 16px', fontSize: '13px', color: darkMode ? '#B8ABA0' : '#6B5E54', lineHeight: 1.5 }}>
              Cette action enregistre un instantané haute définition de votre tableau blanc et diffuse une invitation cliquable dans la discussion de groupe.
            </p>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: darkMode ? '#FAF7F2' : '#3D3530', marginBottom: '6px' }}>
                Titre de la version :
              </label>
              <input
                type="text"
                value={publishTitle}
                onChange={(e) => setPublishTitle(e.target.value)}
                placeholder="Ex: Wireframes & Schéma d'architecture"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: darkMode ? '1px solid rgba(255,255,255,0.12)' : '1px solid #E0D4C5',
                  backgroundColor: darkMode ? '#181412' : '#FFFFFF',
                  color: darkMode ? '#FAF7F2' : '#3D3530',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: darkMode ? '#FAF7F2' : '#3D3530', marginBottom: '6px' }}>
                Résumé des changements (optionnel) :
              </label>
              <textarea
                value={publishChangelog}
                onChange={(e) => setPublishChangelog(e.target.value)}
                placeholder="Ex: Ajout des maquettes de la vue mobile et corrections des flux de paiement..."
                style={{
                  width: '100%',
                  height: '70px',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: darkMode ? '1px solid rgba(255,255,255,0.12)' : '1px solid #E0D4C5',
                  backgroundColor: darkMode ? '#181412' : '#FFFFFF',
                  color: darkMode ? '#FAF7F2' : '#3D3530',
                  fontSize: '13px',
                  outline: 'none',
                  resize: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setIsPublishModalOpen(false)}
                style={{
                  border: 'none',
                  backgroundColor: darkMode ? 'rgba(255,255,255,0.08)' : '#EFE8DE',
                  color: darkMode ? '#FAF7F2' : '#3D3530',
                  padding: '10px 16px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmPublishToChat}
                disabled={isSendingToChat}
                className="premium-button"
                style={{
                  border: 'none',
                  background: 'linear-gradient(135deg, #C67D5B 0%, #B86B49 100%)',
                  color: '#FFFFFF',
                  padding: '10px 20px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: '800',
                  cursor: isSendingToChat ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 6px 18px rgba(198,125,91,0.35)',
                }}
              >
                <Share2 size={15} />
                <span>{isSendingToChat ? 'Publication...' : `Valider & Envoyer (V${versionNumber + 1})`}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST SUCCÈS PUBLICATION */}
      {sendSuccessToast && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            backgroundColor: '#10B981',
            color: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: '14px',
            fontWeight: '800',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 10px 30px rgba(16, 185, 129, 0.45)',
            zIndex: 100040,
            animation: 'popIn 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          <Check size={18} strokeWidth={3} />
          <span>Version V{versionNumber} partagée dans la conversation avec succès !</span>
        </div>
      )}
    </div>,
    document.body
  );
}
