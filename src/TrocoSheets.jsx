import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';

/**
 * TROCO SHEETS - Tableur avancé avec:
 * - Autocomplétion de formules (SUM, AVERAGE, MIN, MAX)
 * - Poignée d'incrémentation (drag-to-fill) pour copier le contenu ou les formules
 */

// Couleurs du thème Troco
const TROCO_COLORS = {
  primary: '#C67D5B',
  primaryDark: '#A8644A',
  primaryLight: '#D4C5B5',
  text: '#3D3530',
  textLight: '#6B5E54',
  textDark: '#FAF7F2',
  background: '#FAF7F2',
  backgroundDark: '#1A1715',
  border: '#E8DDD3',
  borderDark: 'rgba(232,221,211,0.15)',
  accent: '#F59E0B',
  success: '#10B981',
  error: '#EF4444',
};

// Formules disponibles pour l'autocomplétion
const AVAILABLE_FORMULAS = [
  {
    name: 'SUM',
    description: 'Somme des valeurs',
    syntax: 'SUM(range)',
    example: 'SUM(A1:A10)',
    args: ['range'],
    execute: (sheetData, range) => {
      const values = extractRangeValues(sheetData, range);
      return values.reduce((sum, val) => {
        const num = parseFloat(val);
        return sum + (isNaN(num) ? 0 : num);
      }, 0);
    },
  },
  {
    name: 'AVERAGE',
    description: 'Moyenne des valeurs',
    syntax: 'AVERAGE(range)',
    example: 'AVERAGE(A1:A10)',
    args: ['range'],
    execute: (sheetData, range) => {
      const values = extractRangeValues(sheetData, range);
      const numericValues = values.filter(v => !isNaN(parseFloat(v)));
      if (numericValues.length === 0) return 0;
      const sum = numericValues.reduce((s, v) => s + parseFloat(v), 0);
      return sum / numericValues.length;
    },
  },
  {
    name: 'MIN',
    description: 'Valeur minimale',
    syntax: 'MIN(range)',
    example: 'MIN(A1:A10)',
    args: ['range'],
    execute: (sheetData, range) => {
      const values = extractRangeValues(sheetData, range);
      const numericValues = values.map(v => parseFloat(v)).filter(v => !isNaN(v));
      return numericValues.length > 0 ? Math.min(...numericValues) : 0;
    },
  },
  {
    name: 'MAX',
    description: 'Valeur maximale',
    syntax: 'MAX(range)',
    example: 'MAX(A1:A10)',
    args: ['range'],
    execute: (sheetData, range) => {
      const values = extractRangeValues(sheetData, range);
      const numericValues = values.map(v => parseFloat(v)).filter(v => !isNaN(v));
      return numericValues.length > 0 ? Math.max(...numericValues) : 0;
    },
  },
  {
    name: 'COUNT',
    description: 'Nombre de cellules',
    syntax: 'COUNT(range)',
    example: 'COUNT(A1:A10)',
    args: ['range'],
    execute: (sheetData, range) => {
      const values = extractRangeValues(sheetData, range);
      return values.length;
    },
  },
  {
    name: 'PRODUCT',
    description: 'Produit des valeurs',
    syntax: 'PRODUCT(range)',
    example: 'PRODUCT(A1:A10)',
    args: ['range'],
    execute: (sheetData, range) => {
      const values = extractRangeValues(sheetData, range);
      return values.reduce((prod, val) => {
        const num = parseFloat(val);
        return prod * (isNaN(num) ? 1 : num);
      }, 1);
    },
  },
];

// Taille des cellules par défaut
const DEFAULT_CELL_SIZE = {
  width: 100,
  height: 40,
};

// Taille de la poignée d'incrémentation
const FILL_HANDLE_SIZE = 8;
const FILL_HANDLE_COLOR = '#C67D5B';

/**
 * Extraire les valeurs d'une plage (ex: "A1:B10")
 */
const extractRangeValues = (sheetData, range) => {
  const [start, end] = range.split(':').map(parseCellRef);
  if (!start || !end) return [];

  const minCol = Math.min(start.col, end.col);
  const maxCol = Math.max(start.col, end.col);
  const minRow = Math.min(start.row, end.row);
  const maxRow = Math.max(start.row, end.row);

  const values = [];
  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      const cell = sheetData[`${colToLetter(c)}${r}`];
      values.push(cell?.value || '');
    }
  }
  return values;
};

