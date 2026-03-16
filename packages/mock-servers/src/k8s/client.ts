import * as k8s from "@kubernetes/client-node";

let coreApi: k8s.CoreV1Api | null = null;
let appsApi: k8s.AppsV1Api | null = null;
let networkingApi: k8s.NetworkingV1Api | null = null;
let metricsClient: k8s.Metrics | null = null;
let kubeConfig: k8s.KubeConfig | null = null;

export interface LiveCluster {
  id: string;
  name: string;
  version: string;
  context: string;
  plugins: string[];
}

/**
 * Map CRD API groups to FleetShift plugin keys.
 * "core" and "nodes" are always present (built-in k8s resources).
 */
const CRD_PLUGIN_MAP: Record<string, string> = {
  "monitoring.coreos.com": "observability",
  "kafka.strimzi.io": "pipelines",
  "keda.sh": "autoscaling",
  "cert-manager.io": "networking",
  "elasticsearch.k8s.elastic.co": "logs",
  "cloud.redhat.com": "deployments",
  "cyndi.cloud.redhat.com": "pipelines",
};

const ALWAYS_PLUGINS = ["core", "nodes", "storage", "events", "alerts"];

/**
 * Try to initialize the k8s client from the default kubeconfig.
 * Returns the list of discovered clusters, or an empty array if k8s is unavailable.
 */
export async function initK8sClient(): Promise<LiveCluster[]> {
  try {
    const kc = new k8s.KubeConfig();
    kc.loadFromDefault();

    const contexts = kc.getContexts();
    if (contexts.length === 0) {
      console.log("K8s: No contexts found in kubeconfig");
      return [];
    }

    // Skip TLS verification when running in Docker (cert SANs won't match host.docker.internal)
    if (process.env.K8S_TLS_INSECURE === "1") {
      for (const cluster of kc.clusters) {
        (cluster as { skipTLSVerify: boolean }).skipTLSVerify = true;
      }
    }

    // Use current context
    const currentContext = kc.getCurrentContext();
    kc.setCurrentContext(currentContext);

    const core = kc.makeApiClient(k8s.CoreV1Api);
    const apps = kc.makeApiClient(k8s.AppsV1Api);
    const networking = kc.makeApiClient(k8s.NetworkingV1Api);

    // Verify connectivity
    const versionApi = kc.makeApiClient(k8s.VersionApi);
    const versionInfo = await versionApi.getCode();
    const version = `${versionInfo.major}.${versionInfo.minor}`;

    coreApi = core;
    appsApi = apps;
    networkingApi = networking;
    kubeConfig = kc;

    try {
      metricsClient = new k8s.Metrics(kc);
    } catch {
      console.log("K8s: Metrics client unavailable");
    }

    const clusterName = kc.getCurrentCluster()?.name ?? currentContext;

    // Discover installed plugins from CRDs
    const plugins = await discoverPlugins(kc);

    console.log(
      `K8s: Connected to ${clusterName} (v${version}) via context "${currentContext}"`,
    );
    console.log(`K8s: Discovered plugins: ${plugins.join(", ")}`);

    return [
      {
        id: currentContext,
        name: clusterName,
        version,
        context: currentContext,
        plugins,
      },
    ];
  } catch (err) {
    console.log(
      `K8s: Not available - ${err instanceof Error ? err.message : String(err)}`,
    );
    return [];
  }
}

export function getCoreApi(): k8s.CoreV1Api {
  if (!coreApi) throw new Error("K8s client not initialized");
  return coreApi;
}

export function getAppsApi(): k8s.AppsV1Api {
  if (!appsApi) throw new Error("K8s client not initialized");
  return appsApi;
}

export function getNetworkingApi(): k8s.NetworkingV1Api {
  if (!networkingApi) throw new Error("K8s client not initialized");
  return networkingApi;
}

export function getMetricsClient(): k8s.Metrics | null {
  return metricsClient;
}

export function getKubeConfig(): k8s.KubeConfig | null {
  return kubeConfig;
}

export function isK8sAvailable(): boolean {
  return coreApi !== null;
}

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
      if (groups.has(group)) {
        plugins.add(plugin);
      }
    }

    // Check for metrics-server availability
    try {
      const apisApi = kc.makeApiClient(k8s.ApisApi);
      const metricsCheck = await apisApi.getAPIVersions();
      const hasMetrics = (metricsCheck.groups ?? []).some(
        (g) => g.name === "metrics.k8s.io",
      );
      if (hasMetrics) {
        plugins.add("observability");
      }
    } catch {
      // metrics API not available
    }
  } catch (err) {
    console.log(
      `K8s: CRD discovery failed, using default plugins - ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  return Array.from(plugins);
}
