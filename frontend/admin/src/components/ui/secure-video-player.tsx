"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, FileVideo, RefreshCw, Bug, WifiOff } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { getApiError } from "@/lib/api/errors";
import { useAuthStore } from "@/lib/store/auth-store";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface DebugInfo {
  lessonId: string;
  courseId: string;
  lessonStatus: string;
  encodingJob: {
    jobId: string;
    status: string;
    inputPath: string;
    outputPath: string;
    errorMessage?: string;
  } | null;
  expectedOutputPath: string;
  fileExists: boolean;
  diagnosis: string;
}

type PlayerError =
  | { kind: "network"; message: string }
  | { kind: "auth"; message: string }
  | { kind: "missing"; message: string }
  | { kind: "other"; message: string };

interface SecureVideoPlayerProps {
  lessonId?: string;
  videoKey?: string;
  className?: string;
  autoPlay?: boolean;
  showStatus?: boolean;
}

export function SecureVideoPlayer({
  lessonId,
  videoKey,
  className,
  autoPlay = false,
}: SecureVideoPlayerProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [error, setError] = useState<PlayerError | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const { token } = useAuthStore();

  const fetchDebugInfo = useCallback(async () => {
    if (!lessonId) return;
    try {
      const { data } = await apiClient.get<DebugInfo>(
        `/video-encoding/debug/${lessonId}`,
      );
      setDebugInfo(data);
    } catch {
      // swallow — diagnostics are best-effort
    }
  }, [lessonId]);

  // Anti-piracy: block right-click on the player container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const prevent = (e: Event) => e.preventDefault();
    container.addEventListener("contextmenu", prevent);
    return () => container.removeEventListener("contextmenu", prevent);
  }, []);

  // Anti-piracy: pause via postMessage when tab is hidden
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        const iframe = containerRef.current?.querySelector("iframe");
        if (iframe?.contentWindow) {
          iframe.contentWindow.postMessage(
            '{"event":"command","func":"pauseVideo"}',
            "*",
          );
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function fetchUrl() {
      // Direct external URL — no fetch needed
      if (videoKey?.startsWith("http")) {
        if (isMounted) {
          setSignedUrl(videoKey);
          setIsLoading(false);
        }
        return;
      }

      if (!lessonId && !videoKey) {
        if (isMounted) {
          setError({
            kind: "missing",
            message: "No video uploaded for this lesson yet.",
          });
          setIsLoading(false);
        }
        return;
      }

      if (!token && lessonId) {
        if (isMounted) {
          setError({
            kind: "auth",
            message: "You need to be signed in to preview this video.",
          });
          setIsLoading(false);
        }
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        if (lessonId) {
          const { data } = await apiClient.get<{ signedUrl?: string }>(
            `/lessons/${lessonId}/play`,
          );
          if (!isMounted) return;
          if (!data.signedUrl) {
            setError({
              kind: "missing",
              message:
                "No video has been uploaded for this lesson yet, or encoding is still in progress.",
            });
            return;
          }
          setSignedUrl(data.signedUrl);
        } else if (videoKey) {
          const { data } = await apiClient.get<{ url: string }>(
            "/files/storage/download-url",
            { params: { key: videoKey } },
          );
          if (!isMounted) return;
          setSignedUrl(data.url);
        }
      } catch (err) {
        if (!isMounted) return;
        const apiErr = getApiError(err, "Couldn't load video.");

        if (apiErr.isNetworkError) {
          setError({
            kind: "network",
            message:
              "Couldn't reach the video service. Check your connection and try again.",
          });
        } else if (apiErr.statusCode === 401 || apiErr.statusCode === 403) {
          setError({
            kind: "auth",
            message: apiErr.message,
          });
        } else if (apiErr.statusCode === 404) {
          setError({
            kind: "missing",
            message: "No video uploaded for this lesson yet.",
          });
        } else {
          setError({
            kind: "other",
            message: apiErr.message,
          });
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchUrl();
    return () => {
      isMounted = false;
    };
  }, [lessonId, videoKey, token, refreshKey]);

  if (isLoading) {
    return (
      <div
        className={cn(
          "flex aspect-video items-center justify-center rounded-xl border border-border bg-muted",
          className,
        )}
      >
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading preview…
        </div>
      </div>
    );
  }

  if (error || !signedUrl) {
    const isMissing = error?.kind === "missing";
    const isNetwork = error?.kind === "network";

    return (
      <div
        className={cn(
          "flex aspect-video flex-col items-center justify-center gap-3 rounded-xl border border-border bg-muted px-6 py-8 text-center",
          className,
        )}
      >
        <span
          className={cn(
            "flex size-12 items-center justify-center rounded-full border",
            isMissing
              ? "border-border bg-background text-muted-foreground"
              : "border-destructive/30 bg-destructive/10 text-destructive",
          )}
        >
          {isNetwork ? (
            <WifiOff className="size-5" />
          ) : (
            <FileVideo className="size-5" />
          )}
        </span>
        <p className="font-display text-base font-medium text-foreground">
          {isMissing
            ? "No video yet."
            : isNetwork
              ? "Service unreachable."
              : "Couldn't load preview."}
        </p>
        <p className="max-w-sm text-xs text-muted-foreground">
          {error?.message ?? "Video not available."}
        </p>
        {lessonId && (
          <div className="flex flex-wrap gap-2 pt-1">
            {!isMissing && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRefreshKey((k) => k + 1)}
                className="gap-1.5"
              >
                <RefreshCw className="size-3.5" />
                Retry
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchDebugInfo}
              className="gap-1.5 text-muted-foreground"
            >
              <Bug className="size-3.5" />
              Diagnose
            </Button>
          </div>
        )}
        {debugInfo && (
          <div className="mt-2 w-full max-w-md rounded-lg border border-border bg-background p-3 text-left text-[11px]">
            <p className="font-medium text-foreground">
              Diagnosis · {debugInfo.diagnosis}
            </p>
            <dl className="mt-2 grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-muted-foreground">
              <dt>Lesson status</dt>
              <dd className="text-foreground">{debugInfo.lessonStatus}</dd>
              <dt>File exists</dt>
              <dd className="text-foreground">
                {debugInfo.fileExists ? "Yes" : "No"}
              </dd>
              {debugInfo.encodingJob && (
                <>
                  <dt>Encoding</dt>
                  <dd className="text-foreground">
                    {debugInfo.encodingJob.status}
                  </dd>
                  {debugInfo.encodingJob.errorMessage && (
                    <>
                      <dt>Error</dt>
                      <dd className="text-destructive">
                        {debugInfo.encodingJob.errorMessage}
                      </dd>
                    </>
                  )}
                </>
              )}
            </dl>
          </div>
        )}
      </div>
    );
  }

  const embedUrl = signedUrl.includes("iframe.mediadelivery.net")
    ? `${signedUrl}${signedUrl.includes("?") ? "&" : "?"}autoplay=${autoPlay}&preload=true&responsive=true`
    : signedUrl;

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
        className="absolute inset-0 size-full border-0"
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
        referrerPolicy="origin"
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ zIndex: 1 }}
        aria-hidden
      />
    </div>
  );
}
