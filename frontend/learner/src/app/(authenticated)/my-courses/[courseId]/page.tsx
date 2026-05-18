"use client";
import { use, useState } from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { useCategoryBySlug } from "@/lib/hooks/use-categories";
import { useCourses } from "@/lib/hooks/use-courses";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { BookOpen } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";

export default function CategoryPage({
  params,
}: {
  params: Promise<{
    categoryId: string;
  }>;
}) {
  const resolvedParams = use(params);
  const [page, setPage] = useState(1);
  const { data: category, isLoading: categoryLoading } = useCategoryBySlug(resolvedParams.categoryId);
    const { data: coursesData, isLoading: coursesLoading } = useCourses({
        categoryId: category?.categoryId,
        status: "PUBLISHED",
        page,
        limit: 12,
    }, !!category?.categoryId);
    if (categoryLoading) {
        return (<PageLayout header="Loading...">
        <Skeleton className="h-64 w-full"/>
      </PageLayout>);
    }
    if (!category) {
        return (<PageLayout header="Category Not Found">
        <EmptyState title="Category not found" description="The category you're looking for doesn't exist." icon={<BookOpen className="h-12 w-12"/>}/>
      </PageLayout>);
    }
    return (<PageLayout header={category.name} subtitle="Category" description={category.description || undefined}>
      {category.description && (<Card className="mb-6">
          <CardContent className="pt-6">
            <p className="text-muted-foreground">{category.description}</p>
          </CardContent>
        </Card>)}

      {coursesLoading ? (<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (<Skeleton key={i} className="h-64"/>))}
        </div>) : !coursesData?.data || coursesData.data.length === 0 ? (<EmptyState title="No courses in this category" description="Check back later for new courses." icon={<BookOpen className="h-12 w-12"/>}/>) : (<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {coursesData.data.map((course) => (<Card key={course.courseId} className="overflow-hidden">
              {course.thumbnail && (<div className="aspect-video w-full overflow-hidden relative">
                  <Image src={course.thumbnail} alt={course.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"/>
                </div>)}
              <CardHeader>
                <CardTitle className="line-clamp-2">{course.title}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {course.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold">
                    ₹{parseFloat(course.price).toFixed(2)}
                  </span>
                  <Link href={`/courses/${course.courseId}`}>
                    <Button variant="outline" size="sm">
                      View Course
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>))}
        </div>)}

      {coursesData?.pagination && coursesData.pagination.totalPages > 1 && (<div className="mt-6">
          <Pagination currentPage={coursesData.pagination.page} totalPages={coursesData.pagination.totalPages} onPageChange={(newPage) => {
                setPage(newPage);
                window.scrollTo({ top: 0, behavior: "smooth" });
            }}/>
        </div>)}
    </PageLayout>);
}
