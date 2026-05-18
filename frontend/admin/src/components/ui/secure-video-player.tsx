"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, Lock, Bug, RefreshCw } from "lucide-react";
import axios, { AxiosError } from "axios";
import { useAuthStore } from "@/lib/store/auth-store";
import { env } from "@/lib/env";
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

interface SecureVideoPlayerProps {
    lessonId?: string;
    videoKey?: string;
    className?: string;
    autoPlay?: boolean;
    showStatus?: boolean;
}

export function SecureVideoPlayer({ lessonId, videoKey, className, autoPlay = false }: SecureVideoPlayerProps) {
    const [signedUrl, setSignedUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [status, setStatus] = useState<string | null>(null);
    const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const { token } = useAuthStore();

    const fetchDebugInfo = useCallback(async () => {
        if (!lessonId || !token) return;
        try {
            const baseUrl = env.NEXT_PUBLIC_API_URL;
            const { data } = await axios.get<DebugInfo>(`${baseUrl}/video-encoding/debug/${lessonId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDebugInfo(data);
        } catch (err) {
            void err;
        }
    }, [lessonId, token]);

    // Anti-piracy: block right-click on the player container
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const prevent = (e: Event) => e.preventDefault();
        container.addEventListener("contextmenu", prevent);
        return () => container.removeEventListener("contextmenu", prevent);
    }, []);

    // Anti-piracy: detect screen recording / visibility changes
    useEffect(() => {
        const handleVisibility = () => {
            if (document.hidden) {
                // Pause playback via postMessage when tab is hidden
                const iframe = containerRef.current?.querySelector("iframe");
                if (iframe?.contentWindow) {
                    iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo"}', "*");
                }
            }
        };
        document.addEventListener("visibilitychange", handleVisibility);
        return () => document.removeEventListener("visibilitychange", handleVisibility);
    }, []);

    useEffect(() => {
        let isMounted = true;
        async function fetchUrl() {
            if (!lessonId && !videoKey) {
                setIsLoading(false);
                return;
            }
            if (!token && lessonId) {
                setError("Authentication required");
                setIsLoading(false);
                return;
            }
            try {
                setIsLoading(true);
                setError(null);
                const baseUrl = env.NEXT_PUBLIC_API_URL;
                if (lessonId) {
                    const { data } = await axios.get(`${baseUrl}/lessons/${lessonId}/play`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (isMounted) {
                        setSignedUrl(data.signedUrl);
                        setStatus(data.status || null);
                        setError(null);
                    }
                } else if (videoKey) {
                    if (videoKey.startsWith("http")) {
                        setSignedUrl(videoKey);
                        setIsLoading(false);
                        return;
                    }
                    const { data } = await axios.get(`${baseUrl}/files/storage/download-url`, {
                        params: { key: videoKey },
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (isMounted) {
                        setSignedUrl(data.url);
                        setError(null);
                    }
                }
            } catch (err: unknown) {
                if (isMounted) {
                    const axiosErr = err as AxiosError<{ message?: string }>;
                    const msg = axiosErr.response?.data?.message || axiosErr.message;
                    setError(`Failed to load: ${msg}`);
                }
            } finally {
                if (isMounted) setIsLoading(false);
            }
        }
        fetchUrl();
        return () => { isMounted = false; };
    }, [lessonId, videoKey, token]);

    if (isLoading) {
        return (
            <div className={cn("flex items-center justify-center bg-black/90 aspect-video rounded-md", className)}>
                <Loader2 className="h-8 w-8 text-white animate-spin" />
                <span className="ml-2 text-white text-sm">Loading secure content...</span>
            </div>
        );
    }

    if (error || !signedUrl) {
        return (
            <div className={cn("flex flex-col items-center justify-center bg-gray-900 aspect-video rounded-md text-white p-4", className)}>
                <Lock className="h-8 w-8 mb-2 text-red-400" />
                <p className="text-sm mb-3">{error || "Video not found"}</p>
                {lessonId && (
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={fetchDebugInfo} className="text-xs">
                            <Bug className="h-3 w-3 mr-1" />
                            Diagnose Issue
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="text-xs">
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Retry
                        </Button>
                    </div>
                )}
                {debugInfo && (
                    <div className="mt-4 p-3 bg-gray-800 rounded-md text-xs text-left w-full max-w-md overflow-auto max-h-48">
                        <p className="font-bold text-yellow-400 mb-2">Diagnosis: {debugInfo.diagnosis}</p>
                        <p><span className="text-gray-400">Lesson Status:</span> {debugInfo.lessonStatus}</p>
                        <p><span className="text-gray-400">Expected Path:</span> {debugInfo.expectedOutputPath}</p>
                        <p><span className="text-gray-400">File Exists:</span> {debugInfo.fileExists ? "Yes" : "No"}</p>
                        {debugInfo.encodingJob ? (
                            <>
                                <p className="mt-2 font-bold text-blue-400">Encoding Job:</p>
                                <p><span className="text-gray-400">Status:</span> {debugInfo.encodingJob.status}</p>
                                <p><span className="text-gray-400">Output:</span> {debugInfo.encodingJob.outputPath}</p>
                                {debugInfo.encodingJob.errorMessage && (
                                    <p><span className="text-red-400">Error:</span> {debugInfo.encodingJob.errorMessage}</p>
                                )}
                            </>
                        ) : (
                            <p className="mt-2 text-orange-400">No encoding job found</p>
                        )}
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
            className={cn("relative aspect-video rounded-md overflow-hidden bg-black select-none", className)}
            style={{ userSelect: "none", WebkitUserSelect: "none" }}
        >
            <iframe
                src={embedUrl}
                loading="lazy"
                className="absolute inset-0 w-full h-full border-0"
                allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                referrerPolicy="origin"
            />
            {/* Anti-piracy: transparent overlay to block drag/inspect on the iframe */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{ zIndex: 1 }}
            />
        </div>
    );
}
