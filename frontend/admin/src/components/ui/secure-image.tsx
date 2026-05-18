"use client";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api/client";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ImageIcon } from "lucide-react";

interface SecureImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
}

export function SecureImage({
  src,
  alt,
  className,
  ...props
}: SecureImageProps) {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!src || src.startsWith("http") || src.startsWith("blob:")) {
      setResolvedUrl(src);
      setLoading(false);
      return;
    }

    // Legacy S3 keys still in DB - resolve via backend (which now returns CDN URLs)
    const fetchUrl = async () => {
      try {
        setLoading(true);
        const { data } = await apiClient.get<{ url: string }>(
          `/files/storage/download-url?key=${encodeURIComponent(src)}`,
        );
        setResolvedUrl(data.url);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchUrl();
  }, [src]);

  if (loading) {
    return <Skeleton className={cn("w-full h-full", className)} />;
  }

  if (error || !resolvedUrl) {
    return (
      <div
        className={cn(
          "w-full h-full flex items-center justify-center bg-muted text-muted-foreground",
          className,
        )}
      >
        <ImageIcon className="h-8 w-8" />
      </div>
    );
  }

  return <img src={resolvedUrl} alt={alt} className={className} {...props} />;
}
