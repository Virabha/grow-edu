"use client";
import { useState } from "react";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";

import { PageLayout } from "@/components/layout/page-layout";
import { PageFilters } from "@/components/layout/page-filters";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { useUsers } from "@/features/users/hooks/use-users";
import type { User } from "@/features/users/types";
import { EditUserDialog } from "@/features/users/components/edit-user-dialog";

const ROLE_STYLES: Record<string, string> = {
  PLATFORM_ADMIN:
    "border-primary/40 bg-primary/10 text-primary",
  INSTRUCTOR:
    "border-blue-300/40 bg-blue-50 text-blue-800 dark:bg-blue-950/30 dark:text-blue-200",
  CORPORATE_ADMIN:
    "border-amber-300/40 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200",
  LEARNER: "border-border bg-muted text-muted-foreground",
};

const ROLE_LABELS: Record<string, string> = {
  PLATFORM_ADMIN: "Admin",
  INSTRUCTOR: "Instructor",
  CORPORATE_ADMIN: "Corporate",
  LEARNER: "Learner",
};

function RoleBadge({ role }: { role: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest",
        ROLE_STYLES[role] ?? ROLE_STYLES.LEARNER,
      )}
    >
      {ROLE_LABELS[role] ?? role}
    </span>
  );
}

export default function AdminUserManagementPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const limit = 20;

  const { data, isLoading, isFetching } = useUsers({
    enabled: true,
    filters: {
      search: debouncedSearch || undefined,
      role: roleFilter === "all" ? undefined : roleFilter,
      page,
      limit,
    },
  });

  const users = data?.data ?? [];
  const totalPages = data?.pagination?.totalPages ?? 1;
  const currentPage = data?.pagination?.page ?? 1;

  return (
    <PageLayout
      subtitle="Console"
      header="Users"
      description="Every account on the platform, by role."
      actions={
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() =>
            toast.info("User creation coming soon. Use the seed script for now.")
          }
        >
          <UserPlus className="size-3.5" />
          Add user
        </Button>
      }
      filters={
        <PageFilters
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by name or email…"
        >
          <Select
            value={roleFilter}
            onValueChange={(v) => {
              setRoleFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-full text-xs sm:w-[160px]">
              <SelectValue placeholder="All roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem value="LEARNER">Learner</SelectItem>
              <SelectItem value="INSTRUCTOR">Instructor</SelectItem>
              <SelectItem value="CORPORATE_ADMIN">Corporate admin</SelectItem>
              <SelectItem value="PLATFORM_ADMIN">Platform admin</SelectItem>
            </SelectContent>
          </Select>
        </PageFilters>
      }
    >
      {isLoading && !isFetching ? (
        <DataTableSkeleton columnCount={6} rowCount={10} />
      ) : users.length === 0 ? (
        <EmptyState
          title="No users found"
          description="Users land here once they register."
          illustration="/illustrations/engineering_team.svg"
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div
            className={cn(
              "overflow-x-auto",
              isFetching && "pointer-events-none opacity-50",
            )}
          >
            <Table>
              <TableHeader>
                <TableRow className="border-b-border/70">
                  <TableHead className="font-display text-xs">Name</TableHead>
                  <TableHead className="font-display text-xs">Email</TableHead>
                  <TableHead className="font-display text-xs">Role</TableHead>
                  <TableHead className="font-display text-xs">Status</TableHead>
                  <TableHead className="hidden font-display text-xs md:table-cell">
                    Created
                  </TableHead>
                  <TableHead className="text-right font-display text-xs">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user: User) => (
                  <TableRow
                    key={user.id}
                    className="border-b-border/60 transition-colors hover:bg-muted/40"
                  >
                    <TableCell className="font-medium text-foreground">
                      {[user.firstName, user.lastName]
                        .filter(Boolean)
                        .join(" ") || "—"}
                    </TableCell>
                    <TableCell className="max-w-[260px] truncate text-sm text-muted-foreground">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      <RoleBadge role={user.role} />
                    </TableCell>
                    <TableCell>
                      {user.emailVerified ? (
                        <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                          Verified
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Unverified
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                      {user.createdAt
                        ? new Date(user.createdAt).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingUser(user);
                          setIsEditOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 ? (
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <p className="text-xs text-muted-foreground">
                Page <span className="text-foreground">{currentPage}</span> of{" "}
                <span className="text-foreground">{totalPages}</span>
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1 || isFetching}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || isFetching}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      <EditUserDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        user={editingUser}
      />
    </PageLayout>
  );
}
