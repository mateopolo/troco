import React, { useState, useMemo } from 'react';
import {
  Shield, Users, FileText, CheckCircle, Search,
  Trash2, EyeOff, Lock, ArrowLeft, Coins,
  Check, ShieldAlert, Sparkles
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

  // Vérification PIN d'accès (sécurité administrateur)
  const handleUnlock = (e) => {
    if (e) e.preventDefault();
    if (pinInput.trim() === '2601' || currentUser?.role === 'admin') {
      setIsUnlocked(true);
      setPinError('');
    } else {
      setPinError('Code PIN incorrect. Veuillez réessayer.');
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
        backgroundColor: darkMode ? '#0B1120' : '#F8FAFC',
        color: darkMode ? '#F8FAFC' : '#0F172A',
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
              backgroundColor: darkMode ? 'rgba(30,41,59,0.9)' : '#FFFFFF',
              borderRadius: '24px',
              padding: '32px 24px',
              textAlign: 'center',
              boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
              border: darkMode ? '1px solid rgba(255,255,255,0.12)' : '1px solid #E2E8F0',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: darkMode ? 'rgba(96,165,250,0.2)' : '#EFF6FF',
                color: darkMode ? '#60A5FA' : '#04265A',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
              }}
            >
              <Lock size={28} />
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: '800', margin: '0 0 8px' }}>Espace Administrateur</h2>
            <p style={{ fontSize: '13px', color: darkMode ? '#94A3B8' : '#64748B', margin: '0 0 20px', lineHeight: 1.6 }}>
              Veuillez saisir votre code d'accès administrateur pour gérer les signalements et la modération de la plateforme Troco.
            </p>

            <form onSubmit={handleUnlock} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <input
                type="password"
                autoFocus
                placeholder="Code PIN (ex: 2601)"
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
                  backgroundColor: darkMode ? 'rgba(15,23,42,0.8)' : '#F8FAFC',
                  color: darkMode ? '#F8FAFC' : '#0F172A',
                  border: pinError ? '2px solid #EF4444' : (darkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid #CBD5E1'),
                }}
              />

              {pinError && (
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#EF4444' }}>{pinError}</div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '14px', border: '1px solid #CBD5E1',
                    background: 'transparent', color: darkMode ? '#CBD5E1' : '#64748B', fontWeight: '700', cursor: 'pointer'
                  }}
                >
                  Retour
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 2, padding: '12px', borderRadius: '14px', border: 'none',
                    background: 'linear-gradient(135deg, #04265A 0%, #14B8A6 100%)', color: '#FFF',
                    fontWeight: '800', cursor: 'pointer', boxShadow: '0 8px 20px rgba(4,38,90,0.3)'
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
                onClick={onClose}
                style={{
                  border: 'none',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
                  color: darkMode ? '#FFFFFF' : '#0F172A',
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
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '800', color: '#10B981', padding: '3px 8px', borderRadius: '999px', backgroundColor: darkMode ? 'rgba(16,185,129,0.15)' : '#ECFDF5', marginBottom: '4px' }}>
                  <Shield size={12} /> MODÉRATION & SUPER-ADMIN
                </div>
                <h1 style={{ fontSize: '24px', fontWeight: '800', margin: 0, letterSpacing: '-0.02em' }}>
                  Console d'Administration Troco
                </h1>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setIsUnlocked(false)}
                style={{
                  border: 'none',
                  borderRadius: '12px',
                  padding: '8px 12px',
                  backgroundColor: darkMode ? 'rgba(239,68,68,0.2)' : '#FEF2F2',
                  color: '#EF4444',
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
            <div style={{ padding: '16px', borderRadius: '18px', backgroundColor: darkMode ? 'rgba(30,41,59,0.7)' : '#FFFFFF', border: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: darkMode ? '#94A3B8' : '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Users size={14} /> Utilisateurs
              </div>
              <div style={{ fontSize: '24px', fontWeight: '800', marginTop: '6px', color: darkMode ? '#FFFFFF' : '#0F172A' }}>
                {kpis.totalUsers}
              </div>
              <div style={{ fontSize: '11px', color: '#10B981', marginTop: '4px' }}>
                {kpis.shadowBannedCount} shadow-bans • {kpis.bannedCount} bannis
              </div>
            </div>

            <div style={{ padding: '16px', borderRadius: '18px', backgroundColor: darkMode ? 'rgba(30,41,59,0.7)' : '#FFFFFF', border: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: darkMode ? '#94A3B8' : '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={14} /> Annonces Actives
              </div>
              <div style={{ fontSize: '24px', fontWeight: '800', marginTop: '6px', color: darkMode ? '#FFFFFF' : '#0F172A' }}>
                {kpis.totalListings}
              </div>
              <div style={{ fontSize: '11px', color: darkMode ? '#94A3B8' : '#64748B', marginTop: '4px' }}>
                Catalogue mondial
              </div>
            </div>

            <div style={{ padding: '16px', borderRadius: '18px', backgroundColor: darkMode ? 'rgba(239,68,68,0.15)' : '#FEF2F2', border: darkMode ? '1px solid rgba(239,68,68,0.3)' : '1px solid #FCA5A5' }}>
              <div style={{ fontSize: '12px', fontWeight: '800', color: '#EF4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldAlert size={14} /> Signalements
              </div>
              <div style={{ fontSize: '24px', fontWeight: '800', marginTop: '6px', color: '#EF4444' }}>
                {kpis.pendingReports}
              </div>
              <div style={{ fontSize: '11px', color: '#EF4444', marginTop: '4px', fontWeight: '700' }}>
                En attente d'action
              </div>
            </div>

            <div style={{ padding: '16px', borderRadius: '18px', backgroundColor: darkMode ? 'rgba(30,41,59,0.7)' : '#FFFFFF', border: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: darkMode ? '#94A3B8' : '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Coins size={14} /> Masse Monétaire
              </div>
              <div style={{ fontSize: '18px', fontWeight: '800', marginTop: '6px', color: darkMode ? '#60A5FA' : '#04265A' }}>
                {kpis.totalEurosInSystem}€ • {kpis.totalTokensInSystem} 🪙
              </div>
              <div style={{ fontSize: '11px', color: darkMode ? '#94A3B8' : '#64748B', marginTop: '4px' }}>
                Soldes cumulés
              </div>
            </div>
          </div>

          {/* SÉLECTEUR D'ONGLETS */}
          <div style={{ display: 'flex', gap: '8px', borderBottom: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #E2E8F0', paddingBottom: '12px', marginBottom: '20px', overflowX: 'auto' }}>
            <button
              onClick={() => setActiveTab('reports')}
              style={{
                border: 'none',
                borderRadius: '12px',
                padding: '10px 16px',
                backgroundColor: activeTab === 'reports' ? (darkMode ? '#EF4444' : '#DC2626') : 'transparent',
                color: activeTab === 'reports' ? '#FFFFFF' : (darkMode ? '#CBD5E1' : '#64748B'),
                fontWeight: '800',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <ShieldAlert size={16} /> Signalements ({kpis.pendingReports})
            </button>

            <button
              onClick={() => setActiveTab('users')}
              style={{
                border: 'none',
                borderRadius: '12px',
                padding: '10px 16px',
                backgroundColor: activeTab === 'users' ? (darkMode ? '#60A5FA' : '#04265A') : 'transparent',
                color: activeTab === 'users' ? (darkMode ? '#0F172A' : '#FFFFFF') : (darkMode ? '#CBD5E1' : '#64748B'),
                fontWeight: '800',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Users size={16} /> Utilisateurs & Shadow-Ban
            </button>

            <button
              onClick={() => setActiveTab('listings')}
              style={{
                border: 'none',
                borderRadius: '12px',
                padding: '10px 16px',
                backgroundColor: activeTab === 'listings' ? (darkMode ? '#60A5FA' : '#04265A') : 'transparent',
                color: activeTab === 'listings' ? (darkMode ? '#0F172A' : '#FFFFFF') : (darkMode ? '#CBD5E1' : '#64748B'),
                fontWeight: '800',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <FileText size={16} /> Annonces ({kpis.totalListings})
            </button>

            <button
              onClick={() => setActiveTab('moderator')}
              style={{
                border: 'none',
                borderRadius: '12px',
                padding: '10px 16px',
                backgroundColor: activeTab === 'moderator' ? (darkMode ? '#60A5FA' : '#04265A') : 'transparent',
                color: activeTab === 'moderator' ? (darkMode ? '#0F172A' : '#FFFFFF') : (darkMode ? '#CBD5E1' : '#64748B'),
                fontWeight: '800',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
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
                    style={{
                      border: reportFilter === f.key ? (darkMode ? '1px solid #EF4444' : '1px solid #DC2626') : (darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #E2E8F0'),
                      borderRadius: '999px',
                      padding: '6px 14px',
                      backgroundColor: reportFilter === f.key ? (darkMode ? 'rgba(239,68,68,0.2)' : '#FEF2F2') : 'transparent',
                      color: reportFilter === f.key ? (darkMode ? '#FCA5A5' : '#991B1B') : (darkMode ? '#CBD5E1' : '#64748B'),
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
                <div style={{ padding: '40px 20px', textAlign: 'center', backgroundColor: darkMode ? 'rgba(30,41,59,0.5)' : '#FFFFFF', borderRadius: '20px', border: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E2E8F0' }}>
                  <CheckCircle size={36} color="#10B981" style={{ marginBottom: '10px' }} />
                  <h3 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: '800' }}>Aucun signalement</h3>
                  <p style={{ margin: 0, fontSize: '13px', color: darkMode ? '#94A3B8' : '#64748B' }}>
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
                          backgroundColor: darkMode ? 'rgba(30,41,59,0.8)' : '#FFFFFF',
                          border: isPending ? (darkMode ? '1px solid #EF4444' : '1px solid #FCA5A5') : (darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E2E8F0'),
                          boxShadow: '0 6px 16px rgba(0,0,0,0.04)',
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
                                  backgroundColor: isPending ? '#FEF2F2' : '#EFF6FF',
                                  color: isPending ? '#DC2626' : '#04265A',
                                  border: isPending ? '1px solid #FCA5A5' : '1px solid #BFDBFE',
                                }}
                              >
                                {report.reasonLabel || report.reasonKey || 'Signalement'}
                              </span>
                              <span style={{ fontSize: '11px', color: darkMode ? '#94A3B8' : '#64748B' }}>
                                Signalé par <strong>{report.reporterName || 'Utilisateur'}</strong>
                              </span>
                            </div>

                            <h4 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: '800' }}>
                              Cible : {report.listingTitle || `Utilisateur ${report.reportedUserName}`}
                            </h4>

                            {report.details && (
                              <p style={{ margin: '0 0 10px', fontSize: '13px', color: darkMode ? '#CBD5E1' : '#475569', lineHeight: 1.5, backgroundColor: darkMode ? 'rgba(15,23,42,0.4)' : '#F8FAFC', padding: '10px 12px', borderRadius: '12px' }}>
                                « {report.details} »
                              </p>
                            )}

                            <div style={{ fontSize: '11px', color: darkMode ? '#94A3B8' : '#64748B' }}>
                              Auteur du contenu : <strong>{report.reportedUserName}</strong>
                            </div>
                          </div>

                          {/* ACTIONS MODÉRATEUR */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '180px' }}>
                            {report.listingId && onDeleteListing && (
                              <button
                                onClick={() => {
                                  if (window.confirm(`Supprimer l'annonce « ${report.listingTitle || 'signalée'} » ?`)) {
                                    onDeleteListing(report.listingId);
                                    if (onResolveReport) onResolveReport(report.id, 'resolved');
                                  }
                                }}
                                style={{
                                  border: 'none', borderRadius: '10px', padding: '8px 12px',
                                  backgroundColor: '#DC2626', color: '#FFF', fontWeight: '700', fontSize: '12px', cursor: 'pointer',
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
                                    onUpdateUser(report.reportedUserId, { isShadowBanned: true });
                                    if (onResolveReport) onResolveReport(report.id, 'resolved');
                                  }
                                }}
                                style={{
                                  border: darkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid #CBD5E1', borderRadius: '10px', padding: '8px 12px',
                                  backgroundColor: darkMode ? 'rgba(15,23,42,0.6)' : '#F8FAFC', color: darkMode ? '#CBD5E1' : '#334155', fontWeight: '700', fontSize: '12px', cursor: 'pointer',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                                }}
                              >
                                <EyeOff size={13} /> Shadow-Ban Auteur
                              </button>
                            )}

                            {isPending && onResolveReport && (
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button
                                  onClick={() => onResolveReport(report.id, 'resolved')}
                                  style={{
                                    flex: 1, border: 'none', borderRadius: '10px', padding: '8px',
                                    backgroundColor: '#10B981', color: '#FFF', fontWeight: '700', fontSize: '12px', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
                                  }}
                                >
                                  <Check size={13} /> Résolu
                                </button>
                                <button
                                  onClick={() => onResolveReport(report.id, 'dismissed')}
                                  style={{
                                    flex: 1, border: darkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid #D1D5DB', borderRadius: '10px', padding: '8px',
                                    backgroundColor: 'transparent', color: darkMode ? '#94A3B8' : '#64748B', fontWeight: '700', fontSize: '12px', cursor: 'pointer'
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
                <Search size={16} style={{ position: 'absolute', left: '14px', top: '14px', color: darkMode ? '#94A3B8' : '#64748B' }} />
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
                    backgroundColor: darkMode ? 'rgba(30,41,59,0.8)' : '#FFFFFF',
                    color: darkMode ? '#F8FAFC' : '#0F172A',
                    border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #E2E8F0',
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
                        backgroundColor: darkMode ? 'rgba(30,41,59,0.8)' : '#FFFFFF',
                        border: isBanned
                          ? '1.5px solid #EF4444'
                          : isShadow
                            ? '1.5px solid #F59E0B'
                            : (darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E2E8F0'),
                        boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
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
                            <div style={{ fontSize: '14px', fontWeight: '800', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {u.name || 'Utilisateur'}
                            </div>
                            <div style={{ fontSize: '12px', fontWeight: '700', color: darkMode ? '#60A5FA' : '#04265A' }}>
                              {u.username || '@user'}
                            </div>
                            <div style={{ fontSize: '11px', color: darkMode ? '#94A3B8' : '#64748B' }}>
                              {u.email || u.phoneNumber || u.location || 'Membre Troco'}
                            </div>
                          </div>
                        </div>

                        {/* BADGES D'ÉTAT */}
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                          {isAdmin && (
                            <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: '#EFF6FF', color: '#1D4ED8', padding: '2px 8px', borderRadius: '12px' }}>
                              🛡️ Admin
                            </span>
                          )}
                          {isShadow && (
                            <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: '#FFFBEB', color: '#D97706', padding: '2px 8px', borderRadius: '12px' }}>
                              👻 Shadow-Banni
                            </span>
                          )}
                          {isBanned && (
                            <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: '#FEF2F2', color: '#DC2626', padding: '2px 8px', borderRadius: '12px' }}>
                              🚫 Banni
                            </span>
                          )}
                        </div>

                        {/* SOLDES */}
                        <div style={{ padding: '8px 10px', borderRadius: '12px', backgroundColor: darkMode ? 'rgba(15,23,42,0.5)' : '#F8FAFC', marginBottom: '12px', fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
                          <span>Solde : <strong>{(Number(u.euroBalance) || 0).toFixed(2)}€</strong></span>
                          <span>Jetons : <strong>{u.trocoTokens || 0} 🪙</strong></span>
                        </div>
                      </div>

                      {/* ACTIONS UTILISATEUR */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => onUpdateUser && onUpdateUser(uid, { isShadowBanned: !isShadow })}
                            style={{
                              flex: 1, padding: '7px 10px', borderRadius: '10px', border: 'none',
                              backgroundColor: isShadow ? '#10B981' : (darkMode ? 'rgba(245,158,11,0.2)' : '#FEF3C7'),
                              color: isShadow ? '#FFF' : '#D97706', fontSize: '11px', fontWeight: '700', cursor: 'pointer'
                            }}
                          >
                            {isShadow ? '✓ Lever Shadow-ban' : '👻 Shadow-Ban'}
                          </button>
                          <button
                            onClick={() => onUpdateUser && onUpdateUser(uid, { isBanned: !isBanned })}
                            style={{
                              flex: 1, padding: '7px 10px', borderRadius: '10px', border: 'none',
                              backgroundColor: isBanned ? '#10B981' : (darkMode ? 'rgba(239,68,68,0.2)' : '#FEE2E2'),
                              color: isBanned ? '#FFF' : '#DC2626', fontSize: '11px', fontWeight: '700', cursor: 'pointer'
                            }}
                          >
                            {isBanned ? '✓ Débannir' : '🚫 Bannir'}
                          </button>
                        </div>

                        <button
                          onClick={() => {
                            setBalanceModalUser(u);
                            setBalanceDeltaEuro('');
                            setBalanceDeltaTokens('');
                          }}
                          style={{
                            padding: '7px 10px', borderRadius: '10px', border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #E2E8F0',
                            background: 'transparent', color: darkMode ? '#CBD5E1' : '#475569', fontSize: '11px', fontWeight: '700', cursor: 'pointer'
                          }}
                        >
                          💳 Ajuster les soldes (€ / 🪙)
                        </button>
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
                <Search size={16} style={{ position: 'absolute', left: '14px', top: '14px', color: darkMode ? '#94A3B8' : '#64748B' }} />
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
                    backgroundColor: darkMode ? 'rgba(30,41,59,0.8)' : '#FFFFFF',
                    color: darkMode ? '#F8FAFC' : '#0F172A',
                    border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #E2E8F0',
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
                      backgroundColor: darkMode ? 'rgba(30,41,59,0.8)' : '#FFFFFF',
                      border: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E2E8F0',
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
                      <div style={{ fontSize: '11px', fontWeight: '700', color: darkMode ? '#60A5FA' : '#04265A', marginBottom: '4px' }}>
                        {listing.category}
                      </div>
                      <h4 style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: '800', lineHeight: 1.3 }}>
                        {listing.title}
                      </h4>
                      <p style={{ margin: '0 0 8px', fontSize: '11px', color: darkMode ? '#94A3B8' : '#64748B' }}>
                        Par <strong>{listing.author}</strong> • {listing.location || 'France'}
                      </p>
                      <div style={{ fontSize: '12px', fontWeight: '800', color: darkMode ? '#34D399' : '#059669', marginBottom: '12px' }}>
                        {listing.compensation}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      {onDeleteListing && (
                        <button
                          onClick={() => {
                            if (window.confirm(`Confirmer la suppression de l'annonce « ${listing.title} » ?`)) {
                              onDeleteListing(listing.id);
                            }
                          }}
                          style={{
                            flex: 1, padding: '8px', borderRadius: '10px', border: 'none',
                            backgroundColor: '#DC2626', color: '#FFF', fontWeight: '700', fontSize: '12px', cursor: 'pointer',
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
              <div style={{ padding: '20px', borderRadius: '20px', backgroundColor: darkMode ? 'rgba(30,41,59,0.8)' : '#FFFFFF', border: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E2E8F0', marginBottom: '20px' }}>
                <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: '800' }}>Bac à sable de modération heuristique</h3>
                <p style={{ margin: '0 0 14px', fontSize: '12px', color: darkMode ? '#94A3B8' : '#64748B' }}>
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
                    backgroundColor: darkMode ? 'rgba(15,23,42,0.8)' : '#F8FAFC',
                    color: darkMode ? '#F8FAFC' : '#0F172A',
                    border: darkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid #CBD5E1',
                    marginBottom: '16px',
                  }}
                />

                <div style={{ padding: '14px', borderRadius: '14px', backgroundColor: sandboxAnalysis.isClean ? (darkMode ? 'rgba(16,185,129,0.15)' : '#ECFDF5') : (darkMode ? 'rgba(239,68,68,0.15)' : '#FEF2F2'), border: sandboxAnalysis.isClean ? '1px solid #10B981' : '1px solid #EF4444' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: sandboxAnalysis.isClean ? '#10B981' : '#DC2626' }}>
                      {sandboxAnalysis.isClean ? '✓ Contenu Conforme' : '⚠️ Risque Détecté'}
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: sandboxAnalysis.isClean ? '#10B981' : '#DC2626' }}>
                      Score de risque : {sandboxAnalysis.score}/100
                    </span>
                  </div>

                  {sandboxAnalysis.reasons.length > 0 && (
                    <ul style={{ margin: '6px 0 0', paddingLeft: '18px', fontSize: '12px', color: darkMode ? '#FCA5A5' : '#991B1B' }}>
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
                backgroundColor: 'rgba(15, 23, 42, 0.75)',
                backdropFilter: 'blur(10px)',
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
                  backgroundColor: darkMode ? '#1E293B' : '#FFFFFF',
                  borderRadius: '24px',
                  padding: '24px',
                  color: darkMode ? '#F8FAFC' : '#0F172A',
                  border: darkMode ? '1px solid rgba(255,255,255,0.15)' : '1px solid #E2E8F0',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: '800' }}>Ajuster les soldes</h3>
                <p style={{ margin: '0 0 16px', fontSize: '12px', color: darkMode ? '#94A3B8' : '#64748B' }}>
                  Utilisateur : <strong>{balanceModalUser.name}</strong> ({balanceModalUser.username})
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>
                      Solde Euros actuel : {(Number(balanceModalUser.euroBalance) || 0).toFixed(2)}€
                    </label>
                    <input
                      type="number"
                      placeholder="Ajouter/retirer (ex: +20 ou -10)"
                      value={balanceDeltaEuro}
                      onChange={(e) => setBalanceDeltaEuro(e.target.value)}
                      style={{
                        width: '100%', padding: '10px', borderRadius: '10px', fontSize: '13px',
                        backgroundColor: darkMode ? 'rgba(15,23,42,0.8)' : '#FFFFFF', color: darkMode ? '#FFF' : '#000',
                        border: '1px solid #CBD5E1', outline: 'none'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>
                      Jetons Troco actuels : {balanceModalUser.trocoTokens || 0} 🪙
                    </label>
                    <input
                      type="number"
                      placeholder="Ajouter/retirer des jetons (ex: +5 ou -2)"
                      value={balanceDeltaTokens}
                      onChange={(e) => setBalanceDeltaTokens(e.target.value)}
                      style={{
                        width: '100%', padding: '10px', borderRadius: '10px', fontSize: '13px',
                        backgroundColor: darkMode ? 'rgba(15,23,42,0.8)' : '#FFFFFF', color: darkMode ? '#FFF' : '#000',
                        border: '1px solid #CBD5E1', outline: 'none'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => setBalanceModalUser(null)}
                    style={{ flex: 1, padding: '10px', borderRadius: '12px', border: '1px solid #CBD5E1', background: 'transparent', color: darkMode ? '#CBD5E1' : '#64748B', fontWeight: '700', cursor: 'pointer' }}
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
                    style={{ flex: 2, padding: '10px', borderRadius: '12px', border: 'none', backgroundColor: '#04265A', color: '#FFF', fontWeight: '800', cursor: 'pointer' }}
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
