import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import Image from "next/image";
interface EmptyStateProps {
    title: string;
    description?: string;
    icon?: ReactNode;
    illustration?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
    className?: string;
}
export function EmptyState({ title, description, icon, illustration, action, className, }: EmptyStateProps) {
    return (<div className={cn("flex flex-col items-center justify-center py-8 px-4 text-center animate-in fade-in duration-500", className)}>
      {illustration ? (<div className="relative h-32 w-32 mb-4">
          <Image src={illustration} alt={title} fill className="object-contain" priority/>
        </div>) : icon ? (<div className="mb-3 text-muted-foreground">{icon}</div>) : null}
      <h3 className="text-base font-bold text-foreground mb-1">{title}</h3>
      {description && (<p className="text-xs text-muted-foreground max-w-sm mb-4 leading-relaxed">
          {description}
        </p>)}
      {action && (<Button onClick={action.onClick} variant="default" size="default" className="px-5">
          {action.label}
        </Button>)}
    </div>);
}
