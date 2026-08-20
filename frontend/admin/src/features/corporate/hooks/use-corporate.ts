"use client";
import { useQuery } from "@tanstack/react-query";
import { axiosGet } from "@/lib/api/client";

export type ContractStatus =
  | "DRAFT"
  | "AWAITING_PAYMENT"
  | "ACTIVE"
  | "EXPIRING"
  | "EXPIRED"
  | "CANCELLED";

export interface ContractBatch {
  batchId: string;
  title: string;
  slug: string;
}

export interface MyContract {
  contractId: string;
  title: string;
  status: ContractStatus;
  seatCount: number;
  seatsClaimed: number;
  seatsRemaining: number;
  daysUntilExpiry: number;
  startsAt: string;
  endsAt: string;
  batches: ContractBatch[];
}

export interface RosterEntry {
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  claimedAt: string;
}

export function useMyContracts(enabled = true) {
  return useQuery({
    queryKey: ["corporate", "me", "contracts"],
    queryFn: async () => {
      const res = await axiosGet<MyContract[]>("corporate/me/contracts");
      return res.data;
    },
    enabled,
  });
}

export function useContractRoster(contractId: string | null) {
  return useQuery({
    queryKey: ["corporate", "me", "roster", contractId],
    queryFn: async () => {
      const res = await axiosGet<RosterEntry[]>(
        `corporate/me/contracts/${contractId}/roster`,
      );
      return res.data;
    },
    enabled: !!contractId,
  });
}
