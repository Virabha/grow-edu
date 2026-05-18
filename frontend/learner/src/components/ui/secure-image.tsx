"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SecureImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
}

function SecureImage({ src, alt, className, ...props }: SecureImageProps) {
  if (!src) {
    return (
      <div
        className={cn("bg-muted flex items-center justify-center", className)}
      >
        <span className="text-muted-foreground text-sm">{alt}</span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className={cn("object-cover", className)}
      loading="lazy"
      {...props}
    />
  );
}

export { SecureImage };
