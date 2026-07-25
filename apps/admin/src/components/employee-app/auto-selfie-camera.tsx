"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

type FaceHint =
  | "loading"
  | "starting"
  | "no_face"
  | "many_faces"
  | "too_far"
  | "too_close"
  | "move_left"
  | "move_right"
  | "move_up"
  | "move_down"
  | "hold"
  | "capturing"
  | "done";

const HINT_CKB: Record<FaceHint, string> = {
  loading: "ئامادەکردنی پشکنینی ڕووخسار...",
  starting: "کردنەوەی کامێرا...",
  no_face: "ڕووخسارت لەناو بازنەکەدا دابنێ",
  many_faces: "تەنها یەک کەس لەبەردەم کامێرا بێت",
  too_far: "نزیکتر بێرە — ڕووخسار بچووکە",
  too_close: "کەمێک دوورتر بێرە — ڕووخسار زۆر گەورەیە",
  move_left: "کەمێک بەرەو چەپ بڕۆ (یان مۆبایل بجوڵێنە)",
  move_right: "کەمێک بەرەو ڕاست بڕۆ (یان مۆبایل بجوڵێنە)",
  move_up: "کەمێک سەرت بەرزتر بکە / مۆبایل دابەزێنە",
  move_down: "کەمێک سەرت نزمتر بکە / مۆبایل بەرزتر بکە",
  hold: "باشە — جێگیر بمێنەوە...",
  capturing: "وێنە دەگیرێت...",
  done: "وێنە گیرا",
};

type DetectionBox = { x: number; y: number; w: number; h: number; score: number };

type Detector = {
  detectForVideo: (
    video: HTMLVideoElement,
    timestamp: number,
  ) => { detections: Array<{ boundingBox?: { originX: number; originY: number; width: number; height: number }; categories?: Array<{ score?: number }> }> };
  close?: () => void;
};

let detectorPromise: Promise<Detector | null> | null = null;

async function getFaceDetector(): Promise<Detector | null> {
  if (detectorPromise) return detectorPromise;
  detectorPromise = (async () => {
    try {
      const vision = await import("@mediapipe/tasks-vision");
      const fileset = await vision.FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm",
      );
      const detector = await vision.FaceDetector.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        minDetectionConfidence: 0.55,
      });
      return detector as Detector;
    } catch {
      try {
        const vision = await import("@mediapipe/tasks-vision");
        const fileset = await vision.FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm",
        );
        const detector = await vision.FaceDetector.createFromOptions(fileset, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",
            delegate: "CPU",
          },
          runningMode: "VIDEO",
          minDetectionConfidence: 0.55,
        });
        return detector as Detector;
      } catch {
        return null;
      }
    }
  })();
  return detectorPromise;
}

function evaluateFace(
  box: DetectionBox,
  frameW: number,
  frameH: number,
): FaceHint {
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const faceRatio = box.h / frameH;
  const midX = frameW / 2;
  const midY = frameH / 2;
  // Mirrored preview: user moves right → face appears left on mirrored view
  // Guidance based on mirrored coordinates so instructions feel natural
  const dx = (cx - midX) / frameW;
  const dy = (cy - midY) / frameH;

  if (faceRatio < 0.22) return "too_far";
  if (faceRatio > 0.58) return "too_close";
  // Video preview is CSS-mirrored (like a mirror). Flip horizontal hints.
  if (dx < -0.12) return "move_left";
  if (dx > 0.12) return "move_right";
  if (dy < -0.12) return "move_down";
  if (dy > 0.14) return "move_up";
  return "hold";
}

function snapshotVideo(video: HTMLVideoElement): Promise<File | null> {
  const w = video.videoWidth || 640;
  const h = video.videoHeight || 480;
  if (w < 2 || h < 2) return Promise.resolve(null);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve(null);
  // Store unmirrored (natural camera) image
  ctx.drawImage(video, 0, 0, w, h);
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          resolve(null);
          return;
        }
        resolve(
          new File([blob], `selfie-${Date.now()}.jpg`, { type: "image/jpeg" }),
        );
      },
      "image/jpeg",
      0.9,
    );
  });
}

