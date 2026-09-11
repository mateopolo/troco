import React, { useState, useRef, useEffect, useCallback } from 'react';

/**
 * TROCO SLIDES - Éditeur de slides avancé avec:
 * - Édition inline (contentEditable)
 * - Drag & Drop pour les images (position: absolute)
 * - Redimensionnement aux 4 coins
 * - Panel latéral pour les arrière-plans (couleurs, dégradés, images)
 */

// Couleurs premium pour les arrière-plans
const PREMIUM_COLORS = {
  terracotta: '#C67D5B',
  terracottaDark: '#A8644A',
  terracottaLight: '#D4C5B5',
  charcoal: '#3D3530',
  charcoalDark: '#1A1715',
  charcoalLight: '#6B5E54',
  cream: '#FAF7F2',
  creamDark: '#F5F0E8',
  creamLight: '#E8DDD3',
  accent: '#F59E0B',
  accentDark: '#D97706',
  success: '#10B981',
  error: '#EF4444',
};

// Gradients prédéfinis
const PRESET_GRADIENTS = [
  { name: 'Terracotta Sunrise', start: '#C67D5B', end: '#F59E0B', angle: 135 },
  { name: 'Charcoal Depth', start: '#1A1715', end: '#3D3530', angle: 180 },
  { name: 'Cream Elegance', start: '#FAF7F2', end: '#F5F0E8', angle: 180 },
  { name: 'Golden Hour', start: '#F59E0B', end: '#D97706', angle: 45 },
  { name: 'Earth Tones', start: '#C67D5B', end: '#6B5E54', angle: 90 },
  { name: 'Mystic Night', start: '#1A1715', end: '#0F0D0B', angle: 180 },
];

// Style des poignées de redimensionnement
const HANDLE_SIZE = 12;
const HANDLE_COLOR = '#C67D5B';

/**
 * Hook personnalisé pour le Drag & Drop avec gestion des poignées
 */
