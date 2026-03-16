import * as k8s from "@kubernetes/client-node";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import chokidar, { FSWatcher } from "chokidar";
import type { LiveCluster, ClusterConfig, ClusterClient } from "./types";
import { connectCluster } from "./connect";
import { loadClusterConfigsFromDb } from "./persistence";

interface ClustersYaml {
  clusters: ClusterConfig[];
}

const clusterClients = new Map<string, ClusterClient>();
let configWatcher: FSWatcher | null = null;
let onClustersChanged: ((clusters: LiveCluster[]) => void) | null = null;

function getConfigPath(): string {
  return path.resolve(
    typeof __dirname === "string" ? __dirname : process.cwd(),
    "../../../clusters.yaml",
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

/** Remove a cluster from the runtime registry */
export function unregisterClusterClient(id: string): void {
  clusterClients.delete(id);
}
