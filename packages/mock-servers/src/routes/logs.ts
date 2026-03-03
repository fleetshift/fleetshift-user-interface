import { Router } from "express";
import db from "../db";

const router = Router();

interface PodRow {
  name: string;
  namespace_id: string;
  status: string;
}

const LOG_LEVELS = ["INFO", "INFO", "INFO", "WARN", "ERROR", "DEBUG"];
const LOG_MESSAGES = [
  "Request processed successfully",
  "Connection established",
  "Health check passed",
  "Cache miss, fetching from database",
  "Retrying operation after transient failure",
  "Configuration reloaded",
  "Worker thread started",
  "Graceful shutdown initiated",
  "TLS handshake completed",
  "Rate limit threshold approaching",
  "Failed to connect to upstream service",
  "Out of memory warning",
  "Certificate will expire soon",
  "Disk usage above 80%",
  "Authentication token expired",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

router.get("/clusters/:id/logs", (req, res) => {
  const pods = db
    .prepare("SELECT name, namespace_id, status FROM pods WHERE cluster_id = ?")
    .all(req.params.id) as PodRow[];

  const lines: {
    timestamp: string;
    pod: string;
    namespace: string;
    level: string;
    message: string;
  }[] = [];
  const now = Date.now();

  for (const pod of pods) {
    const lineCount = Math.floor(Math.random() * 8) + 3;
    for (let i = 0; i < lineCount; i++) {
      const ts = new Date(now - Math.random() * 3600000);
      lines.push({
        timestamp: ts.toISOString(),
        pod: pod.name,
        namespace: pod.namespace_id.split("-").slice(1).join("-"),
        level: pick(LOG_LEVELS),
        message: pick(LOG_MESSAGES),
      });
    }
  }

  lines.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  res.json(lines.slice(0, 100));
});

export default router;
