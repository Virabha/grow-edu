import { useEffect } from "react";
export function usePageTitle(title: string, subtitle?: string) {
    useEffect(() => {
        const fullTitle = subtitle ? `${title} - ${subtitle}` : title;
        document.title = `${fullTitle} | Loshi Edu`;
        return () => {
            document.title = "Loshi Edu";
        };
    }, [title, subtitle]);
}
