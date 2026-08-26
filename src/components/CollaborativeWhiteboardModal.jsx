import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Pen, Highlighter, Eraser, Square, Circle, ArrowRight,
  RotateCcw, RotateCw, Trash2, Download, StickyNote,
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
  const [activeUsers, setActiveUsers] = useState(['Mateo P.', 'Collaborateur']);
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

    // Traçage de tous les chemins enregistrés
    drawPaths.forEach((path) => {
      ctx.save();
      ctx.beginPath();
      ctx.strokeStyle = path.color;
      ctx.lineWidth = path.lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (path.tool === 'highlighter') {
        ctx.globalAlpha = 0.35;
      } else {
        ctx.globalAlpha = 1.0;
      }

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

        // Tête de flèche
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
  }, [paths, darkMode]);

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
    if (isOpen) {
      setTimeout(updateCanvasSize, 50);
      window.addEventListener('resize', updateCanvasSize);
      return () => window.removeEventListener('resize', updateCanvasSize);
    }
  }, [isOpen, updateCanvasSize]);

  // Synchronisation Firestore Multi-joueurs en temps réel
  useEffect(() => {
    if (!isOpen || !groupId || !db) return;

    const myName = currentUser?.name || 'Moi';
    setActiveUsers([myName, 'Collaborateur en direct']);

    try {
      // 1. Écoute du document de tableau blanc
      const docRef = doc(db, 'project_whiteboards', String(groupId));
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
          if (data.activeUsers && Array.isArray(data.activeUsers)) {
            setActiveUsers(data.activeUsers);
          }
          setSaveStatus('Synchronisé en direct 🟢');
        }
      }, (err) => {
        console.warn('[Firestore Whiteboard] snapshot error:', err);
      });

      return () => unsubscribe();
    } catch (_) {}
  }, [isOpen, groupId, redrawCanvas, currentUser]);

  // Sauvegarde des vecteurs et post-its dans Firestore
  const syncToFirestore = useCallback(async (newPaths = paths, newStickyNotes = stickyNotes) => {
    if (!groupId || !db) return;
    try {
      setSaveStatus('Diffusion en direct...');
      const myName = currentUser?.name || 'Moi';
      const docRef = doc(db, 'project_whiteboards', String(groupId));
      await setDoc(docRef, {
        paths: newPaths.slice(-200),
        stickyNotes: newStickyNotes,
        updatedAt: serverTimestamp(),
        lastEditor: myName,
        activeUsers: [myName, 'Collaborateur en direct'],
      }, { merge: true });
      setSaveStatus('Synchronisé en direct 🟢');
    } catch (e) {
      console.warn('[Firestore Whiteboard] write failed:', e);
      setSaveStatus('Mode hors-ligne');
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
        tool,
        color: tool === 'eraser' ? (darkMode ? '#181513' : '#FAF8F5') : color,
        lineWidth: actualWidth,
        type: 'freehand',
        points: [coords],
      };

      // Rendu en direct du premier point
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.save();
          ctx.beginPath();
          ctx.strokeStyle = tool === 'eraser' ? (darkMode ? '#181513' : '#FAF8F5') : color;
          ctx.lineWidth = actualWidth;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.globalAlpha = tool === 'highlighter' ? 0.35 : 1.0;
          ctx.moveTo(coords.x, coords.y);
          ctx.lineTo(coords.x, coords.y);
          ctx.stroke();
          ctx.restore();
        }
      }
    }
  };

  // 2. POINTER MOVE : Dessin continu sous le doigt / pointeur (Temps Réel 60/120 FPS)
  const handlePointerMove = (e) => {
    if (!isDrawingRef.current) return;
    const coords = getCanvasCoords(e);

    if (tool === 'pen' || tool === 'highlighter' || tool === 'eraser') {
      if (!currentPathRef.current) return;
      const pts = currentPathRef.current.points;
      const prev = pts[pts.length - 1] || coords;
      pts.push(coords);

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.save();
          ctx.beginPath();
          ctx.strokeStyle = currentPathRef.current.color;
          ctx.lineWidth = currentPathRef.current.lineWidth;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.globalAlpha = tool === 'highlighter' ? 0.35 : 1.0;
          ctx.moveTo(prev.x, prev.y);
          ctx.lineTo(coords.x, coords.y);
          ctx.stroke();
          ctx.restore();
        }
      }
    } else {
      // Pour les formes géométriques : rafraîchissement continu de la prévisualisation
      redrawCanvas();
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.save();
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

  // 3. POINTER UP : Validation du tracé et synchronisation multi-joueurs
  const handlePointerUp = (e) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const coords = getCanvasCoords(e);

    let newPath = null;
    if (tool === 'pen' || tool === 'highlighter' || tool === 'eraser') {
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
      syncToFirestore(updatedPaths, stickyNotes);
    }

    currentPathRef.current = null;
  };

  // Annuler (Undo)
  const handleUndo = () => {
    if (paths.length === 0) return;
    const last = paths[paths.length - 1];
    const newPaths = paths.slice(0, -1);
    setPaths(newPaths);
    setRedoStack(prev => [last, ...prev]);
    redrawCanvas(newPaths);
    syncToFirestore(newPaths, stickyNotes);
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
    syncToFirestore(newPaths, stickyNotes);
  };

  // Réinitialiser tout le tableau (Traits + Post-its)
  const handleClearAll = () => {
    if (window.confirm("Voulez-vous réinitialiser l'ensemble du tableau blanc et effacer tous les post-its ?")) {
      setPaths([]);
      setRedoStack([]);
      setStickyNotes([]);
      redrawCanvas([]);
      syncToFirestore([], []);
    }
  };

  // Déplacement d'un Post-it (Drag)
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
      const dx = moveEvt.clientX - draggingStickyRef.current.startX;
      const dy = moveEvt.clientY - draggingStickyRef.current.startY;
      const newX = Math.max(10, draggingStickyRef.current.origX + dx);
      const newY = Math.max(10, draggingStickyRef.current.origY + dy);

      setStickyNotes(prev => prev.map(s => s.id === id ? { ...s, x: newX, y: newY } : s));
    };

    const handlePointerUpSticky = () => {
      window.removeEventListener('pointermove', handlePointerMoveSticky);
      window.removeEventListener('pointerup', handlePointerUpSticky);
      if (draggingStickyRef.current) {
        draggingStickyRef.current = null;
        setStickyNotes(currentStickies => {
          syncToFirestore(paths, currentStickies);
          return currentStickies;
        });
      }
    };

    window.addEventListener('pointermove', handlePointerMoveSticky);
    window.addEventListener('pointerup', handlePointerUpSticky);
  };

  // Suppression d'un Post-it individuel
  const handleDeleteSticky = (id, e) => {
    e.stopPropagation();
    const updated = stickyNotes.filter(s => s.id !== id);
    setStickyNotes(updated);
    syncToFirestore(paths, updated);
  };

  // Modification du texte d'un Post-it
  const handleStickyTextChange = (id, newText) => {
    const updated = stickyNotes.map(s => s.id === id ? { ...s, text: newText } : s);
    setStickyNotes(updated);
  };

  // Changement de couleur d'un Post-it
  const handleStickyColorChange = (id, newColor) => {
    const updated = stickyNotes.map(s => s.id === id ? { ...s, color: newColor } : s);
    setStickyNotes(updated);
    syncToFirestore(paths, updated);
  };

  // Génération d'une image composite (Canvas + Post-its) pour export ou envoi au chat
  const generateCompositeSnapshotDataUrl = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return null;

    // 1. Dessiner le canvas de fond et les tracés
    ctx.drawImage(canvas, 0, 0);

    const dpr = window.devicePixelRatio || 1;
    ctx.scale(dpr, dpr);

    // 2. Superposer les Post-its stylisés
    stickyNotes.forEach(sticky => {
      ctx.save();
      const w = 180;
      const h = 120;
      const r = 12;

      // Ombre portée
      ctx.shadowColor = 'rgba(0,0,0,0.25)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 4;

      // Fond de la note
      ctx.fillStyle = sticky.color || '#FEF08A';
      ctx.beginPath();
      ctx.roundRect(sticky.x, sticky.y, w, h, r);
      ctx.fill();

      ctx.shadowColor = 'transparent';

      // Bordure
      ctx.strokeStyle = 'rgba(0,0,0,0.12)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Auteur
      ctx.fillStyle = '#6B7280';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText(sticky.author || 'Post-it', sticky.x + 10, sticky.y + 18);

      // Texte contenu avec retour à la ligne basique
      ctx.fillStyle = '#1F2937';
      ctx.font = '12px sans-serif';
      const words = (sticky.text || '').split(' ');
      let line = '';
      let lineY = sticky.y + 36;
      for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > w - 24 && i > 0) {
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

    return exportCanvas.toDataURL('image/png');
  };

  // Télécharger l'image PNG sur l'appareil
  const handleDownload = () => {
    const dataUrl = generateCompositeSnapshotDataUrl();
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.download = `whiteboard-${projectTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  };

  // Envoyer la capture du tableau directement dans la discussion active
  const handleSendToChatAction = async () => {
    setIsSendingToChat(true);
    try {
      const dataUrl = generateCompositeSnapshotDataUrl();
      if (!dataUrl) return;

      if (db && groupId) {
        const timeLabel = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const caption = `🎨 Tableau blanc collaboratif partagé (${timeLabel})`;

        // Ajout du message avec image dans la collection Firestore du chat
        await addDoc(collection(db, 'chats', String(groupId), 'messages'), {
          text: caption,
          imageUrl: dataUrl,
          type: 'image',
          sender: currentUser?.id || currentUser?.name || 'Moi',
          senderName: currentUser?.name || 'Moi',
          timestamp: serverTimestamp(),
          createdAt: Date.now(),
        });

        // Mise à jour du dernier message du chat
        await setDoc(doc(db, 'chats', String(groupId)), {
          lastMessage: caption,
          lastMessageTimestamp: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }

      if (onSendToChat) {
        onSendToChat(dataUrl);
      }

      setSendSuccessToast(true);
      setTimeout(() => {
        setSendSuccessToast(false);
        onClose();
      }, 1200);
    } catch (err) {
      console.warn('[Whiteboard] Erreur envoi au chat:', err);
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
          maxWidth: isFullscreen ? '100vw' : '1100px',
          height: isFullscreen ? '100dvh' : 'min(calc(100dvh - 80px), 840px)',
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
            <span>Tableau blanc injecté dans la conversation ! 💬🚀</span>
          </div>
        )}

        {/* 1. EN-TÊTE DU WORKSPACE MULTIJOUEURS */}
        <div
          style={{
            padding: '12px 18px',
            borderBottom: '1px solid var(--border-color)',
            backgroundColor: darkMode ? 'rgba(28, 24, 21, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, var(--accent-primary) 0%, #F59E0B 100%)',
                color: '#FFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(198, 125, 91, 0.3)',
                flexShrink: 0,
              }}
            >
              <Palette size={18} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {projectTitle}
                </h3>
                {/* INDICATEUR DE PRÉSENCE TEMPS RÉEL MULTIJOUEUR */}
                <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10B981', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '2px 8px', borderRadius: '999px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block', animation: 'pulse 1.8s infinite' }} />
                  {activeUsers.length} en ligne sur le tableau
                </span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>{saveStatus}</span>
              </div>
            </div>
          </div>

          {/* ACTIONS HEADER : ENVOYER AU CHAT + TÉLÉCHARGER + PLEIN ÉCRAN + FERMER */}
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
                borderRadius: '12px',
                padding: '7px 14px',
                fontSize: '12px',
                fontWeight: '800',
                cursor: isSendingToChat ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: 'var(--shadow-accent)',
                opacity: isSendingToChat ? 0.7 : 1,
              }}
              title="Envoyer une capture complète dans la discussion"
            >
              <Send size={13} />
              <span>{isSendingToChat ? 'Envoi...' : 'Envoyer au chat'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="premium-button"
              style={{
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-main)',
                borderRadius: '10px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              title="Exporter en image PNG"
            >
              <Download size={14} />
            </button>

            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="premium-button"
              style={{
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-main)',
                borderRadius: '10px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              title={isFullscreen ? "Réduire" : "Plein écran"}
            >
              {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="premium-button"
              style={{
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-main)',
                borderRadius: '10px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              title="Fermer le tableau"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* 2. BARRE D'OUTILS FLOTTANTE AVANCÉE (OUTILS, FORMES, COULEURS, MINES, POST-IT, UNDO/REDO) */}
        <div
          style={{
            padding: '8px 14px',
            borderBottom: '1px solid var(--border-color)',
            backgroundColor: darkMode ? '#1F1B18' : '#FAF8F5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            flexWrap: 'wrap',
            flexShrink: 0,
          }}
        >
          {/* SÉLECTION DES OUTILS */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'var(--bg-card)', padding: '3px', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
            {[
              { id: 'pen', icon: Pen, title: 'Crayon fluide' },
              { id: 'highlighter', icon: Highlighter, title: 'Surligneur transparent' },
              { id: 'eraser', icon: Eraser, title: 'Gomme' },
              { id: 'rect', icon: Square, title: 'Rectangle' },
              { id: 'circle', icon: Circle, title: 'Cercle' },
              { id: 'arrow', icon: ArrowRight, title: 'Flèche vectorielle' },
              { id: 'sticky', icon: StickyNote, title: 'Ajouter un Post-it' },
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
                    width: '32px',
                    height: '32px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  title={t.title}
                >
                  <Icon size={15} />
                </button>
              );
            })}
          </div>

          {/* PALETTE CHROMATIQUE */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {COLOR_PALETTE.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => setColor(c.hex)}
                style={{
                  border: color === c.hex ? '2.5px solid var(--text-main)' : '1.5px solid rgba(0,0,0,0.1)',
                  backgroundColor: c.hex,
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  transform: color === c.hex ? 'scale(1.2)' : 'scale(1)',
                  transition: 'transform 0.15s ease',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                }}
                title={c.name}
              />
            ))}
          </div>

          {/* SÉLECTION VISUELLE DE L'ÉPAISSEUR DE LA MINE (CERCLES PLEINS PROGRESSIFS) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--bg-card)', padding: '4px 8px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
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
                    width: '26px',
                    height: '26px',
                    borderRadius: '8px',
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

          {/* ACTIONS UNDO / REDO / CLEAR */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              type="button"
              onClick={handleUndo}
              disabled={paths.length === 0}
              style={{
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-main)',
                width: '30px',
                height: '30px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: paths.length === 0 ? 'not-allowed' : 'pointer',
                opacity: paths.length === 0 ? 0.4 : 1,
              }}
              title="Annuler (Ctrl+Z)"
            >
              <RotateCcw size={13} />
            </button>

            <button
              type="button"
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              style={{
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-main)',
                width: '30px',
                height: '30px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: redoStack.length === 0 ? 'not-allowed' : 'pointer',
                opacity: redoStack.length === 0 ? 0.4 : 1,
              }}
              title="Rétablir (Ctrl+Y)"
            >
              <RotateCw size={13} />
            </button>

            <button
              type="button"
              onClick={handleClearAll}
              style={{
                border: '1px solid rgba(239, 68, 68, 0.3)',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: '#EF4444',
                width: '30px',
                height: '30px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              title="Effacer tout le tableau et les post-its"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* 3. ZONE CANVAS PRINCIPALE & POST-ITS FLOTTANTS INTERACTIFS */}
        <div
          ref={containerRef}
          style={{
            flex: 1,
            minHeight: 0,
            position: 'relative',
            overflow: 'hidden',
            backgroundColor: darkMode ? '#181513' : '#FAF8F5',
            touchAction: 'none',
            cursor: tool === 'sticky' ? 'copy' : tool === 'eraser' ? 'cell' : 'crosshair',
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

          {/* RENDU DES POST-ITS FLOTTANTS DÉPLAÇABLES AU DOIGT */}
          {stickyNotes.map((sticky) => (
            <div
              key={sticky.id}
              style={{
                position: 'absolute',
                left: `${sticky.x}px`,
                top: `${sticky.y}px`,
                width: '200px',
                backgroundColor: sticky.color || '#FEF08A',
                color: '#1F2937',
                borderRadius: '14px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                border: '1px solid rgba(0,0,0,0.08)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                zIndex: 10,
                boxSizing: 'border-box',
                animation: 'scaleUp 0.15s ease',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* POIGNÉE DE DRAG & BOUTON SUPPRIMER */}
              <div
                onPointerDown={(e) => handleStickyPointerDown(sticky.id, e)}
                style={{
                  padding: '6px 8px',
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
                  <GripVertical size={13} style={{ opacity: 0.6 }} />
                  <span style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(0,0,0,0.7)' }}>
                    {sticky.author || 'Post-it'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {/* COULEURS RAPIDES */}
                  <div style={{ display: 'flex', gap: '3px' }}>
                    {STICKY_COLORS.map(sc => (
                      <button
                        key={sc.hex}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStickyColorChange(sticky.id, sc.hex);
                        }}
                        style={{
                          border: sticky.color === sc.hex ? '1.5px solid #000' : 'none',
                          backgroundColor: sc.hex,
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          cursor: 'pointer',
                          padding: 0,
                        }}
                        title={sc.name}
                      />
                    ))}
                  </div>

                  {/* BOUTON X NATIVE DE SUPPRESSION */}
                  <button
                    type="button"
                    onClick={(e) => handleDeleteSticky(sticky.id, e)}
                    style={{
                      border: 'none',
                      background: 'rgba(0,0,0,0.1)',
                      width: '18px',
                      height: '18px',
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
                    <X size={11} />
                  </button>
                </div>
              </div>

              {/* TEXTAREA DU POST-IT */}
              <textarea
                value={sticky.text}
                onChange={(e) => handleStickyTextChange(sticky.id, e.target.value)}
                onBlur={() => syncToFirestore(paths, stickyNotes)}
                placeholder="Écrire une note..."
                rows={3}
                style={{
                  width: '100%',
                  border: 'none',
                  backgroundColor: 'transparent',
                  padding: '8px 10px',
                  fontSize: '12px',
                  fontFamily: 'inherit',
                  color: '#1F2937',
                  resize: 'none',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return createPortal(modalElement, document.body);
}
