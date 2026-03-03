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

const NODE_ROLES = [
  "master",
  "master",
  "master",
  "worker",
  "worker",
  "worker",
  "worker",
  "infra",
];
const NODE_STATUSES = ["Ready", "Ready", "Ready", "Ready", "NotReady"];

const SERVICE_TYPES = [
  "ClusterIP",
  "ClusterIP",
  "ClusterIP",
  "NodePort",
  "LoadBalancer",
];
const SERVICE_NAMES = [
  "api-server",
  "etcd-client",
  "kubernetes",
  "dns",
  "metrics-server",
  "ingress-nginx",
  "prometheus-svc",
  "grafana-svc",
  "alertmanager-svc",
  "oauth-proxy-svc",
  "console-svc",
  "registry-svc",
  "router-svc",
];

const ALERT_NAMES = [
  "HighCPUUsage",
  "HighMemoryPressure",
  "PodCrashLooping",
  "NodeNotReady",
  "DiskSpaceLow",
  "CertificateExpiring",
  "EtcdHighLatency",
  "APIServerErrors",
  "KubeletDown",
  "TargetDown",
  "PrometheusRuleFailures",
  "ClockSkewDetected",
];
const ALERT_SEVERITIES = ["critical", "warning", "warning", "info"];
const ALERT_STATES = ["firing", "firing", "pending", "resolved", "resolved"];

const DEPLOYMENT_NAMES = [
  "frontend",
  "backend-api",
  "worker",
  "cron-jobs",
  "auth-service",
  "notification-svc",
  "cache-proxy",
  "data-processor",
  "search-indexer",
  "payment-gateway",
  "user-service",
  "order-service",
];
const DEPLOYMENT_IMAGES = [
  "registry.example.com/frontend:v2.3.1",
  "registry.example.com/backend:v1.8.0",
  "registry.example.com/worker:v3.1.2",
  "registry.example.com/cron:v1.0.4",
  "registry.example.com/auth:v2.0.0",
  "registry.example.com/notifications:v1.5.3",
  "redis:7-alpine",
  "registry.example.com/processor:v4.2.1",
  "elasticsearch:8.12",
  "registry.example.com/payments:v1.1.0",
  "registry.example.com/users:v3.0.2",
  "registry.example.com/orders:v2.1.0",
];
const STRATEGIES = [
  "RollingUpdate",
  "RollingUpdate",
  "RollingUpdate",
  "Recreate",
];

const PIPELINE_NAMES = [
  "build-frontend",
  "build-backend",
  "deploy-staging",
  "deploy-production",
  "run-integration-tests",
  "security-scan",
  "image-build",
  "promote-to-prod",
];
const PIPELINE_STATUSES = [
  "Succeeded",
  "Succeeded",
  "Succeeded",
  "Failed",
  "Running",
  "Cancelled",
];
const PIPELINE_STAGES = [
  ["clone", "build", "test", "push"],
  ["clone", "lint", "build", "test", "scan", "push"],
  ["checkout", "deploy", "smoke-test"],
  ["build", "test", "deploy", "verify"],
];

const CONFIGMAP_NAMES = [
  "app-config",
  "nginx-config",
  "feature-flags",
  "logging-config",
  "cors-settings",
  "rate-limits",
  "cache-config",
];
const SECRET_NAMES = [
  "db-credentials",
  "tls-cert",
  "api-keys",
  "oauth-secret",
  "registry-pull-secret",
  "encryption-keys",
];
const SECRET_TYPES = [
  "Opaque",
  "kubernetes.io/tls",
  "kubernetes.io/dockerconfigjson",
  "Opaque",
];

const GITOPS_REPOS = [
  "https://github.com/org/frontend-deploy",
  "https://github.com/org/backend-deploy",
  "https://github.com/org/infra-config",
  "https://github.com/org/monitoring-stack",
  "https://github.com/org/platform-services",
];
const SYNC_STATUSES = ["Synced", "Synced", "Synced", "OutOfSync", "Unknown"];
const HEALTH_STATUSES = [
  "Healthy",
  "Healthy",
  "Healthy",
  "Degraded",
  "Progressing",
];

