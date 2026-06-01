import { useState, useEffect, useCallback } from "react";

function jitter(value: number, pct: number): number {
  const delta = value * pct * (Math.random() * 2 - 1);
  return Math.max(0, Math.round((value + delta) * 100) / 100);
}

function jitterInt(value: number, pct: number): number {
  return Math.round(jitter(value, pct));
}

export function useLiveServices() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(
      () => setTick((t) => t + 1),
      15000 + Math.random() * 15000,
    );
    return () => clearInterval(id);
  }, []);

  return useCallback(() => {
    void tick;
    return [
      {
        name: "Fraud Analysis Pipeline",
        clusterId: "ocp-vsphere-dc1",
        requestsPerSec: jitterInt(12400, 0.05),
        errorRate: jitter(0.02, 0.3),
        p99Latency: jitterInt(38, 0.1),
        status: "healthy" as const,
      },
      {
        name: "Transaction Gateway",
        clusterId: "ocp-aws-east1",
        requestsPerSec: jitterInt(45200, 0.03),
        errorRate: jitter(0.01, 0.4),
        p99Latency: jitterInt(12, 0.15),
        status: "healthy" as const,
      },
      {
        name: "Edge UPF - Chicago",
        clusterId: "edge-chicago",
        requestsPerSec: jitterInt(8300, 0.08),
        errorRate: jitter(0.15, 0.2),
        p99Latency: jitterInt(85, 0.12),
        status: "degraded" as const,
      },
      {
        name: "Edge UPF - Dallas",
        clusterId: "edge-dallas",
        requestsPerSec: jitterInt(9100, 0.04),
        errorRate: jitter(0.01, 0.3),
        p99Latency: jitterInt(22, 0.1),
        status: "healthy" as const,
      },
      {
        name: "Roaming Gateway",
        clusterId: "ocp-gcp-eu1",
        requestsPerSec: jitterInt(18700, 0.04),
        errorRate: jitter(0.03, 0.25),
        p99Latency: jitterInt(45, 0.08),
        status: "healthy" as const,
      },
    ];
  }, [tick]);
}

export function useLiveSlos() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(
      () => setTick((t) => t + 1),
      20000 + Math.random() * 20000,
    );
    return () => clearInterval(id);
  }, []);

  return useCallback(() => {
    void tick;
    return [
      {
        service: "Global Fraud Analysis Pipeline",
        metric: "Transaction Approval Latency",
        target: "< 50ms p99",
        budgetRemaining: jitter(85, 0.02),
        budgetTotal: 100,
        trend: "stable" as const,
      },
      {
        service: "Edge Network (UPF)",
        metric: "Packet Processing Latency",
        target: "< 10ms p99",
        budgetRemaining: jitter(97, 0.01),
        budgetTotal: 100,
        trend: "stable" as const,
      },
    ];
  }, [tick]);
}
