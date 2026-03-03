import { Router } from "express";
import db from "../db";

const router = Router();

router.get("/clusters/:id/services", (req, res) => {
  const services = db
    .prepare("SELECT * FROM services WHERE cluster_id = ?")
    .all(req.params.id) as Array<Record<string, unknown>>;
  res.json(
    services.map((s) => ({ ...s, ports: JSON.parse(s.ports as string) })),
  );
});

router.get("/clusters/:id/ingresses", (req, res) => {
  const ingresses = db
    .prepare("SELECT * FROM ingresses WHERE cluster_id = ?")
    .all(req.params.id);
  res.json(ingresses);
});

export default router;
