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
