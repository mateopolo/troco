import React from 'react';
import { Download } from 'lucide-react';
import { extractFilename, forceDownload } from '../../utils/downloadUtils';

export default function DownloadButton({ url, filename }) {
  if (!url) return null;

  const handleDownload = async (event) => {
    event.stopPropagation();
    await forceDownload(url, filename || extractFilename(url));
  };

  return (
    <button
      type="button"
      onClick={handleDownload}
      aria-label="Télécharger"
      title="Télécharger"
      className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition"
    >
      <Download size={16} />
    </button>
  );
}
