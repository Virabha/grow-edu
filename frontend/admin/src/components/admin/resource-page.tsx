"use client";

import * as React from "react";
import { toast } from "sonner";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";

import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { FormSheet } from "@/components/ui/form-sheet";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  ResourceField,
  type FieldSpec,
  type FieldValue,
} from "@/components/admin/resource-field";
import {
  useCreateResource,
  useDeleteResource,
  useResourceList,
  useUpdateResource,
  type ResourceRow,
} from "@/lib/hooks/use-resource";

export interface ColumnSpec {
  key: string;
  header: string;
  /** Render the cell however this column needs. */
  render?: (row: ResourceRow) => React.ReactNode;
  className?: string;
}

export interface FilterSpec {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

export interface ResourcePageProps {
  /** REST path, e.g. "badges" or "blog/posts". */
  path: string;
  /** Field the API uses as the primary key. */
  idKey: string;
  subtitle?: string;
  title: string;
  description?: string;
  columns: ColumnSpec[];
  fields: FieldSpec[];
  filters?: FilterSpec[];
  searchPlaceholder?: string;
  /** Singular noun used in buttons and messages, e.g. "badge". */
  noun: string;
  /** Values applied to a new record before the form opens. */
  defaults?: ResourceRow;
  /** Rendered next to the "New" button. */
  extraActions?: React.ReactNode;
  /** Per-row actions rendered before edit/delete. */
  rowActions?: (row: ResourceRow) => React.ReactNode;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  pageSize?: number;
}

export function ResourcePage({
  path,
  idKey,
  subtitle,
  title,
  description,
  columns,
  fields,
  filters = [],
  searchPlaceholder = "Search…",
  noun,
  defaults = {},
  extraActions,
  rowActions,
  canCreate = true,
  canEdit = true,
  canDelete = true,
  pageSize = 10,
}: ResourcePageProps) {
  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [filterValues, setFilterValues] = React.useState<Record<string, string>>(
    Object.fromEntries(filters.map((f) => [f.key, "all"])),
  );
  const [page, setPage] = React.useState(1);

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ResourceRow | null>(null);
  const [values, setValues] = React.useState<Record<string, FieldValue>>({});
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [pendingDelete, setPendingDelete] = React.useState<ResourceRow | null>(null);

  React.useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const query = {
    page,
    limit: pageSize,
    search: debounced || undefined,
    ...filterValues,
  };

  const { data, isLoading, isError, error, refetch } = useResourceList(path, query);
  const createItem = useCreateResource(path);
  const updateItem = useUpdateResource(path);
  const deleteItem = useDeleteResource(path);

  const rows = data?.data ?? [];
  const pagination = data?.pagination;
  const formFields = fields.filter((f) => !f.formHidden);

  // A column backed by a select field shows the option's label, not its raw
  // stored value — so a table reads "Average rating", never "RATING".
  const labelFor = React.useCallback(
    (key: string, value: unknown): string | undefined => {
      const field = fields.find((f) => f.key === key);
      if (!field?.options) return undefined;
      return field.options.find((o) => o.value === String(value))?.label;
    },
    [fields],
  );
  const saving = createItem.isPending || updateItem.isPending;

  function openCreate() {
    setEditing(null);
    setErrors({});
    setValues(
      Object.fromEntries(
        formFields.map((f) => [
          f.key,
          (defaults[f.key] as FieldValue) ?? (f.type === "boolean" ? true : ""),
        ]),
      ),
    );
    setFormOpen(true);
  }

  function openEdit(row: ResourceRow) {
    setEditing(row);
    setErrors({});
    setValues(
      Object.fromEntries(formFields.map((f) => [f.key, row[f.key] as FieldValue])),
    );
    setFormOpen(true);
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: Record<string, string> = {};
    for (const field of formFields) {
      if (!field.required) continue;
      const value = values[field.key];
      if (value === "" || value === null || value === undefined) {
        nextErrors[field.key] = `${field.label} is required`;
      }
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload = { ...defaults, ...values } as ResourceRow;

    if (editing) {
      updateItem.mutate(
        { ...payload, id: String(editing[idKey]) },
        {
          onSuccess: () => {
            toast.success(`${capitalise(noun)} updated`);
            setFormOpen(false);
          },
          onError: (err) => toast.error(messageOf(err, `Could not update the ${noun}`)),
        },
      );
    } else {
      createItem.mutate(payload, {
        onSuccess: () => {
          toast.success(`${capitalise(noun)} created`);
          setFormOpen(false);
          setPage(1);
        },
        onError: (err) => toast.error(messageOf(err, `Could not create the ${noun}`)),
      });
    }
  }

  function confirmDelete() {
    if (!pendingDelete) return;
    deleteItem.mutate(String(pendingDelete[idKey]), {
      onSuccess: () => {
        toast.success(`${capitalise(noun)} deleted`);
        setPendingDelete(null);
      },
      onError: (err) => toast.error(messageOf(err, `Could not delete the ${noun}`)),
    });
  }

  const filtersActive =
    !!debounced || Object.values(filterValues).some((v) => v !== "all");

  return (
    <PageLayout
      subtitle={subtitle}
      header={title}
      description={description}
      actions={
        <div className="flex items-center gap-2">
          {extraActions}
          {canCreate && (
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-1.5 h-4 w-4" />
              New {noun}
            </Button>
          )}
        </div>
      }
      filters={
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder={searchPlaceholder}
              className="h-9 pl-8 text-sm"
              aria-label={searchPlaceholder}
            />
          </div>
          {filters.map((filter) => (
            <Select
              key={filter.key}
              value={filterValues[filter.key] ?? "all"}
              onValueChange={(value) => {
                setFilterValues((prev) => ({ ...prev, [filter.key]: value }));
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-full text-sm sm:w-[190px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All {filter.label.toLowerCase()}</SelectItem>
                {filter.options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}
        </div>
      }
    >
      <div className="space-y-3">
        {isError ? (
          <EmptyState
            title={`We could not load ${noun}s`}
            description={messageOf(error, "Please try again.")}
            action={{ label: "Try again", onClick: () => void refetch() }}
          />
        ) : isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-md" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            title={filtersActive ? `No ${noun}s match those filters` : `No ${noun}s yet`}
            description={
              filtersActive
                ? "Try a different search term or clear the filters."
                : `Create your first ${noun} to get started.`
            }
            action={
              filtersActive
                ? {
                    label: "Clear filters",
                    onClick: () => {
                      setSearch("");
                      setFilterValues(
                        Object.fromEntries(filters.map((f) => [f.key, "all"])),
                      );
                      setPage(1);
                    },
                  }
                : canCreate
                  ? { label: `New ${noun}`, onClick: openCreate }
                  : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((column) => (
                    <TableHead key={column.key} className={column.className}>
                      {column.header}
                    </TableHead>
                  ))}
                  {(canEdit || canDelete || rowActions) && (
                    <TableHead className="w-[1%] text-right">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={String(row[idKey])}>
                    {columns.map((column) => (
                      <TableCell key={column.key} className={column.className}>
                        {column.render
                          ? column.render(row)
                          : formatCell(row[column.key], labelFor(column.key, row[column.key]))}
                      </TableCell>
                    ))}
                    {(canEdit || canDelete || rowActions) && (
                      <TableCell className="text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {rowActions?.(row)}
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEdit(row)}
                              aria-label={`Edit ${noun}`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setPendingDelete(row)}
                              aria-label={`Delete ${noun}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {pagination && pagination.totalPages > 1 && (
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={setPage}
          />
        )}
      </div>

      <FormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? `Edit ${noun}` : `New ${noun}`}
        description={
          editing
            ? `Update this ${noun} and save your changes.`
            : `Add a new ${noun}.`
        }
        onSubmit={submit}
        submitLabel={editing ? "Save changes" : `Create ${noun}`}
        submitting={saving}
      >
        <div className="space-y-4">
          {formFields.map((field) => (
            <ResourceField
              key={field.key}
              field={field}
              value={values[field.key]}
              error={errors[field.key]}
              onChange={(value) =>
                setValues((prev) => ({ ...prev, [field.key]: value }))
              }
            />
          ))}
        </div>
      </FormSheet>

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title={`Delete this ${noun}?`}
        description={`"${labelOf(pendingDelete, columns)}" will be removed. This cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </PageLayout>
  );
}

/* ------------------------------------------------------------- helpers */

function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function messageOf(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function labelOf(row: ResourceRow | null, columns: ColumnSpec[]): string {
  if (!row) return "";
  const first = columns[0];
  return first ? String(row[first.key] ?? "") : "";
}

function formatCell(value: unknown, label?: string): React.ReactNode {
  if (value === null || value === undefined || value === "") return "—";
  if (label) return label;
  if (typeof value === "boolean") {
    return (
      <span
        className={
          value
            ? "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
            : "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground"
        }
      >
        {value ? "Yes" : "No"}
      </span>
    );
  }
  if (Array.isArray(value)) return value.length === 0 ? "—" : value.join(", ");
  if (typeof value === "object") return "—";
  return String(value);
}
