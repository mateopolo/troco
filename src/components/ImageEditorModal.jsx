import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X, RotateCw, FlipHorizontal, Crop, Sun, Sliders,
  ZoomIn, Check
} from 'lucide-react';

export default function ImageEditorModal({
  isOpen,
  imageSrc,
  onClose,
  onSave,
  darkMode = false,
  t = (k) => k,
  currentLang = 'FR',
}) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isFlippedH, setIsFlippedH] = useState(false);
  const [aspectRatio, setAspectRatio] = useState('1:1'); // '1:1', '4:3', '16:9', 'free'
  const [brightness, setBrightness] = useState(0); // -50 to 50
  const [contrast, setContrast] = useState(0); // -50 to 50
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Charger l'image source dans une balise Image HTML
  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
      // Réinitialiser les paramètres
      setZoom(1);
      setRotation(0);
      setIsFlippedH(false);
      setBrightness(0);
      setContrast(0);
      setPan({ x: 0, y: 0 });
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Rendu interactif du canvas de prévisualisation
  // Helper pour tester si ctx.filter est supporté par le moteur de rendu
  const isCanvasFilterSupported = useCallback(() => {
    try {
      const testCanvas = document.createElement('canvas');
      const testCtx = testCanvas.getContext('2d');
      if (!testCtx || typeof testCtx.filter !== 'string') return false;
      testCtx.filter = 'brightness(150%)';
      return testCtx.filter.includes('brightness');
    } catch (_) {
      return false;
    }
  }, []);

  // Helper pour appliquer la luminosité et le contraste au niveau des pixels (Garantie 100% universelle)
  const applyPixelAdjustments = useCallback((ctx, width, height, brightVal, contVal) => {
    if (brightVal === 0 && contVal === 0) return;
    try {
      const imgData = ctx.getImageData(0, 0, width, height);
      const d = imgData.data;
      // Formule standard de contraste : factor = (259 * (contrast + 255)) / (255 * (259 - contrast))
      // On ramène contVal (-50..+50) à une plage normalisée (-128..+128)
      const contrastNorm = contVal * 2.55;
      const factor = (259 * (contrastNorm + 255)) / (255 * (259 - contrastNorm));
      const brightOffset = brightVal * 2.55;

      for (let i = 0; i < d.length; i += 4) {
        // Rouge
        let r = d[i] + brightOffset;
        r = factor * (r - 128) + 128;
        d[i] = r < 0 ? 0 : r > 255 ? 255 : r;

        // Vert
        let g = d[i + 1] + brightOffset;
        g = factor * (g - 128) + 128;
        d[i + 1] = g < 0 ? 0 : g > 255 ? 255 : g;

        // Bleu
        let b = d[i + 2] + brightOffset;
        b = factor * (b - 128) + 128;
        d[i + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
      }
      ctx.putImageData(imgData, 0, 0);
    } catch (err) {
      console.warn('[ImageEditor] Pixel adjustments fallback note:', err);
    }
  }, []);

  // Fonction de dessin réutilisable pour la prévisualisation et l'exportation
  const drawImageToCanvas = useCallback((targetCanvas, width, height) => {
    const img = imageRef.current;
    if (!targetCanvas || !img || !imageLoaded) return;

    const ctx = targetCanvas.getContext('2d');
    if (!ctx) return;

    targetCanvas.width = width;
    targetCanvas.height = height;

    ctx.clearRect(0, 0, width, height);

    // 1. Définir les filtres CSS natifs du canvas
    const bPercent = 100 + brightness;
    const cPercent = 100 + contrast;
    const nativeFilterStr = `brightness(${bPercent}%) contrast(${cPercent}%)`;
    ctx.filter = nativeFilterStr;

    ctx.save();
    // Centrer la transformation
    ctx.translate(width / 2 + pan.x, height / 2 + pan.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(isFlippedH ? -zoom : zoom, zoom);

    // Dessiner l'image centrée avec conservation du ratio
    const scaleToFit = Math.max(width / img.naturalWidth, height / img.naturalHeight);
    const drawW = img.naturalWidth * scaleToFit;
    const drawH = img.naturalHeight * scaleToFit;

    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    // 2. Si le moteur ne supporte pas ctx.filter nativement, appliquer le fallback par manipulation directe de pixels
    if (!isCanvasFilterSupported()) {
      applyPixelAdjustments(ctx, width, height, brightness, contrast);
    }
  }, [imageLoaded, zoom, rotation, isFlippedH, brightness, contrast, pan, isCanvasFilterSupported, applyPixelAdjustments]);

  // Rendu interactif du canvas de prévisualisation
  const renderPreview = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !imageLoaded) return;

    let targetWidth = 600;
    let targetHeight = 600;

    if (aspectRatio === '1:1') {
      targetWidth = 600;
      targetHeight = 600;
    } else if (aspectRatio === '4:3') {
      targetWidth = 640;
      targetHeight = 480;
    } else if (aspectRatio === '16:9') {
      targetWidth = 640;
      targetHeight = 360;
    } else {
      targetWidth = 600;
      targetHeight = Math.round(600 * (img.naturalHeight / img.naturalWidth)) || 600;
    }

    drawImageToCanvas(canvas, targetWidth, targetHeight);
  }, [aspectRatio, drawImageToCanvas, imageLoaded]);

  useEffect(() => {
    renderPreview();
  }, [renderPreview]);

  // Gestion du Pan / Déplacement à la souris ou au toucher
  const handlePointerDown = (e) => {
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - pan.x,
      y: e.clientY - pan.y,
    };
    if (e.target.setPointerCapture) {
      try { e.target.setPointerCapture(e.pointerId); } catch (_) {}
    }
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const newX = e.clientX - dragStartRef.current.x;
    const newY = e.clientY - dragStartRef.current.y;
    setPan({
      x: Math.max(-250, Math.min(250, newX)),
      y: Math.max(-250, Math.min(250, newY)),
    });
  };

  const handlePointerUp = (e) => {
    setIsDragging(false);
    if (e.target.releasePointerCapture) {
      try { e.target.releasePointerCapture(e.pointerId); } catch (_) {}
    }
  };

  // Exporter le résultat final haute fidélité avec filtres intégrés dans le DataURL
  const handleConfirmSave = () => {
    const img = imageRef.current;
    if (!img || !imageLoaded) {
      onClose();
      return;
    }

    try {
      // Création d'un canvas d'exportation haute résolution (1000px max)
      const exportCanvas = document.createElement('canvas');
      let targetWidth = 1000;
      let targetHeight = 1000;

      if (aspectRatio === '1:1') {
        targetWidth = 1000;
        targetHeight = 1000;
      } else if (aspectRatio === '4:3') {
        targetWidth = 1000;
        targetHeight = 750;
      } else if (aspectRatio === '16:9') {
        targetWidth = 1000;
        targetHeight = 562;
      } else {
        targetWidth = 1000;
        targetHeight = Math.round(1000 * (img.naturalHeight / img.naturalWidth)) || 1000;
      }

      drawImageToCanvas(exportCanvas, targetWidth, targetHeight);

      const dataUrl = exportCanvas.toDataURL('image/jpeg', 0.92);
      onSave(dataUrl);
      onClose();
    } catch (e) {
      console.warn('Image export error:', e);
      // Fallback sur le canvas de prévisualisation en cas de sécurité CORS
      if (canvasRef.current) {
        try {
          const fallbackDataUrl = canvasRef.current.toDataURL('image/jpeg', 0.88);
          onSave(fallbackDataUrl);
        } catch (_) {}
      }
      onClose();
    }
  };

  if (!isOpen || !imageSrc) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.78)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      zIndex: 10000020,
      animation: 'fadeIn 0.25s ease',
    }}>
      <div style={{
        backgroundColor: 'var(--bg-card)',
        borderRadius: '24px',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-modal)',
        width: '100%',
        maxWidth: '560px',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
      }}>
        {/* HEADER */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-glass)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Crop size={18} color="var(--accent-primary)" />
            <h3 className="font-editorial-heading" style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--text-main)' }}>
              {currentLang === 'FR' ? 'Ajuster et recadrer la photo' : 'Adjust & crop photo'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: 'none',
              background: 'var(--bg-subtle)',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-main)',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* ZONE DE VISUALISATION INTERACTIVE & DRAGGABLE */}
        <div style={{
          flex: 1,
          minHeight: '260px',
          maxHeight: '380px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          backgroundColor: darkMode ? '#12100E' : '#2A2522',
          position: 'relative',
          overflow: 'hidden',
          userSelect: 'none',
          touchAction: 'none',
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <canvas
            ref={canvasRef}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              borderRadius: '12px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
              objectFit: 'contain',
              pointerEvents: 'none',
            }}
          />

          <div style={{
            position: 'absolute',
            bottom: '10px',
            right: '12px',
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            color: '#FFF',
            padding: '3px 8px',
            borderRadius: '8px',
            fontSize: '10px',
            fontWeight: '700',
            pointerEvents: 'none',
          }}>
            Glisser pour recadrer
          </div>
        </div>

        {/* TOOLBAR DES OPTIONS */}
        <div style={{
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          backgroundColor: 'var(--bg-card)',
          overflowY: 'auto',
        }}>
          {/* FORMATS / RATIOS */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              Format & Recadrage
            </label>
            <div style={{ display: 'flex', gap: '6px' }}>
              {[
                { key: '1:1', label: 'Carré (1:1)' },
                { key: '4:3', label: 'Photo (4:3)' },
                { key: '16:9', label: 'Large (16:9)' },
                { key: 'free', label: 'Original' },
              ].map(r => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setAspectRatio(r.key)}
                  className="premium-button"
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    borderRadius: '10px',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    backgroundColor: aspectRatio === r.key ? 'var(--accent-primary)' : 'var(--bg-subtle)',
                    color: aspectRatio === r.key ? '#FFFFFF' : 'var(--text-main)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* ZOOM & ROTATION */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><ZoomIn size={12} /> Zoom</span>
                <span>{zoom.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', paddingTop: '14px' }}>
              <button
                type="button"
                onClick={() => setRotation(prev => (prev + 90) % 360)}
                className="premium-button"
                title="Pivoter de 90°"
                style={{
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--text-main)',
                  borderRadius: '10px',
                  padding: '7px 10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '11px',
                  fontWeight: '700',
                }}
              >
                <RotateCw size={13} /> 90°
              </button>

              <button
                type="button"
                onClick={() => setIsFlippedH(prev => !prev)}
                className="premium-button"
                title="Miroir horizontal"
                style={{
                  border: '1px solid var(--border-color)',
                  backgroundColor: isFlippedH ? 'var(--accent-primary)' : 'var(--bg-subtle)',
                  color: isFlippedH ? '#FFFFFF' : 'var(--text-main)',
                  borderRadius: '10px',
                  padding: '7px 10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '11px',
                  fontWeight: '700',
                }}
              >
                <FlipHorizontal size={13} />
              </button>
            </div>
          </div>

          {/* LUMIÈRE & CONTRASTE BASIQUE */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Sun size={12} /> Luminosité</span>
                <span>{brightness > 0 ? `+${brightness}%` : `${brightness}%`}</span>
              </div>
              <input
                type="range"
                min="-40"
                max="40"
                step="1"
                value={brightness}
                onChange={(e) => setBrightness(parseInt(e.target.value, 10))}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Sliders size={12} /> Contraste</span>
                <span>{contrast > 0 ? `+${contrast}%` : `${contrast}%`}</span>
              </div>
              <input
                type="range"
                min="-40"
                max="40"
                step="1"
                value={contrast}
                onChange={(e) => setContrast(parseInt(e.target.value, 10))}
                style={{ width: '100%' }}
              />
            </div>
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '10px',
          padding: '14px 20px',
          borderTop: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-glass)',
        }}>
          <button
            type="button"
            onClick={onClose}
            className="premium-button"
            style={{
              border: '1px solid var(--border-color)',
              backgroundColor: 'transparent',
              color: 'var(--text-secondary)',
              borderRadius: '12px',
              padding: '9px 16px',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
            }}
          >
            Annuler
          </button>

          <button
            type="button"
            onClick={handleConfirmSave}
            className="premium-button"
            style={{
              border: 'none',
              background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)',
              color: '#FFFFFF',
              borderRadius: '12px',
              padding: '9px 20px',
              fontSize: '12px',
              fontWeight: '800',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: 'var(--shadow-accent)',
            }}
          >
            <Check size={14} /> Appliquer les réglages
          </button>
        </div>
      </div>
    </div>
  );
}
