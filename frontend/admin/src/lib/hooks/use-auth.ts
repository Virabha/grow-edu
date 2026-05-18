import { useMutation } from '@tanstack/react-query';
import { axiosPost } from '../api/client';
import { LoginDto, RegisterDto, AuthResponse } from '../api/services/auth';
export const useLogin = () => {
    const fetchLoginMutationFunction = async (dto: LoginDto): Promise<AuthResponse> => {
        const res = await axiosPost<AuthResponse>('auth/login', dto);
        return res.data;
    };
    return useMutation({
        mutationKey: ['login'],
        mutationFn: fetchLoginMutationFunction,
        onSuccess: (data) => {
            if (data.access_token) {
                localStorage.setItem('auth-token', data.access_token);
            }
        },
    });
};
export const useRegister = () => {
    const fetchRegisterMutationFunction = async (dto: RegisterDto): Promise<AuthResponse> => {
        const res = await axiosPost<AuthResponse>('auth/register', dto);
        return res.data;
    };
    return useMutation({
        mutationKey: ['register'],
        mutationFn: fetchRegisterMutationFunction,
        onSuccess: (data) => {
            if (data.access_token) {
                localStorage.setItem('auth-token', data.access_token);
            }
        },
    });
};
export const useForgotPassword = () => {
    const fetchForgotPasswordMutationFunction = async (email: string): Promise<void> => {
        await axiosPost('auth/forgot-password', { email });
    };
    return useMutation({
        mutationKey: ['forgotPassword'],
        mutationFn: fetchForgotPasswordMutationFunction,
    });
};
export const useResetPassword = () => {
    const fetchResetPasswordMutationFunction = async ({ token, newPassword, }: {
        token: string;
        newPassword: string;
    }): Promise<void> => {
        await axiosPost('auth/reset-password', { token, newPassword });
    };
    return useMutation({
        mutationKey: ['resetPassword'],
        mutationFn: fetchResetPasswordMutationFunction,
    });
};
export const useVerifyEmail = () => {
    const fetchVerifyEmailMutationFunction = async (token: string): Promise<void> => {
        await axiosPost('auth/verify-email', { token });
    };
    return useMutation({
        mutationKey: ['verifyEmail'],
        mutationFn: fetchVerifyEmailMutationFunction,
    });
};
export const useLogout = () => {
    const fetchLogoutMutationFunction = async (): Promise<void> => {
        localStorage.removeItem('auth-token');
    };
    return useMutation({
        mutationKey: ['logout'],
        mutationFn: fetchLogoutMutationFunction,
    });
};
