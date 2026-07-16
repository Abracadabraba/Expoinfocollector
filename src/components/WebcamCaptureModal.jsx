import React, { useEffect, useRef, useState } from 'react';

// onCapture(dataUrl) is called with a JPEG data URL of the captured frame.
// onClose() is called when the modal should be dismissed without capturing.
export default function WebcamCaptureModal({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setReady(true);
      } catch (e) {
        console.error(e);
        setError('无法访问摄像头，请检查浏览器/系统的摄像头权限 / Cannot access the camera — check camera permissions');
      }
    }
    start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function handleCapture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    onCapture(dataUrl);
  }

  function handleClose() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    onClose();
  }

  return (
    <div className="webcam-modal-backdrop">
      <div className="webcam-modal">
        <h3>拍摄名片 / Scan Business Card</h3>
        {error && <p className="error-text">{error}</p>}
        <video ref={videoRef} className="webcam-video" muted playsInline />
        <div className="webcam-modal-actions">
          <button className="btn" onClick={handleClose}>
            取消 / Cancel
          </button>
          <button className="btn primary" onClick={handleCapture} disabled={!ready}>
            拍照 / Capture
          </button>
        </div>
        <p className="hint-text">请把名片正对摄像头，尽量占满画面、光线充足。</p>
      </div>
    </div>
  );
}
