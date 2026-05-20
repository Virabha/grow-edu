import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
export function generateSlug(text: string): string {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/**
 * Pull a human-readable error message out of an axios / fetch error,
 * an Error instance, or anything else. Falls back to the provided string.
 */
export function getApiErrorMessage(err: unknown, fallback = "Something went wrong"): string {
    if (typeof err === "string") return err;
    if (err && typeof err === "object") {
        const e = err as {
            response?: { data?: { message?: string | string[] } };
            message?: string;
        };
        const raw = e.response?.data?.message;
        if (Array.isArray(raw) && raw.length > 0) return raw.join(", ");
        if (typeof raw === "string" && raw.trim()) return raw;
        if (typeof e.message === "string" && e.message.trim()) return e.message;
    }
    return fallback;
}
