"use client";

import { useQuery } from "@tanstack/react-query";
import { IndianRupee, TrendingUp, Users, Wallet } from "lucide-react";

import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TrendBars } from "@/components/admin/trend-bars";
import { apiClient } from "@/lib/api/client";
import { useResourceList } from "@/lib/hooks/use-resource";
import { formatMoney } from "@/lib/format";

interface InstructorDashboard {
  stats: {
    courses: number;
    publishedCourses: number;
    learners: number;
    revenue: number;
    currency: string;
    averageRating: number;
    pendingPayout: number;
    lifetimeEarnings: number;
  };
  revenueTrend: { month: string; value: number }[];
}

export default function InstructorSalesPage() {
  const dashboard = useQuery({
    queryKey: ["instructor/dashboard"],
    queryFn: () =>
      apiClient
        .get<InstructorDashboard>("/instructor/dashboard")
        .then((r) => r.data),
  });
  const sales = useResourceList("instructor/sales", { limit: 25 });

  const stats = dashboard.data?.stats;
  const rows = sales.data?.data ?? [];

  return (
    <PageLayout
      subtitle="Earnings"
      header="My sales"
      description="What your courses sold this period, and what you have earned after commission."
    >
      {dashboard.isLoading || !stats ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border lg:grid-cols-4">
            <Stat
              icon={<IndianRupee className="h-3.5 w-3.5" />}
              label="Gross revenue"
              value={formatMoney(stats.revenue)}
              hint="Across all published courses"
            />
            <Stat
              icon={<Wallet className="h-3.5 w-3.5" />}
              label="Lifetime earnings"
              value={formatMoney(stats.lifetimeEarnings)}
              hint="After the 30% platform share"
            />
            <Stat
              icon={<TrendingUp className="h-3.5 w-3.5" />}
              label="Available to withdraw"
              value={formatMoney(stats.pendingPayout)}
              hint="Past the refund hold period"
            />
            <Stat
              icon={<Users className="h-3.5 w-3.5" />}
              label="Learners"
              value={stats.learners.toLocaleString("en-IN")}
              hint={`${stats.publishedCourses} published courses`}
            />
          </div>

          <div className="grid gap-4 [&>*]:min-w-0 xl:grid-cols-[1fr_380px]">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Sales by course</CardTitle>
              </CardHeader>
              <CardContent>
                {sales.isLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full rounded-md" />
                    ))}
                  </div>
                ) : rows.length === 0 ? (
                  <EmptyState
                    title="No sales yet"
                    description="Sales appear here once a learner buys one of your courses."
                    className="py-8"
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Course</TableHead>
                          <TableHead className="text-right">Units</TableHead>
                          <TableHead className="text-right">Gross</TableHead>
                          <TableHead className="text-right">Commission</TableHead>
                          <TableHead className="text-right">You earn</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((row) => (
                          <TableRow key={String(row.id)}>
                            <TableCell className="font-medium">
                              {String(row.courseTitle ?? "")}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {Number(row.unitsSold ?? 0)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatMoney(Number(row.grossRevenue ?? 0))}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-muted-foreground">
                              {Number(row.commissionRate ?? 0)}%
                            </TableCell>
                            <TableCell className="text-right font-medium tabular-nums">
                              {formatMoney(Number(row.netEarnings ?? 0))}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Earnings by month</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Your share, after commission.
                </p>
              </CardHeader>
              <CardContent>
                <TrendBars
                  data={dashboard.data?.revenueTrend ?? []}
                  format={(v) => formatMoney(v)}
                  label="Monthly earnings"
                />
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </PageLayout>
  );
}

function Stat({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="bg-card px-4 py-3">
      <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums leading-none">
        {value}
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}
