import { Router } from "express";
import db from "../db";

const router = Router();

router.get("/clusters/:id/pipelines", (req, res) => {
  const pipelines = db
    .prepare(
      "SELECT * FROM pipelines WHERE cluster_id = ? ORDER BY started_at DESC",
    )
    .all(req.params.id) as Array<Record<string, unknown>>;
  res.json(
    pipelines.map((p) => ({
      ...p,
      stages: JSON.parse(p.stages as string),
    })),
  );
});

export default router;
