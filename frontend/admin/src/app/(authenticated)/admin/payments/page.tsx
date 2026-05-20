"use client";
import { PageLayout } from "@/components/layout/page-layout";
import { Download, CreditCard, X } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { PageFilters } from "@/components/layout/page-filters";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useState, useCallback } from "react";
import { usePayments, usePaymentById } from "@/features/payments/hooks/use-payments";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";

export default function PaymentManagementPage() {
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search, 500);
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [gatewayFilter, setGatewayFilter] = useState<string>("all");

    const [detailId, setDetailId] = useState<string | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);

    const { data: paymentsData, isLoading, isFetching } = usePayments({
        enabled: true,
        filters: {
            search: debouncedSearch || undefined,
            limit: 20,
            page,
            status: statusFilter === "all" ? undefined : statusFilter,
            gateway: gatewayFilter === "all" ? undefined : gatewayFilter,
        },
    });

    const { data: paymentDetail, isLoading: detailLoading } = usePaymentById(
        detailId,
        sheetOpen,
    );

    const payments = paymentsData?.data ?? [];
    const pagination = paymentsData?.pagination;

    const handleViewDetails = useCallback((paymentId: string) => {
        setDetailId(paymentId);
        setSheetOpen(true);
    }, []);

    const statusColor = (status: string) => {
        if (status === "COMPLETED") return "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200";
        if (status === "PENDING") return "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200";
        return "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200";
    };

    return (
        <PageLayout
            header="Payment Management"
            description="Track platform revenue, transactions, and payment status."
            actions={
                <Button
                    variant="outline"
                    onClick={() => {
                        if (payments.length === 0) {
                            toast.warning("No payment data available to export");
                            return;
                        }
                        const { exportToCSV } = require("@/lib/utils/export");
                        exportToCSV(
                            payments.map((p) => ({
                                "Payment ID": p.paymentId,
                                Amount: `₹${parseFloat(String(p.amount)).toFixed(2)}`,
                                Gateway: p.gateway,
                                Status: p.status,
                                Date: new Date(p.createdAt).toLocaleDateString(),
                            })),
                            "payments_export"
                        );
                        toast.success("Payment data exported successfully");
                    }}
                >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                </Button>
            }
            filters={
                <PageFilters search={search} onSearchChange={setSearch} searchPlaceholder="Search by payment ID...">
                    <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                        <SelectTrigger className="h-8 text-xs w-full sm:w-[140px]">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="PENDING">Pending</SelectItem>
                            <SelectItem value="PROOF_UPLOADED">Proof Uploaded</SelectItem>
                            <SelectItem value="COMPLETED">Completed</SelectItem>
                            <SelectItem value="REJECTED">Rejected</SelectItem>
                            <SelectItem value="FAILED">Failed</SelectItem>
                            <SelectItem value="REFUNDED">Refunded</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={gatewayFilter} onValueChange={(v) => { setGatewayFilter(v); setPage(1); }}>
                        <SelectTrigger className="h-8 text-xs w-full sm:w-[140px]">
                            <SelectValue placeholder="Gateway" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Gateways</SelectItem>
                            <SelectItem value="MANUAL_QR">Manual QR</SelectItem>
                            <SelectItem value="RAZORPAY">Razorpay</SelectItem>
                            <SelectItem value="FREE">Free</SelectItem>
                        </SelectContent>
                    </Select>
                </PageFilters>
            }
        >
            {isLoading ? (
                <DataTableSkeleton columnCount={6} rowCount={10} />
            ) : payments.length === 0 ? (
                <EmptyState
                    title="No payments found"
                    description="Payment transactions will appear here once users make purchases."
                    icon={<CreditCard className="h-12 w-12" />}
                />
            ) : (
                <Card>
                    <CardContent className="p-0">
                        <div className={`overflow-x-auto ${isFetching ? "opacity-50" : ""}`}>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="min-w-[120px]">Payment ID</TableHead>
                                        <TableHead className="min-w-[100px]">Amount</TableHead>
                                        <TableHead className="min-w-[80px] hidden sm:table-cell">Gateway</TableHead>
                                        <TableHead className="min-w-[80px]">Status</TableHead>
                                        <TableHead className="min-w-[100px] hidden md:table-cell">Date</TableHead>
                                        <TableHead className="text-right min-w-[100px]">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {payments.map((payment) => (
                                        <TableRow key={payment.paymentId}>
                                            <TableCell className="font-mono text-xs truncate max-w-[150px]">
                                                {payment.paymentId}
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap">
                                                ₹{parseFloat(String(payment.amount)).toFixed(2)}
                                            </TableCell>
                                            <TableCell className="hidden sm:table-cell">
                                                <Badge variant="outline">{payment.gateway}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <span className={`px-2 py-1 text-xs rounded whitespace-nowrap ${statusColor(payment.status)}`}>
                                                    {payment.status}
                                                </span>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell">
                                                {new Date(payment.createdAt).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleViewDetails(payment.paymentId)}
                                                >
                                                    View Details
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                    {pagination && (pagination.totalPages ?? 0) > 1 ? (
                        <div className="flex items-center justify-between px-4 py-3 border-t">
                            <div className="text-sm text-muted-foreground">
                                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={pagination.page === 1}
                                >
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage((p) => Math.min(pagination.totalPages!, p + 1))}
                                    disabled={pagination.page === pagination.totalPages}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    ) : null}
                </Card>
            )}

            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetContent className="sm:max-w-lg flex flex-col gap-0 p-0">
                    <SheetHeader className="px-6 py-4 border-b shrink-0">
                        <SheetTitle>Payment Details</SheetTitle>
                    </SheetHeader>
                    {detailLoading ? (
                        <div className="space-y-3 p-6">
                            <Skeleton className="h-6 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-2/3" />
                        </div>
                    ) : paymentDetail ? (
                        <ScrollArea className="flex-1 px-6 py-4">
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-muted-foreground">Payment ID</p>
                                <p className="font-mono text-sm break-all">{paymentDetail.paymentId}</p>
                            </div>
                            <Separator />
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <p className="text-sm text-muted-foreground">Amount</p>
                                    <p className="font-semibold">₹{parseFloat(String(paymentDetail.amount)).toFixed(2)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Status</p>
                                    <Badge className={statusColor(paymentDetail.status)}>{paymentDetail.status}</Badge>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Gateway</p>
                                    <p className="text-sm">{paymentDetail.gateway}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Item Type</p>
                                    <p className="text-sm">{paymentDetail.itemType || "-"}</p>
                                </div>
                            </div>
                            {(paymentDetail.originalAmount || paymentDetail.discountAmount) && (
                                <>
                                    <Separator />
                                    <div className="grid grid-cols-2 gap-3">
                                        {paymentDetail.originalAmount && (
                                            <div>
                                                <p className="text-sm text-muted-foreground">Original Amount</p>
                                                <p className="text-sm">₹{parseFloat(String(paymentDetail.originalAmount)).toFixed(2)}</p>
                                            </div>
                                        )}
                                        {paymentDetail.discountAmount && parseFloat(String(paymentDetail.discountAmount)) > 0 && (
                                            <div>
                                                <p className="text-sm text-muted-foreground">Discount</p>
                                                <p className="text-sm text-green-600">-₹{parseFloat(String(paymentDetail.discountAmount)).toFixed(2)}</p>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                            {paymentDetail.user && (
                                <>
                                    <Separator />
                                    <div>
                                        <p className="text-sm text-muted-foreground">User</p>
                                        <p className="text-sm font-medium">
                                            {[paymentDetail.user.firstName, paymentDetail.user.lastName].filter(Boolean).join(" ") || "N/A"}
                                        </p>
                                        <p className="text-sm text-muted-foreground">{paymentDetail.user.email}</p>
                                    </div>
                                </>
                            )}
                            {paymentDetail.course && (
                                <>
                                    <Separator />
                                    <div>
                                        <p className="text-sm text-muted-foreground">Course</p>
                                        <p className="text-sm font-medium">{paymentDetail.course.title}</p>
                                    </div>
                                </>
                            )}
                            {paymentDetail.section && (
                                <div>
                                    <p className="text-sm text-muted-foreground">Section</p>
                                    <p className="text-sm">{paymentDetail.section.title}</p>
                                </div>
                            )}
                            {paymentDetail.coupon && (
                                <>
                                    <Separator />
                                    <div>
                                        <p className="text-sm text-muted-foreground">Coupon</p>
                                        <p className="text-sm font-mono">{paymentDetail.coupon.couponCode}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {paymentDetail.coupon.discountType === "PERCENTAGE"
                                                ? `${paymentDetail.coupon.discountValue}%`
                                                : `₹${paymentDetail.coupon.discountValue}`
                                            }
                                        </p>
                                    </div>
                                </>
                            )}
                            <Separator />
                            <div>
                                <p className="text-sm text-muted-foreground">Created</p>
                                <p className="text-sm">{new Date(paymentDetail.createdAt).toLocaleString()}</p>
                            </div>
                        </div>
                        </ScrollArea>
                    ) : (
                        <p className="text-muted-foreground p-6">No payment data found.</p>
                    )}
                </SheetContent>
            </Sheet>
        </PageLayout>
    );
}
