import React, { useEffect, useRef } from 'react';

/**
 * GeometricBackground.jsx
 * Composant Canvas de constellation géométrique fluide (particules interconnectées).
 * Conçu pour un rendu haut de gamme (Gemini / Apple Intelligence style) avec un impact CPU minimal.
 * Visible et unifié sur Desktop ET Mobile.
 */
export default function GeometricBackground({ darkMode = false }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId;
    let width = 0;
    let height = 0;
    let particles = [];
    let isPaused = false;

    // Paramètres des particules & constellation optimisés
    const isMobileDevice = typeof window !== 'undefined' && window.innerWidth < 768;
    const PARTICLE_COUNT = isMobileDevice ? 36 : 60;
    const MAX_DISTANCE = isMobileDevice ? 110 : 145; // Distance max de connexion en pixels

    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.scale(dpr, dpr);
    };

    // Initialisation des particules
    const initParticles = () => {
      particles = [];
      const count = PARTICLE_COUNT;
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * (width || window.innerWidth),
          y: Math.random() * (height || window.innerHeight),
          vx: (Math.random() - 0.5) * 0.35, // Vitesse lente et fluide
          vy: (Math.random() - 0.5) * 0.35,
          radius: Math.random() * 1.5 + 1.0, // Rayon entre 1.0px et 2.5px
          baseAlpha: Math.random() * 0.35 + 0.15,
        });
      }
    };

    resizeCanvas();
    initParticles();

    const handleResize = () => {
      resizeCanvas();
    };

    const handleVisibilityChange = () => {
      isPaused = document.hidden;
      if (!isPaused) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    window.addEventListener('resize', handleResize);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Boucle d'animation 60 FPS ultra-légère
    const render = () => {
      if (isPaused) return;

      ctx.clearRect(0, 0, width, height);

      // Couleurs adaptées au thème (terre cuite / doré cuivré très subtil)
      const dotColorRgb = darkMode ? '224, 155, 117' : '185, 139, 115';
      const lineColorRgb = darkMode ? '203, 140, 106' : '175, 130, 108';

      // 1. Mise à jour et dessin des particules
      const len = particles.length;
      for (let i = 0; i < len; i++) {
        const p = particles[i];

        p.x += p.vx;
        p.y += p.vy;

        // Rebond doux sur les bords de l'écran
        if (p.x < 0) {
          p.x = 0;
          p.vx *= -1;
        } else if (p.x > width) {
          p.x = width;
          p.vx *= -1;
        }

        if (p.y < 0) {
          p.y = 0;
          p.vy *= -1;
        } else if (p.y > height) {
          p.y = height;
          p.vy *= -1;
        }

        // Dessin du point
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${dotColorRgb}, ${p.baseAlpha * (darkMode ? 0.85 : 0.65)})`;
        ctx.fill();

        // 2. Calcul des liaisons géométriques avec les voisins
        for (let j = i + 1; j < len; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < MAX_DISTANCE) {
            // Opacité progressive inversement proportionnelle à la distance
            const factor = 1 - dist / MAX_DISTANCE;
            const lineAlpha = (factor * factor) * (darkMode ? 0.22 : 0.14);

            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(${lineColorRgb}, ${lineAlpha.toFixed(3)})`;
            ctx.lineWidth = factor * 1.2;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [darkMode]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: -10,
        pointerEvents: 'none',
        display: 'block',
      }}
    />
  );
}
