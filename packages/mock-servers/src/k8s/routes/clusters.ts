import { Router } from "express";
import type { LiveCluster } from "../client";

function clusterToJson(c: LiveCluster) {
  return {
    id: c.id,
    name: c.name,
    status: "ready",
    version: c.version,
    plugins: c.plugins,
    platform: c.platform,
    server: c.server,
    nodeCount: c.nodeCount,
    created_at: new Date().toISOString().replace("T", " ").substring(0, 19),
  };
}

export function clusterRoutes(liveClusters: LiveCluster[]): Router {
  const router = Router();
  const clusterMap = new Map(liveClusters.map((c) => [c.id, c]));

  router.get("/clusters/available", (_req, res) => {
    res.json(
      liveClusters.map((c) => ({
        ...clusterToJson(c),
        installed: true,
      })),
    );
  });

  router.get("/clusters", (_req, res) => {
    res.json(liveClusters.map(clusterToJson));
  });

  router.get("/clusters/:id", (req, res) => {
    const cluster = clusterMap.get(req.params.id);
    if (!cluster) {
      res.status(404).json({ error: "Cluster not found" });
      return;
    }
    res.json(clusterToJson(cluster));
  });

  return router;
}
