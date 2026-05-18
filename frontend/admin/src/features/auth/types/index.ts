export interface User {
    id: string;
    email: string;
    role: 'LEARNER' | 'INSTRUCTOR' | 'CORPORATE_ADMIN' | 'PLATFORM_ADMIN';
    firstName?: string | null;
    lastName?: string | null;
    emailVerified: boolean;
    companyId?: string | null;
    createdAt?: string;
    updatedAt?: string;
}
export interface LoginResponse {
    access_token: string;
    user: User;
}
export interface RegisterResponse {
    message: string;
    email: string;
}
export interface RegisterDto {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
}
export interface LoginDto {
    email: string;
    password: string;
}
export interface ForgotPasswordDto {
    email: string;
}
export interface ResetPasswordDto {
    token: string;
    newPassword: string;
}
