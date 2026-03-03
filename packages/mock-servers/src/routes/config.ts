import { Router } from "express";
import db from "../db";

const router = Router();

router.get("/clusters/:id/configmaps", (req, res) => {
  const cms = db
    .prepare("SELECT * FROM configmaps WHERE cluster_id = ?")
    .all(req.params.id) as Array<Record<string, unknown>>;
  res.json(
    cms.map((c) => ({ ...c, data_keys: JSON.parse(c.data_keys as string) })),
  );
});

router.get("/clusters/:id/secrets", (req, res) => {
  const secrets = db
    .prepare("SELECT * FROM secrets WHERE cluster_id = ?")
    .all(req.params.id) as Array<Record<string, unknown>>;
  res.json(
    secrets.map((s) => ({
      ...s,
      data_keys: JSON.parse(s.data_keys as string),
    })),
  );
});

export default router;
