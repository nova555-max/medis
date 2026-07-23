"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type SafeImageProps = {
  src: string | null | undefined;
  alt: string;
  className?: string;
  fallback?: ReactNode;
};

/**
 * Renders an image with graceful fallback when the URL 403s / fails
 * (private storage, expired signed URL, missing object, etc.).
 */
export function SafeImage({ src, alt, className, fallback }: SafeImageProps) {
  const [failed, setFailed] = useState(false);
  const usable = Boolean(src && !failed);

  if (!usable) {
    return (
      <>
        {fallback ?? (
          <div
            className={cn(
              "flex items-center justify-center rounded-xl bg-brand-600 text-white",
              className,
            )}
            aria-hidden
          >
            م
          </div>
        )}
      </>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src!}
      alt={alt}
      className={className}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}
