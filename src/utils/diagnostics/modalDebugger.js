/**
 * modalDebugger.js
 * Script de diagnostic pour inspecter les modales, stacking contexts, z-index et overflow.
 * Peut être importé ou copié directement dans la console DevTools du navigateur.
 */
export function diagnoseModal() {
  console.group('🔍 [DIAGNOSTIC MODALE - HOTFIX-01]');
  
  if (typeof document === 'undefined') {
    console.warn('document non défini (environnement non-navigateur)');
    console.groupEnd();
    return;
  }

  // 1. Éléments avec z-index élevé ou fixed position
  const all = [...document.querySelectorAll('*')];
  const high = all
    .map(el => {
      const style = window.getComputedStyle(el);
      return {
        el,
        z: parseInt(style.zIndex, 10) || 0,
        pos: style.position,
        display: style.display,
        pointerEvents: style.pointerEvents,
        overflow: style.overflow,
        overflowY: style.overflowY,
      };
    })
    .filter(x => x.z > 100 || x.pos === 'fixed')
    .sort((a, b) => b.z - a.z)
    .slice(0, 20);

  console.log('📌 Top 20 éléments z-index / fixed :');
  console.table(high.map(x => ({
    tag: x.el.tagName,
    id: x.el.id || '(aucun)',
    class: (x.el.className?.toString() || '').slice(0, 50),
    zIndex: x.z,
    position: x.pos,
    display: x.display,
    pointerEvents: x.pointerEvents,
    overflowY: x.overflowY,
  })));

  // 2. Stacking contexts (transform, filter, perspective, opacity < 1, contain, will-change)
  const stacking = all.filter(el => {
    const s = window.getComputedStyle(el);
    return s.transform !== 'none' ||
      s.filter !== 'none' ||
      s.perspective !== 'none' ||
      (parseFloat(s.opacity) < 1 && s.position !== 'static') ||
      s.willChange.includes('transform');
  });
  console.log(`🎭 Stacking contexts détectés (${stacking.length}) :`);
  stacking.slice(0, 10).forEach((el, i) => {
    const s = window.getComputedStyle(el);
    console.log(`  #${i + 1}`, el.tagName, el.id ? `#${el.id}` : '', el.className?.toString().slice(0, 40), {
      transform: s.transform,
      filter: s.filter,
      zIndex: s.zIndex,
      pos: s.position,
    });
  });

  // 3. Body & DocumentElement overflow
  console.log('📜 body.style.overflow :', document.body.style.overflow);
  console.log('📜 body getComputedStyle(overflowY) :', window.getComputedStyle(document.body).overflowY);
  console.log('📜 documentElement.style.overflow :', document.documentElement.style.overflow);

  // 4. Recherche de nœuds de la modale "Abonnement Troco Plus"
  const trocoPlusNodes = all.filter(el =>
    (el.textContent && el.textContent.includes('Abonnement Troco Plus')) ||
    (el.id && el.id.includes('payment')) ||
    (el.className && typeof el.className === 'string' && el.className.includes('payment-modal'))
  );
  console.log(`🔎 Nœuds liés à Troco Plus / Payment : ${trocoPlusNodes.length}`);
  trocoPlusNodes.slice(0, 5).forEach((el, i) => {
    const r = el.getBoundingClientRect();
    const s = window.getComputedStyle(el);
    console.log(`  #${i + 1}`, el.tagName, el.className?.toString().slice(0, 60), {
      rect: { top: r.top, left: r.left, width: r.width, height: r.height },
      zIndex: s.zIndex,
      position: s.position,
      pointerEvents: s.pointerEvents,
    });
  });

  console.groupEnd();
  return { high, stackingCount: stacking.length, bodyOverflow: document.body.style.overflow };
}

// Auto-exécution si injecté dans la console
if (typeof window !== 'undefined') {
  window.diagnoseModal = diagnoseModal;
}
