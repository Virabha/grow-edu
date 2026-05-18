import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
export function CourseCardSkeleton() {
    return (<Card className="flex flex-col h-full overflow-hidden">
      
      <div className="aspect-video w-full relative">
        <Skeleton className="h-full w-full"/>
        <Skeleton className="absolute top-2 right-2 h-5 w-16"/> 
      </div>

      <CardHeader className="flex-1 space-y-2">
        <div className="flex justify-between items-start gap-2">
          <Skeleton className="h-6 w-3/4"/> 
        </div>
        <div className="space-y-1">
          <Skeleton className="h-4 w-full"/>
          <Skeleton className="h-4 w-2/3"/>
        </div> 

        <div className="flex items-center gap-1 mt-2">
          <Skeleton className="h-4 w-12"/> 
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-1/2"/> 
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between border-t p-4 bg-muted/20">
        <Skeleton className="h-7 w-20"/> 
        <Skeleton className="h-9 w-24"/> 
      </CardFooter>
    </Card>);
}
