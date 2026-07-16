import React, { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { captureAndScanBusinessCard, processCardImage } from '../utils/businessCard';
import { rotateImageDataUrl } from '../utils/imageOrientation';
import WebcamCaptureModal from './WebcamCaptureModal';

export default function BusinessCardCapture({ cardImage, currentValues, onImageCaptured, onApplyField }) {
  const [scanning, setScanning] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [lines, setLines] = useState([]);
  const [error, setError] = useState('');
  const [noTextWarning, setNoTextWarning] = useState(false);
  const [showWebcam, setShowWebcam] = useState(false);

  const isNative = Capacitor.isNativePlatform();

  function applyResult({ imageDataUrl, width, height, lines, guesses }) {
    onImageCaptured(imageDataUrl, { width, height });
    setLines(lines);
    if (lines.length === 0) {
      setNoTextWarning(true);
    }
    if (guesses.email) onApplyField('email', guesses.email);
    if (guesses.website) onApplyField('website', guesses.website);
    if (guesses.phone) onApplyField('telWhatsapp', guesses.phone);
    // Only auto-fill name/company if the user hasn't already typed something.
    if (guesses.company && !currentValues?.company) onApplyField('company', guesses.company);
    if (guesses.name && !currentValues?.name) onApplyField('name', guesses.name);
  }

  async function handleScanNative() {
    setError('');
    setNoTextWarning(false);
    setScanning(true);
    try {
      const result = await captureAndScanBusinessCard();
      applyResult(result);
    } catch (e) {
      console.error(e);
      setError('拍照或识别失败，请重试 / Scan failed, please try again');
    } finally {
      setScanning(false);
    }
  }

  function handleOpenWebcam() {
    setError('');
    setNoTextWarning(false);
    setShowWebcam(true);
  }

  async function handleWebcamCapture(dataUrl) {
    setShowWebcam(false);
    setScanning(true);
    try {
      const result = await processCardImage(dataUrl, 'tesseract');
      applyResult(result);
    } catch (e) {
      console.error(e);
      setError('识别失败，请重试 / Recognition failed, please try again');
    } finally {
      setScanning(false);
    }
  }

  async function handleRotate() {
    if (!cardImage) return;
    setRotating(true);
    try {
      const { dataUrl, width, height } = await rotateImageDataUrl(cardImage, 90);
      onImageCaptured(dataUrl, { width, height });
    } catch (e) {
      console.error(e);
      setError('旋转失败，请重试 / Rotate failed, please try again');
    } finally {
      setRotating(false);
    }
  }

  return (
    <div className="field business-card-box">
      <label>名片 / Business Card</label>
      {cardImage && (
        <>
          <img src={cardImage} alt="business card" className="card-preview" />
          <button className="btn small" onClick={handleRotate} disabled={rotating}>
            ↻ 旋转90° / Rotate 90°
          </button>
        </>
      )}
      <button
        className="btn"
        onClick={isNative ? handleScanNative : handleOpenWebcam}
        disabled={scanning}
      >
        {scanning
          ? '识别中… / Scanning...'
          : cardImage
          ? '重新扫描 / Re-scan'
          : '拍摄名片自动识别 / Scan Business Card'}
      </button>
      {error && <p className="error-text">{error}</p>}
      {noTextWarning && (
        <p className="error-text">
          未识别到任何文字，可能是照片不够清晰/光线不足，或初次使用需要联网下载识别语言包。可重新拍摄，或直接手动填写。
        </p>
      )}
      <p className="hint-text">
        名片照片会自动尝试转正为横向；如果方向还是不对，可以点上面的"旋转90°"按钮手动转到正确方向。
        电话/邮箱/网址会自动尝试填入对应字段；姓名、公司识别准确度有限，可点击下方识别出的文字快速填入。
      </p>
      {lines.length > 0 && (
        <div className="ocr-lines">
          {lines.map((line, idx) => (
            <div key={idx} className="ocr-line">
              <span className="ocr-line-text">{line}</span>
              <span className="ocr-line-actions">
                <button className="btn small" onClick={() => onApplyField('name', line)}>
                  填姓名
                </button>
                <button className="btn small" onClick={() => onApplyField('company', line)}>
                  填公司
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
      {showWebcam && (
        <WebcamCaptureModal
          onCapture={handleWebcamCapture}
          onClose={() => setShowWebcam(false)}
        />
      )}
    </div>
  );
}
