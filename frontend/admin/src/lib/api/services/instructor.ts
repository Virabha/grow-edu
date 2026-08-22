import { apiClient } from "@/lib/api/client";
interface InstructorBatch {
    batchId: string;
    title: string;
    slug: string;
    status: string;
    price: number;
    currency: string;
    thumbnail?: string;
    enrollmentCount?: number;
    myRole?: string;
    createdAt: string;
}
export interface InstructorStats {
    totalBatches: number;
    totalStudents: number;
    totalRevenue: number;
    recentBatches: InstructorBatch[];
}
export interface InstructorBatchesResponse {
    data: InstructorBatch[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}
export const instructorService = {
    getStats: async (): Promise<InstructorStats> => {
        const { data } = await apiClient.get<InstructorStats>("/instructor/stats");
        return data;
    },
    getBatches: async (page = 1, limit = 10): Promise<InstructorBatchesResponse> => {
        const { data } = await apiClient.get<InstructorBatchesResponse>("/instructor/batches", {
            params: { page, limit }
        });
        return data;
    },
};
