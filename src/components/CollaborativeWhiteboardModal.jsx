/**
 * CollaborativeWhiteboardModal.jsx — Moteur de Tableau Blanc Collaboratif Multi-versions (Standard International)
 *
 * Architecture Technique :
 * 1. Synchronisation temps réel 60 FPS (WebRTC P2P 0ms & Firestore anti-conflits).
 * 2. Séparation stricte localPaths vs remotePaths (Zéro écrasement de traits).
 * 3. Effet Ghosting sur les traits distants (opacity: 0.5) et curseurs collaboratifs en direct.
 * 4. Moteur d'historique Undo / Redo complet (Pile d'historique + raccourcis Ctrl+Z / Ctrl+Y).
 * 5. Couleurs infinies (Palette rapide + sélecteur natif <input type="color">).
 * 6. Barre d'outils dynamique avec support mobile fluide (touch-action: pan-x, overflow-x: auto).
 * 7. Navigation Spatiale : Zoom molette centré + Gestes Pinch-to-zoom & Pan à 2 doigts sur mobile.
 * 8. Export Snapshot rogné sur Bounding Box (DataURL) + Versioning et invitation de chat interactif.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Pen, Highlighter, Eraser, Square, Circle, ArrowRight,
  RotateCcw, RotateCw, Trash2, StickyNote,
  Type, Hand, Brush, Share2, Check, Eye, Maximize2,
  Sparkles
} from 'lucide-react';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { whiteboardP2PService } from '../services/whiteboardP2PService';
import {
  saveWorkspaceVersion,
  loadWorkspaceData,
  WORKSPACE_TYPES,
} from '../features/workspace/workspaceService';

const CURATED_PALETTE = [
  { id: 'troco', hex: '#C67D5B', name: 'Terracotta Troco' },
  { id: 'anthracite', hex: '#1F2937', name: 'Anthracite' },
  { id: 'white', hex: '#FFFFFF', name: 'Blanc Pur' },
  { id: 'red', hex: '#EF4444', name: 'Rouge Corail' },
  { id: 'blue', hex: '#3B82F6', name: 'Bleu Royal' },
  { id: 'green', hex: '#10B981', name: 'Vert Émeraude' },
  { id: 'amber', hex: '#F59E0B', name: 'Jaune Ambre' },
  { id: 'purple', hex: '#8B5CF6', name: 'Violet Électrique' },
  { id: 'pink', hex: '#EC4899', name: 'Rose Vif' },
  { id: 'cyan', hex: '#06B6D4', name: 'Cyan Lagon' },
];

const STICKY_COLORS = [
  { hex: '#FEF08A', name: 'Jaune Pastel' },
  { hex: '#FECDD3', name: 'Rose Pastel' },
  { hex: '#A7F3D0', name: 'Menthe' },
  { hex: '#BAE6FD', name: 'Ciel' },
  { hex: '#E9D5FF', name: 'Lavande' },
];

export default function CollaborativeWhiteboardModal({
  isOpen,
  onClose,
  groupId = 'default_chat',
  boardId = null,
  workspaceId = null,
  version = null,
  initialVersion = null,
  projectTitle = 'Tableau Blanc Collaboratif',
  currentUser = null,
  darkMode = false,
  onSendToChat = null,
  onSendMessage = null,
  handleSendMessage = null,
}) {
  const effectiveId = workspaceId || boardId || `ws_${groupId}_whiteboard`;
  const myUid = currentUser?.uid || currentUser?.id || 'local_user';
  const myName = currentUser?.name || currentUser?.username || 'Moi';

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const colorInputRef = useRef(null);

  // 1. Outils Whiteboard
  const [tool, setTool] = useState('pencil');
  const [color, setColor] = useState('#C67D5B');
  const [lineWidth, setLineWidth] = useState(4);
  const [showGrid] = useState(true);

  // 2. Mode Immersion Absolue (Plein écran sans distractions)
  const [isImmersiveMode, setIsImmersiveMode] = useState(false);

  // 3. Séparation stricte d'état pour zéro conflit
  const [localPaths, setLocalPaths] = useState([]);
  const [remotePaths, setRemotePaths] = useState([]);
  const [stickyNotes, setStickyNotes] = useState([]);
  const [textElements, setTextElements] = useState([]);
  const [currentPath, setCurrentPath] = useState(null);

  // 4. Moteur d'historique Undo / Redo
  const [history, setHistory] = useState([
    { localPaths: [], stickyNotes: [], textElements: [] }
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const historyIndexRef = useRef(0);

  // 5. Caméra infinie (Viewport Pan & Zoom)
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  // 6. Multi-versions & Métadonnées
  const [versionNumber, setVersionNumber] = useState(1);
  const [workspaceTitle, setWorkspaceTitle] = useState(projectTitle || 'Tableau Blanc Collaboratif');
  const [saveStatus, setSaveStatus] = useState('Synchronisé en direct 🟢');
  const [lastEditor, setLastEditor] = useState(myName);
  const [isSavingAndSharing, setIsSavingAndSharing] = useState(false);
  const [shareSuccessToast, setShareSuccessToast] = useState(false);

  // 7. Curseur P2P Collaboratif (Ghosting live)
  const [remoteCursors, setRemoteCursors] = useState({});

  // 8. État d'édition / sélection
  const [editingTextId, setEditingTextId] = useState(null);
  const [selectedStickyId, setSelectedStickyId] = useState(null);

  // Références d'interaction rapide
  const isDrawingRef = useRef(false);
  const isPanningRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0, origPanX: 0, origPanY: 0 });
  const touchStateRef = useRef({ distance: 0, midX: 0, midY: 0, origPanX: 0, origPanY: 0, origZoom: 1 });
  const draggingStickyRef = useRef(null);
  const resizingTextRef = useRef(null);
  const firestoreDebounceTimerRef = useRef(null);
  const p2pBroadcastThrottleRef = useRef(0);
  const lastLocalModificationTimeRef = useRef(0);

  // Verrouillage strict du scroll global du document
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Conversion Coordonnées Écran (Pixel) -> Coordonnées Monde (World Canvas)
  const getCanvasCoords = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, screenX: 0, screenY: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX !== undefined ? e.clientX : e.touches?.[0]?.clientX || 0;
    const clientY = e.clientY !== undefined ? e.clientY : e.touches?.[0]?.clientY || 0;
    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;

    const worldX = (screenX - pan.x) / zoom;
    const worldY = (screenY - pan.y) / zoom;
    return { x: worldX, y: worldY, screenX, screenY };
  }, [pan.x, pan.y, zoom]);

  // ================= 2. MOTEUR D'HISTORIQUE LOCAL (Undo / Redo Fiable) =================
  const pushToHistory = useCallback((newLocalPaths, newStickies, newTexts) => {
    setHistory((prevHistory) => {
      const curIdx = historyIndexRef.current;
      const nextHistory = prevHistory.slice(0, curIdx + 1);
      const snapshot = {
        localPaths: [...newLocalPaths],
        stickyNotes: [...newStickies],
        textElements: [...newTexts],
      };
      const updated = [...nextHistory, snapshot];
      if (updated.length > 50) updated.shift();
      const newIdx = updated.length - 1;
      historyIndexRef.current = newIdx;
      setHistoryIndex(newIdx);
      return updated;
    });
  }, []);

  const handleUndo = useCallback(() => {
    setHistory((prevHistory) => {
      const curIdx = historyIndexRef.current;
      if (curIdx > 0) {
        const targetIndex = curIdx - 1;
        const targetState = prevHistory[targetIndex];
        if (targetState) {
          lastLocalModificationTimeRef.current = Date.now();
          setLocalPaths(targetState.localPaths || []);
          setStickyNotes(targetState.stickyNotes || []);
          setTextElements(targetState.textElements || []);
          historyIndexRef.current = targetIndex;
          setHistoryIndex(targetIndex);
        }
      }
      return prevHistory;
    });
  }, []);

  const handleRedo = useCallback(() => {
    setHistory((prevHistory) => {
      const curIdx = historyIndexRef.current;
      if (curIdx < prevHistory.length - 1) {
        const targetIndex = curIdx + 1;
        const targetState = prevHistory[targetIndex];
        if (targetState) {
          lastLocalModificationTimeRef.current = Date.now();
          setLocalPaths(targetState.localPaths || []);
          setStickyNotes(targetState.stickyNotes || []);
          setTextElements(targetState.textElements || []);
          historyIndexRef.current = targetIndex;
          setHistoryIndex(targetIndex);
        }
      }
      return prevHistory;
    });
  }, []);

  // Gestion du zoom à la molette de la souris centré sur le curseur
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.88;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setZoom((prevZoom) => {
      const newZoom = Math.min(Math.max(prevZoom * zoomFactor, 0.25), 4.0);
      setPan((prevPan) => ({
        x: mouseX - ((mouseX - prevPan.x) / prevZoom) * newZoom,
        y: mouseY - ((mouseY - prevPan.y) / prevZoom) * newZoom,
      }));
      return newZoom;
    });
  }, []);

  // Raccourcis clavier (Ctrl+Z, Ctrl+Y, Cmd+Z, Cmd+Shift+Z)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      const isInput = e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA');
      if (isInput) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleUndo, handleRedo]);

  // ================= 3. RENDU DU CANVAS (60 FPS & Effet Ghosting) =================
  const applyBrushStyleToContext = (ctx, brushTool, brushColor, brushWidth, isRemote = false) => {
    ctx.lineWidth = brushWidth;
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';

    // RÈGLE GHOSTING STRICTE : Opacity 0.5 sur les traits distants pendant qu'ils sont dessinés
    if (brushTool === 'pencil' || brushTool === 'pen') {
      ctx.lineCap = 'butt';
      ctx.lineJoin = 'miter';
      ctx.globalAlpha = isRemote ? 0.5 : 1.0;
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = brushColor;
      if (isRemote) {
        ctx.shadowBlur = 4;
        ctx.shadowColor = brushColor;
      }
    } else if (brushTool === 'brush') {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = isRemote ? 0.5 : 0.88;
      ctx.globalCompositeOperation = 'source-over';
      ctx.shadowBlur = Math.max(2, brushWidth * 0.85);
      ctx.shadowColor = brushColor;
      ctx.strokeStyle = brushColor;
    } else if (brushTool === 'highlighter') {
      ctx.lineCap = 'square';
      ctx.lineJoin = 'bevel';
      ctx.globalAlpha = isRemote ? 0.2 : 0.32;
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
      ctx.globalAlpha = isRemote ? 0.5 : 1.0;
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = brushColor;
    }
  };

  const redrawCanvas = useCallback(() => {
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

    // Tous les traits combinés (Distants avec ghosting + Locaux + Trait en cours)
    const allPathsToRender = [
      ...remotePaths,
      ...localPaths,
      ...(currentPath ? [currentPath] : [])
    ];

    allPathsToRender.forEach((path) => {
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
  }, [remotePaths, localPaths, currentPath, pan.x, pan.y, zoom]);

  // Redimensionnement fluide du canvas
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

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // Synchronisation Firestore Debouncée
  const debouncedSyncToFirestore = useCallback((
    currentLocalPaths = localPaths,
    currentRemotePaths = remotePaths,
    currentStickyNotes = stickyNotes,
    currentTextElements = textElements,
    currentVersion = versionNumber,
    currentTitle = workspaceTitle
  ) => {
    if (!effectiveId || !db) return;

    if (firestoreDebounceTimerRef.current) {
      clearTimeout(firestoreDebounceTimerRef.current);
    }

    setSaveStatus('Enregistrement...');

    firestoreDebounceTimerRef.current = setTimeout(async () => {
      try {
        const docRef = doc(db, 'project_whiteboards', String(effectiveId));
        const combinedPaths = [...currentRemotePaths, ...currentLocalPaths].slice(-400);

        const payload = {
          boardId: effectiveId,
          groupId,
          title: currentTitle,
          versionNumber: currentVersion,
          paths: combinedPaths,
          stickyNotes: currentStickyNotes,
          textElements: currentTextElements,
          updatedAt: serverTimestamp(),
          lastEditor: myName,
          lastEditorUid: myUid,
        };

        await setDoc(docRef, payload, { merge: true });
        setSaveStatus('Synchronisé en direct 🟢');
      } catch (err) {
        console.warn('[Firestore Whiteboard Sync] error:', err);
        setSaveStatus('Mode P2P Direct ⚡');
      }
    }, 380);
  }, [effectiveId, groupId, localPaths, remotePaths, stickyNotes, textElements, versionNumber, workspaceTitle, myName, myUid]);

  // ================= 3. SYNCHRONISATION MULTIJOUEUR (P2P + Firestore) =================
  useEffect(() => {
    if (!isOpen || !effectiveId) return;

    whiteboardP2PService.joinRoom(effectiveId, (event) => {
      if (event.authorName) setLastEditor(event.authorName);

      if (event.type === 'path_add' && event.path) {
        const incoming = { ...event.path, isRemote: true };
        setRemotePaths((prev) => [...prev, incoming].slice(-400));
      } else if (event.type === 'cursor_move' && event.cursor) {
        setRemoteCursors((prev) => ({
          ...prev,
          [event.peerId || event.cursor.authorUid || 'peer']: {
            ...event.cursor,
            lastSeen: Date.now(),
          },
        }));
      } else if (event.type === 'sticky_add' && event.sticky) {
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
        setLocalPaths([]);
        setRemotePaths([]);
        setStickyNotes([]);
        setTextElements([]);
      }
    });

    let unsubFirestore = () => {};
    if (db) {
      try {
        const docRef = doc(db, 'project_whiteboards', String(effectiveId));
        unsubFirestore = onSnapshot(docRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            if (data.lastEditor) setLastEditor(data.lastEditor);
            if (data.versionNumber) setVersionNumber(data.versionNumber);
            if (data.title) setWorkspaceTitle(data.title);

            // RÈGLE ANTI-CONFLIT : On ne met à jour que les traits distants pour ne jamais écraser les traits locaux
            if (data.paths && Array.isArray(data.paths)) {
              const onlyRemote = data.paths
                .filter((p) => p && p.authorUid !== myUid)
                .map((p) => ({ ...p, isRemote: true }));
              setRemotePaths(onlyRemote);
            }

            if (!isDrawingRef.current && Date.now() - lastLocalModificationTimeRef.current > 2000) {
              if (data.stickyNotes && Array.isArray(data.stickyNotes) && !draggingStickyRef.current) {
                setStickyNotes(data.stickyNotes);
              }
              if (data.textElements && Array.isArray(data.textElements) && !editingTextId && !resizingTextRef.current) {
                setTextElements(data.textElements);
              }
            }

            setSaveStatus('P2P Direct ⚡ 0ms');
          }
        }, (err) => {
          console.warn('[Firestore Whiteboard] Note:', err);
        });
      } catch (e) {
        console.warn('[Firestore Whiteboard] Error:', e);
      }
    }

    return () => {
      unsubFirestore();
      whiteboardP2PService.leaveRoom();
    };
  }, [isOpen, effectiveId, myUid, editingTextId]);

  // Chargement initial des données de la session
  useEffect(() => {
    if (!isOpen || !effectiveId) return;

    const loadInitialState = async () => {
      try {
        const loaded = await loadWorkspaceData(effectiveId);
        if (loaded && loaded.data) {
          const loadedPaths = Array.isArray(loaded.data.paths) ? loaded.data.paths : [];
          const loadedStickies = Array.isArray(loaded.data.stickyNotes) ? loaded.data.stickyNotes : [];
          const loadedTexts = Array.isArray(loaded.data.textElements) ? loaded.data.textElements : [];

          setLocalPaths(loadedPaths);
          setStickyNotes(loadedStickies);
          setTextElements(loadedTexts);
          if (loaded.version) setVersionNumber(Number(loaded.version) || 1);
          if (loaded.title) setWorkspaceTitle(loaded.title);

          pushToHistory(loadedPaths, loadedStickies, loadedTexts);
        }
      } catch (err) {
        console.warn('[CollaborativeWhiteboard] Initial load failed:', err);
      }
    };

    loadInitialState();
  }, [isOpen, effectiveId, version, initialVersion, pushToHistory]);

  // ================= GESTION DES POINTER EVENTS =================
  const handlePointerDown = (e) => {
    const coords = getCanvasCoords(e);
    startPosRef.current = coords;

    if (tool === 'hand') {
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
      lastLocalModificationTimeRef.current = Date.now();
      const newSticky = {
        id: `sticky-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        x: coords.x - 70,
        y: coords.y - 60,
        width: 150,
        height: 130,
        text: 'Nouveau Post-it',
        color: STICKY_COLORS[Math.floor(Math.random() * STICKY_COLORS.length)].hex,
        authorName: myName,
        authorUid: myUid,
        createdAt: Date.now(),
      };
      const nextStickies = [...stickyNotes, newSticky];
      setStickyNotes(nextStickies);
      pushToHistory(localPaths, nextStickies, textElements);
      whiteboardP2PService.broadcastEvent('sticky_add', { sticky: newSticky });
      debouncedSyncToFirestore(localPaths, remotePaths, nextStickies, textElements);
      setTool('pencil');
      return;
    }

    if (tool === 'text') {
      lastLocalModificationTimeRef.current = Date.now();
      const newText = {
        id: `text-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        x: coords.x,
        y: coords.y,
        width: 220,
        height: 60,
        text: 'Votre texte...',
        color: color === '#FFFFFF' && !darkMode ? '#1F2937' : color,
        fontSize: 24,
        fontFamily: 'Inter, sans-serif',
        authorName: myName,
        authorUid: myUid,
        createdAt: Date.now(),
      };
      const nextTexts = [...textElements, newText];
      setTextElements(nextTexts);
      setEditingTextId(newText.id);
      pushToHistory(localPaths, stickyNotes, nextTexts);
      whiteboardP2PService.broadcastEvent('text_add', { text: newText });
      debouncedSyncToFirestore(localPaths, remotePaths, stickyNotes, nextTexts);
      setTool('pencil');
      return;
    }

    // Outils de dessin
    isDrawingRef.current = true;
    lastLocalModificationTimeRef.current = Date.now();

    if (tool === 'pencil' || tool === 'brush' || tool === 'highlighter' || tool === 'eraser') {
      const newPath = {
        id: `p-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        type: 'freehand',
        tool,
        color,
        lineWidth,
        points: [{ x: coords.x, y: coords.y }],
        authorName: myName,
        authorUid: myUid,
        createdAt: Date.now(),
      };
      setCurrentPath(newPath);
    } else if (tool === 'rect' || tool === 'circle') {
      const shapePath = {
        id: `s-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        type: tool,
        tool,
        color,
        lineWidth,
        x: coords.x,
        y: coords.y,
        width: 0,
        height: 0,
        authorName: myName,
        authorUid: myUid,
        createdAt: Date.now(),
      };
      setCurrentPath(shapePath);
    } else if (tool === 'arrow') {
      const arrowPath = {
        id: `a-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        type: 'arrow',
        tool,
        color,
        lineWidth,
        fromX: coords.x,
        fromY: coords.y,
        toX: coords.x,
        toY: coords.y,
        authorName: myName,
        authorUid: myUid,
        createdAt: Date.now(),
      };
      setCurrentPath(arrowPath);
    }
  };

  const handlePointerMove = (e) => {
    const coords = getCanvasCoords(e);

    // Émission du curseur collaboratif (throttlé)
    const now = Date.now();
    if (now - p2pBroadcastThrottleRef.current > 60) {
      p2pBroadcastThrottleRef.current = now;
      whiteboardP2PService.broadcastEvent('cursor_move', {
        cursor: { x: coords.x, y: coords.y, authorName: myName, authorUid: myUid, color },
      });
    }

    if (isPanningRef.current) {
      const dx = coords.screenX - panStartRef.current.x;
      const dy = coords.screenY - panStartRef.current.y;
      setPan({
        x: panStartRef.current.origPanX + dx,
        y: panStartRef.current.origPanY + dy,
      });
      return;
    }

    if (draggingStickyRef.current) {
      const { id, startX, startY, origX, origY } = draggingStickyRef.current;
      const dx = coords.x - startX;
      const dy = coords.y - startY;
      setStickyNotes((prev) =>
        prev.map((s) => (s.id === id ? { ...s, x: origX + dx, y: origY + dy } : s))
      );
      return;
    }

    if (resizingTextRef.current) {
      const { id, startX, startY, origW, origH, textStr } = resizingTextRef.current;
      const dw = coords.x - startX;
      const dh = coords.y - startY;
      const newW = Math.max(100, origW + dw);
      const newH = Math.max(40, origH + dh);

      const len = Math.max(1, textStr?.length || 1);
      const autoFontSize = Math.max(12, Math.min(84, Math.round((newW / len) * 2.2 + newH * 0.25)));

      setTextElements((prev) =>
        prev.map((t) =>
          t.id === id
            ? { ...t, width: newW, height: newH, fontSize: autoFontSize }
            : t
        )
      );
      return;
    }

    if (!isDrawingRef.current || !currentPath) return;

    if (currentPath.type === 'freehand') {
      setCurrentPath((prev) => ({
        ...prev,
        points: [...prev.points, { x: coords.x, y: coords.y }],
      }));
    } else if (currentPath.type === 'rect' || currentPath.type === 'circle') {
      const w = coords.x - startPosRef.current.x;
      const h = coords.y - startPosRef.current.y;
      setCurrentPath((prev) => ({
        ...prev,
        x: w < 0 ? coords.x : startPosRef.current.x,
        y: h < 0 ? coords.y : startPosRef.current.y,
        width: Math.abs(w),
        height: Math.abs(h),
      }));
    } else if (currentPath.type === 'arrow') {
      setCurrentPath((prev) => ({
        ...prev,
        toX: coords.x,
        toY: coords.y,
      }));
    }
  };

  const handlePointerUp = () => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
    }

    if (draggingStickyRef.current) {
      lastLocalModificationTimeRef.current = Date.now();
      const dragged = stickyNotes.find((s) => s.id === draggingStickyRef.current.id);
      if (dragged) {
        whiteboardP2PService.broadcastEvent('sticky_update', { sticky: dragged });
        pushToHistory(localPaths, stickyNotes, textElements);
        debouncedSyncToFirestore(localPaths, remotePaths, stickyNotes, textElements);
      }
      draggingStickyRef.current = null;
    }

    if (resizingTextRef.current) {
      lastLocalModificationTimeRef.current = Date.now();
      const resized = textElements.find((t) => t.id === resizingTextRef.current.id);
      if (resized) {
        whiteboardP2PService.broadcastEvent('text_update', { text: resized });
        pushToHistory(localPaths, stickyNotes, textElements);
        debouncedSyncToFirestore(localPaths, remotePaths, stickyNotes, textElements);
      }
      resizingTextRef.current = null;
    }

    // FUSION SYNCHRONE LOCALE IMMÉDIATE & ENREGISTREMENT FORCÉ DANS L'HISTORIQUE
    if (isDrawingRef.current && currentPath) {
      isDrawingRef.current = false;
      lastLocalModificationTimeRef.current = Date.now();

      const completedPath = { ...currentPath };
      const nextLocalPaths = [...localPaths, completedPath];

      setLocalPaths(nextLocalPaths);
      setCurrentPath(null);

      whiteboardP2PService.broadcastEvent('path_add', { path: completedPath });
      pushToHistory(nextLocalPaths, stickyNotes, textElements);
      debouncedSyncToFirestore(nextLocalPaths, remotePaths, stickyNotes, textElements);
    }
  };

  // ================= 4. GESTION DES VERSIONS & EXPORT CHAT =================
  const generateBoundingBoxPreview = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return '';

    const allPaths = [...remotePaths, ...localPaths];

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    allPaths.forEach((p) => {
      if (p.type === 'freehand' && p.points) {
        p.points.forEach((pt) => {
          if (pt.x < minX) minX = pt.x;
          if (pt.y < minY) minY = pt.y;
          if (pt.x > maxX) maxX = pt.x;
          if (pt.y > maxY) maxY = pt.y;
        });
      } else if (p.x !== undefined && p.y !== undefined && p.width !== undefined && p.height !== undefined) {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x + p.width > maxX) maxX = p.x + p.width;
        if (p.y + p.height > maxY) maxY = p.y + p.height;
      } else if (p.fromX !== undefined) {
        minX = Math.min(minX, p.fromX, p.toX);
        minY = Math.min(minY, p.fromY, p.toY);
        maxX = Math.max(maxX, p.fromX, p.toX);
        maxY = Math.max(maxY, p.fromY, p.toY);
      }
    });

    stickyNotes.forEach((s) => {
      minX = Math.min(minX, s.x);
      minY = Math.min(minY, s.y);
      maxX = Math.max(maxX, s.x + (s.width || 150));
      maxY = Math.max(maxY, s.y + (s.height || 130));
    });

    textElements.forEach((t) => {
      minX = Math.min(minX, t.x);
      minY = Math.min(minY, t.y);
      maxX = Math.max(maxX, t.x + (t.width || 200));
      maxY = Math.max(maxY, t.y + (t.height || 60));
    });

    const padding = 50;
    const targetW = 640;
    const targetH = 420;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = targetW;
    tempCanvas.height = targetH;
    const ctx = tempCanvas.getContext('2d');

    ctx.fillStyle = darkMode ? '#181411' : '#FAF8F5';
    ctx.fillRect(0, 0, targetW, targetH);

    if (minX !== Infinity && maxX > minX && maxY > minY) {
      const contentW = maxX - minX + padding * 2;
      const contentH = maxY - minY + padding * 2;
      const scale = Math.min(targetW / contentW, targetH / contentH);

      ctx.save();
      ctx.translate((targetW - contentW * scale) / 2, (targetH - contentH * scale) / 2);
      ctx.scale(scale, scale);
      ctx.translate(-minX + padding, -minY + padding);

      allPaths.forEach((p) => {
        ctx.save();
        ctx.beginPath();
        applyBrushStyleToContext(ctx, p.tool, p.color, p.lineWidth, false);
        if (p.type === 'freehand' && p.points && p.points.length > 0) {
          ctx.moveTo(p.points[0].x, p.points[0].y);
          for (let i = 1; i < p.points.length; i++) {
            ctx.lineTo(p.points[i].x, p.points[i].y);
          }
          ctx.stroke();
        } else if (p.type === 'rect') {
          ctx.strokeRect(p.x, p.y, p.width, p.height);
        } else if (p.type === 'circle') {
          ctx.beginPath();
          const rx = Math.abs(p.width) / 2;
          const ry = Math.abs(p.height) / 2;
          ctx.ellipse(p.x + p.width / 2, p.y + p.height / 2, rx, ry, 0, 0, 2 * Math.PI);
          ctx.stroke();
        }
        ctx.restore();
      });

      ctx.restore();
    } else {
      ctx.drawImage(canvas, 0, 0, targetW, targetH);
    }

    return tempCanvas.toDataURL('image/jpeg', 0.88);
  }, [remotePaths, localPaths, stickyNotes, textElements, darkMode]);

  const handleSaveAndShare = async () => {
    if (isSavingAndSharing) return;

    // 1. Demande du nom de version via dialogue
    const defaultVersionLabel = `V${versionNumber + 1}`;
    const userVersionInput = window.prompt("Nom de la version (ex: V2)", defaultVersionLabel);
    if (userVersionInput === null) {
      return;
    }
    const chosenVersion = userVersionInput.trim() || defaultVersionLabel;

    setIsSavingAndSharing(true);
    setSaveStatus(`Enregistrement de ${chosenVersion}...`);

    try {
      // 2. Snapshot rogné sur Bounding Box
      const previewUrl = generateBoundingBoxPreview();

      // 3. Sauvegarde incrémentale de la version dans Firestore
      const res = await saveWorkspaceVersion({
        workspaceId: effectiveId,
        chatId: groupId,
        type: WORKSPACE_TYPES.WHITEBOARD,
        title: workspaceTitle,
        data: { paths: [...remotePaths, ...localPaths], stickyNotes, textElements },
        previewUrl,
        currentUser,
        changeSummary: `Version ${chosenVersion}`,
      });

      const nextVersionNum = res.version || versionNumber + 1;
      setVersionNumber(nextVersionNum);

      // 4. Payload d'invitation conforme avec type workspace_invite
      const invitePayload = {
        type: 'workspace_invite',
        kind: 'workspace_invite',
        workspaceType: 'whiteboard',
        workspaceId: effectiveId,
        boardId: effectiveId,
        version: chosenVersion,
        previewUrl,
        workspaceTitle: workspaceTitle,
        text: `🎨 ${myName} a partagé ${chosenVersion} du Tableau Blanc`,
        timestamp: Date.now(),
      };

      // 5. Déclenchement immédiat de l'émission chat
      const sendFn = onSendMessage || handleSendMessage || onSendToChat;
      if (typeof sendFn === 'function') {
        sendFn(invitePayload);
      }

      setSaveStatus(`Version ${chosenVersion} enregistrée et partagée ! ✨`);
      setShareSuccessToast(true);
      setTimeout(() => setShareSuccessToast(false), 3500);
    } catch (err) {
      console.error('[CollaborativeWhiteboard] Save & Share error:', err);
      setSaveStatus('Erreur de sauvegarde');
    } finally {
      setIsSavingAndSharing(false);
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        width: '100vw',
        height: '100dvh',
        backgroundColor: darkMode ? '#12100E' : '#FDFBF7',
        color: darkMode ? '#FAF7F2' : '#1F2937',
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'none',
        overflow: 'hidden',
        pointerEvents: 'auto',
      }}
    >
      {/* BOUTON FERMER / RETOUR AU CHAT PROÉMINENT EN HAUT À GAUCHE (Z-INDEX MAXIMUM & TOUCH TARGET >= 44px) */}
      <button
        type="button"
        onClick={onClose}
        className="premium-button"
        style={{
          position: 'absolute',
          top: 'max(12px, env(safe-area-inset-top, 12px))',
          left: '14px',
          zIndex: 1000005,
          minWidth: '44px',
          minHeight: '44px',
          padding: '10px 18px',
          borderRadius: '999px',
          border: darkMode ? '1px solid rgba(255,255,255,0.22)' : '1px solid rgba(0,0,0,0.15)',
          backgroundColor: darkMode ? 'rgba(26,22,19,0.95)' : 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          color: 'inherit',
          fontSize: '13px',
          fontWeight: '800',
          cursor: 'pointer',
          boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
        title="Fermer le tableau blanc et revenir au chat"
        aria-label="Fermer le tableau blanc"
      >
        <X size={20} strokeWidth={2.5} />
        <span>Fermer</span>
      </button>

      {/* 1. EN-TÊTE PRINCIPAL (Masqué en mode immersion) */}
      {!isImmersiveMode && (
        <header
          style={{
            height: '60px',
            padding: '0 20px 0 130px',
            borderBottom: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
            backgroundColor: darkMode ? 'rgba(21,18,15,0.85)' : 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
            zIndex: 10,
          }}
        >
          {/* Titre & Statut */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #C67D5B 0%, #A8644A 100%)',
                color: '#FFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(198,125,91,0.35)',
              }}
            >
              <Brush size={20} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="text"
                  value={workspaceTitle}
                  onChange={(e) => setWorkspaceTitle(e.target.value)}
                  style={{
                    fontSize: '15px',
                    fontWeight: '900',
                    background: 'none',
                    border: 'none',
                    outline: 'none',
                    color: 'inherit',
                    padding: 0,
                    maxWidth: '220px',
                  }}
                />
                <span
                  style={{
                    fontSize: '10.5px',
                    fontWeight: '800',
                    backgroundColor: 'rgba(198,125,91,0.2)',
                    color: '#C67D5B',
                    padding: '2px 7px',
                    borderRadius: '6px',
                  }}
                >
                  V{versionNumber}
                </span>
              </div>
              <div style={{ fontSize: '11px', color: darkMode ? '#A8998C' : '#6B7280', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>{saveStatus}</span>
                <span>•</span>
                <span>Modifié par <strong>{lastEditor}</strong></span>
              </div>
            </div>
          </div>

          {/* Boutons d'action Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Sauvegarder & Partager dans le chat */}
            <button
              type="button"
              disabled={isSavingAndSharing}
              onClick={handleSaveAndShare}
              className="premium-button"
              style={{
                padding: '10px 18px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #C67D5B 0%, #A8644A 100%)',
                color: '#FFF',
                fontSize: '13px',
                fontWeight: '800',
                cursor: isSavingAndSharing ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(198,125,91,0.35)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                minHeight: '40px',
              }}
            >
              {isSavingAndSharing ? <Sparkles size={16} /> : <Share2 size={16} />}
              <span>{isSavingAndSharing ? 'Enregistrement...' : 'Sauvegarder'}</span>
            </button>
          </div>
        </header>
      )}

      {/* BOUTON FLOTTANT DE SORTIE D'IMMERSION */}
      {isImmersiveMode && (
        <button
          type="button"
          onClick={() => setIsImmersiveMode(false)}
          className="premium-button"
          style={{
            position: 'fixed',
            top: '16px',
            right: '16px',
            zIndex: 1000000,
            padding: '10px 16px',
            borderRadius: '999px',
            border: '1px solid rgba(255,255,255,0.15)',
            backgroundColor: darkMode ? 'rgba(26,22,19,0.85)' : 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(16px)',
            color: 'inherit',
            fontSize: '12.5px',
            fontWeight: '800',
            cursor: 'pointer',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Eye size={16} color="#C67D5B" />
          <span>Afficher les outils</span>
        </button>
      )}

      {/* TOAST DE SUCCÈS DE PARTAGE */}
      {shareSuccessToast && (
        <div
          style={{
            position: 'fixed',
            bottom: '84px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000000,
            backgroundColor: '#10B981',
            color: '#FFF',
            padding: '10px 20px',
            borderRadius: '999px',
            fontWeight: '800',
            fontSize: '13px',
            boxShadow: '0 10px 30px rgba(16,185,129,0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <Check size={18} />
          Version V{versionNumber} sauvegardée et publiée dans le chat !
        </div>
      )}

      {/* 2. ZONE DE DESSIN CANVAS 100% PLEIN ÉCRAN */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          position: 'relative',
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          backgroundColor: darkMode ? '#12100E' : '#FDFBF7',
          backgroundImage: showGrid
            ? darkMode
              ? 'radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)'
              : 'radial-gradient(circle, rgba(0,0,0,0.08) 1px, transparent 1px)'
            : 'none',
          backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
          touchAction: 'none',
        }}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onTouchStart={(e) => {
          if (e.touches.length === 2) {
            const t1 = e.touches[0];
            const t2 = e.touches[1];
            const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
            const midX = (t1.clientX + t2.clientX) / 2;
            const midY = (t1.clientY + t2.clientY) / 2;
            touchStateRef.current = {
              distance: dist,
              midX,
              midY,
              origPanX: pan.x,
              origPanY: pan.y,
              origZoom: zoom,
            };
            isDrawingRef.current = false;
            setCurrentPath(null);
          }
        }}
        onTouchMove={(e) => {
          if (e.touches.length === 2) {
            e.preventDefault();
            const t1 = e.touches[0];
            const t2 = e.touches[1];
            const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
            const midX = (t1.clientX + t2.clientX) / 2;
            const midY = (t1.clientY + t2.clientY) / 2;

            const { distance: initDist, midX: initMidX, midY: initMidY, origPanX, origPanY, origZoom } = touchStateRef.current;
            if (initDist > 0) {
              const scaleRatio = dist / initDist;
              const newZoom = Math.min(Math.max(origZoom * scaleRatio, 0.25), 4.0);
              const dx = midX - initMidX;
              const dy = midY - initMidY;
              setZoom(newZoom);
              setPan({
                x: origPanX + dx,
                y: origPanY + dy,
              });
            }
          }
        }}
        onTouchEnd={(e) => {
          if (e.touches.length < 2) {
            touchStateRef.current.distance = 0;
          }
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            cursor: tool === 'hand' ? 'grab' : tool === 'eraser' ? 'cell' : 'crosshair',
            touchAction: 'none',
          }}
        />

        {/* POST-ITS (STICKY NOTES) */}
        {stickyNotes.map((sticky) => (
          <div
            key={sticky.id}
            onPointerDown={(e) => {
              e.stopPropagation();
              setSelectedStickyId(sticky.id);
              const coords = getCanvasCoords(e);
              draggingStickyRef.current = {
                id: sticky.id,
                startX: coords.x,
                startY: coords.y,
                origX: sticky.x,
                origY: sticky.y,
              };
            }}
            style={{
              position: 'absolute',
              left: `${pan.x + sticky.x * zoom}px`,
              top: `${pan.y + sticky.y * zoom}px`,
              width: `${(sticky.width || 150) * zoom}px`,
              minHeight: `${(sticky.height || 130) * zoom}px`,
              backgroundColor: sticky.color || '#FEF08A',
              color: '#1F2937',
              borderRadius: '12px',
              padding: `${12 * zoom}px`,
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              zIndex: selectedStickyId === sticky.id ? 50 : 20,
              cursor: 'move',
              transformOrigin: 'top left',
              display: 'flex',
              flexDirection: 'column',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: `${9 * zoom}px`, fontWeight: '800', color: 'rgba(0,0,0,0.5)' }}>
                {sticky.authorName || 'Post-it'}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const nextStickies = stickyNotes.filter((s) => s.id !== sticky.id);
                  setStickyNotes(nextStickies);
                  whiteboardP2PService.broadcastEvent('sticky_delete', { id: sticky.id });
                  pushToHistory(localPaths, nextStickies, textElements);
                  debouncedSyncToFirestore(localPaths, remotePaths, nextStickies, textElements);
                }}
                style={{ background: 'none', border: 'none', color: 'rgba(0,0,0,0.5)', cursor: 'pointer', padding: 0 }}
              >
                <X size={12 * zoom} />
              </button>
            </div>
            <textarea
              value={sticky.text}
              onChange={(e) => {
                const nextStickies = stickyNotes.map((s) =>
                  s.id === sticky.id ? { ...s, text: e.target.value } : s
                );
                setStickyNotes(nextStickies);
                whiteboardP2PService.broadcastEvent('sticky_update', { sticky: { ...sticky, text: e.target.value } });
                debouncedSyncToFirestore(localPaths, remotePaths, nextStickies, textElements);
              }}
              style={{
                width: '100%',
                flex: 1,
                background: 'none',
                border: 'none',
                outline: 'none',
                resize: 'none',
                fontFamily: 'Inter, sans-serif',
                fontSize: `${13 * zoom}px`,
                color: '#1F2937',
                lineHeight: 1.4,
              }}
            />
          </div>
        ))}

        {/* TEXT ELEMENTS AVEC SCALE-TO-FIT */}
        {textElements.map((t) => {
          const isEditing = editingTextId === t.id;
          const fontSizePx = (t.fontSize || 24) * zoom;

          return (
            <div
              key={t.id}
              style={{
                position: 'absolute',
                left: `${pan.x + t.x * zoom}px`,
                top: `${pan.y + t.y * zoom}px`,
                width: `${(t.width || 220) * zoom}px`,
                minHeight: `${(t.height || 50) * zoom}px`,
                zIndex: 25,
                boxSizing: 'border-box',
                border: isEditing ? '1.5px dashed var(--accent-primary, #C67D5B)' : '1.5px solid transparent',
                borderRadius: '8px',
                padding: '4px',
              }}
              onDoubleClick={() => setEditingTextId(t.id)}
            >
              {isEditing ? (
                <textarea
                  autoFocus
                  value={t.text}
                  onBlur={() => setEditingTextId(null)}
                  onChange={(e) => {
                    const nextTexts = textElements.map((item) =>
                      item.id === t.id ? { ...item, text: e.target.value } : item
                    );
                    setTextElements(nextTexts);
                    whiteboardP2PService.broadcastEvent('text_update', { text: { ...t, text: e.target.value } });
                    debouncedSyncToFirestore(localPaths, remotePaths, stickyNotes, nextTexts);
                  }}
                  style={{
                    width: '100%',
                    height: '100%',
                    background: 'none',
                    border: 'none',
                    outline: 'none',
                    resize: 'none',
                    color: t.color || 'inherit',
                    fontFamily: t.fontFamily || 'Inter, sans-serif',
                    fontSize: `${fontSizePx}px`,
                    fontWeight: '800',
                    lineHeight: 1.2,
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    color: t.color || 'inherit',
                    fontFamily: t.fontFamily || 'Inter, sans-serif',
                    fontSize: `${fontSizePx}px`,
                    fontWeight: '800',
                    lineHeight: 1.2,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {t.text}
                </div>
              )}

              {/* Poignée de redimensionnement Scale-to-fit */}
              <div
                onPointerDown={(e) => {
                  e.stopPropagation();
                  const coords = getCanvasCoords(e);
                  resizingTextRef.current = {
                    id: t.id,
                    startX: coords.x,
                    startY: coords.y,
                    origW: t.width || 220,
                    origH: t.height || 50,
                    textStr: t.text,
                  };
                }}
                style={{
                  position: 'absolute',
                  bottom: '-6px',
                  right: '-6px',
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent-primary, #C67D5B)',
                  cursor: 'nwse-resize',
                  zIndex: 30,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                }}
                title="Redimensionner la zone et ajuster la police"
              />
            </div>
          );
        })}

        {/* CURSEURS COLLABORATIFS EN DIRECT (GHOSTING LIVE) */}
        {Object.entries(remoteCursors).map(([peerId, cursor]) => {
          if (!cursor || Date.now() - (cursor.lastSeen || 0) > 8000) return null;
          return (
            <div
              key={peerId}
              style={{
                position: 'absolute',
                left: `${pan.x + cursor.x * zoom}px`,
                top: `${pan.y + cursor.y * zoom}px`,
                pointerEvents: 'none',
                zIndex: 60,
                transition: 'all 0.08s ease-out',
              }}
            >
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: cursor.color || '#3B82F6',
                  boxShadow: `0 0 12px ${cursor.color || '#3B82F6'}`,
                  border: '2px solid #FFF',
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  top: '14px',
                  left: '6px',
                  backgroundColor: cursor.color || '#3B82F6',
                  color: '#FFF',
                  fontSize: '10px',
                  fontWeight: '800',
                  padding: '2px 6px',
                  borderRadius: '6px',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
                }}
              >
                {cursor.authorName || 'Collaborateur'}
              </span>
            </div>
          );
        })}
      </div>

      {/* 3. BARRE D'OUTILS PRINCIPALE FLUIDE & TACTILE (Standard Apple HIG) */}
      {!isImmersiveMode && (
        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 100,
            maxWidth: '96vw',
            backgroundColor: darkMode ? 'rgba(26,22,19,0.92)' : 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: darkMode ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.1)',
            borderRadius: '24px',
            padding: '8px 14px',
            boxShadow: '0 20px 40px -10px rgba(0,0,0,0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            overflowX: 'auto',
            scrollbarWidth: 'none',
            touchAction: 'pan-x',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {/* Outils de dessin */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {[
              { id: 'pencil', icon: Pen, title: 'Crayon' },
              { id: 'brush', icon: Brush, title: 'Pinceau Artistique' },
              { id: 'highlighter', icon: Highlighter, title: 'Surligneur' },
              { id: 'eraser', icon: Eraser, title: 'Gomme' },
              { id: 'rect', icon: Square, title: 'Rectangle' },
              { id: 'circle', icon: Circle, title: 'Cercle' },
              { id: 'arrow', icon: ArrowRight, title: 'Flèche' },
              { id: 'sticky', icon: StickyNote, title: 'Post-it' },
              { id: 'text', icon: Type, title: 'Texte' },
              { id: 'hand', icon: Hand, title: 'Déplacer (Pan)' },
            ].map((btn) => {
              const Icon = btn.icon;
              const isSelected = tool === btn.id;
              return (
                <button
                  key={btn.id}
                  type="button"
                  onClick={() => setTool(btn.id)}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    border: 'none',
                    backgroundColor: isSelected
                      ? 'var(--accent-primary, #C67D5B)'
                      : darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                    color: isSelected ? '#FFFFFF' : 'inherit',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    flexShrink: 0,
                  }}
                  title={btn.title}
                >
                  <Icon size={18} />
                </button>
              );
            })}
          </div>

          <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border-color, rgba(0,0,0,0.1))', margin: '0 4px', flexShrink: 0 }} />

          {/* PALETTE DE COULEURS INFINIES (<input type="color"> natif masqué derrière bouton élégant) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            {CURATED_PALETTE.slice(0, 5).map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setColor(c.hex)}
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: c.hex,
                  border: color === c.hex ? '3px solid #C67D5B' : '2px solid rgba(0,0,0,0.1)',
                  cursor: 'pointer',
                  boxShadow: color === c.hex ? '0 0 10px rgba(198,125,91,0.5)' : 'none',
                  flexShrink: 0,
                }}
                title={c.name}
              />
            ))}

            {/* Sélecteur de Couleur Spectre Complet */}
            <label
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 8px',
                borderRadius: '999px',
                border: darkMode ? '1.5px solid rgba(255,255,255,0.15)' : '1.5px solid rgba(0,0,0,0.15)',
                backgroundColor: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                cursor: 'pointer',
                flexShrink: 0,
              }}
              title="Ouvrir le spectre de couleurs complet"
            >
              <div
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  backgroundColor: color,
                  border: '1.5px solid #FFF',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                }}
              />
              <span style={{ fontSize: '11px', fontWeight: '800', fontFamily: 'monospace', color: 'inherit' }}>
                {color.toUpperCase()}
              </span>
              <input
                ref={colorInputRef}
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                style={{
                  position: 'absolute',
                  opacity: 0,
                  width: '100%',
                  height: '100%',
                  top: 0,
                  left: 0,
                  cursor: 'pointer',
                }}
              />
            </label>
          </div>

          <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border-color, rgba(0,0,0,0.1))', margin: '0 4px', flexShrink: 0 }} />

          {/* ÉPAISSEUR DU TRAIT */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
            {[2, 4, 8, 16].map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setLineWidth(w)}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  border: lineWidth === w ? '1.5px solid #C67D5B' : '1px solid transparent',
                  backgroundColor: lineWidth === w ? 'rgba(198,125,91,0.15)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'inherit',
                }}
                title={`Épaisseur ${w}px`}
              >
                <div
                  style={{
                    width: `${Math.min(18, w * 1.8)}px`,
                    height: `${Math.min(18, w * 1.8)}px`,
                    borderRadius: '50%',
                    backgroundColor: color,
                  }}
                />
              </button>
            ))}
          </div>

          <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border-color, rgba(0,0,0,0.1))', margin: '0 4px', flexShrink: 0 }} />

          {/* BOUTONS UNDO / REDO, EFFACER & MODE PLEIN ÉCRAN (IMMERSION) DANS LA BARRE */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
            <button
              type="button"
              disabled={historyIndex <= 0}
              onClick={handleUndo}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: 'transparent',
                color: historyIndex <= 0 ? 'rgba(150,150,150,0.4)' : 'inherit',
                cursor: historyIndex <= 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Annuler (Ctrl+Z)"
            >
              <RotateCcw size={16} />
            </button>

            <button
              type="button"
              disabled={historyIndex >= history.length - 1}
              onClick={handleRedo}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: 'transparent',
                color: historyIndex >= history.length - 1 ? 'rgba(150,150,150,0.4)' : 'inherit',
                cursor: historyIndex >= history.length - 1 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Rétablir (Ctrl+Y)"
            >
              <RotateCw size={16} />
            </button>

            <button
              type="button"
              onClick={() => {
                if (window.confirm('Effacer la totalité du tableau blanc ?')) {
                  setLocalPaths([]);
                  setRemotePaths([]);
                  setStickyNotes([]);
                  setTextElements([]);
                  pushToHistory([], [], []);
                  whiteboardP2PService.broadcastEvent('clear', {});
                  debouncedSyncToFirestore([], [], [], []);
                }
              }}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: 'rgba(239,68,68,0.1)',
                color: '#EF4444',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Tout effacer"
            >
              <Trash2 size={16} />
            </button>

            {/* Mode Plein Écran (Immersion) DANS la barre d'outils */}
            <button
              type="button"
              onClick={() => setIsImmersiveMode(!isImmersiveMode)}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: isImmersiveMode ? 'var(--accent-primary, #C67D5B)' : darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                color: isImmersiveMode ? '#FFFFFF' : 'inherit',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
              }}
              title={isImmersiveMode ? 'Quitter le mode plein écran' : 'Plein écran (Immersion)'}
            >
              {isImmersiveMode ? <Eye size={16} /> : <Maximize2 size={16} />}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return createPortal(modalContent, document.body);
}