export function AutoSelfieCamera({
  onCaptured,
  onError,
}: {
  onCaptured: (file: File, previewUrl: string) => void;
  onError?: (message: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const goodFramesRef = useRef(0);
  const capturingRef = useRef(false);
  const lastTsRef = useRef(-1);
  const onCapturedRef = useRef(onCaptured);
  const onErrorRef = useRef(onError);
  const [hint, setHint] = useState<FaceHint>("starting");
  const [ovalOk, setOvalOk] = useState(false);
  const [ready, setReady] = useState(false);

  onCapturedRef.current = onCaptured;
  onErrorRef.current = onError;

  const stop = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      setHint("loading");
      const detector = await getFaceDetector();
      if (cancelled) return;

      if (!navigator.mediaDevices?.getUserMedia) {
        onErrorRef.current?.("ئەم وێبگەڕە پشتگیری کامێرا ناکات");
        return;
      }

      setHint("starting");
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
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: true,
          });
        } catch {
          onErrorRef.current?.(
            "نەتوانرا کامێرا بکرێتەوە — مۆڵەتی کامێرا لە ڕێکخستنی مۆبایل بدە",
          );
          return;
        }
      }
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      video.muted = true;
      video.setAttribute("playsinline", "true");
      await video.play().catch(() => undefined);
      setReady(true);

      if (!detector) {
        setHint("hold");
        window.setTimeout(async () => {
          if (cancelled || capturingRef.current) return;
          capturingRef.current = true;
          setHint("capturing");
          const file = await snapshotVideo(video);
          if (!file) {
            capturingRef.current = false;
            onErrorRef.current?.("وێنەگرتن سەرنەکەوت");
            return;
          }
          const url = URL.createObjectURL(file);
          setHint("done");
          stop();
          onCapturedRef.current(file, url);
        }, 2200);
        return;
      }

      const loop = () => {
        if (cancelled || capturingRef.current) return;
        const v = videoRef.current;
        if (!v || v.readyState < 2) {
          rafRef.current = requestAnimationFrame(loop);
          return;
        }

        const now = performance.now();
        if (now - lastTsRef.current < 90) {
          rafRef.current = requestAnimationFrame(loop);
          return;
        }
        lastTsRef.current = now;

        let boxes: DetectionBox[] = [];
        try {
          const result = detector.detectForVideo(v, now);
          boxes = (result.detections ?? [])
            .map((d) => {
              const b = d.boundingBox;
              if (!b) return null;
              return {
                x: b.originX,
                y: b.originY,
                w: b.width,
                h: b.height,
                score: d.categories?.[0]?.score ?? 0,
              };
            })
            .filter((x): x is DetectionBox => Boolean(x && x.score >= 0.5));
        } catch {
          boxes = [];
        }

        const vw = v.videoWidth || 1;
        const vh = v.videoHeight || 1;
        let next: FaceHint = "no_face";
        if (boxes.length === 0) next = "no_face";
        else if (boxes.length > 1) next = "many_faces";
        else next = evaluateFace(boxes[0]!, vw, vh);

        setHint(next);
        const good = next === "hold";
        setOvalOk(good);

        if (good) {
          goodFramesRef.current += 1;
          if (goodFramesRef.current >= 10) {
            capturingRef.current = true;
            setHint("capturing");
            void (async () => {
              await new Promise((r) => setTimeout(r, 180));
              const file = await snapshotVideo(v);
              if (!file) {
                capturingRef.current = false;
                goodFramesRef.current = 0;
                onErrorRef.current?.(
                  "وێنەگرتن سەرنەکەوت — دووبارە هەوڵ بدە",
                );
                rafRef.current = requestAnimationFrame(loop);
                return;
              }
              const url = URL.createObjectURL(file);
              setHint("done");
              stop();
              onCapturedRef.current(file, url);
            })();
            return;
          }
        } else {
          goodFramesRef.current = 0;
        }

        rafRef.current = requestAnimationFrame(loop);
      };

      rafRef.current = requestAnimationFrame(loop);
    }

    void boot();
    return () => {
      cancelled = true;
      stop();
    };
  }, [stop]);

  return (
    <div className="space-y-2">
      <div className="relative mx-auto overflow-hidden rounded-2xl bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={cn(
            "mx-auto h-56 w-full object-cover transition",
            ready ? "opacity-100" : "opacity-40",
          )}
          style={{ transform: "scaleX(-1)" }}
        />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div
            className={cn(
              "h-40 w-32 rounded-[50%] border-2 transition",
              ovalOk
                ? "border-emerald-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]"
                : "border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]",
            )}
          />
        </div>
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 px-3 py-2 text-center text-sm font-medium text-white",
            ovalOk ? "bg-emerald-700/85" : "bg-black/70",
          )}
        >
          {HINT_CKB[hint]}
        </div>
      </div>
      <p className="text-center text-[11px] text-ink-muted">
        سیستەم خۆکار وێنە دەگرێت کاتێک ڕووخسارت جوان و جێگیر بێت
      </p>
    </div>
  );
}
