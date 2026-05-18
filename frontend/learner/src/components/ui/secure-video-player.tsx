"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Lock, RefreshCw } from "lucide-react";
import { AxiosError } from "axios";
import { apiClient } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface SecureVideoPlayerProps {
  lessonId?: string;
  className?: string;
  autoPlay?: boolean;
}

export function SecureVideoPlayer({
  lessonId,
  className,
  autoPlay = false,
}: SecureVideoPlayerProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const prevent = (e: Event) => e.preventDefault();
    container.addEventListener("contextmenu", prevent);
    return () => container.removeEventListener("contextmenu", prevent);
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
          `/lessons/${lessonId}/play`
        );
        if (isMounted) {
          setSignedUrl(data.signedUrl);
          setError(null);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const axiosErr = err as AxiosError<{ message?: string }>;
          const msg =
            axiosErr.response?.data?.message ?? axiosErr.message ?? "Unknown error";
          setError(
            axiosErr.response?.status === 401
              ? "Authentication required"
              : `Failed to load: ${msg}`
          );
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
          "flex items-center justify-center bg-black/90 aspect-video rounded-md",
          className
        )}
      >
        <Loader2 className="h-8 w-8 animate-spin text-white" />
        <span className="ml-2 text-sm text-white">Loading...</span>
      </div>
    );
  }

  if (error || !signedUrl) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center bg-gray-900 aspect-video rounded-md p-4 text-white",
          className
        )}
      >
        <Lock className="mb-2 h-8 w-8 text-red-400" />
        <p className="mb-3 text-sm">{error ?? "Video not found"}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.reload()}
          className="text-xs"
        >
          <RefreshCw className="mr-1 h-3 w-3" />
          Retry
        </Button>
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
        "relative aspect-video select-none overflow-hidden rounded-md bg-black",
        className
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
      <div
        className="pointer-events-none absolute inset-0"
        style={{ zIndex: 1 }}
        aria-hidden
      />
    </div>
  );
}
