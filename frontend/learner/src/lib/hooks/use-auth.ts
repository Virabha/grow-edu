import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth-store";
import { useRouter } from "next/navigation";

interface LoginDto {
  email: string;
  password: string;
}

interface RegisterDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: string;
}

interface AuthResponse {
  access_token: string;
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role?: string;
  };
}

export function useLogin() {
  const { login } = useAuthStore();

  return useMutation({
    mutationKey: ["login"],
    mutationFn: async (dto: LoginDto): Promise<AuthResponse> => {
      const { data } = await apiClient.post<AuthResponse>("/auth/login", dto);
      return data;
    },
    onSuccess: (data) => {
      login(data.user, data.access_token);
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get("redirect");
      window.location.href = redirect || "/";
    },
  });
}

export function useRegister() {
  const router = useRouter();

  return useMutation({
    mutationKey: ["register"],
    mutationFn: async (dto: RegisterDto): Promise<AuthResponse> => {
      const { data } = await apiClient.post<AuthResponse>(
        "/auth/register",
        dto
      );
      return data;
    },
    onSuccess: () => {
      router.push("/login");
    },
  });
}
