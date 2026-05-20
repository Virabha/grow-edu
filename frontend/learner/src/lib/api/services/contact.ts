import { apiClient } from "../client";

export interface SubscribeParams {
  email: string;
}

export const contactApi = {
  subscribe: (data: SubscribeParams) =>
    apiClient.post("/subscribe", data).then((r) => r.data),
};
