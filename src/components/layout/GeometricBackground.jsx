import React, { useEffect, useRef } from 'react';

/**
 * GeometricBackground.jsx — Fond "Gemini Cosmic Sand" Ultra-Premium (Desktop & Mobile)
 * 
 * Conception Visuelle :
 * 1. Dégradé spatial/sable multicouche (Terre cuite dorée / Ambre / Nébuleuse subtile).
 * 2. Constellation de particules luminescentes (Dots avec surbrillance & halo radial 3D).
 * 3. Liaisons vectorielles douces proportionnelles à la distance.
 * 4. Micro-réactivité cinétique (Mouvement très lent, fluide et continu).
 * 5. Positionnement fixe avec z-index: -100, optimisé pour 60 FPS constants sans surchauffe.
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
    let mouse = { x: -1000, y: -1000, active: false };

    const isMobileDevice = typeof window !== 'undefined' && window.innerWidth < 768;
    const PARTICLE_COUNT = isMobileDevice ? 42 : 75;
    const MAX_DISTANCE = isMobileDevice ? 115 : 155;

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

    // Initialisation des particules avec propriétés d'éclat spatial
    const initParticles = () => {
      particles = [];
      const w = width || window.innerWidth;
      const h = height || window.innerHeight;

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const radius = Math.random() * 2.2 + 1.2; // Taille entre 1.2px et 3.4px
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.32,
          vy: (Math.random() - 0.5) * 0.32,
          radius,
          glowRadius: radius * (Math.random() * 2.5 + 3.0),
          alpha: Math.random() * 0.55 + 0.35,
          pulseSpeed: Math.random() * 0.02 + 0.008,
          pulsePhase: Math.random() * Math.PI * 2,
        });
      }
    };

    resizeCanvas();
    initParticles();

    const handleResize = () => {
      resizeCanvas();
      initParticles();
    };

    const handleVisibilityChange = () => {
      isPaused = document.hidden;
      if (!isPaused) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    };

    const handleMouseLeave = () => {
      mouse.active = false;
      mouse.x = -1000;
      mouse.y = -1000;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Boucle de rendu 60 FPS
    const render = () => {
      if (isPaused) return;

      ctx.clearRect(0, 0, width, height);

      // 1. DÉGRADÉ DE FOND SPATIAL / SABLE AURA "GEMINI"
      if (darkMode) {
        // Nébuleuse Ambre Sombre & Graphite Profond
        const bgGradient = ctx.createRadialGradient(
          width * 0.3, height * 0.25, 50,
          width * 0.5, height * 0.5, Math.max(width, height) * 0.8
        );
        bgGradient.addColorStop(0, 'rgba(44, 34, 28, 0.45)');
        bgGradient.addColorStop(0.5, 'rgba(26, 22, 19, 0.25)');
        bgGradient.addColorStop(1, 'rgba(18, 15, 13, 0.0)');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, width, height);

        const warmGlow = ctx.createRadialGradient(
          width * 0.85, height * 0.75, 40,
          width * 0.85, height * 0.75, width * 0.6
        );
        warmGlow.addColorStop(0, 'rgba(198, 125, 91, 0.09)');
        warmGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = warmGlow;
        ctx.fillRect(0, 0, width, height);
      } else {
        // Ciel de Sable Lumineux & Terracotta Astral
        const bgGradient = ctx.createRadialGradient(
          width * 0.25, height * 0.2, 50,
          width * 0.5, height * 0.5, Math.max(width, height) * 0.8
        );
        bgGradient.addColorStop(0, 'rgba(237, 226, 214, 0.55)');
        bgGradient.addColorStop(0.6, 'rgba(247, 243, 237, 0.3)');
        bgGradient.addColorStop(1, 'rgba(253, 251, 247, 0.0)');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, width, height);

        const sandAura = ctx.createRadialGradient(
          width * 0.8, height * 0.8, 50,
          width * 0.8, height * 0.8, width * 0.6
        );
        sandAura.addColorStop(0, 'rgba(198, 125, 91, 0.07)');
        sandAura.addColorStop(1, 'transparent');
        ctx.fillStyle = sandAura;
        ctx.fillRect(0, 0, width, height);
      }

      // Palette des particules
      const primaryRgb = darkMode ? '228, 158, 122' : '198, 125, 91';
      const secondaryRgb = darkMode ? '245, 186, 150' : '168, 100, 74';
      const lineRgb = darkMode ? '210, 142, 108' : '185, 120, 92';

      const len = particles.length;

      // 2. MISE À JOUR & DESSIN DES LIAISONS GÉOMÉTRIQUES
      for (let i = 0; i < len; i++) {
        const p1 = particles[i];

        // Interaction douce avec la souris si proche
        if (mouse.active) {
          const mdx = mouse.x - p1.x;
          const mdy = mouse.y - p1.y;
          const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
          if (mDist < 140 && mDist > 0) {
            const force = (1 - mDist / 140) * 0.025;
            p1.vx += (mdx / mDist) * force;
            p1.vy += (mdy / mDist) * force;
          }
        }

        // Vitesse max bridée
        const speed = Math.sqrt(p1.vx * p1.vx + p1.vy * p1.vy);
        if (speed > 0.6) {
          p1.vx = (p1.vx / speed) * 0.6;
          p1.vy = (p1.vy / speed) * 0.6;
        }

        p1.x += p1.vx;
        p1.y += p1.vy;

        // Rebond élastique doux sur les bords
        if (p1.x < 0) { p1.x = 0; p1.vx *= -1; }
        else if (p1.x > width) { p1.x = width; p1.vx *= -1; }
        if (p1.y < 0) { p1.y = 0; p1.vy *= -1; }
        else if (p1.y > height) { p1.y = height; p1.vy *= -1; }

        p1.pulsePhase += p1.pulseSpeed;
        const currentAlpha = p1.alpha * (0.8 + 0.2 * Math.sin(p1.pulsePhase));

        // Lignes de constellation
        for (let j = i + 1; j < len; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < MAX_DISTANCE) {
            const factor = 1 - dist / MAX_DISTANCE;
            const lineAlpha = (factor * factor) * (darkMode ? 0.24 : 0.16);

            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(${lineRgb}, ${lineAlpha.toFixed(3)})`;
            ctx.lineWidth = factor * 1.25;
            ctx.stroke();
          }
        }

        // 3. DESSIN DU POINT AVEC EFFET DE SURBRILLANCE & RELIEF (RADIAL GLOW)
        const glowGrad = ctx.createRadialGradient(
          p1.x, p1.y, 0,
          p1.x, p1.y, p1.glowRadius
        );
        glowGrad.addColorStop(0, `rgba(${secondaryRgb}, ${currentAlpha})`);
        glowGrad.addColorStop(0.35, `rgba(${primaryRgb}, ${(currentAlpha * 0.45).toFixed(3)})`);
        glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        // Halo de surbrillance
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, p1.glowRadius, 0, Math.PI * 2);
        ctx.fillStyle = glowGrad;
        ctx.fill();

        // Cœur du point
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, p1.radius, 0, Math.PI * 2);
        ctx.fillStyle = darkMode
          ? `rgba(255, 240, 230, ${(currentAlpha * 0.95).toFixed(3)})`
          : `rgba(255, 255, 255, ${(currentAlpha * 0.95).toFixed(3)})`;
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
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
        zIndex: -100,
        pointerEvents: 'none',
        display: 'block',
      }}
    />
  );
}
