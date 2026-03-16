import { Router } from "express";
import { getClusterClient } from "../client";
import { transformPV, transformPVC } from "../transforms";
import { requireCluster, k8sError, type ClusterMap } from "../utils";

export function storageRoutes(clusterMap: ClusterMap): Router {
  const router = Router();

  router.get("/clusters/:id/pvs", async (req, res) => {
    const clusterId = requireCluster(req, res, clusterMap);
    if (!clusterId) return;
    try {
      const client = getClusterClient(req.params.id);
      if (!client) {
        res.status(404).json({ error: "Cluster not found" });
        return;
      }
      const core = client.core;
      const pvResponse = await core.listPersistentVolume();
      const result = (pvResponse.items ?? []).map((pv) =>
        transformPV(pv, clusterId),
      );
      res.json(result);
    } catch (err) {
      k8sError(res, err);
    }
  });

  router.get("/clusters/:id/pvcs", async (req, res) => {
    const clusterId = requireCluster(req, res, clusterMap);
    if (!clusterId) return;
    try {
      const client = getClusterClient(req.params.id);
      if (!client) {
        res.status(404).json({ error: "Cluster not found" });
        return;
      }
      const core = client.core;
      const pvcResponse =
        await core.listPersistentVolumeClaimForAllNamespaces();
      const result = (pvcResponse.items ?? []).map((pvc) =>
        transformPVC(pvc, clusterId),
      );
      res.json(result);
    } catch (err) {
      k8sError(res, err);
    }
  });

  return router;
}
