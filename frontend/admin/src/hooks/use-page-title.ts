import { useEffect } from "react";
export function usePageTitle(title: string, subtitle?: string) {
    useEffect(() => {
        const fullTitle = subtitle ? `${title} - ${subtitle}` : title;
        document.title = `${fullTitle} | grotutor`;
        return () => {
            document.title = "grotutor";
        };
    }, [title, subtitle]);
}
