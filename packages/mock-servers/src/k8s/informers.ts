import * as k8s from "@kubernetes/client-node";
import type { LiveCluster, ClusterClient } from "./client";
import { getClusterClient } from "./client";
import { deriveAlerts, type SyntheticAlert } from "./transforms";

export type K8sEventVerb = "ADDED" | "MODIFIED" | "DELETED";

export interface K8sEvent {
  type: "k8s";
  verb: K8sEventVerb;
  resource: string;
  cluster: string;
  object: k8s.KubernetesObject;
}

export interface K8sMetricsEvent {
  type: "k8s-metrics";
  resource: "pod-metrics" | "node-metrics";
  cluster: string;
  items: k8s.PodMetric[] | k8s.NodeMetric[];
}

export interface K8sAlertEvent {
  type: "alerts";
  verb: K8sEventVerb;
  resource: "alerts";
  cluster: string;
  object: SyntheticAlert;
}

export type K8sWsEvent = K8sEvent | K8sMetricsEvent | K8sAlertEvent;
export type K8sEventHandler = (event: K8sWsEvent) => void;

const informers: Array<k8s.Informer<k8s.KubernetesObject>> = [];
const metricsIntervals = new Map<string, ReturnType<typeof setInterval>>();
const alertsIntervals = new Map<string, ReturnType<typeof setInterval>>();

const METRICS_POLL_MS = 10_000; // 10s
const ALERTS_POLL_MS = 15_000; // 15s

function createInformer(
  kc: k8s.KubeConfig,
  resource: string,
  path: string,
  listFn: () => Promise<k8s.KubernetesListObject<k8s.KubernetesObject>>,
  clusterId: string,
  onEvent: K8sEventHandler,
) {
  const informer = k8s.makeInformer(kc, path, listFn);

  informer.on("add", (obj) => {
    onEvent({
      type: "k8s",
      verb: "ADDED",
      resource,
      cluster: clusterId,
      object: obj,
    });
  });
  informer.on("update", (obj) => {
    onEvent({
      type: "k8s",
      verb: "MODIFIED",
      resource,
      cluster: clusterId,
      object: obj,
    });
  });
  informer.on("delete", (obj) => {
    onEvent({
      type: "k8s",
      verb: "DELETED",
      resource,
      cluster: clusterId,
      object: obj,
    });
  });
  informer.on("error", (err) => {
    console.error(`[${clusterId}] ${resource} informer error:`, err);
    setTimeout(() => informer.start(), 5000);
  });

  informers.push(informer);
  return informer;
}

/**
 * Start informers for a set of clusters.
 * Each cluster gets its own set of informers using its own KubeConfig.
 */
export async function startInformers(
  clusters: LiveCluster[],
  onEvent: K8sEventHandler,
) {
  for (const cluster of clusters) {
    const client = getClusterClient(cluster.id);
    if (!client) {
      console.error(
        `K8s: No client for cluster "${cluster.id}", skipping informers`,
      );
      continue;
    }
    await startClusterInformers(client, onEvent);
  }
}

