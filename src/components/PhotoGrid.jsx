import React from 'react';
import { Plus, X, Image as ImageIcon, Sparkles } from 'lucide-react';

export default function PhotoGrid({
  photos = [],
  onAddPhoto,
  onRemovePhoto,
  onAutoGenerate,
  maxPhotos = 8,
  darkMode = false,
  t = (k) => k,
  currentLang = 'FR',
}) {
  const photoList = Array.isArray(photos) ? photos : [];
  const count = photoList.length;
  const isPaidPackActive = count > 4;

  return (
    <div style={{
      padding: '18px',
      borderRadius: '20px',
      backgroundColor: 'var(--bg-card)',
      border: '1px solid var(--border-color)',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
    }}>
      {/* HEADER SECTION */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ImageIcon size={18} color="var(--accent-primary)" />
            <h4 className="font-editorial-heading" style={{ margin: 0, fontSize: '17px', fontWeight: '600', color: 'var(--text-main)' }}>
              {currentLang === 'FR' ? 'Photos de l’annonce' : 'Listing photos'} ({count}/{maxPhotos})
            </h4>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--text-secondary)' }}>
            {currentLang === 'FR'
              ? '4 photos gratuites incluses • Jusqu’à 8 photos pour maximiser vos contacts'
              : '4 free photos included • Up to 8 photos to maximize your reach'}
          </p>
        </div>

        {onAutoGenerate && (
          <button
            type="button"
            onClick={onAutoGenerate}
            className="premium-button"
            style={{
              border: 'none',
              borderRadius: '12px',
              padding: '7px 12px',
              backgroundColor: 'var(--bg-subtle)',
              color: 'var(--accent-primary)',
              fontSize: '11px',
              fontWeight: '800',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <Sparkles size={13} /> {t('autoGenerateVisuals') || 'Générer photos'}
          </button>
        )}
      </div>

      {/* BADGE PACK PHOTOS PAYANT (> 4 PHOTOS) */}
      {isPaidPackActive && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          borderRadius: '14px',
          backgroundColor: 'var(--bg-subtle)',
          border: '1px solid var(--accent-warning)',
          color: 'var(--accent-warning)',
          fontSize: '12px',
          fontWeight: '700',
          animation: 'fadeSlideUp 0.3s ease both',
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            📸 <strong>Pack Photos Supplémentaires</strong> ({count - 4} photo{count - 4 > 1 ? 's' : ''} au-delà du quota gratuit)
          </span>
          <span style={{
            backgroundColor: 'var(--accent-warning)',
            color: '#FFFFFF',
            padding: '4px 10px',
            borderRadius: '999px',
            fontSize: '11px',
            fontWeight: '800',
          }}>
            +1,99 €
          </span>
        </div>
      )}

      {/* GRILLE RESPONSIVE : 4 COLONNES DESKTOP / 2 MOBILE, RATIO 1/1 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
        gap: '12px',
      }}>
        {photoList.map((src, idx) => (
          <div
            key={idx}
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '1 / 1',
              borderRadius: '16px',
              overflow: 'hidden',
              border: idx === 0
                ? '2px solid var(--accent-primary)'
                : '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-card)',
              backgroundColor: 'var(--bg-subtle)',
            }}
          >
            <img
              src={src}
              alt={`Aperçu ${idx + 1}`}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />

            {/* BADGE PHOTO PRINCIPALE */}
            {idx === 0 && (
              <span style={{
                position: 'absolute',
                bottom: '6px',
                left: '6px',
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)',
                color: '#FFF',
                fontSize: '10px',
                fontWeight: '800',
                padding: '3px 8px',
                borderRadius: '8px',
                zIndex: 2,
              }}>
                ⭐ Principale
              </span>
            )}

            {/* BADGE COMPTEUR / QUOTA */}
            <span style={{
              position: 'absolute',
              top: '6px',
              left: '6px',
              backgroundColor: idx < 4 ? 'rgba(0, 0, 0, 0.75)' : 'var(--accent-warning)',
              color: '#FFF',
              fontSize: '10px',
              fontWeight: '800',
              padding: '2px 7px',
              borderRadius: '6px',
              zIndex: 2,
            }}>
              {idx < 4 ? `Gratuite` : `Pack +1,99€`}
            </span>

            {/* BOUTON SUPPRIMER CROIX ROUGE */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onRemovePhoto) onRemovePhoto(idx);
              }}
              title="Supprimer cette photo"
              style={{
                position: 'absolute',
                top: '6px',
                right: '6px',
                border: 'none',
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent-danger)',
                color: '#FFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(239, 68, 68, 0.5)',
                zIndex: 3,
                transition: 'transform 0.2s ease',
              }}
            >
              <X size={14} strokeWidth={2.5} />
            </button>
          </div>
        ))}

        {/* CASE D'AJOUT "+" TANT QUE COUNT < MAXPHOTOS */}
        {count < maxPhotos && (
          <label style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '1 / 1',
            borderRadius: '16px',
            border: '2px dashed var(--border-color)',
            backgroundColor: 'var(--bg-subtle)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            gap: '6px',
            transition: 'all 0.2s ease',
          }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Plus size={20} />
            </div>
            <span style={{
              fontSize: '11px',
              fontWeight: '800',
              color: 'var(--text-main)',
            }}>
              Ajouter photo
            </span>
            <span style={{
              fontSize: '9px',
              color: 'var(--text-secondary)',
            }}>
              {count < 4 ? 'Inclus (gratuit)' : 'Pack (+1,99 €)'}
            </span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0 && onAddPhoto) {
                  onAddPhoto(e);
                  e.target.value = '';
                }
              }}
              style={{ display: 'none' }}
            />
          </label>
        )}
      </div>
    </div>
  );
}

