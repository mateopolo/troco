/**
 * mapTranslations.js
 * Dictionnaire de localisation pour la carte interactive et ses composants.
 */
export const MAP_I18N = {
  FR: {
    closeMap: 'Fermer la carte',
    close: 'Fermer',
    fullscreen: 'Plein écran',
    locateMe: '🎯 Me localiser',
    locating: 'Localisation...',
    twoFingerHelp: 'Utilisez 2 doigts pour déplacer la carte, ou ouvrez en Plein Écran.',
    openFullscreen: 'Ouvrir en Plein Écran',
    unsupportedGeo: "La géolocalisation n'est pas prise en charge par votre navigateur.",
    immersiveView: 'Carte en plein écran (Vue immersive)',
    expandMap: 'Agrandir la carte',
  },
  EN: {
    closeMap: 'Close map',
    close: 'Close',
    fullscreen: 'Full screen',
    locateMe: '🎯 Locate me',
    locating: 'Locating...',
    twoFingerHelp: 'Use 2 fingers to move the map, or open in Full Screen.',
    openFullscreen: 'Open in Full Screen',
    unsupportedGeo: 'Geolocation is not supported by your browser.',
    immersiveView: 'Full screen map (Immersive view)',
    expandMap: 'Expand map',
  },
  ES: {
    closeMap: 'Cerrar el mapa',
    close: 'Cerrar',
    fullscreen: 'Pantalla completa',
    locateMe: '🎯 Localizarme',
    locating: 'Localizando...',
    twoFingerHelp: 'Usa 2 dedos para mover el mapa o ábrelo en pantalla completa.',
    openFullscreen: 'Abrir en Pantalla Completa',
    unsupportedGeo: 'La geolocalización no es compatible con su navegador.',
    immersiveView: 'Mapa en pantalla completa (Vista inmersiva)',
    expandMap: 'Ampliar mapa',
  },
  IT: {
    closeMap: 'Chiudi la mappa',
    close: 'Chiudi',
    fullscreen: 'Schermo intero',
    locateMe: '🎯 Localizzami',
    locating: 'Localizzando...',
    twoFingerHelp: 'Usa 2 dita per spostare la mappa o aprila a schermo intero.',
    openFullscreen: 'Apri a Schermo Intero',
    unsupportedGeo: 'La geolocalizzazione non è supportata dal browser.',
    immersiveView: 'Mappa a schermo intero (Vista immersiva)',
    expandMap: 'Ingrandisci mappa',
  },
  DE: {
    closeMap: 'Karte schließen',
    close: 'Schließen',
    fullscreen: 'Vollbild',
    locateMe: '🎯 Mich orten',
    locating: 'Ortung...',
    twoFingerHelp: 'Verwenden Sie 2 Finger, um die Karte zu verschieben, oder öffnen Sie im Vollbildmodus.',
    openFullscreen: 'Im Vollbildmodus öffnen',
    unsupportedGeo: 'Geolokalisierung wird von Ihrem Browser nicht unterstützt.',
    immersiveView: 'Vollbildkarte (Immersive Ansicht)',
    expandMap: 'Karte vergrößern',
  },
};

/**
 * Récupère le texte localisé selon la langue courante
 * @param {string} lang - Code de langue (FR, EN, ES, IT, DE, etc.)
 * @param {string} key - Clé de traduction
 * @returns {string}
 */
export const getMapTranslation = (lang, key) => {
  const normalized = (lang || 'FR').toUpperCase();
  const dict = MAP_I18N[normalized] || MAP_I18N.FR;
  return dict[key] || MAP_I18N.FR[key] || key;
};
