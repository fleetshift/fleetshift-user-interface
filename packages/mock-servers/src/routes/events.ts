import { Router } from "express";
import db from "../db";

const router = Router();

router.get("/clusters/:id/events", (req, res) => {
  const events = db
    .prepare(
      "SELECT * FROM events WHERE cluster_id = ? ORDER BY created_at DESC",
    )
    .all(req.params.id);
  res.json(events);
});

export default router;
