"use client";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle, X, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { getApiError } from "@/lib/api/errors";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import * as tus from "tus-js-client";

interface VideoUploadProps {
  currentUrl?: string | null;
  onUploadComplete: (url: string) => void;
  onDurationChange?: (duration: number) => void;
  courseId: string;
  lessonId: string;
}

interface EncodingStatusResponse {
  jobId: string;
  status: string;
  progress: number | undefined;
  errorMessage: string | undefined;
  lessonId: string;
  courseId: string;
}

export function VideoUpload({
  currentUrl,
  onUploadComplete,
  onDurationChange,
  courseId,
  lessonId,
}: VideoUploadProps) {
  const [removed, setRemoved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [encoding, setEncoding] = useState(false);
  const [encodingJobId, setEncodingJobId] = useState<string | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const onUploadCompleteRef = useRef(onUploadComplete);

  useEffect(() => {
    onUploadCompleteRef.current = onUploadComplete;
  }, [onUploadComplete]);

  useEffect(() => {
    if (!encoding || !encodingJobId) return;

    const jobId = encodingJobId;
    let active = true;

    const intervalId = setInterval(() => {
      apiClient
        .get<EncodingStatusResponse>(`/video-encoding/status/${jobId}`)
        .then(({ data }) => {
          if (!active) return;
          if (data.status === "COMPLETED") {
            clearInterval(intervalId);
            active = false;
            setEncoding(false);
            setEncodingJobId(null);
            toast.success("Video encoded successfully.");
            onUploadCompleteRef.current(jobId);
          } else if (data.status === "FAILED") {
            clearInterval(intervalId);
            active = false;
            setEncoding(false);
            setEncodingJobId(null);
            toast.error(data.errorMessage ?? "Video encoding failed.");
          }
        })
        .catch(() => {});
    }, 5000);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [encoding, encodingJobId]);

  const handleRemove = () => {
    onUploadComplete("");
    setRemoved(true);
    if (localPreviewUrl) {
      URL.revokeObjectURL(localPreviewUrl);
      setLocalPreviewUrl(null);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      toast.error("Please select a video file");
      return;
    }

    if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    setLocalPreviewUrl(URL.createObjectURL(file));

    if (onDurationChange) {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        const durationSeconds = Math.round(video.duration);
        onDurationChange(durationSeconds);
      };
      video.src = URL.createObjectURL(file);
    }

    setUploading(true);
    setProgress(0);

    try {
      const { data } = await apiClient.post<{
        videoId: string;
        tusUploadUrl: string;
        tusAuth: {
          AuthorizationSignature: string;
          AuthorizationExpire: number;
          VideoId: string;
          LibraryId: string;
        };
      }>("/video-encoding/create-upload", {
        courseId,
        lessonId,
        title: file.name,
      });

      await new Promise<void>((resolve, reject) => {
        const upload = new tus.Upload(file, {
          endpoint: data.tusUploadUrl,
          retryDelays: [0, 1000, 3000, 5000],
          metadata: {
            filetype: file.type,
            title: file.name,
          },
          headers: {
            AuthorizationSignature: data.tusAuth.AuthorizationSignature,
            AuthorizationExpire: String(data.tusAuth.AuthorizationExpire),
            VideoId: data.tusAuth.VideoId,
            LibraryId: data.tusAuth.LibraryId,
          },
          onError: (error) => {
            reject(error);
          },
          onProgress: (bytesUploaded, bytesTotal) => {
            const percentage = Math.round(
              (bytesUploaded / bytesTotal) * 100,
            );
            setProgress(percentage);
          },
          onSuccess: () => {
            resolve();
          },
        });

        upload.start();
      });

      setProgress(100);
      setUploading(false);
      setEncodingJobId(data.videoId);
      setEncoding(true);
      toast.success("Upload complete. Encoding in progress…");
    } catch (error: unknown) {
      setProgress(0);
      setUploading(false);
      toast.error(getApiError(error, "Upload failed").message);
    }
  };

  const showUpload = !currentUrl || removed;

  return (
    <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-sm font-medium">Video Content</h4>
      </div>

      {currentUrl && !removed && (
        <div className="flex flex-col gap-2 bg-background p-3 rounded border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="truncate max-w-[200px]">Video uploaded</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              disabled={uploading || encoding}
            >
              <X className="h-4 w-4 mr-2" />
              Remove
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Bunny Stream will automatically transcode the video for playback.
          </p>
        </div>
      )}

      {localPreviewUrl && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Preview</p>
          <video
            src={localPreviewUrl}
            controls
            className="w-full max-h-[300px] rounded-lg border bg-black"
          />
        </div>
      )}

      {uploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Uploading video...</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} />
        </div>
      )}

      {encoding && (
        <div className="flex items-center gap-2 text-sm text-blue-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Processing video...</span>
        </div>
      )}

      {showUpload && !uploading && !encoding && (
        <div className="space-y-2">
          <Input
            type="file"
            accept="video/*"
            onChange={handleFileChange}
            disabled={uploading || encoding}
            className="cursor-pointer"
          />
          <p className="text-xs text-muted-foreground">
            Supported formats: MP4, MOV, WebM. Max file size: 5GB. Resumable
            upload.
          </p>
        </div>
      )}
    </div>
  );
}
