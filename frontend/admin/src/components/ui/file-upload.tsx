import { useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api/client";
import { AxiosError } from "axios";

interface FileUploadProps {
  onUploadComplete: (key: string, url: string) => void;
  label?: string;
  folder?: string;
  accept?: string;
  compact?: boolean;
  className?: string;
  onFileSelect?: (file: File) => void;
}

export function FileUpload({
  onUploadComplete,
  onFileSelect,
  folder = "courses",
  accept = "image/*",
  label = "Upload File",
  className,
  compact = false,
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (onFileSelect) {
      onFileSelect(file);
    }

    setUploading(true);
    setProgress(0);

    try {
      // Upload via backend proxy to Bunny Storage
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);

      const { data } = await apiClient.post<{ url: string; key: string }>(
        "/files/storage/upload-url",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total && progressEvent.total > 0) {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total,
              );
              setProgress(percentCompleted);
            }
          },
          timeout: 300000,
        },
      );

      setProgress(100);
      toast.success("Upload successful");
      onUploadComplete(data.key, data.url);
    } catch (error: unknown) {
      setProgress(0);
      const err = error as AxiosError<{ message?: string }>;
      const errorMessage =
        err.response?.data?.message || err.message || "Upload failed";
      toast.error(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  if (compact)
    return (
      <div className={cn("relative w-full", className)}>
        <div className="group relative flex h-8 w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-muted-foreground/40 bg-background px-3 text-xs text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground">
          <input
            type="file"
            accept={accept}
            onChange={handleFileChange}
            disabled={uploading}
            className="absolute inset-0 z-10 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />
          {uploading ? (
            <>
              <Loader2 className="size-3.5 animate-spin text-primary" />
              <span className="font-medium">{progress}%</span>
            </>
          ) : (
            <>
              <UploadCloud className="size-3.5 group-hover:text-primary transition-colors" />
              <span className="font-medium">{label}</span>
            </>
          )}
        </div>
      </div>
    );

  return (
    <div className={cn("grid w-full max-w-sm items-center gap-1.5", className)}>
      <div className="relative group cursor-pointer border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 hover:border-primary/50 transition-colors">
        <input
          type="file"
          accept={accept}
          onChange={handleFileChange}
          disabled={uploading}
          className="absolute inset-0 z-10 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />
        <div className="flex flex-col items-center justify-center space-y-2 text-center">
          {uploading ? (
            <div className="flex flex-col items-center w-full space-y-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <Progress value={progress} className="w-[60%]" />
              <span className="text-sm text-muted-foreground">{progress}%</span>
            </div>
          ) : (
            <>
              <UploadCloud className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
              <div className="space-y-1">
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">
                  Click or drag and drop
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
