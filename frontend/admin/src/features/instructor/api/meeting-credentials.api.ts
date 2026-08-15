import { apiClient } from "@/lib/api/client";
import type {
  MeetingCredentialsSafeView,
  UpsertZoomCredentialsInput,
  UpsertJitsiCredentialsInput,
} from "../types/meeting-credentials";

export const meetingCredentialsApi = {
  async get(): Promise<MeetingCredentialsSafeView> {
    const { data } =
      await apiClient.get<MeetingCredentialsSafeView>(
        "/instructor/meeting-credentials",
      );
    return data;
  },

  async upsertZoom(
    input: UpsertZoomCredentialsInput,
  ): Promise<MeetingCredentialsSafeView> {
    const { data } =
      await apiClient.put<MeetingCredentialsSafeView>(
        "/instructor/meeting-credentials/zoom",
        input,
      );
    return data;
  },

  async clearZoom(): Promise<MeetingCredentialsSafeView> {
    const { data } =
      await apiClient.delete<MeetingCredentialsSafeView>(
        "/instructor/meeting-credentials/zoom",
      );
    return data;
  },

  async upsertJitsi(
    input: UpsertJitsiCredentialsInput,
  ): Promise<MeetingCredentialsSafeView> {
    const { data } =
      await apiClient.put<MeetingCredentialsSafeView>(
        "/instructor/meeting-credentials/jitsi",
        input,
      );
    return data;
  },

  async clearJitsi(): Promise<MeetingCredentialsSafeView> {
    const { data } =
      await apiClient.delete<MeetingCredentialsSafeView>(
        "/instructor/meeting-credentials/jitsi",
      );
    return data;
  },
};
