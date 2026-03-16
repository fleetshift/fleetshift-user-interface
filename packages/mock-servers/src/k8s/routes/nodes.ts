import { Router } from "express";
import { getClusterClient } from "../client";
import { transformNode } from "../transforms";
import {
  requireCluster,
  k8sError,
  parseCpuString,
  parseMemoryString,
  type ClusterMap,
} from "../utils";

export function nodeRoutes(clusterMap: ClusterMap): Router {
  const router = Router();

  router.get("/clusters/:id/nodes", async (req, res) => {
    const clusterId = requireCluster(req, res, clusterMap);
    if (!clusterId) return;
    try {
      const client = getClusterClient(req.params.id);
      if (!client) {
        res.status(404).json({ error: "Cluster not found" });
        return;
      }
      const core = client.core;
      const nodeResponse = await core.listNode();
      const nodes = nodeResponse.items ?? [];

      const nodeMetrics = new Map<string, { cpu: number; memory: number }>();
      const metrics = client.metrics;
      if (metrics) {
        try {
          const metricsResponse = await metrics.getNodeMetrics();
          for (const nm of metricsResponse.items) {
            nodeMetrics.set(nm.metadata.name, {
              cpu: parseCpuString(nm.usage.cpu),
              memory: parseMemoryString(nm.usage.memory),
            });
          }
        } catch {
          // Metrics not ready
        }
      }

      const result = nodes.map((node) => {
        const m = nodeMetrics.get(node.metadata?.name ?? "");
        return transformNode(node, clusterId, m?.cpu ?? 0, m?.memory ?? 0);
      });

      res.json(result);
    } catch (err) {
      k8sError(res, err);
    }
  });

  return router;
}
