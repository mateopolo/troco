import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X, FileText, Table,
  Bold, Italic, Heading1, Heading2, List, Code,
  Presentation, History, Plus, Trash2,
  Play, RotateCcw, Sparkles
} from 'lucide-react';
import { doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

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
      contentHtml = `<h1>${safeDocTitle}</h1><pre style="white-space: pre-wrap; font-family: inherit; font-size: 14px; line-height: 1.6;">${safeDocContent}</pre>`;
    } else if (activeTab === 'sheets') {
      const cols = ['A', 'B', 'C', 'D', 'E', 'F'];
      const rowsHtml = [];
      for (let r = 1; r <= 10; r++) {
        const cellsHtml = cols.map(c => {
          const val = evaluateCellFormula(sheetData?.[`${c}${r}`] || '', sheetData);
          return r === 1 ? `<th style="background:#FAF7F2;">${val}</th>` : `<td>${val}</td>`;
        }).join('');
        rowsHtml.push(`<tr>${cellsHtml}</tr>`);
      }
      const tableHtml = `<table border="1" cellpadding="8" style="border-collapse: collapse; width: 100%;">${rowsHtml.join('')}</table>`;
      contentHtml = `<h1>${safeSheetTitle}</h1>${tableHtml}`;
    } else {
      contentHtml = `<h1>${safeSlidesTitle}</h1>` + (slides || []).map((s, idx) => `
        <div style="page-break-after: always; padding: 24px; border: 1px solid #ddd; margin-bottom: 20px; border-radius: 12px;">
          <h2>Diapo ${idx + 1} : ${s?.title || ''}</h2>
          <p style="color: #666; font-style: italic;">${s?.subtitle || ''}</p>
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
    const safeDocContent = String(docContent || '');
    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>${safeDocTitle}</title></head><body>`;
    const footer = `</body></html>`;
    const body = `<h1>${safeDocTitle}</h1><p>${safeDocContent.replace(/\n/g, '<br/>')}</p>`;
    const blob = new Blob(['\ufeff', header + body + footer], { type: 'application/msword' });
    const link = document.createElement('a');
    link.download = `${safeDocTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.docx`;
    link.href = URL.createObjectURL(blob);
    link.click();
  };

  // 3. Export Excel (.xlsx / XML Spreadsheet)
  const handleDownloadXLSX = () => {
    const safeSheetTitle = String(sheetTitle || 'Feuille_de_calcul');
    const cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
    let rowsXml = '';
    for (let r = 1; r <= 15; r++) {
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
    const cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
    let csv = '';
    for (let r = 1; r <= 15; r++) {
      const rowVals = cols.map(c => `"${(evaluateCellFormula(sheetData?.[`${c}${r}`] || '', sheetData)).replace(/"/g, '""')}"`);
      csv += rowVals.join(',') + '\n';
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.download = `${safeSheetTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.csv`;
    link.href = URL.createObjectURL(blob);
    link.click();
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
              backgroundColor: slides[currentSlideIndex]?.theme === 'dark' ? '#181513' : slides[currentSlideIndex]?.theme === 'terracotta' ? '#C67D5B' : '#FAF7F2',
              color: slides[currentSlideIndex]?.theme === 'light' ? '#2D2825' : '#FFFFFF',
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

            <div style={{ maxWidth: '900px', margin: '0 auto', width: '100%', textAlign: 'center' }}>
              <h1 className="font-editorial-heading" style={{ fontSize: '48px', fontWeight: '700', marginBottom: '16px', letterSpacing: '-0.02em' }}>
                {slides[currentSlideIndex]?.title}
              </h1>
              <p style={{ fontSize: '20px', opacity: 0.9, marginBottom: '36px', fontStyle: 'italic' }}>
                {slides[currentSlideIndex]?.subtitle}
              </p>
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
          style={{
            position: 'relative',
            zIndex: 1000000,
            width: '100%',
            maxWidth: '1100px',
            height: '90vh',
            maxHeight: '850px',
            backgroundColor: 'var(--bg-card)',
            borderRadius: '24px',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-modal)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'fadeSlideUp 0.3s ease both',
          }}
        >
        {/* HEADER MODALE */}
        <div
          style={{
            padding: '12px 18px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--bg-subtle)',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          {/* SÉLECTEUR D'ONGLETS / OUTILS BUREAUTIQUES */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={() => setActiveTab('docs')}
              className="premium-button"
              style={{
                border: activeTab === 'docs' ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)',
                backgroundColor: activeTab === 'docs' ? 'rgba(198, 125, 91, 0.15)' : 'var(--bg-card)',
                color: activeTab === 'docs' ? 'var(--accent-primary)' : 'var(--text-main)',
                borderRadius: '10px',
                padding: '6px 12px',
                fontSize: '12.5px',
                fontWeight: '800',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
              }}
            >
              <FileText size={15} />
              <span>Troco Docs</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('sheets')}
              className="premium-button"
              style={{
                border: activeTab === 'sheets' ? '1.5px solid #10B981' : '1px solid var(--border-color)',
                backgroundColor: activeTab === 'sheets' ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-card)',
                color: activeTab === 'sheets' ? '#10B981' : 'var(--text-main)',
                borderRadius: '10px',
                padding: '6px 12px',
                fontSize: '12.5px',
                fontWeight: '800',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
              }}
            >
              <Table size={15} />
              <span>Troco Sheets</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('slides')}
              className="premium-button"
              style={{
                border: activeTab === 'slides' ? '1.5px solid #3B82F6' : '1px solid var(--border-color)',
                backgroundColor: activeTab === 'slides' ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-card)',
                color: activeTab === 'slides' ? '#3B82F6' : 'var(--text-main)',
                borderRadius: '10px',
                padding: '6px 12px',
                fontSize: '12.5px',
                fontWeight: '800',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
              }}
            >
              <Presentation size={15} />
              <span>Troco Slides</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className="premium-button"
              style={{
                border: activeTab === 'history' ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)',
                backgroundColor: activeTab === 'history' ? 'var(--bg-subtle)' : 'transparent',
                color: 'var(--text-secondary)',
                borderRadius: '10px',
                padding: '6px 10px',
                fontSize: '12px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer',
              }}
              title="Historique des versions"
            >
              <History size={14} />
              <span>Versions ({versionHistory.length})</span>
            </button>
          </div>

          {/* ACTIONS & EXPORTS */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              👥 {collaborators.join(', ')} • {saveStatus}
            </span>

            {/* BOUTONS D'EXPORTS MULTI-FORMATS */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                type="button"
                onClick={handleDownloadPDF}
                className="premium-button"
                style={{
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-card)',
                  color: 'var(--text-main)',
                  borderRadius: '8px',
                  padding: '5px 8px',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
                title="Exporter en PDF imprimable"
              >
                📄 PDF
              </button>

              <button
                type="button"
                onClick={handleDownloadDOCX}
                className="premium-button"
                style={{
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-card)',
                  color: 'var(--text-main)',
                  borderRadius: '8px',
                  padding: '5px 8px',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
                title="Exporter au format Word (.docx)"
              >
                📝 DOCX
              </button>

              <button
                type="button"
                onClick={handleDownloadXLSX}
                className="premium-button"
                style={{
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-card)',
                  color: 'var(--text-main)',
                  borderRadius: '8px',
                  padding: '5px 8px',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
                title="Exporter au format Excel (.xlsx)"
              >
                📊 XLSX
              </button>

              <button
                type="button"
                onClick={handleDownloadPPTX}
                className="premium-button"
                style={{
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-card)',
                  color: 'var(--text-main)',
                  borderRadius: '8px',
                  padding: '5px 8px',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
                title="Exporter au format PowerPoint (.pptx)"
              >
                📽️ PPTX
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="premium-button"
              style={{
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-main)',
                borderRadius: '8px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* CONTENU PRINCIPAL DE L'ONGLET SÉLECTIONNÉ */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* 1. TROCO DOCS */}
          {activeTab === 'docs' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px', overflow: 'hidden' }}>
              <input
                type="text"
                value={docTitle}
                onChange={(e) => {
                  setDocTitle(e.target.value);
                  saveDocToFirestore(docContent, e.target.value);
                }}
                style={{
                  fontSize: '18px',
                  fontWeight: '700',
                  border: 'none',
                  outline: 'none',
                  backgroundColor: 'transparent',
                  color: 'var(--text-main)',
                  marginBottom: '12px',
                  paddingBottom: '6px',
                  borderBottom: '1px solid var(--border-color)',
                }}
              />

              {/* TOOLBAR FORMATAGE MARKDOWN */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '10px', flexWrap: 'wrap' }}>
                <button type="button" onClick={() => insertMarkdownFormatting('**', '**')} className="premium-button" style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '4px 8px', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', cursor: 'pointer' }}><Bold size={13} /></button>
                <button type="button" onClick={() => insertMarkdownFormatting('*', '*')} className="premium-button" style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '4px 8px', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', cursor: 'pointer' }}><Italic size={13} /></button>
                <button type="button" onClick={() => insertMarkdownFormatting('# ', '')} className="premium-button" style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '4px 8px', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', cursor: 'pointer' }}><Heading1 size={13} /></button>
                <button type="button" onClick={() => insertMarkdownFormatting('## ', '')} className="premium-button" style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '4px 8px', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', cursor: 'pointer' }}><Heading2 size={13} /></button>
                <button type="button" onClick={() => insertMarkdownFormatting('- [ ] ', '')} className="premium-button" style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '4px 8px', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', cursor: 'pointer' }}><List size={13} /></button>
                <button type="button" onClick={() => insertMarkdownFormatting('```javascript\n', '\n```')} className="premium-button" style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '4px 8px', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', cursor: 'pointer' }}><Code size={13} /></button>
                <button type="button" onClick={handleDownloadMarkdown} className="premium-button" style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '4px 8px', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', fontSize: '11px', fontWeight: '700', cursor: 'pointer', marginLeft: 'auto' }}>Export .md</button>
              </div>

              <textarea
                ref={textareaRef}
                value={docContent || ''}
                onChange={(e) => {
                  const val = e.target.value || '';
                  setDocContent(val);
                  saveDocToFirestore(val);
                }}
                placeholder="Rédigez ici vos comptes-rendus..."
                style={{
                  flex: 1,
                  width: '100%',
                  border: '1px solid var(--border-color)',
                  borderRadius: '14px',
                  padding: '16px',
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--text-main)',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  lineHeight: 1.6,
                  resize: 'none',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          )}

          {/* 2. TROCO SHEETS */}
          {activeTab === 'sheets' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px', overflow: 'hidden' }}>
              <input
                type="text"
                value={sheetTitle || ''}
                onChange={(e) => {
                  const val = e.target.value || '';
                  setSheetTitle(val);
                  saveSheetToFirestore(sheetData || {}, val);
                }}
                style={{
                  fontSize: '18px',
                  fontWeight: '700',
                  border: 'none',
                  outline: 'none',
                  backgroundColor: 'transparent',
                  color: 'var(--text-main)',
                  marginBottom: '12px',
                  paddingBottom: '6px',
                  borderBottom: '1px solid var(--border-color)',
                }}
              />

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

              {/* GRILLE TABLEUR EXCEL INTERACTIVE */}
              <div style={{ flex: 1, overflow: 'auto', border: '1px solid var(--border-color)', borderRadius: '12px', backgroundColor: 'var(--bg-subtle)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '600px' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-card)' }}>
                      <th style={{ width: '40px', padding: '8px', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>#</th>
                      {['A', 'B', 'C', 'D', 'E', 'F', 'G'].map(col => (
                        <th key={col} style={{ padding: '8px', border: '1px solid var(--border-color)', fontWeight: '800', color: 'var(--text-main)' }}>
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 14 }).map((_, rIdx) => {
                      const rowNum = rIdx + 1;
                      return (
                        <tr key={rowNum}>
                          <td style={{ textAlign: 'center', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontWeight: '700' }}>
                            {rowNum}
                          </td>
                          {['A', 'B', 'C', 'D', 'E', 'F', 'G'].map(col => {
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
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <input
                    type="text"
                    value={slides[currentSlideIndex]?.title || ''}
                    onChange={(e) => handleUpdateCurrentSlide('title', e.target.value)}
                    placeholder="Titre de la diapositive..."
                    style={{
                      flex: 1,
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
                  {/* SÉLECTEUR DE THÈME VISUEL */}
                  <select
                    value={slides[currentSlideIndex]?.theme || 'terracotta'}
                    onChange={(e) => handleUpdateCurrentSlide('theme', e.target.value)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-card)',
                      color: 'var(--text-main)',
                      fontSize: '12px',
                      fontWeight: '700',
                    }}
                  >
                    <option value="terracotta">Thème Terracotta</option>
                    <option value="dark">Thème Sombre</option>
                    <option value="light">Thème Clair</option>
                  </select>
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

