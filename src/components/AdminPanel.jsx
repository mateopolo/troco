import React, { useState, useMemo } from 'react';
import {
  Shield, Users, FileText, CheckCircle, Search,
  Trash2, EyeOff, Lock, ArrowLeft, Coins,
  Check, ShieldAlert, Sparkles, RotateCcw, Pencil
} from 'lucide-react';
import { analyzeContent } from '../utils/contentModeration';

export default function AdminPanel({
  isOpen,
  onClose,
  darkMode = false,
  currentUser = null,
  allUsers = [],
  allListings = [],
  allReports = [],
  onUpdateUser = null,
  onDeleteListing = null,
  onResolveReport = null,
  onResetUser = null,
  onEditListing = null,
  onInspectUser = null,
}) {
  const [activeTab, setActiveTab] = useState('reports'); // 'reports' | 'users' | 'listings' | 'moderator'
  const [pinInput, setPinInput] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinError, setPinError] = useState('');

  // Filtres
  const [reportFilter, setReportFilter] = useState('pending'); // 'all' | 'pending' | 'resolved' | 'dismissed'
  const [userSearch, setUserSearch] = useState('');
  const [listingSearch, setListingSearch] = useState('');

  // Sandbox modérateur
  const [sandboxText, setSandboxText] = useState('Offre virement Western Union et coupon PCS 500€ garanti !');

  // Modal d'ajustement de solde
  const [balanceModalUser, setBalanceModalUser] = useState(null);
  const [balanceDeltaEuro, setBalanceDeltaEuro] = useState('');
  const [balanceDeltaTokens, setBalanceDeltaTokens] = useState('');

  // Vérification PIN d'accès (sécurité administrateur stricte)
  const handleUnlock = (e) => {
    if (e) e.preventDefault();
    const isAdminEmail = currentUser?.email === 'mateopolo91@gmail.com';
    if (pinInput.trim() === '2609' || (isAdminEmail && pinInput.trim() === '2609')) {
      setIsUnlocked(true);
      setPinError('');
    } else {
      setPinError('Code PIN incorrect ou privilèges insuffisants.');
    }
  };

  // KPIs
  const kpis = useMemo(() => {
    const totalUsers = allUsers.length || 1;
    const totalListings = allListings.length || 0;
    const pendingReports = allReports.filter(r => (r.status || 'pending') === 'pending').length;
    const totalEurosInSystem = allUsers.reduce((sum, u) => sum + (Number(u.euroBalance) || 0), 0);
    const totalTokensInSystem = allUsers.reduce((sum, u) => sum + (Number(u.trocoTokens) || 0), 0);
    const shadowBannedCount = allUsers.filter(u => u.isShadowBanned).length;
    const bannedCount = allUsers.filter(u => u.isBanned).length;

    return {
      totalUsers,
      totalListings,
      pendingReports,
      totalEurosInSystem: totalEurosInSystem.toFixed(2),
      totalTokensInSystem,
      shadowBannedCount,
      bannedCount,
    };
  }, [allUsers, allListings, allReports]);

  // Filtrage des signalements
  const filteredReports = useMemo(() => {
    return allReports.filter(r => {
      const status = r.status || 'pending';
      if (reportFilter === 'all') return true;
      return status === reportFilter;
    });
  }, [allReports, reportFilter]);

  // Filtrage des utilisateurs
  const filteredUsers = useMemo(() => {
    const q = userSearch.toLowerCase().trim();
    if (!q) return allUsers;
    return allUsers.filter(u =>
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.username && u.username.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.location && u.location.toLowerCase().includes(q))
    );
  }, [allUsers, userSearch]);

  // Filtrage des annonces
  const filteredListings = useMemo(() => {
    const q = listingSearch.toLowerCase().trim();
    if (!q) return allListings;
    return allListings.filter(l =>
      (l.title && l.title.toLowerCase().includes(q)) ||
      (l.author && l.author.toLowerCase().includes(q)) ||
      (l.category && l.category.toLowerCase().includes(q))
    );
  }, [allListings, listingSearch]);

  // Résultat du sandbox modérateur
  const sandboxAnalysis = useMemo(() => {
    return analyzeContent(sandboxText);
  }, [sandboxText]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99990,
        backgroundColor: 'var(--bg-global)',
        color: 'var(--text-main)',
        overflowY: 'auto',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* ÉCRAN DE VERROUILLAGE SÉCURISÉ SI NON DÉVERROUILLÉ */}
      {!isUnlocked ? (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div
            style={{
              width: '100%',
              maxWidth: '420px',
              backgroundColor: 'var(--bg-card)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderRadius: '24px',
              padding: '32px 24px',
              textAlign: 'center',
              boxShadow: 'var(--shadow-card)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: 'var(--bg-subtle)',
                color: 'var(--accent-primary)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
              }}
            >
              <Lock size={28} />
            </div>
            <h2 className="font-editorial-heading" style={{ fontSize: '24px', fontWeight: '600', margin: '0 0 8px', color: 'var(--text-main)' }}>Espace Administrateur</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 20px', lineHeight: 1.6 }}>
              Veuillez saisir votre code d'accès administrateur pour gérer les signalements et la modération de la plateforme Troco.
            </p>

            <form onSubmit={handleUnlock} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <input
                type="password"
                autoFocus
                placeholder="Code PIN secret"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '14px',
                  fontSize: '16px',
                  letterSpacing: '3px',
                  textAlign: 'center',
                  fontWeight: '800',
                  outline: 'none',
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--text-main)',
                  border: pinError ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                  boxSizing: 'border-box'
                }}
              />

              {pinError && (
                <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent-primary)' }}>{pinError}</div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={onClose}
                  className="premium-button"
                  style={{
                    flex: 1, padding: '12px', borderRadius: '14px', border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)', fontWeight: '700', cursor: 'pointer'
                  }}
                >
                  Retour
                </button>
                <button
                  type="submit"
                  className="premium-button"
                  style={{
                    flex: 2, padding: '12px', borderRadius: '14px', border: 'none',
                    background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)', color: '#FFF',
                    fontWeight: '800', cursor: 'pointer', boxShadow: 'var(--shadow-accent)'
                  }}
                >
                  Déverrouiller
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        /* TABLEAU DE BORD PRINCIPAL */
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px 80px' }}>

          {/* EN-TÊTE ADMIN */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={() => onClose?.()}
                className="premium-button"
                style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  backgroundColor: 'var(--bg-card)',
                  color: 'var(--text-main)',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <ArrowLeft size={16} /> Quitter le Panel
              </button>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '800', color: 'var(--accent-primary)', padding: '3px 8px', borderRadius: '999px', backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-color)', marginBottom: '4px' }}>
                  <Shield size={12} /> MODÉRATION & SUPER-ADMIN
                </div>
                <h1 className="font-editorial-heading" style={{ fontSize: '24px', fontWeight: '600', margin: 0, letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
                  Console d'Administration Troco
                </h1>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setIsUnlocked(false)}
                className="premium-button"
                style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '8px 12px',
                  backgroundColor: 'var(--bg-card)',
                  color: 'var(--text-secondary)',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Lock size={14} /> Verrouiller
              </button>
            </div>
          </div>

          {/* KPIS ET STATISTIQUES GLOBALES */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '24px' }}>
            <div style={{ padding: '16px', borderRadius: '18px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Users size={14} /> Utilisateurs
              </div>
              <div style={{ fontSize: '24px', fontWeight: '800', marginTop: '6px', color: 'var(--text-main)' }}>
                {kpis.totalUsers}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--accent-primary)', marginTop: '4px', fontWeight: '700' }}>
                {kpis.shadowBannedCount} shadow-bans • {kpis.bannedCount} bannis
              </div>
            </div>

            <div style={{ padding: '16px', borderRadius: '18px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={14} /> Annonces Actives
              </div>
              <div style={{ fontSize: '24px', fontWeight: '800', marginTop: '6px', color: 'var(--text-main)' }}>
                {kpis.totalListings}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Catalogue mondial
              </div>
            </div>

            <div style={{ padding: '16px', borderRadius: '18px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)' }}>
              <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldAlert size={14} /> Signalements
              </div>
              <div style={{ fontSize: '24px', fontWeight: '800', marginTop: '6px', color: 'var(--accent-primary)' }}>
                {kpis.pendingReports}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', fontWeight: '700' }}>
                En attente d'action
              </div>
            </div>

            <div style={{ padding: '16px', borderRadius: '18px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Coins size={14} color="var(--accent-primary)" /> Masse Monétaire
              </div>
              <div style={{ fontSize: '18px', fontWeight: '800', marginTop: '6px', color: 'var(--accent-primary)' }}>
                {kpis.totalEurosInSystem}€ • {kpis.totalTokensInSystem} 🪙
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Soldes cumulés
              </div>
            </div>
          </div>

          {/* SÉLECTEUR D'ONGLETS */}
          <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '20px', overflowX: 'auto' }}>
            <button
              onClick={() => setActiveTab('reports')}
              className="premium-button"
              style={{
                border: activeTab === 'reports' ? '1.5px solid var(--accent-primary)' : '1px solid transparent',
                borderRadius: '12px',
                padding: '10px 16px',
                backgroundColor: activeTab === 'reports' ? 'var(--bg-subtle)' : 'transparent',
                color: activeTab === 'reports' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                fontWeight: '800',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: activeTab === 'reports' ? 'var(--shadow-accent)' : 'none'
              }}
            >
              <ShieldAlert size={16} /> Signalements ({kpis.pendingReports})
            </button>

            <button
              onClick={() => setActiveTab('users')}
              className="premium-button"
              style={{
                border: activeTab === 'users' ? '1.5px solid var(--accent-primary)' : '1px solid transparent',
                borderRadius: '12px',
                padding: '10px 16px',
                backgroundColor: activeTab === 'users' ? 'var(--bg-subtle)' : 'transparent',
                color: activeTab === 'users' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                fontWeight: '800',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: activeTab === 'users' ? 'var(--shadow-accent)' : 'none'
              }}
            >
              <Users size={16} /> Utilisateurs & Shadow-Ban
            </button>

            <button
              onClick={() => setActiveTab('listings')}
              className="premium-button"
              style={{
                border: activeTab === 'listings' ? '1.5px solid var(--accent-primary)' : '1px solid transparent',
                borderRadius: '12px',
                padding: '10px 16px',
                backgroundColor: activeTab === 'listings' ? 'var(--bg-subtle)' : 'transparent',
                color: activeTab === 'listings' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                fontWeight: '800',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: activeTab === 'listings' ? 'var(--shadow-accent)' : 'none'
              }}
            >
              <FileText size={16} /> Annonces ({kpis.totalListings})
            </button>

            <button
              onClick={() => setActiveTab('moderator')}
              className="premium-button"
              style={{
                border: activeTab === 'moderator' ? '1.5px solid var(--accent-primary)' : '1px solid transparent',
                borderRadius: '12px',
                padding: '10px 16px',
                backgroundColor: activeTab === 'moderator' ? 'var(--bg-subtle)' : 'transparent',
                color: activeTab === 'moderator' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                fontWeight: '800',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: activeTab === 'moderator' ? 'var(--shadow-accent)' : 'none'
              }}
            >
              <Sparkles size={16} /> Testeur Modération IA
            </button>
          </div>

          {/* ONGLET 1 : SIGNALEMENTS */}
          {activeTab === 'reports' && (
            <div>
              {/* FILTRES DE SIGNALEMENT */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                {[
                  { key: 'pending', label: 'En attente' },
                  { key: 'resolved', label: 'Résolus' },
                  { key: 'dismissed', label: 'Classés sans suite' },
                  { key: 'all', label: 'Tous les signalements' },
                ].map(f => (
                  <button
                    key={f.key}
                    onClick={() => setReportFilter(f.key)}
                    className="premium-button"
                    style={{
                      border: reportFilter === f.key ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)',
                      borderRadius: '999px',
                      padding: '6px 14px',
                      backgroundColor: reportFilter === f.key ? 'var(--bg-subtle)' : 'var(--bg-card)',
                      color: reportFilter === f.key ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      fontSize: '12px',
                      fontWeight: '800',
                      cursor: 'pointer',
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {filteredReports.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', backgroundColor: 'var(--bg-card)', borderRadius: '20px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)' }}>
                  <CheckCircle size={36} color="var(--accent-primary)" style={{ marginBottom: '10px' }} />
                  <h3 className="font-editorial-heading" style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: '600', color: 'var(--text-main)' }}>Aucun signalement</h3>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Tous les signalements pour ce filtre ont été traités avec succès.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {filteredReports.map((report) => {
                    const isPending = (report.status || 'pending') === 'pending';
                    return (
                      <div
                        key={report.id || Math.random()}
                        style={{
                          padding: '18px',
                          borderRadius: '20px',
                          backgroundColor: 'var(--bg-card)',
                          border: isPending ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)',
                          boxShadow: 'var(--shadow-card)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
                          <div style={{ flex: 1, minWidth: '240px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: '800',
                                  padding: '4px 10px',
                                  borderRadius: '999px',
                                  backgroundColor: 'var(--bg-subtle)',
                                  color: 'var(--accent-primary)',
                                  border: '1px solid var(--border-color)',
                                }}
                              >
                                {report.reasonLabel || report.reasonKey || 'Signalement'}
                              </span>
                              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                Signalé par <strong>{report.reporterName || 'Utilisateur'}</strong>
                              </span>
                            </div>

                            <h4 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: '800', color: 'var(--text-main)' }}>
                              Cible : {report.listingTitle || `Utilisateur ${report.reportedUserName}`}
                            </h4>

                            {report.details && (
                              <p style={{ margin: '0 0 10px', fontSize: '13px', color: 'var(--text-main)', lineHeight: 1.5, backgroundColor: 'var(--bg-subtle)', padding: '10px 12px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                « {report.details} »
                              </p>
                            )}

                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                              Auteur du contenu : <strong>{report.reportedUserName}</strong>
                            </div>
                          </div>

                          {/* ACTIONS MODÉRATEUR */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '180px' }}>
                            {report.listingId && onDeleteListing && (
                              <button
                                onClick={() => {
                                  if (window.confirm(`Supprimer l'annonce « ${report.listingTitle || 'signalée'} » ?`)) {
                                    if (typeof onDeleteListing === 'function') onDeleteListing(report.listingId);
                                    if (typeof onResolveReport === 'function') onResolveReport(report.id, 'resolved');
                                  }
                                }}
                                className="premium-button"
                                style={{
                                  border: '1px solid var(--border-color)', borderRadius: '10px', padding: '8px 12px',
                                  backgroundColor: 'var(--bg-subtle)', color: 'var(--text-main)', fontWeight: '700', fontSize: '12px', cursor: 'pointer',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                                }}
                              >
                                <Trash2 size={13} /> Supprimer l'annonce
                              </button>
                            )}

                            {report.reportedUserId && onUpdateUser && (
                              <button
                                onClick={() => {
                                  if (window.confirm(`Shadow-bannir l'utilisateur ${report.reportedUserName} ?`)) {
                                    if (typeof onUpdateUser === 'function') onUpdateUser(report.reportedUserId, { isShadowBanned: true });
                                    if (typeof onResolveReport === 'function') onResolveReport(report.id, 'resolved');
                                  }
                                }}
                                className="premium-button"
                                style={{
                                  border: '1px solid var(--border-color)', borderRadius: '10px', padding: '8px 12px',
                                  backgroundColor: 'var(--bg-subtle)', color: 'var(--text-main)', fontWeight: '700', fontSize: '12px', cursor: 'pointer',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                                }}
                              >
                                <EyeOff size={13} /> Shadow-Ban Auteur
                              </button>
                            )}

                            {isPending && onResolveReport && (
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button
                                  onClick={() => { if (typeof onResolveReport === 'function') onResolveReport(report.id, 'resolved'); }}
                                  className="premium-button"
                                  style={{
                                    flex: 1, border: 'none', borderRadius: '10px', padding: '8px',
                                    background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)', color: '#FFF', fontWeight: '700', fontSize: '12px', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                                    boxShadow: 'var(--shadow-accent)'
                                  }}
                                >
                                  <Check size={13} /> Résolu
                                </button>
                                <button
                                  onClick={() => { if (typeof onResolveReport === 'function') onResolveReport(report.id, 'dismissed'); }}
                                  className="premium-button"
                                  style={{
                                    flex: 1, border: '1px solid var(--border-color)', borderRadius: '10px', padding: '8px',
                                    backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)', fontWeight: '700', fontSize: '12px', cursor: 'pointer'
                                  }}
                                >
                                  Classer
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ONGLET 2 : UTILISATEURS & SHADOW-BAN */}
          {activeTab === 'users' && (
            <div>
              {/* RECHERCHE UTILISATEUR */}
              <div style={{ position: 'relative', marginBottom: '16px' }}>
                <Search size={16} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-secondary)' }} />
                <input
                  type="text"
                  placeholder="Rechercher un utilisateur (nom, pseudo, email, ville)..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 40px',
                    borderRadius: '14px',
                    fontSize: '13px',
                    outline: 'none',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    border: '1px solid var(--border-color)',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
                {filteredUsers.map((u) => {
                  const uid = u.uid || u.id;
                  const isShadow = !!u.isShadowBanned;
                  const isBanned = !!u.isBanned;
                  const isAdmin = u.role === 'admin' || !!u.isAdmin;

                  return (
                    <div
                      key={uid}
                      style={{
                        padding: '16px',
                        borderRadius: '20px',
                        backgroundColor: 'var(--bg-card)',
                        border: (isBanned || isShadow) ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)',
                        boxShadow: 'var(--shadow-card)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                          <img
                            src={u.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80'}
                            alt={u.name}
                            style={{ width: '46px', height: '46px', borderRadius: '50%', objectFit: 'cover' }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '14px', fontWeight: '800', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-main)' }}>
                              {u.name || 'Utilisateur'}
                            </div>
                            <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent-primary)' }}>
                              {u.username || '@user'}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                              {u.email || u.phoneNumber || u.location || 'Membre Troco'}
                            </div>
                          </div>
                        </div>

                        {/* BADGES D'ÉTAT */}
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                          {isAdmin && (
                            <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: 'var(--bg-subtle)', color: 'var(--accent-primary)', padding: '2px 8px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                              🛡️ Admin
                            </span>
                          )}
                          {isShadow && (
                            <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: 'var(--bg-subtle)', color: 'var(--accent-primary)', padding: '2px 8px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                              👻 Shadow-Banni
                            </span>
                          )}
                          {isBanned && (
                            <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: 'var(--bg-subtle)', color: 'var(--accent-primary)', padding: '2px 8px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                              🚫 Banni
                            </span>
                          )}
                        </div>

                        {/* SOLDES */}
                        <div style={{ padding: '8px 10px', borderRadius: '12px', backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-color)', marginBottom: '12px', fontSize: '12px', display: 'flex', justifyContent: 'space-between', color: 'var(--text-main)' }}>
                          <span>Solde : <strong>{(Number(u.euroBalance) || 0).toFixed(2)}€</strong></span>
                          <span>Jetons : <strong>{u.trocoTokens || 0} 🪙</strong></span>
                        </div>
                      </div>

                      {/* ACTIONS UTILISATEUR */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => { if (typeof onUpdateUser === 'function') onUpdateUser(uid, { isShadowBanned: !isShadow }); }}
                            className="premium-button"
                            style={{
                              flex: 1, padding: '7px 10px', borderRadius: '10px', border: '1px solid var(--border-color)',
                              backgroundColor: isShadow ? 'var(--accent-primary)' : 'var(--bg-subtle)',
                              color: isShadow ? '#FFF' : 'var(--text-main)', fontSize: '11px', fontWeight: '700', cursor: 'pointer'
                            }}
                          >
                            {isShadow ? '✓ Lever Shadow-ban' : '👻 Shadow-Ban'}
                          </button>
                          <button
                            onClick={() => { if (typeof onUpdateUser === 'function') onUpdateUser(uid, { isBanned: !isBanned }); }}
                            className="premium-button"
                            style={{
                              flex: 1, padding: '7px 10px', borderRadius: '10px', border: '1px solid var(--border-color)',
                              backgroundColor: isBanned ? 'var(--accent-primary)' : 'var(--bg-subtle)',
                              color: isBanned ? '#FFF' : 'var(--text-main)', fontSize: '11px', fontWeight: '700', cursor: 'pointer'
                            }}
                          >
                            {isBanned ? '✓ Débannir' : '🚫 Bannir'}
                          </button>
                        </div>

                        {onInspectUser && (
                          <button
                            type="button"
                            onClick={() => { if (typeof onInspectUser === 'function') onInspectUser(u); }}
                            className="premium-button"
                            style={{
                              padding: '7px 10px', borderRadius: '10px', border: '1px solid var(--border-color)',
                              backgroundColor: 'rgba(198, 125, 91, 0.12)', color: 'var(--accent-primary)', fontSize: '11px', fontWeight: '800', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px'
                            }}
                          >
                            👤 Voir Profil Détaillé & Troc
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setBalanceModalUser(u);
                            setBalanceDeltaEuro('');
                            setBalanceDeltaTokens('');
                          }}
                          className="premium-button"
                          style={{
                            padding: '7px 10px', borderRadius: '10px', border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-subtle)', color: 'var(--text-main)', fontSize: '11px', fontWeight: '700', cursor: 'pointer'
                          }}
                        >
                          💳 Ajuster les soldes (€ / 🪙)
                        </button>

                        {onResetUser && (
                          <button
                            onClick={() => {
                              const userName = u.name || u.username || 'cet utilisateur';
                              if (window.confirm(`⚠️ CONFIRMATION DE RÉINITIALISATION DU COMPTE\n\nÊtes-vous absolument sûr de vouloir réinitialiser intégralement le profil de « ${userName} » ?\n\nCette action va :\n- Remettre son solde en euros à 0.00€\n- Réinitialiser ses jetons de bienvenue à 10\n- Purger ses compétences et son historique de deals\n- Supprimer toutes ses annonces publiées\n- Forcer son onboarding à se relancer à sa prochaine connexion comme un nouvel utilisateur.`)) {
                                if (typeof onResetUser === 'function') onResetUser(uid, u);
                              }
                            }}
                            className="premium-button"
                            style={{
                              padding: '8px 10px',
                              borderRadius: '10px',
                              border: '1px solid var(--border-color)',
                              backgroundColor: 'var(--bg-subtle)',
                              color: 'var(--text-main)',
                              fontSize: '11px',
                              fontWeight: '800',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <RotateCcw size={12} /> 🔄 Réinitialiser le profil (Wipe & Reset)
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ONGLET 3 : ANNONCES */}
          {activeTab === 'listings' && (
            <div>
              {/* RECHERCHE ANNONCE */}
              <div style={{ position: 'relative', marginBottom: '16px' }}>
                <Search size={16} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-secondary)' }} />
                <input
                  type="text"
                  placeholder="Rechercher une annonce par titre, auteur ou catégorie..."
                  value={listingSearch}
                  onChange={(e) => setListingSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 40px',
                    borderRadius: '14px',
                    fontSize: '13px',
                    outline: 'none',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    border: '1px solid var(--border-color)',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
                {filteredListings.map((listing) => (
                  <div
                    key={listing.id}
                    style={{
                      padding: '14px',
                      borderRadius: '20px',
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      boxShadow: 'var(--shadow-card)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <img
                        src={listing.image || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=400&q=80'}
                        alt={listing.title}
                        style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '12px', marginBottom: '10px' }}
                      />
                      <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--accent-primary)', marginBottom: '4px' }}>
                        {listing.category}
                      </div>
                      <h4 className="font-editorial-heading" style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: '600', lineHeight: 1.3, color: 'var(--text-main)' }}>
                        {listing.title}
                      </h4>
                      <p style={{ margin: '0 0 8px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                        Par <strong>{listing.author}</strong> • {listing.location || 'France'}
                      </p>
                      <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--accent-primary)', marginBottom: '12px' }}>
                        {listing.compensation}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      {onEditListing && (
                        <button
                          onClick={() => { if (typeof onEditListing === 'function') onEditListing(listing); }}
                          className="premium-button"
                          style={{
                            flex: 1, padding: '8px', borderRadius: '10px', border: 'none',
                            background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)', color: '#FFF', fontWeight: '700', fontSize: '12px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                            boxShadow: 'var(--shadow-accent)'
                          }}
                        >
                          <Pencil size={13} /> Modifier
                        </button>
                      )}
                      {onDeleteListing && (
                        <button
                          onClick={() => {
                            if (window.confirm(`Confirmer la suppression de l'annonce « ${listing.title} » ?`)) {
                              if (typeof onDeleteListing === 'function') onDeleteListing(listing.id);
                            }
                          }}
                          className="premium-button"
                          style={{
                            flex: 1, padding: '8px', borderRadius: '10px', border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-subtle)', color: 'var(--text-main)', fontWeight: '700', fontSize: '12px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
                          }}
                        >
                          <Trash2 size={13} /> Supprimer
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ONGLET 4 : TESTEUR MODÉRATEUR IA */}
          {activeTab === 'moderator' && (
            <div style={{ maxWidth: '700px' }}>
              <div style={{ padding: '20px', borderRadius: '20px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)', marginBottom: '20px' }}>
                <h3 className="font-editorial-heading" style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: '600', color: 'var(--text-main)' }}>Bac à sable de modération heuristique</h3>
                <p style={{ margin: '0 0 14px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Testez en direct l'algorithme de détection des fraudes, mots-clés interdits et coordonnées sensibles.
                </p>

                <textarea
                  rows={4}
                  value={sandboxText}
                  onChange={(e) => setSandboxText(e.target.value)}
                  placeholder="Tapez un texte à analyser..."
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '12px',
                    fontSize: '13px',
                    outline: 'none',
                    backgroundColor: 'var(--bg-subtle)',
                    color: 'var(--text-main)',
                    border: '1px solid var(--border-color)',
                    marginBottom: '16px',
                    boxSizing: 'border-box'
                  }}
                />

                <div style={{ padding: '14px', borderRadius: '14px', backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--accent-primary)' }}>
                      {sandboxAnalysis.isClean ? '✓ Contenu Conforme' : '⚠️ Risque Détecté'}
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--accent-primary)' }}>
                      Score de risque : {sandboxAnalysis.score}/100
                    </span>
                  </div>

                  {sandboxAnalysis.reasons.length > 0 && (
                    <ul style={{ margin: '6px 0 0', paddingLeft: '18px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {sandboxAnalysis.reasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* MODAL D'AJUSTEMENT DES SOLDES */}
          {balanceModalUser && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 99999,
                backgroundColor: 'var(--overlay-bg)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px',
              }}
              onClick={() => setBalanceModalUser(null)}
            >
              <div
                style={{
                  width: '100%',
                  maxWidth: '440px',
                  backgroundColor: 'var(--bg-card)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  borderRadius: '24px',
                  padding: '24px',
                  color: 'var(--text-main)',
                  border: '1px solid var(--border-color)',
                  boxShadow: 'var(--shadow-card)',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="font-editorial-heading" style={{ margin: '0 0 4px', fontSize: '20px', fontWeight: '600', color: 'var(--text-main)' }}>Ajuster les soldes</h3>
                <p style={{ margin: '0 0 16px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Utilisateur : <strong>{balanceModalUser.name}</strong> ({balanceModalUser.username})
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                      Solde Euros actuel : {(Number(balanceModalUser.euroBalance) || 0).toFixed(2)}€
                    </label>
                    <input
                      type="number"
                      placeholder="Ajouter/retirer (ex: +20 ou -10)"
                      value={balanceDeltaEuro}
                      onChange={(e) => setBalanceDeltaEuro(e.target.value)}
                      style={{
                        width: '100%', padding: '10px', borderRadius: '10px', fontSize: '13px',
                        backgroundColor: 'var(--bg-subtle)', color: 'var(--text-main)',
                        border: '1px solid var(--border-color)', outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px', color: 'var(--text-secondary)' }}>
                      Jetons Troco actuels : {balanceModalUser.trocoTokens || 0} 🪙
                    </label>
                    <input
                      type="number"
                      placeholder="Ajouter/retirer des jetons (ex: +5 ou -2)"
                      value={balanceDeltaTokens}
                      onChange={(e) => setBalanceDeltaTokens(e.target.value)}
                      style={{
                        width: '100%', padding: '10px', borderRadius: '10px', fontSize: '13px',
                        backgroundColor: 'var(--bg-subtle)', color: 'var(--text-main)',
                        border: '1px solid var(--border-color)', outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => setBalanceModalUser(null)}
                    className="premium-button"
                    style={{ flex: 1, padding: '10px', borderRadius: '12px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)', fontWeight: '700', cursor: 'pointer' }}
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => {
                      const deltaE = Number(balanceDeltaEuro) || 0;
                      const deltaT = Number(balanceDeltaTokens) || 0;
                      const newEuro = Number(((Number(balanceModalUser.euroBalance) || 0) + deltaE).toFixed(2));
                      const newTokens = Math.max(0, (Number(balanceModalUser.trocoTokens) || 0) + deltaT);

                      if (onUpdateUser) {
                        onUpdateUser(balanceModalUser.uid || balanceModalUser.id, {
                          euroBalance: newEuro,
                          trocoTokens: newTokens,
                        });
                      }
                      setBalanceModalUser(null);
                    }}
                    className="premium-button"
                    style={{ flex: 2, padding: '10px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)', color: '#FFF', fontWeight: '800', cursor: 'pointer', boxShadow: 'var(--shadow-accent)' }}
                  >
                    Appliquer la modification
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
