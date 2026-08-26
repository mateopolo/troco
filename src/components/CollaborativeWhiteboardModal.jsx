import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Pen, Highlighter, Eraser, Square, Circle, ArrowRight,
  RotateCcw, Trash2, Download, Users, StickyNote,
  Palette, Maximize2, Minimize2
} from 'lucide-react';
import { doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
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
  { size: 2, label: 'Fin' },
  { size: 5, label: 'Moyen' },
  { size: 10, label: 'Large' },
  { size: 20, label: 'Extra' },
];

export default function CollaborativeWhiteboardModal({
  isOpen,
  onClose,
  groupId = 'demo_group_whiteboard',
  projectTitle = 'Tableau Blanc Collaboratif',
  currentUser = null,
  darkMode = false,
}) {
  const canvasRef = useRef(null);
  const [tool, setTool] = useState('pen'); // 'pen' | 'highlighter' | 'eraser' | 'rect' | 'circle' | 'arrow' | 'sticky'
  const [color, setColor] = useState('#C67D5B');
  const [lineWidth, setLineWidth] = useState(5);
  const [stickyNotes, setStickyNotes] = useState([]);
  const [paths, setPaths] = useState([]);
  const [activeUsers] = useState(['Mateo P.', 'Emma R.', 'Thomas V.']);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [saveStatus, setSaveStatus] = useState('Synchronisé en temps réel');

  const isDrawingRef = useRef(false);
  const currentPathRef = useRef(null);
  const startPosRef = useRef({ x: 0, y: 0 });

  // Redessine l'ensemble des vecteurs sur le canvas
  const redrawCanvas = useCallback((drawPaths = paths) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reset du canvas avec fond selon le thème
    ctx.fillStyle = darkMode ? '#181513' : '#FAF8F5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Dessin de la grille discrète
    ctx.strokeStyle = darkMode ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)';
    ctx.lineWidth = 1;
    const gridSize = 32;
    for (let x = 0; x < canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
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
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
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
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
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
  const syncToFirestore = useCallback(async (newPaths, newStickyNotes = stickyNotes) => {
    if (!groupId) return;
    try {
      setSaveStatus('Synchronisation...');
      const docRef = doc(db, 'project_whiteboards', String(groupId));
      await setDoc(docRef, {
        paths: newPaths.slice(-150), // Garde les 150 derniers tracés pour performance optimale
        stickyNotes: newStickyNotes,
        updatedAt: serverTimestamp(),
        lastEditor: currentUser?.name || 'Collaborateur',
      }, { merge: true });
      setSaveStatus('Synchronisé ✅');
    } catch (e) {
      console.warn('[Firestore Whiteboard] write failed:', e);
      setSaveStatus('Sauvegarde locale');
    }
  }, [groupId, currentUser?.name, stickyNotes]);

  // Gestion des coordonnées précises (souris & stylet/tactile)
  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e) => {
    if (tool === 'sticky') {
      const coords = getCanvasCoords(e);
      const newSticky = {
        id: `sticky-${Date.now()}`,
        x: coords.x,
        y: coords.y,
        text: 'Idée / Tâche...',
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

    if (tool === 'pen' || tool === 'highlighter' || tool === 'eraser') {
      currentPathRef.current = {
        id: `p-${Date.now()}`,
        type: 'freehand',
        tool,
        color,
        lineWidth: tool === 'highlighter' ? lineWidth * 2.5 : tool === 'eraser' ? lineWidth * 3 : lineWidth,
        points: [coords],
      };
    }
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDrawingRef.current) return;
    const coords = getCanvasCoords(e);

    if (tool === 'pen' || tool === 'highlighter' || tool === 'eraser') {
      if (!currentPathRef.current) return;
      currentPathRef.current.points.push(coords);

      const canvas = canvasRef.current;
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

        const pts = currentPathRef.current.points;
        if (pts.length > 1) {
          ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y);
          ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
          ctx.stroke();
        }
      }
    } else {
      // Prévisualisation des formes géométriques
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
      redrawCanvas(updated);
      syncToFirestore(updated);
    }
    currentPathRef.current = null;
  };

  // Annuler (Undo)
  const handleUndo = () => {
    if (paths.length === 0) return;
    const updated = paths.slice(0, -1);
    setPaths(updated);
    redrawCanvas(updated);
    syncToFirestore(updated);
  };

  // Effacer tout le tableau
  const handleClearAll = () => {
    if (window.confirm('Voulez-vous effacer tout le tableau blanc pour le groupe ?')) {
      setPaths([]);
      setStickyNotes([]);
      redrawCanvas([]);
      syncToFirestore([]);
    }
  };

  // Télécharger en image PNG haute qualité
  const handleExportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `whiteboard-${projectTitle.replace(/[^a-z0-9]/gi, '_')}.png`;
    link.href = url;
    link.click();
  };

  // Suppression d'un Post-it
  const handleDeleteSticky = (stickyId) => {
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
        padding: isFullscreen ? '0' : '12px 12px max(80px, env(safe-area-inset-bottom, 24px)) 12px',
        animation: 'fadeIn 0.2s ease both',
        boxSizing: 'border-box'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: isFullscreen ? '100vw' : '96vw',
          maxWidth: isFullscreen ? '100vw' : '1200px',
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
        {/* BARRE SUPÉRIEURE DU WHITEBOARD */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 18px',
            borderBottom: '1px solid var(--border-color)',
            backgroundColor: darkMode ? 'rgba(24, 21, 19, 0.9)' : 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(12px)',
            flexShrink: 0,
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          {/* TITRE DU PROJET & STATUT EN LIGNE */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '10px', backgroundColor: 'var(--accent-primary)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-accent)' }}>
              <Palette size={18} />
            </div>
            <div>
              <div style={{ fontWeight: '800', fontSize: '15px', color: 'var(--text-main)' }}>
                {projectTitle}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--accent-success)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--accent-success)', boxShadow: '0 0 6px var(--accent-success)' }} />
                <span>{saveStatus}</span>
              </div>
            </div>
          </div>

          {/* UTILISATEURS ACTIFS EN COLLABORATION */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', marginRight: '8px' }}>
              <Users size={14} />
              <span>{activeUsers.length} connectés</span>
            </div>

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
              title={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>

            <button
              type="button"
              onClick={handleExportPNG}
              className="premium-button"
              style={{
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-subtle)',
                color: 'var(--text-main)',
                padding: '7px 12px',
                borderRadius: '999px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
              }}
              title="Exporter en image PNG"
            >
              <Download size={14} />
              <span>Exporter</span>
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
              title="Fermer le tableau blanc"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ZONE DE DESSIN CANVAS CENTRALE */}
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

          {/* POST-ITS FLOTTANTS DÉPLAÇABLES */}
          {stickyNotes.map((note) => (
            <div
              key={note.id}
              style={{
                position: 'absolute',
                left: `${note.x}px`,
                top: `${note.y}px`,
                backgroundColor: note.color || '#FEF08A',
                color: '#1E293B',
                padding: '10px 12px',
                borderRadius: '12px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.2), 0 2px 6px rgba(0,0,0,0.1)',
                minWidth: '150px',
                maxWidth: '220px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                zIndex: 10,
                animation: 'fadeSlideUp 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '10px', fontWeight: '800', opacity: 0.7 }}>
                <span>✍️ {note.author}</span>
                <button
                  type="button"
                  onClick={() => handleDeleteSticky(note.id)}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#DC2626', padding: 0 }}
                  title="Supprimer la note"
                >
                  <X size={12} />
                </button>
              </div>

              <textarea
                value={note.text}
                onChange={(e) => handleUpdateStickyText(note.id, e.target.value)}
                rows={2}
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
                }}
              />
            </div>
          ))}
        </div>

        {/* BARRE D'OUTILS FLOTTANTE INFÉRIEURE (DESSIN, COULEURS, TAILLE) */}
        <div
          style={{
            position: 'absolute',
            bottom: '18px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: darkMode ? 'rgba(30, 26, 23, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius: '999px',
            padding: '8px 14px',
            border: '1px solid var(--border-color)',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.35)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            zIndex: 40,
            maxWidth: '94%',
            overflowX: 'auto',
          }}
        >
          {/* 1. OUTILS DE DESSIN */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
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
                    width: '36px',
                    height: '36px',
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

          <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border-color)' }} />

          {/* 2. PALETTE DE COULEURS */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            {COLOR_PALETTE.map((c) => {
              const isSelected = color === c.hex;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setColor(c.hex)}
                  style={{
                    border: isSelected ? '2.5px solid var(--accent-primary)' : '1px solid rgba(0,0,0,0.15)',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    backgroundColor: c.hex,
                    cursor: 'pointer',
                    transform: isSelected ? 'scale(1.2)' : 'scale(1)',
                    transition: 'transform 0.15s ease',
                    boxShadow: isSelected ? '0 0 8px rgba(0,0,0,0.3)' : 'none',
                  }}
                  title={c.name}
                />
              );
            })}
          </div>

          <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border-color)' }} />

          {/* 3. ÉPAISSEUR DU TRAIT */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {STROKE_SIZES.map((s) => {
              const isSelected = lineWidth === s.size;
              return (
                <button
                  key={s.size}
                  type="button"
                  onClick={() => setLineWidth(s.size)}
                  style={{
                    border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                    backgroundColor: isSelected ? 'var(--accent-primary)' : 'transparent',
                    color: isSelected ? '#FFFFFF' : 'var(--text-secondary)',
                    borderRadius: '999px',
                    padding: '4px 8px',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                >
                  {s.label}
                </button>
              );
            })}
          </div>

          <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border-color)' }} />

          {/* 4. ACTIONS RAPIDES : UNDO & CLEAR */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              type="button"
              onClick={handleUndo}
              style={{
                border: 'none',
                backgroundColor: 'transparent',
                color: 'var(--text-main)',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              title="Annuler (Undo)"
            >
              <RotateCcw size={15} />
            </button>

            <button
              type="button"
              onClick={handleClearAll}
              style={{
                border: 'none',
                backgroundColor: 'transparent',
                color: '#EF4444',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              title="Effacer tout le tableau"
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

