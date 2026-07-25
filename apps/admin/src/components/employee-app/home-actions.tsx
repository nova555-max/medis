"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Check, Fingerprint } from "lucide-react";
import {
  employeeCheckInAction,
  employeeCheckOutAction,
  uploadSelfieAction,
} from "@/lib/actions/employee-app";
import { QrScanField } from "@/components/employee-app/qr-scan-field";
import { cn } from "@/lib/cn";

async function getLocation(): Promise<{ lat: number; lng: number } | null> {
  if (!navigator.geolocation) return null;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 12000 },
    );
  });
}

export function EmployeeHomeActions({
  checkedIn,
  checkedOut,
  gpsEnabled,
  qrRequired,
  selfieRequired,
}: {
  checkedIn: boolean;
  checkedOut: boolean;
  gpsEnabled: boolean;
  qrRequired: boolean;
  selfieRequired: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [qrToken, setQrToken] = useState("");
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  // Attach stream AFTER video mounts (cameraOn=true). Previous bug: srcObject set while video was unmounted.
  useEffect(() => {
    if (!cameraOn) return;
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;
    video.srcObject = stream;
    video.muted = true;
    video.setAttribute("playsinline", "true");
    const play = () => {
      void video.play().catch(() => {
        /* autoplay policies — user already tapped open camera */
      });
    };
    if (video.readyState >= 2) play();
    else video.onloadedmetadata = play;
    return () => {
      video.onloadedmetadata = null;
    };
  }, [cameraOn]);

  const done = checkedIn && checkedOut;
  const mode: "in" | "out" | "done" = done ? "done" : checkedIn ? "out" : "in";

  async function startCamera() {
    setError(null);
    try {
      stopCamera();
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("ئەم وێبگەڕە پشتگیری کامێرا ناکات — وێنە لە گەلەری هەڵبژێرە");
        fileInputRef.current?.click();
        return;
      }
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: "user" },
            width: { ideal: 720 },
            height: { ideal: 720 },
          },
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: true,
        });
      }
      streamRef.current = stream;
      setCameraOn(true);
    } catch {
      setError(
        "نەتوانرا کامێرا بکرێتەوە — مۆڵەتی کامێرا بدە یان وێنە لە گەلەری هەڵبژێرە",
      );
      fileInputRef.current?.click();
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  }

  function captureSelfie() {
    const video = videoRef.current;
    if (!video) return;
    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;
    if (w < 2 || h < 2) {
      setError("کامێرا هێشتا ئامادە نییە — چەند چرکەیەک چاوەڕوان بە");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError("وێنەگرتن سەرنەکەوت");
          return;
        }
        const file = new File([blob], `selfie-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        setSelfieFile(file);
        setPreview((prev) => {
          if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
          return URL.createObjectURL(blob);
        });
        stopCamera();
        setError(null);
      },
      "image/jpeg",
      0.85,
    );
  }

  function onFilePicked(file: File | null) {
    if (!file || !file.type.startsWith("image/")) {
      setError("تکایە وێنەیەک هەڵبژێرە");
      return;
    }
    stopCamera();
    setSelfieFile(file);
    setPreview((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setError(null);
  }

  function run() {
    if (mode === "done" || pending) return;
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      if (mode === "in" && qrRequired && !qrToken.trim()) {
        setError("کۆدی QR پێویستە — لە پانێڵی ئەدمین بیخوێنەرەوە");
        return;
      }
      if (selfieRequired && !selfieFile && mode === "in") {
        setError("وێنەی selfie پێویستە");
        return;
      }

      let coords: { lat: number; lng: number } | null = null;
      if (gpsEnabled) {
        coords = await getLocation();
        if (!coords) {
          setError(
            "نەتوانرا شوێن بخوێنرێتەوە — مۆڵەتی شوێن لە ڕێکخستنی مۆبایل بدە",
          );
          return;
        }
      }

      let selfiePath: string | null = null;
      if (selfieRequired && selfieFile && mode === "in") {
        const fd = new FormData();
        fd.set("selfie", selfieFile);
        const up = await uploadSelfieAction(fd);
        if (up.error || !up.path) {
          setError(up.error || "بارکردنی وێنە سەرنەکەوت");
          return;
        }
        selfiePath = up.path;
      }

      const res =
        mode === "in"
          ? await employeeCheckInAction({
              lat: coords?.lat,
              lng: coords?.lng,
              qrToken: qrToken.trim() || null,
              selfiePath,
            })
          : await employeeCheckOutAction({
              lat: coords?.lat,
              lng: coords?.lng,
            });
      if (res.error) setError(res.error);
      else {
        setSuccess(
          mode === "in" ? "دەستپێکی دەوام تۆمارکرا" : "کۆتایی دەوام تۆمارکرا",
        );
        router.refresh();
      }
    });
  }

  const title =
    mode === "in"
      ? "دەستپێکی دەوام"
      : mode === "out"
        ? "کۆتایی دەوام"
        : "دەوام تەواو بوو";

  const hint =
    mode === "in"
      ? "پەنجەت لەسەر ئایکۆنەکە دابنێ بۆ دەستپێک"
      : mode === "out"
        ? "پەنجەت دابنێ بۆ کۆتایی دەوام"
        : "سوپاس — ئەمڕۆ تەواو بوو";

  return (
    <div className="space-y-3">
      <section
        className={cn(
          "relative overflow-hidden rounded-[1.5rem] border p-4 text-center shadow-soft",
          mode === "in" &&
            "border-brand-200/80 bg-gradient-to-b from-brand-50 via-surface-elevated to-surface-elevated dark:border-brand-800 dark:from-brand-950/50 dark:via-surface-elevated dark:to-surface-elevated",
          mode === "out" &&
            "border-orange-200/80 bg-gradient-to-b from-orange-50 via-surface-elevated to-surface-elevated dark:border-orange-900 dark:from-orange-950/40 dark:via-surface-elevated",
          mode === "done" &&
            "border-emerald-200/80 bg-gradient-to-b from-emerald-50 via-surface-elevated to-surface-elevated dark:border-emerald-900 dark:from-emerald-950/40 dark:via-surface-elevated",
        )}
      >
        <p
          className={cn(
            "relative text-xs font-semibold tracking-wide",
            mode === "in" && "text-brand-600 dark:text-brand-300",
            mode === "out" && "text-orange-700 dark:text-orange-300",
            mode === "done" && "text-emerald-700 dark:text-emerald-300",
          )}
        >
          پەنجەمۆری ئامادەبوون
        </p>
        <h2 className="relative mt-1 text-lg font-bold text-ink">{title}</h2>
        <p className="relative mt-0.5 text-xs text-ink-muted">
          {pending ? "پەنجە دەخوێنرێتەوە..." : hint}
        </p>

        {mode === "in" && qrRequired && (
          <div className="relative mx-auto mt-3 max-w-sm">
            <QrScanField value={qrToken} onChange={setQrToken} />
          </div>
        )}

        {mode === "in" && selfieRequired && (
          <div className="relative mx-auto mt-3 max-w-sm space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="user"
              className="hidden"
              onChange={(e) => {
                onFilePicked(e.target.files?.[0] ?? null);
                e.target.value = "";
              }}
            />
            {!preview && !cameraOn && (
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => void startCamera()}
                  className="w-full rounded-xl border border-line bg-surface-muted px-3 py-2 text-sm"
                >
                  کردنەوەی کامێرا بۆ Selfie
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full rounded-xl border border-dashed border-line px-3 py-2 text-xs text-ink-muted"
                >
                  یان وێنە لە گەلەری / کامێرای سیستەم
                </button>
              </div>
            )}
            {cameraOn && (
              <div className="space-y-2">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  controls={false}
                  className="mx-auto h-48 w-full rounded-xl bg-black object-cover"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={captureSelfie}
                    className="flex-1 rounded-xl bg-brand-600 px-3 py-2 text-sm text-white"
                  >
                    وێنەگرتن
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="rounded-xl border border-line px-3 py-2 text-sm"
                  >
                    داخستن
                  </button>
                </div>
              </div>
            )}
            {preview && (
              <div className="space-y-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview}
                  alt="selfie"
                  className="mx-auto h-40 rounded-xl object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    setPreview((prev) => {
                      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
                      return null;
                    });
                    setSelfieFile(null);
                    void startCamera();
                  }}
                  className="text-xs text-brand-700"
                >
                  دووبارە وێنەگرتن
                </button>
              </div>
            )}
          </div>
        )}

        <div className="relative mx-auto mt-4 flex h-[5.5rem] w-[5.5rem] items-center justify-center">
          {mode !== "done" && (
            <span
              className={cn(
                "absolute inset-0 rounded-full border opacity-60",
                mode === "in" &&
                  "border-brand-300 animate-[fingerprintRing_3s_ease-in-out_infinite]",
                mode === "out" &&
                  "border-orange-300 animate-[fingerprintRing_3s_ease-in-out_infinite]",
              )}
            />
          )}
          <button
            type="button"
            disabled={pending || mode === "done"}
            onClick={run}
            aria-label={title}
            className={cn(
              "relative z-10 flex h-16 w-16 items-center justify-center rounded-full transition duration-200",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-500",
              "disabled:cursor-default",
              mode === "in" &&
                "bg-gradient-to-b from-brand-500 to-brand-700 text-white shadow-[0_10px_24px_-10px_rgb(42_90_143_/_0.75)] hover:brightness-110 active:scale-[0.96]",
              mode === "out" &&
                "bg-gradient-to-b from-[#e09a4e] to-[#b56a24] text-white shadow-[0_10px_24px_-10px_rgb(181_106_36_/_0.65)] hover:brightness-110 active:scale-[0.96]",
              mode === "done" &&
                "bg-gradient-to-b from-emerald-500 to-emerald-700 text-white",
              pending && "animate-pulse",
            )}
          >
            {mode === "done" ? (
              <Check className="relative z-10 h-6 w-6" strokeWidth={2.4} />
            ) : (
              <Fingerprint className="relative z-10 h-6 w-6" strokeWidth={1.7} />
            )}
          </button>
        </div>

        <div className="relative mt-3.5 flex flex-wrap items-center justify-center gap-2">
          {qrRequired && mode === "in" && (
            <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] text-brand-700 dark:bg-brand-950 dark:text-brand-200">
              QR پێویستە
            </span>
          )}
          {selfieRequired && mode === "in" && (
            <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] text-brand-700 dark:bg-brand-950 dark:text-brand-200">
              Selfie پێویستە
            </span>
          )}
        </div>
      </section>

      {error && (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-center text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-2xl border border-brand-200 bg-brand-50 px-3 py-2 text-center text-sm text-brand-800 dark:border-brand-800 dark:bg-brand-950/40 dark:text-brand-200">
          {success}
        </p>
      )}
    </div>
  );
}
