"use client";

import { useEffect, useRef, useState } from "react";

type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>>;
};

export function QrScanField({
  value,
  onChange,
}: {
  value: string;
  onChange: (token: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function stopScan() {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setScanning(false);
  }

  async function startScan() {
    setScanError(null);
    const Detector = (
      window as unknown as {
        BarcodeDetector?: new (opts: {
          formats: string[];
        }) => BarcodeDetectorLike;
      }
    ).BarcodeDetector;

    if (!Detector) {
      setScanError("سکان لەم وێبگەڕە پشتگیری ناکرێت — کۆد بنووسە");
      return;
    }

    setScanning(true);

    // wait one frame so video element mounts
    await new Promise((r) => requestAnimationFrame(() => r(null)));

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) {
        stopScan();
        setScanError("کامێرا ئامادە نەبوو");
        return;
      }
      video.srcObject = stream;
      await video.play();

      const detector = new Detector({ formats: ["qr_code"] });

      const tick = async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) {
          rafRef.current = requestAnimationFrame(() => void tick());
          return;
        }
        try {
          const codes = await detector.detect(videoRef.current);
          const raw = codes[0]?.rawValue?.trim();
          if (raw) {
            onChange(raw);
            stopScan();
            return;
          }
        } catch {
          // keep scanning
        }
        rafRef.current = requestAnimationFrame(() => void tick());
      };
      rafRef.current = requestAnimationFrame(() => void tick());
    } catch {
      stopScan();
      setScanError("نەتوانرا کامێرا بکرێتەوە");
    }
  }

  return (
    <div className="space-y-2 text-right">
      <label className="mb-1 block text-xs text-ink-muted" htmlFor="qrToken">
        کۆدی QR
      </label>
      <input
        id="qrToken"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="سکان بکە یان کۆد بنووسە"
        dir="ltr"
        className="w-full rounded-xl border border-line bg-surface-elevated px-3 py-2 text-left text-sm"
      />
      {scanning && (
        <div className="space-y-2">
          <video
            ref={videoRef}
            playsInline
            muted
            className="mx-auto h-44 w-full rounded-xl object-cover"
          />
          <button
            type="button"
            onClick={stopScan}
            className="w-full rounded-xl border border-line px-3 py-2 text-sm"
          >
            داخستنی سکان
          </button>
        </div>
      )}
      {!scanning && (
        <button
          type="button"
          onClick={startScan}
          className="w-full rounded-xl border border-line bg-surface-muted px-3 py-2 text-sm"
        >
          سکانکردنی QR بە کامێرا
        </button>
      )}
      {scanError && <p className="text-xs text-amber-700">{scanError}</p>}
      {value && <p className="text-xs text-brand-700">کۆد خوێندرایەوە ✓</p>}
    </div>
  );
}
