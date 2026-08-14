"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Newspaper } from "lucide-react";

import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SecureImage } from "@/components/ui/secure-image";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/lib/api/client";
import { formatDate } from "@/lib/format";

interface Post {
  title: string;
  categoryName: string;
  content: string;
  coverImage: string;
  authorName: string;
  readMinutes: number;
  publishedAt: string;
}

export default function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["blog", "post", slug],
    queryFn: () =>
      apiClient.get<Post>(`/blog/posts/slug/${slug}`).then((r) => r.data),
  });

  if (isError || (!isLoading && !data)) {
    return (
      <PageLayout header="Article">
        <EmptyState
          title="We could not find that article"
          description="It may have been unpublished."
          icon={<Newspaper className="size-10" />}
        />
        <Button asChild variant="outline" size="sm" className="mt-3">
          <Link href="/blog">
            <ArrowLeft className="mr-1 size-3.5" />
            Back to the blog
          </Link>
        </Button>
      </PageLayout>
    );
  }

  if (isLoading || !data) {
    return (
      <PageLayout header="Article">
        <div className="mx-auto max-w-3xl space-y-3">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-40 w-full" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      subtitle={data.categoryName}
      header={data.title}
      description={`${data.authorName} · ${formatDate(data.publishedAt)} · ${data.readMinutes} min read`}
    >
      <article className="mx-auto max-w-3xl space-y-5">
        <Button asChild variant="ghost" size="sm" className="-ml-2 h-8 text-xs">
          <Link href="/blog">
            <ArrowLeft className="mr-1 size-3.5" />
            All articles
          </Link>
        </Button>

        <div className="aspect-[16/8] overflow-hidden rounded-xl bg-muted">
          <SecureImage
            src={data.coverImage}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>

        <div className="space-y-4">
          {data.content.split("\n\n").map((paragraph, index) => (
            <p
              key={index}
              className="text-[15px] leading-relaxed text-foreground/90"
            >
              {paragraph}
            </p>
          ))}
        </div>
      </article>
    </PageLayout>
  );
}
