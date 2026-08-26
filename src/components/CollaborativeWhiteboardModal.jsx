import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Pen, Highlighter, Eraser, Square, Circle, ArrowRight,
  RotateCcw, RotateCw, Trash2, Download, Users, StickyNote,
  Palette, Maximize2, Minimize2, Send, Check, GripVertical
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
  { size: 22, label: 'Extra', dotSize: 22 },
];

const STICKY_COLORS = [
  { hex: '#FEF08A', name: 'Jaune' },
  { hex: '#FECDD3', name: 'Rose' },
  { hex: '#A7F3D0', name: 'Menthe' },
  { hex: '#BAE6FD', name: 'Ciel' },
  { hex: '#E9D5FF', name: 'Lavande' },
];

export default function CollaborativeWhiteboardModal({
  isOpen,
  onClose,
  groupId = 'demo_group_whiteboard',
  projectTitle = 'Tableau Blanc Collaboratif',
  currentUser = null,
  darkMode = false,
  onSendToChat = null,
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const [tool, setTool] = useState('pen'); // 'pen' | 'highlighter' | 'eraser' | 'rect' | 'circle' | 'arrow' | 'sticky'
  const [color, setColor] = useState('#C67D5B');
  const [lineWidth, setLineWidth] = useState(4);
  const [stickyNotes, setStickyNotes] = useState([]);
  const [paths, setPaths] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [activeUsers] = useState(['Mateo P.', 'Emma R.', 'Thomas V.']);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [saveStatus, setSaveStatus] = useState('Synchronisé en temps réel');
  const [isSendingToChat, setIsSendingToChat] = useState(false);
  const [sendSuccessToast, setSendSuccessToast] = useState(false);

  // Gestion du drag-and-drop des Post-its
  const draggingStickyRef = useRef(null);

  const isDrawingRef = useRef(false);
  const currentPathRef = useRef(null);
  const startPosRef = useRef({ x: 0, y: 0 });

  // Redessine l'ensemble des vecteurs sur le canvas
  const redrawCanvas = useCallback((drawPaths = paths) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const dpr = window.devicePixelRatio || 1;

    // Reset du canvas et alignement HiDPI
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);

    // Fond selon le thème
    ctx.fillStyle = darkMode ? '#181513' : '#FAF8F5';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Dessin de la grille discrète
    ctx.strokeStyle = darkMode ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)';
    ctx.lineWidth = 1;
    const gridSize = 32;
    for (let x = 0; x < rect.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, rect.height);
      ctx.stroke();
    }
    for (let y = 0; y < rect.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(rect.width, y);
      ctx.stroke();
    }

    // Dessin de tous les tracés mémorisés
    drawPaths.forEach((path) => {
      ctx.beginPath();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = path.lineWidth;
      ctx.strokeStyle = path.tool === 'eraser'
        ? (darkMode ? '#181513' : '#FAF8F5')
        : path.tool === 'highlighter'
          ? `${path.color}55`
          : path.color;

      if (path.type === 'freehand' && path.points && path.points.length > 0) {
        ctx.moveTo(path.points[0].x, path.points[0].y);
        for (let i = 1; i < path.points.length; i++) {
          ctx.lineTo(path.points[i].x, path.points[i].y);
        }
        ctx.stroke();
      } else if (path.type === 'rect') {
        ctx.strokeRect(path.start.x, path.start.y, path.width, path.height);
      } else if (path.type === 'circle') {
        ctx.beginPath();
        const rx = Math.abs(path.width / 2);
        const ry = Math.abs(path.height / 2);
        const cx = path.start.x + path.width / 2;
        const cy = path.start.y + path.height / 2;
        ctx.ellipse(cx, cy, Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (path.type === 'arrow') {
        const fromX = path.start.x;
        const fromY = path.start.y;
        const toX = path.end.x;
        const toY = path.end.y;
        const headlen = 14;
        const dx = toX - fromX;
        const dy = toY - fromY;
        const angle = Math.atan2(dy, dx);

        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(toX, toY);
        ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
      }
    });
  }, [darkMode, paths]);

  // Initialisation et redimensionnement HiDPI du canvas
  useEffect(() => {
    if (!isOpen) return;

    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      redrawCanvas(paths);
    };

    const timer = setTimeout(handleResize, 100);
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen, redrawCanvas, paths]);

  // Écoute temps réel Firestore du tableau blanc pour le groupe
  useEffect(() => {
    if (!isOpen || !groupId) return;

    try {
      const docRef = doc(db, 'project_whiteboards', String(groupId));
      const unsubscribe = onSnapshot(docRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.paths) {
            setPaths(data.paths);
            redrawCanvas(data.paths);
          }
          if (data.stickyNotes) {
            setStickyNotes(data.stickyNotes);
          }
          setSaveStatus('Synchronisé ✅');
        }
      }, (err) => {
        console.warn('[Firestore Whiteboard] snapshot error:', err);
      });

      return () => unsubscribe();
    } catch (_) {}
  }, [isOpen, groupId, redrawCanvas]);

  // Sauvegarde des vecteurs dans Firestore
  const syncToFirestore = useCallback(async (newPaths = paths, newStickyNotes = stickyNotes) => {
    if (!groupId) return;
    try {
      setSaveStatus('Synchronisation...');
      const docRef = doc(db, 'project_whiteboards', String(groupId));
      await setDoc(docRef, {
        paths: newPaths.slice(-150),
        stickyNotes: newStickyNotes,
        updatedAt: serverTimestamp(),
        lastEditor: currentUser?.name || 'Collaborateur',
      }, { merge: true });
      setSaveStatus('Synchronisé ✅');
    } catch (e) {
      console.warn('[Firestore Whiteboard] write failed:', e);
      setSaveStatus('Sauvegarde locale');
    }
  }, [groupId, currentUser?.name, paths, stickyNotes]);

  // Coordonnées précises relatives au canvas
  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  // 1. POINTER DOWN : Démarre le tracé et dessine le premier point immédiatement
  const handlePointerDown = (e) => {
    if (tool === 'sticky') {
      const coords = getCanvasCoords(e);
      const newSticky = {
        id: `sticky-${Date.now()}`,
        x: Math.max(10, Math.min(coords.x - 80, (canvasRef.current?.clientWidth || 300) - 180)),
        y: Math.max(10, Math.min(coords.y - 40, (canvasRef.current?.clientHeight || 300) - 140)),
        text: '',
        color: '#FEF08A',
        author: currentUser?.name || 'Moi',
      };
      const updated = [...stickyNotes, newSticky];
      setStickyNotes(updated);
      syncToFirestore(paths, updated);
      setTool('pen');
      return;
    }

    isDrawingRef.current = true;
    const coords = getCanvasCoords(e);
    startPosRef.current = coords;

    const actualWidth = tool === 'highlighter' ? lineWidth * 3 : tool === 'eraser' ? lineWidth * 3.5 : lineWidth;

    if (tool === 'pen' || tool === 'highlighter' || tool === 'eraser') {
      currentPathRef.current = {
        id: `p-${Date.now()}`,
        type: 'freehand',
        tool,
        color,
        lineWidth: actualWidth,
        points: [coords],
      };

      // RENDU TEMPS RÉEL IMMÉDIAT : Dessin du point initial sous le doigt / pointeur
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.beginPath();
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.lineWidth = actualWidth;
          ctx.fillStyle = tool === 'eraser'
            ? (darkMode ? '#181513' : '#FAF8F5')
            : tool === 'highlighter'
              ? `${color}55`
              : color;
          ctx.arc(coords.x, coords.y, actualWidth / 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  // 2. POINTER MOVE : RENDU CONTINU EN TEMPS RÉEL (FLUIDITÉ 60/120 FPS)
  const handlePointerMove = (e) => {
    if (!isDrawingRef.current) return;
    const coords = getCanvasCoords(e);

    if (tool === 'pen' || tool === 'highlighter' || tool === 'eraser') {
      if (!currentPathRef.current) return;
      const pts = currentPathRef.current.points;
      const prev = pts[pts.length - 1];
      pts.push(coords);

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.beginPath();
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.lineWidth = currentPathRef.current.lineWidth;
          ctx.strokeStyle = tool === 'eraser'
            ? (darkMode ? '#181513' : '#FAF8F5')
            : tool === 'highlighter'
              ? `${color}55`
              : color;

          if (prev) {
            ctx.moveTo(prev.x, prev.y);
            ctx.lineTo(coords.x, coords.y);
            ctx.stroke();
          }
        }
      }
    } else {
      // Prévisualisation instantanée des formes géométriques
      const start = startPosRef.current;
      const w = coords.x - start.x;
      const h = coords.y - start.y;

      let tempShape = null;
      if (tool === 'rect') {
        tempShape = { id: 'temp', type: 'rect', tool, color, lineWidth, start, width: w, height: h };
      } else if (tool === 'circle') {
        tempShape = { id: 'temp', type: 'circle', tool, color, lineWidth, start, width: w, height: h };
      } else if (tool === 'arrow') {
        tempShape = { id: 'temp', type: 'arrow', tool, color, lineWidth, start, end: coords };
      }

      if (tempShape) {
        redrawCanvas([...paths, tempShape]);
      }
    }
  };

  // 3. POINTER UP : Validation du tracé et synchronisation
  const handlePointerUp = (e) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    e.currentTarget.releasePointerCapture?.(e.pointerId);

    const coords = getCanvasCoords(e);
    let finalPath = null;

    if (tool === 'pen' || tool === 'highlighter' || tool === 'eraser') {
      if (currentPathRef.current && currentPathRef.current.points.length > 0) {
        finalPath = currentPathRef.current;
      }
    } else {
      const start = startPosRef.current;
      const w = coords.x - start.x;
      const h = coords.y - start.y;

      if (tool === 'rect') {
        finalPath = { id: `rect-${Date.now()}`, type: 'rect', tool, color, lineWidth, start, width: w, height: h };
      } else if (tool === 'circle') {
        finalPath = { id: `circle-${Date.now()}`, type: 'circle', tool, color, lineWidth, start, width: w, height: h };
      } else if (tool === 'arrow') {
        finalPath = { id: `arrow-${Date.now()}`, type: 'arrow', tool, color, lineWidth, start, end: coords };
      }
    }

    if (finalPath) {
      const updated = [...paths, finalPath];
      setPaths(updated);
      setRedoStack([]); // Toute nouvelle action invalide la pile Redo
      redrawCanvas(updated);
      syncToFirestore(updated, stickyNotes);
    }
    currentPathRef.current = null;
  };

  // --- ACTIONS D'HISTORIQUE : UNDO & REDO ---
  const handleUndo = () => {
    if (paths.length === 0) return;
    const lastPath = paths[paths.length - 1];
    const updated = paths.slice(0, -1);
    setPaths(updated);
    setRedoStack(prev => [...prev, lastPath]);
    redrawCanvas(updated);
    syncToFirestore(updated, stickyNotes);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const restoredPath = redoStack[redoStack.length - 1];
    const newRedo = redoStack.slice(0, -1);
    const updated = [...paths, restoredPath];
    setRedoStack(newRedo);
    setPaths(updated);
    redrawCanvas(updated);
    syncToFirestore(updated, stickyNotes);
  };

  // --- GESTION TOTALE DU RESET (CORBEILLE : CANVAS + POST-ITS) ---
  const handleClearAll = () => {
    if (window.confirm('Voulez-vous effacer l’intégralité du tableau (dessins ET post-its) pour tout le groupe ?')) {
      setPaths([]);
      setStickyNotes([]);
      setRedoStack([]);
      redrawCanvas([]);
      syncToFirestore([], []);
    }
  };

  // --- GESTION DU DRAG-AND-DROP DES POST-ITS ---
  const handleStickyPointerDown = (e, noteId) => {
    e.stopPropagation();
    const note = stickyNotes.find(n => n.id === noteId);
    if (!note) return;

    draggingStickyRef.current = {
      id: noteId,
      startX: e.clientX,
      startY: e.clientY,
      initialNoteX: note.x,
      initialNoteY: note.y,
    };

    const handleWindowPointerMove = (moveEvent) => {
      if (!draggingStickyRef.current) return;
      const dx = moveEvent.clientX - draggingStickyRef.current.startX;
      const dy = moveEvent.clientY - draggingStickyRef.current.startY;
      const newX = Math.max(0, draggingStickyRef.current.initialNoteX + dx);
      const newY = Math.max(0, draggingStickyRef.current.initialNoteY + dy);

      setStickyNotes(prev => prev.map(n => n.id === noteId ? { ...n, x: newX, y: newY } : n));
    };

    const handleWindowPointerUp = () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
      if (draggingStickyRef.current) {
        setStickyNotes(currentNotes => {
          syncToFirestore(paths, currentNotes);
          return currentNotes;
        });
      }
      draggingStickyRef.current = null;
    };

    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerUp);
  };

  // Suppression individuelle d'un Post-it
  const handleDeleteSticky = (stickyId, e) => {
    if (e) e.stopPropagation();
    const updated = stickyNotes.filter(s => s.id !== stickyId);
    setStickyNotes(updated);
    syncToFirestore(paths, updated);
  };

  // Modification du texte d'un Post-it
  const handleUpdateStickyText = (stickyId, newText) => {
    const updated = stickyNotes.map(s => s.id === stickyId ? { ...s, text: newText } : s);
    setStickyNotes(updated);
    syncToFirestore(paths, updated);
  };

  // Modification de la couleur d'un Post-it
  const handleUpdateStickyColor = (stickyId, newColor, e) => {
    if (e) e.stopPropagation();
    const updated = stickyNotes.map(s => s.id === stickyId ? { ...s, color: newColor } : s);
    setStickyNotes(updated);
    syncToFirestore(paths, updated);
  };

  // --- GÉNÉRATION D'UNE IMAGE COMPOSITE HAUTE QUALITÉ (CANVAS + POST-ITS FUSIONNÉS) ---
  const generateCompositeSnapshotDataUrl = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const width = rect.width || 800;
    const height = rect.height || 600;

    // Création d'un canvas hors-écran pour le rendu composite
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = width * 2; // Rendu 2x Retina
    exportCanvas.height = height * 2;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return canvas.toDataURL('image/png');

    ctx.scale(2, 2);

    // 1. Fond
    ctx.fillStyle = darkMode ? '#181513' : '#FAF8F5';
    ctx.fillRect(0, 0, width, height);

    // 2. Grille
    ctx.strokeStyle = darkMode ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)';
    ctx.lineWidth = 1;
    const gridSize = 32;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // 3. Dessin des tracés
    paths.forEach((path) => {
      ctx.beginPath();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = path.lineWidth;
      ctx.strokeStyle = path.tool === 'eraser'
        ? (darkMode ? '#181513' : '#FAF8F5')
        : path.tool === 'highlighter'
          ? `${path.color}55`
          : path.color;

      if (path.type === 'freehand' && path.points && path.points.length > 0) {
        ctx.moveTo(path.points[0].x, path.points[0].y);
        for (let i = 1; i < path.points.length; i++) {
          ctx.lineTo(path.points[i].x, path.points[i].y);
        }
        ctx.stroke();
      } else if (path.type === 'rect') {
        ctx.strokeRect(path.start.x, path.start.y, path.width, path.height);
      } else if (path.type === 'circle') {
        ctx.beginPath();
        const rx = Math.abs(path.width / 2);
        const ry = Math.abs(path.height / 2);
        const cx = path.start.x + path.width / 2;
        const cy = path.start.y + path.height / 2;
        ctx.ellipse(cx, cy, Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (path.type === 'arrow') {
        const fromX = path.start.x;
        const fromY = path.start.y;
        const toX = path.end.x;
        const toY = path.end.y;
        const headlen = 14;
        const dx = toX - fromX;
        const dy = toY - fromY;
        const angle = Math.atan2(dy, dx);

        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(toX, toY);
        ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
      }
    });

    // 4. Dessin des Post-its intégrés sur l'image exportée
    stickyNotes.forEach((note) => {
      const noteW = 190;
      const noteH = 110;
      const nx = note.x;
      const ny = note.y;

      // Ombre du post-it
      ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 4;

      // Corps du post-it (rectangle arrondi)
      ctx.fillStyle = note.color || '#FEF08A';
      ctx.beginPath();
      ctx.roundRect(nx, ny, noteW, noteH, 12);
      ctx.fill();

      // Reset ombre
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;

      // En-tête auteur
      ctx.fillStyle = '#64748B';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText(`✍️ ${note.author || 'Moi'}`, nx + 10, ny + 18);

      // Texte du post-it avec retour à la ligne
      ctx.fillStyle = '#1E293B';
      ctx.font = '600 12px sans-serif';
      const words = (note.text || 'Idée / Tâche...').split(' ');
      let line = '';
      let lineY = ny + 38;
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > noteW - 20 && n > 0) {
          ctx.fillText(line, nx + 10, lineY);
          line = words[n] + ' ';
          lineY += 16;
          if (lineY > ny + noteH - 8) break;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, nx + 10, lineY);
    });

    return exportCanvas.toDataURL('image/png');
  };

  // --- EXPORTER EN FICHIER PNG SUR LE DISQUE ---
  const handleExportPNG = () => {
    const url = generateCompositeSnapshotDataUrl();
    if (!url) return;
    const link = document.createElement('a');
    link.download = `whiteboard-${projectTitle.replace(/[^a-z0-9]/gi, '_')}.png`;
    link.href = url;
    link.click();
  };

  // --- ENVOYER DIRECTEMENT DANS LE CHAT DU GROUPE / INTERLOCUTEUR ---
  const handleSendSnapshotToChat = async () => {
    const dataUrl = generateCompositeSnapshotDataUrl();
    if (!dataUrl) return;

    setIsSendingToChat(true);

    try {
      // 1. Appel du hook / callback parent si disponible
      if (onSendToChat) {
        onSendToChat(dataUrl);
      }

      // 2. Persistance directe dans la collection messages du chat Firestore
      if (groupId) {
        const timeLabel = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const caption = `🎨 Tableau blanc partagé (${timeLabel})`;

        await addDoc(collection(db, 'chats', String(groupId), 'messages'), {
          senderName: currentUser?.name || 'Moi',
          text: caption,
          imageUrl: dataUrl,
          type: 'image',
          kind: 'image',
          read: false,
          status: 'sent',
          createdAt: serverTimestamp(),
        });

        await setDoc(doc(db, 'chats', String(groupId)), {
          lastMessage: caption,
          lastSenderName: currentUser?.name || 'Moi',
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }

      setSendSuccessToast(true);
      setTimeout(() => {
        setSendSuccessToast(false);
        onClose();
      }, 1200);
    } catch (err) {
      console.warn('[Whiteboard] send snapshot to chat error:', err);
      // Fallback : au moins télécharger l'image
      handleExportPNG();
    } finally {
      setIsSendingToChat(false);
    }
  };

  if (!isOpen) return null;

  const modalElement = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000000,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isFullscreen ? '0' : '10px 10px max(70px, env(safe-area-inset-bottom, 20px)) 10px',
        animation: 'fadeIn 0.2s ease both',
        boxSizing: 'border-box',
      }}
      onClick={onClose}
    >
      <div
        ref={containerRef}
        style={{
          width: isFullscreen ? '100vw' : '96vw',
          maxWidth: isFullscreen ? '100vw' : '1240px',
          height: isFullscreen ? '100dvh' : '90dvh',
          backgroundColor: darkMode ? '#181513' : '#FAF8F5',
          borderRadius: isFullscreen ? '0' : '24px',
          border: isFullscreen ? 'none' : '1px solid var(--border-color)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
          boxSizing: 'border-box',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* TOAST DE CONFIRMATION D'ENVOI AU CHAT */}
        {sendSuccessToast && (
          <div
            style={{
              position: 'absolute',
              top: '70px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 100,
              backgroundColor: '#10B981',
              color: '#FFFFFF',
              padding: '10px 20px',
              borderRadius: '999px',
              fontWeight: '800',
              fontSize: '13px',
              boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              animation: 'fadeSlideDown 0.25s ease both',
            }}
          >
            <Check size={16} />
            <span>Tableau blanc injecté dans la conversation ! 💬🚀</span>
          </div>
        )}

        {/* 1. BARRE SUPÉRIEURE DU WHITEBOARD */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 16px',
            borderBottom: '1px solid var(--border-color)',
            backgroundColor: darkMode ? 'rgba(24, 21, 19, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(12px)',
            flexShrink: 0,
            gap: '10px',
            flexWrap: 'nowrap',
          }}
        >
          {/* TITRE DU PROJET & STATUT */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '10px', backgroundColor: 'var(--accent-primary)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-accent)', flexShrink: 0 }}>
              <Palette size={18} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: '800', fontSize: '14px', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {projectTitle}
              </div>
              <div style={{ fontSize: '10.5px', color: 'var(--accent-success)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--accent-success)', boxShadow: '0 0 6px var(--accent-success)' }} />
                <span>{saveStatus}</span>
              </div>
            </div>
          </div>

          {/* ACTIONS & ENVOI AU CHAT */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', marginRight: '4px' }}>
              <Users size={14} />
              <span className="hide-on-mobile">{activeUsers.length} en direct</span>
            </div>

            {/* BOUTON MAJEUR : ENVOYER DANS LE CHAT */}
            <button
              type="button"
              onClick={handleSendSnapshotToChat}
              disabled={isSendingToChat}
              className="premium-button"
              style={{
                border: 'none',
                background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)',
                color: '#FFFFFF',
                padding: '7px 14px',
                borderRadius: '999px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                fontWeight: '800',
                cursor: isSendingToChat ? 'wait' : 'pointer',
                boxShadow: 'var(--shadow-accent)',
                transition: 'all 0.15s ease',
              }}
              title="Capturer et envoyer le tableau directement dans la discussion"
            >
              <Send size={14} />
              <span>{isSendingToChat ? 'Envoi...' : 'Envoyer au chat'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportPNG}
              className="premium-button"
              style={{
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-subtle)',
                color: 'var(--text-main)',
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              title="Télécharger en PNG"
            >
              <Download size={15} />
            </button>

            <button
              type="button"
              onClick={() => setIsFullscreen(f => !f)}
              className="premium-button"
              style={{
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-subtle)',
                color: 'var(--text-main)',
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              title={isFullscreen ? 'Quitter plein écran' : 'Plein écran'}
            >
              {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                border: 'none',
                backgroundColor: 'var(--bg-subtle)',
                color: 'var(--text-secondary)',
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              title="Fermer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 2. ZONE DE DESSIN CANVAS CENTRALE */}
        <div
          style={{
            flex: 1,
            position: 'relative',
            overflow: 'hidden',
            cursor: tool === 'eraser' ? 'crosshair' : tool === 'sticky' ? 'copy' : 'crosshair',
          }}
        >
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{
              width: '100%',
              height: '100%',
              display: 'block',
              touchAction: 'none',
            }}
          />

          {/* POST-ITS FLOTTANTS DÉPLAÇABLES & ÉDITABLES */}
          {stickyNotes.map((note) => (
            <div
              key={note.id}
              style={{
                position: 'absolute',
                left: `${note.x}px`,
                top: `${note.y}px`,
                backgroundColor: note.color || '#FEF08A',
                color: '#1E293B',
                padding: '8px 10px',
                borderRadius: '14px',
                boxShadow: '0 10px 28px rgba(0,0,0,0.22), 0 2px 6px rgba(0,0,0,0.08)',
                width: '185px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                zIndex: 15,
                animation: 'fadeSlideUp 0.15s ease',
                touchAction: 'none',
                userSelect: 'none',
              }}
            >
              {/* EN-TÊTE DU POST-IT AVEC POIGNÉE DE DRAG & BOUTON FERMER */}
              <div
                onPointerDown={(e) => handleStickyPointerDown(e, note.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'grab',
                  paddingBottom: '4px',
                  borderBottom: '1px dashed rgba(0, 0, 0, 0.15)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10.5px', fontWeight: '800', opacity: 0.8 }}>
                  <GripVertical size={13} style={{ opacity: 0.6 }} />
                  <span>{note.author}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {/* COULEURS DU POST-IT */}
                  {STICKY_COLORS.map(sc => (
                    <button
                      key={sc.hex}
                      type="button"
                      onClick={(e) => handleUpdateStickyColor(note.id, sc.hex, e)}
                      style={{
                        width: '11px',
                        height: '11px',
                        borderRadius: '50%',
                        backgroundColor: sc.hex,
                        border: note.color === sc.hex ? '1.5px solid #1E293B' : '1px solid rgba(0,0,0,0.2)',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                      title={sc.name}
                    />
                  ))}

                  {/* BOUTON X NATIVE SUPPRESSION */}
                  <button
                    type="button"
                    onClick={(e) => handleDeleteSticky(note.id, e)}
                    style={{
                      border: 'none',
                      background: 'rgba(239, 68, 68, 0.15)',
                      color: '#DC2626',
                      borderRadius: '50%',
                      width: '18px',
                      height: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      marginLeft: '2px',
                      padding: 0,
                    }}
                    title="Supprimer ce post-it"
                  >
                    <X size={11} strokeWidth={3} />
                  </button>
                </div>
              </div>

              {/* CONTENU TEXTE DU POST-IT */}
              <textarea
                value={note.text}
                onChange={(e) => handleUpdateStickyText(note.id, e.target.value)}
                onPointerDown={(e) => e.stopPropagation()}
                placeholder="Écrivez une idée..."
                rows={3}
                style={{
                  border: 'none',
                  background: 'transparent',
                  resize: 'none',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#1E293B',
                  outline: 'none',
                  fontFamily: 'inherit',
                  lineHeight: 1.4,
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          ))}
        </div>

        {/* 3. BARRE D'OUTILS FLOTTANTE INFÉRIEURE AVEC UI VISUELLE DE LA MINE */}
        <div
          style={{
            position: 'absolute',
            bottom: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: darkMode ? 'rgba(30, 26, 23, 0.96)' : 'rgba(255, 255, 255, 0.96)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius: '999px',
            padding: '6px 12px',
            border: '1px solid var(--border-color)',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.35)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            zIndex: 40,
            maxWidth: '96%',
            overflowX: 'auto',
          }}
        >
          {/* SÉLECTEUR D'OUTILS DE DESSIN */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            {[
              { id: 'pen', label: 'Crayon', icon: Pen },
              { id: 'highlighter', label: 'Surligneur', icon: Highlighter },
              { id: 'eraser', label: 'Gomme', icon: Eraser },
              { id: 'rect', label: 'Rectangle', icon: Square },
              { id: 'circle', label: 'Cercle', icon: Circle },
              { id: 'arrow', label: 'Flèche', icon: ArrowRight },
              { id: 'sticky', label: 'Post-it', icon: StickyNote },
            ].map((t) => {
              const Icon = t.icon;
              const isSelected = tool === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTool(t.id)}
                  className="premium-button"
                  style={{
                    border: 'none',
                    borderRadius: '50%',
                    width: '34px',
                    height: '34px',
                    backgroundColor: isSelected ? 'var(--accent-primary)' : 'transparent',
                    color: isSelected ? '#FFFFFF' : 'var(--text-main)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: isSelected ? 'var(--shadow-accent)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                  title={t.label}
                >
                  <Icon size={16} />
                </button>
              );
            })}
          </div>

          <div style={{ width: '1px', height: '22px', backgroundColor: 'var(--border-color)', flexShrink: 0 }} />

          {/* PALETTE DE COULEURS */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {COLOR_PALETTE.map((c) => {
              const isSelected = color === c.hex;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setColor(c.hex)}
                  style={{
                    border: isSelected ? '2px solid var(--accent-primary)' : '1px solid rgba(0,0,0,0.15)',
                    borderRadius: '50%',
                    width: '22px',
                    height: '22px',
                    backgroundColor: c.hex,
                    cursor: 'pointer',
                    transform: isSelected ? 'scale(1.18)' : 'scale(1)',
                    transition: 'transform 0.15s ease',
                    boxShadow: isSelected ? '0 0 8px rgba(0,0,0,0.3)' : 'none',
                    padding: 0,
                  }}
                  title={c.name}
                />
              );
            })}
          </div>

          <div style={{ width: '1px', height: '22px', backgroundColor: 'var(--border-color)', flexShrink: 0 }} />

          {/* REFONTE DE L'UI DE LA MINE (CERCLES VISUELS CROISSANTS) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }} title="Épaisseur de la mine">
            {STROKE_SIZES.map((s) => {
              const isSelected = lineWidth === s.size;
              return (
                <button
                  key={s.size}
                  type="button"
                  onClick={() => setLineWidth(s.size)}
                  className="premium-button"
                  style={{
                    border: isSelected ? '1.5px solid var(--accent-primary)' : '1px solid transparent',
                    backgroundColor: isSelected ? 'rgba(198, 125, 91, 0.15)' : 'transparent',
                    borderRadius: '50%',
                    width: '28px',
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    padding: 0,
                  }}
                  title={`${s.label} (${s.size}px)`}
                >
                  <span
                    style={{
                      width: `${s.dotSize}px`,
                      height: `${s.dotSize}px`,
                      borderRadius: '50%',
                      backgroundColor: tool === 'eraser' ? (darkMode ? '#FFF' : '#333') : color,
                      display: 'inline-block',
                      boxShadow: isSelected ? '0 0 4px rgba(0,0,0,0.3)' : 'none',
                    }}
                  />
                </button>
              );
            })}
          </div>

          <div style={{ width: '1px', height: '22px', backgroundColor: 'var(--border-color)', flexShrink: 0 }} />

          {/* ACTIONS AVANCÉES : UNDO, REDO & CLEAR TOTAL */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            <button
              type="button"
              onClick={handleUndo}
              disabled={paths.length === 0}
              style={{
                border: 'none',
                backgroundColor: 'transparent',
                color: 'var(--text-main)',
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: paths.length > 0 ? 'pointer' : 'not-allowed',
                opacity: paths.length > 0 ? 1 : 0.35,
              }}
              title="Annuler le dernier tracé (Undo)"
            >
              <RotateCcw size={15} />
            </button>

            <button
              type="button"
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              style={{
                border: 'none',
                backgroundColor: 'transparent',
                color: 'var(--text-main)',
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: redoStack.length > 0 ? 'pointer' : 'not-allowed',
                opacity: redoStack.length > 0 ? 1 : 0.35,
              }}
              title="Rétablir le tracé annulé (Redo)"
            >
              <RotateCw size={15} />
            </button>

            <button
              type="button"
              onClick={handleClearAll}
              style={{
                border: 'none',
                backgroundColor: 'transparent',
                color: '#EF4444',
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              title="Effacer tout le tableau (Dessins + Post-its)"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalElement, document.body) : modalElement;
}
