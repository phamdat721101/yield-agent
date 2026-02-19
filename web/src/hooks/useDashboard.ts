"use client";

import { useQuery } from "@tanstack/react-query";

export interface DashboardProtocol {
  name: string;
  tvl: number;
  change_1d: number | null;
  category: string;
}

export interface DashboardYield {
  project: string;
  symbol: string;
  apy: number | null;
  tvlUsd: number;
}

export interface DashboardInsight {
  title: string;
  content: string;
  created_at: string;
}

export interface DashboardOpportunity {
  rank: number;
  protocol: string;
  pool_name: string;
  category: string;
  tokens: string[];
  apy_total: number | null;
  tvl_usd: number;
  opp_score: number;
  risk_score: number;
  risk_level: 'green' | 'yellow' | 'red';
}

export interface DashboardNarration {
  content: string;
  created_at: string;
}

export interface PortfolioPnL {
  totalDeposited: number;
  totalWithdrawn: number;
  estimatedEarnings: number;
  netPnL: number;
  effectiveApy: number;
}

export interface DashboardData {
  protocols: DashboardProtocol[];
  yields: DashboardYield[];
  insights: DashboardInsight[];
  opportunities: DashboardOpportunity[];
  narration: DashboardNarration | null;
  portfolioPnL: PortfolioPnL | null;
  lastUpdated: string | null;
  source: string;
}

export function useDashboard() {
  return useQuery<DashboardData>({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard");
      if (!res.ok) throw new Error("Failed to fetch dashboard data");
      return res.json();
    },
    refetchInterval: 5 * 60 * 1000, // 5-min auto-refresh
    staleTime: 2 * 60 * 1000,
  });
}
