import type { Request, Response } from "express";
import type { LiveCluster } from "./client";
import { getClusterClient } from "./client";

export type ClusterMap = Map<string, LiveCluster>;

export function parseCpuString(cpu: string | undefined): number {
  if (!cpu) return 0;
  if (cpu.endsWith("n")) return parseFloat(cpu) / 1e9;
  if (cpu.endsWith("u")) return parseFloat(cpu) / 1e6;
  if (cpu.endsWith("m")) return parseFloat(cpu) / 1000;
  return parseFloat(cpu) || 0;
}

export function parseMemoryString(mem: string | undefined): number {
  if (!mem) return 0;
  if (mem.endsWith("Ki")) return parseFloat(mem) / 1024;
  if (mem.endsWith("Mi")) return parseFloat(mem);
  if (mem.endsWith("Gi")) return parseFloat(mem) * 1024;
  if (mem.endsWith("Ti")) return parseFloat(mem) * 1024 * 1024;
  return parseFloat(mem) / (1024 * 1024);
}

export function k8sError(res: Response, err: unknown): void {
  res.status(502).json({
    error: `K8s API error: ${err instanceof Error ? err.message : String(err)}`,
  });
}

export function requireCluster(
  req: Request,
  res: Response,
  clusterMap: ClusterMap,
): string | null {
  const clusterId = req.params.id as string;
  // Check the frozen startup map first, then fall back to the live registry
  // (dynamically added clusters won't be in the startup map)
  if (!clusterMap.has(clusterId) && !getClusterClient(clusterId)) {
    res.status(404).json({ error: "Cluster not found" });
    return null;
  }
  return clusterId;
}
