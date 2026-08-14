import axios, { AxiosError } from "axios";
import { env } from "@/lib/env";
import { MOCKS_ENABLED, mockAdapter } from "@/lib/mock";

function getBaseUrl(): string {
  if (typeof window !== "undefined") return "/api";
  return env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
}

export const apiClient = axios.create({
  baseURL: getBaseUrl(),
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
  // Demo mode answers every request from the in-memory store in lib/mock.
  // Set NEXT_PUBLIC_USE_MOCKS=false to go back to the real API.
  ...(MOCKS_ENABLED ? { adapter: mockAdapter } : {}),
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("learner-auth");
      if (raw) {
        const parsed = JSON.parse(raw);
        const token = parsed?.state?.token as string | undefined;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch {
      // noop
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string | string[]; error?: string }>) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("learner-auth");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.state?.token) {
            localStorage.removeItem("learner-auth");
            document.cookie =
              "learner-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
            window.location.href = "/login";
          }
        }
      } catch {
        // noop
      }
    }

    if (error.message === "Network Error" || error.code === "ERR_NETWORK") {
      const base = apiClient.defaults.baseURL ?? "";
      const url = error.config?.url ? `${base}${error.config.url}` : base;
      Object.assign(error, {
        message: `Network Error calling ${url}. Check that the API is running and CORS is configured.`,
      });
    } else if (error.response?.data) {
      // Surface NestJS-style { message } so toasts/UI show what really went wrong.
      const raw = error.response.data.message ?? error.response.data.error;
      if (raw) {
        const msg = Array.isArray(raw) ? raw.join(", ") : String(raw);
        Object.assign(error, { message: msg });
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
