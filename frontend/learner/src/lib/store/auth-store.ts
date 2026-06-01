"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface User {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  role?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isHydrated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  setUser: (user: User) => void;
  setHydrated: (hydrated: boolean) => void;
}

function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

function isTokenValid(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return !payload.exp || payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

function clearAuthCookie() {
  if (typeof document !== "undefined") {
    document.cookie = "learner-auth-token=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;";
    document.cookie = "learner-auth-token=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;SameSite=Lax;";
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isHydrated: false,
      login: (user: User, token: string) => {
        set({ user, token });
        if (typeof window !== "undefined") {
          localStorage.setItem("learner-auth-token", token);
          const expires = new Date();
          expires.setDate(expires.getDate() + 7);
          document.cookie = `learner-auth-token=${token}; expires=${expires.toUTCString()}; path=/; SameSite=Lax; Secure`;
        }
      },
      logout: () => {
        set({ user: null, token: null });
        if (typeof window !== "undefined") {
          localStorage.removeItem("learner-auth-token");
          localStorage.removeItem("learner-auth");
          sessionStorage.clear();
          const hostname = window.location.hostname;
          const cookies = document.cookie.split(";");
          for (const cookie of cookies) {
            const eqPos = cookie.indexOf("=");
            const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
            if (name) {
              document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
              document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;domain=${hostname};`;
              if (hostname !== "localhost") {
                document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;domain=.${hostname};`;
              }
              document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;SameSite=Lax;`;
            }
          }
        }
      },
      setUser: (user: User) => set({ user }),
      setHydrated: (hydrated: boolean) => set({ isHydrated: hydrated }),
    }),
    {
      name: "learner-auth",
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? localStorage
          : {
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {},
            }
      ),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          const cookie = getCookie("learner-auth-token");
          const cookieValid = !!cookie && isTokenValid(cookie);

          if (state.user && !cookieValid) {
            // User in localStorage but cookie gone/expired — clear stale state
            useAuthStore.setState({ user: null, token: null });
            clearAuthCookie();
          } else if (!state.user && cookie) {
            // No user in localStorage but cookie exists — clear orphaned cookie
            clearAuthCookie();
          }

          state.setHydrated(true);
        }
      },
    }
  )
);
