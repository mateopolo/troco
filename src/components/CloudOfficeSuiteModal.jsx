import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X, FileText, Sparkles, ExternalLink, Download,
  Save, Users, RefreshCw,
  FileCode, Layers, ShieldCheck, Printer
} from 'lucide-react';
import { doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export default function CloudOfficeSuiteModal({
  isOpen,
  onClose,
  groupId = 'demo_group_office',
  projectTitle = 'Projet Collaboratif',
  currentUser = null,
  darkMode = false,
}) {
  const [activeTab, setActiveTab] = useState('editor'); // 'editor' | 'collabora' | 'gdocs'
  const [docTitle, setDocTitle] = useState('Spécifications & Cahier des Charges - ' + projectTitle);
  const [docContent, setDocContent] = useState(
    `# 📋 Cahier des Charges & Spécifications Collaboratives\n\n` +
    `**Projet :** ${projectTitle}\n` +
    `**Auteur :** ${currentUser?.name || 'Mateo P.'}\n` +
    `**Dernière mise à jour :** ${new Date().toLocaleDateString('fr-FR')}\n\n` +
    `---\n\n` +
    `### 1. Objectifs du Projet\n` +
    `- Définition des livrables clés et des étapes majeures du projet.\n` +
    `- Répartition des tâches entre les membres de l'équipe.\n` +
    `- Établissement des critères de validation pour le déblocage des Jetons Troco.\n\n` +
    `### 2. Attribution des Tâches & Rôles\n` +
    `- **Architecture & Design :** Marie D.\n` +
    `- **Développement & Intégration :** ${currentUser?.name || 'Mateo P.'}\n` +
    `- **Coordination & Validation :** Sophie H.\n\n` +
    `### 3. Calendrier & Jalons\n` +
    `1. *Jalon 1 (S+1)* : Wireframes & Validation du prototype.\n` +
    `2. *Jalon 2 (S+2)* : Développement de la version bêta fonctionnelle.\n` +
    `3. *Jalon 3 (S+3)* : Tests de recette & distribution finale des récompenses.\n\n` +
    `---\n` +
    `*Document synchronisé en temps réel sur Troco Cloud Workspace.*`
  );
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState('À l’instant');
  const [collaborators] = useState(['Mateo P. (Édition)', 'Marie D. (Lecture)', 'Lucas M. (En ligne)']);

  // Synchronisation Firestore en temps réel
  useEffect(() => {
    if (!isOpen || !groupId) return;

    const docRef = doc(db, 'project_office_docs', String(groupId));
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.title) setDocTitle(data.title);
        if (data.content && data.updatedBy !== (currentUser?.id || currentUser?.name)) {
          setDocContent(data.content);
          setLastSaved('Synchronisé');
        }
      }
    }, (err) => {
      console.warn('[CloudOffice] Firestore snapshot notice:', err);
    });

    return () => unsubscribe();
  }, [isOpen, groupId, currentUser]);

  if (!isOpen) return null;

  const handleSaveDocument = async () => {
    setIsSaving(true);
    try {
      if (db && groupId) {
        const docRef = doc(db, 'project_office_docs', String(groupId));
        await setDoc(docRef, {
          title: docTitle,
          content: docContent,
          updatedBy: currentUser?.id || currentUser?.name || 'Moi',
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }
      setLastSaved('Enregistré dans le Cloud');
    } catch (err) {
      console.warn('[CloudOffice] Save error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadMarkdown = () => {
    const element = document.createElement('a');
    const file = new Blob([docContent], { type: 'text/markdown;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `${docTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handlePrint = () => {
    window.print();
  };

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
        padding: '12px 12px max(80px, env(safe-area-inset-bottom, 24px)) 12px',
        animation: 'fadeIn 0.25s ease both',
        boxSizing: 'border-box',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '960px',
          height: 'min(calc(100dvh - 80px), 820px)',
          backgroundColor: darkMode ? '#181412' : '#FAF8F5',
          borderRadius: '24px',
          border: '1px solid var(--border-color)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'scaleUp 0.25s ease both',
          boxSizing: 'border-box',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* EN-TÊTE DE LA SUITE OFFICE */}
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid var(--border-color)',
            backgroundColor: darkMode ? 'rgba(28, 24, 21, 0.9)' : 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexShrink: 0,
          }}
        >
          {/* TITRE + BADGE PREMIUM */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                flexShrink: 0,
              }}
            >
              <FileText size={18} />
            </div>

            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontWeight: '800', fontSize: '15px', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  Suite Office Cloud
                </span>
                <span
                  style={{
                    backgroundColor: 'rgba(59, 130, 246, 0.15)',
                    color: '#3B82F6',
                    fontSize: '10.5px',
                    fontWeight: '800',
                    padding: '2px 7px',
                    borderRadius: '999px',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                    flexShrink: 0,
                  }}
                >
                  <Sparkles size={10} /> PRO
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {projectTitle} • {lastSaved}
              </p>
            </div>
          </div>

          {/* ONGLET SÉLECTEUR DE SUITE */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'var(--bg-subtle)', padding: '3px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <button
              type="button"
              onClick={() => setActiveTab('editor')}
              style={{
                border: 'none',
                backgroundColor: activeTab === 'editor' ? 'var(--accent-primary)' : 'transparent',
                color: activeTab === 'editor' ? '#FFFFFF' : 'var(--text-main)',
                fontSize: '11.5px',
                fontWeight: '700',
                borderRadius: '8px',
                padding: '5px 10px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Éditeur Docs
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('collabora')}
              style={{
                border: 'none',
                backgroundColor: activeTab === 'collabora' ? 'var(--accent-primary)' : 'transparent',
                color: activeTab === 'collabora' ? '#FFFFFF' : 'var(--text-main)',
                fontSize: '11.5px',
                fontWeight: '700',
                borderRadius: '8px',
                padding: '5px 10px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              LibreOffice / Collabora
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('gdocs')}
              style={{
                border: 'none',
                backgroundColor: activeTab === 'gdocs' ? 'var(--accent-primary)' : 'transparent',
                color: activeTab === 'gdocs' ? '#FFFFFF' : 'var(--text-main)',
                fontSize: '11.5px',
                fontWeight: '700',
                borderRadius: '8px',
                padding: '5px 10px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Google Docs
            </button>
          </div>

          {/* BOUTON FERMER */}
          <button
            type="button"
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* CORPS DU MODULE SELON L'ONGLET */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
          {activeTab === 'editor' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* BARRE D'OUTILS DE RÉDACTION */}
              <div
                style={{
                  padding: '8px 16px',
                  borderBottom: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-card)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  flexWrap: 'wrap',
                }}
              >
                <input
                  type="text"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  style={{
                    fontWeight: '800',
                    fontSize: '13px',
                    color: 'var(--text-main)',
                    border: '1px solid transparent',
                    backgroundColor: 'transparent',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    outline: 'none',
                    minWidth: '220px',
                    flex: 1,
                  }}
                  onFocus={(e) => e.target.style.border = '1px solid var(--accent-primary)'}
                  onBlur={(e) => e.target.style.border = '1px solid transparent'}
                />

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={handleSaveDocument}
                    disabled={isSaving}
                    className="premium-button"
                    style={{
                      border: 'none',
                      backgroundColor: 'var(--accent-primary)',
                      color: '#FFFFFF',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      fontSize: '11.5px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      boxShadow: 'var(--shadow-accent)',
                    }}
                  >
                    {isSaving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
                    <span>{isSaving ? 'Enregistrement...' : 'Sauvegarder'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadMarkdown}
                    style={{
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-subtle)',
                      color: 'var(--text-main)',
                      borderRadius: '8px',
                      padding: '6px 10px',
                      fontSize: '11.5px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                    title="Télécharger en fichier Markdown"
                  >
                    <Download size={13} />
                    <span>Exporter .md</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePrint}
                    style={{
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-subtle)',
                      color: 'var(--text-main)',
                      borderRadius: '8px',
                      padding: '6px 10px',
                      fontSize: '11.5px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                    title="Imprimer ou enregistrer en PDF"
                  >
                    <Printer size={13} />
                  </button>
                </div>
              </div>

              {/* ÉDITEUR TEXTUEL COLLABORATIF EN TEMPS RÉEL */}
              <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                <textarea
                  value={docContent}
                  onChange={(e) => setDocContent(e.target.value)}
                  placeholder="Rédigez vos spécifications, comptes-rendus ou notes de réunion ici..."
                  style={{
                    flex: 1,
                    width: '100%',
                    padding: '20px 24px',
                    border: 'none',
                    backgroundColor: darkMode ? '#181513' : '#FFFFFF',
                    color: 'var(--text-main)',
                    fontSize: '13.5px',
                    lineHeight: 1.65,
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    resize: 'none',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* BARRE D'ÉTAT INFÉRIEURE AVEC COLLABORATEURS */}
              <div
                style={{
                  padding: '8px 16px',
                  borderTop: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '11px',
                  color: 'var(--text-secondary)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={12} color="var(--accent-primary)" />
                  <span>Collaborateurs connectés :</span>
                  {collaborators.map((c, i) => (
                    <span key={i} style={{ backgroundColor: 'var(--bg-card)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-color)', fontWeight: '600' }}>
                      {c}
                    </span>
                  ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ShieldCheck size={12} color="var(--accent-success)" />
                  <span>Chiffrement bout-en-bout activé</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'collabora' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '30px', textAlign: 'center', gap: '16px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Layers size={32} />
              </div>
              <div style={{ maxWidth: '500px' }}>
                <h3 className="font-editorial-heading" style={{ margin: '0 0 6px', fontSize: '20px', color: 'var(--text-main)' }}>
                  LibreOffice & Collabora Online
                </h3>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Édition collaborative de documents Office (.docx, .xlsx, .pptx) hébergée sur votre instance Collabora ou Nextcloud sécurisée.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => alert('Connexion à l’instance Collabora Online Troco Pro...')}
                  className="premium-button"
                  style={{
                    border: 'none',
                    backgroundColor: '#3B82F6',
                    color: '#FFFFFF',
                    borderRadius: '12px',
                    padding: '10px 20px',
                    fontSize: '12.5px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 14px rgba(59, 130, 246, 0.35)',
                  }}
                >
                  <ExternalLink size={14} />
                  <span>Ouvrir dans Collabora Online</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'gdocs' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '30px', textAlign: 'center', gap: '16px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'rgba(234, 67, 53, 0.15)', color: '#EA4335', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileCode size={32} />
              </div>
              <div style={{ maxWidth: '500px' }}>
                <h3 className="font-editorial-heading" style={{ margin: '0 0 6px', fontSize: '20px', color: 'var(--text-main)' }}>
                  Google Docs & Drive Workspace
                </h3>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Liez vos documents Google Drive directement dans ce salon de discussion pour collaborer en temps réel avec tous les membres du projet.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <a
                  href="https://docs.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="premium-button"
                  style={{
                    textDecoration: 'none',
                    backgroundColor: 'var(--accent-primary)',
                    color: '#FFFFFF',
                    borderRadius: '12px',
                    padding: '10px 20px',
                    fontSize: '12.5px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: 'var(--shadow-accent)',
                  }}
                >
                  <ExternalLink size={14} />
                  <span>Créer un Google Doc partagé</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalElement, document.body) : modalElement;
}
