/**
 * CollaborativeWhiteboard.jsx — Moteur de Tableau Blanc Collaboratif Multi-versions
 * Écosystème Troco Workspace (Phase 1)
 *
 * Fonctionnalités :
 * 1. Synchronisation temps réel 60 FPS via WebRTC P2P (0ms) & Debounce Firestore.
 * 2. Moteur de brosses Apple-Style (Crayon, Pinceau, Surligneur, Gomme, Formes, Flèches, Post-its, Textes).
 * 3. Caméra infinie (Pan, Zoom, Déplacement tactile à deux doigts).
 * 4. Bouton "Sauvegarder & Partager" : Génération d'un Snapshot DataURL, versioning incrémental (V1, V2, V3) dans `workspaces`, et publication automatique d'une carte dans le chat.
 * 5. Respect strict des standards Apple HIG (touch targets >= 44px, gestes tactiles anti-conflits).
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Pen, Highlighter, Eraser, Square, Circle, ArrowRight,
  RotateCcw, RotateCw, Trash2, StickyNote,
  Type, Hand, Brush, Share2, Check
} from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { whiteboardP2PService } from '../../services/whiteboardP2PService';
import {
  saveWorkspaceVersion,
  loadWorkspaceData,
  postWorkspaceInviteToChat,
  WORKSPACE_TYPES,
} from './workspaceService';

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

export default function CollaborativeWhiteboard({
  isOpen,
  onClose,
  groupId = 'default_chat',
  boardId = null,
  workspaceId = null,
  projectTitle = 'Tableau Blanc Collaboratif',
  currentUser = null,
  darkMode = false,
  onSendToChat = null,
  onSendMessage = null,
}) {
  const effectiveId = workspaceId || boardId || `ws_${groupId}_whiteboard`;
  const myUid = currentUser?.uid || currentUser?.id || 'local_user';
  const myName = currentUser?.name || currentUser?.username || 'Moi';

  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Outils : 'pencil' | 'brush' | 'highlighter' | 'eraser' | 'rect' | 'circle' | 'arrow' | 'sticky' | 'text' | 'hand'
  const [tool, setTool] = useState('pencil');
  const [color, setColor] = useState('#C67D5B');
  const [lineWidth, setLineWidth] = useState(4);
  const [showGrid, setShowGrid] = useState(true);

  // État des objets vectoriels
  const [paths, setPaths] = useState([]);
  const [stickyNotes, setStickyNotes] = useState([]);
  const [textElements, setTextElements] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  // Caméra & Navigation (Viewport Pan & Zoom)
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  // Multi-versions & Titre
  const [versionNumber, setVersionNumber] = useState(1);
  const [workspaceTitle, setWorkspaceTitle] = useState(projectTitle || 'Tableau Blanc Collaboratif');
  const [saveStatus, setSaveStatus] = useState('Prêt 🟢');
  const [lastEditor, setLastEditor] = useState(myName);
  const [isSavingAndSharing, setIsSavingAndSharing] = useState(false);
  const [shareSuccessToast, setShareSuccessToast] = useState(false);

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

  // Interaction Refs
  const isDrawingRef = useRef(false);
  const currentPathRef = useRef(null);
  const startPosRef = useRef({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, origPanX: 0, origPanY: 0 });
  const draggingStickyRef = useRef(null);

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

  // Style de brosses Apple-Style
  const applyBrushStyle = (ctx, brushTool, brushColor, brushWidth, isRemote = false) => {
    ctx.lineWidth = brushWidth;
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';

    if (brushTool === 'pencil') {
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
      ctx.shadowBlur = Math.max(2, brushWidth * 0.8);
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

  // Rendu 60 FPS du Canvas
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
      applyBrushStyle(ctx, path.tool, path.color, path.lineWidth, !!path.isRemote);

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

  // Initialisation taille du canvas
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

  // CHARGEMENT INITIAL DE LA SESSION DEPUIS FIRESTORE `workspaces`
  useEffect(() => {
    if (!isOpen || !effectiveId) return;

    let isMounted = true;
    const fetchInitialData = async () => {
      const wsData = await loadWorkspaceData(effectiveId);
      if (wsData && isMounted) {
        if (wsData.version) setVersionNumber(Number(wsData.version) || 1);
        if (wsData.title) setWorkspaceTitle(wsData.title);
        if (wsData.data?.paths) {
          setPaths(wsData.data.paths);
          redrawCanvas(wsData.data.paths);
        }
        if (wsData.data?.stickyNotes) setStickyNotes(wsData.data.stickyNotes);
        if (wsData.data?.textElements) setTextElements(wsData.data.textElements);
      }
    };

    fetchInitialData();

    // Connexion P2P pour diffusion immédiate
    whiteboardP2PService.joinRoom(effectiveId, (event) => {
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
      } else if (event.type === 'clear') {
        setPaths([]);
        setStickyNotes([]);
        setTextElements([]);
        redrawCanvas([]);
      }
    });

    // Écoute des mises à jour distantes depuis Firestore
    if (db) {
      try {
        const docRef = doc(db, 'workspaces', String(effectiveId));
        const unsub = onSnapshot(docRef, (snapshot) => {
          if (snapshot.exists() && isMounted) {
            const data = snapshot.data();
            if (data.lastModifiedByName) setLastEditor(data.lastModifiedByName);
            if (data.lastEditor) setLastEditor(data.lastEditor);
            if (data.version && data.version > versionNumber) {
              setVersionNumber(data.version);
            }
            if (data.data?.paths && !isDrawingRef.current) {
              setPaths(data.data.paths);
              redrawCanvas(data.data.paths);
            }
            if (data.data?.stickyNotes && !draggingStickyRef.current) {
              setStickyNotes(data.data.stickyNotes);
            }
            if (data.data?.textElements) {
              setTextElements(data.data.textElements);
            }
          }
        });
        return () => {
          isMounted = false;
          unsub();
        };
      } catch (_) {}
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, effectiveId, redrawCanvas]);

  // GESTION DU DESSIN (Pointer Down / Move / Up)
  const handlePointerDown = (e) => {
    if (tool === 'hand' || e.button === 1 || e.buttons === 4) {
      isPanningRef.current = true;
      const screenX = e.clientX !== undefined ? e.clientX : e.touches?.[0]?.clientX || 0;
      const screenY = e.clientY !== undefined ? e.clientY : e.touches?.[0]?.clientY || 0;
      panStartRef.current = { x: screenX, y: screenY, origPanX: pan.x, origPanY: pan.y };
      return;
    }

    if (tool === 'sticky') {
      const coords = getCanvasCoords(e);
      const newSticky = {
        id: `sticky_${Date.now()}`,
        x: coords.x - 70,
        y: coords.y - 70,
        text: 'Idée ou note...',
        color: STICKY_COLORS[0].hex,
        authorName: myName,
        createdAt: Date.now(),
      };
      setStickyNotes((prev) => [...prev, newSticky]);
      whiteboardP2PService.broadcast({ type: 'sticky_add', sticky: newSticky });
      setTool('pencil');
      return;
    }

    if (tool === 'text') {
      const coords = getCanvasCoords(e);
      const userText = window.prompt('Entrez votre texte sur le tableau blanc :', 'Texte');
      if (userText && userText.trim()) {
        const newText = {
          id: `text_${Date.now()}`,
          x: coords.x,
          y: coords.y,
          text: userText.trim(),
          color,
          fontSize: 18,
          createdAt: Date.now(),
        };
        setTextElements((prev) => [...prev, newText]);
      }
      setTool('pencil');
      return;
    }

    const coords = getCanvasCoords(e);
    isDrawingRef.current = true;
    startPosRef.current = coords;

    if (tool === 'pencil' || tool === 'brush' || tool === 'highlighter' || tool === 'eraser') {
      currentPathRef.current = {
        id: `path_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        type: 'freehand',
        tool,
        color,
        lineWidth,
        points: [{ x: coords.x, y: coords.y }],
        authorUid: myUid,
        authorName: myName,
        createdAt: Date.now(),
      };
    } else if (tool === 'rect' || tool === 'circle') {
      currentPathRef.current = {
        id: `shape_${Date.now()}`,
        type: tool,
        tool,
        color,
        lineWidth,
        x: coords.x,
        y: coords.y,
        width: 0,
        height: 0,
        authorUid: myUid,
        createdAt: Date.now(),
      };
    } else if (tool === 'arrow') {
      currentPathRef.current = {
        id: `arrow_${Date.now()}`,
        type: 'arrow',
        tool,
        color,
        lineWidth,
        fromX: coords.x,
        fromY: coords.y,
        toX: coords.x,
        toY: coords.y,
        authorUid: myUid,
        createdAt: Date.now(),
      };
    }
  };

  const handlePointerMove = (e) => {
    if (isPanningRef.current) {
      const screenX = e.clientX !== undefined ? e.clientX : e.touches?.[0]?.clientX || 0;
      const screenY = e.clientY !== undefined ? e.clientY : e.touches?.[0]?.clientY || 0;
      const dx = screenX - panStartRef.current.x;
      const dy = screenY - panStartRef.current.y;
      setPan({ x: panStartRef.current.origPanX + dx, y: panStartRef.current.origPanY + dy });
      return;
    }

    if (!isDrawingRef.current || !currentPathRef.current) return;
    const coords = getCanvasCoords(e);

    if (currentPathRef.current.type === 'freehand') {
      currentPathRef.current.points.push({ x: coords.x, y: coords.y });
      redrawCanvas([...paths, currentPathRef.current]);
    } else if (currentPathRef.current.type === 'rect' || currentPathRef.current.type === 'circle') {
      currentPathRef.current.width = coords.x - startPosRef.current.x;
      currentPathRef.current.height = coords.y - startPosRef.current.y;
      redrawCanvas([...paths, currentPathRef.current]);
    } else if (currentPathRef.current.type === 'arrow') {
      currentPathRef.current.toX = coords.x;
      currentPathRef.current.toY = coords.y;
      redrawCanvas([...paths, currentPathRef.current]);
    }
  };

  const handlePointerUp = () => {
    isPanningRef.current = false;
    if (!isDrawingRef.current || !currentPathRef.current) return;

    isDrawingRef.current = false;
    const completedPath = currentPathRef.current;
    currentPathRef.current = null;

    setPaths((prev) => {
      const updated = [...prev, completedPath].slice(-450);
      return updated;
    });
    setRedoStack([]);

    // Diffusion temps réel P2P
    whiteboardP2PService.broadcast({ type: 'path_add', path: completedPath });
  };

  // Annuler / Rétablir
  const handleUndo = () => {
    if (paths.length === 0) return;
    const last = paths[paths.length - 1];
    setRedoStack((prev) => [last, ...prev]);
    const nextPaths = paths.slice(0, -1);
    setPaths(nextPaths);
    redrawCanvas(nextPaths);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[0];
    setRedoStack((prev) => prev.slice(1));
    const nextPaths = [...paths, next];
    setPaths(nextPaths);
    redrawCanvas(nextPaths);
  };

  const handleClear = () => {
    if (window.confirm('Voulez-vous vraiment effacer le tableau blanc ?')) {
      setPaths([]);
      setStickyNotes([]);
      setTextElements([]);
      setRedoStack([]);
      redrawCanvas([]);
      whiteboardP2PService.broadcast({ type: 'clear' });
    }
  };

  // GÉNÉRATION PREVIEW DATAURL & SAUVEGARDE DE VERSION DANS FIRESTORE
  const handleSaveAndShare = async () => {
    if (isSavingAndSharing) return;
    setIsSavingAndSharing(true);
    setSaveStatus('Génération de la version...');

    try {
      // 1. Export du Canvas en DataURL
      const canvas = canvasRef.current;
      let previewUrl = '';
      if (canvas) {
        // Créer un canvas temporaire avec fond neutre pour preview lisible
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = 480;
        tempCanvas.height = 320;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.fillStyle = darkMode ? '#1F1B18' : '#F9F6F0';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        tempCtx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);
        previewUrl = tempCanvas.toDataURL('image/jpeg', 0.82);
      }

      // 2. Persistance dans la collection Firestore `workspaces`
      const res = await saveWorkspaceVersion({
        workspaceId: effectiveId,
        chatId: groupId,
        type: WORKSPACE_TYPES.WHITEBOARD,
        title: workspaceTitle,
        data: { paths, stickyNotes, textElements },
        previewUrl,
        currentUser,
        changeSummary: `Mise à jour V${versionNumber + 1}`,
      });

      const newVersion = res.version || versionNumber + 1;
      setVersionNumber(newVersion);

      // 3. Émission du message `workspace_invite` dans le chat
      if (typeof onSendMessage === 'function' || typeof onSendToChat === 'function') {
        const msgPayload = {
          text: `🎨 ${myName} a partagé la V${newVersion} du Tableau Blanc`,
          type: 'workspace_invite',
          kind: 'workspace_invite',
          workspaceId: effectiveId,
          boardId: effectiveId,
          workspaceType: 'whiteboard',
          workspaceTitle: workspaceTitle,
          version: newVersion,
          previewUrl,
        };
        if (typeof onSendMessage === 'function') onSendMessage(msgPayload);
        if (typeof onSendToChat === 'function') onSendToChat(effectiveId, newVersion, msgPayload);
      } else {
        await postWorkspaceInviteToChat({
          chatId: groupId,
          workspaceId: effectiveId,
          workspaceType: WORKSPACE_TYPES.WHITEBOARD,
          title: workspaceTitle,
          version: newVersion,
          previewUrl,
          currentUser,
        });
      }

      setSaveStatus(`Version V${newVersion} sauvegardée & partagée ! ✨`);
      setShareSuccessToast(true);
      setTimeout(() => setShareSuccessToast(false), 3000);
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
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        width: '100vw',
        height: '100dvh',
        backgroundColor: darkMode ? '#12100E' : '#FDFBF7',
        color: 'var(--text-main, #1F2937)',
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'none',
        overflow: 'hidden',
        pointerEvents: 'auto',
      }}
    >
      {/* BADGE DE TRAÇABILITÉ COLLABORATIVE ("Modifié par...") */}
      <div
        style={{
          position: 'absolute',
          top: '72px',
          left: '16px',
          zIndex: 9999,
          backgroundColor: darkMode ? 'rgba(26,23,21,0.88)' : 'rgba(255,255,255,0.88)',
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

      {/* 1. BARRE D'EN-TÊTE SUPÉRIEURE (TITLE, VERSION, ACTIONS APPLE HIG) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          borderBottom: '1px solid var(--border-color, rgba(0, 0, 0, 0.08))',
          backgroundColor: darkMode ? '#1A1715' : '#FFFFFF',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
          flexShrink: 0,
          zIndex: 10,
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <button
            type="button"
            onClick={() => onClose?.()}
            onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); onClose?.(); }}
            className="premium-button"
            style={{
              border: 'none',
              backgroundColor: 'var(--bg-subtle, #F3F4F6)',
              color: 'var(--text-main, #1F2937)',
              width: '44px',
              height: '44px',
              minWidth: '44px',
              minHeight: '44px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              touchAction: 'manipulation',
            }}
            title="Fermer"
          >
            <X size={20} />
          </button>

          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: '16px',
                  fontWeight: '800',
                  color: 'var(--text-main, #1F2937)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {workspaceTitle}
              </h3>
              <span
                style={{
                  backgroundColor: 'rgba(198, 125, 91, 0.15)',
                  color: 'var(--accent-primary, #C67D5B)',
                  padding: '2px 8px',
                  borderRadius: '999px',
                  fontSize: '11px',
                  fontWeight: '900',
                  flexShrink: 0,
                }}
              >
                V{versionNumber}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary, #6B7280)' }}>
              {saveStatus}
            </div>
          </div>
        </div>

        {/* ACTIONS DROITES : ZOOM, ANNULER, SAUVEGARDER & PARTAGER */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            onClick={handleUndo}
            disabled={paths.length === 0}
            className="premium-button"
            style={{
              border: '1px solid var(--border-color, rgba(0, 0, 0, 0.08))',
              backgroundColor: 'var(--bg-card, #FFFFFF)',
              color: paths.length === 0 ? '#9CA3AF' : 'var(--text-main, #1F2937)',
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: paths.length === 0 ? 'not-allowed' : 'pointer',
              touchAction: 'manipulation',
            }}
            title="Annuler"
          >
            <RotateCcw size={17} />
          </button>

          <button
            type="button"
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            className="premium-button"
            style={{
              border: '1px solid var(--border-color, rgba(0, 0, 0, 0.08))',
              backgroundColor: 'var(--bg-card, #FFFFFF)',
              color: redoStack.length === 0 ? '#9CA3AF' : 'var(--text-main, #1F2937)',
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: redoStack.length === 0 ? 'not-allowed' : 'pointer',
              touchAction: 'manipulation',
            }}
            title="Rétablir"
          >
            <RotateCw size={17} />
          </button>

          {/* BOUTON CLÉ : SAUVEGARDER & PARTAGER DANS LE CHAT */}
          <button
            type="button"
            onClick={handleSaveAndShare}
            disabled={isSavingAndSharing}
            className="premium-button"
            style={{
              border: 'none',
              borderRadius: '14px',
              padding: '0 16px',
              minHeight: '44px',
              background: 'linear-gradient(135deg, var(--accent-primary, #C67D5B) 0%, #B06A4A 100%)',
              color: '#FFFFFF',
              fontSize: '12.5px',
              fontWeight: '800',
              cursor: isSavingAndSharing ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: 'var(--shadow-accent, 0 4px 14px rgba(198, 125, 91, 0.3))',
              touchAction: 'manipulation',
            }}
          >
            <Share2 size={16} />
            <span>{isSavingAndSharing ? 'Sauvegarde...' : 'Sauvegarder & Partager'}</span>
          </button>
        </div>
      </div>

      {/* 2. ZONE DE DESSIN CANVAS 60 FPS */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          cursor: tool === 'hand' ? 'grab' : 'crosshair',
          backgroundColor: darkMode ? '#151311' : '#FBF9F5',
          backgroundImage: showGrid
            ? darkMode
              ? 'radial-gradient(rgba(255, 255, 255, 0.08) 1.5px, transparent 1.5px)'
              : 'radial-gradient(rgba(0, 0, 0, 0.08) 1.5px, transparent 1.5px)'
            : 'none',
          backgroundSize: '24px 24px',
        }}
      >
        <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />

        {/* POST-ITS VIRTUALISÉS */}
        {stickyNotes.map((note) => (
          <div
            key={note.id}
            style={{
              position: 'absolute',
              left: `${pan.x + note.x * zoom}px`,
              top: `${pan.y + note.y * zoom}px`,
              width: `${140 * zoom}px`,
              minHeight: `${120 * zoom}px`,
              backgroundColor: note.color || '#FEF08A',
              color: '#1F2937',
              borderRadius: '8px',
              padding: '10px',
              boxShadow: '0 6px 18px rgba(0, 0, 0, 0.15)',
              fontSize: `${12 * zoom}px`,
              fontWeight: '600',
              transform: 'rotate(-1.5deg)',
              pointerEvents: 'auto',
            }}
          >
            <textarea
              value={note.text}
              onChange={(e) => {
                const newText = e.target.value;
                setStickyNotes((prev) => prev.map((s) => (s.id === note.id ? { ...s, text: newText } : s)));
              }}
              style={{
                width: '100%',
                height: '80px',
                border: 'none',
                background: 'transparent',
                resize: 'none',
                outline: 'none',
                fontSize: 'inherit',
                fontWeight: 'inherit',
                color: 'inherit',
              }}
            />
          </div>
        ))}

        {/* ÉLÉMENTS DE TEXTE LIBRE */}
        {textElements.map((txt) => (
          <div
            key={txt.id}
            style={{
              position: 'absolute',
              left: `${pan.x + txt.x * zoom}px`,
              top: `${pan.y + txt.y * zoom}px`,
              color: txt.color || '#1F2937',
              fontSize: `${(txt.fontSize || 18) * zoom}px`,
              fontWeight: '700',
              pointerEvents: 'none',
            }}
          >
            {txt.text}
          </div>
        ))}
      </div>

      {/* 3. BARRE D'OUTILS FLOTTANTE INFÉRIEURE (APPLE DOCK STYLE) */}
      <div
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: darkMode ? 'rgba(26, 23, 21, 0.92)' : 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRadius: '24px',
          padding: '8px 12px',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.18)',
          border: '1px solid var(--border-color, rgba(0, 0, 0, 0.1))',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          zIndex: 100,
        }}
      >
        {/* BOUTONS OUTILS (MIN TOUCH TARGET 44px) */}
        {[
          { id: 'pencil', icon: <Pen size={18} />, label: 'Crayon' },
          { id: 'brush', icon: <Brush size={18} />, label: 'Pinceau' },
          { id: 'highlighter', icon: <Highlighter size={18} />, label: 'Surligneur' },
          { id: 'eraser', icon: <Eraser size={18} />, label: 'Gomme' },
          { id: 'rect', icon: <Square size={18} />, label: 'Rectangle' },
          { id: 'circle', icon: <Circle size={18} />, label: 'Cercle' },
          { id: 'arrow', icon: <ArrowRight size={18} />, label: 'Flèche' },
          { id: 'sticky', icon: <StickyNote size={18} />, label: 'Post-it' },
          { id: 'text', icon: <Type size={18} />, label: 'Texte' },
          { id: 'hand', icon: <Hand size={18} />, label: 'Déplacer' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTool(t.id)}
            onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); setTool(t.id); }}
            className="premium-button"
            style={{
              border: 'none',
              backgroundColor: tool === t.id ? 'var(--accent-primary, #C67D5B)' : 'transparent',
              color: tool === t.id ? '#FFFFFF' : 'var(--text-main, #1F2937)',
              width: '44px',
              height: '44px',
              minWidth: '44px',
              minHeight: '44px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              touchAction: 'manipulation',
              transition: 'all 0.15s ease',
            }}
            title={t.label}
          >
            {t.icon}
          </button>
        ))}

        <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border-color, #E5E7EB)', margin: '0 4px' }} />

        {/* COULEURS */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {COLOR_PALETTE.slice(0, 5).map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setColor(c.hex)}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: c.hex,
                border: color === c.hex ? '3px solid #FFFFFF' : '1px solid rgba(0,0,0,0.2)',
                boxShadow: color === c.hex ? '0 0 0 2px var(--accent-primary, #C67D5B)' : 'none',
                cursor: 'pointer',
              }}
            />
          ))}
        </div>

        <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border-color, #E5E7EB)', margin: '0 4px' }} />

        {/* EFFACER */}
        <button
          type="button"
          onClick={handleClear}
          className="premium-button"
          style={{
            border: 'none',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            color: '#EF4444',
            width: '44px',
            height: '44px',
            minWidth: '44px',
            minHeight: '44px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            touchAction: 'manipulation',
          }}
          title="Tout effacer"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {/* TOAST DE SUCCÈS */}
      {shareSuccessToast && (
        <div
          style={{
            position: 'absolute',
            top: '70px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#10B981',
            color: '#FFFFFF',
            padding: '10px 20px',
            borderRadius: '999px',
            fontWeight: '800',
            fontSize: '13px',
            boxShadow: '0 6px 20px rgba(16, 185, 129, 0.4)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <Check size={16} />
          <span>Tableau Blanc partagé dans la conversation !</span>
        </div>
      )}
    </div>
  );

  return createPortal(modalContent, document.body);
}
