import logger from '../utils/logger';
import React, { useState, useEffect } from 'react';
import { Sparkles, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { paymentService } from '../services/paymentService';
import { useLanguage } from '../contexts/LanguageContext';
import { subscribeTranslations } from '../utils/translator';
import { parseAndTranslateDynamicText } from '../utils/dynamicTranslation';

const SPONSORED_PARTNERS = [
  {
    id: 'sponsor-brico-1',
    sponsorName: 'Atelier & Outillage Pro',
    image: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=600&q=80',
    author: 'Atelier Pro Partenaire',
    translations: {
      FR: {
        badge: '🌟 Partenaire Certifié',
        category: 'Bricolage & Équipement',
        title: "Location & Prêt d'outillage électroportatif pro",
        description: "Bénéficiez de 15% de réduction et de la caution offerte sur tout l'outillage haut de gamme certifié pour les membres Troco.",
        perk: '-15% Remise Partenaire',
        ctaText: 'Découvrir le matériel',
      },
      EN: {
        badge: '🌟 Certified Partner',
        category: 'DIY & Equipment',
        title: 'Professional Power Tool Rental & Loan',
        description: 'Get 15% off and free deposit on all certified premium power tools for Troco members.',
        perk: '-15% Partner Discount',
        ctaText: 'Discover Equipment',
      },
      ES: {
        badge: '🌟 Socio Certificado',
        category: 'Bricolaje y Equipamiento',
        title: 'Alquiler y préstamo de herramientas eléctricas pro',
        description: 'Disfruta de un 15% de descuento y fianza gratuita en todas las herramientas prémium certificadas para miembros Troco.',
        perk: '-15% Descuento de Socio',
        ctaText: 'Descubrir el material',
      },
      IT: {
        badge: '🌟 Partner Certificato',
        category: 'Bricolage e Attrezzature',
        title: 'Noleggio e prestito di elettroutensili professionali',
        description: 'Approfitta del 15% di sconto e deposito gratuito su tutti gli elettroutensili professionali certificati per i membri Troco.',
        perk: '-15% Sconto Partner',
        ctaText: 'Scopri le attrezzature',
      },
      DE: {
        badge: '🌟 Zertifizierter Partner',
        category: 'Heimwerken & Ausrüstung',
        title: 'Verleih & Miete von Profi-Elektrowerkzeugen',
        description: '15% Rabatt und erlassene Kaution auf alle zertifizierten Profi-Werkzeuge für Troco-Mitglieder.',
        perk: '-15% Partner-Rabatt',
        ctaText: 'Ausrüstung entdecken',
      },
      JA: {
        badge: '🌟 認定パートナー',
        category: 'DIY・工具・機材',
        title: 'プロ用電動工具のレンタル＆貸出',
        description: 'Troco会員限定：認定ハイエンド電動工具の保証金無料＆15%割引特典をご利用いただけます。',
        perk: '-15% パートナー割引',
        ctaText: '機材を見る',
      },
      ZH: {
        badge: '🌟 官方认证合作伙伴',
        category: '家装与专业工具',
        title: '专业电动工具租赁与出借',
        description: 'Troco 会员专享：全场认证高端电动工具享 85 折优惠并免收押金。',
        perk: '立减 15% 专享折扣',
        ctaText: '查看所有设备',
      },
    }
  },
  {
    id: 'sponsor-cowork-2',
    sponsorName: 'Espace Coworking Stillpoint',
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80',
    author: 'Stillpoint Hub',
    translations: {
      FR: {
        badge: '✨ Tiers-Lieu Partenaire',
        category: 'Espaces & Bureaux',
        title: "Journée d'essai offerte en espace de travail partagé",
        description: "Accédez à des salles de réunion insonorisées, connexion fibre 1Gb/s et café de spécialité offert pour vos sessions de troc.",
        perk: '1 Journée Offerte',
        ctaText: 'Réserver un pass',
      },
      EN: {
        badge: '✨ Partner Workspace',
        category: 'Spaces & Offices',
        title: 'Free trial day in shared coworking space',
        description: 'Access soundproof meeting rooms, 1Gbps fiber internet, and free specialty coffee for your barter sessions.',
        perk: '1 Free Day',
        ctaText: 'Book a Pass',
      },
      ES: {
        badge: '✨ Espacio Socio',
        category: 'Espacios y Oficinas',
        title: 'Día de prueba gratuito en espacio de coworking compartido',
        description: 'Acceso a salas de reuniones insonorizadas, fibra de 1Gb/s y café de especialidad gratuito para tus trueques.',
        perk: '1 Día Gratis',
        ctaText: 'Reservar un pase',
      },
      IT: {
        badge: '✨ Spazio Partner',
        category: 'Spazi e Uffici',
        title: 'Giornata di prova gratuita in spazio di coworking condiviso',
        description: 'Accedi a sale riunioni insonorizzate, connessione fibra a 1Gb/s e caffè speciale offerto per le tue sessioni di baratto.',
        perk: '1 Giorno Offerto',
        ctaText: 'Prenota un pass',
      },
      DE: {
        badge: '✨ Partner-Coworking',
        category: 'Räume & Büros',
        title: 'Kostenloser Probetag im Coworking Space',
        description: 'Zugang zu schallisolierten Besprechungsräumen, 1-Gbit/s-Glasfaser und Spezialitätenkaffee für Ihre Tausch-Sessions.',
        perk: '1 Tag Gratis',
        ctaText: 'Pass buchen',
      },
      JA: {
        badge: '✨ 提携コワーキング',
        category: 'コワーキング・オフィス',
        title: '共有コワーキングスペース1日無料体験',
        description: '防音会議室、1Gb/s光回線、バリスタ監修スペシャルティコーヒーをご利用いただけます。',
        perk: '1日無料',
        ctaText: 'パスを予約する',
      },
      ZH: {
        badge: '✨ 合作办公社区',
        category: '空间与共享办公',
        title: '共享联合办公空间免费试用体验日',
        description: '畅享隔音会议室、1Gb/s 高速光纤宽带以及免费精品现磨咖啡。',
        perk: '免费赠送 1 天',
        ctaText: '预约通行证',
      },
    }
  },
  {
    id: 'sponsor-audio-3',
    sponsorName: 'Studio Podcast & Création',
    image: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=600&q=80',
    author: 'Studio TrocoLab',
    translations: {
      FR: {
        badge: '🎙️ Studio Partenaire',
        category: 'Audiovisuel & Musique',
        title: "Studio d'enregistrement & montage vidéo disponible",
        description: 'Matériel Shure SM7B, caméras 4K et cabine traitée acoustiquement pour vos interviews et créations de contenu.',
        perk: 'Troco Plus : -25%',
        ctaText: 'Voir les disponibilités',
      },
      EN: {
        badge: '🎙️ Partner Studio',
        category: 'Audiovisual & Music',
        title: 'Recording & Video Editing Studio Available',
        description: 'Shure SM7B mics, 4K cameras, and acoustically treated booth for your interviews and content creation.',
        perk: 'Troco Plus: -25%',
        ctaText: 'View Availability',
      },
      ES: {
        badge: '🎙️ Estudio Socio',
        category: 'Audiovisual y Música',
        title: 'Estudio de grabación y montaje de vídeo disponible',
        description: 'Micrófonos Shure SM7B, cámaras 4K y cabina insonorizada para tus entrevistas y creación de contenido.',
        perk: 'Troco Plus: -25%',
        ctaText: 'Ver disponibilidad',
      },
      IT: {
        badge: '🎙️ Studio Partner',
        category: 'Audiovisivo e Musica',
        title: 'Studio di registrazione e montaggio video disponibile',
        description: 'Microfoni Shure SM7B, telecamere 4K e cabina insonorizzata per le tue interviste e creazioni di contenuti.',
        perk: 'Troco Plus: -25%',
        ctaText: 'Vedi disponibilità',
      },
      DE: {
        badge: '🎙️ Partner-Tonstudio',
        category: 'Audiovisuell & Musik',
        title: 'Tonstudio & Videoschnittplatz verfügbar',
        description: 'Shure SM7B Mikrofone, 4K-Kameras und akustisch behandelte Kabine für Ihre Interviews und Video-Kreationen.',
        perk: 'Troco Plus: -25%',
        ctaText: 'Verfügbarkeit prüfen',
      },
      JA: {
        badge: '🎙️ 提携スタジオ',
        category: '映像・音響・音楽',
        title: '録音＆動画編集スタジオ利用可能',
        description: 'Shure SM7Bマイク、4Kカメラ、防音録音ブースでインタビューやコンテンツ制作を強力サポート。',
        perk: 'Troco Plus：25%割引',
        ctaText: '空き状況を確認する',
      },
      ZH: {
        badge: '🎙️ 官方合作录音棚',
        category: '影音与音乐制作',
        title: '专业录音室与视频剪辑机房对外开放',
        description: '配备舒尔 SM7B 麦克风、4K 摄像机及声学降噪录音棚，助您打造高品质访谈与内容。',
        perk: 'Troco Plus：立享 75 折',
        ctaText: '查看档期与可用时间',
      },
    }
  },
  {
    id: 'sponsor-mentor-4',
    sponsorName: 'Académie Freelance & Mentorat',
    image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=600&q=80',
    author: 'Mentorat Club',
    translations: {
      FR: {
        badge: '🚀 Formation Partenaire',
        category: 'Mentorat & Conseil',
        title: 'Audit de portfolio & stratégie de compétences',
        description: 'Faites relire votre profil par des experts pour maximiser vos échanges de compétences et collaborations sur la plateforme.',
        perk: 'Audit Express Offert',
        ctaText: 'Demander un audit',
      },
      EN: {
        badge: '🚀 Partner Training',
        category: 'Mentorship & Consulting',
        title: 'Portfolio Review & Skills Strategy',
        description: 'Have your profile reviewed by experts to maximize skill exchanges and collaborations on the platform.',
        perk: 'Free Express Review',
        ctaText: 'Request Review',
      },
      ES: {
        badge: '🚀 Formación Socia',
        category: 'Mentoría y Consultoría',
        title: 'Auditoría de portafolio y estrategia de competencias',
        description: 'Haz revisar tu perfil por expertos para maximizar tus intercambios de habilidades y colaboraciones en la plataforma.',
        perk: 'Auditoría exprés gratis',
        ctaText: 'Solicitar una auditoría',
      },
      IT: {
        badge: '🚀 Formazione Partner',
        category: 'Mentoring e Consulenza',
        title: 'Audit del portfolio e strategia delle competenze',
        description: 'Fai revisionare il tuo profilo da esperti per massimizzare i tuoi scambi di competenze e collaborazioni sulla piattaforma.',
        perk: 'Audit Express Offerto',
        ctaText: 'Richiedi un audit',
      },
      DE: {
        badge: '🚀 Partner-Training',
        category: 'Mentoring & Beratung',
        title: 'Portfolio-Check & Kompetenz-Strategie',
        description: 'Lassen Sie Ihr Profil von Experten prüfen, um Ihre Tauschmöglichkeiten und Kooperationen zu maximieren.',
        perk: 'Kostenloser Express-Check',
        ctaText: 'Check anfordern',
      },
      JA: {
        badge: '🚀 提携アカデミー',
        category: 'メンター・コンサルティング',
        title: 'ポートフォリオ診断＆スキル戦略相談',
        description: '専門家によるプロフィールレビューで、スキル交換やコラボレーションの成果を最大化しましょう。',
        perk: '無料スピード診断',
        ctaText: '診断を申し込む',
      },
      ZH: {
        badge: '🚀 合作培训机构',
        category: '技能导师与职业咨询',
        title: '作品集深度评估与技能交换策略指导',
        description: '由行业专家为您的个人主页提供专业评估，全面提升技能互换与合作成功率。',
        perk: '免费极速诊断',
        ctaText: '立即申请诊断',
      },
    }
  }
];

const UI_STRINGS = {
  sponsoredTag: {
    FR: 'Sponsorisé',
    EN: 'Sponsored',
    ES: 'Patrocinado',
    IT: 'Sponsorizzato',
    DE: 'Gesponsert',
    JA: 'スポンサー',
    ZH: '赞助推广'
  },
  certifiedPartnerBadge: {
    FR: 'Partenaire certifié',
    EN: 'Certified partner',
    ES: 'Socio certificado',
    IT: 'Partner certificato',
    DE: 'Zertifizierter Partner',
    JA: '認定パートナー',
    ZH: '官方认证伙伴'
  },
  bonusClaimed: {
    FR: '✓ Bonus 2.00 € réclamé !',
    EN: '✓ €2.00 Bonus Claimed!',
    ES: '✓ ¡Bono de 2.00 € reclamado!',
    IT: '✓ Bonus di 2,00 € riscattato!',
    DE: '✓ 2,00 € Bonus eingelöst!',
    JA: '✓ 2.00€ボーナス獲得済み！',
    ZH: '✓ 2.00 欧元奖励已领取！'
  },
  claiming: {
    FR: 'Vérification du bonus...',
    EN: 'Checking bonus...',
    ES: 'Verificando bono...',
    IT: 'Verifica del bonus in corso...',
    DE: 'Bonus wird überprüft...',
    JA: 'ボーナスを確認中...',
    ZH: '正在核销奖励...'
  },
  claimCta: {
    FR: '🎁 Réclamer mon bonus de bienvenue (+2.00 €)',
    EN: '🎁 Claim welcome bonus (+€2.00)',
    ES: '🎁 Reclamar mi bono de bienvenida (+2.00 €)',
    IT: '🎁 Riscatta il mio bonus di benvenuto (+2,00 €)',
    DE: '🎁 Willkommensbonus einlösen (+2,00 €)',
    JA: '🎁 ウェルカムボーナスを受け取る（+2.00 €）',
    ZH: '🎁 领取新手欢迎礼金 (+2.00 欧元)'
  }
};

export default function SponsoredFeedCard({
  index = 0,
  darkMode = false,
  currentLang: propLang = null,
  t: propT = null,
  onOpenNotification = null,
  onClaimBonus = null
}) {
  const { currentLang: ctxLang, t: ctxT } = useLanguage();
  const currentLang = (propLang || ctxLang || 'FR').toUpperCase();
  const t = typeof propT === 'function' ? propT : (ctxT || ((k, fallback) => fallback || k));

  const [, setTransTick] = useState(0);

  useEffect(() => {
    return subscribeTranslations(() => {
      setTransTick(t => t + 1);
    });
  }, []);

  const partner = SPONSORED_PARTNERS[index % SPONSORED_PARTNERS.length];
  const langPack = partner.translations?.[currentLang] || partner.translations?.FR || {};

  const badgeText = langPack.badge || parseAndTranslateDynamicText(partner.translations?.FR?.badge || '', currentLang);
  const categoryText = langPack.category || parseAndTranslateDynamicText(partner.translations?.FR?.category || '', currentLang);
  const titleText = langPack.title || parseAndTranslateDynamicText(partner.translations?.FR?.title || '', currentLang);
  const descriptionText = langPack.description || parseAndTranslateDynamicText(partner.translations?.FR?.description || '', currentLang);
  const perkText = langPack.perk || parseAndTranslateDynamicText(partner.translations?.FR?.perk || '', currentLang);
  const ctaText = langPack.ctaText || parseAndTranslateDynamicText(partner.translations?.FR?.ctaText || '', currentLang);

  const sponsoredTag = UI_STRINGS.sponsoredTag[currentLang] || t('sponsored', 'Sponsorisé');
  const certifiedPartnerText = UI_STRINGS.certifiedPartnerBadge[currentLang] || t('certifiedPartner', 'Partenaire certifié');
  const bonusClaimedText = UI_STRINGS.bonusClaimed[currentLang] || '✓ Bonus 2.00 € réclamé !';
  const claimingText = UI_STRINGS.claiming[currentLang] || 'Vérification du bonus...';
  const claimCtaText = UI_STRINGS.claimCta[currentLang] || '🎁 Réclamer mon bonus de bienvenue (+2.00 €)';

  const [isClaiming, setIsClaiming] = useState(false);
  const [bonusClaimed, setBonusClaimed] = useState(false);

  const handleClaim = async (e) => {
    e.stopPropagation();
    if (isClaiming || bonusClaimed) return;
    setIsClaiming(true);
    try {
      const res = await paymentService.claimBonus({
        campaignId: partner.id,
        amount: 2.0,
        label: `Bonus Partenaire : ${partner.sponsorName}`,
      });
      setBonusClaimed(true);
      if (onClaimBonus) {
        onClaimBonus(res);
      }
      if (onOpenNotification) {
        onOpenNotification(`🎉 Félicitations ! Bonus de 2.00 € crédité sur votre compte.`);
      }
    } catch (err) {
      logger.error('[SponsoredFeedCard] Bonus claim error:', err);
      const errMsg = err?.message || 'Impossible de réclamer ce bonus (peut-être déjà réclamé).';
      if (onOpenNotification) {
        onOpenNotification(`⚠️ ${errMsg}`);
      } else {
        alert(errMsg);
      }
    } finally {
      setIsClaiming(false);
    }
  };

  const handleAction = (e) => {
    e.stopPropagation();
    if (onOpenNotification) {
      onOpenNotification(`🏷️ Offre Partenaire "${partner.sponsorName}" activée ! Utilisez le code ${perkText} lors de votre échange.`);
    } else {
      alert(`🏷️ Offre Partenaire "${partner.sponsorName}" activée ! Code : ${perkText}`);
    }
  };

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20, scale: 0.98 },
        show: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: {
            duration: 0.35,
            ease: [0.22, 1, 0.36, 1],
          },
        },
      }}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.05 }}
      className="feed-card-item sponsored-card premium-card"
      onClick={handleAction}
      style={{
        contentVisibility: 'auto',
        containIntrinsicSize: '0 420px',
        backgroundColor: 'var(--bg-card)',
        border: '1.5px solid var(--accent-primary)',
        borderRadius: '20px',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-card)',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        transition: 'transform 0.35s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.3s ease',
        boxSizing: 'border-box',
        width: '100%',
        height: '100%'
      }}
    >
      {/* BANDEAU SUPÉRIEUR SPONSOR */}
      <div style={{
        position: 'relative',
        height: '180px',
        width: '100%',
        overflow: 'hidden',
        backgroundColor: 'var(--bg-subtle)'
      }}>
        <img
          src={partner.image}
          alt={titleText}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'transform 0.5s ease'
          }}
        />
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.1) 60%, transparent 100%)'
        }} />

        {/* BADGES HAUT */}
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          right: '10px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{
            fontSize: '10px',
            fontWeight: '800',
            backgroundColor: 'rgba(26, 22, 19, 0.95)',
            color: 'var(--accent-primary)',
            padding: '4px 10px',
            borderRadius: '999px',
            border: '1px solid var(--accent-primary)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
          }}>
            {badgeText}
          </span>
          <span style={{
            fontSize: '9px',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            backgroundColor: 'rgba(26, 22, 19, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#FFFFFF',
            padding: '3px 8px',
            borderRadius: '6px'
          }}>
            {sponsoredTag}
          </span>
        </div>

        {/* TAG AVANTAGE BAS DE PHOTO */}
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          backgroundColor: 'rgba(220, 38, 38, 0.95)',
          color: '#FFFFFF',
          padding: '4px 10px',
          borderRadius: '8px',
          fontSize: '11px',
          fontWeight: '800',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          letterSpacing: '0.02em'
        }}>
          {perkText}
        </div>
      </div>

      {/* CONTENU SPONSOR */}
      <div style={{
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        flex: 1,
        justifyContent: 'space-between'
      }}>
        <div>
          <div style={{
            fontSize: '11px',
            fontWeight: '700',
            color: 'var(--accent-primary)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '4px'
          }}>
            {categoryText}
          </div>
          <h3 style={{
            margin: '0 0 6px 0',
            fontSize: '15px',
            fontWeight: '700',
            color: 'var(--text-main)',
            lineHeight: 1.3
          }}>
            {titleText}
          </h3>
          <p style={{
            margin: 0,
            fontSize: '12px',
            color: 'var(--text-secondary)',
            lineHeight: 1.4,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}>
            {descriptionText}
          </p>
        </div>

        {/* METADONNÉES PARTENAIRE */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: '8px',
          borderTop: '1px solid var(--border-color)',
          fontSize: '11px',
          color: 'var(--text-secondary)'
        }}>
          <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>{partner.author}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--accent-primary)', fontWeight: '600' }}>
            {certifiedPartnerText}
          </span>
        </div>

        {/* BOUTON ACTION PARTENAIRE */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            type="button"
            onClick={handleAction}
            className="premium-btn-accent"
            style={{
              padding: '8px 14px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: 'var(--shadow-accent)',
              background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)',
              color: '#FFFFFF',
              border: 'none',
              cursor: 'pointer',
              width: '100%'
            }}
          >
            <Sparkles size={13} />
            <span>{ctaText}</span>
            <ExternalLink size={12} />
          </button>

          <button
            type="button"
            onClick={handleClaim}
            disabled={isClaiming || bonusClaimed}
            style={{
              padding: '6px 12px',
              borderRadius: '10px',
              fontSize: '11px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              background: bonusClaimed ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.1)',
              color: bonusClaimed ? '#10b981' : 'var(--accent-primary)',
              border: bonusClaimed ? '1px solid #10b981' : '1px dashed var(--accent-primary)',
              cursor: (isClaiming || bonusClaimed) ? 'default' : 'pointer',
              width: '100%',
              transition: 'all 0.2s ease',
            }}
          >
            {bonusClaimed ? (
              <span>{bonusClaimedText}</span>
            ) : isClaiming ? (
              <span>{claimingText}</span>
            ) : (
              <span>{claimCtaText}</span>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
