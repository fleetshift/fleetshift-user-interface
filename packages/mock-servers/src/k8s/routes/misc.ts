import { Router } from "express";
import { getClusterClient, type LiveCluster } from "../client";
import {
  requireCluster,
  k8sError,
  parseCpuString,
  parseMemoryString,
  type ClusterMap,
} from "../utils";

export function miscRoutes(
  clusterMap: ClusterMap,
  _liveClusters: LiveCluster[],
): Router {
  const router = Router();

  // Pipelines (not in vanilla k8s)
  router.get("/clusters/:id/pipelines", (req, res) => {
    if (!clusterMap.has(req.params.id as string)) {
      res.status(404).json({ error: "Cluster not found" });
      return;
    }
    res.json([]);
  });

  // GitOps (not in vanilla k8s)
  router.get("/clusters/:id/gitops", (req, res) => {
    if (!clusterMap.has(req.params.id as string)) {
      res.status(404).json({ error: "Cluster not found" });
      return;
    }
    res.json([]);
  });

  // Upgrades
  router.get("/clusters/:id/upgrades", (req, res) => {
    const cluster = clusterMap.get(req.params.id as string);
    if (!cluster) {
      res.status(404).json({ error: "Cluster not found" });
      return;
    }
    res.json({
      currentVersion: cluster.version,
      latestVersion: cluster.version,
      upToDate: true,
      availableUpdates: [],
    });
  });

  // Cost estimation
  router.get("/clusters/:id/cost", async (req, res) => {
    const clusterId = requireCluster(req, res, clusterMap);
    if (!clusterId) return;
    try {
      const client = getClusterClient(req.params.id);
      if (!client) {
        res.status(404).json({ error: "Cluster not found" });
        return;
      }
      const core = client.core;
      const podResponse = await core.listPodForAllNamespaces();

      const CPU_RATE = 0.048;
      const MEM_RATE = 0.006;
      const HOURS_PER_MONTH = 730;

      const nsCosts = new Map<string, { cpu: number; memory: number }>();

      for (const pod of podResponse.items ?? []) {
        const ns = pod.metadata?.namespace ?? "default";
        const entry = nsCosts.get(ns) ?? { cpu: 0, memory: 0 };
        for (const container of pod.spec?.containers ?? []) {
          const requests = container.resources?.requests ?? {};
          entry.cpu += parseCpuString(requests.cpu);
          entry.memory += parseMemoryString(requests.memory) / 1024;
        }
        nsCosts.set(ns, entry);
      }

      let totalCost = 0;
      const namespaces = Array.from(nsCosts.entries()).map(([ns, usage]) => {
        const cost =
          usage.cpu * CPU_RATE * HOURS_PER_MONTH +
          usage.memory * MEM_RATE * HOURS_PER_MONTH;
        totalCost += cost;
        return {
          namespace: ns,
          cpuCores: Math.round(usage.cpu * 100) / 100,
          memoryMB: Math.round(usage.memory * 1024),
          estimatedMonthlyCost: Math.round(cost * 100) / 100,
        };
      });

      res.json({
        totalEstimatedMonthlyCost: Math.round(totalCost * 100) / 100,
        namespaces,
      });
    } catch (err) {
      k8sError(res, err);
    }
  });

  return router;
}
