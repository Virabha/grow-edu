export interface ApiError {
    message?: string;
    error?: string;
    statusCode?: number;
}
export interface PaginationParams {
    page?: number;
    limit?: number;
}
export interface PaginationResponse {
    page: number;
    limit: number;
    total: number;
    totalPages?: number;
}
export async function parseJsonResponse<T>(response: Response): Promise<T> {
    try {
        return await response.json() as T;
    }
    catch {
        throw new Error('Failed to parse response');
    }
}
export async function parseErrorResponse(response: Response): Promise<ApiError> {
    try {
        return await response.json() as ApiError;
    }
    catch {
        return {
            message: `HTTP ${response.status}: ${response.statusText}`,
            statusCode: response.status,
        };
    }
}
