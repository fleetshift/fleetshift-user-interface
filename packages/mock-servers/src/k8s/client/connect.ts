import * as k8s from "@kubernetes/client-node";
import type { ClusterConfig, ClusterClient, LiveCluster } from "./types";
import { discoverPlugins } from "./discovery";

export type ProgressStep =
  | "config"
  | "connect"
  | "clients"
  | "plugins"
  | "platform"
  | "nodes"
  | "register";

export type ProgressCallback = (
  step: ProgressStep,
  status: "running" | "done" | "error",
  detail?: string,
) => void;

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
      throw new Error(`Token not provided for cluster "${cfg.name}"`);
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
  onProgress?: ProgressCallback,
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

  const progress = onProgress ?? (() => {});

  try {
    progress("config", "running");
    const kc = buildKubeConfigForCluster(cfg);
    progress("config", "done");

    // Verify connectivity
    progress("connect", "running");
    const versionApi = kc.makeApiClient(k8s.VersionApi);
    const versionInfo = await versionApi.getCode();
    const version = `${versionInfo.major}.${versionInfo.minor}`;
    console.log(`K8s:   reach:   ✓ v${version}`);
    progress("connect", "done", `v${version}`);

    progress("clients", "running");
    const core = kc.makeApiClient(k8s.CoreV1Api);
    const apps = kc.makeApiClient(k8s.AppsV1Api);
    const networking = kc.makeApiClient(k8s.NetworkingV1Api);

    let metrics: k8s.Metrics | null = null;
    try {
      metrics = new k8s.Metrics(kc);
    } catch {
      // metrics not available
    }
    progress("clients", "done");

    progress("plugins", "running");
    const plugins = await discoverPlugins(kc);
    const clusterName = cfg.name ?? kc.getCurrentCluster()?.name ?? cfg.id;
    progress("plugins", "done", `${plugins.length} plugins`);

    // Detect OpenShift vs vanilla Kubernetes
    progress("platform", "running");
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
    progress("platform", "done", platform);

    // Get node count
    progress("nodes", "running");
    let nodeCount = 0;
    try {
      const nodeList = await core.listNode();
      nodeCount = (nodeList.items ?? []).length;
    } catch {
      // no permission to list nodes
    }
    progress("nodes", "done", `${nodeCount} node${nodeCount !== 1 ? "s" : ""}`);

    progress("register", "running");
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
    progress("register", "done");

    return { config: cfg, kc, core, apps, networking, metrics, live };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`K8s:   reach:   ✗ ${msg}`);
    return null;
  }
}
