import axios, { AxiosError } from "axios";

import { useAuthStore } from "@/lib/store/auth-store";
import { env } from "@/lib/env";
import { MOCKS_ENABLED, installFetchMock, mockAdapter } from "@/lib/mock";

const getBaseUrl = (): string => {
  if (typeof window !== "undefined") {
    return "/api";
  }
  return env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
};

const getAuthToken = (): string | null => {
  try {
    return useAuthStore.getState().token;
  } catch {
    return null;
  }
};

// Feature APIs that use raw fetch (auth, categories, companies, enrollments,
// analytics) need intercepting too, not just the axios client.
if (MOCKS_ENABLED) installFetchMock();

export const apiClient = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
  // Demo mode answers every request from the in-memory store in lib/mock.
  // Remove NEXT_PUBLIC_USE_MOCKS from .env.local to use the real API.
  ...(MOCKS_ENABLED ? { adapter: mockAdapter } : {}),
});

apiClient.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string | string[]; error?: string }>) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      if (typeof window !== "undefined") {
        const { pathname, search } = window.location;
        const isAuthPage = [
          "/login",
          "/signup",
          "/forgot-password",
          "/reset-password",
          "/verify-email",
          "/verify-email-pending",
        ].some((p) => pathname.startsWith(p));
        if (!isAuthPage) {
          window.location.href = `/login?redirect=${encodeURIComponent(pathname + search)}`;
        }
      }
    }
    // Make "Network Error" more actionable (often CORS or backend unreachable)
    if (error.message === "Network Error" || error.code === "ERR_NETWORK") {
      const base = apiClient.defaults.baseURL || "unknown";
      const url = error.config?.url ? `${base}${error.config.url}` : base;
      const hint =
        "Check that the API is running, NEXT_PUBLIC_API_URL is correct, and the backend allows your origin (CORS).";
      Object.assign(error, {
        message: `Network Error calling ${url}. ${hint}`,
      });
    } else if (error.response?.data) {
      // Lift NestJS-style { message } into the error so mutations can show it
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

export const axiosGet = async <T = unknown>(
  url: string,
  params?: Record<string, string | number | boolean | Date>
): Promise<{ data: T }> => {
  const queryParams = new URLSearchParams();

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (value instanceof Date) {
          queryParams.append(key, value.toISOString());
        } else {
          queryParams.append(key, String(value));
        }
      }
    });
  }

  const queryString = queryParams.toString();
  const fullUrl = queryString ? `${url}?${queryString}` : url;
  const response = await apiClient.get<T>(fullUrl);
  return response;
};

export const axiosPost = async <T = unknown>(
  url: string,
  data?: unknown
): Promise<{ data: T }> => {
  const response = await apiClient.post<T>(url, data);
  return response;
};

export const axiosPut = async <T = unknown>(
  url: string,
  data?: unknown
): Promise<{ data: T }> => {
  const response = await apiClient.put<T>(url, data);
  return response;
};

export const axiosPatch = async <T = unknown>(
  url: string,
  data?: unknown
): Promise<{ data: T }> => {
  const response = await apiClient.patch<T>(url, data);
  return response;
};

export const axiosDelete = async <T = unknown>(
  url: string
): Promise<{ data: T }> => {
  const response = await apiClient.delete<T>(url);
  return response;
};
