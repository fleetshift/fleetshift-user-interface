import { Router } from "express";
import db from "../db";
import { AVAILABLE_CLUSTERS, seedCluster } from "../seed";

const router = Router();

// GET /clusters/available — all 5 clusters with install status
router.get("/clusters/available", (_req, res) => {
  const installed = db.prepare("SELECT id FROM clusters").all() as {
    id: string;
  }[];
  const installedIds = new Set(installed.map((c) => c.id));

  const result = AVAILABLE_CLUSTERS.map((c) => ({
    ...c,
    installed: installedIds.has(c.id),
  }));
  res.json(result);
});

// GET /clusters — installed clusters only
router.get("/clusters", (_req, res) => {
  const clusters = db.prepare("SELECT * FROM clusters").all();
  res.json(
    (clusters as Array<Record<string, unknown>>).map((c) => ({
      ...c,
      plugins: JSON.parse(c.plugins as string),
    })),
  );
});

// GET /clusters/:id — single cluster
router.get("/clusters/:id", (req, res) => {
  const cluster = db
    .prepare("SELECT * FROM clusters WHERE id = ?")
    .get(req.params.id) as Record<string, unknown> | undefined;
  if (!cluster) {
    res.status(404).json({ error: "Cluster not found" });
    return;
  }
  res.json({ ...cluster, plugins: JSON.parse(cluster.plugins as string) });
});

// POST /clusters/:id/install
router.post("/clusters/:id/install", (req, res) => {
  const available = AVAILABLE_CLUSTERS.find((c) => c.id === req.params.id);
  if (!available) {
    res.status(404).json({ error: "Unknown cluster" });
    return;
  }
  const existing = db
    .prepare("SELECT id FROM clusters WHERE id = ?")
    .get(req.params.id);
  if (existing) {
    res.status(409).json({ error: "Cluster already installed" });
    return;
  }
  seedCluster(available);
  const cluster = db
    .prepare("SELECT * FROM clusters WHERE id = ?")
    .get(req.params.id) as Record<string, unknown>;
  res
    .status(201)
    .json({ ...cluster, plugins: JSON.parse(cluster.plugins as string) });
});

// DELETE /clusters/:id — uninstall
router.delete("/clusters/:id", (req, res) => {
  const result = db
    .prepare("DELETE FROM clusters WHERE id = ?")
    .run(req.params.id);
  if (result.changes === 0) {
    res.status(404).json({ error: "Cluster not found" });
    return;
  }
  res.status(204).send();
});

// PATCH /clusters/:id/plugins — toggle plugins
router.patch("/clusters/:id/plugins", (req, res) => {
  const { plugins } = req.body as { plugins: string[] };
  if (!Array.isArray(plugins)) {
    res.status(400).json({ error: "plugins must be an array" });
    return;
  }
  const result = db
    .prepare("UPDATE clusters SET plugins = ? WHERE id = ?")
    .run(JSON.stringify(plugins), req.params.id);
  if (result.changes === 0) {
    res.status(404).json({ error: "Cluster not found" });
    return;
  }
  const cluster = db
    .prepare("SELECT * FROM clusters WHERE id = ?")
    .get(req.params.id) as Record<string, unknown>;
  res.json({ ...cluster, plugins: JSON.parse(cluster.plugins as string) });
});

export default router;
