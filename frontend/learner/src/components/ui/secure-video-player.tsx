"use client";

import { useState, useEffect, useRef } from "react";
import { Hourglass, Loader2, Lock, RefreshCw } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { getApiError } from "@/lib/api/errors";
import { useAuthStore } from "@/lib/store/auth-store";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface SecureVideoPlayerProps {
  lessonId?: string;
  className?: string;
  autoPlay?: boolean;
}

type ErrorKind = "auth" | "processing" | "generic";

interface PlayerError {
  kind: ErrorKind;
  message: string;
}

const WATERMARK_POSITIONS = [
  { top: "10%", left: "10%" },
  { top: "10%", left: "60%" },
  { top: "50%", left: "35%" },
  { top: "75%", left: "10%" },
  { top: "75%", left: "60%" },
];

export function SecureVideoPlayer({
  lessonId,
  className,
  autoPlay = false,
}: SecureVideoPlayerProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [error, setError] = useState<PlayerError | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [posIdx, setPosIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const user = useAuthStore((s) => s.user);

  // Disable right-click on the player container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const prevent = (e: Event) => e.preventDefault();
    container.addEventListener("contextmenu", prevent);
    return () => container.removeEventListener("contextmenu", prevent);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setPosIdx((i) => (i + 1) % WATERMARK_POSITIONS.length);
    }, 15_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function fetchUrl() {
      if (!lessonId) {
        setIsLoading(false);
        return;
      }
      try {
        setIsLoading(true);
        setError(null);
        const { data } = await apiClient.get<{ signedUrl: string }>(
          `/lessons/${lessonId}/play`,
        );
        if (isMounted) {
          setSignedUrl(data.signedUrl);
          setError(null);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const apiErr = getApiError(err, "Unknown error");
          const status = apiErr.statusCode;
          const msg = apiErr.message;
          if (status === 401) {
            setError({ kind: "auth", message: "Authentication required." });
          } else if (/not ready/i.test(msg)) {
            setError({
              kind: "processing",
              message:
                "This lesson is still being prepared. Check back in a few minutes.",
            });
          } else {
            setError({ kind: "generic", message: msg });
          }
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    fetchUrl();
    return () => {
      isMounted = false;
    };
  }, [lessonId]);

  if (isLoading) {
    return (
      <div
        className={cn(
          "flex aspect-video items-center justify-center rounded-xl bg-black/90",
          className,
        )}
      >
        <Loader2 className="size-7 animate-spin text-white/80" />
      </div>
    );
  }

  if (error || !signedUrl) {
    const kind = error?.kind ?? "generic";
    const Icon = kind === "processing" ? Hourglass : Lock;
    const accent = kind === "processing" ? "text-amber-300" : "text-rose-300";
    return (
      <div
        className={cn(
          "flex aspect-video flex-col items-center justify-center gap-3 rounded-xl bg-neutral-900 p-6 text-center text-white",
          className,
        )}
      >
        <Icon className={cn("size-9", accent)} />
        <p className="max-w-sm text-sm text-white/80">
          {error?.message ?? "Video not found."}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.reload()}
          className="gap-1.5 border-white/20 bg-transparent text-white hover:bg-white/10"
        >
          <RefreshCw className="size-3.5" />
          Retry
        </Button>
      </div>
    );
  }

  const embedUrl = signedUrl.includes("iframe.mediadelivery.net")
    ? `${signedUrl}${signedUrl.includes("?") ? "&" : "?"}autoplay=${autoPlay}&preload=true&responsive=true`
    : signedUrl;

  const watermarkLabel = user?.email ?? user?.id ?? "";
  const pos = WATERMARK_POSITIONS[posIdx] ?? { top: "10%", left: "10%" };

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative aspect-video select-none overflow-hidden rounded-xl bg-black",
        className,
      )}
      style={{ userSelect: "none", WebkitUserSelect: "none" }}
    >
      <iframe
        src={embedUrl}
        loading="lazy"
        className="absolute inset-0 h-full w-full border-0"
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
        referrerPolicy="origin"
      />

      {/* Transparent interaction-blocker — prevents iframe focus stealing */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ zIndex: 1 }}
        aria-hidden
      />

      {/* Rotating user-identity watermark — anti-piracy */}
      {watermarkLabel && (
        <div
          aria-hidden
          className="pointer-events-none absolute transition-all duration-1000"
          style={{
            top: pos.top,
            left: pos.left,
            zIndex: 2,
            opacity: 0.18,
            transform: "rotate(-25deg)",
            whiteSpace: "nowrap",
            color: "#ffffff",
            fontSize: "clamp(10px, 1.2vw, 14px)",
            fontFamily: "monospace",
            fontWeight: 600,
            letterSpacing: "0.05em",
            textShadow: "0 1px 3px rgba(0,0,0,0.8)",
          }}
        >
          {watermarkLabel}
        </div>
      )}
    </div>
  );
}
