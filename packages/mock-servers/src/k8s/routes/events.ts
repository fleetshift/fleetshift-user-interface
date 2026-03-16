import { Router } from "express";
import { getClusterClient } from "../client";
import { transformEvent } from "../transforms";
import { requireCluster, k8sError, type ClusterMap } from "../utils";

export function eventRoutes(clusterMap: ClusterMap): Router {
  const router = Router();

  router.get("/clusters/:id/events", async (req, res) => {
    const clusterId = requireCluster(req, res, clusterMap);
    if (!clusterId) return;
    try {
      const client = getClusterClient(req.params.id);
      if (!client) {
        res.status(404).json({ error: "Cluster not found" });
        return;
      }
      const core = client.core;
      const eventResponse = await core.listEventForAllNamespaces();
      const events = (eventResponse.items ?? [])
        .map((e) => transformEvent(e, clusterId))
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
      res.json(events);
    } catch (err) {
      k8sError(res, err);
    }
  });

  return router;
}
