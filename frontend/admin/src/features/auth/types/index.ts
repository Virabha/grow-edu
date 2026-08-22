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

export interface AuthSuccess {
    access_token: string;
    user: User;
}

export interface SecondFactorChallengeResponse {
    secondFactorRequired: true;
    code: 'SECOND_FACTOR_REQUIRED';
    challengeToken: string;
}

export interface SecondFactorSetupPayload {
    secret: string;
    recoveryCodes: string[];
    otpauthUri: string;
}

export interface SecondFactorSetupResponse {
    secondFactorRequired: true;
    code: 'SECOND_FACTOR_SETUP_REQUIRED';
    message: string;
    setup: SecondFactorSetupPayload;
    setupToken: string;
}

export type LoginResponse = AuthSuccess | SecondFactorChallengeResponse | SecondFactorSetupResponse;

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

export interface SecondFactorCompleteDto {
    challengeToken: string;
    code: string;
}
