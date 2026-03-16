import { Router } from "express";
import { randomBytes } from "crypto";
import db from "../db";

const router = Router();

router.get("/clusters/:id/deployments", (req, res) => {
  const deployments = db
    .prepare("SELECT * FROM deployments WHERE cluster_id = ?")
    .all(req.params.id);
  res.json(deployments);
});

router.get("/clusters/:id/deployments/:deployId", (req, res) => {
  const deploy = db
    .prepare("SELECT * FROM deployments WHERE id = ? AND cluster_id = ?")
    .get(req.params.deployId, req.params.id);

  if (!deploy) {
    res.status(404).json({ error: "deployment not found" });
    return;
  }

  res.json(deploy);
});

// Track in-flight scaling intervals to prevent overlapping per-deployment
const scalingTimers = new Map<string, NodeJS.Timeout>();

router.patch("/clusters/:id/deployments/:deployId", (req, res) => {
  const { id: clusterId, deployId } = req.params;
  const { replicas } = req.body as { replicas: number };

  if (typeof replicas !== "number" || replicas < 0) {
    res.status(400).json({ error: "replicas must be a non-negative number" });
    return;
  }

  const deploy = db
    .prepare("SELECT * FROM deployments WHERE id = ? AND cluster_id = ?")
    .get(deployId, clusterId) as
    | {
        id: string;
        cluster_id: string;
        namespace_id: string;
        name: string;
        replicas: number;
        available: number;
        ready: number;
        image: string;
      }
    | undefined;

  if (!deploy) {
    res.status(404).json({ error: "deployment not found" });
    return;
  }

  const oldReplicas = deploy.replicas;
  const newAvailable = Math.min(deploy.available, replicas);
  const newReady = Math.min(deploy.ready, replicas);

  // Update replicas immediately, clamp available/ready
  db.prepare(
    "UPDATE deployments SET replicas = ?, available = ?, ready = ? WHERE id = ?",
  ).run(replicas, newAvailable, newReady, deployId);

  // Handle pod creation/deletion
  if (replicas > oldReplicas) {
    // Scale up — create new pods with Pending status
    const insertPod = db.prepare(
      "INSERT INTO pods (id, namespace_id, cluster_id, name, status, restarts, cpu_usage, memory_usage) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    );
    for (let i = 0; i < replicas - oldReplicas; i++) {
      const suffix = randomBytes(4).toString("hex");
      insertPod.run(
        `${deployId}-pod-${suffix}`,
        deploy.namespace_id,
        clusterId,
        `${deploy.name}-${suffix}`,
        "Pending",
        0,
        0,
        0,
      );
    }
  } else if (replicas < oldReplicas) {
    // Scale down — remove excess pods from this namespace
    const excess = oldReplicas - replicas;
    const podsToRemove = db
      .prepare(
        "SELECT id FROM pods WHERE cluster_id = ? AND namespace_id = ? ORDER BY id DESC LIMIT ?",
      )
      .all(clusterId, deploy.namespace_id, excess) as { id: string }[];
    const deleteStmt = db.prepare("DELETE FROM pods WHERE id = ?");
    for (const pod of podsToRemove) {
      deleteStmt.run(pod.id);
    }
  }

  // Clear any existing scaling timer for this deployment
  const existingTimer = scalingTimers.get(deployId);
  if (existingTimer) clearInterval(existingTimer);

  // Gradually converge available/ready toward target
  if (replicas > newAvailable) {
    const timer = setInterval(() => {
      const current = db
        .prepare(
          "SELECT available, ready, replicas FROM deployments WHERE id = ?",
        )
        .get(deployId) as
        | { available: number; ready: number; replicas: number }
        | undefined;

      if (!current || current.available >= current.replicas) {
        clearInterval(timer);
        scalingTimers.delete(deployId);

        // Flip any remaining Pending pods to Running
        db.prepare(
          "UPDATE pods SET status = 'Running', cpu_usage = ROUND(ABS(RANDOM() % 100) / 100.0, 2), memory_usage = 64 + ABS(RANDOM() % 192) WHERE cluster_id = ? AND namespace_id = ? AND status = 'Pending'",
        ).run(clusterId, deploy.namespace_id);
        return;
      }

      const nextAvailable = Math.min(current.available + 1, current.replicas);
      const nextReady = Math.min(current.ready + 1, current.replicas);
      db.prepare(
        "UPDATE deployments SET available = ?, ready = ? WHERE id = ?",
      ).run(nextAvailable, nextReady, deployId);

      // Flip one Pending pod to Running
      const pendingPod = db
        .prepare(
          "SELECT id FROM pods WHERE cluster_id = ? AND namespace_id = ? AND status = 'Pending' LIMIT 1",
        )
        .get(clusterId, deploy.namespace_id) as { id: string } | undefined;
      if (pendingPod) {
        db.prepare(
          "UPDATE pods SET status = 'Running', cpu_usage = ROUND(ABS(RANDOM() % 100) / 100.0, 2), memory_usage = 64 + ABS(RANDOM() % 192) WHERE id = ?",
        ).run(pendingPod.id);
      }
    }, 2000);

    scalingTimers.set(deployId, timer);
  }

  const updated = db
    .prepare("SELECT * FROM deployments WHERE id = ?")
    .get(deployId);
  res.json(updated);
});

export default router;
