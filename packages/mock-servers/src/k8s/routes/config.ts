import { Router } from "express";
import { getClusterClient } from "../client";
import { requireCluster, k8sError, type ClusterMap } from "../utils";

export function configRoutes(clusterMap: ClusterMap): Router {
  const router = Router();

  router.get("/clusters/:id/configmaps", async (req, res) => {
    const clusterId = requireCluster(req, res, clusterMap);
    if (!clusterId) return;
    try {
      const client = getClusterClient(req.params.id);
      if (!client) {
        res.status(404).json({ error: "Cluster not found" });
        return;
      }
      const core = client.core;
      const cmResponse = await core.listConfigMapForAllNamespaces();
      const result = (cmResponse.items ?? []).map((cm) => ({
        id: cm.metadata?.uid ?? `${clusterId}-cm-${cm.metadata?.name}`,
        cluster_id: clusterId,
        namespace_id: `${clusterId}-${cm.metadata?.namespace ?? "default"}`,
        name: cm.metadata?.name ?? "unknown",
        data_keys: JSON.stringify(Object.keys(cm.data ?? {})),
      }));
      res.json(result);
    } catch (err) {
      k8sError(res, err);
    }
  });

  router.get("/clusters/:id/secrets", async (req, res) => {
    const clusterId = requireCluster(req, res, clusterMap);
    if (!clusterId) return;
    try {
      const client = getClusterClient(req.params.id);
      if (!client) {
        res.status(404).json({ error: "Cluster not found" });
        return;
      }
      const core = client.core;
      const secretResponse = await core.listSecretForAllNamespaces();
      const result = (secretResponse.items ?? []).map((s) => ({
        id: s.metadata?.uid ?? `${clusterId}-secret-${s.metadata?.name}`,
        cluster_id: clusterId,
        namespace_id: `${clusterId}-${s.metadata?.namespace ?? "default"}`,
        name: s.metadata?.name ?? "unknown",
        type: s.type ?? "Opaque",
        data_keys: JSON.stringify(Object.keys(s.data ?? {})),
      }));
      res.json(result);
    } catch (err) {
      k8sError(res, err);
    }
  });

  return router;
}
