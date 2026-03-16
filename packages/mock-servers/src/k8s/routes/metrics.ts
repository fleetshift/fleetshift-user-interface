import { Router } from "express";
import { getClusterClient } from "../client";
import {
  requireCluster,
  k8sError,
  parseCpuString,
  parseMemoryString,
  type ClusterMap,
} from "../utils";

export function metricsRoutes(clusterMap: ClusterMap): Router {
  const router = Router();

  router.get("/clusters/:id/metrics", async (req, res) => {
    const clusterId = requireCluster(req, res, clusterMap);
    if (!clusterId) return;
    try {
      const client = getClusterClient(req.params.id);
      if (!client) {
        res.status(404).json({ error: "Cluster not found" });
        return;
      }
      const core = client.core;
      const [podResponse, nodeResponse] = await Promise.all([
        core.listPodForAllNamespaces().catch(() => ({ items: [] })),
        core.listNode().catch(() => ({ items: [] })),
      ]);

      const pods = podResponse.items ?? [];
      const nodes = nodeResponse.items ?? [];

      const podCpuMap = new Map<string, number>();
      const podMemMap = new Map<string, number>();
      const metrics = client.metrics;
      if (metrics) {
        try {
          const pm = await metrics.getPodMetrics();
          for (const item of pm.items) {
            let cpu = 0;
            let mem = 0;
            for (const c of item.containers) {
              cpu += parseCpuString(c.usage.cpu);
              mem += parseMemoryString(c.usage.memory);
            }
            podCpuMap.set(item.metadata.name, cpu);
            podMemMap.set(item.metadata.name, mem);
          }
        } catch {
          // No metrics
        }
      }

      const cpuValues = Array.from(podCpuMap.values());
      const memValues = Array.from(podMemMap.values());
      const totalCpu = cpuValues.reduce((s, v) => s + v, 0);
      const totalMem = memValues.reduce((s, v) => s + v, 0);

      let totalCpuCapacity = 0;
      let totalMemCapacity = 0;
      for (const node of nodes) {
        const cap = node.status?.capacity ?? {};
        totalCpuCapacity += parseCpuString(cap.cpu);
        totalMemCapacity += parseMemoryString(cap.memory);
      }

      const topCpuConsumers = pods
        .map((p) => ({
          name: p.metadata?.name ?? "unknown",
          namespace: p.metadata?.namespace ?? "default",
          cpu: podCpuMap.get(p.metadata?.name ?? "") ?? 0,
        }))
        .sort((a, b) => b.cpu - a.cpu)
        .slice(0, 5);

      const topMemoryConsumers = pods
        .map((p) => ({
          name: p.metadata?.name ?? "unknown",
          namespace: p.metadata?.namespace ?? "default",
          memory: podMemMap.get(p.metadata?.name ?? "") ?? 0,
        }))
        .sort((a, b) => b.memory - a.memory)
        .slice(0, 5);

      res.json({
        clusterId,
        podCount: pods.length,
        totalCpu: Math.round(totalCpu * 100) / 100,
        totalMemory: Math.round(totalMem * 100) / 100,
        avgCpu: cpuValues.length
          ? Math.round((totalCpu / cpuValues.length) * 100) / 100
          : 0,
        avgMemory: memValues.length
          ? Math.round((totalMem / memValues.length) * 100) / 100
          : 0,
        maxCpu: totalCpuCapacity,
        maxMemory: Math.round(totalMemCapacity),
        topCpuConsumers,
        topMemoryConsumers,
      });
    } catch (err) {
      k8sError(res, err);
    }
  });

  return router;
}
