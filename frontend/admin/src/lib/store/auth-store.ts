import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/features/auth/types';

function isTokenExpired(token: string): boolean {
    try {
        const parts = token.split(".");
        if (parts.length !== 3) return true;
        const payload = parts[1];
        if (!payload) return true;
        const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
        const decoded: { exp?: number } = JSON.parse(atob(padded));
        return typeof decoded.exp === "number" && decoded.exp * 1000 < Date.now();
    } catch {
        return true;
    }
}
interface AuthState {
    user: User | null;
    token: string | null;
    isHydrated: boolean;
    setUser: (user: User | null) => void;
    setToken: (token: string | null) => void;
    setHydrated: (hydrated: boolean) => void;
    logout: () => void;
}
export const useAuthStore = create<AuthState>()(persist((set) => ({
    user: null,
    token: null,
    isHydrated: false,
    setUser: (user) => set({ user }),
    setToken: (token) => {
        set({ token });
        if (typeof window !== 'undefined') {
            if (token) {
                localStorage.setItem('admin-auth-token', token);
            }
            else {
                localStorage.removeItem('admin-auth-token');
            }
        }
    },
    setHydrated: (hydrated) => set({ isHydrated: hydrated }),
    logout: () => {
        set({ user: null, token: null });
        if (typeof window !== 'undefined') {
            localStorage.removeItem('admin-auth-token');
            localStorage.clear();
            sessionStorage.clear();
            const hostname = window.location.hostname;
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i];
                if (cookie === undefined) continue;
                const eqPos = cookie.indexOf('=');
                const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
                if (name) {
                    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
                    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;domain=${hostname};`;
                    if (hostname !== 'localhost') {
                        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;domain=.${hostname};`;
                    }
                    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;SameSite=Lax;`;
                    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;SameSite=None;Secure;`;
                }
            }
            document.cookie = 'admin-auth-token=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;';
            document.cookie = 'admin-auth-token=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;SameSite=Lax;';
        }
    },
}), {
    name: 'auth-storage',
    onRehydrateStorage: () => (state) => {
        if (state) {
            if (state.token && isTokenExpired(state.token)) {
                state.setToken(null);
                state.setUser(null);
            }
            state.setHydrated(true);
        }
    },
}));
