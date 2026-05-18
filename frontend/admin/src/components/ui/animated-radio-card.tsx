"use client";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
interface AnimatedRadioCardProps {
    selected: boolean;
    onClick: () => void;
    title: string;
    description?: string;
    icon?: React.ReactNode;
    className?: string;
}
export function AnimatedRadioCard({ selected, onClick, title, description, icon, className, }: AnimatedRadioCardProps) {
    return (<motion.div whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }} onClick={onClick} className={cn("relative flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-colors duration-200", selected
            ? "border-primary bg-primary/5 shadow-sm"
            : "border-muted/40 bg-card hover:border-primary/30 hover:bg-accent/50", className)}>
      {selected && (<motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-0.5">
          <Check className="w-3 h-3"/>
        </motion.div>)}

      {icon && (<motion.div animate={{
                scale: selected ? 1.1 : 1,
                color: selected ? "var(--primary)" : "var(--muted-foreground)",
            }} className="mb-2 text-muted-foreground">
          {icon}
        </motion.div>)}

      <h3 className={cn("font-semibold text-sm text-center mb-0.5", selected ? "text-primary" : "text-foreground")}>
        {title}
      </h3>

      {description && (<p className="text-xs text-center text-muted-foreground leading-relaxed">
          {description}
        </p>)}
    </motion.div>);
}
