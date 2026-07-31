// Canvas-based helpers for fixing business card photo orientation.
// Phone cameras often hand back a "portrait" (taller-than-wide) image even when
// the user rotated the phone sideways to frame a landscape business card. These
// helpers detect that and rotate the image so it's always landscape before it's
// stored/exported, avoiding the stretched/squished look in the exported Word doc.

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

// Rotates a data URL image by the given degrees (must be a multiple of 90) and
// returns { dataUrl, width, height } for the rotated result.
export async function rotateImageDataUrl(dataUrl, degrees) {
  const img = await loadImage(dataUrl);
  const rad = (degrees * Math.PI) / 180;
  const swap = degrees % 180 !== 0;
  const canvas = document.createElement('canvas');
  canvas.width = swap ? img.naturalHeight : img.naturalWidth;
  canvas.height = swap ? img.naturalWidth : img.naturalHeight;
  const ctx = canvas.getContext('2d');
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(rad);
  ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
  const rotatedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
  return { dataUrl: rotatedDataUrl, width: canvas.width, height: canvas.height };
}

// If the image is portrait (taller than wide), rotate it 90° clockwise so a
// business card (which is inherently a wide rectangle) ends up landscape.
// If it's already landscape, it's returned untouched.
export async function autoLandscape(dataUrl) {
  const img = await loadImage(dataUrl);
  if (img.naturalHeight > img.naturalWidth) {
    return rotateImageDataUrl(dataUrl, 90);
  }
  return { dataUrl, width: img.naturalWidth, height: img.naturalHeight };
}

// Modern phone cameras produce photos several MB in size at full resolution.
// Every record stores its business-card photo as a base64 string directly in
// localStorage, so a handful of full-size photos is enough to fill up the
// browser's storage quota and make saving fail. A business card only needs
// to be legible, not 12-megapixel — so we downscale to a max width (default
// 1280px, proportional height) and re-encode as JPEG before it's ever stored.
// Only scales DOWN; smaller images are left alone.
export async function resizeImageDataUrl(dataUrl, maxWidth = 1280, quality = 0.85) {
  const img = await loadImage(dataUrl);
  const { naturalWidth: w, naturalHeight: h } = img;
  if (w <= maxWidth) {
    // Already small enough — still re-encode as JPEG at the given quality in
    // case the source was an uncompressed/high-quality format, but keep size.
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(img, 0, 0);
    return { dataUrl: canvas.toDataURL('image/jpeg', quality), width: w, height: h };
  }
  const scale = maxWidth / w;
  const newWidth = maxWidth;
  const newHeight = Math.round(h * scale);
  const canvas = document.createElement('canvas');
  canvas.width = newWidth;
  canvas.height = newHeight;
  canvas.getContext('2d').drawImage(img, 0, 0, newWidth, newHeight);
  return { dataUrl: canvas.toDataURL('image/jpeg', quality), width: newWidth, height: newHeight };
}
