import { Router } from "express";
import db from "../db";

const router = Router();

interface PodRow {
  cpu_usage: number;
  memory_usage: number;
  namespace_id: string;
}

const CPU_COST_PER_CORE = 0.048;
const MEMORY_COST_PER_GB = 0.006;

router.get("/clusters/:id/cost", (req, res) => {
  const pods = db
    .prepare(
      "SELECT cpu_usage, memory_usage, namespace_id FROM pods WHERE cluster_id = ?",
    )
    .all(req.params.id) as PodRow[];

  const byNamespace = new Map<string, { cpu: number; memory: number }>();
  for (const pod of pods) {
    const ns = pod.namespace_id;
    const entry = byNamespace.get(ns) || { cpu: 0, memory: 0 };
    entry.cpu += pod.cpu_usage;
    entry.memory += pod.memory_usage;
    byNamespace.set(ns, entry);
  }

  const totalCpu = pods.reduce((s, p) => s + p.cpu_usage, 0);
  const totalMemory = pods.reduce((s, p) => s + p.memory_usage, 0);

  const namespaceBreakdown = Array.from(byNamespace.entries()).map(
    ([nsId, usage]) => ({
      namespace: nsId.split("-").slice(1).join("-"),
      cpuCores: Math.round(usage.cpu * 100) / 100,
      memoryMB: Math.round(usage.memory * 100) / 100,
      estimatedMonthlyCost:
        Math.round(
          (usage.cpu * CPU_COST_PER_CORE +
            (usage.memory / 1024) * MEMORY_COST_PER_GB) *
            730 *
            100,
        ) / 100,
    }),
  );

  res.json({
    clusterId: req.params.id,
    totalCpuCores: Math.round(totalCpu * 100) / 100,
    totalMemoryMB: Math.round(totalMemory * 100) / 100,
    estimatedMonthlyCost:
      Math.round(
        (totalCpu * CPU_COST_PER_CORE +
          (totalMemory / 1024) * MEMORY_COST_PER_GB) *
          730 *
          100,
      ) / 100,
    namespaceBreakdown,
  });
});

export default router;
