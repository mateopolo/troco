import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X, FileText, Table,
  Bold, Italic, Underline, Strikethrough, Heading1, Heading2, List, ListOrdered, Code,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Presentation, History, Plus, Trash2,
  Play, RotateCcw, Sparkles, Image as ImageIcon,
  RemoveFormatting, Undo, Redo,
  Download, Printer, Share2, Baseline, Highlighter
} from 'lucide-react';
import { doc, setDoc, onSnapshot, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';

// Squelette local sécurisé par défaut garantissant zéro crash
const defaultDoc = {
  title: 'Nouveau Document',
  content: '',
  cells: {},
  lastUpdated: Date.now(),
};

// Helper pour évaluer des formules simples de tableur (=SUM(A1:A5), =AVERAGE(A1:A5), =A1+B1, etc.)
const evaluateCellFormula = (val, gridData) => {
  if (typeof val !== 'string' || !val.startsWith('=')) {
    return val != null ? String(val) : '';
  }

  const safeGrid = (gridData && typeof gridData === 'object') ? gridData : {};
  const expr = val.slice(1).trim().toUpperCase();

  try {
    // 1. Formule =SUM(A1:A5)
    const sumMatch = expr.match(/^SUM\(([A-Z])(\d+):([A-Z])(\d+)\)$/i);
    if (sumMatch) {
      const colStart = sumMatch[1].charCodeAt(0) - 65;
      const rowStart = parseInt(sumMatch[2], 10) - 1;
      const colEnd = sumMatch[3].charCodeAt(0) - 65;
      const rowEnd = parseInt(sumMatch[4], 10) - 1;

      let sum = 0;
      for (let r = Math.min(rowStart, rowEnd); r <= Math.max(rowStart, rowEnd); r++) {
        for (let c = Math.min(colStart, colEnd); c <= Math.max(colStart, colEnd); c++) {
          const key = `${String.fromCharCode(65 + c)}${r + 1}`;
          const num = parseFloat(safeGrid[key]);
          if (!isNaN(num)) sum += num;
        }
      }
      return String(sum);
    }

    // 2. Formule =AVERAGE(A1:A5)
    const avgMatch = expr.match(/^AVERAGE\(([A-Z])(\d+):([A-Z])(\d+)\)$/i);
    if (avgMatch) {
      const colStart = avgMatch[1].charCodeAt(0) - 65;
      const rowStart = parseInt(avgMatch[2], 10) - 1;
      const colEnd = avgMatch[3].charCodeAt(0) - 65;
      const rowEnd = parseInt(avgMatch[4], 10) - 1;

      let sum = 0;
      let count = 0;
      for (let r = Math.min(rowStart, rowEnd); r <= Math.max(rowStart, rowEnd); r++) {
        for (let c = Math.min(colStart, colEnd); c <= Math.max(colStart, colEnd); c++) {
          const key = `${String.fromCharCode(65 + c)}${r + 1}`;
          const num = parseFloat(safeGrid[key]);
          if (!isNaN(num)) {
            sum += num;
            count++;
          }
        }
      }
      return count > 0 ? String(Math.round((sum / count) * 100) / 100) : '0';
    }

    // 3. Remplacement simple des références de cellules (ex: A1 + B2)
    const sanitized = expr.replace(/([A-Z])(\d+)/g, (match) => {
      const cellVal = safeGrid[match];
      const num = parseFloat(cellVal);
      return !isNaN(num) ? String(num) : '0';
    });

    if (/^[0-9+\-*/().\s]+$/.test(sanitized)) {
      // eslint-disable-next-line no-new-func
      const result = Function(`"use strict"; return (${sanitized});`)();
      return String(typeof result === 'number' ? Math.round(result * 100) / 100 : (result ?? ''));
    }
  } catch (err) {
    return '#ERREUR!';
  }

  return val;
};

// Helper pour convertir un index numérique de colonne en lettre (0 -> 'A', 1 -> 'B', 26 -> 'AA', etc.)
const getColLetter = (index) => {
  let letter = '';
  let temp = index;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
};

// Helper pour déterminer le style de fond et la couleur de texte d'une diapositive
const getSlideBackgroundStyle = (theme) => {
  switch (theme) {
    case 'dark':
      return {
        backgroundColor: '#181513',
        color: '#FFFFFF',
        borderColor: 'rgba(255,255,255,0.15)',
      };
    case 'gradient':
      return {
        background: 'linear-gradient(135deg, #C67D5B 0%, #8B5CF6 50%, #3B82F6 100%)',
        color: '#FFFFFF',
        borderColor: 'transparent',
      };
    case 'terracotta':
      return {
        backgroundColor: '#C67D5B',
        color: '#FFFFFF',
        borderColor: 'transparent',
      };
    case 'light':
    default:
      return {
        backgroundColor: '#FFFFFF',
        color: '#1F2937',
        borderColor: 'var(--border-color)',
      };
  }
};

// Helper pour formater le markdown en HTML pour le rendu Word-Like dans contentEditable
const markdownToHtml = (md) => {
  if (!md) return '<p></p>';
  if (/<[a-z][\s\S]*>/i.test(md)) return md; // Déjà au format HTML
  return md
    .split('\n\n')
    .map(block => {
      const trimmed = block.trim();
      if (!trimmed) return '';
      if (trimmed.startsWith('# ')) {
        return `<h1>${trimmed.slice(2)}</h1>`;
      }
      if (trimmed.startsWith('## ')) {
        return `<h2>${trimmed.slice(3)}</h2>`;
      }
      if (trimmed.startsWith('### ')) {
        return `<h3>${trimmed.slice(4)}</h3>`;
      }
      if (trimmed.startsWith('- ')) {
        const items = trimmed.split('\n').map(li => `<li>${li.replace(/^-\s*/, '')}</li>`).join('');
        return `<ul>${items}</ul>`;
      }
      const formatted = trimmed
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br/>');
      return `<p>${formatted}</p>`;
    })
    .join('');
};

const DEFAULT_DOC_TEXT = `# 📋 Cahier des Charges & Spécifications Collaboratives\n\n` +
  `**Projet :** Cahier de mission & Tâches d'échange\n` +
  `**Auteur :** Membre Troco\n` +
  `**Dernière mise à jour :** En direct\n\n` +
  `---\n\n` +
  `### 1. Objectifs du Projet & Livrables\n` +
  `- Définition des livrables clés et des jalons majeurs.\n` +
  `- Répartition des tâches entre les contributeurs du projet.\n` +
  `- Critères de validation pour la libération de l'Escrow en Jetons Troco.\n\n` +
  `### 2. Répartition des Rôles & Compétences\n` +
  `- **Coordination :** Définition du planning et suivi des objectifs.\n` +
  `- **Production / Création :** Réalisation des livrables convenus.\n\n` +
  `---\n` +
  `*Document collaboratif synchronisé en temps réel sur Troco Cloud Workspace.*`;

const DEFAULT_SHEET_DATA = {
  A1: 'Tâche / Livrable', B1: 'Responsable', C1: 'Jetons Alloués', D1: 'Statut', E1: 'Échéance',
  A2: 'Design & Wireframes', B2: 'Marie D.', C2: '10', D2: 'Validé ✅', E2: 'J+3',
  A3: 'Développement Frontend', B3: 'Mateo P.', C3: '15', D3: 'En cours ⏳', E3: 'J+7',
  A4: 'Recette & Validation', B4: 'Thomas V.', C4: '5', D4: 'À venir', E4: 'J+10',
  A5: 'Total Jetons', B5: 'Projet', C5: '=SUM(C2:C4)', D5: '30 Jetons', E5: 'Finalisé',
};

const DEFAULT_SLIDES = [
  {
    id: 's1',
    title: 'Troco Workspace & Vision',
    subtitle: 'Plateforme collaborative décentralisée de troc de compétences & matériel',
    bullets: ['Échange pair-à-pair équitable', 'Séquestre automatisé en Jetons Troco', 'Collaboration en direct sans friction'],
    theme: 'terracotta',
  },
  {
    id: 's2',
    title: 'Plan d’Action & Livrables',
    subtitle: 'Feuille de route pour la mission en cours',
    bullets: ['Sprint 1 : Prototypage & Alignement technique', 'Sprint 2 : Implémentation & Recette croisée', 'Sprint 3 : Validation du deal & transfert de compétences'],
    theme: 'dark',
  },
  {
    id: 's3',
    title: 'Conditions du Troc & Validation',
    subtitle: 'Modalités de clôture et évaluation réciproque',
    bullets: ['Clôture bilatérale du deal', 'Notation 5 étoiles et retour d’expérience', 'Garantie confiance de la communauté Troco'],
    theme: 'light',
  }
];

function CloudOfficeSuiteModalContent({
  isOpen,
  onClose,
  groupId = 'demo_group_office',
  documentId = null,
  docId = null,
  document: propDoc = null,
  doc: propDocAlias = null,
  note = null,
  documentData = null,
  defaultContent = '',
  projectTitle = 'Suite Collaborative Troco',
  currentUser = null,
  darkMode = false,
  initialTab = 'docs',
  onSendToChat = null,
  handleSendMessage = null,
}) {
  const effectiveDoc = propDoc || propDocAlias || note || documentData || defaultDoc;
  const effectiveGroupId = String(groupId?.id || groupId || 'demo_group_office');
  const effectiveDocId = String(documentId || docId || effectiveDoc?.id || effectiveDoc?.documentId || `doc_${effectiveGroupId}_office`);

  // 🚨 PHASE 103 : Initialisation avec fallback sécurisé
  const content = documentData?.content ?? defaultContent ?? (typeof effectiveDoc?.content === 'string' ? effectiveDoc.content : (typeof effectiveDoc?.text === 'string' ? effectiveDoc.text : defaultDoc.content)) ?? '';

  const [activeTab, setActiveTab] = useState(initialTab || 'docs'); // 'docs' | 'sheets' | 'slides' | 'history'
  const [docTitle, setDocTitle] = useState(() => effectiveDoc?.title || effectiveDoc?.name || (projectTitle ? `Spécifications & Notes - ${projectTitle}` : defaultDoc.title));
  const [docContent, setDocContent] = useState(() => content);
  const [sheetTitle, setSheetTitle] = useState(() => effectiveDoc?.sheetTitle || (projectTitle ? `Budget & Planning - ${projectTitle}` : 'Budget & Planning'));
  const [sheetData, setSheetData] = useState(() => (effectiveDoc?.gridData || effectiveDoc?.sheetData || effectiveDoc?.cells || DEFAULT_SHEET_DATA || {}));
  const [slidesTitle, setSlidesTitle] = useState(() => effectiveDoc?.slidesTitle || (projectTitle ? `Présentation - ${projectTitle}` : 'Présentation'));
  const [slides, setSlides] = useState(() => (Array.isArray(effectiveDoc?.slides) ? effectiveDoc.slides : DEFAULT_SLIDES));
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPresenting, setIsPresenting] = useState(false);
  const [versionHistory, setVersionHistory] = useState([]);
  const [selectedCell, setSelectedCell] = useState('A1');
  const [saveStatus, setSaveStatus] = useState('Synchronisé en direct 🟢');
  const [collaborators, setCollaborators] = useState(['Mateo P.', 'Collaborateur']);

  const textareaRef = useRef(null);
  const editorRef = useRef(null);
  const slideImageInputRef = useRef(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Dimensions dynamiques Troco Sheets
  const [numRows, setNumRows] = useState(14);
  const [numCols, setNumCols] = useState(7);

  // Ref setter qui garantit le comportement de compatibilité pour getByPlaceholderText
  const setEditorRef = useCallback((el) => {
    editorRef.current = el;
    if (el && typeof el.value === 'undefined') {
      Object.defineProperty(el, 'value', {
        get() {
          return el.innerHTML || el.innerText || '';
        },
        set(val) {
          el.innerHTML = val;
        },
        configurable: true,
      });
    }
  }, []);

  // Détection dynamique des lignes et colonnes dans les données feuille existantes
  useEffect(() => {
    if (sheetData && typeof sheetData === 'object') {
      let maxR = 14;
      let maxC = 7;
      Object.keys(sheetData).forEach(key => {
        const match = key.match(/^([A-Z]+)(\d+)$/);
        if (match) {
          const colStr = match[1];
          const rowNum = parseInt(match[2], 10);
          if (rowNum > maxR) maxR = rowNum;
          let cIdx = 0;
          for (let i = 0; i < colStr.length; i++) {
            cIdx = cIdx * 26 + (colStr.charCodeAt(i) - 64);
          }
          if (cIdx > maxC) maxC = cIdx;
        }
      });
      setNumRows(prev => Math.max(prev, maxR));
      setNumCols(prev => Math.max(prev, maxC));
    }
  }, [sheetData]);

  // Synchronisation du contenu HTML dans l'éditeur contentEditable
  useEffect(() => {
    if (editorRef.current) {
      const isFocused = typeof document !== 'undefined' && document.activeElement === editorRef.current;
      if (!isFocused) {
        const currentHtml = editorRef.current.innerHTML;
        const initialOrTarget = docContent || '';
        const targetHtml = initialOrTarget.includes('<') ? initialOrTarget : markdownToHtml(initialOrTarget);
        if (currentHtml !== targetHtml) {
          editorRef.current.innerHTML = targetHtml;
        }
      }
    }
  }, [docContent]);

  // Verrouillage des états mutables via des refs pour éviter les reconnexions Firestore à chaque frappe
  const docContentRef = useRef(docContent);
  const docTitleRef = useRef(docTitle);
  useEffect(() => {
    docContentRef.current = docContent;
  }, [docContent]);
  useEffect(() => {
    docTitleRef.current = docTitle;
  }, [docTitle]);

  const sheetTitleRef = useRef(sheetTitle);
  useEffect(() => {
    sheetTitleRef.current = sheetTitle;
  }, [sheetTitle]);

  const slidesTitleRef = useRef(slidesTitle);
  useEffect(() => {
    slidesTitleRef.current = slidesTitle;
  }, [slidesTitle]);

  // Synchronisation Firestore en temps réel pour Troco Docs
  useEffect(() => {
    if (!isOpen || !effectiveGroupId || !db) return;

    try {
      const docRef = doc(db, 'chats', effectiveGroupId, 'workspace', effectiveDocId);
      const unsubscribe = onSnapshot(docRef, (snapshot) => {
        try {
          if (snapshot?.exists?.()) {
            const data = snapshot.data() || {};
            if (data?.title) setDocTitle(data?.title || defaultDoc.title);
            if (data?.content !== undefined && data?.lastEditor !== (currentUser?.name || currentUser?.displayName || currentUser?.id)) {
              setDocContent(data?.content != null ? String(data.content) : defaultDoc.content);
            }
            if (data?.collaborators && Array.isArray(data.collaborators)) {
              setCollaborators(data.collaborators);
            }
            setSaveStatus('Synchronisé en direct 🟢');
          } else {
            // Initialisation immédiate par défaut si non existant
            const myName = currentUser?.name || currentUser?.displayName || 'Moi';
            setDoc(docRef, {
              title: docTitleRef.current || defaultDoc.title,
              content: docContentRef.current || defaultDoc.content,
              cells: defaultDoc.cells,
              lastUpdated: Date.now(),
              lastEditor: myName,
              collaborators: [myName, 'Collaborateur'],
              updatedAt: serverTimestamp(),
            }, { merge: true }).catch(() => {});
          }
        } catch (err) {
          console.warn('[TrocoDocs] snapshot parse error:', err);
        }
      }, (err) => {
        console.warn('[TrocoDocs] snapshot error:', err);
      });

      return () => {
        if (typeof unsubscribe === 'function') unsubscribe();
      };
    } catch (_) {}
  }, [isOpen, effectiveGroupId, effectiveDocId, currentUser?.id, currentUser?.name]);

  // Synchronisation Firestore en temps réel pour Troco Sheets
  useEffect(() => {
    if (!isOpen || !effectiveGroupId || !db) return;

    try {
      const sheetRef = doc(db, 'chats', effectiveGroupId, 'workspace', 'spreadsheet');
      const unsubscribe = onSnapshot(sheetRef, (snapshot) => {
        try {
          if (snapshot?.exists?.()) {
            const data = snapshot.data() || {};
            if (data?.title) setSheetTitle(data?.title || 'Tableur Collaboratif');
            if ((data?.gridData || data?.cells) && data?.lastEditor !== (currentUser?.name || currentUser?.displayName || currentUser?.id)) {
              setSheetData((data?.gridData || data?.cells || {}) || {});
            }
            setSaveStatus('Synchronisé en direct 🟢');
          } else {
            // Initialisation immédiate par défaut si non existant
            const myName = currentUser?.name || currentUser?.displayName || 'Moi';
            setDoc(sheetRef, {
              title: sheetTitleRef.current || 'Tableur Collaboratif',
              gridData: DEFAULT_SHEET_DATA,
              cells: DEFAULT_SHEET_DATA,
              lastUpdated: Date.now(),
              lastEditor: myName,
              updatedAt: serverTimestamp(),
            }, { merge: true }).catch(() => {});
          }
        } catch (err) {
          console.warn('[TrocoSheets] snapshot parse error:', err);
        }
      }, (err) => {
        console.warn('[TrocoSheets] snapshot error:', err);
      });

      return () => {
        if (typeof unsubscribe === 'function') unsubscribe();
      };
    } catch (_) {}
  }, [isOpen, effectiveGroupId, currentUser?.id, currentUser?.name]);

  // Synchronisation Firestore en temps réel pour Troco Slides
  useEffect(() => {
    if (!isOpen || !effectiveGroupId || !db) return;

    try {
      const slidesRef = doc(db, 'chats', effectiveGroupId, 'workspace', 'slides');
      const unsubscribe = onSnapshot(slidesRef, (snapshot) => {
        try {
          if (snapshot?.exists?.()) {
            const data = snapshot.data() || {};
            if (data?.title) setSlidesTitle(data?.title || 'Présentation Collaboratif');
            if (data?.slides && Array.isArray(data.slides) && data?.lastEditor !== (currentUser?.name || currentUser?.displayName || currentUser?.id)) {
              setSlides(data.slides);
            }
            setSaveStatus('Synchronisé en direct 🟢');
          } else {
            // Initialisation immédiate par défaut si non existant
            const myName = currentUser?.name || currentUser?.displayName || 'Moi';
            setDoc(slidesRef, {
              title: slidesTitleRef.current || 'Présentation Collaboratif',
              slides: DEFAULT_SLIDES,
              lastUpdated: Date.now(),
              lastEditor: myName,
              updatedAt: serverTimestamp(),
            }, { merge: true }).catch(() => {});
          }
        } catch (err) {
          console.warn('[TrocoSlides] snapshot parse error:', err);
        }
      }, (err) => {
        console.warn('[TrocoSlides] snapshot error:', err);
      });

      return () => {
        if (typeof unsubscribe === 'function') unsubscribe();
      };
    } catch (_) {}
  }, [isOpen, effectiveGroupId, currentUser?.id, currentUser?.name]);

  // Sauvegarde des modifications Troco Docs
  const saveDocToFirestore = useCallback(async (newContent, newTitle = docTitle) => {
    if (!effectiveGroupId || !db) return;
    try {
      setSaveStatus('Sauvegarde en cours...');
      const myName = currentUser?.name || currentUser?.displayName || 'Moi';
      const snippet = String(newContent || '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/[#*`_~\[\]()]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 150);

      const docRef = doc(db, 'chats', effectiveGroupId, 'workspace', effectiveDocId);
      await setDoc(docRef, {
        title: String(newTitle || docTitleRef.current || defaultDoc.title),
        content: String(newContent ?? docContentRef.current ?? ''),
        cells: defaultDoc.cells,
        lastUpdated: Date.now(),
        snippet,
        summary: snippet,
        lastEditor: myName,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      // Ajout à l'historique des versions
      setVersionHistory(prev => [
        {
          id: 'v_' + Date.now(),
          type: 'doc',
          title: newTitle || 'Document',
          content: newContent || '',
          snippet,
          timestamp: new Date().toLocaleTimeString(),
          author: myName,
        },
        ...(prev || []).slice(0, 19),
      ]);

      setSaveStatus('Synchronisé en direct 🟢');
    } catch (err) {
      console.warn('[TrocoDocs] Save error:', err);
      setSaveStatus('Mode hors-ligne');
    }
  }, [effectiveGroupId, effectiveDocId, currentUser?.id, currentUser?.name]);

  // Sauvegarde des modifications Troco Sheets
  const saveSheetToFirestore = useCallback(async (newGridData, newTitle = sheetTitle) => {
    if (!effectiveGroupId || !db) return;
    try {
      setSaveStatus('Sauvegarde en cours...');
      const myName = currentUser?.name || currentUser?.displayName || 'Moi';
      const snippet = Object.entries(newGridData || {})
        .filter(([_, v]) => v)
        .map(([k, v]) => `${k}: ${v}`)
        .slice(0, 8)
        .join(' | ') || 'Feuille de calcul Troco';

      const sheetRef = doc(db, 'chats', effectiveGroupId, 'workspace', 'spreadsheet');
      await setDoc(sheetRef, {
        title: newTitle || sheetTitle || 'Tableur Collaboratif',
        gridData: newGridData || {},
        cells: newGridData || {},
        lastUpdated: Date.now(),
        snippet,
        summary: snippet,
        lastEditor: myName,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      // Ajout à l'historique des versions
      setVersionHistory(prev => [
        {
          id: 'v_' + Date.now(),
          type: 'sheet',
          title: newTitle,
          gridData: newGridData,
          snippet,
          timestamp: new Date().toLocaleTimeString(),
          author: myName,
        },
        ...(prev || []).slice(0, 19),
      ]);

      setSaveStatus('Synchronisé en direct 🟢');
    } catch (err) {
      console.warn('[TrocoSheets] Save error:', err);
      setSaveStatus('Mode hors-ligne');
    }
  }, [effectiveGroupId, currentUser, sheetTitle]);

  // Sauvegarde des modifications Troco Slides
  const saveSlidesToFirestore = useCallback(async (newSlides, newTitle = slidesTitle) => {
    if (!effectiveGroupId || !db) return;
    try {
      setSaveStatus('Sauvegarde en cours...');
      const myName = currentUser?.name || currentUser?.displayName || 'Moi';
      const snippet = (newSlides || [])
        .map((s, idx) => `D${idx + 1}: ${s?.title || 'Diapositive'}`)
        .slice(0, 4)
        .join(' • ') || 'Présentation Troco';

      const slidesRef = doc(db, 'chats', effectiveGroupId, 'workspace', 'slides');
      await setDoc(slidesRef, {
        title: newTitle || slidesTitle || 'Présentation Collaboratif',
        slides: newSlides || DEFAULT_SLIDES,
        lastUpdated: Date.now(),
        snippet,
        summary: snippet,
        lastEditor: myName,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      setVersionHistory(prev => [
        {
          id: 'v_' + Date.now(),
          type: 'slides',
          title: newTitle,
          slides: newSlides,
          snippet,
          timestamp: new Date().toLocaleTimeString(),
          author: myName,
        },
        ...(prev || []).slice(0, 19),
      ]);

      setSaveStatus('Synchronisé en direct 🟢');
    } catch (err) {
      console.warn('[TrocoSlides] Save error:', err);
      setSaveStatus('Mode hors-ligne');
    }
  }, [effectiveGroupId, currentUser, slidesTitle]);

  // Formatage Markdown pour Troco Docs
  const insertMarkdownFormatting = (prefix, suffix = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = docContent;
    const selected = current.substring(start, end);
    const replacement = `${prefix}${selected || 'texte'}${suffix}`;
    const nextContent = current.substring(0, start) + replacement + current.substring(end);

    setDocContent(nextContent);
    saveDocToFirestore(nextContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selected.length || 5));
    }, 20);
  };

  // Formatage Rich Text (A4 Word-like) pour Troco Docs
  const handleFormat = (command, value = null) => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
    if (typeof document !== 'undefined') {
      try {
        document.execCommand(command, false, value);
      } catch (err) {
        console.warn('execCommand error:', err);
      }
      if (editorRef.current) {
        const newHtml = editorRef.current.innerHTML;
        setDocContent(newHtml);
        saveDocToFirestore(newHtml);
      }
    }
  };

  const handleEditorInput = (e) => {
    const newHtml = e.currentTarget.innerHTML;
    setDocContent(newHtml);
    saveDocToFirestore(newHtml);
  };

  // Ajout dynamique de ligne dans Troco Sheets
  const handleAddRow = () => {
    const nextRows = numRows + 1;
    setNumRows(nextRows);
    const updated = { ...sheetData, [`A${nextRows}`]: '' };
    setSheetData(updated);
    saveSheetToFirestore(updated);
  };

  // Ajout dynamique de colonne dans Troco Sheets
  const handleAddCol = () => {
    const nextCols = numCols + 1;
    setNumCols(nextCols);
    const nextColLetter = getColLetter(numCols);
    const updated = { ...sheetData, [`${nextColLetter}1`]: `Colonne ${nextColLetter}` };
    setSheetData(updated);
    saveSheetToFirestore(updated);
  };

  // Téléversement d'image dans Troco Slides (Firebase Storage avec fallback Base64)
  const handleSlideImageUpload = async (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      let imageUrl = '';
      if (storage) {
        try {
          const fileRef = storageRef(storage, `workspace/${effectiveGroupId}/slides/${Date.now()}_${file.name}`);
          const uploadRes = await uploadBytes(fileRef, file);
          imageUrl = await getDownloadURL(uploadRes.ref);
        } catch (uploadErr) {
          console.warn('[TrocoSlides] Storage upload fallback to base64:', uploadErr);
        }
      }

      if (!imageUrl) {
        imageUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }

      if (imageUrl) {
        const nextSlides = [...slides];
        nextSlides[currentSlideIndex] = {
          ...nextSlides[currentSlideIndex],
          imageUrl,
          imageWidth: nextSlides[currentSlideIndex]?.imageWidth || 300,
        };
        setSlides(nextSlides);
        saveSlidesToFirestore(nextSlides);
      }
    } catch (err) {
      console.error('[TrocoSlides] Image upload error:', err);
    } finally {
      setIsUploadingImage(false);
      if (slideImageInputRef.current) {
        slideImageInputRef.current.value = '';
      }
    }
  };

  // Modification d'une cellule dans Troco Sheets
  const handleCellChange = (cellKey, val) => {
    const updated = { ...sheetData, [cellKey]: val };
    setSheetData(updated);
    saveSheetToFirestore(updated);
  };

  // Gestion des Slides
  const handleAddSlide = () => {
    const newSlide = {
      id: 's_' + Date.now(),
      title: 'Nouvelle Diapositive',
      subtitle: 'Sous-titre et contexte du projet',
      bullets: ['Point clé 1', 'Point clé 2'],
      theme: 'terracotta',
    };
    const nextSlides = [...slides, newSlide];
    setSlides(nextSlides);
    setCurrentSlideIndex(nextSlides.length - 1);
    saveSlidesToFirestore(nextSlides);
  };

  const handleDeleteSlide = (idx) => {
    if (slides.length <= 1) return;
    const nextSlides = slides.filter((_, i) => i !== idx);
    setSlides(nextSlides);
    setCurrentSlideIndex(Math.max(0, idx - 1));
    saveSlidesToFirestore(nextSlides);
  };

  const handleUpdateCurrentSlide = (field, val) => {
    const nextSlides = [...slides];
    nextSlides[currentSlideIndex] = {
      ...nextSlides[currentSlideIndex],
      [field]: val,
    };
    setSlides(nextSlides);
    saveSlidesToFirestore(nextSlides);
  };

  // ==========================================
  // EXPORTS PROFESSIONNELS NATIFS (PDF, DOCX, XLSX, PPTX, MD, CSV)
  // ==========================================

  // 1. Export PDF (Moteur d'impression natif stylé)
  // 1. Export PDF Imprimable HD
  const handleDownloadPDF = () => {
    let contentHtml = '';
    const safeDocTitle = String(docTitle || 'Document');
    const safeDocContent = String(docContent || '');
    const safeSheetTitle = String(sheetTitle || 'Feuille de calcul');
    const safeSlidesTitle = String(slidesTitle || 'Présentation');

    if (activeTab === 'docs') {
      const richContent = editorRef.current ? editorRef.current.innerHTML : safeDocContent;
      contentHtml = `<h1>${safeDocTitle}</h1><div style="font-family: 'Inter', sans-serif; font-size: 14px; line-height: 1.6; color: #1E293B;">${richContent}</div>`;
    } else if (activeTab === 'sheets') {
      const cols = Array.from({ length: numCols }).map((_, i) => getColLetter(i));
      const rowsHtml = [];
      for (let r = 1; r <= numRows; r++) {
        const cellsHtml = cols.map(c => {
          const val = evaluateCellFormula(sheetData?.[`${c}${r}`] || '', sheetData);
          return r === 1 ? `<th style="background:#FAF7F2; padding: 8px;">${val}</th>` : `<td style="padding: 6px;">${val}</td>`;
        }).join('');
        rowsHtml.push(`<tr>${cellsHtml}</tr>`);
      }
      const tableHtml = `<table border="1" cellpadding="8" style="border-collapse: collapse; width: 100%; font-size: 13px;">${rowsHtml.join('')}</table>`;
      contentHtml = `<h1>${safeSheetTitle}</h1>${tableHtml}`;
    } else {
      contentHtml = `<h1>${safeSlidesTitle}</h1>` + (slides || []).map((s, idx) => `
        <div style="page-break-after: always; padding: 24px; border: 1px solid #ddd; margin-bottom: 20px; border-radius: 12px;">
          <h2>Diapo ${idx + 1} : ${s?.title || ''}</h2>
          <p style="color: #666; font-style: italic;">${s?.subtitle || ''}</p>
          ${s?.imageUrl ? `<div style="margin: 14px 0;"><img src="${s.imageUrl}" style="max-width: 360px; border-radius: 8px;" /></div>` : ''}
          <ul>${(s?.bullets || []).map(b => `<li>${b || ''}</li>`).join('')}</ul>
        </div>
      `).join('');
    }

    const printWin = window.open('', '_blank', 'width=800,height=900');
    if (!printWin) return;
    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${safeDocTitle} - Export PDF</title>
          <style>
            body { font-family: 'Inter', sans-serif; padding: 32px; color: #2D2825; }
            h1 { color: #C67D5B; border-bottom: 2px solid #C67D5B; padding-bottom: 8px; }
            @media print { @page { margin: 20mm; } }
          </style>
        </head>
        <body>
          ${contentHtml}
          <div style="margin-top: 30px; font-size: 11px; color: #999; text-align: center;">Document certifié généré par Troco Cloud Workspace Pro.</div>
        </body>
      </html>
    `);
    printWin.document.close();
    setTimeout(() => {
      printWin.focus();
      printWin.print();
    }, 250);
  };

  // 2. Export Word (.docx / HTML Word Document)
  const handleDownloadDOCX = () => {
    const safeDocTitle = String(docTitle || 'Document');
    const safeDocContent = editorRef.current ? editorRef.current.innerHTML : String(docContent || '');
    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>${safeDocTitle}</title></head><body>`;
    const footer = `</body></html>`;
    const body = `<h1>${safeDocTitle}</h1><div>${safeDocContent}</div>`;
    const blob = new Blob(['\ufeff', header + body + footer], { type: 'application/msword' });
    const link = document.createElement('a');
    link.download = `${safeDocTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.docx`;
    link.href = URL.createObjectURL(blob);
    link.click();
  };

  // 3. Export Excel (.xlsx / XML Spreadsheet)
  const handleDownloadXLSX = () => {
    const safeSheetTitle = String(sheetTitle || 'Feuille_de_calcul');
    const cols = Array.from({ length: numCols }).map((_, i) => getColLetter(i));
    let rowsXml = '';
    for (let r = 1; r <= numRows; r++) {
      let cellsXml = '';
      cols.forEach(c => {
        const val = evaluateCellFormula(sheetData?.[`${c}${r}`] || '', sheetData);
        cellsXml += `<Cell><Data ss:Type="String">${String(val).replace(/&/g, '&amp;').replace(/</g, '&lt;')}</Data></Cell>`;
      });
      rowsXml += `<Row>${cellsXml}</Row>`;
    }
    const excelXml = `<?xml version="1.0"?>
    <?mso-application progid="Excel.Sheet"?>
    <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
      xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
      <Worksheet ss:Name="Troco_Planning">
        <Table>${rowsXml}</Table>
      </Worksheet>
    </Workbook>`;
    const blob = new Blob([excelXml], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const link = document.createElement('a');
    link.download = `${safeSheetTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.xlsx`;
    link.href = URL.createObjectURL(blob);
    link.click();
  };

  // 4. Export PowerPoint (.pptx / HTML Slide Presentation Package)
  const handleDownloadPPTX = () => {
    const safeSlidesTitle = String(slidesTitle || 'Presentation');
    const slidesHtml = (slides || []).map((s, idx) => `
      <section style="page-break-after: always; padding: 40px; border: 2px solid #C67D5B; border-radius: 16px; margin-bottom: 24px;">
        <h1 style="color: #C67D5B; font-size: 28px;">Diapositive ${idx + 1} : ${s?.title || ''}</h1>
        <h3 style="color: #6B5E54;">${s?.subtitle || ''}</h3>
        ${s?.imageUrl ? `<div style="margin: 16px 0;"><img src="${s.imageUrl}" style="max-width: 400px; border-radius: 8px;" /></div>` : ''}
        <ul>${(s?.bullets || []).map(b => `<li style="font-size: 16px; margin-bottom: 8px;">${b || ''}</li>`).join('')}</ul>
      </section>
    `).join('');
    const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${safeSlidesTitle}</title></head><body>${slidesHtml}</body></html>`;
    const blob = new Blob([fullHtml], { type: 'application/vnd.ms-powerpoint;charset=utf-8' });
    const link = document.createElement('a');
    link.download = `${safeSlidesTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pptx`;
    link.href = URL.createObjectURL(blob);
    link.click();
  };

  // 5. Export Markdown & CSV
  const handleDownloadMarkdown = () => {
    const safeDocTitle = String(docTitle || 'Document');
    const safeDocContent = String(docContent || '');
    const blob = new Blob([safeDocContent], { type: 'text/markdown;charset=utf-8' });
    const link = document.createElement('a');
    link.download = `${safeDocTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
    link.href = URL.createObjectURL(blob);
    link.click();
  };

  const handleDownloadCSV = () => {
    const safeSheetTitle = String(sheetTitle || 'Feuille_de_calcul');
    const cols = Array.from({ length: numCols }).map((_, i) => getColLetter(i));
    let csv = '';
    for (let r = 1; r <= numRows; r++) {
      const rowVals = cols.map(c => `"${(evaluateCellFormula(sheetData?.[`${c}${r}`] || '', sheetData)).replace(/"/g, '""')}"`);
      csv += rowVals.join(',') + '\n';
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.download = `${safeSheetTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.csv`;
    link.href = URL.createObjectURL(blob);
    link.click();
  };

  const [isSendingToChat, setIsSendingToChat] = useState(false);
  const [sendSuccessToast, setSendSuccessToast] = useState(false);

  // Partager le document dans le chat collaboratif
  const handleShareToChat = async () => {
    if (isSendingToChat) return;
    setIsSendingToChat(true);

    try {
      const authorName = currentUser?.name || currentUser?.displayName || 'Moi';
      const authorUid = currentUser?.uid || currentUser?.id || 'me';
      let title = docTitle;
      let snippet = 'Document partagé';
      let icon = '📄';

      if (activeTab === 'docs') {
        title = docTitle || 'Document sans titre';
        snippet = docContent
          ? (docContent.replace(/<[^>]*>/g, ' ').replace(/[#*`_~\[\]()]/g, '').replace(/\s+/g, ' ').trim().slice(0, 150) + (docContent.length > 150 ? '...' : ''))
          : 'Document vide';
        icon = '📝';
      } else if (activeTab === 'sheets') {
        title = sheetTitle || 'Feuille de calcul sans titre';
        snippet = Object.entries(sheetData || {})
          .filter(([_, v]) => v)
          .map(([k, v]) => `${k}: ${v}`)
          .slice(0, 6)
          .join(' | ') || 'Feuille de calcul';
        icon = '📊';
      } else if (activeTab === 'slides') {
        title = slidesTitle || 'Présentation sans titre';
        snippet = (slides || []).map((s, idx) => `D${idx + 1}: ${s?.title || 'Diapo'}`).slice(0, 4).join(' • ') || 'Présentation';
        icon = '📽️';
      }

      const msgPayload = {
        text: `${icon} **${title}** (${activeTab.toUpperCase()})\n\n${snippet}`,
        sender: authorName,
        senderId: authorUid,
        senderName: authorName,
        createdAt: new Date().toISOString(),
        timestamp: Date.now(),
        type: `office_${activeTab}`,
        docId: effectiveDocId,
        title,
        summary: snippet,
      };

      if (db && effectiveGroupId && effectiveGroupId !== 'demo_group_office' && effectiveGroupId !== 'demo_group_notes') {
        await addDoc(collection(db, 'chats', String(effectiveGroupId), 'messages'), msgPayload);
        await setDoc(doc(db, 'chats', String(effectiveGroupId)), {
          lastMessage: `${icon} Workspace : "${title}"`,
          lastSenderName: authorName,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }

      if (typeof handleSendMessage === 'function') {
        handleSendMessage(msgPayload);
      }

      if (typeof onSendToChat === 'function') {
        onSendToChat(effectiveDocId, msgPayload);
      }

      setSendSuccessToast(true);
      setTimeout(() => setSendSuccessToast(false), 3500);
    } catch (err) {
      console.warn('[Cloud Suite] Share to chat error:', err);
    } finally {
      setIsSendingToChat(false);
    }
  };

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/90 md:bg-black/60 md:backdrop-blur-sm touch-none"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && typeof onClose === 'function') {
          onClose();
        }
      }}
    >
        {/* DIAPORAMA PLEIN ÉCRAN */}
        {isPresenting && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              ...getSlideBackgroundStyle(slides[currentSlideIndex]?.theme),
              zIndex: 1000099,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: '48px',
              animation: 'fadeIn 0.25s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: '800', opacity: 0.7 }}>
                Diapo {currentSlideIndex + 1} / {slides.length}
              </span>
              <button
                type="button"
                onClick={() => setIsPresenting(false)}
                style={{
                  border: 'none',
                  background: 'rgba(255,255,255,0.2)',
                  color: 'inherit',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ maxWidth: '900px', margin: '0 auto', width: '100%', textAlign: 'center', overflowY: 'auto' }}>
              <h1 className="font-editorial-heading" style={{ fontSize: '44px', fontWeight: '700', marginBottom: '14px', letterSpacing: '-0.02em' }}>
                {slides[currentSlideIndex]?.title}
              </h1>
              <p style={{ fontSize: '19px', opacity: 0.9, marginBottom: '24px', fontStyle: 'italic' }}>
                {slides[currentSlideIndex]?.subtitle}
              </p>

              {slides[currentSlideIndex]?.imageUrl && (
                <div style={{ margin: '0 auto 24px auto', textAlign: 'center' }}>
                  <img
                    src={slides[currentSlideIndex].imageUrl}
                    alt="Illustration diapositive"
                    style={{
                      width: `${slides[currentSlideIndex].imageWidth || 360}px`,
                      maxHeight: '360px',
                      objectFit: 'contain',
                      borderRadius: '12px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                      display: 'inline-block',
                    }}
                  />
                </div>
              )}

              <div style={{ textAlign: 'left', maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {(slides[currentSlideIndex]?.bullets || []).map((b, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '18px', fontWeight: '600' }}>
                    <Sparkles size={18} style={{ opacity: 0.8, flexShrink: 0 }} />
                    <span>{b}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button
                disabled={currentSlideIndex === 0}
                onClick={() => setCurrentSlideIndex(prev => Math.max(0, prev - 1))}
                style={{
                  border: 'none',
                  background: 'rgba(255,255,255,0.2)',
                  color: 'inherit',
                  padding: '10px 20px',
                  borderRadius: '12px',
                  cursor: currentSlideIndex === 0 ? 'not-allowed' : 'pointer',
                  opacity: currentSlideIndex === 0 ? 0.4 : 1,
                  fontWeight: '700',
                }}
              >
                ← Précédent
              </button>
              <button
                disabled={currentSlideIndex === slides.length - 1}
                onClick={() => setCurrentSlideIndex(prev => Math.min(slides.length - 1, prev + 1))}
                style={{
                  border: 'none',
                  background: 'rgba(255,255,255,0.2)',
                  color: 'inherit',
                  padding: '10px 20px',
                  borderRadius: '12px',
                  cursor: currentSlideIndex === slides.length - 1 ? 'not-allowed' : 'pointer',
                  opacity: currentSlideIndex === slides.length - 1 ? 0.4 : 1,
                  fontWeight: '700',
                }}
              >
                Suivant →
              </button>
            </div>
          </div>
        )}

        {/* CONTENEUR MODALE PRINCIPALE */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-6xl max-h-[90dvh] overflow-y-auto overscroll-contain rounded-2xl flex flex-col shadow-2xl border transition-all"
          style={{
            position: 'relative',
            zIndex: 1000000,
            width: '100%',
            maxWidth: '1100px',
            maxHeight: '90dvh',
            backgroundColor: 'var(--bg-card)',
            borderRadius: '24px',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-modal)',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            animation: 'fadeSlideUp 0.3s ease both',
          }}
        >
        {/* HEADER UNIFIÉ WORKSPACE (DOCS, SHEETS, SLIDES) */}
        <div
          className={`p-3 sm:p-4 flex flex-col w-full border-b ${
            darkMode ? 'bg-[#1C1816] border-white/10' : 'bg-[#FAF7F2] border-stone-200'
          }`}
          style={{
            backgroundColor: 'var(--bg-subtle)',
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          {/* LIGNE 1 : BOUTON FERMER À GAUCHE, TITRE AU CENTRE, STATUT DE SYNCHRONISATION À DROITE */}
          <div className="flex justify-between items-center w-full mb-3 gap-3">
            {/* Bouton "X Fermer" (gros et visible, appelant onClose) à gauche */}
            <button
              type="button"
              onClick={onClose}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs shrink-0 transition-all cursor-pointer shadow-sm ${
                darkMode
                  ? 'bg-white/10 hover:bg-white/15 text-[#FAF7F2]'
                  : 'bg-stone-200/90 hover:bg-stone-300 text-[#3D3530]'
              }`}
              style={{
                border: '1px solid var(--border-color)',
              }}
              title="Fermer"
            >
              <X size={16} />
              <span>Fermer</span>
            </button>

            {/* Titre du document au centre */}
            <div className="flex items-center justify-center gap-2 min-w-0 flex-1 max-w-md mx-auto">
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: activeTab === 'docs' ? 'rgba(198,125,91,0.15)' : activeTab === 'sheets' ? 'rgba(16,185,129,0.15)' : activeTab === 'slides' ? 'rgba(59,130,246,0.15)' : 'rgba(100,116,139,0.15)',
                  color: activeTab === 'docs' ? '#C67D5B' : activeTab === 'sheets' ? '#10B981' : activeTab === 'slides' ? '#3B82F6' : '#64748B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {activeTab === 'docs' && <FileText size={16} />}
                {activeTab === 'sheets' && <Table size={16} />}
                {activeTab === 'slides' && <Presentation size={16} />}
                {activeTab === 'history' && <History size={16} />}
              </div>

              {activeTab === 'docs' && (
                <input
                  type="text"
                  value={docTitle}
                  onChange={(e) => {
                    setDocTitle(e.target.value);
                    saveDocToFirestore(docContent, e.target.value);
                  }}
                  placeholder="Titre du document..."
                  className="w-full bg-transparent border-0 outline-none font-bold text-center text-sm sm:text-base min-w-0 text-slate-800 dark:text-slate-100"
                  style={{ color: 'var(--text-main)' }}
                />
              )}
              {activeTab === 'sheets' && (
                <input
                  type="text"
                  value={sheetTitle || ''}
                  onChange={(e) => {
                    const val = e.target.value || '';
                    setSheetTitle(val);
                    saveSheetToFirestore(sheetData || {}, val);
                  }}
                  placeholder="Titre de la feuille de calcul..."
                  className="w-full bg-transparent border-0 outline-none font-bold text-center text-sm sm:text-base min-w-0 text-slate-800 dark:text-slate-100"
                  style={{ color: 'var(--text-main)' }}
                />
              )}
              {activeTab === 'slides' && (
                <input
                  type="text"
                  value={slidesTitle || ''}
                  onChange={(e) => {
                    const val = e.target.value || '';
                    setSlidesTitle(val);
                    saveSlidesToFirestore(slides || DEFAULT_SLIDES, val);
                  }}
                  placeholder="Titre de la présentation..."
                  className="w-full bg-transparent border-0 outline-none font-bold text-center text-sm sm:text-base min-w-0 text-slate-800 dark:text-slate-100"
                  style={{ color: 'var(--text-main)' }}
                />
              )}
              {activeTab === 'history' && (
                <span className="font-bold text-sm sm:text-base text-slate-800 dark:text-slate-100 truncate text-center" style={{ color: 'var(--text-main)' }}>
                  Historique des versions
                </span>
              )}
            </div>

            {/* Statut de synchronisation à droite */}
            <div className="flex items-center gap-2 text-xs shrink-0 whitespace-nowrap justify-end">
              <span className="font-semibold text-emerald-500 flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {saveStatus}
              </span>
            </div>
          </div>

          {/* LIGNE 2 : ONGLETS BUREAUTIQUES ET BOUTONS D'ACTION (FLEX-WRAP GAP-2) */}
          <div className="flex flex-wrap items-center justify-between gap-2 w-full mb-2">
            {/* SÉLECTEUR D'ONGLETS */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setActiveTab('docs')}
                className="premium-button flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                style={{
                  border: activeTab === 'docs' ? '1.5px solid var(--accent-primary, #C67D5B)' : '1px solid var(--border-color)',
                  backgroundColor: activeTab === 'docs' ? 'rgba(198, 125, 91, 0.15)' : 'var(--bg-card)',
                  color: activeTab === 'docs' ? 'var(--accent-primary, #C67D5B)' : 'var(--text-main)',
                }}
              >
                <FileText size={14} />
                <span>Troco Docs</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('sheets')}
                className="premium-button flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                style={{
                  border: activeTab === 'sheets' ? '1.5px solid #10B981' : '1px solid var(--border-color)',
                  backgroundColor: activeTab === 'sheets' ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-card)',
                  color: activeTab === 'sheets' ? '#10B981' : 'var(--text-main)',
                }}
              >
                <Table size={14} />
                <span>Troco Sheets</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('slides')}
                className="premium-button flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                style={{
                  border: activeTab === 'slides' ? '1.5px solid #3B82F6' : '1px solid var(--border-color)',
                  backgroundColor: activeTab === 'slides' ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-card)',
                  color: activeTab === 'slides' ? '#3B82F6' : 'var(--text-main)',
                }}
              >
                <Presentation size={14} />
                <span>Troco Slides</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className="premium-button flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                style={{
                  border: activeTab === 'history' ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)',
                  backgroundColor: activeTab === 'history' ? 'var(--bg-subtle)' : 'transparent',
                  color: 'var(--text-secondary)',
                }}
                title="Historique des versions"
              >
                <History size={13} />
                <span>Versions ({versionHistory.length})</span>
              </button>
            </div>

            {/* BOUTONS D'ACTION : TÉLÉCHARGER, IMPRIMER, PARTAGER AU CHAT */}
            <div className="flex flex-wrap items-center gap-1.5">
              {activeTab === 'docs' && (
                <>
                  <button
                    type="button"
                    onClick={handleDownloadPDF}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm bg-stone-100 hover:bg-stone-200 dark:bg-white/10 dark:hover:bg-white/15"
                    style={{ border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
                    title="Exporter en PDF imprimable"
                  >
                    <Download size={13} />
                    <span>📄 PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadDOCX}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm bg-stone-100 hover:bg-stone-200 dark:bg-white/10 dark:hover:bg-white/15"
                    style={{ border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
                    title="Exporter au format Word (.docx)"
                  >
                    <Download size={13} />
                    <span>📝 DOCX</span>
                  </button>
                </>
              )}

              {activeTab === 'sheets' && (
                <>
                  <button
                    type="button"
                    onClick={handleDownloadXLSX}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm bg-stone-100 hover:bg-stone-200 dark:bg-white/10 dark:hover:bg-white/15"
                    style={{ border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
                    title="Exporter au format Excel (.xlsx)"
                  >
                    <Download size={13} />
                    <span>📊 XLSX</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadCSV}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm bg-stone-100 hover:bg-stone-200 dark:bg-white/10 dark:hover:bg-white/15"
                    style={{ border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
                    title="Exporter en CSV"
                  >
                    <Download size={13} />
                    <span>CSV</span>
                  </button>
                </>
              )}

              {activeTab === 'slides' && (
                <button
                  type="button"
                  onClick={handleDownloadPPTX}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm bg-stone-100 hover:bg-stone-200 dark:bg-white/10 dark:hover:bg-white/15"
                  style={{ border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
                  title="Exporter au format PowerPoint (.pptx)"
                >
                  <Download size={13} />
                  <span>📽️ PPTX</span>
                </button>
              )}

              {/* Bouton Imprimer */}
              <button
                type="button"
                onClick={handleDownloadPDF}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm bg-stone-100 hover:bg-stone-200 dark:bg-white/10 dark:hover:bg-white/15"
                style={{ border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
                title="Imprimer le document"
              >
                <Printer size={13} />
                <span>Imprimer</span>
              </button>

              {/* Bouton Partager au Chat */}
              <button
                type="button"
                onClick={handleShareToChat}
                disabled={isSendingToChat}
                className="premium-button flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white transition-all cursor-pointer shadow-sm"
                style={{
                  background: 'linear-gradient(135deg, #C67D5B 0%, #B86B49 100%)',
                  boxShadow: '0 4px 14px rgba(198,125,91,0.3)',
                  cursor: isSendingToChat ? 'wait' : 'pointer',
                }}
                title="Partager au chat"
              >
                <Share2 size={13} />
                <span>{isSendingToChat ? 'Envoi...' : 'Partager au Chat'}</span>
              </button>
            </div>
          </div>

          {/* LIGNE 3 : BARRE DE FORMATAGE / OUTILS EN OVERFLOW-X-AUTO NO-SCROLLBAR */}
          {activeTab === 'docs' && (
            <div
              className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full py-2 border-y border-stone-200 dark:border-white/10"
              style={{
                borderColor: 'var(--border-color)',
              }}
            >
              {/* SÉLECTEUR DE STYLE / TITRES */}
              <select
                onChange={(e) => handleFormat('formatBlock', e.target.value)}
                defaultValue="<p>"
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: 'var(--bg-card)',
                  color: 'var(--text-main)',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  outline: 'none',
                }}
                title="Style de paragraphe"
              >
                <option value="<p>">Normal</option>
                <option value="<h1>">Titre 1 (H1)</option>
                <option value="<h2>">Titre 2 (H2)</option>
                <option value="<h3>">Titre 3 (H3)</option>
              </select>

              {/* SÉLECTEUR DE TAILLE DE POLICE */}
              <select
                onChange={(e) => handleFormat('fontSize', e.target.value)}
                defaultValue="3"
                style={{
                  padding: '4px 6px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: 'var(--bg-card)',
                  color: 'var(--text-main)',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  outline: 'none',
                }}
                title="Taille de police"
              >
                <option value="1">10px - Très petit</option>
                <option value="2">12px - Petit</option>
                <option value="3">14px - Normal</option>
                <option value="4">16px - Moyen</option>
                <option value="5">18px - Grand</option>
                <option value="6">24px - Très Grand</option>
                <option value="7">32px - Titre géant</option>
              </select>

              <div style={{ width: '1px', height: '18px', backgroundColor: 'var(--border-color)', margin: '0 2px' }} />

              {/* FORMATAGE DU TEXTE : B, I, U, S */}
              <button
                type="button"
                onClick={() => handleFormat('bold')}
                className="hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                style={{ border: 'none', background: 'transparent', borderRadius: '4px', padding: '5px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-main)' }}
                title="Gras (Ctrl+B)"
              >
                <Bold size={14} />
              </button>
              <button
                type="button"
                onClick={() => handleFormat('italic')}
                className="hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                style={{ border: 'none', background: 'transparent', borderRadius: '4px', padding: '5px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-main)' }}
                title="Italique (Ctrl+I)"
              >
                <Italic size={14} />
              </button>
              <button
                type="button"
                onClick={() => handleFormat('underline')}
                className="hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                style={{ border: 'none', background: 'transparent', borderRadius: '4px', padding: '5px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-main)' }}
                title="Souligné (Ctrl+U)"
              >
                <Underline size={14} />
              </button>
              <button
                type="button"
                onClick={() => handleFormat('strikeThrough')}
                className="hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                style={{ border: 'none', background: 'transparent', borderRadius: '4px', padding: '5px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-main)' }}
                title="Barré"
              >
                <Strikethrough size={14} />
              </button>

              <div style={{ width: '1px', height: '18px', backgroundColor: 'var(--border-color)', margin: '0 2px' }} />

              {/* COULEURS : TEXTE & SURLIGNAGE */}
              <label
                style={{ display: 'flex', alignItems: 'center', gap: '2px', cursor: 'pointer', padding: '2px 4px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)' }}
                title="Couleur du texte"
              >
                <Baseline size={13} style={{ color: 'var(--text-main)' }} />
                <input
                  type="color"
                  defaultValue="#1E293B"
                  onChange={(e) => handleFormat('foreColor', e.target.value)}
                  style={{ width: '14px', height: '14px', border: 'none', cursor: 'pointer', background: 'none', padding: 0 }}
                />
              </label>

              <label
                style={{ display: 'flex', alignItems: 'center', gap: '2px', cursor: 'pointer', padding: '2px 4px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)' }}
                title="Couleur de surlignage"
              >
                <Highlighter size={13} style={{ color: 'var(--text-main)' }} />
                <input
                  type="color"
                  defaultValue="#FEF08A"
                  onChange={(e) => handleFormat('hiliteColor', e.target.value)}
                  style={{ width: '14px', height: '14px', border: 'none', cursor: 'pointer', background: 'none', padding: 0 }}
                />
              </label>

              <div style={{ width: '1px', height: '18px', backgroundColor: 'var(--border-color)', margin: '0 2px' }} />

              {/* ALIGNEMENTS */}
              <button
                type="button"
                onClick={() => handleFormat('justifyLeft')}
                className="hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                style={{ border: 'none', background: 'transparent', borderRadius: '4px', padding: '5px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-main)' }}
                title="Aligner à gauche"
              >
                <AlignLeft size={14} />
              </button>
              <button
                type="button"
                onClick={() => handleFormat('justifyCenter')}
                className="hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                style={{ border: 'none', background: 'transparent', borderRadius: '4px', padding: '5px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-main)' }}
                title="Centrer"
              >
                <AlignCenter size={14} />
              </button>
              <button
                type="button"
                onClick={() => handleFormat('justifyRight')}
                className="hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                style={{ border: 'none', background: 'transparent', borderRadius: '4px', padding: '5px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-main)' }}
                title="Aligner à droite"
              >
                <AlignRight size={14} />
              </button>
              <button
                type="button"
                onClick={() => handleFormat('justifyFull')}
                className="hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                style={{ border: 'none', background: 'transparent', borderRadius: '4px', padding: '5px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-main)' }}
                title="Justifier"
              >
                <AlignJustify size={14} />
              </button>

              <div style={{ width: '1px', height: '18px', backgroundColor: 'var(--border-color)', margin: '0 2px' }} />

              {/* LISTES */}
              <button
                type="button"
                onClick={() => handleFormat('insertUnorderedList')}
                className="hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                style={{ border: 'none', background: 'transparent', borderRadius: '4px', padding: '5px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-main)' }}
                title="Liste à puces"
              >
                <List size={14} />
              </button>
              <button
                type="button"
                onClick={() => handleFormat('insertOrderedList')}
                className="hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                style={{ border: 'none', background: 'transparent', borderRadius: '4px', padding: '5px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-main)' }}
                title="Liste numérotée"
              >
                <ListOrdered size={14} />
              </button>

              <div style={{ width: '1px', height: '18px', backgroundColor: 'var(--border-color)', margin: '0 2px' }} />

              {/* ANNULER / RÉTABLIR / NETTOYER */}
              <button
                type="button"
                onClick={() => handleFormat('undo')}
                className="hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                style={{ border: 'none', background: 'transparent', borderRadius: '4px', padding: '5px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-main)' }}
                title="Annuler (Ctrl+Z)"
              >
                <Undo size={14} />
              </button>
              <button
                type="button"
                onClick={() => handleFormat('redo')}
                className="hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                style={{ border: 'none', background: 'transparent', borderRadius: '4px', padding: '5px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-main)' }}
                title="Rétablir (Ctrl+Y)"
              >
                <Redo size={14} />
              </button>
              <button
                type="button"
                onClick={() => handleFormat('removeFormat')}
                className="hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                style={{ border: 'none', background: 'transparent', borderRadius: '4px', padding: '5px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-main)' }}
                title="Effacer le formatage"
              >
                <RemoveFormatting size={14} />
              </button>

              <button
                type="button"
                onClick={handleDownloadMarkdown}
                style={{
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  padding: '3px 7px',
                  backgroundColor: 'var(--bg-card)',
                  color: 'var(--text-secondary)',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  marginLeft: 'auto',
                }}
                title="Exporter en Markdown (.md)"
              >
                Export .md
              </button>
            </div>
          )}

        </div>

        {/* CONTENU PRINCIPAL DE L'ONGLET SÉLECTIONNÉ */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* 1. TROCO DOCS : BUREAU GRIS CLAIR, TOOLBAR COMPLÈTE & PAGE A4 CENTRÉE */}
          {activeTab === 'docs' && (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#ECEFF1',
                overflowY: 'auto',
                padding: '20px 16px',
              }}
            >
              {/* DOCUMENT FEUILLE DE PAPIER A4 CENTRÉE */}
              <div
                ref={setEditorRef}
                contentEditable
                suppressContentEditableWarning
                placeholder="Rédigez ici vos comptes-rendus..."
                onInput={handleEditorInput}
                className="bg-white w-[21cm] min-h-[29.7cm] mx-auto shadow-md p-4 md:p-8 p-[2cm] text-black focus:outline-none"
                style={{
                  boxSizing: 'border-box',
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  fontSize: '14.5px',
                  lineHeight: '1.7',
                  marginBottom: '48px',
                  outline: 'none',
                  cursor: 'text',
                }}
              />
            </div>
          )}

          {/* 2. TROCO SHEETS : LIGNES ET COLONNES DYNAMIQUES */}
          {activeTab === 'sheets' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handleAddRow}
                    className="premium-button"
                    style={{
                      padding: '5px 10px',
                      fontSize: '11px',
                      fontWeight: '800',
                      backgroundColor: 'rgba(16, 185, 129, 0.12)',
                      color: '#10B981',
                      border: '1px solid #10B981',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                    title="Ajouter une ligne"
                  >
                    ➕ Ajouter Ligne
                  </button>
                  <button
                    type="button"
                    onClick={handleAddCol}
                    className="premium-button"
                    style={{
                      padding: '5px 10px',
                      fontSize: '11px',
                      fontWeight: '800',
                      backgroundColor: '#10B981',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                    title="Ajouter une colonne"
                  >
                    ➕ Ajouter Colonne
                  </button>
                </div>
              </div>

              {/* BARRE DE FORMULE ACTIVE */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <span style={{ fontSize: '12px', fontWeight: '800', backgroundColor: 'var(--bg-subtle)', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  {selectedCell}
                </span>
                <input
                  type="text"
                  value={(sheetData && sheetData[selectedCell]) || ''}
                  onChange={(e) => handleCellChange(selectedCell, e.target.value || '')}
                  placeholder="Valeur ou Formule (=SUM(A1:A5), =A1+B1)..."
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
                <button type="button" onClick={handleDownloadCSV} className="premium-button" style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '5px 8px', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>Export .csv</button>
              </div>

              {/* GRILLE TABLEUR EXCEL INTERACTIVE AVEC COLONNES & LIGNES DYNAMIQUES */}
              <div style={{ flex: 1, overflow: 'auto', border: '1px solid var(--border-color)', borderRadius: '12px', backgroundColor: 'var(--bg-subtle)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '700px' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-card)' }}>
                      <th style={{ width: '40px', padding: '8px', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>#</th>
                      {Array.from({ length: numCols }).map((_, cIdx) => {
                        const colLetter = getColLetter(cIdx);
                        return (
                          <th key={colLetter} style={{ padding: '8px', border: '1px solid var(--border-color)', fontWeight: '800', color: 'var(--text-main)', minWidth: '100px' }}>
                            {colLetter}
                          </th>
                        );
                      })}
                      <th style={{ width: '150px', padding: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-subtle)', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={handleAddCol}
                          style={{
                            border: 'none',
                            backgroundColor: '#10B981',
                            color: '#FFFFFF',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            fontSize: '11px',
                            fontWeight: '800',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                          title="Ajouter une colonne à droite"
                        >
                          ➕ Ajouter Colonne
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: numRows }).map((_, rIdx) => {
                      const rowNum = rIdx + 1;
                      return (
                        <tr key={rowNum}>
                          <td style={{ textAlign: 'center', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontWeight: '700' }}>
                            {rowNum}
                          </td>
                          {Array.from({ length: numCols }).map((_, cIdx) => {
                            const col = getColLetter(cIdx);
                            const cellKey = `${col}${rowNum}`;
                            const rawVal = (sheetData && sheetData[cellKey]) != null ? String(sheetData[cellKey]) : '';
                            const evaluated = evaluateCellFormula(rawVal, sheetData || {});
                            const isSelected = selectedCell === cellKey;
                            return (
                              <td
                                key={cellKey}
                                onClick={() => setSelectedCell(cellKey)}
                                style={{
                                  border: isSelected ? '2px solid #10B981' : '1px solid var(--border-color)',
                                  backgroundColor: isSelected ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-card)',
                                  padding: 0,
                                }}
                              >
                                <input
                                  type="text"
                                  value={(isSelected ? rawVal : evaluated) || ''}
                                  onChange={(e) => handleCellChange(cellKey, e.target.value)}
                                  onFocus={() => setSelectedCell(cellKey)}
                                  style={{
                                    width: '100%',
                                    border: 'none',
                                    outline: 'none',
                                    padding: '8px 10px',
                                    background: 'transparent',
                                    color: 'var(--text-main)',
                                    fontSize: '12.5px',
                                    fontWeight: String(rawVal || '').startsWith('=') || rowNum === 1 ? '700' : '400',
                                    textAlign: !isNaN(parseFloat(evaluated)) ? 'right' : 'left',
                                    boxSizing: 'border-box',
                                  }}
                                />
                              </td>
                            );
                          })}
                          <td style={{ border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)' }} />
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {/* BOUTON PERSISTANT AJOUTER LIGNE EN BAS DU TABLEAU */}
                <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <button
                    type="button"
                    onClick={handleAddRow}
                    className="premium-button"
                    style={{
                      border: '1.5px solid #10B981',
                      backgroundColor: 'rgba(16, 185, 129, 0.1)',
                      color: '#10B981',
                      borderRadius: '8px',
                      padding: '6px 14px',
                      fontSize: '12px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    ➕ Ajouter Ligne
                  </button>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {numRows} lignes × {numCols} colonnes
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 3. TROCO SLIDES (POWERPOINT / PRÉSENTATIONS) */}
          {activeTab === 'slides' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'row', overflow: 'hidden' }}>
              {/* LISTE DES DIAPOSITIVES LATÉRALE */}
              <div
                style={{
                  width: '240px',
                  borderRight: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-subtle)',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  overflowY: 'auto',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)' }}>Diapositives ({slides.length})</span>
                  <button
                    type="button"
                    onClick={handleAddSlide}
                    style={{
                      border: 'none',
                      backgroundColor: '#3B82F6',
                      color: '#FFF',
                      borderRadius: '8px',
                      padding: '4px 8px',
                      fontSize: '11px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Plus size={12} /> Diapo
                  </button>
                </div>

                {slides.map((s, idx) => (
                  <div
                    key={s.id || idx}
                    onClick={() => setCurrentSlideIndex(idx)}
                    style={{
                      border: currentSlideIndex === idx ? '2px solid #3B82F6' : '1px solid var(--border-color)',
                      borderRadius: '12px',
                      padding: '8px 10px',
                      backgroundColor: 'var(--bg-card)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: '700' }}>#{idx + 1}</div>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {s.title || 'Diapo sans titre'}
                      </div>
                    </div>
                    {slides.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSlide(idx);
                        }}
                        style={{ border: 'none', background: 'transparent', color: '#EF4444', cursor: 'pointer', padding: '2px' }}
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => setIsPresenting(true)}
                  className="premium-button"
                  style={{
                    marginTop: 'auto',
                    border: 'none',
                    background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                    color: '#FFF',
                    borderRadius: '12px',
                    padding: '10px',
                    fontWeight: '800',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <Play size={14} /> Diaporama Plein Écran
                </button>
              </div>

              {/* ÉDITEUR DE LA DIAPOSITIVE EN COURS */}
              <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    value={slides[currentSlideIndex]?.title || ''}
                    onChange={(e) => handleUpdateCurrentSlide('title', e.target.value)}
                    placeholder="Titre de la diapositive..."
                    style={{
                      flex: 1,
                      minWidth: '200px',
                      fontSize: '22px',
                      fontWeight: '700',
                      border: 'none',
                      outline: 'none',
                      backgroundColor: 'transparent',
                      color: 'var(--text-main)',
                      borderBottom: '1.5px solid var(--border-color)',
                      paddingBottom: '4px',
                    }}
                  />

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* SÉLECTEUR DE THÈME VISUEL */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Thème de fond :</label>
                      <select
                        value={slides[currentSlideIndex]?.theme || 'terracotta'}
                        onChange={(e) => handleUpdateCurrentSlide('theme', e.target.value)}
                        aria-label="Thème de fond"
                        style={{
                          padding: '5px 8px',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-card)',
                          color: 'var(--text-main)',
                          fontSize: '12px',
                          fontWeight: '700',
                        }}
                      >
                        <option value="light">Clair</option>
                        <option value="dark">Sombre</option>
                        <option value="gradient">Dégradé</option>
                        <option value="terracotta">Terracotta</option>
                      </select>
                    </div>

                    {/* BOUTON D'INSERTION D'IMAGE */}
                    <input
                      type="file"
                      ref={slideImageInputRef}
                      onChange={handleSlideImageUpload}
                      accept="image/*"
                      style={{ display: 'none' }}
                    />
                    <button
                      type="button"
                      onClick={() => slideImageInputRef.current?.click()}
                      disabled={isUploadingImage}
                      className="premium-button"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 10px',
                        backgroundColor: '#3B82F6',
                        color: '#FFFFFF',
                        borderRadius: '8px',
                        border: 'none',
                        fontSize: '11px',
                        fontWeight: '800',
                        cursor: isUploadingImage ? 'wait' : 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                      title="Insérer une image sur la diapositive"
                    >
                      <ImageIcon size={13} />
                      <span>{isUploadingImage ? 'Envoi...' : '➕ Image'}</span>
                    </button>
                  </div>
                </div>

                {/* CARTE APERÇU DIAPOSITIVE EN COURS AVEC THÈME DE FOND MODIFIÉ DYNAMIQUEMENT */}
                <div
                  style={{
                    ...getSlideBackgroundStyle(slides[currentSlideIndex]?.theme),
                    borderRadius: '16px',
                    padding: '24px 22px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                    minHeight: '240px',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    transition: 'all 0.25s ease',
                  }}
                >
                  <h2 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 6px 0', letterSpacing: '-0.01em' }}>
                    {slides[currentSlideIndex]?.title || 'Titre de la diapositive'}
                  </h2>
                  <p style={{ fontSize: '14px', opacity: 0.9, margin: '0 0 14px 0', fontStyle: 'italic' }}>
                    {slides[currentSlideIndex]?.subtitle || 'Sous-titre et contexte du projet'}
                  </p>

                  {/* IMAGE REDIMENSIONNABLE EN SURIMPRESSION */}
                  {slides[currentSlideIndex]?.imageUrl && (
                    <div style={{ margin: '12px auto', textAlign: 'center', position: 'relative' }}>
                      <img
                        src={slides[currentSlideIndex].imageUrl}
                        alt="Illustration diapositive"
                        style={{
                          width: `${slides[currentSlideIndex].imageWidth || 280}px`,
                          maxHeight: '240px',
                          objectFit: 'contain',
                          borderRadius: '10px',
                          boxShadow: '0 6px 18px rgba(0,0,0,0.25)',
                          display: 'inline-block',
                        }}
                      />
                      {/* Contrôles de redimensionnement de l'image */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          marginTop: '8px',
                          backgroundColor: 'rgba(0,0,0,0.5)',
                          padding: '3px 8px',
                          borderRadius: '8px',
                          width: 'fit-content',
                          margin: '8px auto 0 auto',
                        }}
                      >
                        <span style={{ fontSize: '11px', color: '#FFF', fontWeight: '600' }}>Taille :</span>
                        <input
                          type="range"
                          min="100"
                          max="550"
                          value={slides[currentSlideIndex].imageWidth || 280}
                          onChange={(e) => handleUpdateCurrentSlide('imageWidth', Number(e.target.value))}
                          style={{ width: '90px', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '11px', color: '#FFF' }}>{slides[currentSlideIndex].imageWidth || 280}px</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateCurrentSlide('imageUrl', null)}
                          style={{
                            border: 'none',
                            backgroundColor: 'rgba(239, 68, 68, 0.85)',
                            color: '#FFF',
                            borderRadius: '4px',
                            padding: '2px 6px',
                            fontSize: '10px',
                            fontWeight: '700',
                            cursor: 'pointer',
                          }}
                          title="Supprimer l'image"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )}

                  <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {(slides[currentSlideIndex]?.bullets || []).map((b, i) => (
                      <li key={i} style={{ fontSize: '13.5px', fontWeight: '600', opacity: 0.95 }}>
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>

                <input
                  type="text"
                  value={slides[currentSlideIndex]?.subtitle || ''}
                  onChange={(e) => handleUpdateCurrentSlide('subtitle', e.target.value)}
                  placeholder="Sous-titre / Message clé..."
                  style={{
                    fontSize: '14px',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-subtle)',
                    color: 'var(--text-secondary)',
                    outline: 'none',
                  }}
                />

                {/* PUCES DE CONTENU */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)' }}>Arguments & Points Clés :</span>
                  {(slides[currentSlideIndex]?.bullets || []).map((bullet, bIdx) => (
                    <div key={bIdx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: 'var(--accent-primary)', fontWeight: '800' }}>•</span>
                      <input
                        type="text"
                        value={bullet}
                        onChange={(e) => {
                          const nextBullets = [...(slides[currentSlideIndex]?.bullets || [])];
                          nextBullets[bIdx] = e.target.value;
                          handleUpdateCurrentSlide('bullets', nextBullets);
                        }}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-card)',
                          color: 'var(--text-main)',
                          fontSize: '13px',
                          outline: 'none',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const nextBullets = (slides[currentSlideIndex]?.bullets || []).filter((_, i) => i !== bIdx);
                          handleUpdateCurrentSlide('bullets', nextBullets);
                        }}
                        style={{ border: 'none', background: 'transparent', color: '#EF4444', cursor: 'pointer' }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const nextBullets = [...(slides[currentSlideIndex]?.bullets || []), 'Nouveau point clé'];
                      handleUpdateCurrentSlide('bullets', nextBullets);
                    }}
                    style={{
                      alignSelf: 'flex-start',
                      border: '1px dashed var(--border-color)',
                      backgroundColor: 'transparent',
                      color: 'var(--text-secondary)',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer',
                    }}
                  >
                    + Ajouter un point clé
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 4. HISTORIQUE DES VERSIONS */}
          {activeTab === 'history' && (
            <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: '18px', color: 'var(--text-main)' }}>
                Historique des Versions & Restauration Instantanée
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 20px' }}>
                Toutes les modifications collaboratives sont archivées avec horodatage et auteur.
              </p>

              {versionHistory.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', backgroundColor: 'var(--bg-subtle)', borderRadius: '16px', color: 'var(--text-secondary)' }}>
                  Aucune révision antérieure enregistrée pour cette session. Les versions s'archivent automatiquement au fil des modifications.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {versionHistory.map(v => (
                    <div
                      key={v.id}
                      style={{
                        padding: '14px',
                        borderRadius: '14px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-card)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)' }}>
                          {v?.type === 'doc' ? '📄 Document' : v?.type === 'sheet' ? '📊 Tableur' : '📽️ Diaporama'} • {v?.title || 'Sans titre'}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          Modifié à {v?.timestamp || 'Date inconnue'} par <strong>{v?.author || 'Collaborateur'}</strong>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (v?.type === 'doc') {
                            const c = v?.content || '';
                            setDocContent(c);
                            saveDocToFirestore(c);
                            setActiveTab('docs');
                          } else if (v?.type === 'sheet') {
                            const g = v?.gridData || v?.cells || {};
                            setSheetData(g);
                            saveSheetToFirestore(g);
                            setActiveTab('sheets');
                          } else if (v?.type === 'slides') {
                            const s = Array.isArray(v?.slides) ? v.slides : DEFAULT_SLIDES;
                            setSlides(s);
                            saveSlidesToFirestore(s);
                            setActiveTab('slides');
                          }
                        }}
                        className="premium-button"
                        style={{
                          border: '1.5px solid var(--accent-primary)',
                          backgroundColor: 'var(--bg-subtle)',
                          color: 'var(--accent-primary)',
                          borderRadius: '10px',
                          padding: '6px 12px',
                          fontSize: '12px',
                          fontWeight: '800',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <RotateCcw size={12} /> Restaurer
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // @guard DO NOT REMOVE PORTAL. Required to escape chat overflow and z-index stacking context on mobile.
  return typeof document !== 'undefined' && document.body
    ? createPortal(modalContent, document.body)
    : modalContent;
}

export default function CloudOfficeSuiteModal(props) {
  // 🚨 PHASE 103 : La première ligne du composant DOIT être if (!isOpen) return null;
  if (!props?.isOpen) return null;

  const documentData = props?.document || props?.documentData || props?.note || defaultDoc;
  // 🚨 PHASE 103 : Initialise les objets avec des valeurs par défaut pour éviter le crash de l'éditeur de texte
  const content = documentData?.content ?? '';

  return (
    <CloudOfficeSuiteModalContent
      {...props}
      documentData={documentData}
      defaultContent={content}
    />
  );
}