const EVENT_REASONS = [
  "Pulled",
  "Created",
  "Started",
  "Killing",
  "BackOff",
  "FailedScheduling",
  "Scheduled",
  "SuccessfulCreate",
  "ScalingReplicaSet",
  "FailedMount",
  "Unhealthy",
  "NodeReady",
  "NodeNotReady",
  "Evicted",
];
const EVENT_TYPES = ["Normal", "Normal", "Normal", "Warning"];
const EVENT_SOURCES = [
  "kubelet",
  "scheduler",
  "controller-manager",
  "deployment-controller",
];

const ROUTE_NAMES = [
  "frontend-route",
  "api-route",
  "grafana-route",
  "console-route",
  "oauth-route",
  "registry-route",
  "alertmanager-route",
];
const ROUTE_HOSTS_PREFIX = [
  "app",
  "api",
  "grafana",
  "console",
  "oauth",
  "registry",
  "alerts",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function randomDate(daysBack: number): string {
  const d = new Date();
  d.setDate(d.getDate() - randomInt(0, daysBack));
  d.setHours(randomInt(0, 23), randomInt(0, 59), randomInt(0, 59));
  return d.toISOString().replace("T", " ").substring(0, 19);
}

function randomIp(): string {
  return `10.${randomInt(0, 255)}.${randomInt(0, 255)}.${randomInt(1, 254)}`;
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

  // --- Namespaces ---
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

  const nsIds: string[] = [];
  for (const nsName of selectedNs) {
    const nsId = `${cluster.id}-${nsName}`;
    nsIds.push(nsId);
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

  // --- Nodes ---
  const insertNode = db.prepare(
    "INSERT INTO nodes (id, cluster_id, name, status, role, cpu_capacity, memory_capacity, cpu_used, memory_used, kubelet_version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  );
  const nodeCount = randomInt(3, 6);
  for (let i = 0; i < nodeCount; i++) {
    const role = i < 3 ? "master" : pick(NODE_ROLES);
    const cpuCap = role === "master" ? 4 : randomInt(8, 32);
    const memCap = role === "master" ? 16384 : randomInt(16384, 65536);
    insertNode.run(
      `${cluster.id}-node-${i}`,
      cluster.id,
      `${cluster.id.split("-")[0]}-node-${i}`,
      pick(NODE_STATUSES),
      role,
      cpuCap,
      memCap,
      randomFloat(0.5, cpuCap * 0.9),
      randomFloat(memCap * 0.2, memCap * 0.85),
      `v${cluster.version}`,
    );
  }

  // --- Services ---
  const insertSvc = db.prepare(
    "INSERT INTO services (id, cluster_id, namespace_id, name, type, cluster_ip, ports) VALUES (?, ?, ?, ?, ?, ?, ?)",
  );
  const svcCount = randomInt(3, 6);
  const svcNames = SERVICE_NAMES.sort(() => Math.random() - 0.5).slice(
    0,
    svcCount,
  );
  for (const svcName of svcNames) {
    const nsId = pick(nsIds);
    const port = randomInt(80, 9090);
    insertSvc.run(
      `${cluster.id}-svc-${svcName}`,
      cluster.id,
      nsId,
      svcName,
      pick(SERVICE_TYPES),
      randomIp(),
      JSON.stringify([{ port, targetPort: port, protocol: "TCP" }]),
    );
  }

  // --- Ingresses ---
  const insertIngress = db.prepare(
    "INSERT INTO ingresses (id, cluster_id, namespace_id, name, host, path, service_name, tls) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  );
  const ingressCount = randomInt(1, 3);
  for (let i = 0; i < ingressCount; i++) {
    const nsId = pick(nsIds);
    const prefix = pick(ROUTE_HOSTS_PREFIX);
    insertIngress.run(
      `${cluster.id}-ing-${i}`,
      cluster.id,
      nsId,
      `${prefix}-ingress`,
      `${prefix}.${cluster.id}.example.com`,
      "/",
      pick(svcNames),
      randomInt(0, 1),
    );
  }

  // --- PVs and PVCs ---
  const insertPv = db.prepare(
    "INSERT INTO pvs (id, cluster_id, name, capacity, access_mode, status, storage_class) VALUES (?, ?, ?, ?, ?, ?, ?)",
  );
  const insertPvc = db.prepare(
    "INSERT INTO pvcs (id, cluster_id, namespace_id, name, status, capacity, storage_class, pv_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  );
  const capacities = ["1Gi", "5Gi", "10Gi", "20Gi", "50Gi", "100Gi"];
  const accessModes = ["ReadWriteOnce", "ReadOnlyMany", "ReadWriteMany"];
  const storageClasses = ["gp3", "gp2", "io1", "standard"];
  const pvCount = randomInt(2, 5);
  for (let i = 0; i < pvCount; i++) {
    const cap = pick(capacities);
    const sc = pick(storageClasses);
    const pvName = `pv-${cluster.id}-${i}`;
    insertPv.run(
      `${cluster.id}-pv-${i}`,
      cluster.id,
      pvName,
      cap,
      pick(accessModes),
      "Bound",
      sc,
    );
    const nsId = pick(nsIds);
    insertPvc.run(
      `${cluster.id}-pvc-${i}`,
      cluster.id,
      nsId,
      `data-${i}`,
      "Bound",
      cap,
      sc,
      pvName,
    );
  }

  // --- Alerts ---
  const insertAlert = db.prepare(
    "INSERT INTO alerts (id, cluster_id, name, severity, state, message, fired_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
  );
  const alertCount = randomInt(2, 6);
  const alertNames = ALERT_NAMES.sort(() => Math.random() - 0.5).slice(
    0,
    alertCount,
  );
  for (const alertName of alertNames) {
    insertAlert.run(
      `${cluster.id}-alert-${alertName}`,
      cluster.id,
      alertName,
      pick(ALERT_SEVERITIES),
      pick(ALERT_STATES),
      `${alertName} triggered on ${cluster.name}`,
      randomDate(7),
    );
  }

  // --- Deployments ---
  const insertDeploy = db.prepare(
    "INSERT INTO deployments (id, cluster_id, namespace_id, name, replicas, available, ready, strategy, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
  );
  const deployCount = randomInt(3, 6);
  const deployNames = DEPLOYMENT_NAMES.sort(() => Math.random() - 0.5).slice(
    0,
    deployCount,
  );
  for (let i = 0; i < deployCount; i++) {
    const nsId = pick(nsIds);
    const replicas = randomInt(1, 5);
    const available = randomInt(Math.max(0, replicas - 1), replicas);
    insertDeploy.run(
      `${cluster.id}-deploy-${deployNames[i]}`,
      cluster.id,
      nsId,
      deployNames[i],
      replicas,
      available,
      available,
      pick(STRATEGIES),
      DEPLOYMENT_IMAGES[i % DEPLOYMENT_IMAGES.length],
    );
  }

  // --- Pipelines ---
  const insertPipeline = db.prepare(
    "INSERT INTO pipelines (id, cluster_id, name, status, started_at, duration_seconds, stages) VALUES (?, ?, ?, ?, ?, ?, ?)",
  );
  const pipelineCount = randomInt(3, 6);
  const pipelineNames = PIPELINE_NAMES.sort(() => Math.random() - 0.5).slice(
    0,
    pipelineCount,
  );
  for (const pName of pipelineNames) {
    insertPipeline.run(
      `${cluster.id}-pipeline-${pName}`,
      cluster.id,
      pName,
      pick(PIPELINE_STATUSES),
      randomDate(14),
      randomInt(30, 600),
      JSON.stringify(pick(PIPELINE_STAGES)),
    );
  }

  // --- ConfigMaps ---
  const insertCm = db.prepare(
    "INSERT INTO configmaps (id, cluster_id, namespace_id, name, data_keys) VALUES (?, ?, ?, ?, ?)",
  );
  const cmCount = randomInt(3, 5);
  const cmNames = CONFIGMAP_NAMES.sort(() => Math.random() - 0.5).slice(
    0,
    cmCount,
  );
  for (const cmName of cmNames) {
    const nsId = pick(nsIds);
    const keys = ["key1", "key2", "key3"].slice(0, randomInt(1, 3));
    insertCm.run(
      `${cluster.id}-cm-${cmName}`,
      cluster.id,
      nsId,
      cmName,
      JSON.stringify(keys),
    );
  }

  // --- Secrets ---
  const insertSecret = db.prepare(
    "INSERT INTO secrets (id, cluster_id, namespace_id, name, type, data_keys) VALUES (?, ?, ?, ?, ?, ?)",
  );
  const secretCount = randomInt(2, 4);
  const secretNames = SECRET_NAMES.sort(() => Math.random() - 0.5).slice(
    0,
    secretCount,
  );
  for (const sName of secretNames) {
    const nsId = pick(nsIds);
    const keys = ["username", "password", "token", "cert"].slice(
      0,
      randomInt(1, 3),
    );
    insertSecret.run(
      `${cluster.id}-secret-${sName}`,
      cluster.id,
      nsId,
      sName,
      pick(SECRET_TYPES),
      JSON.stringify(keys),
    );
  }

  // --- GitOps Apps ---
  const insertGitops = db.prepare(
    "INSERT INTO gitops_apps (id, cluster_id, name, repo, path, sync_status, health_status, last_synced) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  );
  const gitopsCount = randomInt(2, 4);
  for (let i = 0; i < gitopsCount; i++) {
    const repo = GITOPS_REPOS[i % GITOPS_REPOS.length];
    const appName = repo.split("/").pop()!;
    insertGitops.run(
      `${cluster.id}-gitops-${appName}`,
      cluster.id,
      appName,
      repo,
      `/clusters/${cluster.id}`,
      pick(SYNC_STATUSES),
      pick(HEALTH_STATUSES),
      randomDate(3),
    );
  }

  // --- Events ---
  const insertEvent = db.prepare(
    "INSERT INTO events (id, cluster_id, namespace_id, type, reason, message, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  );
  const eventCount = randomInt(5, 10);
  for (let i = 0; i < eventCount; i++) {
    const nsId = pick(nsIds);
    const reason = pick(EVENT_REASONS);
    insertEvent.run(
      `${cluster.id}-event-${i}`,
      cluster.id,
      nsId,
      pick(EVENT_TYPES),
      reason,
      `${reason}: Pod ${pick(POD_PREFIXES)}-${Math.random().toString(36).substring(2, 7)}`,
      pick(EVENT_SOURCES),
      randomDate(2),
    );
  }

  // --- Routes ---
  const insertRoute = db.prepare(
    "INSERT INTO routes (id, cluster_id, namespace_id, name, host, path, service_name, tls, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
  );
  const routeCount = randomInt(2, 5);
  const routeNames = ROUTE_NAMES.sort(() => Math.random() - 0.5).slice(
    0,
    routeCount,
  );
  for (let i = 0; i < routeCount; i++) {
    const nsId = pick(nsIds);
    const hostPrefix = ROUTE_HOSTS_PREFIX[i % ROUTE_HOSTS_PREFIX.length];
    insertRoute.run(
      `${cluster.id}-route-${routeNames[i]}`,
      cluster.id,
      nsId,
      routeNames[i],
      `${hostPrefix}.${cluster.id}.apps.example.com`,
      "/",
      pick(svcNames),
      randomInt(0, 1),
      pick(["Admitted", "Admitted", "Admitted", "Rejected"]),
    );
  }
}
