import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { toast } from 'sonner';
import { announcementsApi } from '../api/announcements.api';
import type {
  AnnouncementFilters,
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
} from '../types';

function getErrorMessage(error: Error, fallback: string): string {
  const axiosErr = error as AxiosError<{ message?: string }>;
  return axiosErr?.response?.data?.message ?? fallback;
}

export const announcementKeys = {
  all: ['announcements'] as const,
  mine: (filters?: AnnouncementFilters) =>
    [...announcementKeys.all, 'mine', filters] as const,
};

export function useMyAnnouncements(filters?: AnnouncementFilters) {
  return useQuery({
    queryKey: announcementKeys.mine(filters),
    queryFn: () => announcementsApi.listMine(filters),
  });
}

export function useCreateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      courseId,
      dto,
    }: {
      courseId: string;
      dto: CreateAnnouncementDto;
    }) => announcementsApi.create(courseId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: announcementKeys.all });
      toast.success('Announcement posted');
    },
    onError: (error: Error) => {
      toast.error(getErrorMessage(error, 'Failed to post announcement'));
    },
  });
}

export function useUpdateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      announcementId,
      dto,
    }: {
      announcementId: string;
      dto: UpdateAnnouncementDto;
    }) => announcementsApi.update(announcementId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: announcementKeys.all });
      toast.success('Announcement updated');
    },
    onError: (error: Error) => {
      toast.error(getErrorMessage(error, 'Failed to update announcement'));
    },
  });
}

export function useDeleteAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (announcementId: string) =>
      announcementsApi.remove(announcementId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: announcementKeys.all });
      toast.success('Announcement deleted');
    },
    onError: (error: Error) => {
      toast.error(getErrorMessage(error, 'Failed to delete announcement'));
    },
  });
}
