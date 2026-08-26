import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X, FileText, Table, Download,
  Printer, Bold, Italic, Heading1, Heading2, List, Code
} from 'lucide-react';
import { doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

// Helper pour évaluer des formules simples de tableur (=SUM(A1:A5), =A1+B1, etc.)
const evaluateCellFormula = (val, gridData) => {
  if (typeof val !== 'string' || !val.startsWith('=')) {
    return val;
  }

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
          const num = parseFloat(gridData[key]);
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
          const num = parseFloat(gridData[key]);
          if (!isNaN(num)) {
            sum += num;
            count++;
          }
        }
      }
      return count > 0 ? String(Math.round((sum / count) * 100) / 100) : '0';
    }

    // 3. Remplacement simple des références de cellules (ex: A1 + B2)
    const sanitized = expr.replace(/([A-Z])(\d+)/g, (match, col, row) => {
      const cellVal = gridData[match];
      const num = parseFloat(cellVal);
      return !isNaN(num) ? String(num) : '0';
    });

    if (/^[0-9+\-*/().\s]+$/.test(sanitized)) {
      // eslint-disable-next-line no-eval
      const result = Function(`"use strict"; return (${sanitized});`)();
      return String(typeof result === 'number' ? Math.round(result * 100) / 100 : result);
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

export default function CloudOfficeSuiteModal({
  isOpen,
  onClose,
  groupId = 'demo_group_office',
  projectTitle = 'Suite Collaborative Troco',
  currentUser = null,
  darkMode = false,
  initialTab = 'docs',
}) {
  const [activeTab, setActiveTab] = useState(initialTab); // 'docs' | 'sheets'
  const [docTitle, setDocTitle] = useState('Spécifications & Notes - ' + projectTitle);
  const [docContent, setDocContent] = useState(DEFAULT_DOC_TEXT);
  const [sheetTitle, setSheetTitle] = useState('Budget & Planning - ' + projectTitle);
  const [sheetData, setSheetData] = useState(DEFAULT_SHEET_DATA);
  const [selectedCell, setSelectedCell] = useState('A1');
  const [saveStatus, setSaveStatus] = useState('Synchronisé en direct 🟢');
  const [collaborators, setCollaborators] = useState(['Mateo P.', 'Collaborateur']);

  const textareaRef = useRef(null);

  // Synchronisation Firestore en temps réel pour Troco Docs
  useEffect(() => {
    if (!isOpen || !groupId || !db) return;

    try {
      const docRef = doc(db, 'chats', String(groupId), 'workspace', 'document');
      const unsubscribe = onSnapshot(docRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data.title) setDocTitle(data.title);
          if (data.content && data.lastEditor !== (currentUser?.name || currentUser?.id)) {
            setDocContent(data.content);
          }
          if (data.collaborators && Array.isArray(data.collaborators)) {
            setCollaborators(data.collaborators);
          }
          setSaveStatus('Synchronisé en direct 🟢');
        }
      }, (err) => {
        console.warn('[TrocoDocs] snapshot error:', err);
      });

      return () => unsubscribe();
    } catch (_) {}
  }, [isOpen, groupId, currentUser]);

  // Synchronisation Firestore en temps réel pour Troco Sheets
  useEffect(() => {
    if (!isOpen || !groupId || !db) return;

    try {
      const sheetRef = doc(db, 'chats', String(groupId), 'workspace', 'spreadsheet');
      const unsubscribe = onSnapshot(sheetRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data.title) setSheetTitle(data.title);
          if (data.gridData && data.lastEditor !== (currentUser?.name || currentUser?.id)) {
            setSheetData(data.gridData);
          }
          setSaveStatus('Synchronisé en direct 🟢');
        }
      }, (err) => {
        console.warn('[TrocoSheets] snapshot error:', err);
      });

      return () => unsubscribe();
    } catch (_) {}
  }, [isOpen, groupId, currentUser]);

  // Sauvegarde des modifications Troco Docs
  const saveDocToFirestore = useCallback(async (newContent, newTitle = docTitle) => {
    if (!groupId || !db) return;
    try {
      setSaveStatus('Sauvegarde en cours...');
      const myName = currentUser?.name || 'Moi';
      const docRef = doc(db, 'chats', String(groupId), 'workspace', 'document');
      await setDoc(docRef, {
        title: newTitle,
        content: newContent,
        lastEditor: myName,
        updatedAt: serverTimestamp(),
        collaborators: [myName, 'Collaborateur en direct'],
      }, { merge: true });
      setSaveStatus('Synchronisé en direct 🟢');
    } catch (err) {
      console.warn('[TrocoDocs] Save error:', err);
      setSaveStatus('Mode hors-ligne');
    }
  }, [groupId, currentUser, docTitle]);

  // Sauvegarde des modifications Troco Sheets
  const saveSheetToFirestore = useCallback(async (newGridData, newTitle = sheetTitle) => {
    if (!groupId || !db) return;
    try {
      setSaveStatus('Sauvegarde en cours...');
      const myName = currentUser?.name || 'Moi';
      const sheetRef = doc(db, 'chats', String(groupId), 'workspace', 'spreadsheet');
      await setDoc(sheetRef, {
        title: newTitle,
        gridData: newGridData,
        lastEditor: myName,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      setSaveStatus('Synchronisé en direct 🟢');
    } catch (err) {
      console.warn('[TrocoSheets] Save error:', err);
      setSaveStatus('Mode hors-ligne');
    }
  }, [groupId, currentUser, sheetTitle]);

  // Insertion de formatage Markdown dans Troco Docs
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

  // Télécharger le document Markdown
  const handleDownloadDoc = () => {
    const blob = new Blob([docContent], { type: 'text/markdown;charset=utf-8' });
    const link = document.createElement('a');
    link.download = `${docTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
    link.href = URL.createObjectURL(blob);
    link.click();
  };

  // Télécharger le tableur en CSV
  const handleDownloadSheetCSV = () => {
    const cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
    const rowsCount = 12;
    let csv = '';

    for (let r = 1; r <= rowsCount; r++) {
      const rowVals = cols.map(c => {
        const key = `${c}${r}`;
        const raw = sheetData[key] || '';
        const evaluated = evaluateCellFormula(raw, sheetData);
        return `"${String(evaluated).replace(/"/g, '""')}"`;
      });
      csv += rowVals.join(',') + '\n';
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.download = `${sheetTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.csv`;
    link.href = URL.createObjectURL(blob);
    link.click();
  };

  // Imprimer / Enregistrer en PDF
  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  // Calcul du nombre de mots & caractères pour Troco Docs
  const wordCount = docContent.trim() ? docContent.trim().split(/\s+/).length : 0;
  const charCount = docContent.length;

  const cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  const rows = Array.from({ length: 12 }, (_, i) => i + 1);

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
        padding: '12px 12px max(80px, env(safe-area-inset-bottom, 24px)) 12px',
        animation: 'fadeIn 0.2s ease both',
        boxSizing: 'border-box',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1080px',
          height: 'min(calc(100dvh - 80px), 840px)',
          backgroundColor: darkMode ? '#181412' : '#FAF8F5',
          borderRadius: '24px',
          border: '1px solid var(--border-color)',
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
        {/* 1. EN-TÊTE WORKSPACE (SÉLECTEUR TROCO DOCS / TROCO SHEETS + PRÉSENCE) */}
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
            {/* BOUTONS DE COMMUTATION DES OUTILS OPEN-SOURCE */}
            <div
              style={{
                display: 'flex',
                backgroundColor: 'var(--bg-subtle)',
                padding: '3px',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
              }}
            >
              <button
                type="button"
                onClick={() => setActiveTab('docs')}
                style={{
                  border: 'none',
                  backgroundColor: activeTab === 'docs' ? 'var(--accent-primary)' : 'transparent',
                  color: activeTab === 'docs' ? '#FFFFFF' : 'var(--text-secondary)',
                  padding: '6px 12px',
                  borderRadius: '9px',
                  fontSize: '12px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                <FileText size={14} />
                <span>Troco Docs</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('sheets')}
                style={{
                  border: 'none',
                  backgroundColor: activeTab === 'sheets' ? '#10B981' : 'transparent',
                  color: activeTab === 'sheets' ? '#FFFFFF' : 'var(--text-secondary)',
                  padding: '6px 12px',
                  borderRadius: '9px',
                  fontSize: '12px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                <Table size={14} />
                <span>Troco Sheets</span>
              </button>
            </div>

            {/* INDICATEUR DE STATUT & PRÉSENCE */}
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10B981', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '2px 8px', borderRadius: '999px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block', animation: 'pulse 1.8s infinite' }} />
                  {collaborators.length} en ligne
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{saveStatus}</span>
              </div>
            </div>
          </div>

          {/* ACTIONS HEADER */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            {activeTab === 'docs' ? (
              <button
                type="button"
                onClick={handleDownloadDoc}
                className="premium-button"
                style={{
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-card)',
                  color: 'var(--text-main)',
                  borderRadius: '10px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                }}
                title="Télécharger en Markdown (.md)"
              >
                <Download size={13} />
                <span>Export .md</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleDownloadSheetCSV}
                className="premium-button"
                style={{
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-card)',
                  color: 'var(--text-main)',
                  borderRadius: '10px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                }}
                title="Télécharger en CSV (.csv)"
              >
                <Download size={13} />
                <span>Export CSV</span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePrint}
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
              title="Imprimer ou enregistrer en PDF"
            >
              <Printer size={14} />
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
              title="Fermer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* 2. VUE TROCO DOCS (ALTERNATIVE OPEN-SOURCE TYPE NOTION/WORD) */}
        {activeTab === 'docs' && (
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', backgroundColor: darkMode ? '#181412' : '#FFFFFF' }}>
            {/* BARRE D'OUTILS DE MISE EN FORME DU TEXTE */}
            <div
              style={{
                padding: '8px 14px',
                borderBottom: '1px solid var(--border-color)',
                backgroundColor: darkMode ? '#1F1B18' : '#FAF8F5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                flexWrap: 'wrap',
                flexShrink: 0,
              }}
            >
              {/* BOUTONS FORMATAGE MARKDOWN */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => insertMarkdownFormatting('**', '**')}
                  style={{ border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', width: '28px', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  title="Gras (**texte**)"
                >
                  <Bold size={13} />
                </button>

                <button
                  type="button"
                  onClick={() => insertMarkdownFormatting('*', '*')}
                  style={{ border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', width: '28px', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  title="Italique (*texte*)"
                >
                  <Italic size={13} />
                </button>

                <button
                  type="button"
                  onClick={() => insertMarkdownFormatting('# ')}
                  style={{ border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', width: '28px', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  title="Titre 1 (# Titre)"
                >
                  <Heading1 size={13} />
                </button>

                <button
                  type="button"
                  onClick={() => insertMarkdownFormatting('## ')}
                  style={{ border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', width: '28px', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  title="Titre 2 (## Sous-titre)"
                >
                  <Heading2 size={13} />
                </button>

                <button
                  type="button"
                  onClick={() => insertMarkdownFormatting('- ')}
                  style={{ border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', width: '28px', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  title="Liste à puces (- élément)"
                >
                  <List size={13} />
                </button>

                <button
                  type="button"
                  onClick={() => insertMarkdownFormatting('```\n', '\n```')}
                  style={{ border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', width: '28px', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  title="Bloc de code (```code```)"
                >
                  <Code size={13} />
                </button>
              </div>

              {/* STATISTIQUES DU DOCUMENT */}
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>{wordCount} mots</span>
                <span>•</span>
                <span>{charCount} caractères</span>
              </div>
            </div>

            {/* TITRE DU DOCUMENT */}
            <div style={{ padding: '12px 20px 4px 20px' }}>
              <input
                type="text"
                value={docTitle}
                onChange={(e) => {
                  setDocTitle(e.target.value);
                  saveDocToFirestore(docContent, e.target.value);
                }}
                placeholder="Titre du document..."
                style={{
                  width: '100%',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: 'var(--text-main)',
                  fontSize: '18px',
                  fontWeight: '800',
                  outline: 'none',
                }}
              />
            </div>

            {/* GRAND ÉDITEUR DE TEXTE PLEIN ÉCRAN */}
            <div style={{ flex: 1, minHeight: 0, padding: '10px 20px 20px 20px', display: 'flex', flexDirection: 'column' }}>
              <textarea
                ref={textareaRef}
                value={docContent}
                onChange={(e) => {
                  setDocContent(e.target.value);
                  saveDocToFirestore(e.target.value);
                }}
                placeholder="Commencez à rédiger vos spécifications, compte-rendu ou notes de projet en Markdown..."
                style={{
                  width: '100%',
                  flex: 1,
                  minHeight: 0,
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: 'var(--text-main)',
                  fontSize: '13.5px',
                  lineHeight: 1.6,
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  resize: 'none',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>
        )}

        {/* 3. VUE TROCO SHEETS (ALTERNATIVE OPEN-SOURCE TYPE EXCEL) */}
        {activeTab === 'sheets' && (
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', backgroundColor: darkMode ? '#181412' : '#FFFFFF' }}>
            {/* BARRE DE FORMULE FX & TITRE */}
            <div
              style={{
                padding: '8px 14px',
                borderBottom: '1px solid var(--border-color)',
                backgroundColor: darkMode ? '#1F1B18' : '#FAF8F5',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                flexShrink: 0,
              }}
            >
              {/* CELLULE ACTIVE */}
              <div
                style={{
                  width: '42px',
                  padding: '4px 6px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-card)',
                  border: '1.5px solid #10B981',
                  color: '#10B981',
                  fontSize: '12px',
                  fontWeight: '800',
                  textAlign: 'center',
                }}
              >
                {selectedCell}
              </div>

              <div style={{ fontSize: '13px', fontWeight: '900', color: 'var(--text-secondary)' }}>
                fx
              </div>

              {/* INPUT DE FORMULE */}
              <input
                type="text"
                value={sheetData[selectedCell] || ''}
                onChange={(e) => handleCellChange(selectedCell, e.target.value)}
                placeholder="Entrez une valeur ou une formule (ex: =SUM(A1:A5), =A1+B1)..."
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-card)',
                  color: 'var(--text-main)',
                  fontSize: '12.5px',
                  outline: 'none',
                }}
              />
            </div>

            {/* GRILLE TABLEUR DYNAMIQUE (COLONNES A-G x LIGNES 1-12) */}
            <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '8px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '40px repeat(7, minmax(130px, 1fr))', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                {/* EN-TÊTE DES COLONNES */}
                <div style={{ backgroundColor: darkMode ? '#221D1A' : '#E8DDD3', borderBottom: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)', height: '28px' }} />
                {cols.map(c => (
                  <div
                    key={c}
                    style={{
                      backgroundColor: darkMode ? '#221D1A' : '#F5EAE4',
                      borderBottom: '1px solid var(--border-color)',
                      borderRight: '1px solid var(--border-color)',
                      textAlign: 'center',
                      fontSize: '11px',
                      fontWeight: '800',
                      color: 'var(--text-main)',
                      lineHeight: '28px',
                      userSelect: 'none',
                    }}
                  >
                    {c}
                  </div>
                ))}

                {/* LIGNES & CELLULES */}
                {rows.map(r => (
                  <React.Fragment key={r}>
                    {/* NUMÉRO DE LIGNE */}
                    <div
                      style={{
                        backgroundColor: darkMode ? '#221D1A' : '#F5EAE4',
                        borderBottom: '1px solid var(--border-color)',
                        borderRight: '1px solid var(--border-color)',
                        textAlign: 'center',
                        fontSize: '11px',
                        fontWeight: '800',
                        color: 'var(--text-secondary)',
                        lineHeight: '32px',
                        userSelect: 'none',
                      }}
                    >
                      {r}
                    </div>

                    {/* CELLULES A-G DE LA LIGNE */}
                    {cols.map(c => {
                      const cellKey = `${c}${r}`;
                      const rawVal = sheetData[cellKey] || '';
                      const isSelected = selectedCell === cellKey;
                      const displayVal = evaluateCellFormula(rawVal, sheetData);

                      return (
                        <div
                          key={cellKey}
                          onClick={() => setSelectedCell(cellKey)}
                          style={{
                            borderBottom: '1px solid var(--border-color)',
                            borderRight: '1px solid var(--border-color)',
                            backgroundColor: isSelected
                              ? (darkMode ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)')
                              : 'transparent',
                            outline: isSelected ? '2px solid #10B981' : 'none',
                            outlineOffset: '-2px',
                            padding: '0 6px',
                            display: 'flex',
                            alignItems: 'center',
                            height: '32px',
                            boxSizing: 'border-box',
                          }}
                        >
                          <input
                            type="text"
                            value={isSelected ? rawVal : displayVal}
                            onChange={(e) => handleCellChange(cellKey, e.target.value)}
                            onFocus={() => setSelectedCell(cellKey)}
                            style={{
                              width: '100%',
                              border: 'none',
                              backgroundColor: 'transparent',
                              color: 'var(--text-main)',
                              fontSize: '12px',
                              fontWeight: r === 1 ? '700' : '400',
                              outline: 'none',
                              textAlign: !isNaN(parseFloat(displayVal)) && !displayVal.startsWith('#') ? 'right' : 'left',
                            }}
                          />
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalElement, document.body);
}
