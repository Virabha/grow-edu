import { apiClient } from '@/lib/api/client';
import type {
  AnnouncementFilters,
  AnnouncementsListResponse,
  CourseAnnouncement,
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
} from '../types';

export const announcementsApi = {
  /** GET /announcements/mine — instructor dashboard list */
  listMine: async (filters?: AnnouncementFilters): Promise<AnnouncementsListResponse> => {
    const { data } = await apiClient.get<AnnouncementsListResponse>(
      '/announcements/mine',
      { params: filters },
    );
    return data;
  },

  /** POST /courses/:courseId/announcements */
  create: async (
    courseId: string,
    dto: CreateAnnouncementDto,
  ): Promise<CourseAnnouncement> => {
    const { data } = await apiClient.post<CourseAnnouncement>(
      `/courses/${courseId}/announcements`,
      dto,
    );
    return data;
  },

  /** PATCH /announcements/:id */
  update: async (
    announcementId: string,
    dto: UpdateAnnouncementDto,
  ): Promise<CourseAnnouncement> => {
    const { data } = await apiClient.patch<CourseAnnouncement>(
      `/announcements/${announcementId}`,
      dto,
    );
    return data;
  },

  /** DELETE /announcements/:id */
  remove: async (announcementId: string): Promise<{ success: boolean }> => {
    const { data } = await apiClient.delete<{ success: boolean }>(
      `/announcements/${announcementId}`,
    );
    return data;
  },
};