const useDragAndDrop = (initialPosition, initialSize, onUpdate) => {
  const elementRef = useRef(null);
  const [position, setPosition] = useState(initialPosition);
  const [size, setSize] = useState(initialSize);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(null); // null, 'top-left', 'top-right', 'bottom-left', 'bottom-right'
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [startSize, setStartSize] = useState({ width: 0, height: 0 });

  // Calcul des positions des poignées
  const getHandlePosition = useCallback((handleType) => {
    const { x, y } = position;
    const { width, height } = size;
    
    switch (handleType) {
      case 'top-left':
        return { x: x - HANDLE_SIZE / 2, y: y - HANDLE_SIZE / 2 };
      case 'top-right':
        return { x: x + width - HANDLE_SIZE / 2, y: y - HANDLE_SIZE / 2 };
      case 'bottom-left':
        return { x: x - HANDLE_SIZE / 2, y: y + height - HANDLE_SIZE / 2 };
      case 'bottom-right':
        return { x: x + width - HANDLE_SIZE / 2, y: y + height - HANDLE_SIZE / 2 };
      default:
        return { x, y };
    }
  }, [position, size]);

  // Gestion du drag (déplacement)
  const handlePointerDown = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (e.target.classList.contains('resize-handle')) {
      const handleType = e.target.dataset.handle;
      setIsResizing(handleType);
      setStartPos({ x: e.clientX, y: e.clientY });
      setStartSize({ width: size.width, height: size.height });
    } else {
      setIsDragging(true);
      setStartPos({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
    
    // Capture du pointer
    if (elementRef.current) {
      elementRef.current.setPointerCapture(e.pointerId);
    }
  }, [position, size]);

  // Gestion du mouvement
  const handlePointerMove = useCallback((e) => {
    if (!isDragging && !isResizing) return;
    
    if (isDragging) {
      const newX = e.clientX - startPos.x;
      const newY = e.clientY - startPos.y;
      setPosition({ x: newX, y: newY });
    }
    
    if (isResizing) {
      const deltaX = e.clientX - startPos.x;
      const deltaY = e.clientY - startPos.y;
      
      let newWidth = startSize.width;
      let newHeight = startSize.height;
      let newX = position.x;
      let newY = position.y;

      switch (isResizing) {
        case 'top-left':
          newWidth = startSize.width - deltaX;
          newHeight = startSize.height - deltaY;
          newX = position.x + deltaX;
          newY = position.y + deltaY;
          break;
        case 'top-right':
          newWidth = startSize.width + deltaX;
          newHeight = startSize.height - deltaY;
          newY = position.y + deltaY;
          break;
        case 'bottom-left':
          newWidth = startSize.width - deltaX;
          newHeight = startSize.height + deltaY;
          newX = position.x + deltaX;
          break;
        case 'bottom-right':
          newWidth = startSize.width + deltaX;
          newHeight = startSize.height + deltaY;
          break;
        default:
          break;
      }
      
      // Contrôles minimaux
      newWidth = Math.max(20, newWidth);
      newHeight = Math.max(20, newHeight);
      
      setSize({ width: newWidth, height: newHeight });
      setPosition({ x: newX, y: newY });
    }
    
    onUpdate?.({ position: { x: isDragging ? e.clientX - startPos.x : position.x, y: isDragging ? e.clientY - startPos.y : position.y }, size });
  }, [isDragging, isResizing, startPos, startSize, position, size, onUpdate]);

  // Gestion du lâcher
  const handlePointerUp = useCallback((e) => {
    setIsDragging(false);
    setIsResizing(null);
    
    if (elementRef.current) {
      elementRef.current.releasePointerCapture(e.pointerId);
    }
    
    onUpdate?.({ position, size });
  }, [onUpdate, position, size]);

  // Effet pour ajouter/retirer les event listeners
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    
    element.addEventListener('pointerdown', handlePointerDown, { passive: false });
    element.addEventListener('pointermove', handlePointerMove, { passive: false });
    element.addEventListener('pointerup', handlePointerUp, { passive: false });
    element.addEventListener('pointercancel', handlePointerUp, { passive: false });
    
    return () => {
      element.removeEventListener('pointerdown', handlePointerDown);
      element.removeEventListener('pointermove', handlePointerMove);
      element.removeEventListener('pointerup', handlePointerUp);
      element.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [handlePointerDown, handlePointerMove, handlePointerUp]);

  // Style de l'élément
  const elementStyle = {
    position: 'absolute',
    left: `${position.x}px`,
    top: `${position.y}px`,
    width: `${size.width}px`,
    height: `${size.height}px`,
    cursor: isDragging ? 'grabbing' : (isResizing ? 'nwse-resize' : 'grab'),
    userSelect: 'none',
    WebkitUserSelect: 'none',
    touchAction: 'none',
  };

  return {
    elementRef,
    elementStyle,
    isDragging,
    isResizing,
    position,
    size,
    setPosition,
    setSize,
    getHandlePosition,
  };
};

/**
 * Composant pour un élément textuel éditable
 */
const EditableTextElement = React.memo(({
  id,
  content,
  style,
  onUpdate,
  fontSize = 16,
  fontFamily = 'var(--font-family-main)',
  color = '#3D3530',
  darkMode,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const contentRef = useRef(null);

  const handleContentChange = useCallback((e) => {
    onUpdate(id, e.target.textContent || '');
  }, [id, onUpdate]);

  const handleClick = useCallback((e) => {
    if (e.target === contentRef.current) {
      setIsEditing(true);
      // Focus et sélection du contenu
      const range = document.createRange();
      const selection = window.getSelection();
      range.selectNodeContents(contentRef.current);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }, []);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
  }, []);

  // Style combiné
  const elementStyle = {
    ...style,
    fontSize: `${fontSize}px`,
    fontFamily,
    color: darkMode ? '#FAF7F2' : color,
    outline: isEditing ? '2px solid #C67D5B' : 'none',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  };

  return (
    <div
      ref={contentRef}
      contentEditable
      onInput={handleContentChange}
      onClick={handleClick}
      onBlur={handleBlur}
      suppressContentEditableWarning
      style={elementStyle}
      dangerouslySetInnerHTML={{ __html: content || '<br/>' }}
    />
  );
});

/**
 * Composant pour une image avec Drag & Drop et redimensionnement
 */
const DraggableImage = React.memo(({
  id,
  src,
  position,
  size,
  onUpdate,
  darkMode,
  isActive,
}) => {
  const {
    elementRef,
    elementStyle,
    isDragging,
    isResizing,
    getHandlePosition,
  } = useDragAndDrop(position, size, onUpdate);

  // Style des poignées
  const handleStyle = {
    position: 'absolute',
    width: `${HANDLE_SIZE}px`,
    height: `${HANDLE_SIZE}px`,
    backgroundColor: HANDLE_COLOR,
    border: '2px solid #FFFFFF',
    borderRadius: isResizing?.includes('top') && isResizing?.includes('left') ? '0' : 
                isResizing?.includes('top') && isResizing?.includes('right') ? '0' :
                isResizing?.includes('bottom') && isResizing?.includes('left') ? '0' :
                isResizing?.includes('bottom') && isResizing?.includes('right') ? '0' : '50%',
    cursor: 'nwse-resize',
    zIndex: 1000,
    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
  };

  return (
    <div
      ref={elementRef}
      style={{
        ...elementStyle,
        overflow: 'hidden',
        border: isActive ? '2px solid #C67D5B' : 'none',
        boxShadow: isActive ? '0 0 0 2px rgba(198,125,91,0.3)' : 'none',
      }}
    >
      <img
        src={src}
        alt=""
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
        draggable={false}
      />
      
      {/* Poignées de redimensionnement */}
      {isActive && !isDragging && !isResizing && (
        <>
          <div
            className="resize-handle"
            data-handle="top-left"
            style={{
              ...handleStyle,
              ...getHandlePosition('top-left'),
            }}
          />
          <div
            className="resize-handle"
            data-handle="top-right"
            style={{
              ...handleStyle,
              ...getHandlePosition('top-right'),
            }}
          />
          <div
            className="resize-handle"
            data-handle="bottom-left"
            style={{
              ...handleStyle,
              ...getHandlePosition('bottom-left'),
            }}
          />
          <div
            className="resize-handle"
            data-handle="bottom-right"
            style={{
              ...handleStyle,
              ...getHandlePosition('bottom-right'),
            }}
          />
        </>
      )}
    </div>
  );
});

/**
 * Panel latéral pour la gestion des arrière-plans
 */
const BackgroundPanel = React.memo(({
  background,
  onBackgroundChange,
  darkMode,
}) => {
  const [activeTab, setActiveTab] = useState('colors');
  const [customGradient, setCustomGradient] = useState({
    angle: 135,
    start: '#C67D5B',
    end: '#A8644A',
  });
  const [imageUrl, setImageUrl] = useState('');

  const handleColorSelect = useCallback((color) => {
    onBackgroundChange({ type: 'color', value: color });
  }, [onBackgroundChange]);

  const handlePresetGradientSelect = useCallback((gradient) => {
    onBackgroundChange({ type: 'gradient', value: gradient });
  }, [onBackgroundChange]);

  const handleCustomGradientChange = useCallback((field, value) => {
    setCustomGradient(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleCustomGradientApply = useCallback(() => {
    onBackgroundChange({ type: 'gradient', value: customGradient });
  }, [customGradient, onBackgroundChange]);

  const handleImageBackground = useCallback((url) => {
    if (url) {
      onBackgroundChange({ type: 'image', value: url });
    }
  }, [onBackgroundChange]);

  const handleImageUrlChange = useCallback((e) => {
    setImageUrl(e.target.value);
  }, []);

  const handleImageSubmit = useCallback((e) => {
    e.preventDefault();
    if (imageUrl) {
      handleImageBackground(imageUrl);
      setImageUrl('');
    }
  }, [imageUrl, handleImageBackground]);

  // Générer le CSS du gradient
  const getGradientStyle = (gradient) => ({
    background: `linear-gradient(${gradient.angle}deg, ${gradient.start}, ${gradient.end})`,
  });

  return (
    <div
      style={{
        position: 'fixed',
        right: 0,
        top: 0,
        bottom: 0,
        width: '280px',
        backgroundColor: darkMode ? '#1A1715' : '#FAF7F2',
        borderLeft: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3',
        padding: '16px',
        boxShadow: '-4px 0 20px rgba(61,53,48,0.1)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
      }}
    >
      <h3
        style={{
          fontSize: '16px',
          fontWeight: '700',
          color: darkMode ? '#FAF7F2' : '#3D3530',
          margin: '0 0 16px',
          paddingBottom: '12px',
          borderBottom: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3',
        }}
      >
        Arrière-plan
      </h3>

      {/* Onglets */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          marginBottom: '12px',
        }}
      >
        <button
          onClick={() => setActiveTab('colors')}
          style={{
            flex: 1,
            padding: '8px 12px',
            border: 'none',
            borderRadius: '8px',
            backgroundColor: activeTab === 'colors' ? '#C67D5B' : darkMode ? '#1A1715' : '#F5F0E8',
            color: activeTab === 'colors' ? '#FFF' : darkMode ? '#D4C5B5' : '#6B5E54',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          Couleurs
        </button>
        <button
          onClick={() => setActiveTab('gradients')}
          style={{
            flex: 1,
            padding: '8px 12px',
            border: 'none',
            borderRadius: '8px',
            backgroundColor: activeTab === 'gradients' ? '#C67D5B' : darkMode ? '#1A1715' : '#F5F0E8',
            color: activeTab === 'gradients' ? '#FFF' : darkMode ? '#D4C5B5' : '#6B5E54',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          Dégradés
        </button>
        <button
          onClick={() => setActiveTab('image')}
          style={{
            flex: 1,
            padding: '8px 12px',
            border: 'none',
            borderRadius: '8px',
            backgroundColor: activeTab === 'image' ? '#C67D5B' : darkMode ? '#1A1715' : '#F5F0E8',
            color: activeTab === 'image' ? '#FFF' : darkMode ? '#D4C5B5' : '#6B5E54',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          Image
        </button>
      </div>

      {/* Contenu des onglets */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
        }}
      >
        {/* Onglet Couleurs */}
        {activeTab === 'colors' && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '8px',
            }}
          >
            {Object.entries(PREMIUM_COLORS).map(([key, color]) => (
              <button
                key={key}
                onClick={() => handleColorSelect(color)}
                style={{
                  aspectRatio: '1',
                  border: background?.type === 'color' && background.value === color 
                    ? '2px solid #C67D5B' 
                    : 'none',
                  borderRadius: '6px',
                  backgroundColor: color,
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease',
                }}
                title={key}
                aria-label={`Couleur ${key}`}
              />
            ))}
          </div>
        )}

        {/* Onglet Dégradés */}
        {activeTab === 'gradients' && (
          <div>
            <h4
              style={{
                fontSize: '13px',
                fontWeight: '600',
                color: darkMode ? '#D4C5B5' : '#6B5E54',
                margin: '0 0 8px',
              }}
            >
              Préréglés
            </h4>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '8px',
                marginBottom: '16px',
              }}
            >
              {PRESET_GRADIENTS.map((gradient) => (
                <button
                  key={gradient.name}
                  onClick={() => handlePresetGradientSelect(gradient)}
                  style={{
                    aspectRatio: '16/9',
                    border: background?.type === 'gradient' && 
                          background.value.angle === gradient.angle &&
                          background.value.start === gradient.start &&
                          background.value.end === gradient.end
                      ? '2px solid #C67D5B'
                      : 'none',
                    borderRadius: '6px',
                    background: `linear-gradient(${gradient.angle}deg, ${gradient.start}, ${gradient.end})`,
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease',
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'flex-end',
                    padding: '4px',
                  }}
                  title={gradient.name}
                  aria-label={gradient.name}
                >
                  <span
                    style={{
                      fontSize: '10px',
                      color: '#FFFFFF',
                      backgroundColor: 'rgba(0,0,0,0.3)',
                      padding: '2px 4px',
                      borderRadius: '4px',
                      textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                    }}
                  >
                    {gradient.name}
                  </span>
                </button>
              ))}
            </div>

            <h4
              style={{
                fontSize: '13px',
                fontWeight: '600',
                color: darkMode ? '#D4C5B5' : '#6B5E54',
                margin: '0 0 8px',
              }}
            >
              Personnalisé
            </h4>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: darkMode ? '#D4C5B5' : '#6B5E54',
                    marginBottom: '4px',
                  }}
                >
                  Angle
                </label>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={customGradient.angle}
                  onChange={(e) => handleCustomGradientChange('angle', parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    cursor: 'pointer',
                    accentColor: '#C67D5B',
                  }}
                />
                <span
                  style={{
                    fontSize: '11px',
                    color: darkMode ? '#D4C5B5' : '#6B5E54',
                  }}
                >
                  {customGradient.angle}°
                </span>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: darkMode ? '#D4C5B5' : '#6B5E54',
                    marginBottom: '4px',
                  }}
                >
                  Couleur de départ
                </label>
                <input
                  type="color"
                  value={customGradient.start}
                  onChange={(e) => handleCustomGradientChange('start', e.target.value)}
                  style={{
                    width: '100%',
                    height: '36px',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: 'none',
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: darkMode ? '#D4C5B5' : '#6B5E54',
                    marginBottom: '4px',
                  }}
                >
                  Couleur de fin
                </label>
                <input
                  type="color"
                  value={customGradient.end}
                  onChange={(e) => handleCustomGradientChange('end', e.target.value)}
                  style={{
                    width: '100%',
                    height: '36px',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: 'none',
                  }}
                />
              </div>

              <button
                onClick={handleCustomGradientApply}
                style={{
                  padding: '8px 12px',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: '#C67D5B',
                  color: '#FFF',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease',
                }}
              >
                Appliquer
              </button>

              {/* Aperçu du gradient personnalisé */}
              <div
                style={{
                  height: '60px',
                  borderRadius: '6px',
                  background: `linear-gradient(${customGradient.angle}deg, ${customGradient.start}, ${customGradient.end})`,
                  border: '1px solid #E8DDD3',
                }}
              />
            </div>
          </div>
        )}

        {/* Onglet Image */}
        {activeTab === 'image' && (
          <div>
            <p
              style={{
                fontSize: '12px',
                color: darkMode ? '#D4C5B5' : '#6B5E54',
                marginBottom: '8px',
              }}
            >
              Insérer une URL d'image pour l'arrière-plan
            </p>
            <form onSubmit={handleImageSubmit}>
              <input
                type="url"
                value={imageUrl}
                onChange={handleImageUrlChange}
                placeholder="https://exemple.com/image.jpg"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3',
                  borderRadius: '6px',
                  backgroundColor: darkMode ? '#1A1715' : '#FAF7F2',
                  color: darkMode ? '#FAF7F2' : '#3D3530',
                  fontSize: '13px',
                }}
                required
              />
              <button
                type="submit"
                style={{
                  marginTop: '8px',
                  width: '100%',
                  padding: '8px 12px',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: '#C67D5B',
                  color: '#FFF',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Appliquer l'image
              </button>
            </form>

            {/* Aperçu de l'image */}
            {background?.type === 'image' && (
              <div
                style={{
                  marginTop: '12px',
                  height: '100px',
                  borderRadius: '6px',
                  backgroundImage: `url(${background.value})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  border: '1px solid #E8DDD3',
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
});

/**
 * Éléments par défaut pour une nouvelle slide
 */
const DEFAULT_SLIDE_ELEMENTS = [
  {
    id: 'title-1',
    type: 'text',
    content: 'Titre de la slide',
    x: 40,
    y: 40,
    width: 300,
    height: 40,
    fontSize: 32,
    fontWeight: '700',
    color: '#3D3530',
    textAlign: 'left',
  },
  {
    id: 'subtitle-1',
    type: 'text',
    content: 'Sous-titre ou description',
    x: 40,
    y: 100,
    width: 300,
    height: 30,
    fontSize: 18,
    fontWeight: '400',
    color: '#6B5E54',
    textAlign: 'left',
  },
];

/**
 * Composant principal TrocoSlides
 */
const TrocoSlides = React.memo(({
  initialSlides = [
    {
      id: 'slide-1',
      elements: DEFAULT_SLIDE_ELEMENTS,
      background: { type: 'color', value: PREMIUM_COLORS.cream },
    },
  ],
  darkMode = false,
}) => {
  const [slides, setSlides] = useState(initialSlides);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [activeElementId, setActiveElementId] = useState(null);
  const [isBackgroundPanelOpen, setIsBackgroundPanelOpen] = useState(false);
  const slideContainerRef = useRef(null);

  const activeSlide = slides[activeSlideIndex] || { elements: [], background: { type: 'color', value: '#FAF7F2' } };
  const activeElement = activeSlide.elements.find(el => el.id === activeElementId);

  // Gestion des slides
  const addSlide = useCallback(() => {
    setSlides(prev => [
      ...prev,
      {
        id: `slide-${Date.now()}`,
        elements: DEFAULT_SLIDE_ELEMENTS,
        background: { type: 'color', value: PREMIUM_COLORS.cream },
      },
    ]);
    setActiveSlideIndex(slides.length);
  }, [slides.length]);

  const deleteSlide = useCallback(() => {
    if (slides.length <= 1) return;
    const newSlides = slides.filter((_, i) => i !== activeSlideIndex);
    setSlides(newSlides);
    setActiveSlideIndex(Math.max(0, activeSlideIndex - 1));
  }, [slides, activeSlideIndex]);

  const navigateSlide = useCallback((direction) => {
    const newIndex = activeSlideIndex + direction;
    if (newIndex >= 0 && newIndex < slides.length) {
      setActiveSlideIndex(newIndex);
    }
  }, [activeSlideIndex, slides.length]);

  // Gestion des éléments
  const updateElement = useCallback((elementId, updates) => {
    setSlides(prev => {
      const newSlides = [...prev];
      const slide = newSlides[activeSlideIndex];
      const elementIndex = slide.elements.findIndex(el => el.id === elementId);
      
      if (elementIndex !== -1) {
        slide.elements[elementIndex] = { ...slide.elements[elementIndex], ...updates };
      }
      
      return newSlides;
    });
  }, [activeSlideIndex]);

  const addElement = useCallback((type) => {
    const newElement = {
      id: `element-${Date.now()}`,
      type,
      ...(type === 'text' ? {
        content: 'Nouveau texte',
        x: 100,
        y: 100,
        width: 200,
        height: 30,
        fontSize: 16,
        color: darkMode ? '#FAF7F2' : '#3D3530',
      } : {
        src: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=400&q=80',
        x: 100,
        y: 100,
        width: 200,
        height: 150,
      }),
    };
    
    setSlides(prev => {
      const newSlides = [...prev];
      newSlides[activeSlideIndex].elements.push(newElement);
      return newSlides;
    });
    
    setActiveElementId(newElement.id);
  }, [activeSlideIndex, darkMode]);

  const deleteElement = useCallback((elementId) => {
    setSlides(prev => {
      const newSlides = [...prev];
      newSlides[activeSlideIndex].elements = newSlides[activeSlideIndex].elements.filter(
        el => el.id !== elementId
      );
      return newSlides;
    });
    setActiveElementId(null);
  }, [activeSlideIndex]);

  // Gestion de l"arrière-plan
  const updateBackground = useCallback((newBackground) => {
    setSlides(prev => {
      const newSlides = [...prev];
      newSlides[activeSlideIndex].background = newBackground;
      return newSlides;
    });
  }, [activeSlideIndex]);

  // Gestion des images (upload ou URL)
  const handleImageUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const newElement = {
        id: `image-${Date.now()}`,
        type: 'image',
        src: event.target?.result,
        x: 100,
        y: 100,
        width: 200,
        height: 150,
      };
      
      setSlides(prev => {
        const newSlides = [...prev];
        newSlides[activeSlideIndex].elements.push(newElement);
        return newSlides;
      });
      
      setActiveElementId(newElement.id);
    };
    reader.readAsDataURL(file);
  }, [activeSlideIndex]);

  // Génération du style de l"arrière-plan
  const getBackgroundStyle = useCallback((bg) => {
    if (!bg) return { backgroundColor: darkMode ? '#1A1715' : '#FAF7F2' };
    
    switch (bg.type) {
      case 'color':
        return { backgroundColor: bg.value };
      case 'gradient':
        return {
          background: `linear-gradient(${bg.value.angle}deg, ${bg.value.start}, ${bg.value.end})`,
        };
      case 'image':
        return {
          backgroundImage: `url(${bg.value})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        };
      default:
        return { backgroundColor: darkMode ? '#1A1715' : '#FAF7F2' };
    }
  }, [darkMode]);

  // Calcul de la position d'un élément pour le rendu
  const getElementStyle = useCallback((element) => {
    if (element.type === 'text') {
      return {
        position: 'absolute',
        left: `${element.x}px`,
        top: `${element.y}px`,
        width: `${element.width}px`,
        minHeight: `${element.height}px`,
        fontSize: `${element.fontSize}px`,
        fontWeight: element.fontWeight || '400',
        color: darkMode ? (element.color === '#3D3530' ? '#FAF7F2' : element.color) : element.color,
        textAlign: element.textAlign || 'left',
        fontFamily: 'var(--font-family-main)',
        outline: activeElementId === element.id ? '2px solid #C67D5B' : 'none',
        cursor: 'text',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        padding: '4px',
      };
    } else if (element.type === 'image') {
      return {
        position: 'absolute',
        left: `${element.x}px`,
        top: `${element.y}px`,
        width: `${element.width}px`,
        height: `${element.height}px`,
        cursor: activeElementId === element.id ? 'grab' : 'pointer',
        border: activeElementId === element.id ? '2px solid #C67D5B' : 'none',
        boxShadow: activeElementId === element.id ? '0 0 0 2px rgba(198,125,91,0.3)' : 'none',
      };
    }
    return {};
  }, [activeElementId, darkMode]);

  // Gestion du clic sur un élément
  const handleElementClick = useCallback((e, element) => {
    e.stopPropagation();
    setActiveElementId(element.id);
  }, []);

  // Gestion du clic sur le fond (désélection)
  const handleSlideClick = useCallback((e) => {
    if (e.target === e.currentTarget) {
      setActiveElementId(null);
    }
  }, []);

  // Rendu d'un élément
  const renderElement = useCallback((element) => {
    switch (element.type) {
      case 'text':
        return (
          <EditableTextElement
            key={element.id}
            id={element.id}
            content={element.content}
            style={getElementStyle(element)}
            onUpdate={(id, newContent) => updateElement(id, { content: newContent })}
            fontSize={element.fontSize}
            fontWeight={element.fontWeight}
            color={element.color}
            darkMode={darkMode}
          />
        );
      case 'image':
        return (
          <DraggableImage
            key={element.id}
            id={element.id}
            src={element.src}
            position={{ x: element.x, y: element.y }}
            size={{ width: element.width, height: element.height }}
            onUpdate={({ position, size }) => {
              updateElement(element.id, {
                x: position.x,
                y: position.y,
                width: size.width,
                height: size.height,
              });
            }}
            darkMode={darkMode}
            isActive={activeElementId === element.id}
          />
        );
      default:
        return null;
    }
  }, [getElementStyle, updateElement, activeElementId, darkMode]);

  // Style du container de slides
  const containerStyle = {
    position: 'relative',
    width: '100%',
    height: '100vh',
    backgroundColor: darkMode ? '#1A1715' : '#FAF7F2',
    overflow: 'hidden',
    fontFamily: 'var(--font-family-main)',
  };

  // Style de la slide
  const slideStyle = {
    position: 'absolute',
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.3s ease',
    ...getBackgroundStyle(activeSlide.background),
  };

  // Style de la zone de travail
  const workspaceStyle = {
    position: 'relative',
    width: '800px',
    height: '600px',
    margin: 'auto',
    boxShadow: '0 10px 40px rgba(61,53,48,0.3)',
    borderRadius: '12px',
    overflow: 'hidden',
    border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3',
  };

  // Style de la barre d'outils
  const toolbarStyle = {
    position: 'fixed',
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: darkMode ? 'rgba(26,23,21,0.95)' : 'rgba(250,247,242,0.95)',
    backdropFilter: 'blur(20px)',
    borderRadius: '12px',
    border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3',
    boxShadow: '0 8px 24px rgba(61,53,48,0.2)',
    zIndex: 1000,
  };

  // Style des boutons de la barre d'outils
  const toolButtonStyle = {
    padding: '8px 12px',
    border: 'none',
    borderRadius: '8px',
    backgroundColor: darkMode ? '#1A1715' : '#FAF7F2',
    color: darkMode ? '#D4C5B5' : '#6B5E54',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    transition: 'all 0.2s ease',
  };

  return (
    <div style={containerStyle}>
      {/* Panel latéral pour l'arrière-plan */}
      {isBackgroundPanelOpen && (
        <BackgroundPanel
          background={activeSlide.background}
          onBackgroundChange={updateBackground}
          darkMode={darkMode}
        />
      )}

      {/* Zone de travail */}
      <div style={workspaceStyle} onClick={handleSlideClick}>
        {/* Slide active */}
        <div
          style={slideStyle}
          onClick={handleSlideClick}
        >
          {/* Éléments de la slide */}
          {activeSlide.elements.map(renderElement)}
        </div>

        {/* Indicateurs de slides */}
        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '8px',
            padding: '8px 12px',
            backgroundColor: darkMode ? 'rgba(26,23,21,0.9)' : 'rgba(250,247,242,0.9)',
            backdropFilter: 'blur(10px)',
            borderRadius: '8px',
            border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3',
          }}
        >
          {slides.map((_, index) => (
            <button
              key={`slide-indicator-${index}`}
              onClick={() => setActiveSlideIndex(index)}
              style={{
                width: '32px',
                height: '4px',
                borderRadius: '2px',
                backgroundColor: activeSlideIndex === index ? '#C67D5B' : darkMode ? '#D4C5B5' : '#E8DDD3',
                border: 'none',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease',
              }}
              aria-label={`Aller à la slide ${index + 1}`}
            />
          ))}
          <button
            onClick={addSlide}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: '#C67D5B',
              border: 'none',
              color: '#FFF',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              transition: 'transform 0.2s ease',
            }}
            aria-label="Ajouter une slide"
          >
            +
          </button>
        </div>

        {/* Contrôles de navigation des slides */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '10px',
            transform: 'translateY(-50%)',
            display: 'flex',
            gap: '8px',
            zIndex: 10,
          }}
        >
          <button
            onClick={() => navigateSlide(-1)}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: darkMode ? 'rgba(26,23,21,0.8)' : 'rgba(250,247,242,0.8)',
              border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3',
              color: darkMode ? '#FAF7F2' : '#3D3530',
              cursor: activeSlideIndex > 0 ? 'pointer' : 'not-allowed',
              opacity: activeSlideIndex > 0 ? 1 : 0.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}
            disabled={activeSlideIndex === 0}
            aria-label="Slide précédente"
          >
            ←
          </button>
        </div>
        <div
          style={{
            position: 'absolute',
            top: '50%',
            right: '10px',
            transform: 'translateY(-50%)',
            display: 'flex',
            gap: '8px',
            zIndex: 10,
          }}
        >
          <button
            onClick={() => navigateSlide(1)}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: darkMode ? 'rgba(26,23,21,0.8)' : 'rgba(250,247,242,0.8)',
              border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3',
              color: darkMode ? '#FAF7F2' : '#3D3530',
              cursor: activeSlideIndex < slides.length - 1 ? 'pointer' : 'not-allowed',
              opacity: activeSlideIndex < slides.length - 1 ? 1 : 0.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}
            disabled={activeSlideIndex === slides.length - 1}
            aria-label="Slide suivante"
          >
            →
          </button>
        </div>
      </div>

      {/* Barre d'outils */}
      <div style={toolbarStyle}>
        <button
          onClick={() => addElement('text')}
          style={toolButtonStyle}
          aria-label="Ajouter du texte"
        >
          📝 Texte
        </button>
        
        <label
          style={{
            ...toolButtonStyle,
            padding: '8px',
          }}
        >
          🖼️ Image
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            style={{
              display: 'none',
            }}
          />
        </label>
        
        <button
          onClick={() => setIsBackgroundPanelOpen(prev => !prev)}
          style={{
            ...toolButtonStyle,
            backgroundColor: isBackgroundPanelOpen ? '#C67D5B' : toolButtonStyle.backgroundColor,
            color: isBackgroundPanelOpen ? '#FFF' : toolButtonStyle.color,
          }}
          aria-label="Changer l'arrière-plan"
        >
          🎨 Arrière-plan
        </button>
        
        <button
          onClick={deleteSlide}
          disabled={slides.length <= 1}
          style={{
            ...toolButtonStyle,
            backgroundColor: slides.length <= 1 
              ? darkMode ? '#1A1715' : '#F5F0E8'
              : '#EF4444',
            color: slides.length <= 1 
              ? darkMode ? '#D4C5B5' : '#6B5E54'
              : '#FFF',
          }}
          aria-label="Supprimer la slide"
        >
          🗑️ Supprimer
        </button>

        {activeElementId && (
          <button
            onClick={() => deleteElement(activeElementId)}
            style={{
              ...toolButtonStyle,
              backgroundColor: '#EF4444',
              color: '#FFF',
            }}
            aria-label="Supprimer l'élément"
          >
            🗑️ Supprimer l'élément
          </button>
        )}
      </div>

      {/* Info bulle pour l'élément actif */}
      {activeElementId && activeElement && (
        <div
          style={{
            position: 'fixed',
            bottom: '90px',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '12px 16px',
            backgroundColor: darkMode ? 'rgba(26,23,21,0.95)' : 'rgba(250,247,242,0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: '12px',
            border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3',
            boxShadow: '0 8px 24px rgba(61,53,48,0.2)',
            zIndex: 1000,
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
          }}
        >
          <span
            style={{
              fontSize: '13px',
              fontWeight: '600',
              color: darkMode ? '#FAF7F2' : '#3D3530',
            }}
          >
            {activeElement.type === 'text' ? 'Texte' : 'Image'} sélectionné
          </span>
          
          {activeElement.type === 'text' && (
            <div
              style={{
                display: 'flex',
                gap: '8px',
              }}
            >
              <select
                value={activeElement.fontSize}
                onChange={(e) => updateElement(activeElementId, { fontSize: parseInt(e.target.value) })}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3',
                  backgroundColor: darkMode ? '#1A1715' : '#FAF7F2',
                  color: darkMode ? '#FAF7F2' : '#3D3530',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                <option value={12}>12px</option>
                <option value={14}>14px</option>
                <option value={16}>16px</option>
                <option value={18}>18px</option>
                <option value={20}>20px</option>
                <option value={24}>24px</option>
                <option value={28}>28px</option>
                <option value={32}>32px</option>
                <option value={36}>36px</option>
                <option value={48}>48px</option>
              </select>
              
              <select
                value={activeElement.fontWeight || '400'}
                onChange={(e) => updateElement(activeElementId, { fontWeight: e.target.value })}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3',
                  backgroundColor: darkMode ? '#1A1715' : '#FAF7F2',
                  color: darkMode ? '#FAF7F2' : '#3D3530',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                <option value="400">Normal</option>
                <option value="600">Semi-Gras</option>
                <option value="700">Gras</option>
              </select>

              <select
                value={activeElement.color || (darkMode ? '#FAF7F2' : '#3D3530')}
                onChange={(e) => updateElement(activeElementId, { color: e.target.value })}
                style={{
                  padding: '4px',
                  borderRadius: '6px',
                  border: darkMode ? '1px solid rgba(232,221,211,0.15)' : '1px solid #E8DDD3',
                  backgroundColor: darkMode ? '#1A1715' : '#FAF7F2',
                  cursor: 'pointer',
                }}
              >
                <option value="#3D3530" style={{ color: '#3D3530' }}>Noir</option>
                <option value="#FAF7F2" style={{ color: '#3D3530' }}>Blanc</option>
                <option value="#C67D5B" style={{ color: '#C67D5B' }}>Terracotta</option>
                <option value="#A8644A" style={{ color: '#A8644A' }}>Terracotta Foncé</option>
                <option value="#F59E0B" style={{ color: '#F59E0B' }}>Accent</option>
                <option value="#10B981" style={{ color: '#10B981' }}>Vert</option>
                <option value="#EF4444" style={{ color: '#EF4444' }}>Rouge</option>
              </select>
            </div>
          )}
        </div>
      )}

      {/* CSS global pour le component */}
      <style>{`
        @keyframes ripple {
          to {
            transform: scale(4);
            opacity: 0;
          }
        }
        
        .resize-handle {
          transition: all 0.1s ease;
        }
        
        .resize-handle:hover {
          transform: scale(1.2);
          box-shadow: 0 0 0 2px rgba(198,125,91,0.5);
        }
        
        [contenteditable]:focus {
          outline: 2px solid #C67D5B;
          outline-offset: 2px;
        }
        
        [contenteditable]:empty::before {
          content: attr(placeholder);
          color: #999;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
});

// Export par défaut pour l'utilisation
TrocoSlides.displayName = 'TrocoSlides';

export default TrocoSlides;
