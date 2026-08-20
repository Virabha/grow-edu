"use client";
import { useState } from "react";
import { GraduationCap, Users } from "lucide-react";

import { PageLayout } from "@/components/layout/page-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useContractRoster,
  useMyContracts,
  type ContractStatus,
} from "@/features/corporate/hooks/use-corporate";

const STATUS_TONE: Record<ContractStatus, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  AWAITING_PAYMENT: "bg-amber-100 text-amber-900",
  ACTIVE: "bg-emerald-100 text-emerald-900",
  EXPIRING: "bg-amber-100 text-amber-900",
  EXPIRED: "bg-muted text-muted-foreground",
  CANCELLED: "bg-muted text-muted-foreground",
};

function fullName(entry: { firstName: string | null; lastName: string | null }) {
  return [entry.firstName, entry.lastName].filter(Boolean).join(" ");
}

export default function CorporateEnrollmentsPage() {
  const { data: contracts, isLoading } = useMyContracts();
  const [openContractId, setOpenContractId] = useState<string | null>(null);
  const { data: roster, isLoading: rosterLoading } =
    useContractRoster(openContractId);

  return (
    <PageLayout
      subtitle="Corporate"
      header="Seats and roster"
      description="What your organisation bought, and who has claimed a seat."
    >
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      ) : !contracts || contracts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <GraduationCap className="mx-auto size-12 text-muted-foreground/40" />
          <p className="font-display mt-4 text-xl font-medium text-foreground">
            No contracts yet
          </p>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Once groEdu records a contract for your organisation, its seats and
            roster appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {contracts.map((contract) => (
            <Card key={contract.contractId}>
              <CardHeader className="flex-row items-start justify-between gap-4">
                <div className="min-w-0">
                  <CardTitle className="truncate">{contract.title}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {contract.batches.map((b) => b.title).join(" · ") ||
                      "No batches attached yet"}
                  </p>
                </div>
                <Badge className={STATUS_TONE[contract.status]}>
                  {contract.status.replace("_", " ").toLowerCase()}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-6 text-sm">
                  <div>
                    <p className="text-muted-foreground">Seats claimed</p>
                    <p className="font-display text-2xl font-medium">
                      {contract.seatsClaimed}
                      <span className="text-base text-muted-foreground">
                        {" "}
                        / {contract.seatCount}
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Remaining</p>
                    <p className="font-display text-2xl font-medium">
                      {contract.seatsRemaining}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Ends</p>
                    <p className="font-medium">
                      {new Date(contract.endsAt).toLocaleDateString()}
                      {contract.daysUntilExpiry > 0 && (
                        <span className="text-muted-foreground">
                          {" "}
                          · {contract.daysUntilExpiry} days left
                        </span>
                      )}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-auto gap-1.5"
                    onClick={() =>
                      setOpenContractId(
                        openContractId === contract.contractId
                          ? null
                          : contract.contractId,
                      )
                    }
                  >
                    <Users className="size-3.5" />
                    {openContractId === contract.contractId
                      ? "Hide roster"
                      : "View roster"}
                  </Button>
                </div>

                {openContractId === contract.contractId && (
                  <div className="mt-6 border-t border-border pt-4">
                    {rosterLoading ? (
                      <Skeleton className="h-24 rounded-lg" />
                    ) : !roster || roster.length === 0 ? (
                      <p className="py-4 text-sm text-muted-foreground">
                        Nobody has claimed a seat yet. Share the join link your
                        groEdu contact gave you.
                      </p>
                    ) : (
                      <ul className="divide-y divide-border">
                        {roster.map((entry) => (
                          <li
                            key={entry.userId}
                            className="flex items-center justify-between gap-4 py-2.5 text-sm"
                          >
                            <div className="min-w-0">
                              <p className="truncate font-medium">
                                {fullName(entry) || entry.email}
                              </p>
                              {fullName(entry) && (
                                <p className="truncate text-xs text-muted-foreground">
                                  {entry.email}
                                </p>
                              )}
                            </div>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              joined{" "}
                              {new Date(entry.claimedAt).toLocaleDateString()}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageLayout>
  );
}
