"use client";
import { PageLayout } from "@/components/layout/page-layout";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserPlus as UserPlusIcon } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { useUsers } from "@/features/users/hooks/use-users";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table";
import { useState } from "react";
import { toast } from "sonner";
import { PageFilters } from "@/components/layout/page-filters";
export default function CorporateUserManagementPage() {
    const [search, setSearch] = useState("");
    const { data: usersData, isLoading } = useUsers({
        enabled: true,
        // No companyId here: GET /users scopes a corporate admin to their own
        // company server-side, and FilterUsersDto rejects the parameter, so
        // sending it fails the whole request with a 400.
        filters: {
            search: search || undefined,
            page: 1,
            limit: 100,
        },
    });
    return (<PageLayout header="User Management" subtitle="Corporate" description="Manage your company's users and their course access." actions={<Button onClick={() => {
                toast.info("Add users feature coming soon. You'll be able to add users via CSV upload or manual entry.");
            }}>
          <UserPlusIcon className="h-4 w-4 mr-2"/>
          Add Users
        </Button>} filters={<PageFilters search={search} onSearchChange={setSearch} searchPlaceholder="Search by email..." />}>
      <div className="space-y-2">
        {isLoading ? (<DataTableSkeleton columnCount={5} rowCount={10}/>) : usersData?.data.length === 0 ? (<EmptyState title="No users found" description="Add users to your company account to get started." icon={<Users className="h-12 w-12"/>} action={{
                label: "Add Users",
                onClick: () => { },
            }}/>) : (<Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[120px]">Name</TableHead>
                      <TableHead className="min-w-[200px]">Email</TableHead>
                      <TableHead className="min-w-[100px] hidden sm:table-cell">
                        Role
                      </TableHead>
                      <TableHead className="min-w-[100px]">Status</TableHead>
                      <TableHead className="text-right min-w-[100px]">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersData?.data?.map((user) => (<TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.firstName || user.lastName
                    ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
                    : "N/A"}
                        </TableCell>
                        <TableCell className="truncate max-w-[200px]">
                          {user.email}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <span className="px-2 py-1 text-xs rounded bg-muted">
                            {user.role}
                          </span>
                        </TableCell>
                        <TableCell>
                          {user.emailVerified ? (<span className="text-green-600">Active</span>) : (<span className="text-muted-foreground">
                              Pending
                            </span>)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => {
                    toast.info(`User management for ${user.email} - Feature coming soon`);
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
