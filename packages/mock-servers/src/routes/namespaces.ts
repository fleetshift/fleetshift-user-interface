import { Router } from "express";
import db from "../db";

const router = Router();

interface NamespaceRow {
  id: string;
  cluster_id: string;
  name: string;
  status: string;
}

// GET /clusters/:id/namespaces
router.get("/clusters/:id/namespaces", (req, res) => {
  const namespaces = db
    .prepare("SELECT * FROM namespaces WHERE cluster_id = ?")
    .all(req.params.id) as NamespaceRow[];

  const podCounts = db
    .prepare(
      "SELECT namespace_id, COUNT(*) as count FROM pods WHERE cluster_id = ? GROUP BY namespace_id",
    )
    .all(req.params.id) as { namespace_id: string; count: number }[];

  const countMap = new Map(podCounts.map((p) => [p.namespace_id, p.count]));

  res.json(
    namespaces.map((ns) => ({
      ...ns,
      podCount: countMap.get(ns.id) || 0,
    })),
  );
});

export default router;
