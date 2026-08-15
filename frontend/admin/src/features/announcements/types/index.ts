export interface CourseAnnouncement {
  announcementId: string;
  courseId: string;
  instructorId: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface CourseAnnouncementWithCourse extends CourseAnnouncement {
  courseTitle: string;
}

export interface AnnouncementsListResponse {
  data: CourseAnnouncementWithCourse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateAnnouncementDto {
  title: string;
  body: string;
}

export type UpdateAnnouncementDto = Partial<CreateAnnouncementDto>;

export interface AnnouncementFilters {
  page?: number;
  limit?: number;
}
