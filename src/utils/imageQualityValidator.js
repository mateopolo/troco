/**
 * Image Quality Validator & Processor (Canvas API)
 * Intercepte et valide la résolution minimale et la luminosité moyenne des photos.
 */

export function validateAndProcessImage(file, options = {}) {
  const {
    minWidth = 800,
    minHeight = 800,
    minBrightness = 45,
    maxWidth = 1600,
    maxHeight = 1600,
    quality = 0.82,
  } = options;

  return new Promise((resolve) => {
    if (!file || !file.type.startsWith('image/')) {
      resolve({
        valid: false,
        error: 'Le fichier sélectionné n’est pas une image valide.',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const naturalWidth = img.naturalWidth || img.width;
        const naturalHeight = img.naturalHeight || img.height;

        // 1. Validation de la résolution minimale (800x800px)
        if (naturalWidth < minWidth || naturalHeight < minHeight) {
          resolve({
            valid: false,
            error: `Image trop petite ou pixelisée (${naturalWidth}x${naturalHeight}px). Minimum requis : ${minWidth}x${minHeight}px pour garantir une netteté optimale.`,
            width: naturalWidth,
            height: naturalHeight,
          });
          return;
        }

        // 2. Calcul de la luminosité moyenne via Canvas invisible (100x100 pixels)
        let warning = null;
        let avgBrightness = 128;
        try {
          const sampleCanvas = document.createElement('canvas');
          sampleCanvas.width = 100;
          sampleCanvas.height = 100;
          const sampleCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });
          
          if (sampleCtx) {
            sampleCtx.drawImage(img, 0, 0, 100, 100);
            const imgData = sampleCtx.getImageData(0, 0, 100, 100).data;
            let totalLuminance = 0;
            const pixelCount = 100 * 100;

            for (let i = 0; i < imgData.length; i += 4) {
              const r = imgData[i];
              const g = imgData[i + 1];
              const b = imgData[i + 2];
              // Formule standard ITU-R BT.601
              const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
              totalLuminance += luminance;
            }

            avgBrightness = Math.round(totalLuminance / pixelCount);

            if (avgBrightness < minBrightness) {
              warning = `Cette photo semble très sombre (luminosité ${avgBrightness}/255). Un bon éclairage mettra bien plus en valeur votre annonce ! 💡`;
            }
          }
        } catch (canvasErr) {
          console.warn('[ImageQualityValidator] Canvas brightness analysis skipped:', canvasErr);
        }

        // 3. Compression & Redimensionnement respectant le ratio
        let targetWidth = naturalWidth;
        let targetHeight = naturalHeight;

        if (targetWidth > maxWidth || targetHeight > maxHeight) {
          if (targetWidth > targetHeight) {
            targetHeight = Math.round((targetHeight * maxWidth) / targetWidth);
            targetWidth = maxWidth;
          } else {
            targetWidth = Math.round((targetWidth * maxHeight) / targetHeight);
            targetHeight = maxHeight;
          }
        }

        const outCanvas = document.createElement('canvas');
        outCanvas.width = targetWidth;
        outCanvas.height = targetHeight;
        const outCtx = outCanvas.getContext('2d');
        
        if (outCtx) {
          outCtx.drawImage(img, 0, 0, targetWidth, targetHeight);
          const compressedDataUrl = outCanvas.toDataURL('image/jpeg', quality);
          resolve({
            valid: true,
            dataUrl: compressedDataUrl,
            warning,
            width: naturalWidth,
            height: naturalHeight,
            brightness: avgBrightness,
          });
        } else {
          resolve({
            valid: true,
            dataUrl: e.target.result,
            warning,
            width: naturalWidth,
            height: naturalHeight,
            brightness: avgBrightness,
          });
        }
      };

      img.onerror = () => {
        resolve({
          valid: false,
          error: 'Impossible de lire les données de cette image.',
        });
      };

      img.src = e.target.result;
    };

    reader.onerror = () => {
      resolve({
        valid: false,
        error: 'Erreur lors de la lecture du fichier image.',
      });
    };

    reader.readAsDataURL(file);
  });
}
