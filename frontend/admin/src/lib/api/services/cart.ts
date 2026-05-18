import { apiClient } from "../client";
export interface CartItem {
    cartItemId: string;
    userId: string;
    courseId?: string;
    sectionId?: string;
    itemType: "COURSE" | "SECTION";
    price: string;
    currency: string;
    title?: string;
    thumbnail?: string;
    course?: {
        title?: string;
        thumbnail?: string;
    };
    section?: {
        title?: string;
    };
}
export interface AddToCartDto {
    itemType: "COURSE" | "SECTION";
    courseId?: string;
    sectionId?: string;
}
export const cartApi = {
    list: async (): Promise<CartItem[]> => {
        const { data } = await apiClient.get("/cart");
        return data;
    },
    add: async (dto: AddToCartDto): Promise<CartItem> => {
        const { data } = await apiClient.post("/cart", dto);
        return data;
    },
    remove: async (id: string) => {
        const { data } = await apiClient.delete(`/cart/${id}`);
        return data;
    },
    clear: async () => {
        const { data } = await apiClient.delete("/cart");
        return data;
    },
};
