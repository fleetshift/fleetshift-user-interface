import db from "./db";

export interface AvailableCluster {
  id: string;
  name: string;
  version: string;
}

export const AVAILABLE_CLUSTERS: AvailableCluster[] = [
  { id: "us-east-prod", name: "US East Production", version: "4.15.2" },
  { id: "eu-west-staging", name: "EU West Staging", version: "4.14.8" },
  { id: "ap-south-dev", name: "AP South Development", version: "4.15.1" },
  { id: "us-west-dr", name: "US West DR", version: "4.13.12" },
  { id: "eu-central-prod", name: "EU Central Production", version: "4.15.2" },
];

const NAMESPACE_TEMPLATES = [
  "default",
  "kube-system",
  "openshift-monitoring",
  "openshift-ingress",
  "app-workloads",
  "ci-cd",
  "logging",
];

const POD_PREFIXES = [
  "api-server",
  "etcd",
  "controller-manager",
  "scheduler",
  "coredns",
  "ingress-controller",
  "prometheus",
  "grafana",
  "alertmanager",
  "node-exporter",
  "oauth-proxy",
  "console",
  "registry",
  "router",
  "haproxy",
];

const POD_STATUSES = [
  "Running",
  "Running",
  "Running",
  "Pending",
  "CrashLoopBackOff",
  "Completed",
];
const NS_STATUSES = ["Active", "Active", "Active", "Terminating"];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

export function seedCluster(cluster: AvailableCluster): void {
  const insertCluster = db.prepare(
    "INSERT INTO clusters (id, name, status, version, plugins) VALUES (?, ?, ?, ?, ?)",
  );
  insertCluster.run(
    cluster.id,
    cluster.name,
    "ready",
    cluster.version,
    JSON.stringify(["core"]),
  );

  const nsCount = randomInt(3, 5);
  const selectedNs = NAMESPACE_TEMPLATES.sort(() => Math.random() - 0.5).slice(
    0,
    nsCount,
  );
  const insertNs = db.prepare(
    "INSERT INTO namespaces (id, cluster_id, name, status) VALUES (?, ?, ?, ?)",
  );
  const insertPod = db.prepare(
    "INSERT INTO pods (id, namespace_id, cluster_id, name, status, restarts, cpu_usage, memory_usage) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  );

  for (const nsName of selectedNs) {
    const nsId = `${cluster.id}-${nsName}`;
    insertNs.run(nsId, cluster.id, nsName, pick(NS_STATUSES));

    const podCount = randomInt(2, 5);
    const usedPrefixes = POD_PREFIXES.sort(() => Math.random() - 0.5).slice(
      0,
      podCount,
    );
    for (const prefix of usedPrefixes) {
      const suffix = Math.random().toString(36).substring(2, 7);
      const podId = `${nsId}-${prefix}-${suffix}`;
      const status = pick(POD_STATUSES);
      const restarts =
        status === "CrashLoopBackOff" ? randomInt(5, 50) : randomInt(0, 3);
      insertPod.run(
        podId,
        nsId,
        cluster.id,
        `${prefix}-${suffix}`,
        status,
        restarts,
        randomFloat(0.01, 2.0),
        randomFloat(32, 512),
      );
    }
  }
}
