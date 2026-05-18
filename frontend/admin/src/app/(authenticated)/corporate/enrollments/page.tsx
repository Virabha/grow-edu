"use client";
import { PageLayout } from "@/components/layout/page-layout";
import { BookOpen, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useEnrollments } from "@/features/enrollments/hooks/use-enrollments";
import type { Enrollment } from "@/features/enrollments/types";
import { useAuthStore } from "@/lib/store/auth-store";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { PageFilters } from "@/components/layout/page-filters";
export default function BulkEnrollmentPage() {
    const [mounted, setMounted] = useState(false);
    const { user } = useAuthStore();
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    useEffect(() => {
        setMounted(true);
    }, []);
    const { data: enrollmentsData, isLoading } = useEnrollments({
        enabled: true,
        filters: {
            companyId: user?.companyId ?? undefined,
            status: statusFilter === "all" ? undefined : statusFilter,
            limit: 100,
        },
    });
    const filteredEnrollments = enrollmentsData?.data.filter((enrollment: Enrollment) => {
        if (search) {
            const courseTitle = enrollment.course?.title.toLowerCase() || "";
            const userName = `${enrollment.user?.firstName || ""} ${enrollment.user?.lastName || ""}`.toLowerCase();
            return (courseTitle.includes(search.toLowerCase()) ||
                userName.includes(search.toLowerCase()));
        }
        return true;
    });
    return (<PageLayout header="Bulk Enrollment" subtitle="Corporate" description="Enroll multiple users to courses at once using CSV upload or manual selection." actions={<Button onClick={() => {
                toast.info("Bulk enrollment feature coming soon. You'll be able to enroll multiple users via CSV upload.");
            }}>
          <Plus className="h-4 w-4 mr-2"/>
          Bulk Enroll
        </Button>} filters={<PageFilters search={search} onSearchChange={setSearch} searchPlaceholder="Search enrollments...">
          {mounted ? (<Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SelectValue placeholder="All Status"/>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="REVOKED">Revoked</SelectItem>
              </SelectContent>
            </Select>) : (<Skeleton className="w-[160px] h-8"/>)}
        </PageFilters>}>
      <div className="space-y-2">
        {isLoading ? (<div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (<Skeleton key={i} className="h-16"/>))}
          </div>) : filteredEnrollments?.length === 0 ? (<EmptyState title="No enrollments found" description="Enroll users to courses to see them here." icon={<BookOpen className="h-12 w-12"/>}/>) : (<Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[120px]">User</TableHead>
                      <TableHead className="min-w-[150px]">Course</TableHead>
                      <TableHead className="min-w-[80px]">Status</TableHead>
                      <TableHead className="min-w-[100px] hidden sm:table-cell">Enrolled</TableHead>
                      <TableHead className="text-right min-w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEnrollments?.map((enrollment: Enrollment) => (<TableRow key={enrollment.enrollmentId}>
                        <TableCell className="font-medium">
                          {enrollment.user
                    ? `${enrollment.user.firstName || ""} ${enrollment.user.lastName || ""}`.trim() || enrollment.user.email
                    : "N/A"}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {enrollment.course?.title || "Unknown Course"}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 text-xs rounded whitespace-nowrap ${enrollment.status === "ACTIVE"
                    ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                    : enrollment.status === "COMPLETED"
                        ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                        : "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200"}`}>
                            {enrollment.status}
                          </span>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {new Date(enrollment.enrolledAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => {
                    toast.info(`Enrollment management for ${enrollment.enrollmentId} - Feature coming soon`);
                }}>
                            Manage
                          </Button>
                        </TableCell>
                      </TableRow>))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>)}
      </div>
    </PageLayout>);
}
