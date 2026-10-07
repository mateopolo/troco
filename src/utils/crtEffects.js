/**
 * crtEffects.js
 * Utilitaires pour le rendu 1-bit Dither et les effets d'écran cathodique (CRT)
 */

export const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

export const BAYER_8X8 = [
  [0, 32, 8, 40, 2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44, 4, 36, 14, 46, 6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
];

/**
 * Retourne une matrice de Bayer d'ordre 4x4 ou 8x8 (niveaux de gris)
 * @param {number} size - 4 ou 8
 * @returns {number[][]}
 */
export function getDitherBayerMatrix(size = 4) {
  if (size === 8) return BAYER_8X8;
  return BAYER_4X4;
}

/**
 * Applique un dither 1-bit à un ImageData en utilisant la matrice de Bayer.
 * Modifie l'ImageData en place et le retourne avec des pixels noir/blanc purs.
 * @param {ImageData} imageData 
 * @param {number} threshold - Seuil de coupure (défaut: 128)
 * @returns {ImageData}
 */
export function applyDitherToImageData(imageData, threshold = 128) {
  if (!imageData || !imageData.data) return imageData;

  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;
  const matrix = BAYER_4X4;
  const matrixSize = 4;
  const matrixMax = 16;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      if (a === 0) continue;

      // Calcul de luminance standard ITU-R BT.601
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      const bayerVal = (matrix[y % matrixSize][x % matrixSize] / matrixMax - 0.5) * 64;
      const adjusted = gray + bayerVal;

      const val = adjusted >= threshold ? 255 : 0;
      data[idx] = val;
      data[idx + 1] = val;
      data[idx + 2] = val;
      data[idx + 3] = a;
    }
  }

  return imageData;
}

/**
 * Retourne une chaîne SVG avec des lignes horizontales espacées de 3px, opacité 0.15
 * pour simuler l'effet écran CRT.
 * @param {number} width 
 * @param {number} height 
 * @returns {string}
 */
export function generateCRTScanlinesSVG(width = 100, height = 100) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <pattern id="crt-scanline-pattern" width="100%" height="3" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="100%" y2="0" stroke="white" stroke-width="1" stroke-opacity="0.15" />
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#crt-scanline-pattern)" />
</svg>`;
}

/**
 * Retourne une chaîne SVG avec un pattern de bruit statique pour simuler la neige CRT.
 * @param {number} width 
 * @param {number} height 
 * @param {number} intensity - Opacité du bruit (défaut: 0.05)
 * @returns {string}
 */
export function generateNoiseSVG(width = 100, height = 100, intensity = 0.05) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <filter id="crt-noise-filter">
    <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
    <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${intensity} 0" />
  </filter>
  <rect width="100%" height="100%" filter="url(#crt-noise-filter)" />
</svg>`;
}
