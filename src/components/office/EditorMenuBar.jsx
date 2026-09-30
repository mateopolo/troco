import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ChevronDown, Download, Printer, Undo, Redo, Copy, Trash2,
  Maximize2, ZoomIn, Eye, Sparkles, Image as ImageIcon, Table,
  Link2, Minus, Clock, Bold, Italic, Underline, Strikethrough,
  Heading1, Heading2, RemoveFormatting, FileText, CheckCircle2,
  Share2
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

/**
 * EditorMenuBar.jsx — Barre de Menus Bureautique Standard Troco Office
 * Menu interactif avec dropdowns dynamiques pour Docs, Sheets, Slides et Notes.
 * 
 * @param {string} activeTab - 'docs' | 'sheets' | 'slides' | 'notes'
 * @param {function} onAction - Callback déclenché lors du clic sur une option (ex: 'export-pdf', 'print', 'undo', etc.)
 * @param {boolean} darkMode - Indicateur mode sombre
 * @param {string} className - Classes CSS additionnelles
 * @param {object} style - Styles CSS inline
 */
export default function EditorMenuBar({
  activeTab = 'docs',
  onAction = () => {},
  darkMode = false,
  className = '',
  style = {},
}) {
  const { t } = useLanguage();
  const [openMenu, setOpenMenu] = useState(null);
  const containerRef = useRef(null);

  // Fermeture automatique au clic en dehors
  useEffect(() => {
    const handleDocumentClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpenMenu(null);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setOpenMenu(null);
      }
    };

    if (openMenu) {
      document.addEventListener('mousedown', handleDocumentClick);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openMenu]);

  const handleMenuToggle = useCallback((menuKey) => {
    setOpenMenu((prev) => (prev === menuKey ? null : menuKey));
  }, []);

  const handleMenuHover = useCallback((menuKey) => {
    // Si un menu est déjà ouvert, glisser la souris sur un autre ouvre immédiatement le dropdown (style macOS/Windows)
    if (openMenu && openMenu !== menuKey) {
      setOpenMenu(menuKey);
    }
  }, [openMenu]);

  const triggerAction = useCallback((actionId, payload = {}) => {
    setOpenMenu(null);
    if (typeof onAction === 'function') {
      onAction(actionId, { activeTab, ...payload });
    }
  }, [onAction, activeTab]);

  // Configuration des menus avec icônes et actions
  const menus = [
    {
      id: 'file',
      label: t('office.menu_file') || 'Fichier',
      items: [
        {
          id: 'export-primary',
          label: activeTab === 'notes'
            ? (t('office.export_md') || 'Exporter en Markdown (.md)')
            : activeTab === 'sheets'
            ? (t('office.export_csv') || 'Exporter en CSV')
            : activeTab === 'slides'
            ? (t('office.export_pptx') || 'Exporter en PowerPoint (.pptx)')
            : (t('office.export_pdf') || 'Exporter en PDF'),
          icon: Download,
          shortcut: activeTab === 'notes' ? '.md' : activeTab === 'sheets' ? '.csv' : activeTab === 'slides' ? '.pptx' : '.pdf',
          action: () => triggerAction('export-primary'),
        },
        ...(activeTab === 'docs' ? [
          {
            id: 'export-docx',
            label: t('office.export_docx') || 'Exporter au format Word (.docx)',
            icon: Download,
            shortcut: '.docx',
            action: () => triggerAction('export-docx'),
          }
        ] : []),
        ...(activeTab === 'sheets' ? [
          {
            id: 'export-xlsx',
            label: t('office.export_xlsx') || 'Exporter au format Excel (.xlsx)',
            icon: Download,
            shortcut: '.xlsx',
            action: () => triggerAction('export-xlsx'),
          }
        ] : []),
        {
          id: 'print',
          label: t('office.print') || 'Imprimer / Exporter PDF',
          icon: Printer,
          shortcut: 'Ctrl+P',
          action: () => triggerAction('print'),
        },
        { divider: true },
        {
          id: 'share-chat',
          label: t('office.share_to_chat') || 'Partager dans le chat',
          icon: Share2,
          action: () => triggerAction('share-chat'),
        },
      ],
    },
    {
      id: 'edit',
      label: t('office.menu_edit') || 'Édition',
      items: [
        {
          id: 'undo',
          label: t('office.menu_undo') || 'Annuler',
          icon: Undo,
          shortcut: 'Ctrl+Z',
          action: () => triggerAction('undo'),
        },
        {
          id: 'redo',
          label: t('office.menu_redo') || 'Rétablir',
          icon: Redo,
          shortcut: 'Ctrl+Y',
          action: () => triggerAction('redo'),
        },
        { divider: true },
        {
          id: 'select-all',
          label: t('office.menu_select_all') || 'Tout sélectionner',
          icon: Copy,
          shortcut: 'Ctrl+A',
          action: () => triggerAction('select-all'),
        },
        {
          id: 'clear',
          label: t('office.menu_clear') || 'Effacer le contenu',
          icon: Trash2,
          action: () => triggerAction('clear'),
        },
      ],
    },
    {
      id: 'view',
      label: t('office.menu_view') || 'Affichage',
      items: [
        {
          id: 'fullscreen',
          label: t('office.menu_fullscreen') || 'Plein écran immersif',
          icon: Maximize2,
          shortcut: 'F11',
          action: () => triggerAction('fullscreen'),
        },
        {
          id: 'zoom-100',
          label: t('office.menu_zoom') || 'Zoom normal (100%)',
          icon: ZoomIn,
          shortcut: '100%',
          action: () => triggerAction('zoom-100'),
        },
        {
          id: 'preview-mode',
          label: activeTab === 'notes' ? 'Mode Aperçu / Lecture' : 'Aperçu du document',
          icon: Eye,
          action: () => triggerAction('preview-mode'),
        },
      ],
    },
    {
      id: 'insert',
      label: t('office.menu_insert') || 'Insertion',
      items: [
        {
          id: 'insert-image',
          label: t('office.menu_image') || 'Image / Média',
          icon: ImageIcon,
          action: () => triggerAction('insert-image'),
        },
        {
          id: 'insert-table',
          label: t('office.menu_table') || 'Tableau collaboratif',
          icon: Table,
          action: () => triggerAction('insert-table'),
        },
        {
          id: 'insert-link',
          label: t('office.menu_link') || 'Lien hypertexte',
          icon: Link2,
          action: () => triggerAction('insert-link'),
        },
        {
          id: 'insert-separator',
          label: 'Ligne de séparation',
          icon: Minus,
          action: () => triggerAction('insert-separator'),
        },
        {
          id: 'insert-timestamp',
          label: 'Horodatage & Date',
          icon: Clock,
          action: () => triggerAction('insert-timestamp'),
        },
      ],
    },
    {
      id: 'format',
      label: t('office.menu_format') || 'Format',
      items: [
        {
          id: 'format-bold',
          label: t('office.menu_bold') || 'Gras',
          icon: Bold,
          shortcut: 'Ctrl+B',
          action: () => triggerAction('format-bold'),
        },
        {
          id: 'format-italic',
          label: t('office.menu_italic') || 'Italique',
          icon: Italic,
          shortcut: 'Ctrl+I',
          action: () => triggerAction('format-italic'),
        },
        {
          id: 'format-underline',
          label: t('office.menu_underline') || 'Souligné',
          icon: Underline,
          shortcut: 'Ctrl+U',
          action: () => triggerAction('format-underline'),
        },
        {
          id: 'format-strike',
          label: 'Barré',
          icon: Strikethrough,
          action: () => triggerAction('format-strike'),
        },
        { divider: true },
        {
          id: 'format-h1',
          label: 'Titre principal (H1)',
          icon: Heading1,
          action: () => triggerAction('format-h1'),
        },
        {
          id: 'format-h2',
          label: 'Sous-titre (H2)',
          icon: Heading2,
          action: () => triggerAction('format-h2'),
        },
        {
          id: 'format-clear',
          label: 'Effacer la mise en forme',
          icon: RemoveFormatting,
          action: () => triggerAction('format-clear'),
        },
      ],
    },
    {
      id: 'tools',
      label: t('office.menu_tools') || 'Outils',
      items: [
        {
          id: 'word-count',
          label: t('office.menu_word_count') || 'Statistiques & Mots',
          icon: FileText,
          action: () => triggerAction('word-count'),
        },
        {
          id: 'version-history',
          label: t('office.history_title') || 'Historique des versions',
          icon: Clock,
          action: () => triggerAction('version-history'),
        },
        {
          id: 'cloud-sync',
          label: 'Synchronisation Cloud Firestore',
          icon: CheckCircle2,
          action: () => triggerAction('cloud-sync'),
        },
      ],
    },
  ];

  return (
    <div
      ref={containerRef}
      className={`editor-menu-bar hidden lg:flex items-center gap-1 text-xs font-semibold px-2 shrink-0 select-none relative ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        ...style,
      }}
    >
      {menus.map((menu) => {
        const isOpen = openMenu === menu.id;

        return (
          <div key={menu.id} className="relative">
            <button
              type="button"
              onClick={() => handleMenuToggle(menu.id)}
              onMouseEnter={() => handleMenuHover(menu.id)}
              className="premium-button flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
              style={{
                borderRadius: 'var(--border-radius-main, 10px)',
                border: isOpen
                  ? '1px solid var(--accent-primary, #C67D5B)'
                  : '1px solid transparent',
                backgroundColor: isOpen
                  ? 'rgba(198,125,91,0.14)'
                  : 'transparent',
                color: isOpen
                  ? 'var(--accent-primary, #C67D5B)'
                  : 'var(--text-main)',
                transition: 'all 0.15s ease',
              }}
              title={menu.label}
              aria-haspopup="true"
              aria-expanded={isOpen}
            >
              <span>{menu.label}</span>
              <ChevronDown
                size={11}
                style={{
                  transform: isOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s ease',
                  opacity: 0.7,
                }}
              />
            </button>

            {/* DROPDOWN MENU */}
            {isOpen && (
              <div
                className="absolute left-0 mt-1.5 w-60 rounded-2xl shadow-2xl py-1.5 z-50 flex flex-col border animate-in fade-in zoom-in-95 duration-100"
                style={{
                  backgroundColor: 'var(--bg-card, #FFFFFF)',
                  borderColor: 'var(--border-color, rgba(0,0,0,0.1))',
                  color: 'var(--text-main)',
                  boxShadow: 'var(--shadow-modal, 0 14px 34px rgba(0,0,0,0.22))',
                }}
              >
                {menu.items.map((item, idx) => {
                  if (item.divider) {
                    return (
                      <div
                        key={`divider-${idx}`}
                        className="my-1 border-t"
                        style={{ borderColor: 'var(--border-color, rgba(0,0,0,0.08))' }}
                      />
                    );
                  }

                  const Icon = item.icon;

                  return (
                    <button
                      key={item.id || idx}
                      type="button"
                      onClick={() => item.action && item.action()}
                      className="w-full px-3.5 py-2 text-left text-xs font-medium hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-between gap-3 cursor-pointer transition-colors"
                      style={{ color: 'var(--text-main)' }}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        {Icon && (
                          <Icon
                            size={14}
                            style={{
                              color: 'var(--accent-primary, #C67D5B)',
                              flexShrink: 0,
                            }}
                          />
                        )}
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.shortcut && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded font-mono shrink-0"
                          style={{
                            backgroundColor: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          {item.shortcut}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
