"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/query-keys";

export interface Review {
  reviewId: string;
  courseId: string;
  courseTitle: string;
  courseThumbnail: string;
  rating: number;
  title: string;
  body: string;
  status: "PUBLISHED" | "PENDING" | "REJECTED";
  createdAt: string;
  updatedAt: string | null;
  instructorReply: string | null;
}

export interface ReviewableCourse {
  courseId: string;
  title: string;
  thumbnail: string;
  progressPercent: number;
}

interface ReviewsResponse {
  data: Review[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export function useMyReviews(filters?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: queryKeys.reviews.mine(filters as Record<string, unknown>),
    queryFn: () =>
      apiClient
        .get<ReviewsResponse>("/reviews/mine", { params: filters })
        .then((r) => r.data),
  });
}

export function useReviewableCourses() {
  return useQuery({
    queryKey: queryKeys.reviews.reviewable(),
    queryFn: () =>
      apiClient
        .get<ReviewableCourse[]>("/reviews/reviewable")
        .then((r) => r.data),
  });
}

interface CreateReviewInput {
  courseId: string;
  rating: number;
  title: string;
  body: string;
}

function invalidate(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["reviews"] });
  queryClient.invalidateQueries({ queryKey: ["dashboard"] });
}

export function useCreateReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateReviewInput) =>
      apiClient.post<Review>("/reviews", input).then((r) => r.data),
    onSuccess: () => invalidate(queryClient),
  });
}

export function useUpdateReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      reviewId,
      ...body
    }: { reviewId: string } & Partial<Omit<CreateReviewInput, "courseId">>) =>
      apiClient.patch<Review>(`/reviews/${reviewId}`, body).then((r) => r.data),
    onSuccess: () => invalidate(queryClient),
  });
}

export function useDeleteReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reviewId: string) =>
      apiClient.delete(`/reviews/${reviewId}`).then((r) => r.data),
    onSuccess: () => invalidate(queryClient),
  });
}
