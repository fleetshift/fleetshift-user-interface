import * as k8s from "@kubernetes/client-node";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import chokidar, { FSWatcher } from "chokidar";
import type Database from "better-sqlite3";

// Lazy DB import to avoid circular dependency at module load time
let _db: ReturnType<typeof Database> | null = null;
function getDb() {
  if (!_db) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _db = require("../db").default;
  }
  return _db!;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LiveCluster {
  id: string;
  name: string;
  version: string;
  context: string;
  plugins: string[];
  platform: "openshift" | "kubernetes";
  server: string;
  nodeCount: number;
}

export interface ClusterConfig {
  id: string;
  name: string;
  type: "kubeconfig" | "token";
  /** For type: kubeconfig — the kubeconfig context name */
  context?: string;
  /** For type: token — the K8s API server URL */
  server?: string;
  /** For type: token — env var name holding the bearer token */
  tokenEnv?: string;
  /** For type: token — raw token value (alternative to tokenEnv) */
  tokenValue?: string;
  /** Skip TLS verification */
  skipTLSVerify?: boolean;
}

interface ClustersYaml {
  clusters: ClusterConfig[];
}

/** Runtime state for a connected cluster */
export interface ClusterClient {
  config: ClusterConfig;
  kc: k8s.KubeConfig;
  core: k8s.CoreV1Api;
  apps: k8s.AppsV1Api;
  networking: k8s.NetworkingV1Api;
  metrics: k8s.Metrics | null;
  live: LiveCluster;
}

// ---------------------------------------------------------------------------
// CRD → plugin discovery
// ---------------------------------------------------------------------------

const CRD_PLUGIN_MAP: Record<string, string> = {
  "monitoring.coreos.com": "observability",
  "kafka.strimzi.io": "pipelines",
  "keda.sh": "autoscaling",
  "cert-manager.io": "networking",
  "elasticsearch.k8s.elastic.co": "logs",
  "cloud.redhat.com": "deployments",
  "cyndi.cloud.redhat.com": "pipelines",
};

const ALWAYS_PLUGINS = [
  "core",
  "nodes",
  "storage",
  "events",
  "alerts",
  "networking",
  "deployments",
  "logs",
  "config",
  "cost",
  "upgrades",
];