async function startClusterInformers(
  client: ClusterClient,
  onEvent: K8sEventHandler,
) {
  const { kc, core, apps, networking, metrics, live } = client;
  const clusterId = live.id;

  // --- Pod informer ---
  const podInformer = createInformer(
    kc,
    "pods",
    "/api/v1/pods",
    () =>
      core.listPodForAllNamespaces() as Promise<
        k8s.KubernetesListObject<k8s.KubernetesObject>
      >,
    clusterId,
    onEvent,
  );
  await podInformer.start();
  console.log(`[${clusterId}] informer started: pods`);

  // --- Node informer ---
  const nodeInformer = createInformer(
    kc,
    "nodes",
    "/api/v1/nodes",
    () =>
      core.listNode() as Promise<
        k8s.KubernetesListObject<k8s.KubernetesObject>
      >,
    clusterId,
    onEvent,
  );
  await nodeInformer.start();
  console.log(`[${clusterId}] informer started: nodes`);

  // --- Namespace informer ---
  const nsInformer = createInformer(
    kc,
    "namespaces",
    "/api/v1/namespaces",
    () =>
      core.listNamespace() as Promise<
        k8s.KubernetesListObject<k8s.KubernetesObject>
      >,
    clusterId,
    onEvent,
  );
  await nsInformer.start();
  console.log(`[${clusterId}] informer started: namespaces`);

  // --- Deployment informer ---
  const depInformer = createInformer(
    kc,
    "deployments",
    "/apis/apps/v1/deployments",
    () =>
      apps.listDeploymentForAllNamespaces() as Promise<
        k8s.KubernetesListObject<k8s.KubernetesObject>
      >,
    clusterId,
    onEvent,
  );
  await depInformer.start();
  console.log(`[${clusterId}] informer started: deployments`);

  // --- Event informer ---
  const eventInformer = createInformer(
    kc,
    "events",
    "/api/v1/events",
    () =>
      core.listEventForAllNamespaces() as Promise<
        k8s.KubernetesListObject<k8s.KubernetesObject>
      >,
    clusterId,
    onEvent,
  );
  await eventInformer.start();
  console.log(`[${clusterId}] informer started: events`);

  // --- Service informer ---
  const svcInformer = createInformer(
    kc,
    "services",
    "/api/v1/services",
    () =>
      core.listServiceForAllNamespaces() as Promise<
        k8s.KubernetesListObject<k8s.KubernetesObject>
      >,
    clusterId,
    onEvent,
  );
  await svcInformer.start();
  console.log(`[${clusterId}] informer started: services`);

  // --- PersistentVolume informer ---
  const pvInformer = createInformer(
    kc,
    "persistentvolumes",
    "/api/v1/persistentvolumes",
    () =>
      core.listPersistentVolume() as Promise<
        k8s.KubernetesListObject<k8s.KubernetesObject>
      >,
    clusterId,
    onEvent,
  );
  await pvInformer.start();
  console.log(`[${clusterId}] informer started: persistentvolumes`);

  // --- PersistentVolumeClaim informer ---
  const pvcInformer = createInformer(
    kc,
    "persistentvolumeclaims",
    "/api/v1/persistentvolumeclaims",
    () =>
      core.listPersistentVolumeClaimForAllNamespaces() as Promise<
        k8s.KubernetesListObject<k8s.KubernetesObject>
      >,
    clusterId,
    onEvent,
  );
  await pvcInformer.start();
  console.log(`[${clusterId}] informer started: persistentvolumeclaims`);

  // --- Ingress informer (may fail if networking API not available) ---
  try {
    const ingInformer = createInformer(
      kc,
      "ingresses",
      "/apis/networking.k8s.io/v1/ingresses",
      () =>
        networking.listIngressForAllNamespaces() as Promise<
          k8s.KubernetesListObject<k8s.KubernetesObject>
        >,
      clusterId,
      onEvent,
    );
    await ingInformer.start();
    console.log(`[${clusterId}] informer started: ingresses`);
  } catch {
    console.log(
      `[${clusterId}] informer skipped: ingresses (API not available)`,
    );
  }

  // --- Metrics polling (no watch support in metrics API) ---
  if (!metrics) {
    console.log(
      `[${clusterId}] metrics client unavailable, skipping metrics polling`,
    );
  } else {
    async function pollMetrics() {
      try {
        const [podMetrics, nodeMetrics] = await Promise.all([
          metrics!.getPodMetrics(),
          metrics!.getNodeMetrics(),
        ]);

        onEvent({
          type: "k8s-metrics",
          resource: "pod-metrics",
          cluster: clusterId,
          items: podMetrics.items,
        });

        onEvent({
          type: "k8s-metrics",
          resource: "node-metrics",
          cluster: clusterId,
          items: nodeMetrics.items,
        });
      } catch (err) {
        console.error(
          `[${clusterId}] metrics poll error:`,
          err instanceof Error ? err.message : err,
        );
      }
    }

    await pollMetrics();
    metricsIntervals.set(clusterId, setInterval(pollMetrics, METRICS_POLL_MS));
    console.log(
      `[${clusterId}] metrics polling started (every ${METRICS_POLL_MS / 1000}s)`,
    );
  }

  // --- Alerts polling (derived from pod/node state) ---
  let previousAlertIds = new Set<string>();

  async function pollAlerts() {
    try {
      const [podResponse, nodeResponse] = await Promise.all([
        core.listPodForAllNamespaces(),
        core.listNode(),
      ]);
      const currentAlerts = deriveAlerts(
        podResponse.items ?? [],
        nodeResponse.items ?? [],
        clusterId,
      );
      const currentIds = new Set(currentAlerts.map((a) => a.id));

      for (const alert of currentAlerts) {
        if (!previousAlertIds.has(alert.id)) {
          onEvent({
            type: "alerts",
            verb: "ADDED",
            resource: "alerts",
            cluster: clusterId,
            object: alert,
          });
        }
      }

      for (const prevId of previousAlertIds) {
        if (!currentIds.has(prevId)) {
          onEvent({
            type: "alerts",
            verb: "DELETED",
            resource: "alerts",
            cluster: clusterId,
            object: {
              id: prevId,
              cluster_id: clusterId,
              name: "",
              severity: "",
              state: "resolved",
              message: "",
              fired_at: "",
            },
          });
        }
      }

      previousAlertIds = currentIds;
    } catch (err) {
      console.error(
        `[${clusterId}] alerts poll error:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  await pollAlerts();
  alertsIntervals.set(clusterId, setInterval(pollAlerts, ALERTS_POLL_MS));
  console.log(
    `[${clusterId}] alerts polling started (every ${ALERTS_POLL_MS / 1000}s)`,
  );
}

export function stopInformers() {
  for (const inf of informers) {
    inf.stop();
  }
  informers.length = 0;

  for (const interval of metricsIntervals.values()) {
    clearInterval(interval);
  }
  metricsIntervals.clear();

  for (const interval of alertsIntervals.values()) {
    clearInterval(interval);
  }
  alertsIntervals.clear();
}
