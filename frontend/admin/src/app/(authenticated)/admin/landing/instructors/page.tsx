"use client";

import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Users } from "lucide-react";
import { useInstructors } from "@/features/cms/hooks/use-cms";

export default function AdminInstructorsPage() {
  const { data: instructors = [], isLoading } = useInstructors();

  return (
    <PageLayout header="Instructors" description="Instructors are managed via user profiles; this list is read-only from CMS.">
      {isLoading ? (
        <DataTableSkeleton columnCount={4} rowCount={5} />
      ) : instructors.length === 0 ? (
        <EmptyState title="No instructors" description="Add instructor profiles in the backend to show them here." icon={<Users className="h-12 w-12" />} />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Expertise</TableHead>
                  <TableHead>Order</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {instructors.map((i) => (
                  <TableRow key={i.profileId}>
                    <TableCell className="font-medium">{i.name}</TableCell>
                    <TableCell>{i.expertise?.join(", ") || "-"}</TableCell>
                    <TableCell>{i.displayOrder}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </PageLayout>
  );
}