/**
 * Parser une référence de cellule (ex: "A1" → { col: 0, row: 0 })
 */
const parseCellRef = (ref) => {
  const match = ref.match(/^([A-Za-z]+)(\d+)$/);
  if (!match) return null;
  
  const colStr = match[1].toUpperCase();
  const row = parseInt(match[2]) - 1;
  
  let col = 0;
  for (let i = 0; i < colStr.length; i++) {
    col = col * 26 + (colStr.charCodeAt(i) - 'A'.charCodeAt(0) + 1);
  }
  col -= 1;
  
  return { col, row };
};

/**
 * Convertir un index de colonne en lettre (0 → "A", 25 → "Z", 26 → "AA")
 */
const colToLetter = (col) => {
  let result = '';
  while (col >= 0) {
    result = String.fromCharCode('A'.charCodeAt(0) + (col % 26)) + result;
    col = Math.floor(col / 26) - 1;
  }
  return result;
};

/**
 * Convertir un index de ligne en numéro (0 → "1")
 */
const rowToNumber = (row) => (row + 1).toString();

/**
 * Obtenir la référence de cellule (ex: { col: 0, row: 0 } → "A1")
 */
const getCellRef = (col, row) => `${colToLetter(col)}${rowToNumber(row)}`;

/**
 * Parser une formule et l'exécuter
 */
const executeFormula = (formula, sheetData) => {
  if (!formula.startsWith('=')) return formula;
  
  const cleanFormula = formula.substring(1).trim().toUpperCase();
  
  for (const func of AVAILABLE_FORMULAS) {
    const match = cleanFormula.match(new RegExp(`^${func.name}\((.*)\)$`, 'i'));
    if (match) {
      const args = parseArguments(match[1]);
      if (args.length === func.args.length) {
        try {
          return func.execute(sheetData, ...args);
        } catch (e) {
          console.error(`Erreur dans la formule ${func.name}:`, e);
          return '#ERROR';
        }
      }
    }
  }
  
  return '#FORMULA?';
};

/**
 * Parser les arguments d'une formule
 */
const parseArguments = (argString) => {
  // Simple parser pour les plages
  return argString.split(',').map(arg => arg.trim());
};

/**
 * Évaluer une valeur de cellule (formule ou valeur brute)
 */
const evaluateCellValue = (value, sheetData) => {
  if (typeof value === 'string' && value.startsWith('=')) {
    return executeFormula(value, sheetData);
  }
  return value;
};

/**
 * Hook personnalisé pour la poignée d'incrémentation
 */
