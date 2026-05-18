"use client";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface PageFiltersProps {
    /** Search input value */
    search?: string;
    /** Search input change handler */
    onSearchChange?: (value: string) => void;
    /** Search placeholder text */
    searchPlaceholder?: string;
    /** Additional filter controls (Select dropdowns, etc.) */
    children?: ReactNode;
    className?: string;
}

export function PageFilters({
    search,
    onSearchChange,
    searchPlaceholder = "Search...",
    children,
    className,
}: PageFiltersProps) {
    return (
        <div className={cn("flex flex-col sm:flex-row items-stretch sm:items-center gap-2", className)}>
            {onSearchChange !== undefined && (
                <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                        placeholder={searchPlaceholder}
                        value={search ?? ""}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="pl-8 h-8 text-xs"
                    />
                </div>
            )}
            {children}
        </div>
    );
}
