import { Capacitor } from '@capacitor/core';
import { saveAs } from 'file-saver';

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result); // data:...;base64,XXXX
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function sanitizeFolderName(name) {
  return (name || '未命名展会').replace(/[\\/:*?"<>|]+/g, '_').trim() || '未命名展会';
}

function stripDataUrlPrefix(dataUrl) {
  const idx = dataUrl.indexOf(',');
  return idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl;
}

/**
 * Saves a docx (or any) blob.
 * On Windows (Electron desktop build): writes directly into
 *   <Downloads>/<exhibitionFolder>/<dateFolder>/<filename>
 * via the Electron main process (no dialog needed).
 * On native Android: writes into Download/<exhibitionFolder>/<dateFolder>/<filename>
 * using MediaStore (works on Android 10+ without special storage permission).
 * On plain web: falls back to a normal browser download.
 *
 * Returns { method: 'downloads' | 'share' | 'web', path? }
 */
export async function saveDocxToDownloads(blob, { exhibitionFolder, dateFolder, filename }) {
  const safeExhibition = sanitizeFolderName(exhibitionFolder);

  if (typeof window !== 'undefined' && window.electronAPI?.isElectron) {
    const dataUrl = await blobToBase64(blob);
    const base64Data = stripDataUrlPrefix(dataUrl);
    const result = await window.electronAPI.saveDocxToDownloads({
      base64Data,
      exhibitionFolder: safeExhibition,
      dateFolder,
      filename,
    });
    if (result?.success) {
      return { method: 'downloads', path: result.fullPath };
    }
    // Fall back to a plain browser-style download if the direct write failed
    // (e.g. permissions issue on that machine).
    console.warn('Electron Downloads write failed, falling back to browser download:', result?.error);
    saveAs(blob, filename);
    return { method: 'web' };
  }

  const relativePath = `Download/${safeExhibition}/${dateFolder}`;

  if (Capacitor.isNativePlatform()) {
    const base64Data = await blobToBase64(blob);
    try {
      const { FileSharer } = await import('@capgo/capacitor-file-sharer');
      const result = await FileSharer.save({
        filename,
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        base64Data,
        android: {
          saveDirectory: 'downloads',
          relativePath,
        },
      });
      return { method: 'downloads', path: `${relativePath}/${filename}`, uri: result?.uri };
    } catch (e) {
      console.warn('Direct save to Downloads failed, falling back to share sheet:', e);
      // Fallback: let the user pick where to save via the share sheet.
      const { FileSharer } = await import('@capgo/capacitor-file-sharer');
      await FileSharer.share({
        filename,
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        base64Data,
        title: filename,
      });
      return { method: 'share' };
    }
  } else {
    saveAs(blob, filename);
    return { method: 'web' };
  }
}
