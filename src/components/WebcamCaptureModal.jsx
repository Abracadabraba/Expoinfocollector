import React, { useEffect, useRef, useState } from 'react';

// onCapture(dataUrl) is called with a JPEG data URL of the captured frame.
// onClose() is called when the modal should be dismissed without capturing.
export default function WebcamCaptureModal({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [devices, setDevices] = useState([]);
  const [deviceId, setDeviceId] = useState('');
  const [blankWarning, setBlankWarning] = useState(false);

  async function listDevices() {
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      const cams = all.filter((d) => d.kind === 'videoinput');
      setDevices(cams);
      return cams;
    } catch (e) {
      console.warn('enumerateDevices failed:', e);
      return [];
    }
  }

  async function startStream(preferredDeviceId) {
    setError('');
    setBlankWarning(false);
    setReady(false);
    // Stop any previous stream before starting a new one (e.g. switching camera).
    streamRef.current?.getTracks().forEach((t) => t.stop());
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: preferredDeviceId
          ? { deviceId: { exact: preferredDeviceId } }
          : { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setReady(true);
      // Some virtual-camera drivers or GPU decode issues can produce a
      // connected stream that never actually paints a real frame. Detect
      // that so we can point the user at the camera selector / troubleshooting
      // tips instead of leaving them looking at a blank/green box.
      setTimeout(() => {
        const v = videoRef.current;
        if (v && (!v.videoWidth || v.videoWidth === 0)) {
          setBlankWarning(true);
        }
      }, 2500);
      // Now that permission is granted, device labels become available.
      listDevices();
    } catch (e) {
      console.error(e);
      setError('无法访问摄像头，请检查系统的摄像头权限 / Cannot access the camera — check camera permissions');
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cams = await listDevices();
      if (cancelled) return;
      const first = cams[0]?.deviceId || '';
      setDeviceId(first);
      await startStream(first || undefined);
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleDeviceChange(e) {
    const id = e.target.value;
    setDeviceId(id);
    startStream(id);
  }

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
        {devices.length > 1 && (
          <div className="field">
            <label>选择摄像头 / Choose Camera</label>
            <select value={deviceId} onChange={handleDeviceChange}>
              {devices.map((d, i) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `摄像头 ${i + 1} / Camera ${i + 1}`}
                </option>
              ))}
            </select>
          </div>
        )}
        <video ref={videoRef} className="webcam-video" muted playsInline />
        {blankWarning && (
          <p className="error-text">
            画面看起来是空白/纯色的。如果电脑有多个摄像头（比如装过 OBS、Zoom
            等软件的虚拟摄像头），请在上方"选择摄像头"里换一个试试；也可以检查一下
            Windows 隐私设置里摄像头权限是否正常、或者重启一下电脑再试。
          </p>
        )}
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
