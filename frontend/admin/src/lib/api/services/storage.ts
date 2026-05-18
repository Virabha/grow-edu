import { apiClient } from '../client';
export interface UploadKeyResponse {
    key: string;
    uploadEndpoint: string;
}
export interface UploadResponse {
    url: string;
    key: string;
}
export const storageApi = {
    getUploadKey: async (type: 'course' | 'profile' | 'lesson', fileName?: string, courseId?: string): Promise<UploadKeyResponse> => {
        const { data } = await apiClient.post('/storage/upload-key', { type, fileName, courseId });
        return data;
    },
    upload: async (file: File, key: string): Promise<UploadResponse> => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('key', key);
        const { data } = await apiClient.post('/storage/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return data;
    },
};
