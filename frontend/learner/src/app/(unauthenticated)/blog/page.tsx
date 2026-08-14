"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Newspaper, Search } from "lucide-react";

import { PageLayout } from "@/components/layout/page-layout";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { SecureImage } from "@/components/ui/secure-image";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/lib/api/client";
import { useDebounce } from "@/hooks/use-debounce";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Post {
  id: string;
  title: string;
  slug: string;
  categoryId: string;
  categoryName: string;
  excerpt: string;
  coverImage: string;
  authorName: string;
  readMinutes: number;
  publishedAt: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

export default function BlogPage() {
  const [search, setSearch] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("all");
  const debounced = useDebounce(search, 300);

  const categories = useQuery({
    queryKey: ["blog", "categories"],
    queryFn: () => apiClient.get<Category[]>("/blog/categories").then((r) => r.data),
  });

  const posts = useQuery({
    queryKey: ["blog", "posts", categoryId, debounced],
    queryFn: () =>
      apiClient
        .get<{ data: Post[] }>("/blog/posts", {
          params: { categoryId, search: debounced || undefined, limit: 24 },
        })
        .then((r) => r.data),
  });

  const rows = posts.data?.data ?? [];
  const [lead, ...rest] = rows;

  return (
    <PageLayout
      subtitle="Writing"
      header="The grotutor blog"
      description="Study method, exam strategy and what we are changing in the product."
    >
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1.5">
            <FilterChip
              active={categoryId === "all"}
              onClick={() => setCategoryId("all")}
            >
              All writing
            </FilterChip>
            {(categories.data ?? []).map((category) => (
              <FilterChip
                key={category.id}
                active={categoryId === category.id}
                onClick={() => setCategoryId(category.id)}
              >
                {category.name}
              </FilterChip>
            ))}
          </div>

          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search articles…"
              className="h-9 pl-8 text-sm"
              aria-label="Search articles"
            />
          </div>
        </div>

        {posts.isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-64 w-full rounded-xl" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-64 w-full rounded-xl" />
              ))}
            </div>
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            title="Nothing here yet"
            description={
              debounced || categoryId !== "all"
                ? "No articles match those filters."
                : "The first article is on its way."
            }
            icon={<Newspaper className="size-10" />}
            action={
              debounced || categoryId !== "all"
                ? {
                    label: "Clear filters",
                    onClick: () => {
                      setSearch("");
                      setCategoryId("all");
                    },
                  }
                : undefined
            }
          />
        ) : (
          <div className="space-y-4">
            {/* The most recent piece leads, at full width. */}
            {lead && (
              <Link
                href={`/blog/${lead.slug}`}
                className="group grid overflow-hidden rounded-xl border border-border/70 bg-card/85 transition-shadow hover:shadow-md md:grid-cols-[1.1fr_1fr]"
              >
                <div className="aspect-[16/10] overflow-hidden bg-muted md:aspect-auto">
                  <SecureImage
                    src={lead.coverImage}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                </div>
                <div className="flex flex-col justify-center gap-2 p-5">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--brass)]">
                    {lead.categoryName}
                  </span>
                  <h2 className="font-display text-2xl font-medium leading-tight">
                    {lead.title}
                  </h2>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {lead.excerpt}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {lead.authorName} · {formatDate(lead.publishedAt)} ·{" "}
                    {lead.readMinutes} min read
                  </p>
                </div>
              </Link>
            )}

            {rest.length > 0 && (
              <ul className="grid gap-4 [&>*]:min-w-0 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((post) => (
                  <li key={post.id}>
                    <Link
                      href={`/blog/${post.slug}`}
                      className="group flex h-full flex-col overflow-hidden rounded-xl border border-border/70 bg-card/85 transition-shadow hover:shadow-md"
                    >
                      <div className="aspect-[16/9] overflow-hidden bg-muted">
                        <SecureImage
                          src={post.coverImage}
                          alt=""
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        />
                      </div>
                      <div className="flex flex-1 flex-col gap-1.5 p-4">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--brass)]">
                          {post.categoryName}
                        </span>
                        <h3 className="font-display text-base font-medium leading-snug">
                          {post.title}
                        </h3>
                        <p className="line-clamp-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                          {post.excerpt}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatDate(post.publishedAt)} · {post.readMinutes} min read
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </PageLayout>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
