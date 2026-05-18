"use client";
import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input, type InputProps } from "@/components/ui/input";
export interface PasswordInputProps extends Omit<InputProps, "type"> {
    showToggle?: boolean;
}
export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(({ className, showToggle = true, disabled, ...props }, ref) => {
    const [isVisible, setIsVisible] = React.useState(false);
    const inputType = isVisible ? "text" : "password";
    return (<div className="relative">
        <Input ref={ref} type={inputType} disabled={disabled} className={cn(showToggle && "pr-10", className)} {...props}/>
        {showToggle && (<button type="button" className={cn("absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors", disabled && "pointer-events-none opacity-50")} onClick={() => setIsVisible((v) => !v)} aria-label={isVisible ? "Hide password" : "Show password"} aria-pressed={isVisible}>
            {isVisible ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
          </button>)}
      </div>);
});
PasswordInput.displayName = "PasswordInput";
