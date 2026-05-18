import { apiClient } from "./client";

/**
 * Upload a file to storage. Returns the public CDN URL.
 * `type` is a folder hint (any string accepted by backend).
 */
export async function uploadFile(file: File, type: string = "misc"): Promise<string> {
    const keyRes = await apiClient.post<{ key: string; uploadEndpoint?: string }>(
        "/storage/upload-key",
        { type, fileName: file.name },
    );
    const key = keyRes.data.key;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("key", key);

    const uploadRes = await apiClient.post<{ url: string; key: string }>(
        "/storage/upload",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
    );
    return uploadRes.data.url;
}
