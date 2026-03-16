import * as k8s from "@kubernetes/client-node";

export const CRD_PLUGIN_MAP: Record<string, string> = {
  "monitoring.coreos.com": "observability",
  "kafka.strimzi.io": "pipelines",
  "keda.sh": "autoscaling",
  "cert-manager.io": "networking",
  "elasticsearch.k8s.elastic.co": "logs",
  "cloud.redhat.com": "clowder",
  "cyndi.cloud.redhat.com": "pipelines",
};

export const ALWAYS_PLUGINS = [
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

export interface DiscoveryDetails {
  alwaysPlugins: string[];
  crdPluginMap: Record<string, string>;
  crdGroups: string[];
  apiGroups: string[];
  matchedCrdGroups: Record<string, string>;
  hasMetricsApi: boolean;
  resultPlugins: string[];
}

export async function getDiscoveryDetails(
  kc: k8s.KubeConfig,
): Promise<DiscoveryDetails> {
  const crdGroups: string[] = [];
  const apiGroups: string[] = [];
  const matchedCrdGroups: Record<string, string> = {};
  let hasMetricsApi = false;
  const plugins = new Set(ALWAYS_PLUGINS);

  try {
    const extApi = kc.makeApiClient(k8s.ApiextensionsV1Api);
    const crdList = await extApi.listCustomResourceDefinition();
    for (const crd of crdList.items ?? []) {
      const group = crd.spec?.group;
      if (group) crdGroups.push(group);
    }
    const groupSet = new Set(crdGroups);
    for (const [group, plugin] of Object.entries(CRD_PLUGIN_MAP)) {
      if (groupSet.has(group)) {
        matchedCrdGroups[group] = plugin;
        plugins.add(plugin);
      }
    }
  } catch {
    // CRD discovery failed
  }

  try {
    const apisApi = kc.makeApiClient(k8s.ApisApi);
    const versions = await apisApi.getAPIVersions();
    for (const g of versions.groups ?? []) {
      apiGroups.push(g.name);
    }
    hasMetricsApi = apiGroups.includes("metrics.k8s.io");
    if (hasMetricsApi) plugins.add("observability");
  } catch {
    // API groups fetch failed
  }

  return {
    alwaysPlugins: [...ALWAYS_PLUGINS],
    crdPluginMap: { ...CRD_PLUGIN_MAP },
    crdGroups: [...new Set(crdGroups)].sort(),
    apiGroups: apiGroups.sort(),
    matchedCrdGroups,
    hasMetricsApi,
    resultPlugins: Array.from(plugins),
  };
}

export async function discoverPlugins(kc: k8s.KubeConfig): Promise<string[]> {
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
  } catch (err) {
    console.log(
      `K8s: CRD discovery failed for cluster, using defaults - ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  try {
    const apisApi = kc.makeApiClient(k8s.ApisApi);
    const metricsCheck = await apisApi.getAPIVersions();
    const hasMetrics = (metricsCheck.groups ?? []).some(
      (g) => g.name === "metrics.k8s.io",
    );
    if (hasMetrics) plugins.add("observability");
  } catch {
    // API groups not available
  }

  // ConsolePlugin-based discovery (OpenShift)
  try {
    const consolePlugins = await listConsolePlugins(kc);
    if (consolePlugins.some((cp) => cp.name === "clowder-plugin")) {
      plugins.add("clowder");
    }
  } catch {
    // ConsolePlugin listing not available
  }

  return Array.from(plugins);
}

export interface ConsolePluginInfo {
  name: string;
  backend: {
    type: string;
    service?: {
      name: string;
      namespace: string;
      port: number;
      basePath?: string;
    };
  };
  proxy?: Array<{
    alias: string;
    endpoint: {
      type: string;
      service?: { name: string; namespace: string; port: number };
    };
  }>;
  i18n?: Record<string, unknown>;
  raw: Record<string, unknown>;
}

export async function listConsolePlugins(
  kc: k8s.KubeConfig,
): Promise<ConsolePluginInfo[]> {
  const customApi = kc.makeApiClient(k8s.CustomObjectsApi);

  try {
    const result = await customApi.listClusterCustomObject({
      group: "console.openshift.io",
      version: "v1",
      plural: "consoleplugins",
    });

    const body = result as {
      items?: Array<{
        metadata?: { name?: string };
        spec?: {
          backend?: {
            type?: string;
            service?: {
              name?: string;
              namespace?: string;
              port?: number;
              basePath?: string;
            };
          };
          proxy?: Array<{
            alias?: string;
            endpoint?: {
              type?: string;
              service?: {
                name?: string;
                namespace?: string;
                port?: number;
              };
            };
          }>;
          i18n?: Record<string, unknown>;
        };
      }>;
    };

    return (body.items ?? []).map((item) => ({
      name: item.metadata?.name ?? "unknown",
      backend: {
        type: item.spec?.backend?.type ?? "unknown",
        service: item.spec?.backend?.service
          ? {
              name: item.spec.backend.service.name ?? "",
              namespace: item.spec.backend.service.namespace ?? "",
              port: item.spec.backend.service.port ?? 0,
              basePath: item.spec.backend.service.basePath,
            }
          : undefined,
      },
      proxy: item.spec?.proxy?.map((p) => ({
        alias: p.alias ?? "",
        endpoint: {
          type: p.endpoint?.type ?? "unknown",
          service: p.endpoint?.service
            ? {
                name: p.endpoint.service.name ?? "",
                namespace: p.endpoint.service.namespace ?? "",
                port: p.endpoint.service.port ?? 0,
              }
            : undefined,
        },
      })),
      i18n: item.spec?.i18n,
      raw: item as Record<string, unknown>,
    }));
  } catch (err) {
    // Not an OpenShift cluster or no permission
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`K8s: ConsolePlugin listing failed: ${msg}`);
    return [];
  }
}
