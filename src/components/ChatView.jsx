import React, { useState, useEffect, useRef } from 'react';
import { Send, Phone, Video, Sparkles, Clock, CheckCircle, ChevronLeft, Globe } from 'lucide-react';

export default function ChatView({
  activeTab,
  mockChats,
  selectedChat,
  setSelectedChat,
  chatThreads,
  chatInputText,
  setChatInputText,
  handleSendMessage,
  openCounterOffer,
  startCall,
  handleAcceptDeal,
  handleDeclineDeal,
  profile,
  currentLang,
  t,
  darkMode,
  getChatMessageDisplayContent,
  getListingTitleTranslation,
  formatStatus,
  showingOriginalMessages = {},
  toggleOriginalMessage = () => {}
}) {
  const [mobileSubView, setMobileSubView] = useState('list'); // 'list' | 'room'
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatThreads, selectedChat]);

  if (activeTab !== 'chat') return null;

  const currentChatId = selectedChat ? selectedChat.id : (mockChats[0]?.id || 201);
  const activeChatObj = selectedChat || mockChats[0];
  const messages = chatThreads[currentChatId] || [];

  const handleSelectChatMobile = (chat) => {
    setSelectedChat(chat);
    if (isMobile) {
      setMobileSubView('room');
    }
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '320px 1fr',
      gap: isMobile ? '10px' : '20px',
      height: isMobile ? 'calc(100dvh - 150px)' : 'calc(100vh - 175px)',
      minHeight: isMobile ? '450px' : '520px',
      marginBottom: isMobile ? '70px' : '20px',
      width: '100%',
      maxWidth: '100%',
      overflowX: 'hidden'
    }}>
      {/* SIDEBAR DISCUSSIONS (Visible on desktop OR mobile list mode) */}
      {(!isMobile || mobileSubView === 'list') && (
        <div style={{
          backgroundColor: darkMode ? 'rgba(30, 41, 59, 0.85)' : 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          borderRadius: '24px', padding: '18px',
          border: darkMode ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(229,231,235,0.9)',
          boxShadow: '0 10px 30px rgba(15,23,42,0.06)',
          display: 'flex', flexDirection: 'column', gap: '12px',
          height: '100%'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: darkMode ? '#FFFFFF' : '#111827' }}>
              {t('discussions') || 'Discussions'}
            </h3>
            <span style={{ fontSize: '11px', fontWeight: '800', backgroundColor: darkMode ? 'rgba(4,38,90,0.6)' : '#EFF6FF', color: darkMode ? '#93C5FD' : '#04265A', padding: '4px 10px', borderRadius: '999px' }}>
              {mockChats.length} conv.
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
            {mockChats.map(chat => {
              const isSelected = activeChatObj?.id === chat.id;
              const statusText = formatStatus ? formatStatus(chat.status) : chat.status;
              const listingTitleText = getListingTitleTranslation ? getListingTitleTranslation(chat.listing, currentLang) : chat.listing;

              const thread = chatThreads && chatThreads[chat.id];
              const lastMsgObjInThread = (thread && thread.length > 0) ? thread[thread.length - 1] : null;
              
              const rawLastMsg = lastMsgObjInThread
                ? (lastMsgObjInThread.kind === 'deal' || lastMsgObjInThread.type === 'deal'
                    ? (lastMsgObjInThread.terms?.conditions || chat.lastMessage)
                    : (lastMsgObjInThread.text || chat.lastMessage))
                : chat.lastMessage;

              const lastMsgText = getChatMessageDisplayContent
                ? getChatMessageDisplayContent(lastMsgObjInThread || { text: chat.lastMessage }, currentLang, false)
                : rawLastMsg;

              return (
                <button
                  key={chat.id}
                  onClick={() => handleSelectChatMobile(chat)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '14px',
                    borderRadius: '18px', border: 'none', cursor: 'pointer', textAlign: 'left',
                    backgroundColor: isSelected ? (darkMode ? 'rgba(4,38,90,0.65)' : '#EFF6FF') : (darkMode ? 'rgba(15,23,42,0.45)' : 'rgba(248,250,252,0.8)'),
                    borderLeft: isSelected ? (darkMode ? '4px solid #60A5FA' : '4px solid #04265A') : '4px solid transparent',
                    boxShadow: isSelected ? '0 4px 14px rgba(4,38,90,0.1)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg, #04265A 0%, #14B8A6 100%)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '16px', flexShrink: 0, boxShadow: '0 4px 10px rgba(4,38,90,0.15)' }}>
                    {chat.user[0]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                      <span style={{ fontWeight: '800', fontSize: '14px', color: darkMode ? '#FFFFFF' : '#111827' }}>{chat.user}</span>
                      <span style={{ fontSize: '10px', color: darkMode ? '#94A3B8' : '#64748B', fontWeight: '700' }}>{statusText}</span>
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: '800', color: darkMode ? '#60A5FA' : '#04265A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '2px' }}>
                      {listingTitleText}
                    </div>
                    <div style={{ fontSize: '11px', color: darkMode ? '#CBD5E1' : '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {lastMsgText}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* FIL DE DISCUSSION PRINCIPAL (Visible on desktop OR mobile room mode) */}
      {(!isMobile || mobileSubView === 'room') && (
        <div style={{
          backgroundColor: darkMode ? 'rgba(30, 41, 59, 0.85)' : 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          borderRadius: '24px', padding: isMobile ? '12px 10px' : '18px',
          border: darkMode ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(229,231,235,0.9)',
          boxShadow: '0 10px 30px rgba(15,23,42,0.06)',
          display: 'flex', flexDirection: 'column',
          height: '100%',
          width: '100%',
          boxSizing: 'border-box',
          overflowX: 'hidden'
        }}>
          {/* HEADER DISCUSSION */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #E2E8F0', marginBottom: '12px', gap: '6px', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              {isMobile && (
                <button
                  onClick={() => setMobileSubView('list')}
                  className="premium-button"
                  style={{
                    border: darkMode ? '1px solid rgba(255,255,255,0.2)' : '1px solid #D1D5DB',
                    borderRadius: '12px', padding: '6px 10px',
                    backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : '#FFF',
                    color: darkMode ? '#60A5FA' : '#04265A',
                    fontWeight: '800', fontSize: '12px',
                    display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', flexShrink: 0
                  }}
                >
                  <ChevronLeft size={16} /> Liste
                </button>
              )}
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #04265A 0%, #14B8A6 100%)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '15px', flexShrink: 0 }}>
                {activeChatObj?.user[0]}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: '800', fontSize: '15px', color: darkMode ? '#FFFFFF' : '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{activeChatObj?.user}</div>
                <div style={{ fontSize: '11px', color: darkMode ? '#60A5FA' : '#04265A', fontWeight: '800', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {getListingTitleTranslation ? getListingTitleTranslation(activeChatObj?.listing, currentLang) : activeChatObj?.listing}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
              <button
                onClick={() => startCall('audio')}
                title="Appel audio HD"
                style={{ border: 'none', borderRadius: '12px', width: '36px', height: '36px', backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : '#F1F5F9', color: darkMode ? '#93C5FD' : '#04265A', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Phone size={16} />
              </button>
              <button
                onClick={() => startCall('video')}
                title="Appel vidéo HD"
                style={{ border: 'none', borderRadius: '12px', width: '36px', height: '36px', backgroundColor: darkMode ? 'rgba(96,165,250,0.2)' : '#EFF6FF', color: darkMode ? '#60A5FA' : '#04265A', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Video size={16} />
              </button>
              <button
                onClick={openCounterOffer}
                className="premium-button"
                style={{ border: 'none', borderRadius: '12px', padding: '8px 12px', backgroundColor: darkMode ? '#60A5FA' : '#04265A', color: darkMode ? '#0F172A' : '#FFF', fontWeight: '800', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', boxShadow: '0 4px 12px rgba(4,38,90,0.15)' }}
              >
                <Sparkles size={13} /> {t('counterOffer') || (isMobile ? 'Contre-offre' : 'Contre-proposition')}
              </button>
            </div>
          </div>

          {/* MESSAGES & DEALS CONTAINER */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', paddingRight: '4px', paddingBottom: '10px' }}>
            {messages.map(msg => {
              const isMsgOriginal = !!showingOriginalMessages[msg.id];
              const translatedText = getChatMessageDisplayContent
                ? getChatMessageDisplayContent(msg, currentLang, isMsgOriginal)
                : (msg.text || '');

              if (msg.type === 'deal' || msg.kind === 'deal') {
                const { terms, status, sender } = msg;
                const isMine = sender === 'me';
                const isIncoming = sender === 'them';
                const dealConditionsText = getChatMessageDisplayContent
                  ? getChatMessageDisplayContent({ text: terms.conditions }, currentLang, isMsgOriginal)
                  : terms.conditions;

                return (
                  <div key={msg.id} style={{
                    width: '100%',
                    border: darkMode ? '1px solid rgba(20,184,166,0.4)' : '1px solid #99F6E4',
                    borderRadius: '18px',
                    padding: '16px',
                    backgroundColor: darkMode ? 'rgba(15,23,42,0.85)' : '#F0FDFA',
                    boxShadow: '0 8px 24px rgba(15,23,42,0.06)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '800', color: darkMode ? '#93C5FD' : '#04265A' }}>
                        <Sparkles size={15} color={darkMode ? '#60A5FA' : '#04265A'} />
                        {isMine ? (t('myDealProposal') || 'Ma proposition de Deal') : (t('receivedDealProposal') || 'Proposition de Deal reçue')}
                      </div>
                      {status === 'pending' && isIncoming && (
                        <span style={{ fontSize: '11px', fontWeight: '800', backgroundColor: darkMode ? 'rgba(245,158,11,0.2)' : '#FFFBEB', color: darkMode ? '#FBBF24' : '#D97706', padding: '4px 10px', borderRadius: '999px', border: darkMode ? '1px solid rgba(245,158,11,0.4)' : '1px solid #FDE68A' }}>
                          ⚡ {t('waitingYourResponse') || 'En attente de ta réponse'}
                        </span>
                      )}
                      {status === 'pending' && isMine && (
                        <span style={{ fontSize: '11px', fontWeight: '800', backgroundColor: darkMode ? 'rgba(148,163,184,0.2)' : '#F3F4F6', color: darkMode ? '#CBD5E1' : '#6B7280', padding: '4px 10px', borderRadius: '999px' }}>
                          {t('waitingResponse') || 'En attente de réponse'}
                        </span>
                      )}
                      {(status === 'confirmed' || status === 'accepted') && (
                        <span style={{ fontSize: '11px', fontWeight: '800', backgroundColor: darkMode ? 'rgba(16,185,129,0.2)' : '#D1FAE5', color: darkMode ? '#34D399' : '#059669', padding: '4px 10px', borderRadius: '999px', border: darkMode ? '1px solid rgba(16,185,129,0.4)' : '1px solid #A7F3D0' }}>
                          ✓ {t('dealValidatedConfirmed') || 'Deal Validé & Confirmé'}
                        </span>
                      )}
                      {status === 'declined' && (
                        <span style={{ fontSize: '11px', fontWeight: '800', backgroundColor: darkMode ? 'rgba(239,68,68,0.2)' : '#FEE2E2', color: darkMode ? '#F87171' : '#DC2626', padding: '4px 10px', borderRadius: '999px' }}>
                          {t('declined') || 'Refusé'}
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '13px', color: darkMode ? '#E2E8F0' : '#334155', marginBottom: '8px', lineHeight: 1.5, fontWeight: '500' }}>
                      {dealConditionsText}
                    </div>
                    {currentLang !== 'FR' && (
                      <button
                        onClick={() => toggleOriginalMessage(msg.id)}
                        className="premium-button"
                        style={{
                          border: 'none', background: 'none', cursor: 'pointer',
                          color: darkMode ? '#60A5FA' : '#04265A', fontSize: '11px',
                          fontWeight: '800', display: 'inline-flex', alignItems: 'center',
                          gap: '4px', marginBottom: '10px', padding: 0
                        }}
                      >
                        <Globe size={11} style={{ flexShrink: 0 }} /> <span>{isMsgOriginal ? t('showTranslation') : t('showOriginal')}</span>
                      </button>
                    )}

                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                      {terms.euroAmount > 0 && <span style={{ backgroundColor: darkMode ? 'rgba(30,41,59,0.9)' : '#FFF', border: '1px solid #A7F3D0', color: darkMode ? '#60A5FA' : '#1D4ED8', borderRadius: '999px', padding: '5px 12px', fontSize: '12px', fontWeight: '800' }}>💶 {terms.euroAmount}€</span>}
                      {terms.trocoTokens > 0 && <span style={{ backgroundColor: darkMode ? 'rgba(30,41,59,0.9)' : '#FFF', border: '1px solid #A7F3D0', color: darkMode ? '#60A5FA' : '#1D4ED8', borderRadius: '999px', padding: '5px 12px', fontSize: '12px', fontWeight: '800' }}>🪙 {terms.trocoTokens} {t('tokens') || 'Jeton(s)'}</span>}
                      {terms.euroAmount === 0 && terms.trocoTokens === 0 && <span style={{ backgroundColor: darkMode ? 'rgba(30,41,59,0.9)' : '#FFF', border: '1px solid #A7F3D0', color: darkMode ? '#60A5FA' : '#1D4ED8', borderRadius: '999px', padding: '5px 12px', fontSize: '12px', fontWeight: '800' }}>🤝 {t('directSwap') || 'Troc direct'}</span>}
                    </div>

                    {status === 'pending' && isIncoming && (
                      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                        <button
                          onClick={() => handleAcceptDeal(currentChatId, msg.id, terms)}
                          className="premium-button"
                          style={{
                            flex: 1, border: 'none', borderRadius: '12px', padding: '11px',
                            backgroundColor: darkMode ? '#60A5FA' : '#04265A',
                            color: darkMode ? '#0F172A' : '#FFF',
                            fontSize: '13px', fontWeight: '800', cursor: 'pointer',
                            boxShadow: '0 4px 14px rgba(4,38,90,0.2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                          }}
                        >
                          ✓ {t('acceptValidateDeal') || 'Accepter & Valider le Deal'}
                        </button>
                        <button
                          onClick={() => handleDeclineDeal(currentChatId, msg.id)}
                          className="premium-button"
                          style={{
                            flex: 1, border: darkMode ? '1px solid rgba(255,255,255,0.2)' : '1px solid #D1D5DB',
                            borderRadius: '12px', padding: '11px',
                            backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : '#FFF',
                            color: darkMode ? '#F8FAFC' : '#6B7280',
                            fontSize: '13px', fontWeight: '800', cursor: 'pointer'
                          }}
                        >
                          ✕ {t('decline') || 'Refuser'}
                        </button>
                      </div>
                    )}

                    {status === 'pending' && isMine && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: darkMode ? 'rgba(15,23,42,0.5)' : '#F8FAFC', border: darkMode ? '1px dashed rgba(255,255,255,0.2)' : '1px dashed #E2E8F0', color: darkMode ? '#CBD5E1' : '#64748B', borderRadius: '12px', padding: '10px 14px', fontSize: '12px', fontWeight: '700' }}>
                        <Clock size={14} /> {t('waitingInterlocutorResponse') || "En attente de la réponse de l'interlocuteur..."}
                      </div>
                    )}

                    {(status === 'confirmed' || status === 'accepted') && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: darkMode ? 'rgba(16,185,129,0.2)' : '#D1FAE5', color: darkMode ? '#34D399' : '#059669', borderRadius: '12px', padding: '10px 14px', fontSize: '12px', fontWeight: '800' }}>
                        <CheckCircle size={16} /> {t('dealConfirmedLocked') || 'Deal confirmé et verrouillé avec succès.'}
                      </div>
                    )}
                  </div>
                );
              }

              const isMe = msg.sender === 'me';
              return (
                <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '82%', padding: '12px 16px', borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    backgroundColor: isMe ? (darkMode ? '#60A5FA' : '#04265A') : (darkMode ? 'rgba(15,23,42,0.8)' : '#F1F5F9'),
                    color: isMe ? (darkMode ? '#0F172A' : '#FFF') : (darkMode ? '#F8FAFC' : '#1E293B'),
                    fontWeight: isMe ? '700' : '400',
                    fontSize: '14px', lineHeight: 1.5,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                  }}>
                    {translatedText}
                  </div>
                  {currentLang !== 'FR' && (
                    <button
                      onClick={() => toggleOriginalMessage(msg.id)}
                      className="premium-button"
                      style={{
                        border: 'none', background: 'none', cursor: 'pointer',
                        color: isMe ? (darkMode ? '#60A5FA' : '#04265A') : (darkMode ? '#94A3B8' : '#64748B'),
                        fontSize: '10px', fontWeight: '800', display: 'inline-flex',
                        alignItems: 'center', gap: '3px', marginTop: '3px',
                        padding: '2px 4px'
                      }}
                    >
                      {isMsgOriginal ? t('showTranslation') : t('showOriginal')}
                    </button>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* INPUT SAISIE MESSAGE (POSITIONNÉ PROPREMENT AU-DESSUS DE LA NAV-BAR MOBILE) */}
          <div style={{
            display: 'flex', gap: '10px', paddingTop: '14px', marginTop: 'auto',
            borderTop: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #E2E8F0',
            backgroundColor: darkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255,255,255,0.95)',
            borderRadius: '16px', padding: '10px',
            boxShadow: '0 -4px 16px rgba(0,0,0,0.04)',
            zIndex: 10
          }}>
            <input
              type="text"
              value={chatInputText}
              onChange={(e) => setChatInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder={t('typeYourMessage') || t('writeToInterlocutor') || 'Écris ton message...'}
              style={{
                flex: 1, padding: '12px 16px', borderRadius: '16px',
                border: darkMode ? '1px solid rgba(255,255,255,0.2)' : '1px solid #D1D5DB',
                backgroundColor: darkMode ? 'rgba(15,23,42,0.8)' : '#FFF',
                color: darkMode ? '#FFF' : '#111827', fontSize: '14px', outline: 'none'
              }}
            />
            <button
              onClick={handleSendMessage}
              className="premium-button"
              style={{
                border: 'none', borderRadius: '16px', width: '48px', height: '48px',
                backgroundColor: darkMode ? '#60A5FA' : '#04265A',
                color: darkMode ? '#0F172A' : '#FFF', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(4,38,90,0.2)', flexShrink: 0
              }}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
