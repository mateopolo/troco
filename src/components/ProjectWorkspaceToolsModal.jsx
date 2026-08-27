import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Calendar, Monitor, FileText,
  ExternalLink, Sparkles, Plus, Clock, ShieldCheck,
  HardDrive, Video, Users, Play, RefreshCw
} from 'lucide-react';

export default function ProjectWorkspaceToolsModal({
  isOpen,
  onClose,
  projectTitle = 'Projet Collaboratif',
  groupId = 'demo_group',
  onStartScreenShare = null,
  onStartVideoCall = null,
  darkMode = false,
}) {
  const [activeTab, setActiveTab] = useState('drive'); // 'drive' | 'calendar' | 'remote'
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [isCalendarConnected, setIsCalendarConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Mock list of collaborative files
  const [driveFiles, setDriveFiles] = useState([
    { id: '1', name: 'Cahier des Charges & Roadmap.docx', size: '245 KB', updated: 'Il y a 2 heures', author: 'Mateo P.', type: 'doc' },
    { id: '2', name: 'Budget & Répartition des Jetons.xlsx', size: '1.2 MB', updated: 'Hier à 18h40', author: 'Emma R.', type: 'sheet' },
    { id: '3', name: 'Charte Graphique & Wireframes.fig', size: '18.4 MB', updated: 'Il y a 3 jours', author: 'Thomas V.', type: 'figma' },
  ]);

  // Mock list of meetings
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
        padding: '12px 12px max(80px, env(safe-area-inset-bottom, 24px)) 12px',
        animation: 'fadeIn 0.2s ease both',
        boxSizing: 'border-box',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '720px',
          maxHeight: 'min(calc(100dvh - 100px), 760px)',
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
        {/* EN-TÊTE DE L'ESPACE OUTILS PRO */}
        <div
          style={{
            padding: '18px 22px',
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
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: 'var(--text-main)' }}>
                  Outils Pro & Intégrations
                </h3>
                <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: 'var(--accent-primary)', color: '#FFF', padding: '2px 8px', borderRadius: '999px' }}>
                  PRO WORKSPACE
                </span>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                {projectTitle}
              </p>
            </div>
          </div>

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
          >
            <X size={18} />
          </button>
        </div>

        {/* ONGLETS DES OUTILS INTÉGRÉS */}
        <div
          style={{
            display: 'flex',
            padding: '10px 18px',
            gap: '8px',
            borderBottom: '1px solid var(--border-color)',
            backgroundColor: darkMode ? '#181513' : '#F5F0E8',
            overflowX: 'auto',
          }}
        >
          {[
            { id: 'drive', label: 'Fichiers & Drive Projet', icon: HardDrive },
            { id: 'calendar', label: 'Planning & Visios HD', icon: Calendar },
            { id: 'remote', label: 'Contrôle à Distance (Remote)', icon: Monitor },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className="premium-button"
                style={{
                  border: isSelected ? '1px solid var(--accent-primary)' : '1px solid transparent',
                  backgroundColor: isSelected ? 'var(--bg-card)' : 'transparent',
                  color: isSelected ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  borderRadius: '12px',
                  padding: '8px 14px',
                  fontSize: '12px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: isSelected ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                }}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* CORPS DE L'ONGLET SÉLECTIONNÉ */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* 1. ONGLET GOOGLE DRIVE */}
          {activeTab === 'drive' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeIn 0.2s ease' }}>
              {/* BANNIÈRE DE CONNEXION / STATUT */}
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

              {/* LISTE DES DOCUMENTS DU PROJET */}
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
                        transition: 'all 0.15s ease',
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

          {/* 2. ONGLET GOOGLE CALENDAR & MEETS */}
          {activeTab === 'calendar' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeIn 0.2s ease' }}>
              {/* BANNIÈRE CALENDRIER */}
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

              {/* LISTE DES PROCHAINES RÉUNIONS */}
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

              {/* FORMULAIRE D'AJOUT DE RÉUNION */}
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

          {/* 3. ONGLET CONTRÔLE À DISTANCE & REMOTE ASSIST */}
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
            padding: '14px 22px',
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

  return typeof document !== 'undefined' ? createPortal(modalElement, document.body) : modalElement;
}

