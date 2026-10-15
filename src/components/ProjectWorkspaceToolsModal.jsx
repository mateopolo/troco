import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Calendar, Monitor, FileText, Table, StickyNote, Presentation, Palette,
  ExternalLink, Sparkles, Plus, Clock, ShieldCheck,
  HardDrive, Video, Users, Play, RefreshCw, Check, Edit3, Share2, Bold, Italic, List
} from 'lucide-react';
import { BACKDROP_CLASSNAME, BACKDROP_STYLE } from './ui/modalBackdrop';

export default function ProjectWorkspaceToolsModal({
  isOpen,
  onClose,
  projectTitle = 'Projet Collaboratif',
  groupId = 'demo_group',
  onStartScreenShare = null,
  onStartVideoCall = null,
  darkMode = false,
  initialTab = 'docs',
}) {
  const [activeTab, setActiveTab] = useState(initialTab || 'docs');
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [isCalendarConnected, setIsCalendarConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Docs state
  const [docTitle, setDocTitle] = useState('Cahier des charges & Stratégie du Projet');
  const [docContent, setDocContent] = useState(
    '# Objectifs du Projet Collaboratif\n\n- Phase 1 : Cadrage des livrables et répartition des rôles\n- Phase 2 : Maquettage UX/UI et validation des flux\n- Phase 3 : Développement et validation des règles de sécurité\n- Phase 4 : Déploiement et rétribution en Jetons Troco'
  );
  const [docSaved, setDocSaved] = useState(true);

  // Sheets state
  const [activeSheetCell, setActiveSheetCell] = useState('B2');
  const [sheetData, setSheetData] = useState([
    { phase: '1. Cadrage & Stratégie', tokens: '150', status: 'Validé', owner: 'Mateo P.' },
    { phase: '2. Design System & UI', tokens: '250', status: 'En cours', owner: 'Emma R.' },
    { phase: '3. Intégration React', tokens: '400', status: 'En cours', owner: 'Thomas V.' },
    { phase: '4. QA & Audit E2E', tokens: '100', status: 'À venir', owner: 'Alexandre T.' },
  ]);

  // Notes state
  const [notes, setNotes] = useState([
    { id: 'n1', title: 'Priorités Sprint #3', color: '#FEF3C7', darkColor: '#451A03', text: 'Vérifier la latence WebRTC et synchroniser les profils utilisateurs.', completed: false },
    { id: 'n2', title: 'Idée Troc de Compétences', color: '#DBEAFE', darkColor: '#172554', text: 'Échanger 2h de cours de guitare contre une session de coaching React.', completed: true },
    { id: 'n3', title: 'Checklist Déploiement', color: '#D1FAE5', darkColor: '#064E3B', text: 'Auditer les règles Firestore zero-trust et tester les émulateurs locaux.', completed: false },
  ]);
  const [newNoteText, setNewNoteText] = useState('');

  // Slides state
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const slides = [
    { title: '1. Introduction au Partenariat', subtitle: 'Vision & Valeurs du Troc de Compétences', bullets: ['Économie collaborative sans barrière financière', 'Jetons Troco Plus pour valoriser les échanges équitables', 'Confiance mutuelle et avis vérifiés'] },
    { title: '2. Architecture Technique', subtitle: 'Stack Temps Réel & Sécurité Zero-Trust', bullets: ['React + Vite + Firebase Emulators', 'WebRTC DataChannels P2P à coût zéro', 'App Check & Rate Limiting distribué'] },
    { title: '3. Roadmap & Livrables', subtitle: 'Phases de validation et jalons clés', bullets: ['Lancement de la suite Workspace intégrée', 'Audit complet 113 vérifications E2E Playwright', 'Déploiement production Vercel & PWA'] },
  ];

  // Whiteboard drawing state preview
  const [activeDrawTool, setActiveDrawTool] = useState('pen');
  const [drawColor, setDrawColor] = useState('#C67D5B');

  // Drive files
  const [driveFiles, setDriveFiles] = useState([
    { id: '1', name: 'Cahier des Charges & Roadmap.docx', size: '245 KB', updated: 'Il y a 2 heures', author: 'Mateo P.', type: 'doc' },
    { id: '2', name: 'Budget & Répartition des Jetons.xlsx', size: '1.2 MB', updated: 'Hier à 18h40', author: 'Emma R.', type: 'sheet' },
    { id: '3', name: 'Charte Graphique & Wireframes.fig', size: '18.4 MB', updated: 'Il y a 3 jours', author: 'Thomas V.', type: 'figma' },
  ]);

  // Meetings
  const [meetings, setMeetings] = useState([
    { id: 'm1', title: 'Point d’étape & Revue des livrables', date: 'Demain à 14h00', duration: '45 min', participants: 3, link: 'Troco Meets HD' },
    { id: 'm2', title: 'Sprint Planning & Attribution tâches', date: 'Vendredi à 10h30', duration: '30 min', participants: 4, link: 'Troco Meets HD' },
  ]);
  const [newMeetingTitle, setNewMeetingTitle] = useState('');
  const [newMeetingDate, setNewMeetingDate] = useState('');

  const handleConnectGoogle = (service) => {
    setIsConnecting(true);
    setTimeout(() => {
      setIsConnecting(false);
      if (service === 'drive') setIsDriveConnected(true);
      if (service === 'calendar') setIsCalendarConnected(true);
    }, 900);
  };

  const handleAddMeeting = (e) => {
    e.preventDefault();
    if (!newMeetingTitle.trim()) return;
    const newMeet = {
      id: `meet-${Date.now()}`,
      title: newMeetingTitle.trim(),
      date: newMeetingDate.trim() || 'Date à convenir',
      duration: '30 min',
      participants: 1,
      link: 'Troco Meets HD',
    };
    setMeetings([...meetings, newMeet]);
    setNewMeetingTitle('');
    setNewMeetingDate('');
  };

  const handleAddNote = (e) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    const newNote = {
      id: `note-${Date.now()}`,
      title: `Note #${notes.length + 1}`,
      color: '#FEF3C7',
      darkColor: '#451A03',
      text: newNoteText.trim(),
      completed: false,
    };
    setNotes([newNote, ...notes]);
    setNewNoteText('');
  };

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const WORKSPACE_TABS = [
    { id: 'docs', testId: 'workspace-tab-docs', label: 'Troco Docs', icon: FileText, badge: 'DOCS' },
    { id: 'sheets', testId: 'workspace-tab-sheets', label: 'Troco Sheets', icon: Table, badge: 'SHEETS' },
    { id: 'notes', testId: 'workspace-tab-notes', label: 'Troco Notes', icon: StickyNote, badge: 'NOTES' },
    { id: 'slides', testId: 'workspace-tab-slides', label: 'Troco Slides', icon: Presentation, badge: 'SLIDES' },
    { id: 'whiteboard', testId: 'workspace-tab-whiteboard', label: 'Whiteboard collaboratif', icon: Palette, badge: 'P2P' },
    { id: 'drive', testId: 'workspace-tab-drive', label: 'Drive & Fichiers', icon: HardDrive, badge: 'CLOUD' },
    { id: 'calendar', testId: 'workspace-tab-calendar', label: 'Planning & Visios', icon: Calendar, badge: 'HD' },
    { id: 'remote', testId: 'workspace-tab-remote', label: 'Contrôle à Distance', icon: Monitor, badge: 'P2P' },
  ];

  const modalElement = (
    <div
      className={`${BACKDROP_CLASSNAME} z-[999999] flex items-center justify-center touch-none`}
      style={{
        ...BACKDROP_STYLE,
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px 12px max(80px, env(safe-area-inset-bottom, 24px)) 12px',
        animation: 'fadeIn 0.2s ease both',
        boxSizing: 'border-box',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && typeof onClose === 'function') {
          onClose();
        }
      }}
    >
      <div
        style={{
          position: 'relative',
          zIndex: 1000000,
          width: '100%',
          maxWidth: '780px',
          maxHeight: 'min(calc(100dvh - 100px), 780px)',
          backgroundColor: darkMode ? '#1F1B18' : '#FAF8F5',
          borderRadius: '28px',
          border: '1px solid var(--border-color)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.45)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'scaleUp 0.25s ease both',
          boxSizing: 'border-box',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* EN-TÊTE DE L'ESPACE OUTILS WORKSPACE */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: darkMode ? 'rgba(28, 24, 21, 0.85)' : 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, var(--accent-primary) 0%, #D97706 100%)',
                color: '#FFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-accent)',
              }}
            >
              <Sparkles size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: 'var(--text-main)' }}>
                  Outils Workspace & Suite Office
                </h3>
                <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: 'var(--accent-primary)', color: '#FFF', padding: '2px 8px', borderRadius: '999px' }}>
                  PRO WORKSPACE
                </span>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                {projectTitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
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
          >
            <X size={18} />
          </button>
        </div>

        {/* ONGLETS DES OUTILS WORKSPACE */}
        <div
          style={{
            display: 'flex',
            padding: '10px 16px',
            gap: '8px',
            borderBottom: '1px solid var(--border-color)',
            backgroundColor: darkMode ? '#181513' : '#F5F0E8',
            overflowX: 'auto',
          }}
        >
          {WORKSPACE_TABS.map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                data-testid={tab.testId}
                onClick={() => setActiveTab(tab.id)}
                className="premium-button"
                style={{
                  border: isSelected ? '1px solid var(--accent-primary)' : '1px solid transparent',
                  backgroundColor: isSelected ? 'var(--bg-card)' : 'transparent',
                  color: isSelected ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  borderRadius: '12px',
                  padding: '7px 12px',
                  fontSize: '12px',
                  fontWeight: isSelected ? '800' : '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: isSelected ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
                <span
                  style={{
                    fontSize: '9px',
                    fontWeight: '800',
                    backgroundColor: isSelected ? 'rgba(198, 125, 91, 0.15)' : 'rgba(0,0,0,0.05)',
                    padding: '1px 5px',
                    borderRadius: '4px',
                  }}
                >
                  {tab.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* CORPS DE L'ONGLET SÉLECTIONNÉ */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* 1. TROCO DOCS */}
          {activeTab === 'docs' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', animation: 'fadeIn 0.2s ease' }}>
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '16px',
                  backgroundColor: 'rgba(59, 130, 246, 0.08)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FileText size={20} color="#3B82F6" />
                  <div>
                    <div style={{ fontWeight: '800', fontSize: '13px', color: 'var(--text-main)' }}>
                      Troco Docs — Éditeur Markdown Collaboratif
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      Synchronisation temps réel Firestore & historique de révision.
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: '10px', fontWeight: '800', color: '#10B981', backgroundColor: 'rgba(16, 185, 129, 0.15)', padding: '2px 8px', borderRadius: '6px' }}>
                  ● Synchronisé
                </span>
              </div>

              {/* BARRE D'OUTILS ET TITRE DU DOCUMENT */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input
                  type="text"
                  value={docTitle}
                  onChange={(e) => { setDocTitle(e.target.value); setDocSaved(false); }}
                  placeholder="Titre du document..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '14px',
                    fontWeight: '800',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', backgroundColor: 'var(--bg-subtle)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <button type="button" onClick={() => setDocContent(prev => prev + '\n**Texte en gras**')} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px', borderRadius: '4px' }} title="Gras"><Bold size={13} /></button>
                  <button type="button" onClick={() => setDocContent(prev => prev + '\n*Texte en italique*')} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px', borderRadius: '4px' }} title="Italique"><Italic size={13} /></button>
                  <button type="button" onClick={() => setDocContent(prev => prev + '\n- Élément de liste')} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px', borderRadius: '4px' }} title="Liste à puces"><List size={13} /></button>
                  <div style={{ flex: 1 }} />
                  <button
                    type="button"
                    onClick={() => setDocSaved(true)}
                    className="premium-button"
                    style={{
                      border: 'none',
                      backgroundColor: 'var(--accent-primary)',
                      color: '#FFF',
                      fontSize: '11px',
                      fontWeight: '800',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Check size={11} />
                    <span>{docSaved ? 'Enregistré' : 'Sauvegarder'}</span>
                  </button>
                </div>

                <textarea
                  value={docContent}
                  onChange={(e) => { setDocContent(e.target.value); setDocSaved(false); }}
                  rows={8}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    fontSize: '12.5px',
                    fontFamily: 'monospace',
                    lineHeight: '1.5',
                    outline: 'none',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          )}

          {/* 2. TROCO SHEETS */}
          {activeTab === 'sheets' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', animation: 'fadeIn 0.2s ease' }}>
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '16px',
                  backgroundColor: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Table size={20} color="#10B981" />
                  <div>
                    <div style={{ fontWeight: '800', fontSize: '13px', color: 'var(--text-main)' }}>
                      Troco Sheets — Tableur & Feuilles de Calcul
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      Calcul de budget, répartition des jetons Troco et formules temps réel.
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--accent-primary)' }}>
                  Total : 900 💎
                </div>
              </div>

              {/* BARRE DE FORMULE */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', backgroundColor: 'var(--bg-subtle)', borderRadius: '10px', border: '1px solid var(--border-color)', fontSize: '12px' }}>
                <span style={{ fontWeight: '800', color: '#10B981' }}>fx</span>
                <span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>=SUM(B2:B5)</span>
                <div style={{ flex: 1 }} />
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Cellule active : <strong>{activeSheetCell}</strong></span>
              </div>

              {/* GRILLE TABLEUR */}
              <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '12px', backgroundColor: 'var(--bg-card)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '8px 12px', width: '40px', color: 'var(--text-secondary)' }}>#</th>
                      <th style={{ padding: '8px 12px', color: 'var(--text-main)' }}>Phase & Description</th>
                      <th style={{ padding: '8px 12px', color: 'var(--text-main)' }}>Jetons 💎</th>
                      <th style={{ padding: '8px 12px', color: 'var(--text-main)' }}>Statut</th>
                      <th style={{ padding: '8px 12px', color: 'var(--text-main)' }}>Responsable</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sheetData.map((row, idx) => (
                      <tr
                        key={idx}
                        onClick={() => setActiveSheetCell(`B${idx + 2}`)}
                        style={{
                          borderBottom: '1px solid var(--border-color)',
                          backgroundColor: activeSheetCell === `B${idx + 2}` ? 'rgba(198, 125, 91, 0.08)' : 'transparent',
                          cursor: 'pointer',
                        }}
                      >
                        <td style={{ padding: '8px 12px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{idx + 1}</td>
                        <td style={{ padding: '8px 12px', fontWeight: '700', color: 'var(--text-main)' }}>{row.phase}</td>
                        <td style={{ padding: '8px 12px', fontWeight: '800', color: 'var(--accent-primary)' }}>{row.tokens}</td>
                        <td style={{ padding: '8px 12px' }}>
                          <span style={{ fontSize: '10px', fontWeight: '800', padding: '2px 6px', borderRadius: '4px', backgroundColor: row.status === 'Validé' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)', color: row.status === 'Validé' ? '#10B981' : '#F59E0B' }}>
                            {row.status}
                          </span>
                        </td>
                        <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{row.owner}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. TROCO NOTES */}
          {activeTab === 'notes' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', animation: 'fadeIn 0.2s ease' }}>
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '16px',
                  backgroundColor: 'rgba(245, 158, 11, 0.08)',
                  border: '1px solid rgba(245, 158, 11, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <StickyNote size={20} color="#F59E0B" />
                  <div>
                    <div style={{ fontWeight: '800', fontSize: '13px', color: 'var(--text-main)' }}>
                      Troco Notes — Notes de session & Checklists
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      Mémorisez les décisions de réunion et les tâches à accomplir.
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: '11px', fontWeight: '800', color: '#F59E0B' }}>
                  {notes.length} note(s)
                </span>
              </div>

              {/* AJOUTER UNE NOTE */}
              <form onSubmit={handleAddNote} style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder="Écrire une nouvelle note rapide..."
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    fontSize: '12px',
                    outline: 'none',
                  }}
                />
                <button
                  type="submit"
                  className="premium-button"
                  style={{
                    border: 'none',
                    backgroundColor: 'var(--accent-primary)',
                    color: '#FFF',
                    padding: '8px 14px',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Plus size={13} />
                  <span>Ajouter</span>
                </button>
              </form>

              {/* LISTE DES NOTES */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                {notes.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => setNotes(notes.map(item => item.id === n.id ? { ...item, completed: !item.completed } : item))}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '14px',
                      backgroundColor: darkMode ? n.darkColor : n.color,
                      border: '1px solid var(--border-color)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: '800', fontSize: '12px', color: darkMode ? '#FDE68A' : '#78350F' }}>{n.title}</span>
                      <Check size={14} color={n.completed ? '#10B981' : 'transparent'} />
                    </div>
                    <p style={{ margin: 0, fontSize: '11.5px', color: darkMode ? '#FEF3C7' : '#92400E', textDecoration: n.completed ? 'line-through' : 'none' }}>
                      {n.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. TROCO SLIDES */}
          {activeTab === 'slides' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', animation: 'fadeIn 0.2s ease' }}>
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '16px',
                  backgroundColor: 'rgba(139, 92, 246, 0.08)',
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Presentation size={20} color="#8B5CF6" />
                  <div>
                    <div style={{ fontWeight: '800', fontSize: '13px', color: 'var(--text-main)' }}>
                      Troco Slides — Présentations & Diapositives
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      Diaporamas collaboratifs et pitchs interactifs en direct.
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: '11px', fontWeight: '800', color: '#8B5CF6' }}>
                  Diapositive {activeSlideIndex + 1} / {slides.length}
                </span>
              </div>

              {/* DIAPO CANVAS PREVIEW */}
              <div
                style={{
                  borderRadius: '16px',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  padding: '24px 28px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  minHeight: '180px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                }}
              >
                <h4 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: 'var(--accent-primary)' }}>
                  {slides[activeSlideIndex].title}
                </h4>
                <p style={{ margin: 0, fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                  {slides[activeSlideIndex].subtitle}
                </p>
                <ul style={{ margin: '6px 0 0', paddingLeft: '20px', fontSize: '12.5px', color: 'var(--text-main)', lineHeight: '1.6' }}>
                  {slides[activeSlideIndex].bullets.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </div>

              {/* SÉLECTEUR DE SLIDES */}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                {slides.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActiveSlideIndex(i)}
                    className="premium-button"
                    style={{
                      border: activeSlideIndex === i ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                      backgroundColor: activeSlideIndex === i ? 'var(--accent-primary)' : 'var(--bg-subtle)',
                      color: activeSlideIndex === i ? '#FFF' : 'var(--text-secondary)',
                      borderRadius: '8px',
                      padding: '4px 12px',
                      fontSize: '11px',
                      fontWeight: '800',
                      cursor: 'pointer',
                    }}
                  >
                    Slide {i + 1}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 5. TABLEAU BLANC / WHITEBOARD */}
          {activeTab === 'whiteboard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', animation: 'fadeIn 0.2s ease' }}>
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '16px',
                  backgroundColor: 'rgba(198, 125, 91, 0.08)',
                  border: '1px solid rgba(198, 125, 91, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Palette size={20} color="var(--accent-primary)" />
                  <div>
                    <div style={{ fontWeight: '800', fontSize: '13px', color: 'var(--text-main)' }}>
                      Tableau Blanc Collaboratif & Canvas P2P
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      WebRTC DataChannels à latence nulle (0ms) pour brainstorming et croquis.
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: '10px', fontWeight: '800', color: '#10B981', backgroundColor: 'rgba(16, 185, 129, 0.15)', padding: '2px 8px', borderRadius: '6px' }}>
                  ⚡ Latence &lt; 10ms
                </span>
              </div>

              {/* PALETTE D'OUTILS ET CANVAS */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', backgroundColor: 'var(--bg-subtle)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                {['pen', 'rect', 'circle', 'sticky', 'eraser'].map((tool) => (
                  <button
                    key={tool}
                    type="button"
                    onClick={() => setActiveDrawTool(tool)}
                    style={{
                      border: activeDrawTool === tool ? '1px solid var(--accent-primary)' : '1px solid transparent',
                      backgroundColor: activeDrawTool === tool ? 'var(--bg-card)' : 'transparent',
                      color: activeDrawTool === tool ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                    }}
                  >
                    {tool}
                  </button>
                ))}
                <div style={{ flex: 1 }} />
                <div style={{ display: 'flex', gap: '4px' }}>
                  {['#C67D5B', '#3B82F6', '#10B981', '#F59E0B', '#111827'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setDrawColor(c)}
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        backgroundColor: c,
                        border: drawColor === c ? '2px solid #FFF' : '1px solid var(--border-color)',
                        cursor: 'pointer',
                        boxShadow: drawColor === c ? '0 0 0 2px var(--accent-primary)' : 'none',
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* CANVAS SIMULÉ */}
              <div
                style={{
                  height: '180px',
                  borderRadius: '14px',
                  backgroundColor: darkMode ? '#181513' : '#FFFFFF',
                  border: '1.5px dashed var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  gap: '8px',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div style={{ width: '80px', height: '40px', borderRadius: '8px', backgroundColor: 'rgba(198, 125, 91, 0.15)', border: '1px solid var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800', color: 'var(--accent-primary)' }}>
                  Brainstorm
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Canvas interactif actif • Outil : {activeDrawTool} • Couleur : {drawColor}
                </span>
              </div>
            </div>
          )}

          {/* 6. GOOGLE DRIVE */}
          {activeTab === 'drive' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeIn 0.2s ease' }}>
              <div
                style={{
                  padding: '14px 18px',
                  borderRadius: '18px',
                  backgroundColor: isDriveConnected ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-subtle)',
                  border: isDriveConnected ? '1px solid var(--accent-success)' : '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <HardDrive size={22} color={isDriveConnected ? '#10B981' : 'var(--accent-primary)'} />
                  <div>
                    <div style={{ fontWeight: '800', fontSize: '13px', color: 'var(--text-main)' }}>
                      {isDriveConnected ? 'Google Drive & Workspace connecté ✅' : 'Dossier Cloud partagé du projet'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {isDriveConnected
                        ? `drive.google.com/folders/troco_${groupId}`
                        : 'Synchronisez les briefs, devis et maquettes avec toute l\'équipe.'}
                    </div>
                  </div>
                </div>

                {!isDriveConnected ? (
                  <button
                    type="button"
                    onClick={() => handleConnectGoogle('drive')}
                    disabled={isConnecting}
                    className="premium-button"
                    style={{
                      border: 'none',
                      borderRadius: '999px',
                      padding: '8px 16px',
                      background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)',
                      color: '#FFF',
                      fontSize: '12px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    {isConnecting ? <RefreshCw size={13} className="spin" /> : <ExternalLink size={13} />}
                    <span>Connecter Google</span>
                  </button>
                ) : (
                  <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--accent-success)' }}>
                    Actif
                  </span>
                )}
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-main)' }}>
                    Documents partagés ({driveFiles.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const newDoc = {
                        id: `doc-${Date.now()}`,
                        name: `Nouveau Briefing ${driveFiles.length + 1}.docx`,
                        size: '120 KB',
                        updated: 'À l\'instant',
                        author: 'Moi',
                        type: 'doc',
                      };
                      setDriveFiles([newDoc, ...driveFiles]);
                    }}
                    style={{
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-subtle)',
                      color: 'var(--accent-primary)',
                      borderRadius: '999px',
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    <Plus size={12} />
                    <span>Créer un doc</span>
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {driveFiles.map((file) => (
                    <div
                      key={file.id}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '14px',
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <FileText size={18} color="var(--accent-primary)" />
                        <div>
                          <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-main)' }}>
                            {file.name}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            {file.size} • Modifié {file.updated} par {file.author}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => alert(`Ouverture du document sécurisé : ${file.name}`)}
                        className="premium-button"
                        style={{
                          border: 'none',
                          backgroundColor: 'var(--bg-subtle)',
                          color: 'var(--text-main)',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '11px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <span>Ouvrir</span>
                        <ExternalLink size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 7. PLANNING & VISIOS */}
          {activeTab === 'calendar' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeIn 0.2s ease' }}>
              <div
                style={{
                  padding: '14px 18px',
                  borderRadius: '18px',
                  backgroundColor: isCalendarConnected ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-subtle)',
                  border: isCalendarConnected ? '1px solid var(--accent-success)' : '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Calendar size={22} color={isCalendarConnected ? '#10B981' : 'var(--accent-primary)'} />
                  <div>
                    <div style={{ fontWeight: '800', fontSize: '13px', color: 'var(--text-main)' }}>
                      {isCalendarConnected ? 'Synchronisation Google Calendar active ✅' : 'Planning des réunions d’équipe'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      Synchronise automatiquement les créneaux avec les agendas des membres du collectif.
                    </div>
                  </div>
                </div>

                {!isCalendarConnected && (
                  <button
                    type="button"
                    onClick={() => handleConnectGoogle('calendar')}
                    disabled={isConnecting}
                    className="premium-button"
                    style={{
                      border: 'none',
                      borderRadius: '999px',
                      padding: '8px 16px',
                      background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)',
                      color: '#FFF',
                      fontSize: '12px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>Lier Agenda</span>
                  </button>
                )}
              </div>

              <div>
                <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '10px' }}>
                  Prochains points visio ({meetings.length})
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {meetings.map((m) => (
                    <div
                      key={m.id}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '14px',
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '10px', backgroundColor: 'rgba(198, 125, 91, 0.15)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Video size={16} />
                        </div>
                        <div>
                          <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-main)' }}>
                            {m.title}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Clock size={11} /> {m.date}</span>
                            <span>•</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Users size={11} /> {m.participants} membres</span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (typeof onStartVideoCall === 'function') onStartVideoCall();
                          onClose?.();
                        }}
                        className="premium-button"
                        style={{
                          border: 'none',
                          backgroundColor: 'var(--accent-primary)',
                          color: '#FFF',
                          padding: '6px 14px',
                          borderRadius: '999px',
                          fontSize: '11px',
                          fontWeight: '800',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          boxShadow: 'var(--shadow-accent)',
                        }}
                      >
                        <Play size={11} />
                        <span>Rejoindre</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <form
                onSubmit={handleAddMeeting}
                style={{
                  padding: '14px',
                  borderRadius: '16px',
                  backgroundColor: 'var(--bg-subtle)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-main)' }}>
                  📅 Programmer un nouveau point d’équipe
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    value={newMeetingTitle}
                    onChange={(e) => setNewMeetingTitle(e.target.value)}
                    placeholder="Objet de la réunion (ex: Revue de sprint)"
                    style={{
                      flex: 1,
                      minWidth: '200px',
                      padding: '8px 12px',
                      borderRadius: '10px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-card)',
                      color: 'var(--text-main)',
                      fontSize: '12px',
                      outline: 'none',
                    }}
                  />
                  <input
                    type="text"
                    value={newMeetingDate}
                    onChange={(e) => setNewMeetingDate(e.target.value)}
                    placeholder="Jour et heure (ex: Jeudi 16h00)"
                    style={{
                      width: '160px',
                      padding: '8px 12px',
                      borderRadius: '10px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-card)',
                      color: 'var(--text-main)',
                      fontSize: '12px',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="submit"
                    className="premium-button"
                    style={{
                      border: 'none',
                      backgroundColor: 'var(--accent-primary)',
                      color: '#FFF',
                      padding: '8px 16px',
                      borderRadius: '10px',
                      fontSize: '12px',
                      fontWeight: '800',
                      cursor: 'pointer',
                    }}
                  >
                    Ajouter
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* 8. REMOTE CONTROL */}
          {activeTab === 'remote' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeIn 0.2s ease' }}>
              <div
                style={{
                  padding: '20px',
                  borderRadius: '20px',
                  background: 'linear-gradient(135deg, rgba(198,125,91,0.12) 0%, rgba(217,119,6,0.06) 100%)',
                  border: '1.5px solid var(--accent-primary)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: 'var(--accent-primary)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Monitor size={22} />
                  </div>
                  <div>
                    <div style={{ fontWeight: '800', fontSize: '15px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>Session de Prise en Main & Contrôle à Distance</span>
                      <span style={{ fontSize: '9px', fontWeight: '800', backgroundColor: '#F59E0B', color: '#000', padding: '2px 6px', borderRadius: '4px' }}>ULTRA HD</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Revue de code, pair-programming, assistance technique en direct sans logiciel externe.
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', marginTop: '4px' }}>
                  <div style={{ padding: '10px 12px', borderRadius: '12px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', fontSize: '11px', color: 'var(--text-secondary)' }}>
                    🔒 **Chiffrement WebRTC E2E** de bout en bout
                  </div>
                  <div style={{ padding: '10px 12px', borderRadius: '12px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', fontSize: '11px', color: 'var(--text-secondary)' }}>
                    ⚡ **Latence Ultra-Basse &lt; 50ms** via canal P2P
                  </div>
                  <div style={{ padding: '10px 12px', borderRadius: '12px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', fontSize: '11px', color: 'var(--text-secondary)' }}>
                    🖱️ **Curseurs Multi-utilisateurs** synchronisés
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                    Prêt pour le projet <strong>{projectTitle}</strong>
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      if (typeof onStartScreenShare === 'function') onStartScreenShare();
                      onClose?.();
                    }}
                    className="premium-button"
                    style={{
                      border: 'none',
                      borderRadius: '999px',
                      padding: '10px 22px',
                      background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)',
                      color: '#FFF',
                      fontSize: '13px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: 'var(--shadow-accent)',
                    }}
                  >
                    <Play size={14} />
                    <span>Lancer la Session Distante</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* PIED DE PAGE */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--border-color)',
            backgroundColor: darkMode ? 'rgba(28, 24, 21, 0.9)' : 'rgba(255, 255, 255, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: 'var(--text-secondary)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={14} color="var(--accent-success)" />
            <span>Espace de travail collaboratif certifié Troco Workspace</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              border: 'none',
              backgroundColor: 'transparent',
              color: 'var(--accent-primary)',
              fontWeight: '800',
              cursor: 'pointer',
            }}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );

  // @guard DO NOT REMOVE PORTAL. Required to escape chat overflow and z-index stacking context on mobile.
  return createPortal(modalElement, document.body);
}