const useFillHandle = (cellRef, activeCell, onFill) => {
  const handleRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startCell, setStartCell] = useState(null);
  const [fillDirection, setFillDirection] = useState(null); // 'right', 'down', 'both'

  const handlePointerDown = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
    
    setIsDragging(true);
    setStartCell({ ...activeCell });
    
    // Déterminer la direction en fonction de la position du curseur
    const rect = handleRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    
    if (Math.abs(angle) < Math.PI / 4) {
      setFillDirection('right');
    } else if (Math.abs(angle) > 3 * Math.PI / 4) {
      setFillDirection('left');
    } else if (angle > 0) {
      setFillDirection('down');
    } else {
      setFillDirection('up');
    }
    
    // Capture du pointer
    handleRef.current?.setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e) => {
    if (!isDragging || !startCell || !fillDirection) return;
    
    const container = e.currentTarget.closest('.troco-sheet-grid');
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const cellRect = container.querySelector(`[data-col="${startCell.col}"][data-row="${startCell.row}"]`)?.getBoundingClientRect();
    if (!cellRect) return;
    
    const cellWidth = cellRect.width;
    const cellHeight = cellRect.height;
    
    const col = Math.floor((e.clientX - rect.left) / cellWidth);
    const row = Math.floor((e.clientY - rect.top) / cellHeight);
    
    const minCol = Math.min(startCell.col, col);
    const maxCol = Math.max(startCell.col, col);
    const minRow = Math.min(startCell.row, row);
    const maxRow = Math.max(startCell.row, row);
    
    // Sélectionner la plage à remplir
    const cellsToFill = [];
    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        if (c !== startCell.col || r !== startCell.row) {
          cellsToFill.push({ col: c, row: r });
        }
      }
    }
    
    onFill?.(startCell, cellsToFill, fillDirection);
  }, [isDragging, startCell, fillDirection, onFill]);

  const handlePointerUp = useCallback((e) => {
    setIsDragging(false);
    setStartCell(null);
    setFillDirection(null);
    
    if (handleRef.current) {
      handleRef.current.releasePointerCapture(e.pointerId);
    }
  }, []);

  // Effet pour ajouter/retirer les event listeners
  useEffect(() => {
    const handle = handleRef.current;
    if (!handle) return;
    
    handle.addEventListener('pointerdown', handlePointerDown, { passive: false });
    
    return () => {
      handle.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [handlePointerDown]);

  // Style de la poignée
  const handleStyle = useMemo(() => ({
    position: 'absolute',
    width: `${FILL_HANDLE_SIZE}px`,
    height: `${FILL_HANDLE_SIZE}px`,
    backgroundColor: FILL_HANDLE_COLOR,
    borderRadius: '0 0 0 2px',
    cursor: 'crosshair',
    right: '-4px',
    bottom: '-4px',
    zIndex: 100,
    boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
    transition: 'transform 0.1s ease',
    ...(isDragging ? { transform: 'scale(1.2)' } : {}),
  }), [isDragging]);

  return {
    handleRef,
    handleStyle,
    isDragging,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
};

/**
 * Composant pour une cellule du tableur
 */
const SheetCell = React.memo(({
  col,
  row,
  value,
  onChange,
  onSelect,
  onFill,
  activeCell,
  isSelected,
  darkMode,
  formulaSuggestions,
  onFormulaSelect,
  showFormulaList,
  onShowFormulaList,
}) => {
  const cellRef = useRef(null);
  const inputRef = useRef(null);
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value || '');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const cellKey = `${colToLetter(col)}${rowToNumber(row)}`;

  // Hook pour la poignée d'incrémentation
  const { handleRef, handleStyle, handlePointerMove, handlePointerUp } = useFillHandle(
    cellKey,
    activeCell,
    onFill
  );

  // Gestion de l'édition
  const handleDoubleClick = useCallback((e) => {
    e.stopPropagation();
    setIsEditing(true);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, 10);
  }, []);

  const handleClick = useCallback((e) => {
    e.stopPropagation();
    onSelect?.({ col, row });
  }, [col, row, onSelect]);

  const handleInputChange = useCallback((e) => {
    setLocalValue(e.target.value);
    
    // Détecter le début d'une formule
    if (e.target.value.startsWith('=')) {
      onShowFormulaList?.(cellKey, true);
    } else {
      onShowFormulaList?.(cellKey, false);
    }
  }, [cellKey, onShowFormulaList]);

  const handleInputKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      handleInputSubmit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setLocalValue(value || '');
    }
  }, [value]);

  const handleInputSubmit = useCallback(() => {
    onChange?.(cellKey, localValue);
    setIsEditing(false);
    onShowFormulaList?.(cellKey, false);
  }, [cellKey, localValue, onChange, onShowFormulaList]);

  const handleInputBlur = useCallback(() => {
    onChange?.(cellKey, localValue);
    setIsEditing(false);
    onShowFormulaList?.(cellKey, false);
  }, [cellKey, localValue, onChange, onShowFormulaList]);

  // Sélection d'une formule depuis la liste
  const handleSelectFormula = useCallback((formulaName) => {
    setLocalValue(`=${formulaName}()`);
    setShowSuggestions(false);
    if (inputRef.current) {
      inputRef.current.focus();
      // Placer le curseur avant la parenthèse
      const cursorPos = localValue.length - 1;
      inputRef.current.setSelectionRange(cursorPos, cursorPos);
    }
    onFormulaSelect?.(cellKey, formulaName);
  }, [cellKey, localValue, onFormulaSelect]);

  // Afficher/cacher les suggestions
  useEffect(() => {
    if (showFormulaList === cellKey && localValue.startsWith('=')) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [showFormulaList, cellKey, localValue]);

  // Style de la cellule
  const cellStyle = useMemo(() => ({
    position: 'relative',
    minWidth: `${DEFAULT_CELL_SIZE.width}px`,
    minHeight: `${DEFAULT_CELL_SIZE.height}px`,
    padding: '8px',
    border: isSelected 
      ? `2px solid ${TROCO_COLORS.primary}`
      : darkMode 
        ? `1px solid ${TROCO_COLORS.borderDark}`
        : `1px solid ${TROCO_COLORS.border}`,
    backgroundColor: isSelected 
      ? darkMode 
        ? 'rgba(198,125,91,0.2)'
        : 'rgba(198,125,91,0.1)'
      : darkMode 
        ? '#1A1715'
        : '#FAF7F2',
    color: darkMode ? '#FAF7F2' : '#3D3530',
    fontSize: '14px',
    fontFamily: 'var(--font-family-main)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: isEditing ? 'flex-start' : 'flex-start',
    cursor: 'pointer',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s ease',
    boxSizing: 'border-box',
  }), [isSelected, darkMode, isEditing]);

  // Style de l'input
  const inputStyle = useMemo(() => ({
    width: '100%',
    border: 'none',
    background: 'transparent',
    color: darkMode ? '#FAF7F2' : '#3D3530',
    fontSize: '14px',
    fontFamily: 'var(--font-family-main)',
    padding: '0',
    outline: 'none',
    boxShadow: 'none',
  }), [darkMode]);

  // Afficher la valeur évaluée si ce n'est pas une formule
  const displayValue = useMemo(() => {
    if (typeof value === 'string' && value.startsWith('=')) {
      return value; // Affiche la formule
    }
    return value;
  }, [value]);

  return (
    <div
      ref={cellRef}
      data-col={col}
      data-row={row}
      data-cell={cellKey}
      style={cellStyle}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={localValue}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          onBlur={handleInputBlur}
          style={inputStyle}
          autoFocus
        />
      ) : (
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {displayValue || ''}
        </span>
      )}

      {/* Poignée d'incrémentation (visible uniquement sur la cellule active) */}
      {activeCell && activeCell.col === col && activeCell.row === row && (
        <div
          ref={handleRef}
          style={handleStyle}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
      )}

      {/* Liste déroulante des formules */}
      {showSuggestions && formulaSuggestions.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            minWidth: '200px',
            backgroundColor: darkMode ? '#1A1715' : '#FAF7F2',
            border: darkMode ? `1px solid ${TROCO_COLORS.borderDark}` : `1px solid ${TROCO_COLORS.border}`,
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(61,53,48,0.2)',
            zIndex: 1000,
            padding: '4px',
          }}
          onMouseLeave={() => setShowSuggestions(false)}
        >
          {formulaSuggestions.map((formula) => (
            <button
              key={formula.name}
              onClick={() => handleSelectFormula(formula.name)}
              style={{
                width: '100%',
                padding: '6px 8px',
                border: 'none',
                background: 'transparent',
                color: darkMode ? '#FAF7F2' : '#3D3530',
                textAlign: 'left',
                fontSize: '13px',
                cursor: 'pointer',
                borderRadius: '4px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = darkMode 
                  ? 'rgba(255,255,255,0.05)' 
                  : 'rgba(198,125,91,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <span>= {formula.name}</span>
              <span
                style={{
                  fontSize: '11px',
                  color: darkMode ? '#D4C5B5' : '#6B5E54',
                }}
              >
                {formula.description}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

/**
 * Composant principal TrocoSheets
 */
const TrocoSheets = React.memo(({
  initialRows = 20,
  initialCols = 10,
  initialData = {},
  darkMode = false,
}) => {
  const [rows, setRows] = useState(initialRows);
  const [cols, setCols] = useState(initialCols);
  const [data, setData] = useState(() => {
    // Initialiser avec les données fournies ou vides
    const initial = { ...initialData };
    return initial;
  });
  const [activeCell, setActiveCell] = useState(null);
  const [selectedCells, setSelectedCells] = useState([]);
  const [formulaSuggestions, setFormulaSuggestions] = useState([]);
  const [showFormulaList, setShowFormulaList] = useState(null);
  const [showFillIndicator, setShowFillIndicator] = useState(null);
  const gridRef = useRef(null);

  // Calculer la plage sélectionnée
  const selectionRange = useMemo(() => {
    if (selectedCells.length === 0) return null;
    
    let minCol = Infinity, maxCol = -Infinity, minRow = Infinity, maxRow = -Infinity;
    
    selectedCells.forEach(cell => {
      minCol = Math.min(minCol, cell.col);
      maxCol = Math.max(maxCol, cell.col);
      minRow = Math.min(minRow, cell.row);
      maxRow = Math.max(maxRow, cell.row);
    });
    
    return {
      start: { col: minCol, row: minRow },
      end: { col: maxCol, row: maxRow },
    };
  }, [selectedCells]);

  // Générer les refs de colonne (A, B, C, ...)
  const columnHeaders = useMemo(() => {
    const headers = [];
    for (let i = 0; i < cols; i++) {
      headers.push(colToLetter(i));
    }
    return headers;
  }, [cols]);

  // Générer les numéros de ligne (1, 2, 3, ...)
  const rowHeaders = useMemo(() => {
    const headers = [];
    for (let i = 0; i < rows; i++) {
      headers.push(i + 1);
    }
    return headers;
  }, [rows]);

  // Gestion des cellules
  const handleCellSelect = useCallback((cell) => {
    // Si Ctrl ou Cmd est pressé, ajouter à la sélection
    const isMultiSelect = navigator.platform.includes('Mac') 
      ? window.event.metaKey 
      : window.event.ctrlKey;
    
    if (isMultiSelect && activeCell && activeCell.col === cell.col && activeCell.row === cell.row) {
      // Clic sur la cellule active avec Ctrl/Cmd → désélectionner
      setSelectedCells(prev => prev.filter(c => !(c.col === cell.col && c.row === cell.row)));
    } else if (isMultiSelect) {
      // Ajouter à la sélection
      setSelectedCells(prev => {
        const exists = prev.some(c => c.col === cell.col && c.row === cell.row);
        if (exists) {
          return prev.filter(c => !(c.col === cell.col && c.row === cell.row));
        }
        return [...prev, cell];
      });
    } else if (window.event.shiftKey && activeCell) {
      // Sélection étendue
      const startCol = Math.min(activeCell.col, cell.col);
      const endCol = Math.max(activeCell.col, cell.col);
      const startRow = Math.min(activeCell.row, cell.row);
      const endRow = Math.max(activeCell.row, cell.row);
      
      const newSelected = [];
      for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol; c <= endCol; c++) {
          newSelected.push({ col: c, row: r });
        }
      }
      setSelectedCells(newSelected);
    } else {
      // Sélection simple
      setActiveCell(cell);
      setSelectedCells([cell]);
    }
  }, [activeCell]);

  const handleCellChange = useCallback((cellKey, newValue) => {
    setData(prev => ({
      ...prev,
      [cellKey]: { value: newValue },
    }));
  }, []);

  // Gestion de l'autocomplétion des formules
  const handleShowFormulaList = useCallback((cellKey, show) => {
    if (show) {
      setShowFormulaList(cellKey);
      setFormulaSuggestions(AVAILABLE_FORMULAS);
    } else {
      setShowFormulaList(null);
      setFormulaSuggestions([]);
    }
  }, []);

  const handleFormulaSelect = useCallback((cellKey, formulaName) => {
    // Ne rien faire ici, c'est géré dans le composant SheetCell
  }, []);

  // Gestion du drag-to-fill (poignée d'incrémentation)
  const handleFill = useCallback((startCell, cellsToFill, direction) => {
    const startKey = `${colToLetter(startCell.col)}${rowToNumber(startCell.row)}`;
    const startValue = data[startKey]?.value || '';
    
    // Ne pas remplir si la cellule de départ est vide
    if (!startValue) return;
    
    const newData = { ...data };
    
    cellsToFill.forEach(cell => {
      const cellKey = `${colToLetter(cell.col)}${rowToNumber(cell.row)}`;
      
      // Si la valeur de départ est une formule, mettre à jour les références
      if (typeof startValue === 'string' && startValue.startsWith('=')) {
        // Extraire la plage de la formule (très basique)
        const match = startValue.match(/=(\w+)\(([A-Za-z]+\d+(?::[A-Za-z]+\d+)*)\)/i);
        if (match) {
          const formulaName = match[1].toUpperCase();
          const range = match[2];
          
          const [startRange, endRange] = range.split(':').map(parseCellRef);
          if (startRange && endRange) {
            // Calculer l'offset
            const colOffset = cell.col - startCell.col;
            const rowOffset = cell.row - startCell.row;
            
            // Mettre à jour les références de la plage
            const newStartCol = colToLetter(startRange.col + colOffset);
            const newStartRow = rowToNumber(startRange.row + rowOffset);
            const newEndCol = colToLetter(endRange.col + colOffset);
            const newEndRow = rowToNumber(endRange.row + rowOffset);
            
            newData[cellKey] = { value: `=${formulaName}(${newStartCol}${newStartRow}:${newEndCol}${newEndRow})` };
          } else {
            // Simple copie de la formule
            newData[cellKey] = { value: startValue };
          }
        } else {
          // Simple copie de la formule
          newData[cellKey] = { value: startValue };
        }
      } else {
        // Copie simple de la valeur
        newData[cellKey] = { value: startValue };
      }
    });
    
    setData(newData);
  }, [data]);

  // Ajouter des lignes
  const addRows = useCallback((count = 1) => {
    setRows(prev => Math.min(prev + count, 1000));
  }, []);

  // Ajouter des colonnes
  const addCols = useCallback((count = 1) => {
    setCols(prev => Math.min(prev + count, 50));
  }, []);

  // Supprimer des lignes
  const removeRows = useCallback(() => {
    if (rows <= 5) return;
    setRows(prev => Math.max(prev - 1, 5));
  }, [rows]);

  // Supprimer des colonnes
  const removeCols = useCallback(() => {
    if (cols <= 3) return;
    setCols(prev => Math.max(prev - 1, 3));
  }, [cols]);

  // Gestion du clic en dehors (désélection)
  const handleBackgroundClick = useCallback((e) => {
    if (e.target === gridRef.current) {
      setActiveCell(null);
      setSelectedCells([]);
    }
  }, []);

  // Gestion des touches du clavier
  const handleKeyDown = useCallback((e) => {
    if (!activeCell) return;
    
    const { col, row } = activeCell;
    let newCol = col;
    let newRow = row;
    
    switch (e.key) {
      case 'ArrowRight':
        newCol = Math.min(col + 1, cols - 1);
        break;
      case 'ArrowLeft':
        newCol = Math.max(col - 1, 0);
        break;
      case 'ArrowDown':
        newRow = Math.min(row + 1, rows - 1);
        break;
      case 'ArrowUp':
        newRow = Math.max(row - 1, 0);
        break;
      case 'Tab':
        newCol = Math.min(col + 1, cols - 1);
        if (newCol === col) {
          newRow = Math.min(row + 1, rows - 1);
          newCol = 0;
        }
        break;
      case 'Enter':
        newRow = Math.min(row + 1, rows - 1);
        break;
      case 'Backspace':
      case 'Delete':
        const cellKey = `${colToLetter(col)}${rowToNumber(row)}`;
        handleCellChange(cellKey, '');
        return;
      default:
        return;
    }
    
    e.preventDefault();
    setActiveCell({ col: newCol, row: newRow });
    setSelectedCells([{ col: newCol, row: newRow }]);
  }, [activeCell, cols, rows, handleCellChange]);

  // Style du grid container
  const containerStyle = useMemo(() => ({
    position: 'relative',
    width: '100%',
    height: '100vh',
    backgroundColor: darkMode ? '#0F0D0B' : '#FAF7F2',
    overflow: 'auto',
    fontFamily: 'var(--font-family-main)',
  }), [darkMode]);

  // Style du grid
  const gridStyle = useMemo(() => ({
    position: 'relative',
    display: 'inline-grid',
    gridTemplateColumns: `repeat(${cols}, ${DEFAULT_CELL_SIZE.width}px)`,
    gridAutoRows: `${DEFAULT_CELL_SIZE.height}px`,
    border: darkMode ? `1px solid ${TROCO_COLORS.borderDark}` : `1px solid ${TROCO_COLORS.border}`,
    backgroundColor: darkMode ? '#1A1715' : '#FAF7F2',
    minWidth: `${cols * DEFAULT_CELL_SIZE.width}px`,
    minHeight: `${rows * DEFAULT_CELL_SIZE.height}px`,
    boxSizing: 'border-box',
  }), [cols, rows, darkMode]);

  // Style des en-têtes de colonne
  const headerCellStyle = useMemo(() => ({
    position: 'sticky',
    top: 0,
    left: 0,
    zIndex: 10,
    minWidth: `${DEFAULT_CELL_SIZE.width}px`,
    minHeight: `${DEFAULT_CELL_SIZE.height}px`,
    padding: '8px',
    border: darkMode ? `1px solid ${TROCO_COLORS.borderDark}` : `1px solid ${TROCO_COLORS.border}`,
    backgroundColor: darkMode ? '#1A1715' : '#F5F0E8',
    color: darkMode ? '#D4C5B5' : '#6B5E54',
    fontSize: '12px',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxSizing: 'border-box',
  }), [darkMode]);

  // Style des en-têtes de ligne
  const rowHeaderStyle = useMemo(() => ({
    position: 'sticky',
    left: 0,
    zIndex: 10,
    minWidth: `${DEFAULT_CELL_SIZE.width}px`,
    minHeight: `${DEFAULT_CELL_SIZE.height}px`,
    padding: '8px',
    border: darkMode ? `1px solid ${TROCO_COLORS.borderDark}` : `1px solid ${TROCO_COLORS.border}`,
    backgroundColor: darkMode ? '#1A1715' : '#F5F0E8',
    color: darkMode ? '#D4C5B5' : '#6B5E54',
    fontSize: '12px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxSizing: 'border-box',
  }), [darkMode]);

  // Style du coin vide (en haut à gauche)
  const cornerStyle = useMemo(() => ({
    position: 'sticky',
    top: 0,
    left: 0,
    zIndex: 20,
    minWidth: `${DEFAULT_CELL_SIZE.width}px`,
    minHeight: `${DEFAULT_CELL_SIZE.height}px`,
    border: darkMode ? `1px solid ${TROCO_COLORS.borderDark}` : `1px solid ${TROCO_COLORS.border}`,
    backgroundColor: darkMode ? '#1A1715' : '#F5F0E8',
    boxSizing: 'border-box',
  }), [darkMode]);

  // Style de la barre d'outils
  const toolbarStyle = useMemo(() => ({
    position: 'fixed',
    top: '10px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: darkMode ? 'rgba(26,23,21,0.95)' : 'rgba(250,247,242,0.95)',
    backdropFilter: 'blur(20px)',
    borderRadius: '8px',
    border: darkMode ? `1px solid ${TROCO_COLORS.borderDark}` : `1px solid ${TROCO_COLORS.border}`,
    boxShadow: '0 4px 12px rgba(61,53,48,0.2)',
    zIndex: 100,
  }), [darkMode]);

  // Style des boutons de la barre d'outils
  const toolButtonStyle = useMemo(() => ({
    padding: '6px 10px',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: darkMode ? '#1A1715' : '#FAF7F2',
    color: darkMode ? '#D4C5B5' : '#6B5E54',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    transition: 'all 0.2s ease',
  }), [darkMode]);

  // Style de l'indicateur de sélection
  const selectionInfoStyle = useMemo(() => ({
    position: 'fixed',
    bottom: '10px',
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '8px 16px',
    backgroundColor: darkMode ? 'rgba(26,23,21,0.95)' : 'rgba(250,247,242,0.95)',
    backdropFilter: 'blur(20px)',
    borderRadius: '8px',
    border: darkMode ? `1px solid ${TROCO_COLORS.borderDark}` : `1px solid ${TROCO_COLORS.border}`,
    boxShadow: '0 4px 12px rgba(61,53,48,0.2)',
    zIndex: 100,
    fontSize: '12px',
    color: darkMode ? '#FAF7F2' : '#3D3530',
  }), [darkMode]);

  // Style de l'indicateur de plage de sélection
  const selectionIndicatorStyle = useMemo(() => ({
    position: 'absolute',
    pointerEvents: 'none',
    zIndex: 5,
    backgroundColor: 'rgba(198,125,91,0.2)',
    border: `2px dashed ${TROCO_COLORS.primary}`,
    borderRadius: '4px',
  }), []);

  // Calculer la position de l'indicateur de sélection
  const getSelectionIndicatorStyle = () => {
    if (!selectionRange) return { display: 'none' };
    
    const { start, end } = selectionRange;
    const left = start.col * DEFAULT_CELL_SIZE.width;
    const top = start.row * DEFAULT_CELL_SIZE.height;
    const width = (end.col - start.col + 1) * DEFAULT_CELL_SIZE.width;
    const height = (end.row - start.row + 1) * DEFAULT_CELL_SIZE.height;
    
    return {
      ...selectionIndicatorStyle,
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`,
    };
  };

  // Rendu du grid avec les en-têtes
  return (
    <div
      ref={gridRef}
      className="troco-sheet-grid"
      style={containerStyle}
      onClick={handleBackgroundClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div
        style={{
          display: 'inline-grid',
          gridTemplateColumns: `${DEFAULT_CELL_SIZE.width}px repeat(${cols}, ${DEFAULT_CELL_SIZE.width}px)`,
        }}
      >
        {/* Coin vide */}
        <div style={cornerStyle} />
        
        {/* En-têtes de colonne */}
        {columnHeaders.map((header, index) => (
          <div
            key={`col-header-${index}`}
            style={headerCellStyle}
          >
            {header}
          </div>
        ))}
        
        {/* Lignes avec en-têtes de ligne */}
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <React.Fragment key={`row-${rowIndex}`}>
            {/* En-tête de ligne */}
            <div style={rowHeaderStyle}>
              {rowIndex + 1}
            </div>
            
            {/* Cellules de données */}
            {Array.from({ length: cols }).map((_, colIndex) => {
              const cellKey = `${colToLetter(colIndex)}${rowToNumber(rowIndex)}`;
              const cellData = data[cellKey];
              const isSelected = selectedCells.some(c => c.col === colIndex && c.row === rowIndex);
              
              return (
                <SheetCell
                  key={cellKey}
                  col={colIndex}
                  row={rowIndex}
                  value={cellData?.value || ''}
                  onChange={handleCellChange}
                  onSelect={handleCellSelect}
                  onFill={handleFill}
                  activeCell={activeCell}
                  isSelected={isSelected}
                  darkMode={darkMode}
                  formulaSuggestions={formulaSuggestions}
                  onFormulaSelect={handleFormulaSelect}
                  showFormulaList={showFormulaList}
                  onShowFormulaList={handleShowFormulaList}
                />
              );
            })}
          </React.Fragment>
        ))}
      </div>

      {/* Indicateur de sélection */}
      {selectedCells.length > 1 && (
        <div style={getSelectionIndicatorStyle()} />
      )}

      {/* Barre d'outils */}
      <div style={toolbarStyle}>
        <button
          onClick={() => addRows(5)}
          style={toolButtonStyle}
          aria-label="Ajouter 5 lignes"
        >
          +5 Lignes
        </button>
        
        <button
          onClick={removeRows}
          disabled={rows <= 5}
          style={{
            ...toolButtonStyle,
            opacity: rows <= 5 ? 0.5 : 1,
            cursor: rows <= 5 ? 'not-allowed' : 'pointer',
          }}
          aria-label="Supprimer une ligne"
        >
          - Ligne
        </button>
        
        <button
          onClick={() => addCols(1)}
          style={toolButtonStyle}
          aria-label="Ajouter une colonne"
        >
          + Colonne
        </button>
        
        <button
          onClick={removeCols}
          disabled={cols <= 3}
          style={{
            ...toolButtonStyle,
            opacity: cols <= 3 ? 0.5 : 1,
            cursor: cols <= 3 ? 'not-allowed' : 'pointer',
          }}
          aria-label="Supprimer une colonne"
        >
          - Colonne
        </button>
        
        <button
          onClick={() => {
            // Clear all data
            if (window.confirm('Voulez-vous vraiment effacer toutes les données ?')) {
              setData({});
            }
          }}
          style={{
            ...toolButtonStyle,
            backgroundColor: '#EF4444',
            color: '#FFF',
          }}
          aria-label="Effacer tout"
        >
          🗑️ Effacer tout
        </button>
      </div>

      {/* Indicateur de cellule active */}
      {activeCell && (
        <div style={selectionInfoStyle}>
          Cellule active: {colToLetter(activeCell.col)}{rowToNumber(activeCell.row)}
          {selectedCells.length > 1 && (
            <>
              {' → '}
              Sélection: {colToLetter(selectionRange.start.col)}{rowToNumber(selectionRange.start.row)}:
              {colToLetter(selectionRange.end.col)}{rowToNumber(selectionRange.end.row)}
            </>
          )}
        </div>
      )}

      {/* CSS global pour le component */}
      <style>{`
        .troco-sheet-grid:focus {
          outline: none;
        }
        
        .resize-handle {
          transition: all 0.1s ease;
        }
        
        .resize-handle:hover {
          transform: scale(1.2);
          box-shadow: 0 0 0 2px rgba(198,125,91,0.5);
        }
        
        input[type="color"]::-webkit-color-swatch-wrapper {
          padding: 0;
        }
        
        input[type="color"]::-webkit-color-swatch {
          border: none;
          border-radius: 6px;
        }
        
        /* Scrollbar styling */
        ::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }
        
        ::-webkit-scrollbar-track {
          background: ${darkMode ? '#1A1715' : '#F5F0E8'};
        }
        
        ::-webkit-scrollbar-thumb {
          background: ${TROCO_COLORS.primary};
          border-radius: 5px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: ${TROCO_COLORS.primaryDark};
        }
      `}</style>
    </div>
  );
});

// Export par défaut pour l'utilisation
TrocoSheets.displayName = 'TrocoSheets';

export default TrocoSheets;
