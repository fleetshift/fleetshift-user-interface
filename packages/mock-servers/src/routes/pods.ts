import { Router } from "express";
import db from "../db";

const router = Router();

// GET /clusters/:id/pods — optional ?namespace= filter
router.get("/clusters/:id/pods", (req, res) => {
  const namespace = req.query.namespace as string | undefined;
  if (namespace) {
    const nsId = `${req.params.id}-${namespace}`;
    const pods = db
      .prepare("SELECT * FROM pods WHERE cluster_id = ? AND namespace_id = ?")
      .all(req.params.id, nsId);
    res.json(pods);
  } else {
    const pods = db
      .prepare("SELECT * FROM pods WHERE cluster_id = ?")
      .all(req.params.id);
    res.json(pods);
  }
});

// GET /pods/aggregate — aggregate pod stats across all clusters
router.get("/pods/aggregate", (_req, res) => {
  const stats = db
    .prepare(
      `SELECT
        cluster_id,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'Running' THEN 1 ELSE 0 END) as running,
        SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'CrashLoopBackOff' THEN 1 ELSE 0 END) as failing,
        ROUND(AVG(cpu_usage), 2) as avg_cpu,
        ROUND(AVG(memory_usage), 2) as avg_memory
      FROM pods GROUP BY cluster_id`,
    )
    .all();
  res.json(stats);
});

export default router;
