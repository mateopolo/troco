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

import React, { useState, useRef, useEffect, useCallback, Profiler } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { onRenderProfilerCallback } from '../utils/performanceProfiler';
import {
  X, Pen, Highlighter, Eraser, Square, Circle, Minus, ArrowRight,
  RotateCcw, RotateCw, Trash2, StickyNote,
  Type, Hand, Brush, Check, Eye, Maximize2, ChevronDown,
  Sparkles, Save, Send, History, Palette, Clock, FolderKanban,
  Triangle, Hexagon, Star, MessageSquare, Heart,
  MousePointer, Copy, Clipboard
} from 'lucide-react';
import { doc, getDoc, onSnapshot, setDoc, deleteDoc, collection, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { whiteboardP2PService } from '../services/whiteboardP2PService';
import {
  saveWorkspaceVersion,
  loadWorkspaceData,
  fetchWorkspaceVersions,
  WORKSPACE_TYPES,
} from '../features/workspace/workspaceService';
import { setThemeColorOverride, clearThemeColorOverride } from '../utils/themeColor';
import { playSwoosh } from '../services/audioService';
import WhiteboardLobby from './WhiteboardLobby';

const SHAPE_OPTIONS = [
  { id: 'rect', label: 'Rectangle', icon: Square },
  { id: 'circle', label: 'Cercle / Ovale', icon: Circle },
  { id: 'line', label: 'Ligne Droite', icon: Minus },
  { id: 'arrow', label: 'Flèche', icon: ArrowRight },
  { id: 'triangle', label: 'Triangle', icon: Triangle },
  { id: 'hexagon', label: 'Hexagone', icon: Hexagon },
  { id: 'star', label: 'Étoile', icon: Star },
  { id: 'speech_bubble', label: 'Bulle Dialogue', icon: MessageSquare },
  { id: 'heart', label: 'Cœur', icon: Heart },
  { id: 'checkmark', label: 'Validation', icon: Check },
];

const BG_PRESETS = [
  { id: 'white', hex: '#FFFFFF', name: 'Blanc Pur' },
  { id: 'dark', hex: '#12100E', name: 'Noir Studio' },
  { id: 'cream', hex: '#FDFBF7', name: 'Crème Troco' },
  { id: 'slate', hex: '#1E293B', name: 'Ardoise' },
  { id: 'yellow', hex: '#FEF9C3', name: 'Papier Jaune' },
  { id: 'blue', hex: '#E0F2FE', name: 'Bleu Doux' },
];

const CURATED_PALETTE = [
  { id: 'clay', hex: '#C67D5B', name: 'Argile Troco' },
  { id: 'charcoal', hex: '#231E1B', name: 'Anthracite' },
  { id: 'cream', hex: '#FAF7F2', name: 'Écru' },
  { id: 'sage', hex: '#7A8F6A', name: 'Sauge' },
  { id: 'terracotta', hex: '#A8644A', name: 'Terre Cuite' },
  { id: 'gold', hex: '#D4AF37', name: 'Or Monopo' },
  { id: 'red', hex: '#EF4444', name: 'Rouge Corail' },
  { id: 'blue', hex: '#3B82F6', name: 'Bleu Azur' },
  { id: 'purple', hex: '#8B5CF6', name: 'Violet Néon' },
  { id: 'emerald', hex: '#10B981', name: 'Émeraude' },
  { id: 'amber', hex: '#F59E0B', name: 'Ambre Vif' },
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
  initialView = null,
  projectTitle = 'Tableau Blanc Collaboratif',
  currentUser = null,
  darkMode = false,
  onSendToChat = null,
  onSendMessage = null,
  handleSendMessage = null,
}) {
  const [currentBoardId, setCurrentBoardId] = useState(
    () => boardId || workspaceId || null
  );
  const [activeBoardId, setActiveBoardId] = useState(
    () => boardId || workspaceId || null
  );
  const [viewMode, setViewMode] = useState(
    () => initialView || (boardId || workspaceId ? 'canvas' : 'lobby')
  );

  useEffect(() => {
    if (boardId || workspaceId) {
      setCurrentBoardId(boardId || workspaceId);
      setActiveBoardId(boardId || workspaceId);
      setViewMode(initialView || 'canvas');
    } else {
      setCurrentBoardId(null);
      setActiveBoardId(null);
      setViewMode('lobby');
    }
  }, [boardId, workspaceId, initialView]);

  const effectiveId = currentBoardId || activeBoardId || (groupId ? `board-${groupId}` : 'default_board');
  const myUid = currentUser?.uid || currentUser?.id || 'local_user';
  const myName = currentUser?.name || currentUser?.username || 'Moi';

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const colorInputRef = useRef(null);

  // 1. Outils Whiteboard & Arrière-plan indépendant
  const [tool, setTool] = useState('pencil');
  const [color, setColor] = useState('#C67D5B');
  const [lineWidth, setLineWidth] = useState(4);
  const [showGrid] = useState(true);
  const [backgroundColor, setBackgroundColor] = useState(() => (darkMode ? '#12100E' : '#FFFFFF'));
  const [isShapesMenuOpen, setIsShapesMenuOpen] = useState(false);
  const [selectedShape, setSelectedShape] = useState('rect');
  const shapeButtonRef = useRef(null);
  const [shapesMenuCoords, setShapesMenuCoords] = useState({ bottom: 80, left: 100 });

  const updateShapesMenuPosition = useCallback(() => {
    if (shapeButtonRef.current) {
      const rect = shapeButtonRef.current.getBoundingClientRect();
      const menuWidth = 210;
      const calculatedLeft = Math.max(12, Math.min(window.innerWidth - menuWidth - 12, rect.left + rect.width / 2 - menuWidth / 2));
      setShapesMenuCoords({
        left: calculatedLeft,
        bottom: Math.max(16, window.innerHeight - rect.top + 12),
      });
    }
  }, []);

  const toggleShapesMenu = useCallback(() => {
    setIsShapesMenuOpen((prev) => {
      const nextState = !prev;
      if (nextState) {
        requestAnimationFrame(() => updateShapesMenuPosition());
      }
      return nextState;
    });
  }, [updateShapesMenuPosition]);

  useEffect(() => {
    if (isShapesMenuOpen) {
      updateShapesMenuPosition();
      const handleScrollOrResize = () => updateShapesMenuPosition();
      window.addEventListener('resize', handleScrollOrResize);
      window.addEventListener('scroll', handleScrollOrResize, true);
      return () => {
        window.removeEventListener('resize', handleScrollOrResize);
        window.removeEventListener('scroll', handleScrollOrResize, true);
      };
    }
  }, [isShapesMenuOpen, updateShapesMenuPosition]);

  useEffect(() => {
    if (!isShapesMenuOpen) return;
    const handleClickOutside = (e) => {
      if (
        shapeButtonRef.current &&
        !shapeButtonRef.current.contains(e.target) &&
        !e.target.closest?.('#shapes-popover-portal')
      ) {
        setIsShapesMenuOpen(false);
      }
    };
    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, [isShapesMenuOpen]);

  const bgColorInputRef = useRef(null);

  // 2. Mode Immersion Absolue (Plein écran sans distractions) & Responsive Mobile
  const [isImmersiveMode, setIsImmersiveMode] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // 🚨 PHASE 50 & 52 : SYNCHRONISATION IMMERSIVE STATUT & EFFET SONORE SWOOSH
  useEffect(() => {
    if (isOpen) {
      playSwoosh();
      setThemeColorOverride(backgroundColor);
      return () => {
        clearThemeColorOverride();
      };
    }
  }, [isOpen, backgroundColor]);

  // 3. Séparation stricte d'état pour zéro conflit
  const [localPaths, setLocalPaths] = useState([]);
  const [remotePaths, setRemotePaths] = useState([]);
  const [stickyNotes, setStickyNotes] = useState([]);
  const [textElements, setTextElements] = useState([]);

  // 🚨 PHASE 110 : ÉTATS GLOBAUX DU MOTEUR WHITEBOARD PRO (Object Model & Presse-papier)
  const [toolMode, setToolMode] = useState('draw'); // 'draw' | 'text' | 'shape' | 'select'
  const [selectedObjectId, setSelectedObjectId] = useState(null);
  const [clipboardObject, setClipboardObject] = useState(null);
  const [canvasObjects, setCanvasObjects] = useState([]);
  const [rotationTooltip, setRotationTooltip] = useState(null); // { degrees, screenX, screenY }

  const activeSnapGuidesRef = useRef({ vertical: null, horizontal: null });
  const isRotatingRef = useRef(null);
  const isResizingObjectRef = useRef(null);
  const isDraggingObjectRef = useRef(null);

  // 🚨 PHASE 94 : Moteur de tracé natif sans React State Thrashing
  const currentPathRef = useRef(null);
  const rafDrawRef = useRef(null);
  const pendingRemotePathsDataRef = useRef(null);
  const setCurrentPath = useCallback((val) => {
    currentPathRef.current = typeof val === 'function' ? val(currentPathRef.current) : val;
  }, []);

  // 4. Moteur d'historique Undo / Redo Local (Trait par trait)
  const [history, setHistory] = useState([[]]);
  const [historyStep, setHistoryStep] = useState(0);
  const historyStepRef = useRef(0);

  useEffect(() => {
    historyStepRef.current = historyStep;
  }, [historyStep]);

  // 5. Caméra infinie (Viewport Pan & Zoom)
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  // 6. Multi-versions & Métadonnées
  const [versionNumber, setVersionNumber] = useState(1);
  const [workspaceTitle, setWorkspaceTitle] = useState(projectTitle || 'Tableau Blanc Collaboratif');
  const [saveStatus, setSaveStatus] = useState('Synchronisé en direct 🟢');
  const [lastEditor, setLastEditor] = useState(myName);
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [saveSuccessToast, setSaveSuccessToast] = useState(false);
  const [shareSuccessToast, setShareSuccessToast] = useState(false);

  // Panneau Latéral des Versions (Historique)
  const [isVersionsSidebarOpen, setIsVersionsSidebarOpen] = useState(false);
  const [versionsList, setVersionsList] = useState([]);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);

  // 7. Curseur P2P Collaboratif (Ghosting live) & Présence Multijoueur
  const [remoteCursors, setRemoteCursors] = useState({});
  const [activeUsersCount, setActiveUsersCount] = useState(1);

  // 8. État d'édition / sélection
  const [editingTextId, setEditingTextId] = useState(null);
  const [selectedStickyId, setSelectedStickyId] = useState(null);

  // Références d'interaction rapide
  const isDrawingRef = useRef(false);
  const isPanningRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0, origPanX: 0, origPanY: 0 });
  const touchStateRef = useRef({ distance: 0, midX: 0, midY: 0, origPanX: 0, origPanY: 0, origZoom: 1 });
  const lastTouchZoomTimeRef = useRef(0);
  const draggingStickyRef = useRef(null);
  const resizingTextRef = useRef(null);
  const firestoreDebounceTimerRef = useRef(null);
  const p2pBroadcastThrottleRef = useRef(0);
  const lastLocalModificationTimeRef = useRef(0);
  const pendingRemotePathsRafRef = useRef(null);

  // Récupération de l'historique complet des versions depuis Firestore
  const fetchVersions = useCallback(async () => {
    if (!effectiveId || !db) return;
    setIsLoadingVersions(true);
    try {
      const docRef = doc(db, 'project_whiteboards', String(effectiveId));
      const snap = await getDoc(docRef);
      let list = [];
      if (snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data.versionHistory)) {
          list = [...data.versionHistory];
        }
      }

      const wsHistory = await fetchWorkspaceVersions(effectiveId);
      if (Array.isArray(wsHistory)) {
        wsHistory.forEach((v) => {
          if (!list.some((existing) => Number(existing.version) === Number(v.version))) {
            list.push(v);
          }
        });
      }

      list.sort((a, b) => (Number(b.version) || 0) - (Number(a.version) || 0));
      setVersionsList(list);
    } catch (e) {
      console.warn('[CollaborativeWhiteboard] Erreur récupération versions:', e);
    } finally {
      setIsLoadingVersions(false);
    }
  }, [effectiveId]);

  // Chargement instantané d'une version spécifique depuis l'historique (Réhydratation complète)
  const handleLoadVersion = (ver) => {
    if (!ver) return;
    const versionData = ver.data || ver;
    const paths = Array.isArray(versionData.paths) ? versionData.paths : (Array.isArray(ver.paths) ? ver.paths : []);
    const stickies = Array.isArray(versionData.stickyNotes) ? versionData.stickyNotes : (Array.isArray(ver.stickyNotes) ? ver.stickyNotes : []);
    const texts = Array.isArray(versionData.textElements) ? versionData.textElements : (Array.isArray(ver.textElements) ? ver.textElements : []);
    const bg = versionData.backgroundColor || ver.backgroundColor || (darkMode ? '#12100E' : '#FFFFFF');

    setLocalPaths(paths);
    setRemotePaths([]);
    setStickyNotes(stickies);
    setTextElements(texts);
    setBackgroundColor(bg);
    setCurrentPath(null);

    if (ver.version) {
      setVersionNumber(Number(ver.version));
    }
    if (ver.name || ver.changeSummary) {
      setWorkspaceTitle(ver.name || ver.changeSummary);
    }

    setHistory([paths]);
    setHistoryStep(0);
    historyStepRef.current = 0;
    setIsVersionsSidebarOpen(false);
    setSaveStatus(`Version V${ver.version || 1} chargée ⚡`);

    // Force le re-render immédiat du Canvas
    requestAnimationFrame(() => {
      redrawCanvas();
    });
    setTimeout(() => {
      redrawCanvas();
    }, 40);
  };

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

  // Synchronisation Firestore Debouncée avec Arrière-plan
  const debouncedSyncToFirestore = useCallback((
    currentLocalPaths = localPaths,
    currentRemotePaths = remotePaths,
    currentStickyNotes = stickyNotes,
    currentTextElements = textElements,
    currentVersion = versionNumber,
    currentTitle = workspaceTitle,
    currentBg = backgroundColor
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
          backgroundColor: currentBg,
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
  }, [effectiveId, groupId, localPaths, remotePaths, stickyNotes, textElements, versionNumber, workspaceTitle, backgroundColor, myName, myUid]);

  // Modification et diffusion de la couleur de fond
  const handleChangeBackgroundColor = (newBg) => {
    setBackgroundColor(newBg);
    whiteboardP2PService.broadcastEvent('bg_change', { backgroundColor: newBg });
    debouncedSyncToFirestore(localPaths, remotePaths, stickyNotes, textElements, versionNumber, workspaceTitle, newBg);
  };

  // ================= 2. MOTEUR D'HISTORIQUE LOCAL (Undo / Redo Trait par Trait) =================
  const pushToHistory = useCallback((newLocalPaths) => {
    setHistory((prevHistory) => {
      const curStep = historyStepRef.current;
      const nextHistory = prevHistory.slice(0, curStep + 1);
      const updated = [...nextHistory, [...newLocalPaths]];
      if (updated.length > 80) updated.shift();
      const newStep = updated.length - 1;
      historyStepRef.current = newStep;
      setHistoryStep(newStep);
      return updated;
    });
  }, []);

  const handleUndo = useCallback(() => {
    // FIX ATOMIQUE DE L'OUTIL TEXTE (State Reset) : Réinitialise immédiatement l'édition de texte et démonte le textarea flottant
    setEditingTextId(null);
    if (resizingTextRef.current) resizingTextRef.current = null;
    if (isDrawingRef.current && currentPathRef.current?.type === 'text_box') {
      isDrawingRef.current = false;
      currentPathRef.current = null;
    }
    // Nettoie les textes vides non finalisés
    setTextElements((prev) => prev.filter((t) => t.text && t.text.trim() !== ''));

    setHistory((prevHistory) => {
      const curStep = historyStepRef.current;
      if (curStep > 0) {
        const targetStep = curStep - 1;
        const targetPaths = prevHistory[targetStep] || [];
        lastLocalModificationTimeRef.current = Date.now();
        setLocalPaths(targetPaths);
        historyStepRef.current = targetStep;
        setHistoryStep(targetStep);
        debouncedSyncToFirestore(targetPaths, remotePaths, stickyNotes, textElements.filter((t) => t.text && t.text.trim() !== ''));
      }
      return prevHistory;
    });
  }, [remotePaths, stickyNotes, textElements, debouncedSyncToFirestore]);

  const handleRedo = useCallback(() => {
    setHistory((prevHistory) => {
      const curStep = historyStepRef.current;
      if (curStep < prevHistory.length - 1) {
        const targetStep = curStep + 1;
        const targetPaths = prevHistory[targetStep] || [];
        lastLocalModificationTimeRef.current = Date.now();
        setLocalPaths(targetPaths);
        historyStepRef.current = targetStep;
        setHistoryStep(targetStep);
        debouncedSyncToFirestore(targetPaths, remotePaths, stickyNotes, textElements);
      }
      return prevHistory;
    });
  }, [remotePaths, stickyNotes, textElements, debouncedSyncToFirestore]);

  // 🚨 PHASE 110 : MOTEUR ORIENTÉ OBJET — Helpers Object Model & Bounding Box
  const toCanvasObject = useCallback((item) => {
    if (!item) return null;
    if (item.data && (item.type === 'path' || item.type === 'text' || item.type === 'shape')) {
      return {
        id: item.id || `obj-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        type: item.type,
        x: typeof item.x === 'number' ? item.x : 0,
        y: typeof item.y === 'number' ? item.y : 0,
        width: typeof item.width === 'number' ? item.width : 50,
        height: typeof item.height === 'number' ? item.height : 50,
        rotation: typeof item.rotation === 'number' ? item.rotation : 0,
        data: item.data,
        tool: item.tool || item.data?.tool,
        color: item.color || item.data?.color,
        lineWidth: item.lineWidth || item.data?.lineWidth,
        points: item.points || item.data?.points,
      };
    }

    const isFreehand = item.type === 'freehand' || (!item.type && item.points);
    const isText = item.type === 'text_box' || item.type === 'text' || !!item.text;
    const isShape = !isFreehand && !isText;

    let x = item.x || 0;
    let y = item.y || 0;
    let width = item.width || 0;
    let height = item.height || 0;

    if (isFreehand && item.points && item.points.length > 0) {
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      item.points.forEach((p) => {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      });
      x = minX;
      y = minY;
      width = Math.max(16, maxX - minX);
      height = Math.max(16, maxY - minY);
    } else if (item.type === 'line' || item.type === 'arrow') {
      x = Math.min(item.fromX ?? 0, item.toX ?? 0);
      y = Math.min(item.fromY ?? 0, item.toY ?? 0);
      width = Math.max(16, Math.abs((item.toX ?? 0) - (item.fromX ?? 0)));
      height = Math.max(16, Math.abs((item.toY ?? 0) - (item.fromY ?? 0)));
    }

    return {
      id: item.id || `obj-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      type: isText ? 'text' : (isShape ? 'shape' : 'path'),
      x,
      y,
      width: width || (isText ? 220 : 50),
      height: height || (isText ? 50 : 50),
      rotation: item.rotation || 0,
      data: {
        ...item,
        tool: item.tool || item.type,
        shapeType: isShape ? item.type : undefined,
      },
      tool: item.tool || item.type,
      color: item.color,
      lineWidth: item.lineWidth,
      points: item.points,
      fromX: item.fromX,
      fromY: item.fromY,
      toX: item.toX,
      toY: item.toY,
    };
  }, []);

  const getObjectBoundingBox = useCallback((obj) => {
    if (!obj) return { x: 0, y: 0, width: 50, height: 50 };

    if (typeof obj.x === 'number' && typeof obj.y === 'number' && obj.width > 0 && obj.height > 0) {
      return { x: obj.x, y: obj.y, width: obj.width, height: obj.height };
    }

    const pts = obj.points || obj.data?.points;
    if (pts && pts.length > 0) {
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      pts.forEach((p) => {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      });
      return {
        x: minX,
        y: minY,
        width: Math.max(16, maxX - minX),
        height: Math.max(16, maxY - minY),
      };
    }

    if (typeof obj.fromX === 'number' && typeof obj.toX === 'number') {
      const minX = Math.min(obj.fromX, obj.toX);
      const maxX = Math.max(obj.fromX, obj.toX);
      const minY = Math.min(obj.fromY, obj.toY);
      const maxY = Math.max(obj.fromY, obj.toY);
      return {
        x: minX,
        y: minY,
        width: Math.max(16, maxX - minX),
        height: Math.max(16, maxY - minY),
      };
    }

    return {
      x: obj.x || obj.data?.x || 0,
      y: obj.y || obj.data?.y || 0,
      width: obj.width || obj.data?.width || 60,
      height: obj.height || obj.data?.height || 60,
    };
  }, []);

  const drawSelectionBoundingBox = useCallback((ctx, obj, currentZoom) => {
    if (!obj) return;
    const box = getObjectBoundingBox(obj);
    const rot = obj.rotation || obj.data?.rotation || 0;
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    ctx.save();
    if (rot) {
      ctx.translate(cx, cy);
      ctx.rotate((rot * Math.PI) / 180);
      ctx.translate(-cx, -cy);
    }

    // 1. Bordure bleue de sélection en pointillé
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 1.5 / currentZoom;
    ctx.setLineDash([4 / currentZoom, 3 / currentZoom]);
    ctx.strokeRect(box.x, box.y, box.width, box.height);
    ctx.setLineDash([]);

    // 2. 4 poignées aux coins pour le redimensionnement
    const handleR = 5 / currentZoom;
    const corners = [
      { x: box.x, y: box.y }, // NW
      { x: box.x + box.width, y: box.y }, // NE
      { x: box.x + box.width, y: box.y + box.height }, // SE
      { x: box.x, y: box.y + box.height }, // SW
    ];

    corners.forEach((c) => {
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#3B82F6';
      ctx.lineWidth = 1.5 / currentZoom;
      ctx.beginPath();
      ctx.arc(c.x, c.y, handleR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    // 3. Poignée de rotation au-dessus du centre haut
    const stemLen = 24 / currentZoom;
    const rotHandleX = cx;
    const rotHandleY = box.y - stemLen;

    ctx.beginPath();
    ctx.moveTo(cx, box.y);
    ctx.lineTo(rotHandleX, rotHandleY);
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 1.5 / currentZoom;
    ctx.stroke();

    ctx.fillStyle = '#3B82F6';
    ctx.beginPath();
    ctx.arc(rotHandleX, rotHandleY, handleR + 1 / currentZoom, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1 / currentZoom;
    ctx.stroke();

    ctx.restore();
  }, [getObjectBoundingBox]);

  // 🚨 PHASE 110 : Système de Presse-papier (Copier / Coller & Suppression)
  const handleCopy = useCallback(() => {
    if (!selectedObjectId) return;
    const selectedObj = localPaths.find((o) => o && o.id === selectedObjectId);
    if (selectedObj) {
      setClipboardObject({ ...selectedObj });
    }
  }, [selectedObjectId, localPaths]);

  const handlePaste = useCallback(() => {
    if (!clipboardObject) return;
    const newId = `obj-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const newX = (clipboardObject.x || 0) + 20;
    const newY = (clipboardObject.y || 0) + 20;

    const shiftPoints = (pts) =>
      Array.isArray(pts) ? pts.map((p) => ({ x: p.x + 20, y: p.y + 20 })) : undefined;

    const duplicated = {
      ...clipboardObject,
      id: newId,
      x: newX,
      y: newY,
      points: shiftPoints(clipboardObject.points || clipboardObject.data?.points),
      fromX: typeof clipboardObject.fromX === 'number' ? clipboardObject.fromX + 20 : undefined,
      toX: typeof clipboardObject.toX === 'number' ? clipboardObject.toX + 20 : undefined,
      fromY: typeof clipboardObject.fromY === 'number' ? clipboardObject.fromY + 20 : undefined,
      toY: typeof clipboardObject.toY === 'number' ? clipboardObject.toY + 20 : undefined,
      data: {
        ...(clipboardObject.data || {}),
        x: newX,
        y: newY,
        points: shiftPoints(clipboardObject.data?.points || clipboardObject.points),
      },
    };

    const nextPaths = [...localPaths, duplicated];
    setLocalPaths(nextPaths);
    setCanvasObjects(nextPaths.map(toCanvasObject));
    setSelectedObjectId(newId);
    setToolMode('select');
    setTool('select');
    pushToHistory(nextPaths);
    whiteboardP2PService.broadcastEvent('path_add', { path: duplicated });
    debouncedSyncToFirestore(nextPaths, remotePaths, stickyNotes, textElements);
  }, [clipboardObject, localPaths, remotePaths, stickyNotes, textElements, pushToHistory, debouncedSyncToFirestore, toCanvasObject]);

  const handleDeleteSelected = useCallback(() => {
    if (!selectedObjectId) return;
    const nextPaths = localPaths.filter((o) => o && o.id !== selectedObjectId);
    setLocalPaths(nextPaths);
    setCanvasObjects(nextPaths.map(toCanvasObject));
    setSelectedObjectId(null);
    pushToHistory(nextPaths);
    debouncedSyncToFirestore(nextPaths, remotePaths, stickyNotes, textElements);
  }, [selectedObjectId, localPaths, remotePaths, stickyNotes, textElements, pushToHistory, debouncedSyncToFirestore, toCanvasObject]);

  // Raccourcis clavier Ctrl+C, Ctrl+V, Delete
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target?.tagName)) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        handleCopy();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        handlePaste();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedObjectId) {
          e.preventDefault();
          handleDeleteSelected();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedObjectId, clipboardObject, handleCopy, handlePaste, handleDeleteSelected]);

  // Gestion du zoom à la molette de la souris avec throttle 16ms (60 FPS) et centrage sur le curseur
  const lastWheelTimeRef = useRef(0);
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const now = performance.now();
    if (now - lastWheelTimeRef.current < 16) return;
    lastWheelTimeRef.current = now;

    const zoomFactor = e.deltaY < 0 ? 1.09 : 0.91;
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

  // ================= 3. RENDU DU CANVAS (60 FPS, VIEWPORT CULLING & Effet Ghosting) =================
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

  // Helper de dessin vectoriel pour toutes les formes géométriques
  const drawVectorShape = (ctx, path) => {
    if (!path) return;
    const type = path.data?.shapeType || path.shapeType || path.tool || path.type;
    const x = typeof path.x === 'number' ? path.x : (path.data?.x || 0);
    const y = typeof path.y === 'number' ? path.y : (path.data?.y || 0);
    const width = typeof path.width === 'number' ? path.width : (path.data?.width || 0);
    const height = typeof path.height === 'number' ? path.height : (path.data?.height || 0);
    const fromX = typeof path.fromX === 'number' ? path.fromX : (path.data?.fromX || x);
    const fromY = typeof path.fromY === 'number' ? path.fromY : (path.data?.fromY || y);
    const toX = typeof path.toX === 'number' ? path.toX : (path.data?.toX || x + width);
    const toY = typeof path.toY === 'number' ? path.toY : (path.data?.toY || y + height);

    if (type === 'rect') {
      ctx.strokeRect(x, y, width, height);
    } else if (type === 'circle') {
      ctx.beginPath();
      const rx = Math.abs(width) / 2;
      const ry = Math.abs(height) / 2;
      const cx = x + width / 2;
      const cy = y + height / 2;
      ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
      ctx.stroke();
    } else if (type === 'line') {
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(toX, toY);
      ctx.stroke();
    } else if (type === 'arrow') {
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(toX, toY);
      ctx.stroke();

      const headlen = Math.max(12, lineWidth * 2.5);
      const angle = Math.atan2(toY - fromY, toX - fromX);
      ctx.beginPath();
      ctx.moveTo(toX, toY);
      ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
      ctx.moveTo(toX, toY);
      ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
      ctx.stroke();
    } else if (type === 'triangle') {
      ctx.beginPath();
      ctx.moveTo(x + width / 2, y);
      ctx.lineTo(x + width, y + height);
      ctx.lineTo(x, y + height);
      ctx.closePath();
      ctx.stroke();
    } else if (type === 'hexagon') {
      ctx.beginPath();
      const cx = x + width / 2;
      const cy = y + height / 2;
      const rx = Math.abs(width) / 2;
      const ry = Math.abs(height) / 2;
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3 - Math.PI / 6;
        const px = cx + rx * Math.cos(angle);
        const py = cy + ry * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    } else if (type === 'star') {
      ctx.beginPath();
      const cx = x + width / 2;
      const cy = y + height / 2;
      const outerRx = Math.abs(width) / 2;
      const outerRy = Math.abs(height) / 2;
      const innerRx = outerRx * 0.42;
      const innerRy = outerRy * 0.42;
      for (let i = 0; i < 10; i++) {
        const rX = i % 2 === 0 ? outerRx : innerRx;
        const rY = i % 2 === 0 ? outerRy : innerRy;
        const angle = (i * Math.PI) / 5 - Math.PI / 2;
        const px = cx + rX * Math.cos(angle);
        const py = cy + rY * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    } else if (type === 'speech_bubble') {
      ctx.beginPath();
      const r = Math.min(14, Math.abs(width) * 0.18, Math.abs(height) * 0.18);
      const tailW = Math.min(22, Math.abs(width) * 0.22);
      const tailH = Math.min(16, Math.abs(height) * 0.18);
      const bodyH = height - tailH;
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + width - r, y);
      ctx.arcTo(x + width, y, x + width, y + r, r);
      ctx.lineTo(x + width, y + bodyH - r);
      ctx.arcTo(x + width, y + bodyH, x + width - r, y + bodyH, r);
      ctx.lineTo(x + r + tailW * 1.5, y + bodyH);
      ctx.lineTo(x + r, y + height);
      ctx.lineTo(x + r + tailW * 0.5, y + bodyH);
      ctx.lineTo(x + r, y + bodyH);
      ctx.arcTo(x, y + bodyH, x, y + bodyH - r, r);
      ctx.lineTo(x, y + r);
      ctx.arcTo(x, y, x + r, y, r);
      ctx.closePath();
      ctx.stroke();
    } else if (type === 'heart') {
      ctx.beginPath();
      const topCurveH = height * 0.32;
      const cx = x + width / 2;
      ctx.moveTo(cx, y + topCurveH);
      ctx.bezierCurveTo(cx, y, x, y, x, y + topCurveH);
      ctx.bezierCurveTo(x, y + (height + topCurveH) / 2, cx, y + (height + topCurveH) / 2, cx, y + height);
      ctx.bezierCurveTo(cx, y + (height + topCurveH) / 2, x + width, y + (height + topCurveH) / 2, x + width, y + topCurveH);
      ctx.bezierCurveTo(x + width, y, cx, y, cx, y + topCurveH);
      ctx.closePath();
      ctx.stroke();
    } else if (type === 'checkmark') {
      ctx.beginPath();
      ctx.moveTo(x + width * 0.14, y + height * 0.52);
      ctx.lineTo(x + width * 0.42, y + height * 0.82);
      ctx.lineTo(x + width * 0.88, y + height * 0.18);
      ctx.stroke();
    } else if (type === 'text_box') {
      ctx.save();
      ctx.strokeStyle = '#C67D5B';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, width, height);
      ctx.restore();
    }
  };

  // 1. FILTRE DE CULLING VIEWPORT (Optimisation GPU & Mobile Anti-Lag)
  const isPathInViewport = (path, vMinX, vMaxX, vMinY, vMaxY) => {
    if (!path) return false;
    const pad = (path.lineWidth || 4) + 12;

    if (path.type === 'freehand') {
      if (!path.points || path.points.length === 0) return false;
      if (!path.bounds) {
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;
        const pts = path.points;
        for (let i = 0; i < pts.length; i++) {
          const pt = pts[i];
          if (pt.x < minX) minX = pt.x;
          if (pt.x > maxX) maxX = pt.x;
          if (pt.y < minY) minY = pt.y;
          if (pt.y > maxY) maxY = pt.y;
        }
        path.bounds = { minX, maxX, minY, maxY };
      }
      return !(
        path.bounds.maxX + pad < vMinX ||
        path.bounds.minX - pad > vMaxX ||
        path.bounds.maxY + pad < vMinY ||
        path.bounds.minY - pad > vMaxY
      );
    }

    if (['rect', 'circle', 'triangle', 'hexagon', 'star', 'speech_bubble', 'heart', 'checkmark', 'text_box'].includes(path.type)) {
      const pMinX = Math.min(path.x, path.x + (path.width || 0));
      const pMaxX = Math.max(path.x, path.x + (path.width || 0));
      const pMinY = Math.min(path.y, path.y + (path.height || 0));
      const pMaxY = Math.max(path.y, path.y + (path.height || 0));
      return !(pMaxX + pad < vMinX || pMinX - pad > vMaxX || pMaxY + pad < vMinY || pMinY - pad > vMaxY);
    }

    if (path.type === 'line' || path.type === 'arrow') {
      const pMinX = Math.min(path.fromX, path.toX);
      const pMaxX = Math.max(path.fromX, path.toX);
      const pMinY = Math.min(path.fromY, path.toY);
      const pMaxY = Math.max(path.fromY, path.toY);
      return !(pMaxX + pad < vMinX || pMinX - pad > vMaxX || pMaxY + pad < vMinY || pMinY - pad > vMaxY);
    }

    return true;
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

    // Calcul des coordonnées monde visibles pour le Viewport Culling (+50px marge)
    const margin = 50;
    const vMinX = (-pan.x - margin) / zoom;
    const vMinY = (-pan.y - margin) / zoom;
    const vMaxX = (rect.width - pan.x + margin) / zoom;
    const vMaxY = (rect.height - pan.y + margin) / zoom;

    // Tous les traits combinés (Distants avec ghosting + Locaux + Trait actif dans currentPathRef)
    const allPathsToRender = [
      ...remotePaths,
      ...localPaths,
      ...(currentPathRef.current ? [currentPathRef.current] : [])
    ];

    allPathsToRender.forEach((path) => {
      if (!path) return;

      // FILTRE DE CULLING GPU/CPU : Si le trait est hors-champ, on ne l'envoie pas au ctx.stroke()
      if (!isPathInViewport(path, vMinX, vMaxX, vMinY, vMaxY)) return;

      ctx.save();
      const objRot = path.rotation || path.data?.rotation || 0;
      const box = getObjectBoundingBox(path);
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;

      if (objRot) {
        ctx.translate(cx, cy);
        ctx.rotate((objRot * Math.PI) / 180);
        ctx.translate(-cx, -cy);
      }

      ctx.beginPath();
      applyBrushStyleToContext(ctx, path.tool || path.data?.tool, path.color || path.data?.color, path.lineWidth || path.data?.lineWidth, !!path.isRemote);

      const pathType = path.type === 'path' ? (path.data?.tool === 'freehand' || path.points ? 'freehand' : 'path') : path.type;
      if (pathType === 'freehand' || path.points || path.data?.points) {
        const pts = path.points || path.data?.points;
        if (pts && pts.length > 0) {
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let i = 1; i < pts.length; i++) {
            ctx.lineTo(pts[i].x, pts[i].y);
          }
          ctx.stroke();
        }
      } else {
        drawVectorShape(ctx, path);
      }

      ctx.restore();
    });

    // 🚨 PHASE 110 : Bounding Box de sélection & Poignées de rotation et redimensionnement
    if (selectedObjectId) {
      const selObj = allPathsToRender.find((p) => p && p.id === selectedObjectId);
      if (selObj) {
        drawSelectionBoundingBox(ctx, selObj, zoom);
      }
    }

    // 🚨 PHASE 110 : Assistance au centrage (Lignes repères magenta 1px)
    if (activeSnapGuidesRef.current) {
      const { vertical, horizontal } = activeSnapGuidesRef.current;
      if (vertical != null) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 0, 255, 0.5)';
        ctx.lineWidth = 1 / zoom;
        ctx.beginPath();
        ctx.moveTo(vertical, vMinY);
        ctx.lineTo(vertical, vMaxY);
        ctx.stroke();
        ctx.restore();
      }
      if (horizontal != null) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 0, 255, 0.5)';
        ctx.lineWidth = 1 / zoom;
        ctx.beginPath();
        ctx.moveTo(vMinX, horizontal);
        ctx.lineTo(vMaxX, horizontal);
        ctx.stroke();
        ctx.restore();
      }
    }
  }, [remotePaths, localPaths, pan.x, pan.y, zoom, selectedObjectId, drawSelectionBoundingBox, getObjectBoundingBox]);

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

  // ================= 3. SYNCHRONISATION MULTIJOUEUR (P2P + Firestore) =================
  useEffect(() => {
    if (!isOpen || !effectiveId || !currentBoardId) return;

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
      } else if (event.type === 'bg_change' && event.backgroundColor) {
        setBackgroundColor(event.backgroundColor);
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
            if (data.backgroundColor) setBackgroundColor(data.backgroundColor);

            // RÈGLE ANTI-CONFLIT STRICTE & ANTI-FREEZE AU CHARGEMENT (Phase 62 & 94)
            if (data.paths && Array.isArray(data.paths)) {
              if (isDrawingRef.current) {
                // Pendant qu'on dessine activement, on ne bloque JAMAIS le thread UI : réhydratation différée au onPointerUp
                pendingRemotePathsDataRef.current = data.paths;
              } else {
                if (pendingRemotePathsRafRef.current) {
                  cancelAnimationFrame(pendingRemotePathsRafRef.current);
                }
                pendingRemotePathsRafRef.current = requestAnimationFrame(() => {
                  const onlyRemote = data.paths
                    .slice(-350)
                    .filter((p) => p && p.authorUid && p.authorUid !== myUid)
                    .map((p) => ({ ...p, isRemote: true }));
                  setRemotePaths((prev) => {
                    if (prev.length === onlyRemote.length && prev[prev.length - 1]?.id === onlyRemote[onlyRemote.length - 1]?.id) {
                      return prev;
                    }
                    return onlyRemote;
                  });
                });
              }
            }

            // Protège les post-its et textes contre tout écrasement pendant le dessin ou la manipulation locale
            if (!isDrawingRef.current && Date.now() - lastLocalModificationTimeRef.current > 2500) {
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
      if (pendingRemotePathsRafRef.current) {
        cancelAnimationFrame(pendingRemotePathsRafRef.current);
      }
      unsubFirestore();
      whiteboardP2PService.leaveRoom();
    };
  }, [isOpen, effectiveId, myUid, editingTextId]);

  // ================= 3.1 SYSTÈME DE PRÉSENCE FIREBASE & MULTIJOUEUR LIVE =================
  useEffect(() => {
    if (!isOpen || !effectiveId || !currentBoardId || !db) return;

    const presenceColName = 'workspaces';
    const presenceDocRef = doc(db, presenceColName, String(effectiveId), 'presence', String(myUid));
    const fallbackDocRef = doc(db, 'project_whiteboards', String(effectiveId), 'presence', String(myUid));

    // 1. Heartbeat local périodique
    const updatePresence = () => {
      const payload = {
        uid: myUid,
        name: myName || 'Membre',
        lastSeen: Date.now(),
      };
      setDoc(presenceDocRef, payload, { merge: true }).catch(() => {});
      setDoc(fallbackDocRef, payload, { merge: true }).catch(() => {});
    };

    updatePresence();
    const heartbeatInterval = setInterval(updatePresence, 10000);

    // 2. Écoute temps réel de tous les utilisateurs actifs sur le document du tableau
    const presenceColRef = collection(db, presenceColName, String(effectiveId), 'presence');
    const unsubPresence = onSnapshot(presenceColRef, (snapshot) => {
      const now = Date.now();
      let activeCount = 0;
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data && data.lastSeen && (now - Number(data.lastSeen) < 30000)) {
          activeCount++;
        }
      });

      const p2pPeerCount = Object.keys(remoteCursors).length + 1;
      setActiveUsersCount(Math.max(1, activeCount, p2pPeerCount));
    }, (err) => {
      console.warn('[Presence Whiteboard] Note:', err);
    });

    return () => {
      clearInterval(heartbeatInterval);
      unsubPresence();
      deleteDoc(presenceDocRef).catch(() => {});
      deleteDoc(fallbackDocRef).catch(() => {});
    };
  }, [isOpen, effectiveId, currentBoardId, myUid, myName, remoteCursors]);

  // 1. Chargement initial UNIQUE à l'ouverture du board (Fix 2 & Fix 5 : Zéro boucle infinie, Zéro clignotement)
  const initialLoadDoneForIdRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !effectiveId || !currentBoardId) {
      initialLoadDoneForIdRef.current = null;
      return;
    }

    // Évite tout rechargement intempestif si l'id n'a pas changé
    if (initialLoadDoneForIdRef.current === effectiveId) return;
    initialLoadDoneForIdRef.current = effectiveId;

    const loadInitialState = async () => {
      try {
        let loaded = await loadWorkspaceData(effectiveId);
        if (!loaded && db) {
          const docRef = doc(db, 'project_whiteboards', String(effectiveId));
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            loaded = snap.data();
          } else {
            // INITIALISATION IMMÉDIATE DU NOUVEAU TABLEAU SUR FIREBASE (Fix 5)
            const initialDocPayload = {
              boardId: effectiveId,
              groupId: groupId || 'group_whiteboard',
              chatId: groupId || 'group_whiteboard',
              title: projectTitle || 'Tableau Blanc',
              versionNumber: 1,
              paths: [],
              stickyNotes: [],
              textElements: [],
              backgroundColor: darkMode ? '#12100E' : '#FFFFFF',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              lastEditor: myName,
              lastEditorUid: myUid,
              versionHistory: [],
            };
            await setDoc(docRef, initialDocPayload, { merge: true });
          }
        }

        if (loaded) {
          const versionData = loaded.data || loaded;
          const loadedPaths = Array.isArray(versionData.paths) ? versionData.paths : (Array.isArray(loaded.paths) ? loaded.paths : []);
          const loadedStickies = Array.isArray(versionData.stickyNotes) ? versionData.stickyNotes : (Array.isArray(loaded.stickyNotes) ? loaded.stickyNotes : []);
          const loadedTexts = Array.isArray(versionData.textElements) ? versionData.textElements : (Array.isArray(loaded.textElements) ? loaded.textElements : []);
          const bg = versionData.backgroundColor || loaded.backgroundColor || (darkMode ? '#12100E' : '#FFFFFF');

          setLocalPaths(loadedPaths);
          setRemotePaths([]);
          setStickyNotes(loadedStickies);
          setTextElements(loadedTexts);
          setBackgroundColor(bg);

          if (loaded.version || loaded.versionNumber) setVersionNumber(Number(loaded.version || loaded.versionNumber) || 1);
          if (loaded.title) setWorkspaceTitle(loaded.title);

          setHistory([loadedPaths]);
          setHistoryStep(0);
          historyStepRef.current = 0;
          setCurrentPath(null);
        } else {
          // Nouveau projet vierge complet sans interférence
          setLocalPaths([]);
          setRemotePaths([]);
          setStickyNotes([]);
          setTextElements([]);
          setBackgroundColor(darkMode ? '#12100E' : '#FFFFFF');
          setVersionNumber(1);
          setWorkspaceTitle(projectTitle || 'Tableau Blanc');
          setHistory([[]]);
          setHistoryStep(0);
          historyStepRef.current = 0;
          setCurrentPath(null);
        }
      } catch (err) {
        console.warn('[CollaborativeWhiteboard] Initial load failed:', err);
      }
    };

    loadInitialState();
  }, [isOpen, effectiveId, groupId, projectTitle, darkMode, myName, myUid]);

  // 2. Redessin du canvas déclenché de façon autonome quand les données graphiques changent
  useEffect(() => {
    if (isOpen) {
      redrawCanvas();
    }
  }, [isOpen, redrawCanvas]);

  // 3. Récupération des versions UNIQUEMENT quand la barre latérale des versions est ouverte
  useEffect(() => {
    if (isOpen && effectiveId && isVersionsSidebarOpen) {
      fetchVersions();
    }
  }, [isOpen, effectiveId, isVersionsSidebarOpen, fetchVersions]);

  // ================= GESTION DES POINTER EVENTS =================
  const handlePointerDown = (e) => {
    // Empêche la création de nouveaux textes ou tracés tant qu'un texte est en cours d'édition
    if (editingTextId) return;

    const coords = getCanvasCoords(e);
    startPosRef.current = coords;

    // 🚨 PHASE 110 : MODE SÉLECTION (Curseur ↖️) — Hit-testing Boîte englobante & Poignées
    if (tool === 'select' || toolMode === 'select') {
      if (selectedObjectId) {
        const selObj = localPaths.find((p) => p && p.id === selectedObjectId);
        if (selObj) {
          const box = getObjectBoundingBox(selObj);
          const rot = selObj.rotation || selObj.data?.rotation || 0;
          const cx = box.x + box.width / 2;
          const cy = box.y + box.height / 2;
          const rad = (rot * Math.PI) / 180;
          const handleHitRadius = 14 / zoom;

          // Poignée de rotation (au-dessus du centre haut)
          const stemLen = 24 / zoom;
          const rotHx = cx + 0 * Math.cos(rad) - (-box.height / 2 - stemLen) * Math.sin(rad);
          const rotHy = cy + 0 * Math.sin(rad) + (-box.height / 2 - stemLen) * Math.cos(rad);

          if (Math.hypot(coords.x - rotHx, coords.y - rotHy) <= handleHitRadius) {
            isRotatingRef.current = {
              id: selObj.id,
              cx,
              cy,
              startAngle: rot,
            };
            return;
          }

          // 4 poignées de redimensionnement aux coins
          const halfW = box.width / 2;
          const halfH = box.height / 2;
          const cornerDefs = [
            { name: 'nw', rx: -halfW, ry: -halfH },
            { name: 'ne', rx: halfW, ry: -halfH },
            { name: 'se', rx: halfW, ry: halfH },
            { name: 'sw', rx: -halfW, ry: halfH },
          ];

          for (const c of cornerDefs) {
            const chx = cx + c.rx * Math.cos(rad) - c.ry * Math.sin(rad);
            const chy = cy + c.rx * Math.sin(rad) + c.ry * Math.cos(rad);
            if (Math.hypot(coords.x - chx, coords.y - chy) <= handleHitRadius) {
              isResizingObjectRef.current = {
                id: selObj.id,
                corner: c.name,
                startCoords: coords,
                origBox: { ...box },
              };
              return;
            }
          }

          // Clic à l'intérieur de la Bounding Box de l'objet sélectionné -> Démarrer le drag
          const unX = cx + (coords.x - cx) * Math.cos(-rad) - (coords.y - cy) * Math.sin(-rad);
          const unY = cy + (coords.x - cx) * Math.sin(-rad) + (coords.y - cy) * Math.cos(-rad);
          if (unX >= box.x && unX <= box.x + box.width && unY >= box.y && unY <= box.y + box.height) {
            isDraggingObjectRef.current = {
              id: selObj.id,
              startCoords: coords,
              origX: box.x,
              origY: box.y,
              width: box.width,
              height: box.height,
            };
            return;
          }
        }
      }

      // Parcourir tous les objets en ordre inverse (top-to-bottom) pour détecter un nouvel objet
      for (let i = localPaths.length - 1; i >= 0; i--) {
        const obj = localPaths[i];
        if (!obj) continue;
        const box = getObjectBoundingBox(obj);
        const rot = obj.rotation || obj.data?.rotation || 0;
        const cx = box.x + box.width / 2;
        const cy = box.y + box.height / 2;
        const rad = (rot * Math.PI) / 180;
        const unX = cx + (coords.x - cx) * Math.cos(-rad) - (coords.y - cy) * Math.sin(-rad);
        const unY = cy + (coords.x - cx) * Math.sin(-rad) + (coords.y - cy) * Math.cos(-rad);
        const pad = 8 / zoom;

        if (unX >= box.x - pad && unX <= box.x + box.width + pad && unY >= box.y - pad && unY <= box.y + box.height + pad) {
          setSelectedObjectId(obj.id);
          isDraggingObjectRef.current = {
            id: obj.id,
            startCoords: coords,
            origX: box.x,
            origY: box.y,
            width: box.width,
            height: box.height,
          };
          redrawCanvas();
          return;
        }
      }

      // Clic dans le vide -> désélectionner
      setSelectedObjectId(null);
      redrawCanvas();
      return;
    }

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
      pushToHistory(localPaths);
      whiteboardP2PService.broadcastEvent('sticky_add', { sticky: newSticky });
      debouncedSyncToFirestore(localPaths, remotePaths, nextStickies, textElements);
      setTool('pencil');
      return;
    }

    if (tool === 'text') {
      isDrawingRef.current = true;
      lastLocalModificationTimeRef.current = Date.now();
      currentPathRef.current = {
        type: 'text_box',
        tool: 'text',
        color: color === '#FFFFFF' && ['#FFFFFF', '#FDFBF7', '#FEF9C3', '#E0F2FE'].includes(backgroundColor) ? '#1F2937' : color,
        x: coords.x,
        y: coords.y,
        width: 0,
        height: 0,
      };
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
      currentPathRef.current = newPath;

      // Dessin direct immédiat sur le canvas (0ms de latence, zéro setState React)
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const dpr = window.devicePixelRatio || 1;
          ctx.save();
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.scale(dpr, dpr);
          ctx.translate(pan.x, pan.y);
          ctx.scale(zoom, zoom);
          applyBrushStyleToContext(ctx, tool, color, lineWidth, false);
          ctx.beginPath();
          ctx.arc(coords.x, coords.y, Math.max(1, lineWidth / 4), 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
    } else if (['rect', 'circle', 'triangle', 'hexagon', 'star', 'speech_bubble', 'heart', 'checkmark'].includes(tool)) {
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
      currentPathRef.current = shapePath;
    } else if (tool === 'line') {
      const linePath = {
        id: `l-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        type: 'line',
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
      currentPathRef.current = linePath;
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
      currentPathRef.current = arrowPath;
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
      const { id, startX, startY, origW, origH } = resizingTextRef.current;
      const dw = coords.x - startX;
      const dh = coords.y - startY;
      const newW = Math.max(120, origW + dw);
      const newH = Math.max(40, origH + dh);

      // Calcule la taille de police proportionnellement sur tous les axes en utilisant la diagonale :
      const diag = Math.hypot(coords.x - startX, coords.y - startY);
      const autoFontSize = Math.max(12, Math.min(120, Math.round(diag * 0.5)));

      setTextElements((prev) =>
        prev.map((t) =>
          t.id === id
            ? { ...t, width: newW, height: newH, fontSize: autoFontSize }
            : t
        )
      );
      return;
    }

    // 🚨 PHASE 110 : MOTEUR DE ROTATION (Avec tooltip degrés Math.atan2)
    if (isRotatingRef.current) {
      const { id, cx, cy } = isRotatingRef.current;
      const angleRad = Math.atan2(coords.y - cy, coords.x - cx);
      let degrees = Math.round(((angleRad + Math.PI / 2) * 180) / Math.PI);
      degrees = ((degrees % 360) + 360) % 360;

      setRotationTooltip({ degrees, screenX: e.clientX, screenY: e.clientY });

      setLocalPaths((prev) =>
        prev.map((obj) =>
          obj.id === id
            ? { ...obj, rotation: degrees, data: { ...(obj.data || {}), rotation: degrees } }
            : obj
        )
      );
      setCanvasObjects((prev) =>
        prev.map((obj) =>
          obj.id === id
            ? { ...obj, rotation: degrees, data: { ...(obj.data || {}), rotation: degrees } }
            : obj
        )
      );

      redrawCanvas();
      return;
    }

    // 🚨 PHASE 110 : REDIMENSIONNEMENT DES FORMES (4 coins)
    if (isResizingObjectRef.current) {
      const { id, corner, startCoords, origBox } = isResizingObjectRef.current;
      const dx = coords.x - startCoords.x;
      const dy = coords.y - startCoords.y;

      let newX = origBox.x;
      let newY = origBox.y;
      let newW = origBox.width;
      let newH = origBox.height;

      if (corner === 'se') {
        newW = Math.max(16, origBox.width + dx);
        newH = Math.max(16, origBox.height + dy);
      } else if (corner === 'sw') {
        newW = Math.max(16, origBox.width - dx);
        newX = origBox.x + (origBox.width - newW);
        newH = Math.max(16, origBox.height + dy);
      } else if (corner === 'ne') {
        newW = Math.max(16, origBox.width + dx);
        newH = Math.max(16, origBox.height - dy);
        newY = origBox.y + (origBox.height - newH);
      } else if (corner === 'nw') {
        newW = Math.max(16, origBox.width - dx);
        newX = origBox.x + (origBox.width - newW);
        newH = Math.max(16, origBox.height - dy);
        newY = origBox.y + (origBox.height - newH);
      }

      setLocalPaths((prev) =>
        prev.map((obj) =>
          obj.id === id
            ? {
                ...obj,
                x: newX,
                y: newY,
                width: newW,
                height: newH,
                data: { ...(obj.data || {}), x: newX, y: newY, width: newW, height: newH },
              }
            : obj
        )
      );
      setCanvasObjects((prev) =>
        prev.map((obj) =>
          obj.id === id
            ? {
                ...obj,
                x: newX,
                y: newY,
                width: newW,
                height: newH,
                data: { ...(obj.data || {}), x: newX, y: newY, width: newW, height: newH },
              }
            : obj
        )
      );

      redrawCanvas();
      return;
    }

    // 🚨 PHASE 110 : ASSISTANCE AU CENTRAGE (Snapping / Magnétisme 10px & Drag)
    if (isDraggingObjectRef.current) {
      const { id, startCoords, origX, origY, width, height } = isDraggingObjectRef.current;
      let newX = origX + (coords.x - startCoords.x);
      let newY = origY + (coords.y - startCoords.y);

      const objCenterX = newX + width / 2;
      const objCenterY = newY + height / 2;

      const canvas = canvasRef.current;
      const canvasWorldCenterX = (-pan.x + (canvas ? canvas.clientWidth / 2 : 400)) / zoom;
      const canvasWorldCenterY = (-pan.y + (canvas ? canvas.clientHeight / 2 : 300)) / zoom;
      const canvasRawCenterX = canvas ? canvas.width / 2 : 400;
      const canvasRawCenterY = canvas ? canvas.height / 2 : 300;

      let snappedVertical = null;
      let snappedHorizontal = null;

      // Magnétisme X (< 10px du centre)
      if (Math.abs(objCenterX - canvasWorldCenterX) < 10) {
        newX = canvasWorldCenterX - width / 2;
        snappedVertical = canvasWorldCenterX;
      } else if (Math.abs(objCenterX - canvasRawCenterX) < 10) {
        newX = canvasRawCenterX - width / 2;
        snappedVertical = canvasRawCenterX;
      }

      // Magnétisme Y (< 10px du centre)
      if (Math.abs(objCenterY - canvasWorldCenterY) < 10) {
        newY = canvasWorldCenterY - height / 2;
        snappedHorizontal = canvasWorldCenterY;
      } else if (Math.abs(objCenterY - canvasRawCenterY) < 10) {
        newY = canvasRawCenterY - height / 2;
        snappedHorizontal = canvasRawCenterY;
      }

      activeSnapGuidesRef.current = { vertical: snappedVertical, horizontal: snappedHorizontal };

      setLocalPaths((prev) =>
        prev.map((obj) => {
          if (obj.id !== id) return obj;
          const prevX = typeof obj.x === 'number' ? obj.x : origX;
          const prevY = typeof obj.y === 'number' ? obj.y : origY;
          const dxShift = newX - prevX;
          const dyShift = newY - prevY;
          const rawPts = obj.points || obj.data?.points;
          const updatedPoints = rawPts ? rawPts.map((p) => ({ x: p.x + dxShift, y: p.y + dyShift })) : undefined;

          return {
            ...obj,
            x: newX,
            y: newY,
            points: updatedPoints || obj.points,
            fromX: typeof obj.fromX === 'number' ? obj.fromX + dxShift : undefined,
            toX: typeof obj.toX === 'number' ? obj.toX + dxShift : undefined,
            fromY: typeof obj.fromY === 'number' ? obj.fromY + dyShift : undefined,
            toY: typeof obj.toY === 'number' ? obj.toY + dyShift : undefined,
            data: {
              ...(obj.data || {}),
              x: newX,
              y: newY,
              points: updatedPoints || obj.data?.points,
            },
          };
        })
      );
      setCanvasObjects((prev) =>
        prev.map((obj) => (obj.id === id ? { ...obj, x: newX, y: newY } : obj))
      );

      redrawCanvas();
      return;
    }

    if (!isDrawingRef.current || !currentPathRef.current) return;

    const activePath = currentPathRef.current;

    if (activePath.type === 'freehand') {
      const prevPoint = activePath.points[activePath.points.length - 1];
      const newPoint = { x: coords.x, y: coords.y };
      activePath.points.push(newPoint);

      // 🚨 PHASE 94 : DESSIN DIRECT 60 FPS SUR LE CONTEXTE 2D SANS AUCUN SETSTATE REACT
      const canvas = canvasRef.current;
      if (canvas && prevPoint) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const dpr = window.devicePixelRatio || 1;
          ctx.save();
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.scale(dpr, dpr);
          ctx.translate(pan.x, pan.y);
          ctx.scale(zoom, zoom);
          applyBrushStyleToContext(ctx, activePath.tool, activePath.color, activePath.lineWidth, false);
          ctx.beginPath();
          ctx.moveTo(prevPoint.x, prevPoint.y);
          ctx.lineTo(newPoint.x, newPoint.y);
          ctx.stroke();
          ctx.restore();
        }
      }
    } else if (['rect', 'circle', 'triangle', 'hexagon', 'star', 'speech_bubble', 'heart', 'checkmark', 'text_box'].includes(activePath.type)) {
      const w = coords.x - startPosRef.current.x;
      const h = coords.y - startPosRef.current.y;
      activePath.x = w < 0 ? coords.x : startPosRef.current.x;
      activePath.y = h < 0 ? coords.y : startPosRef.current.y;
      activePath.width = Math.abs(w);
      activePath.height = Math.abs(h);

      // Redessin GPU via RequestAnimationFrame SANS AUCUN SETSTATE
      if (!rafDrawRef.current) {
        rafDrawRef.current = requestAnimationFrame(() => {
          redrawCanvas();
          rafDrawRef.current = null;
        });
      }
    } else if (activePath.type === 'line' || activePath.type === 'arrow') {
      activePath.toX = coords.x;
      activePath.toY = coords.y;

      if (!rafDrawRef.current) {
        rafDrawRef.current = requestAnimationFrame(() => {
          redrawCanvas();
          rafDrawRef.current = null;
        });
      }
    }
  };

  const handlePointerUp = (e) => {
    // 🚨 PHASE 110 : Clôture des interactions de sélection, rotation, redimensionnement et drag
    if (isRotatingRef.current || isResizingObjectRef.current || isDraggingObjectRef.current) {
      isRotatingRef.current = null;
      isResizingObjectRef.current = null;
      isDraggingObjectRef.current = null;
      activeSnapGuidesRef.current = { vertical: null, horizontal: null };
      setRotationTooltip(null);
      pushToHistory(localPaths);
      debouncedSyncToFirestore(localPaths, remotePaths, stickyNotes, textElements);
      redrawCanvas();
      return;
    }

    if (isPanningRef.current) {
      isPanningRef.current = false;
    }

    if (draggingStickyRef.current) {
      lastLocalModificationTimeRef.current = Date.now();
      const dragged = stickyNotes.find((s) => s.id === draggingStickyRef.current.id);
      if (dragged) {
        whiteboardP2PService.broadcastEvent('sticky_update', { sticky: dragged });
        pushToHistory(localPaths);
        debouncedSyncToFirestore(localPaths, remotePaths, stickyNotes, textElements);
      }
      draggingStickyRef.current = null;
    }

    // Clôture IMMÉDIATE du mode redimensionnement texte
    if (resizingTextRef.current) {
      lastLocalModificationTimeRef.current = Date.now();
      const resized = textElements.find((t) => t.id === resizingTextRef.current.id);
      if (resized) {
        whiteboardP2PService.broadcastEvent('text_update', { text: resized });
        pushToHistory(localPaths);
        debouncedSyncToFirestore(localPaths, remotePaths, stickyNotes, textElements);
      }
      resizingTextRef.current = null;
      isDrawingRef.current = false;
    }

    // GESTION DU TEXTE : Création par tracé, calcul proportionnel diagonale et bascule automatique en édition
    if (isDrawingRef.current && currentPathRef.current?.type === 'text_box') {
      isDrawingRef.current = false;
      const coords = getCanvasCoords(e || {});
      const startX = startPosRef.current.x;
      const startY = startPosRef.current.y;
      const endX = coords.x;
      const endY = coords.y;

      const rawW = Math.abs(endX - startX);
      const rawH = Math.abs(endY - startY);
      const rawDiag = Math.hypot(endX - startX, endY - startY);

      // Calcule la taille de police proportionnellement sur tous les axes en utilisant la diagonale :
      let calculatedFontSize = Math.hypot(endX - startX, endY - startY) * 0.5;
      if (rawDiag < 20) {
        calculatedFontSize = 24;
      } else {
        calculatedFontSize = Math.max(14, Math.min(120, Math.round(calculatedFontSize)));
      }

      const finalW = Math.max(180, Math.max(rawW, calculatedFontSize * 4.5));
      const finalH = Math.max(48, Math.max(rawH, calculatedFontSize * 1.5));
      const finalX = Math.min(startX, endX);
      const finalY = Math.min(startY, endY);

      const textColor = color === '#FFFFFF' && ['#FFFFFF', '#FDFBF7', '#FEF9C3', '#E0F2FE'].includes(backgroundColor) ? '#1F2937' : color;

      const newText = toCanvasObject({
        id: `text-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        type: 'text',
        x: finalX,
        y: finalY,
        width: finalW,
        height: finalH,
        text: '',
        color: textColor,
        fontSize: calculatedFontSize,
        fontFamily: 'Inter, sans-serif',
        authorName: myName,
        authorUid: myUid,
        createdAt: Date.now(),
      });

      const nextTexts = [...textElements, newText];
      setTextElements(nextTexts);
      currentPathRef.current = null;
      setEditingTextId(newText.id);

      whiteboardP2PService.broadcastEvent('text_add', { text: newText });
      pushToHistory(localPaths);
      debouncedSyncToFirestore(localPaths, remotePaths, stickyNotes, nextTexts);
      return;
    }

    // FUSION SYNCHRONE LOCALE IMMÉDIATE & ENREGISTREMENT DANS L'HISTORIQUE LOCAL TRAIT PAR TRAIT
    if (isDrawingRef.current && currentPathRef.current) {
      isDrawingRef.current = false;
      lastLocalModificationTimeRef.current = Date.now();

      const rawCompletedPath = { ...currentPathRef.current };
      currentPathRef.current = null;

      if (rafDrawRef.current) {
        cancelAnimationFrame(rafDrawRef.current);
        rafDrawRef.current = null;
      }

      // 🚨 PHASE 110 : Conversion en format Objet Model unifié
      const completedPath = toCanvasObject(rawCompletedPath);
      const nextLocalPaths = [...localPaths, completedPath];

      setLocalPaths(nextLocalPaths);
      setCanvasObjects(nextLocalPaths);

      // Clone les traits actuels, ajoute-les à history (en coupant l'historique futur si on avait fait "Undo"), et incrémente historyStep
      setHistory((prevHistory) => {
        const curStep = historyStepRef.current;
        const sliced = prevHistory.slice(0, curStep + 1);
        const updated = [...sliced, [...nextLocalPaths]];
        if (updated.length > 80) updated.shift();
        const newStep = updated.length - 1;
        historyStepRef.current = newStep;
        setHistoryStep(newStep);
        return updated;
      });

      whiteboardP2PService.broadcastEvent('path_add', { path: completedPath });
      debouncedSyncToFirestore(nextLocalPaths, remotePaths, stickyNotes, textElements);

      // Si des données distantes Firebase ont été mises en attente pendant le tracé, on les traite maintenant
      if (pendingRemotePathsDataRef.current) {
        const dataPaths = pendingRemotePathsDataRef.current;
        pendingRemotePathsDataRef.current = null;
        const onlyRemote = dataPaths
          .slice(-350)
          .filter((p) => p && p.authorUid && p.authorUid !== myUid)
          .map((p) => ({ ...p, isRemote: true }));
        setRemotePaths(onlyRemote);
      }
    }
  };

  // ================= 4. GESTION DES VERSIONS & EXPORT CHAT (Auto-Crop Bounding Box) =================
  // ================= 4. GESTION DES VERSIONS & EXPORT CHAT (Auto-Crop Bounding Box) =================
  const generateBoundingBoxPreview = useCallback(() => {
    const allPaths = [...remotePaths, ...localPaths];

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    allPaths.forEach((p) => {
      if (!p) return;
      if (p.type === 'freehand' && p.points && p.points.length > 0) {
        p.points.forEach((pt) => {
          if (pt.x < minX) minX = pt.x;
          if (pt.y < minY) minY = pt.y;
          if (pt.x > maxX) maxX = pt.x;
          if (pt.y > maxY) maxY = pt.y;
        });
      } else if (['rect', 'circle', 'triangle', 'hexagon', 'star', 'speech_bubble', 'heart', 'checkmark', 'text_box'].includes(p.type)) {
        const xMin = Math.min(p.x, p.x + (p.width || 0));
        const xMax = Math.max(p.x, p.x + (p.width || 0));
        const yMin = Math.min(p.y, p.y + (p.height || 0));
        const yMax = Math.max(p.y, p.y + (p.height || 0));
        minX = Math.min(minX, xMin);
        minY = Math.min(minY, yMin);
        maxX = Math.max(maxX, xMax);
        maxY = Math.max(maxY, yMax);
      } else if (p.fromX !== undefined && p.toX !== undefined) {
        minX = Math.min(minX, p.fromX, p.toX);
        minY = Math.min(minY, p.fromY, p.toY);
        maxX = Math.max(maxX, p.fromX, p.toX);
        maxY = Math.max(maxY, p.fromY, p.toY);
      }
    });

    stickyNotes.forEach((s) => {
      if (!s) return;
      minX = Math.min(minX, s.x);
      minY = Math.min(minY, s.y);
      maxX = Math.max(maxX, s.x + (s.width || 150));
      maxY = Math.max(maxY, s.y + (s.height || 130));
    });

    textElements.forEach((t) => {
      if (!t) return;
      minX = Math.min(minX, t.x);
      minY = Math.min(minY, t.y);
      maxX = Math.max(maxX, t.x + (t.width || 200));
      maxY = Math.max(maxY, t.y + (t.height || 60));
    });

    const bgToUse = backgroundColor || (darkMode ? '#12100E' : '#FFFFFF');
    const maxThumbDim = 300;

    // Cas d'un tableau vide
    if (minX === Infinity || maxX <= minX || maxY <= minY) {
      const emptyW = 300;
      const emptyH = 180;
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = emptyW;
      tempCanvas.height = emptyH;
      const ctx = tempCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = bgToUse;
        ctx.fillRect(0, 0, emptyW, emptyH);
        ctx.fillStyle = darkMode ? '#A8998C' : '#9CA3AF';
        ctx.font = 'bold 13px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🎨 Tableau Blanc Vierge', emptyW / 2, emptyH / 2);
      }
      return tempCanvas.toDataURL('image/jpeg', 0.5);
    }

    const margin = 28;
    const boxWidth = Math.ceil(maxX - minX);
    const boxHeight = Math.ceil(maxY - minY);
    const cropWidth = Math.max(260, boxWidth + margin * 2);
    const cropHeight = Math.max(180, boxHeight + margin * 2);

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = cropWidth;
    tempCanvas.height = cropHeight;
    const ctx = tempCanvas.getContext('2d');

    if (!ctx) return '';

    // 1. Remplissage explicite et net du fond
    ctx.fillStyle = bgToUse;
    ctx.fillRect(0, 0, cropWidth, cropHeight);

    ctx.save();
    // 2. Décalage pour centrer le contenu
    ctx.translate(-minX + margin, -minY + margin);

    // Dessine tous les traits dans le canvas rogné
    allPaths.forEach((p) => {
      if (!p) return;
      ctx.save();
      ctx.beginPath();

      if (p.tool === 'eraser') {
        ctx.strokeStyle = bgToUse;
        ctx.lineWidth = p.lineWidth || 12;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalCompositeOperation = 'source-over';
      } else {
        applyBrushStyleToContext(ctx, p.tool, p.color, p.lineWidth, false);
      }

      if (p.type === 'freehand' && p.points && p.points.length > 0) {
        ctx.moveTo(p.points[0].x, p.points[0].y);
        for (let i = 1; i < p.points.length; i++) {
          ctx.lineTo(p.points[i].x, p.points[i].y);
        }
        ctx.stroke();
      } else {
        drawVectorShape(ctx, p);
      }

      ctx.restore();
    });

    // Dessine les post-its
    stickyNotes.forEach((s) => {
      ctx.save();
      ctx.fillStyle = s.color || '#FEF08A';
      ctx.fillRect(s.x, s.y, s.width || 150, s.height || 130);
      ctx.fillStyle = '#1F2937';
      ctx.font = '12px Inter, sans-serif';
      ctx.fillText(s.text || '', s.x + 10, s.y + 25);
      ctx.restore();
    });

    // Dessine les textes
    textElements.forEach((t) => {
      ctx.save();
      ctx.fillStyle = t.color || (darkMode ? '#FFFFFF' : '#1F2937');
      ctx.font = `${t.fontSize || 20}px Inter, sans-serif`;
      ctx.fillText(t.text || '', t.x, t.y + (t.fontSize || 20));
      ctx.restore();
    });

    ctx.restore();

    // 3. Redimensionnement sur un thumbnail Canvas léger (max 300px)
    let targetW = cropWidth;
    let targetH = cropHeight;
    if (targetW > maxThumbDim || targetH > maxThumbDim) {
      if (targetW > targetH) {
        targetH = Math.round((targetH * maxThumbDim) / targetW);
        targetW = maxThumbDim;
      } else {
        targetW = Math.round((targetW * maxThumbDim) / targetH);
        targetH = maxThumbDim;
      }
    }

    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = targetW;
    thumbCanvas.height = targetH;
    const thumbCtx = thumbCanvas.getContext('2d');
    if (thumbCtx) {
      thumbCtx.fillStyle = bgToUse;
      thumbCtx.fillRect(0, 0, targetW, targetH);
      thumbCtx.drawImage(tempCanvas, 0, 0, targetW, targetH);
      return thumbCanvas.toDataURL('image/jpeg', 0.5);
    }

    return tempCanvas.toDataURL('image/jpeg', 0.5);
  }, [remotePaths, localPaths, stickyNotes, textElements, backgroundColor, darkMode]);

  // 1. Bouton "Sauvegarder" (Firestore avec prompt de nommage de version et archivage)
  const handleSave = async () => {
    if (isSaving) return;

    // 2. NOMMAGE DES VERSIONS (Le Prompt)
    const nextVersion = versionNumber + 1;
    const defaultName = `Croquis V${nextVersion}`;
    const userVersionName = window.prompt("Nommez cette version (ex: Croquis V1) :", defaultName);
    if (userVersionName === null) {
      // Annulation utilisateur
      return;
    }
    const versionName = userVersionName.trim() || defaultName;

    setIsSaving(true);
    setSaveStatus('Enregistrement Cloud...');

    try {
      const docRef = doc(db, 'project_whiteboards', String(effectiveId));
      const combinedPaths = [...remotePaths, ...localPaths].slice(-400);
      const thumbnailBase64 = generateBoundingBoxPreview();
      const previewUrl = thumbnailBase64;

      const versionEntry = {
        version: nextVersion,
        name: versionName,
        changeSummary: versionName,
        savedAt: new Date().toISOString(),
        savedByUid: myUid,
        savedByName: myName,
        thumbnailBase64,
        previewUrl,
        backgroundColor,
        data: {
          paths: combinedPaths,
          stickyNotes,
          textElements,
          backgroundColor,
        },
      };

      const payload = {
        boardId: effectiveId,
        groupId,
        title: workspaceTitle,
        versionNumber: nextVersion,
        paths: combinedPaths,
        stickyNotes,
        textElements,
        backgroundColor,
        thumbnailBase64,
        previewUrl,
        updatedAt: serverTimestamp(),
        lastEditor: myName,
        lastEditorUid: myUid,
        versionHistory: arrayUnion(versionEntry),
      };

      await setDoc(docRef, payload, { merge: true });

      await saveWorkspaceVersion({
        workspaceId: effectiveId,
        chatId: groupId,
        type: WORKSPACE_TYPES.WHITEBOARD,
        title: workspaceTitle,
        data: { paths: combinedPaths, stickyNotes, textElements, backgroundColor },
        thumbnailBase64,
        previewUrl,
        currentUser,
        changeSummary: versionName,
      });

      setVersionNumber(nextVersion);
      setVersionsList((prev) => [versionEntry, ...prev.filter((v) => Number(v.version) !== Number(nextVersion))]);
      setSaveStatus(`Sauvegardé (${versionName}) 🟢`);
      setSaveSuccessToast(true);
      setTimeout(() => setSaveSuccessToast(false), 3500);
    } catch (err) {
      console.warn('[CollaborativeWhiteboard] Save error:', err);
      setSaveStatus('Erreur de sauvegarde ⚠️');
    } finally {
      setIsSaving(false);
    }
  };

  // 2. Bouton "Envoyer" (Publication dans le chat avec snapshot Bounding Box JPEG 0.5)
  const handleSend = async () => {
    if (isSending) return;
    setIsSending(true);

    try {
      const thumbnailBase64 = generateBoundingBoxPreview();
      const previewUrl = thumbnailBase64;

      const invitePayload = {
        type: 'workspace_invite',
        kind: 'workspace_invite',
        workspaceType: 'whiteboard',
        boardId: effectiveId,
        workspaceId: effectiveId,
        thumbnailBase64,
        previewUrl,
        title: workspaceTitle,
        workspaceTitle,
        version: `V${versionNumber}`,
        text: `🎨 ${myName} a partagé le Tableau Blanc : "${workspaceTitle}"`,
        timestamp: Date.now(),
      };

      console.log('Payload envoyé:', invitePayload);

      const sendFn = onSendMessage || handleSendMessage || onSendToChat;
      if (typeof sendFn === 'function') {
        await sendFn(invitePayload);
      } else {
        console.warn('⚠️ [CollaborativeWhiteboard] Aucune fonction onSendMessage trouvée !', {
          onSendMessage,
          handleSendMessage,
          onSendToChat,
        });
      }

      if (db) {
        try {
          const docRef = doc(db, 'project_whiteboards', String(effectiveId));
          await setDoc(docRef, { thumbnailBase64, previewUrl, updatedAt: serverTimestamp() }, { merge: true });
          const wsRef = doc(db, 'workspaces', String(effectiveId));
          await setDoc(wsRef, { thumbnailBase64, previewUrl, updatedAt: serverTimestamp() }, { merge: true });
        } catch (_) {}
      }

      setShareSuccessToast(true);
      setSaveStatus('Envoyé dans le chat 💬');
      setTimeout(() => setShareSuccessToast(false), 3500);
    } catch (err) {
      console.warn('[CollaborativeWhiteboard] Send to chat error:', err);
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const createNewBoard = () => {
    const newBoardId = `board_${groupId || 'chat'}_${Date.now()}`;
    setCurrentBoardId(newBoardId);
    setActiveBoardId(newBoardId);
    initialLoadDoneForIdRef.current = null;
    setLocalPaths([]);
    setRemotePaths([]);
    setStickyNotes([]);
    setTextElements([]);
    setHistory([[]]);
    setHistoryStep(0);
    historyStepRef.current = 0;
    setVersionNumber(1);
    setWorkspaceTitle('Nouveau Tableau Blanc');
    setBackgroundColor(darkMode ? '#12100E' : '#FFFFFF');
    setViewMode('canvas');
  };

  // 🚨 PHASE 102 : FORÇAGE DE LA CONDITION AU MONTAGE DU LOBBY
  if (!currentBoardId || viewMode === 'lobby') {
    const lobbyView = (
      <WhiteboardLobby
        onSelect={(selectedId) => {
          setCurrentBoardId(selectedId);
          setActiveBoardId(selectedId);
          initialLoadDoneForIdRef.current = null;
          setViewMode('canvas');
        }}
        onCreateNew={createNewBoard}
        onSelectBoard={(selectedBoardId, boardData) => {
          setCurrentBoardId(selectedBoardId);
          setActiveBoardId(selectedBoardId);
          initialLoadDoneForIdRef.current = null;
          if (boardData?.title) setWorkspaceTitle(boardData.title);
          setViewMode('canvas');
        }}
        onCreateNewBoard={createNewBoard}
        onClose={onClose}
        chatId={groupId}
        selectedChat={{ id: groupId, projectTitle }}
        darkMode={darkMode}
        projectTitle={projectTitle}
      />
    );

    // @guard DO NOT REMOVE PORTAL. Required to escape chat overflow and z-index stacking context on mobile.
    return typeof document !== 'undefined' && document.body
      ? createPortal(
          <div
            className="fixed inset-0 z-[999999] flex flex-col bg-black/90 md:bg-black/60 md:backdrop-blur-sm touch-none"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 999999,
              width: '100dvw',
              height: '100dvh',
              overscrollBehavior: 'none',
              backgroundColor: darkMode ? '#12100E' : '#FAF7F2',
              color: darkMode ? '#FAF7F2' : '#231E1B',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {lobbyView}
          </div>,
          document.body
        )
      : lobbyView;
  }

  const modalContent = (
    <div
      className="fixed inset-0 z-[999999] flex flex-col bg-black/90 md:bg-black/60 md:backdrop-blur-sm touch-none"
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        width: '100dvw',
        height: '100dvh',
        overscrollBehavior: 'none',
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
          top: 'max(10px, env(safe-area-inset-top, 10px))',
          left: isMobile ? '8px' : '14px',
          zIndex: 1000005,
          minWidth: isMobile ? '38px' : '44px',
          minHeight: isMobile ? '38px' : '44px',
          padding: isMobile ? '8px 12px' : '10px 18px',
          borderRadius: '999px',
          border: darkMode ? '1px solid rgba(255,255,255,0.22)' : '1px solid rgba(0,0,0,0.15)',
          backgroundColor: darkMode ? 'rgba(26,22,19,0.95)' : 'rgba(255,255,255,0.95)',
          color: 'inherit',
          fontSize: '13px',
          fontWeight: '800',
          cursor: 'pointer',
          boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
        title="Fermer le tableau blanc et revenir au chat"
        aria-label="Fermer le tableau blanc"
      >
        <X size={isMobile ? 18 : 20} strokeWidth={2.5} />
        {!isMobile && <span>Fermer</span>}
      </button>

      {/* BOUTON RETOUR À L'HISTORIQUE (LOBBY MULTI-TABLEAUX) SANS FERMER LA MODALE */}
      <button
        type="button"
        onClick={() => {
          setViewMode('lobby');
        }}
        className="premium-button"
        style={{
          position: 'absolute',
          top: 'max(10px, env(safe-area-inset-top, 10px))',
          left: isMobile ? '50px' : '136px',
          zIndex: 1000005,
          minWidth: isMobile ? '38px' : '44px',
          minHeight: isMobile ? '38px' : '44px',
          padding: isMobile ? '8px 12px' : '10px 16px',
          borderRadius: '999px',
          border: darkMode ? '1px solid rgba(255,255,255,0.22)' : '1px solid rgba(0,0,0,0.15)',
          backgroundColor: darkMode ? 'rgba(26,22,19,0.95)' : 'rgba(255,255,255,0.95)',
          color: '#C67D5B',
          fontSize: '13px',
          fontWeight: '800',
          cursor: 'pointer',
          boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
        title="Retour à l'historique des tableaux (Lobby)"
        aria-label="Retour à l'historique"
      >
        <FolderKanban size={isMobile ? 18 : 19} strokeWidth={2.2} />
        {!isMobile && <span>Historique</span>}
      </button>

      {/* 1. EN-TÊTE PRINCIPAL RESPONSIVE (Masqué en mode immersion) */}
      {!isImmersiveMode && (
        <header
          style={{
            height: '56px',
            padding: isMobile ? '0 8px 0 96px' : '0 20px 0 250px',
            borderBottom: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
            backgroundColor: darkMode ? 'rgba(21,18,15,0.85)' : 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: isMobile ? '6px' : '12px',
            flexShrink: 0,
            zIndex: 10,
            overflowX: 'auto',
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch',
            whiteSpace: 'nowrap',
          }}
        >
          {/* Titre & Statut */}
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '12px', flexShrink: 0, minWidth: 0 }}>
            <div
              style={{
                width: isMobile ? '32px' : '38px',
                height: isMobile ? '32px' : '38px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #C67D5B 0%, #A8644A 100%)',
                color: '#FFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(198,125,91,0.35)',
                flexShrink: 0,
              }}
            >
              <Brush size={isMobile ? 16 : 20} />
            </div>

            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="text"
                  value={workspaceTitle}
                  onChange={(e) => setWorkspaceTitle(e.target.value)}
                  style={{
                    fontSize: isMobile ? '13px' : '15px',
                    fontWeight: '900',
                    background: 'none',
                    border: 'none',
                    outline: 'none',
                    color: 'inherit',
                    padding: 0,
                    maxWidth: isMobile ? '110px' : '220px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                />
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: '800',
                    backgroundColor: 'rgba(198,125,91,0.2)',
                    color: '#C67D5B',
                    padding: '2px 6px',
                    borderRadius: '6px',
                    flexShrink: 0,
                  }}
                >
                  V{versionNumber}
                </span>
              </div>
              {!isMobile && (
                <div style={{ fontSize: '11px', color: darkMode ? '#A8998C' : '#6B7280', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>{saveStatus}</span>
                  <span>•</span>
                  <span>Modifié par <strong>{lastEditor}</strong></span>
                </div>
              )}
            </div>
          </div>

          {/* BADGE "🔴 EN DIRECT" MULTIJOUEUR (Affiché si >= 2 utilisateurs connectés) */}
          {activeUsersCount >= 2 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: isMobile ? '3px 8px' : '4px 12px',
                borderRadius: '999px',
                backgroundColor: 'rgba(239, 68, 68, 0.14)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                color: '#EF4444',
                fontSize: isMobile ? '11px' : '12px',
                fontWeight: '800',
                letterSpacing: '0.3px',
                boxShadow: '0 0 14px rgba(239, 68, 68, 0.25)',
                animation: 'pulse 2s infinite ease-in-out',
                flexShrink: 0,
              }}
              title={`${activeUsersCount} collaborateurs connectés en direct sur ce tableau`}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#EF4444',
                  boxShadow: '0 0 8px #EF4444',
                  display: 'inline-block',
                }}
              />
              <span>🔴 EN DIRECT ({activeUsersCount})</span>
            </div>
          )}

          {/* Boutons d'action Header : Versions, Sauvegarder & Envoyer */}
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '4px' : '8px', flexShrink: 0 }}>
            {/* BOUTON HISTORIQUE DES VERSIONS */}
            <button
              type="button"
              onClick={() => {
                const nextOpen = !isVersionsSidebarOpen;
                setIsVersionsSidebarOpen(nextOpen);
                if (nextOpen) fetchVersions();
              }}
              className="premium-button"
              style={{
                padding: isMobile ? '6px 10px' : '8px 14px',
                borderRadius: '12px',
                border: isVersionsSidebarOpen ? '1px solid #C67D5B' : (darkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(0,0,0,0.12)'),
                backgroundColor: isVersionsSidebarOpen ? 'rgba(198,125,91,0.18)' : (darkMode ? 'rgba(255,255,255,0.06)' : '#FAF8F5'),
                color: isVersionsSidebarOpen ? '#C67D5B' : 'inherit',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                minHeight: isMobile ? '34px' : '38px',
                transition: 'all 0.15s ease',
              }}
              title="Afficher l'historique des versions"
            >
              <History size={16} color={isVersionsSidebarOpen ? '#C67D5B' : 'currentColor'} />
              {!isMobile && <span>Versions</span>}
              {versionsList.length > 0 && (
                <span
                  style={{
                    fontSize: '10px',
                    padding: '1px 5px',
                    borderRadius: '999px',
                    backgroundColor: isVersionsSidebarOpen ? '#C67D5B' : 'rgba(198,125,91,0.18)',
                    color: isVersionsSidebarOpen ? '#FFF' : '#C67D5B',
                    fontWeight: '800',
                  }}
                >
                  {versionsList.length}
                </span>
              )}
            </button>

            {/* BOUTON SAUVEGARDER (💾 sur mobile) */}
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="premium-button"
              style={{
                padding: isMobile ? '6px 10px' : '8px 14px',
                borderRadius: '12px',
                border: darkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(0,0,0,0.12)',
                backgroundColor: darkMode ? 'rgba(255,255,255,0.06)' : '#FAF8F5',
                color: 'inherit',
                fontSize: '12px',
                fontWeight: '700',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                minHeight: isMobile ? '34px' : '38px',
                transition: 'all 0.15s ease',
              }}
              title="Sauvegarder dans le Cloud (💾)"
            >
              {isSaving ? <Sparkles size={15} /> : <Save size={16} color="#10B981" />}
              {!isMobile && <span>{isSaving ? 'Enregistrement...' : 'Sauvegarder'}</span>}
            </button>

            {/* BOUTON ENVOYER (✈️ sur mobile) */}
            <button
              type="button"
              disabled={isSending}
              onClick={handleSend}
              className="premium-button"
              style={{
                padding: isMobile ? '6px 12px' : '8px 16px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #C67D5B 0%, #A8644A 100%)',
                color: '#FFF',
                fontSize: '12px',
                fontWeight: '800',
                cursor: isSending ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(198,125,91,0.35)',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                minHeight: isMobile ? '34px' : '38px',
                transition: 'all 0.15s ease',
              }}
              title="Envoyer dans la conversation (✈️)"
            >
              {isSending ? <Sparkles size={15} /> : <Send size={16} />}
              {!isMobile && <span>{isSending ? 'Envoi...' : 'Envoyer'}</span>}
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

      {/* TOAST DE SUCCÈS DE SAUVEGARDE */}
      {saveSuccessToast && (
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
          Tableau blanc sauvegardé dans le Cloud ! 🟢
        </div>
      )}

      {/* TOAST DE SUCCÈS D'ENVOI DANS LE CHAT */}
      {shareSuccessToast && (
        <div
          style={{
            position: 'fixed',
            bottom: '84px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000000,
            backgroundColor: '#C67D5B',
            color: '#FFF',
            padding: '10px 20px',
            borderRadius: '999px',
            fontWeight: '800',
            fontSize: '13px',
            boxShadow: '0 10px 30px rgba(198,125,91,0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <Send size={16} />
          Tableau blanc envoyé et publié dans le chat ! 💬
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
          backgroundColor: backgroundColor,
          backgroundImage: showGrid
            ? (['#FFFFFF', '#FDFBF7', '#FEF9C3', '#E0F2FE'].includes(backgroundColor)
                ? 'radial-gradient(circle, rgba(0,0,0,0.1) 1px, transparent 1px)'
                : 'radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)')
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
            currentPathRef.current = null;
            if (rafDrawRef.current) {
              cancelAnimationFrame(rafDrawRef.current);
              rafDrawRef.current = null;
            }
          }
        }}
        onTouchMove={(e) => {
          if (e.touches.length === 2) {
            e.preventDefault();
            const now = performance.now();
            if (now - lastTouchZoomTimeRef.current < 16) return;
            lastTouchZoomTimeRef.current = now;

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
            cursor: tool === 'hand' ? 'grab' : tool === 'eraser' ? 'cell' : (tool === 'select' || toolMode === 'select' ? 'default' : 'crosshair'),
            touchAction: 'none',
          }}
        />

        {/* 🚨 PHASE 110 : TOOLTIP FLOTTANT ROTATION (DEGRÉS EN TEMPS RÉEL) */}
        {rotationTooltip && (
          <div
            style={{
              position: 'fixed',
              left: `${rotationTooltip.screenX + 16}px`,
              top: `${rotationTooltip.screenY - 28}px`,
              backgroundColor: 'rgba(15, 23, 42, 0.92)',
              color: '#FFFFFF',
              fontSize: '11px',
              fontWeight: '800',
              padding: '4px 8px',
              borderRadius: '6px',
              pointerEvents: 'none',
              zIndex: 10000000,
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              fontFamily: 'monospace',
              border: '1px solid rgba(255,255,255,0.18)',
              backdropFilter: 'blur(4px)',
            }}
          >
            {rotationTooltip.degrees}°
          </div>
        )}

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

        {/* TEXT ELEMENTS AVEC SCALE-TO-FIT & ÉDITION DIRECTE */}
        {textElements.map((t) => {
          const isEditing = editingTextId === t.id;
          const fontSizePx = (t.fontSize || 24) * zoom;

          return (
            <div
              key={t.id}
              onPointerDown={(e) => e.stopPropagation()}
              style={{
                position: 'absolute',
                left: `${pan.x + t.x * zoom}px`,
                top: `${pan.y + t.y * zoom}px`,
                width: `${(t.width || 220) * zoom}px`,
                minHeight: `${(t.height || 50) * zoom}px`,
                zIndex: isEditing ? 50 : 25,
                boxSizing: 'border-box',
                border: isEditing ? '2px dashed var(--accent-primary, #C67D5B)' : '2px solid transparent',
                backgroundColor: isEditing ? (darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)') : 'transparent',
                borderRadius: '8px',
                padding: '4px',
              }}
              onDoubleClick={() => setEditingTextId(t.id)}
            >
              {isEditing ? (
                <textarea
                  autoFocus
                  placeholder="Tapez votre texte..."
                  value={t.text}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      e.target.blur();
                    } else if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      e.target.blur();
                    }
                  }}
                  onBlur={() => {
                    if (!t.text || t.text.trim() === '') {
                      const filtered = textElements.filter((item) => item.id !== t.id);
                      setTextElements(filtered);
                      whiteboardP2PService.broadcastEvent('text_delete', { id: t.id });
                      debouncedSyncToFirestore(localPaths, remotePaths, stickyNotes, filtered);
                    }
                    setEditingTextId(null);
                    // 🚨 PHASE 110 : Fix mode texte -> bascule forcée en mode sélection (Curseur ↖️)
                    setToolMode('select');
                    setTool('select');
                    setSelectedObjectId(t.id);
                  }}
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
                    color: t.color || (['#FFFFFF', '#FDFBF7'].includes(backgroundColor) ? '#1F2937' : '#FFFFFF'),
                    fontFamily: t.fontFamily || 'Inter, sans-serif',
                    fontSize: `${fontSizePx}px`,
                    fontWeight: '800',
                    lineHeight: 1.2,
                  }}
                />
              ) : (
                <div
                  onClick={() => setEditingTextId(t.id)}
                  style={{
                    width: '100%',
                    height: '100%',
                    color: t.color || (['#FFFFFF', '#FDFBF7'].includes(backgroundColor) ? '#1F2937' : '#FFFFFF'),
                    fontFamily: t.fontFamily || 'Inter, sans-serif',
                    fontSize: `${fontSizePx}px`,
                    fontWeight: '800',
                    lineHeight: 1.2,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    cursor: 'text',
                  }}
                >
                  {t.text || 'Texte vide'}
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
          className="flex flex-row overflow-x-auto overflow-y-hidden snap-x snap-mandatory touch-pan-x no-scrollbar items-center justify-start md:justify-center max-w-full px-4 py-2 space-x-3"
          style={{
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000000,
            maxWidth: '96vw',
            backgroundColor: darkMode ? 'rgba(26,22,19,0.92)' : 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: darkMode ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.1)',
            borderRadius: '24px',
            boxShadow: '0 20px 40px -10px rgba(0,0,0,0.25)',
          }}
        >
          {/* Outils de dessin libres */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
            {/* 🚨 PHASE 110 : Outil Curseur de sélection (↖️) */}
            <button
              type="button"
              className="snap-center"
              onClick={() => {
                setTool('select');
                setToolMode('select');
                setIsShapesMenuOpen(false);
              }}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: (tool === 'select' || toolMode === 'select')
                  ? 'var(--accent-primary, #C67D5B)'
                  : darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                color: (tool === 'select' || toolMode === 'select') ? '#FFFFFF' : 'inherit',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                flexShrink: 0,
              }}
              title="Sélectionner & Manipuler (Curseur)"
            >
              <MousePointer size={18} />
            </button>

            {[
              { id: 'pencil', icon: Pen, title: 'Crayon' },
              { id: 'brush', icon: Brush, title: 'Pinceau Artistique' },
              { id: 'highlighter', icon: Highlighter, title: 'Surligneur' },
              { id: 'eraser', icon: Eraser, title: 'Gomme' },
            ].map((btn) => {
              const Icon = btn.icon;
              const isSelected = tool === btn.id && toolMode !== 'select';
              return (
                <button
                  key={btn.id}
                  type="button"
                  className="snap-center"
                  onClick={() => {
                    setTool(btn.id);
                    setToolMode('draw');
                    setSelectedObjectId(null);
                    setIsShapesMenuOpen(false);
                  }}
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

            {/* BOUTON DÉROULANT FORMES GÉOMÉTRIQUES & VECTORIELLES */}
            <div style={{ position: 'relative', flexShrink: 0, overflow: 'visible' }}>
              <button
                ref={shapeButtonRef}
                type="button"
                className="snap-center"
                onClick={() => {
                  setToolMode('shape');
                  setSelectedObjectId(null);
                  if (['rect', 'circle', 'line', 'arrow', 'triangle', 'hexagon', 'star', 'speech_bubble', 'heart', 'checkmark'].includes(tool)) {
                    toggleShapesMenu();
                  } else {
                    setTool(selectedShape);
                    toggleShapesMenu();
                  }
                }}
                style={{
                  height: '40px',
                  padding: '0 10px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: ['rect', 'circle', 'line', 'arrow', 'triangle', 'hexagon', 'star', 'speech_bubble', 'heart', 'checkmark'].includes(tool) && toolMode !== 'select'
                    ? 'var(--accent-primary, #C67D5B)'
                    : darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                  color: ['rect', 'circle', 'line', 'arrow', 'triangle', 'hexagon', 'star', 'speech_bubble', 'heart', 'checkmark'].includes(tool) && toolMode !== 'select' ? '#FFFFFF' : 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
                }}
                title="Bibliothèque étendue de formes vectorielles"
              >
                {React.createElement(
                  (SHAPE_OPTIONS.find((s) => s.id === selectedShape) || SHAPE_OPTIONS[0]).icon,
                  { size: 18 }
                )}
                <ChevronDown size={13} style={{ opacity: 0.85 }} />
              </button>
            </div>

            {/* 🚨 PHASE 93 : SOUS-MENU POPOVER DES FORMES ÉVADÉ DANS UN PORTAL BODY (ZÉRO CLIPPING PAR LA TOOLBAR) */}
            {typeof document !== 'undefined' && createPortal(
              <AnimatePresence>
                {isShapesMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: 10 }}
                    transition={{ duration: 0.16, ease: 'easeOut' }}
                    style={{
                      position: 'fixed',
                      left: `${shapesMenuCoords.left}px`,
                      bottom: `${shapesMenuCoords.bottom}px`,
                      zIndex: 10000000,
                      backgroundColor: darkMode ? 'rgba(26,22,19,0.96)' : 'rgba(255,255,255,0.96)',
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                      border: darkMode ? '1px solid rgba(255,255,255,0.14)' : '1px solid rgba(0,0,0,0.12)',
                      borderRadius: '16px',
                      padding: '8px',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(5, 1fr)',
                      gap: '6px',
                      boxShadow: '0 16px 36px -8px rgba(0,0,0,0.35)',
                      pointerEvents: 'auto',
                    }}
                  >
                    {SHAPE_OPTIONS.map((shape) => {
                      const Icon = shape.icon;
                      const isSel = tool === shape.id;
                      return (
                        <button
                          key={shape.id}
                          type="button"
                          onClick={() => {
                            setSelectedShape(shape.id);
                            setTool(shape.id);
                            setToolMode('shape');
                            setSelectedObjectId(null);
                            setIsShapesMenuOpen(false);
                          }}
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            border: 'none',
                            backgroundColor: isSel
                              ? 'var(--accent-primary, #C67D5B)'
                              : darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                            color: isSel ? '#FFFFFF' : 'inherit',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                          title={shape.title}
                        >
                          <Icon size={17} />
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>,
              document.body
            )}

            {/* Post-it, Texte & Main Pan */}
            {[
              { id: 'sticky', icon: StickyNote, title: 'Post-it', mode: 'shape' },
              { id: 'text', icon: Type, title: 'Texte', mode: 'text' },
              { id: 'hand', icon: Hand, title: 'Déplacer (Pan)', mode: 'pan' },
            ].map((btn) => {
              const Icon = btn.icon;
              const isSelected = tool === btn.id && toolMode !== 'select';
              return (
                <button
                  key={btn.id}
                  type="button"
                  className="snap-center"
                  onClick={() => {
                    setTool(btn.id);
                    setToolMode(btn.mode || 'draw');
                    setSelectedObjectId(null);
                    setIsShapesMenuOpen(false);
                  }}
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

          {/* PALETTE DE COULEURS INFINIES (<input type="color"> masqué derrière bouton élégant) */}
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
              className="premium-button"
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '999px',
                border: darkMode ? '1.5px solid rgba(255,255,255,0.15)' : '1.5px solid rgba(0,0,0,0.15)',
                backgroundColor: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                cursor: 'pointer',
                flexShrink: 0,
              }}
              title="Ouvrir le spectre de couleurs complet"
            >
              <Brush size={14} color="#C67D5B" />
              <div
                style={{
                  width: '16px',
                  height: '16px',
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
                className="opacity-0 absolute w-0 h-0 pointer-events-none"
                style={{
                  position: 'absolute',
                  opacity: 0,
                  width: 0,
                  height: 0,
                  pointerEvents: 'none',
                }}
              />
            </label>
          </div>

          <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border-color, rgba(0,0,0,0.1))', margin: '0 4px', flexShrink: 0 }} />

          {/* SÉLECTEUR DE COULEUR DE FOND DU CANVAS (Indépendant du thème global) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }} title="Couleur d'arrière-plan du tableau">
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', fontWeight: '800', opacity: 0.8, marginRight: '2px' }}>
              <Palette size={14} color="#C67D5B" />
              <span>Fond</span>
            </div>

            {BG_PRESETS.slice(0, 4).map((bg) => (
              <button
                key={bg.id}
                type="button"
                onClick={() => handleChangeBackgroundColor(bg.hex)}
                style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '6px',
                  backgroundColor: bg.hex,
                  border: backgroundColor === bg.hex ? '2.5px solid #C67D5B' : '1.5px solid rgba(0,0,0,0.15)',
                  cursor: 'pointer',
                  boxShadow: backgroundColor === bg.hex ? '0 0 8px rgba(198,125,91,0.5)' : 'none',
                  flexShrink: 0,
                  transition: 'all 0.15s ease',
                }}
                title={`Fond ${bg.name}`}
              />
            ))}

            {/* Custom Background Color Picker */}
            <label
              className="premium-button"
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '26px',
                height: '26px',
                borderRadius: '8px',
                border: darkMode ? '1.5px solid rgba(255,255,255,0.2)' : '1.5px solid rgba(0,0,0,0.2)',
                backgroundColor: backgroundColor,
                cursor: 'pointer',
                flexShrink: 0,
                boxShadow: '0 2px 5px rgba(0,0,0,0.15)',
              }}
              title="Personnaliser la couleur d'arrière-plan"
            >
              <Palette size={14} color={['#FFFFFF', '#FDFBF7', '#FEF9C3', '#E0F2FE'].includes(backgroundColor) ? '#1F2937' : '#FFFFFF'} />
              <input
                ref={bgColorInputRef}
                type="color"
                value={backgroundColor}
                onChange={(e) => handleChangeBackgroundColor(e.target.value)}
                className="opacity-0 absolute w-0 h-0 pointer-events-none"
                style={{
                  position: 'absolute',
                  opacity: 0,
                  width: 0,
                  height: 0,
                  pointerEvents: 'none',
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

          {/* 🚨 PHASE 110 : BOUTONS COPIER / COLLER & UNDO / REDO, EFFACER & PLEIN ÉCRAN */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
            {/* Copier */}
            <button
              type="button"
              disabled={!selectedObjectId}
              onClick={handleCopy}
              className="snap-center"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: selectedObjectId ? (darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)') : 'transparent',
                color: !selectedObjectId ? (darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)') : 'inherit',
                cursor: !selectedObjectId ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: !selectedObjectId ? 0.35 : 1,
                transition: 'all 0.15s ease',
              }}
              title="Copier l'élément sélectionné (Ctrl+C)"
            >
              <Copy size={16} />
            </button>

            {/* Coller */}
            <button
              type="button"
              disabled={!clipboardObject}
              onClick={handlePaste}
              className="snap-center"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: clipboardObject ? (darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)') : 'transparent',
                color: !clipboardObject ? (darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)') : 'inherit',
                cursor: !clipboardObject ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: !clipboardObject ? 0.35 : 1,
                transition: 'all 0.15s ease',
              }}
              title="Coller l'élément copié (Ctrl+V)"
            >
              <Clipboard size={16} />
            </button>

            <button
              type="button"
              disabled={historyStep <= 0}
              onClick={handleUndo}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: 'transparent',
                color: historyStep <= 0 ? (darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)') : 'inherit',
                cursor: historyStep <= 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: historyStep <= 0 ? 0.35 : 1,
                transition: 'all 0.15s ease',
              }}
              title="Annuler (Ctrl+Z)"
            >
              <RotateCcw size={16} />
            </button>

            <button
              type="button"
              disabled={historyStep >= history.length - 1}
              onClick={handleRedo}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: 'transparent',
                color: historyStep >= history.length - 1 ? (darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)') : 'inherit',
                cursor: historyStep >= history.length - 1 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: historyStep >= history.length - 1 ? 0.35 : 1,
                transition: 'all 0.15s ease',
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
                  pushToHistory([]);
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

      {/* 4. MENU LATÉRAL DES VERSIONS ANIMÉ (FRAMER MOTION) */}
      <AnimatePresence>
        {isVersionsSidebarOpen && (
          <>
            {/* Backdrop translucide */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsVersionsSidebarOpen(false)}
              style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0,0,0,0.45)',
                backdropFilter: 'blur(6px)',
                WebkitBackdropFilter: 'blur(6px)',
                zIndex: 1000008,
              }}
            />

            {/* Panneau latéral Sidebar */}
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              style={{
                position: 'fixed',
                top: 0,
                right: 0,
                bottom: 0,
                width: 'min(380px, 90vw)',
                backgroundColor: darkMode ? '#181513' : '#FFFFFF',
                color: darkMode ? '#FAF7F2' : '#1F2937',
                borderLeft: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
                boxShadow: '-10px 0 40px rgba(0,0,0,0.3)',
                zIndex: 1000010,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              {/* En-tête Sidebar */}
              <div
                style={{
                  padding: '18px 20px',
                  borderBottom: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexShrink: 0,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(198,125,91,0.18)',
                      color: '#C67D5B',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <History size={18} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800' }}>Versions & Historique</h3>
                    <p style={{ margin: 0, fontSize: '11.5px', color: darkMode ? '#A8998C' : '#6B7280' }}>
                      {versionsList.length} version{versionsList.length > 1 ? 's' : ''} enregistrée{versionsList.length > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsVersionsSidebarOpen(false)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                    color: 'inherit',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                  title="Fermer le panneau des versions"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Liste des versions */}
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                {isLoadingVersions ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: darkMode ? '#A8998C' : '#6B7280', fontSize: '13px' }}>
                    <Clock size={24} style={{ margin: '0 auto 10px auto', display: 'block', opacity: 0.6 }} />
                    Chargement des versions...
                  </div>
                ) : versionsList.length === 0 ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: darkMode ? '#A8998C' : '#6B7280', fontSize: '13px' }}>
                    <History size={32} color="#C67D5B" style={{ margin: '0 auto 12px auto', display: 'block', opacity: 0.7 }} />
                    <p style={{ margin: '0 0 6px 0', fontWeight: '800', fontSize: '14px', color: 'inherit' }}>Aucune version archivée</p>
                    <p style={{ margin: 0, fontSize: '12px', opacity: 0.8 }}>Cliquez sur "Sauvegarder" dans l'en-tête pour créer et nommer votre première version.</p>
                  </div>
                ) : (
                  versionsList.map((ver, idx) => {
                    const isCurrent = Number(ver.version) === Number(versionNumber);
                    const dateStr = ver.savedAt
                      ? new Date(ver.savedAt).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '';

                    return (
                      <div
                        key={ver.version || idx}
                        onClick={() => handleLoadVersion(ver)}
                        className="premium-button"
                        style={{
                          borderRadius: '14px',
                          border: isCurrent
                            ? '2px solid #C67D5B'
                            : darkMode
                            ? '1px solid rgba(255,255,255,0.08)'
                            : '1px solid rgba(0,0,0,0.08)',
                          backgroundColor: isCurrent
                            ? (darkMode ? 'rgba(198,125,91,0.14)' : 'rgba(198,125,91,0.08)')
                            : (darkMode ? 'rgba(255,255,255,0.03)' : '#FAF8F5'),
                          padding: '12px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          textAlign: 'left',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: '900',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                backgroundColor: isCurrent ? '#C67D5B' : (darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'),
                                color: isCurrent ? '#FFFFFF' : 'inherit',
                              }}
                            >
                              V{ver.version}
                            </span>
                            <span style={{ fontSize: '13px', fontWeight: '800' }}>
                              {ver.name || ver.changeSummary || `Version ${ver.version}`}
                            </span>
                          </div>
                          {isCurrent && (
                            <span style={{ fontSize: '10.5px', color: '#C67D5B', fontWeight: '800' }}>
                              Actuelle
                            </span>
                          )}
                        </div>

                        {/* Snapshot thumbnail preview */}
                        {ver.previewUrl && (
                          <div
                            style={{
                              width: '100%',
                              height: '95px',
                              borderRadius: '8px',
                              overflow: 'hidden',
                              backgroundColor: ver.backgroundColor || (darkMode ? '#12100E' : '#FFFFFF'),
                              border: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <img
                              src={ver.previewUrl}
                              alt={`Aperçu V${ver.version}`}
                              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                            />
                          </div>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: darkMode ? '#A8998C' : '#6B7280' }}>
                          <span>Par <strong>{ver.savedByName || 'Collaborateur'}</strong></span>
                          <span>{dateStr}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );

  // @guard DO NOT REMOVE PORTAL. Required to escape chat overflow and z-index stacking context on mobile.
  return createPortal(
    <Profiler id="CollaborativeWhiteboardModal" onRender={onRenderProfilerCallback}>
      {modalContent}
    </Profiler>,
    document.body
  );
}
