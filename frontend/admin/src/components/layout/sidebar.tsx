"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";
interface SidebarItem {
    label: string;
    href: string;
    icon?: ReactNode;
    badge?: string | number;
}
interface SidebarProps {
    items: SidebarItem[];
    className?: string;
}
export function Sidebar({ items, className }: SidebarProps) {
    const pathname = usePathname();
    return (<aside className={cn("fixed left-0 top-0 h-screen w-64 border-r border-border bg-card z-40 transition-transform duration-300 pt-16", className)}>
      <div className="flex flex-col h-full">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Navigation</h2>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {items.map((item) => {
            const isActive = pathname === item.href || (pathname?.startsWith(item.href + "/") && item.href !== "/");
            return (<Link key={item.href} href={item.href} className={cn("flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors", isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground")}>
                {item.icon && <span className="flex-shrink-0 w-4 h-4">{item.icon}</span>}
                <span className="flex-1">{item.label}</span>
                {item.badge && (<span className={cn("px-2 py-0.5 text-xs rounded-full", isActive
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-muted text-muted-foreground")}>
                    {item.badge}
                  </span>)}
              </Link>);
        })}
        </nav>
      </div>
    </aside>);
}
