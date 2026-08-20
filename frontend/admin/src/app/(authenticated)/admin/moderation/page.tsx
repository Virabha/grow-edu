"use client";
import { PageLayout } from "@/components/layout/page-layout";
import { GraduationCap } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { PageFilters } from "@/components/layout/page-filters";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table";
import { useState } from "react";
import Link from "next/link";
import { useBatches, useUpdateBatch } from "@/features/batches/hooks/use-batches";
import type { Batch } from "@/features/batches/types";
import { getApiError } from "@/lib/api/errors";

export default function ContentModerationPage() {
    const [search, setSearch] = useState("");
    const { data: batchesData, isLoading } = useBatches(
        { status: "DRAFT", limit: 100 },
        true,
    );
    const updateBatch = useUpdateBatch();

    const handlePublish = async (batchId: string) => {
        try {
            await updateBatch.mutateAsync({ batchId, dto: { status: "UPCOMING" } });
            toast.success("Batch published.");
        }
        catch (error: unknown) {
            toast.error(getApiError(error, "Failed to publish batch").message);
        }
    };

    const batchesArray = batchesData?.data ?? [];
    const filteredBatches = batchesArray.filter((batch: Batch) => {
        if (search) {
            return batch.title.toLowerCase().includes(search.toLowerCase());
        }
        return true;
    });

    return (
        <PageLayout
            subtitle="Console"
            header="Moderation"
            description="Review draft batches and publish when ready."
            filters={
                <PageFilters search={search} onSearchChange={setSearch} searchPlaceholder="Search draft batches…" />
            }
        >
            {isLoading ? (
                <DataTableSkeleton columnCount={4} rowCount={6} />
            ) : filteredBatches.length === 0 ? (
                <EmptyState
                    title="No draft batches"
                    description="There are no batches currently in draft status."
                    icon={<GraduationCap className="h-12 w-12" />}
                />
            ) : (
                <div className="overflow-hidden rounded-2xl border border-border bg-card">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-b-border/70">
                                    <TableHead className="font-display text-xs">Batch</TableHead>
                                    <TableHead className="hidden font-display text-xs md:table-cell">Delivery</TableHead>
                                    <TableHead className="hidden font-display text-xs sm:table-cell">Start date</TableHead>
                                    <TableHead className="text-right font-display text-xs">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredBatches.map((batch: Batch) => (
                                    <TableRow key={batch.batchId} className="border-b-border/60 transition-colors hover:bg-muted/40">
                                        <TableCell className="font-medium">
                                            <div className="flex flex-col">
                                                <span className="line-clamp-1">{batch.title}</span>
                                                <span className="text-xs text-muted-foreground">
                                                    {batch.targetExam ?? ""}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                                            {batch.deliveryMode}
                                        </TableCell>
                                        <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                                            {new Date(batch.startDate).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Link href={`/admin/batches/${batch.batchId}`}>
                                                    <Button variant="outline" size="sm">
                                                        Review
                                                    </Button>
                                                </Link>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                                    onClick={() => handlePublish(batch.batchId)}
                                                    disabled={updateBatch.isPending}
                                                >
                                                    Publish
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}
        </PageLayout>
    );
}
