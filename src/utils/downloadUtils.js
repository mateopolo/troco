export async function forceDownload(url, filename = 'fichier') {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
    return true;
  } catch (error) {
    console.error('[Download] Unable to download resource:', error);
    window.open(url, '_blank', 'noopener,noreferrer');
    return false;
  }
}

export function extractFilename(url, fallback = 'fichier') {
  try {
    const pathname = decodeURIComponent(new URL(url).pathname);
    const value = pathname.split('/').pop();
    return value || fallback;
  } catch (_) {
    return fallback;
  }
}
