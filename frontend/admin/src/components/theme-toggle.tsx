"use client";
import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
export function ModeToggle() {
    const { setTheme, theme } = useTheme();
    const [mounted, setMounted] = React.useState(false);
    React.useEffect(() => {
        setMounted(true);
    }, []);
    if (!mounted) {
        return (<Button variant="ghost" size="icon" className="text-foreground/80 hover:text-primary hover:bg-primary/10">
            <Sun className="h-5 w-5"/>
            <span className="sr-only">Toggle theme</span>
        </Button>);
    }
    return (<Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="text-foreground/80 hover:text-primary hover:bg-primary/10">
      {theme === 'dark' ? <Sun className="h-5 w-5"/> : <Moon className="h-5 w-5"/>}
      <span className="sr-only">Toggle theme</span>
    </Button>);
}
