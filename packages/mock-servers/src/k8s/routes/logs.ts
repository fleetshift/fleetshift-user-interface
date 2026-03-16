import { Router } from "express";
import { getClusterClient } from "../client";
import { requireCluster, k8sError, type ClusterMap } from "../utils";

export function logRoutes(clusterMap: ClusterMap): Router {
  const router = Router();

  router.get("/clusters/:id/logs", async (req, res) => {
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
      const runningPods = (podResponse.items ?? []).filter(
        (p) => p.status?.phase === "Running",
      );

      const logLines: Array<{
        timestamp: string;
        pod: string;
        namespace: string;
        level: string;
        message: string;
      }> = [];

      const sample = runningPods.slice(0, 10);
      await Promise.allSettled(
        sample.map(async (pod) => {
          const name = pod.metadata?.name ?? "";
          const namespace = pod.metadata?.namespace ?? "";
          try {
            const log = await core.readNamespacedPodLog({
              name,
              namespace,
              tailLines: 5,
              sinceSeconds: 3600,
            });
            if (typeof log === "string" && log.trim()) {
              for (const line of log.trim().split("\n").slice(-5)) {
                const level = /error/i.test(line)
                  ? "ERROR"
                  : /warn/i.test(line)
                    ? "WARN"
                    : /debug/i.test(line)
                      ? "DEBUG"
                      : "INFO";
                logLines.push({
                  timestamp: new Date().toISOString(),
                  pod: name,
                  namespace,
                  level,
                  message: line.substring(0, 500),
                });
              }
            }
          } catch {
            // Pod may not have logs
          }
        }),
      );

      res.json(logLines.slice(0, 100));
    } catch (err) {
      k8sError(res, err);
    }
  });

  return router;
}
