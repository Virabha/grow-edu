import { Skeleton } from "@/components/ui/skeleton";
import { CourseCardSkeleton } from "@/components/cards/course-card-skeleton";
export function CourseCarouselSkeleton({ title }: {
    title?: string;
}) {
    return (<div className="space-y-4">
      <div className="flex items-center justify-between px-2">
        {title ? (<h2 className="text-xl sm:text-2xl font-bold">{title}</h2>) : (<Skeleton className="h-8 w-48"/>)}
        <div className="flex gap-2">
            <Skeleton className="h-8 w-8 rounded-full"/>
            <Skeleton className="h-8 w-8 rounded-full"/>
        </div>
      </div>

      <div className="flex gap-4 overflow-hidden px-2">
        {Array.from({ length: 4 }).map((_, i) => (<div key={i} className="flex-shrink-0 w-[calc(100vw-2rem)] sm:w-[320px] md:w-[360px]">
            <CourseCardSkeleton />
          </div>))}
      </div>
    </div>);
}
