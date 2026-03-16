import { Router } from "express";
import type { LiveCluster } from "./client";
import { clusterRoutes } from "./routes/clusters";
import { namespaceRoutes } from "./routes/namespaces";
import { podRoutes } from "./routes/pods";
import { nodeRoutes } from "./routes/nodes";
import { deploymentRoutes } from "./routes/deployments";
import { serviceRoutes } from "./routes/services";
import { eventRoutes } from "./routes/events";
import { alertRoutes } from "./routes/alerts";
import { metricsRoutes } from "./routes/metrics";
import { storageRoutes } from "./routes/storage";
import { logRoutes } from "./routes/logs";
import { configRoutes } from "./routes/config";
import { miscRoutes } from "./routes/misc";
import { clowderRoutes } from "./routes/clowder";

export function createK8sRouter(liveClusters: LiveCluster[]): Router {
  const router = Router();
  const clusterMap = new Map(liveClusters.map((c) => [c.id, c]));

  router.use(clusterRoutes(liveClusters));
  router.use(namespaceRoutes(clusterMap));
  router.use(podRoutes(clusterMap, liveClusters));
  router.use(nodeRoutes(clusterMap));
  router.use(deploymentRoutes(clusterMap));
  router.use(serviceRoutes(clusterMap));
  router.use(eventRoutes(clusterMap));
  router.use(alertRoutes(clusterMap));
  router.use(metricsRoutes(clusterMap));
  router.use(storageRoutes(clusterMap));
  router.use(logRoutes(clusterMap));
  router.use(configRoutes(clusterMap));
  router.use(miscRoutes(clusterMap, liveClusters));
  router.use(clowderRoutes(clusterMap));

  return router;
}
