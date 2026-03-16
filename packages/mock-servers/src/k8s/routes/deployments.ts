import { Router } from "express";
import { getClusterClient } from "../client";
import { transformDeployment } from "../transforms";
import { requireCluster, k8sError, type ClusterMap } from "../utils";

export function deploymentRoutes(clusterMap: ClusterMap): Router {
  const router = Router();

  router.get("/clusters/:id/deployments", async (req, res) => {
    const clusterId = requireCluster(req, res, clusterMap);
    if (!clusterId) return;
    try {
      const client = getClusterClient(req.params.id);
      if (!client) {
        res.status(404).json({ error: "Cluster not found" });
        return;
      }
      const apps = client.apps;
      const depResponse = await apps.listDeploymentForAllNamespaces();
      const result = (depResponse.items ?? []).map((dep) =>
        transformDeployment(dep, clusterId),
      );
      res.json(result);
    } catch (err) {
      k8sError(res, err);
    }
  });

  router.get("/clusters/:id/deployments/:deployId", async (req, res) => {
    const clusterId = requireCluster(req, res, clusterMap);
    if (!clusterId) return;
    try {
      const client = getClusterClient(req.params.id);
      if (!client) {
        res.status(404).json({ error: "Cluster not found" });
        return;
      }
      const depResponse = await client.apps.listDeploymentForAllNamespaces();
      const all = (depResponse.items ?? []).map((dep) =>
        transformDeployment(dep, clusterId),
      );
      const { deployId } = req.params;
      const found =
        all.find((d) => d.id === deployId) ??
        all.find((d) => d.name === deployId);
      if (!found) {
        res.status(404).json({ error: "Deployment not found" });
        return;
      }
      res.json(found);
    } catch (err) {
      k8sError(res, err);
    }
  });

  return router;
}
