import { Capacitor } from '@capacitor/core';
import { autoLandscape } from './imageOrientation';

// --- Native (Android) capture: system camera app + on-device Google ML Kit OCR ---
// Returns { imageDataUrl, width, height, rawText, lines, guesses }
export async function captureAndScanBusinessCard() {
  const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');

  const photo = await Camera.getPhoto({
    quality: 85,
    resultType: CameraResultType.Base64,
    source: CameraSource.Prompt,
    promptLabelHeader: '名片拍照 / Business Card',
    promptLabelPhoto: '从相册选择 / Choose from gallery',
    promptLabelPicture: '拍照 / Take photo',
  });

  const format = photo.format || 'jpeg';
  const rawDataUrl = `data:image/${format};base64,${photo.base64String}`;
  return processCardImage(rawDataUrl, 'mlkit');
}

// --- Shared processing: orientation fix + OCR + regex/heuristic field guesses ---
// ocrEngine: 'mlkit' (Android on-device, native only) | 'tesseract' (desktop/web, offline WASM)
// Returns { imageDataUrl, width, height, rawText, lines, guesses }
export async function processCardImage(rawDataUrl, ocrEngine) {
  // Business cards are wide rectangles — if the camera handed back a portrait
  // (taller-than-wide) image, rotate it 90° so it isn't stretched when placed
  // into the exported Word document.
  const { dataUrl: imageDataUrl, width, height } = await autoLandscape(rawDataUrl);

  let rawText = '';

  if (ocrEngine === 'mlkit' && Capacitor.isNativePlatform()) {
    try {
      const { Ocr } = await import('@jcesarmobile/capacitor-ocr');
      const result = await Ocr.process({ image: imageDataUrl });
      rawText = (result?.results || [])
        .map((r) => r.text)
        .filter(Boolean)
        .join('\n')
        .trim();
    } catch (e) {
      console.warn('ML Kit OCR unavailable or failed:', e);
      rawText = '';
    }
  } else if (ocrEngine === 'tesseract') {
    try {
      rawText = await runTesseractOcr(imageDataUrl);
    } catch (e) {
      console.warn('Tesseract OCR failed:', e);
      rawText = '';
    }
  }

  const guesses = extractGuesses(rawText);
  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  return { imageDataUrl, width, height, rawText, lines, guesses };
}

let tesseractWorkerPromise = null;

async function getTesseractWorker() {
  if (!tesseractWorkerPromise) {
    tesseractWorkerPromise = (async () => {
      const { createWorker } = await import('tesseract.js');
      // eng covers most international business cards; chi_sim adds Chinese text
      // support. Language data is fetched once from a CDN and cached by the
      // browser/Electron afterwards, so this needs internet on first use only.
      return createWorker(['eng', 'chi_sim']);
    })();
  }
  return tesseractWorkerPromise;
}

async function runTesseractOcr(dataUrl) {
  const worker = await getTesseractWorker();
  const { data } = await worker.recognize(dataUrl);
  return (data?.text || '').trim();
}

const COMPANY_KEYWORDS = [
  'co.', 'co,', 'ltd', 'inc', 'corp', 'corporation', 'company', 'gmbh', 'llc',
  'pte', 'group', 'industries', 'industry', 'pharma', 'pharmaceutical',
  'technology', 'technologies', 'tech', 'international', 'holdings',
  'enterprise', 'enterprises', 'plc', 'sa', 's.a.', 'srl', 'bv',
];

const POSITION_KEYWORDS = [
  'owner', 'director', 'purchasing', 'manager', 'sales', 'engineer',
  'ceo', 'cto', 'coo', 'founder', 'president', 'executive', 'officer',
  'vice', 'representative', 'supervisor', 'chief',
];

function guessCompany(lines) {
  const hit = lines.find((l) => {
    const lower = l.toLowerCase();
    return COMPANY_KEYWORDS.some((kw) => lower.includes(kw));
  });
  return hit || '';
}

function guessName(lines, companyGuess) {
  for (const line of lines) {
    if (line === companyGuess) continue;
    if (/[@\d]/.test(line)) continue; // skip lines with digits/email
    const lower = line.toLowerCase();
    if (POSITION_KEYWORDS.some((kw) => lower.includes(kw))) continue;
    if (COMPANY_KEYWORDS.some((kw) => lower.includes(kw))) continue;
    const words = line.trim().split(/\s+/);
    if (words.length >= 2 && words.length <= 4 && /^[A-Za-z\u00C0-\u024F\u4e00-\u9fa5.\-'\s]+$/.test(line)) {
      return line;
    }
  }
  return '';
}

function extractGuesses(text) {
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const websiteMatch = text.match(/\b(?:https?:\/\/|www\.)[^\s]+\.[a-zA-Z]{2,}[^\s]*/i);
  // Phone: sequences of 7+ digits, possibly with +, spaces, -, ()
  const phoneMatch = text.match(/(\+?\d[\d\s\-().]{6,}\d)/);

  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const company = guessCompany(lines);
  const name = guessName(lines, company);

  return {
    email: emailMatch ? emailMatch[0] : '',
    website: websiteMatch ? websiteMatch[0] : '',
    phone: phoneMatch ? phoneMatch[0].replace(/\s{2,}/g, ' ').trim() : '',
    company,
    name,
  };
}
