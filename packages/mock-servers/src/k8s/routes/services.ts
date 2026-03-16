import { Router } from "express";
import { getClusterClient } from "../client";
import { transformService } from "../transforms";
import { requireCluster, k8sError, type ClusterMap } from "../utils";

export function serviceRoutes(clusterMap: ClusterMap): Router {
  const router = Router();

  router.get("/clusters/:id/services", async (req, res) => {
    const clusterId = requireCluster(req, res, clusterMap);
    if (!clusterId) return;
    try {
      const client = getClusterClient(req.params.id);
      if (!client) {
        res.status(404).json({ error: "Cluster not found" });
        return;
      }
      const core = client.core;
      const svcResponse = await core.listServiceForAllNamespaces();
      const result = (svcResponse.items ?? []).map((svc) =>
        transformService(svc, clusterId),
      );
      res.json(result);
    } catch (err) {
      k8sError(res, err);
    }
  });

  router.get("/clusters/:id/ingresses", async (req, res) => {
    const clusterId = requireCluster(req, res, clusterMap);
    if (!clusterId) return;
    try {
      const client = getClusterClient(req.params.id);
      if (!client) {
        res.status(404).json({ error: "Cluster not found" });
        return;
      }
      const netApi = client.networking;
      const ingResponse = await netApi.listIngressForAllNamespaces();
      const result = (ingResponse.items ?? []).map((ing) => {
        const name = ing.metadata?.name ?? "unknown";
        const namespace = ing.metadata?.namespace ?? "default";
        const rules = ing.spec?.rules ?? [];
        const host = rules[0]?.host ?? "";
        const path = rules[0]?.http?.paths?.[0]?.path ?? "/";
        const serviceName =
          rules[0]?.http?.paths?.[0]?.backend?.service?.name ?? "";
        const tls = (ing.spec?.tls ?? []).length > 0 ? 1 : 0;

        return {
          id: ing.metadata?.uid ?? `${clusterId}-ing-${name}`,
          cluster_id: clusterId,
          namespace_id: `${clusterId}-${namespace}`,
          name,
          host,
          path,
          service_name: serviceName,
          tls,
        };
      });
      res.json(result);
    } catch (err) {
      k8sError(res, err);
    }
  });

  router.get("/clusters/:id/routes", (req, res) => {
    if (!clusterMap.has(req.params.id as string)) {
      res.status(404).json({ error: "Cluster not found" });
      return;
    }
    res.json([]);
  });

  return router;
}