async function discoverPlugins(kc: k8s.KubeConfig): Promise<string[]> {
  const plugins = new Set(ALWAYS_PLUGINS);

  try {
    const extApi = kc.makeApiClient(k8s.ApiextensionsV1Api);
    const crdList = await extApi.listCustomResourceDefinition();
    const groups = new Set<string>();

    for (const crd of crdList.items ?? []) {
      const group = crd.spec?.group;
      if (group) groups.add(group);
    }

    for (const [group, plugin] of Object.entries(CRD_PLUGIN_MAP)) {
      if (groups.has(group)) plugins.add(plugin);
    }

    try {
      const apisApi = kc.makeApiClient(k8s.ApisApi);
      const metricsCheck = await apisApi.getAPIVersions();
      const hasMetrics = (metricsCheck.groups ?? []).some(
        (g) => g.name === "metrics.k8s.io",
      );
      if (hasMetrics) plugins.add("observability");
    } catch {
      // metrics API not available
    }
  } catch (err) {
    console.log(
      `K8s: CRD discovery failed for cluster, using defaults - ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  return Array.from(plugins);
}

// ---------------------------------------------------------------------------
// Cluster registry (multi-cluster)
// ---------------------------------------------------------------------------

const clusterClients = new Map<string, ClusterClient>();
let configWatcher: FSWatcher | null = null;
let onClustersChanged: ((clusters: LiveCluster[]) => void) | null = null;

function getConfigPath(): string {
  return path.resolve(
    typeof __dirname === "string" ? __dirname : process.cwd(),
    "../../clusters.yaml",
  );
}

function loadClustersYaml(): ClusterConfig[] {
  const configPath = getConfigPath();
  if (!fs.existsSync(configPath)) {
    console.log(`K8s: No clusters.yaml found at ${configPath}`);
    return [];
  }

  const content = fs.readFileSync(configPath, "utf-8");
  const parsed = yaml.load(content) as ClustersYaml;
  return parsed?.clusters ?? [];
}

function buildKubeConfigForCluster(cfg: ClusterConfig): k8s.KubeConfig {
  const kc = new k8s.KubeConfig();

  if (cfg.type === "kubeconfig") {
    kc.loadFromDefault();
    if (cfg.context) {
      kc.setCurrentContext(cfg.context);
    }
  } else if (cfg.type === "token") {
    const token =
      cfg.tokenValue ?? (cfg.tokenEnv ? process.env[cfg.tokenEnv] : undefined);
    if (!token) {
      throw new Error(
        `Token not provided for cluster "${cfg.name}"`,
      );
    }

    kc.loadFromOptions({
      clusters: [
        {
          name: cfg.id,
          server: cfg.server!,
          skipTLSVerify: cfg.skipTLSVerify ?? false,
        },
      ],
      users: [{ name: `${cfg.id}-user`, token }],
      contexts: [
        {
          name: cfg.id,
          cluster: cfg.id,
          user: `${cfg.id}-user`,
        },
      ],
      currentContext: cfg.id,
    });
  }

  // Global TLS skip (e.g. Docker)
  if (cfg.skipTLSVerify || process.env.K8S_TLS_INSECURE === "1") {
    for (const cluster of kc.clusters) {
      (cluster as { skipTLSVerify: boolean }).skipTLSVerify = true;
    }
  }

  return kc;
}

export async function connectCluster(
  cfg: ClusterConfig,
): Promise<ClusterClient | null> {
  const label = `${cfg.name ?? cfg.id} (${cfg.type})`;
  console.log(`K8s: ── ${label} ──`);

  if (cfg.type === "token") {
    const tokenVal =
      cfg.tokenValue ?? (cfg.tokenEnv ? process.env[cfg.tokenEnv] : undefined);
    if (!tokenVal) {
      console.log(
        `K8s:   token:   ✗ ${cfg.tokenEnv ? cfg.tokenEnv + " is NOT set" : "no token provided"}`,
      );
      return null;
    }
    console.log(
      `K8s:   token:   ✓ ${cfg.tokenEnv ?? "direct"} (${tokenVal.slice(0, 12)}…)`,
    );
    console.log(`K8s:   server:  ${cfg.server}`);
  } else {
    console.log(`K8s:   context: ${cfg.context ?? "(default)"}`);
  }

  try {
    const kc = buildKubeConfigForCluster(cfg);

    // Verify connectivity
    const versionApi = kc.makeApiClient(k8s.VersionApi);
    const versionInfo = await versionApi.getCode();
    const version = `${versionInfo.major}.${versionInfo.minor}`;
    console.log(`K8s:   reach:   ✓ v${version}`);

    const core = kc.makeApiClient(k8s.CoreV1Api);
    const apps = kc.makeApiClient(k8s.AppsV1Api);
    const networking = kc.makeApiClient(k8s.NetworkingV1Api);

    let metrics: k8s.Metrics | null = null;
    try {
      metrics = new k8s.Metrics(kc);
    } catch {
      // metrics not available
    }

    const plugins = await discoverPlugins(kc);
    const clusterName = cfg.name ?? kc.getCurrentCluster()?.name ?? cfg.id;

    // Detect OpenShift vs vanilla Kubernetes
    let platform: "openshift" | "kubernetes" = "kubernetes";
    try {
      const apisApi = kc.makeApiClient(k8s.ApisApi);
      const apiGroups = await apisApi.getAPIVersions();
      const hasOpenShift = (apiGroups.groups ?? []).some(
        (g) =>
          g.name === "route.openshift.io" || g.name === "apps.openshift.io",
      );
      if (hasOpenShift) platform = "openshift";
    } catch {
      // fall back to kubernetes
    }

    // Get node count
    let nodeCount = 0;
    try {
      const nodeList = await core.listNode();
      nodeCount = (nodeList.items ?? []).length;
    } catch {
      // no permission to list nodes
    }

    const server = kc.getCurrentCluster()?.server ?? cfg.server ?? "";

    const live: LiveCluster = {
      id: cfg.id,
      name: clusterName,
      version,
      context: cfg.context ?? cfg.id,
      plugins,
      platform,
      server,
      nodeCount,
    };

    console.log(
      `K8s:   platform: ${platform} (${nodeCount} node${nodeCount !== 1 ? "s" : ""})`,
    );
    console.log(`K8s:   plugins: ${plugins.join(", ")}`);

    return { config: cfg, kc, core, apps, networking, metrics, live };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`K8s:   reach:   ✗ ${msg}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Initialize all clusters from clusters.yaml + database.
 * Starts a chokidar watcher on the config file for hot-reload.
 */
export async function initK8sClient(
  onChange?: (clusters: LiveCluster[]) => void,
): Promise<LiveCluster[]> {
  onClustersChanged = onChange ?? null;

  const yamlConfigs = loadClustersYaml();
  const dbConfigs = loadClusterConfigsFromDb();

  // Merge: YAML first, then DB entries not already in YAML
  const seenIds = new Set(yamlConfigs.map((c) => c.id));
  const configs = [
    ...yamlConfigs,
    ...dbConfigs.filter((c) => !seenIds.has(c.id)),
  ];

  if (configs.length === 0) {
    console.log("K8s: No clusters configured");
    return [];
  }

  const results = await Promise.all(configs.map(connectCluster));
  for (const client of results) {
    if (client) clusterClients.set(client.live.id, client);
  }

  // Watch for config changes
  startConfigWatcher();

  return getLiveClusters();
}

function startConfigWatcher() {
  const configPath = getConfigPath();
  if (configWatcher) return;

  configWatcher = chokidar.watch(configPath, { ignoreInitial: true });
  configWatcher.on("change", async () => {
    console.log("K8s: clusters.yaml changed — reloading...");
    await reloadClusters();
  });
}

async function reloadClusters() {
  const configs = loadClustersYaml();
  const currentIds = new Set(clusterClients.keys());
  const newIds = new Set(configs.map((c) => c.id));

  // Remove clusters no longer in config
  for (const id of currentIds) {
    if (!newIds.has(id)) {
      console.log(`K8s: Removing cluster "${id}"`);
      clusterClients.delete(id);
    }
  }

  // Add or update clusters
  for (const cfg of configs) {
    if (!clusterClients.has(cfg.id)) {
      const client = await connectCluster(cfg);
      if (client) clusterClients.set(client.live.id, client);
    }
  }

  if (onClustersChanged) {
    onClustersChanged(getLiveClusters());
  }
}

/** Get all connected LiveCluster descriptors */
export function getLiveClusters(): LiveCluster[] {
  return Array.from(clusterClients.values()).map((c) => c.live);
}

/** Get the ClusterClient for a specific cluster ID */
export function getClusterClient(clusterId: string): ClusterClient | undefined {
  return clusterClients.get(clusterId);
}

/** Get all ClusterClients */
export function getAllClusterClients(): ClusterClient[] {
  return Array.from(clusterClients.values());
}

// Convenience getters (use first connected cluster for backward compat)
export function getCoreApi(): k8s.CoreV1Api {
  const first = clusterClients.values().next().value;
  if (!first) throw new Error("K8s client not initialized");
  return first.core;
}

export function getAppsApi(): k8s.AppsV1Api {
  const first = clusterClients.values().next().value;
  if (!first) throw new Error("K8s client not initialized");
  return first.apps;
}

export function getNetworkingApi(): k8s.NetworkingV1Api {
  const first = clusterClients.values().next().value;
  if (!first) throw new Error("K8s client not initialized");
  return first.networking;
}

export function getMetricsClient(): k8s.Metrics | null {
  const first = clusterClients.values().next().value;
  return first?.metrics ?? null;
}

export function getKubeConfig(): k8s.KubeConfig | null {
  const first = clusterClients.values().next().value;
  return first?.kc ?? null;
}

export function isK8sAvailable(): boolean {
  return clusterClients.size > 0;
}

/** Register a newly connected cluster into the runtime registry */
export function registerClusterClient(client: ClusterClient): void {
  clusterClients.set(client.live.id, client);
}

/** Persist a cluster config to the database */
export function addClusterToDb(cfg: ClusterConfig): void {
  const db = getDb();
  db.prepare(
    `INSERT OR REPLACE INTO cluster_configs (id, name, type, context, server, token_env, token_value, skip_tls_verify)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    cfg.id,
    cfg.name,
    cfg.type,
    cfg.context ?? null,
    cfg.server ?? null,
    cfg.tokenEnv ?? null,
    cfg.tokenValue ?? null,
    cfg.skipTLSVerify ? 1 : 0,
  );
  console.log(`K8s: Saved cluster "${cfg.name}" to database`);
}

/** Remove a cluster config from the database */
export function removeClusterFromDb(id: string): void {
  const db = getDb();
  db.prepare("DELETE FROM cluster_configs WHERE id = ?").run(id);
  console.log(`K8s: Removed cluster "${id}" from database`);
}

/** Remove a cluster from the runtime registry */
export function unregisterClusterClient(id: string): void {
  clusterClients.delete(id);
}

/** Load cluster configs from the database */
export function loadClusterConfigsFromDb(): ClusterConfig[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM cluster_configs")
    .all() as Array<{
    id: string;
    name: string;
    type: "kubeconfig" | "token";
    context: string | null;
    server: string | null;
    token_env: string | null;
    token_value: string | null;
    skip_tls_verify: number;
  }>;

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    ...(r.context ? { context: r.context } : {}),
    ...(r.server ? { server: r.server } : {}),
    ...(r.token_env ? { tokenEnv: r.token_env } : {}),
    ...(r.token_value ? { tokenValue: r.token_value } : {}),
    skipTLSVerify: r.skip_tls_verify === 1,
  }));
}
