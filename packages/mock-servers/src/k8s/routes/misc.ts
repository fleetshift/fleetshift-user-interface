import { Router } from "express";
import type { LiveCluster } from "../client";
import type { ClusterMap } from "../utils";

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

  return router;
}
