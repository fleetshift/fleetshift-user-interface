import { Router } from "express";
import { getClusterClient } from "../client";
import { requireCluster, k8sError, type ClusterMap } from "../utils";

export function clowderRoutes(clusterMap: ClusterMap): Router {
  const router = Router();

  router.get("/clusters/:id/clowdapps", async (req, res) => {
    const clusterId = requireCluster(req, res, clusterMap);
    if (!clusterId) return;
    try {
      const client = getClusterClient(req.params.id);
      if (!client) {
        res.status(404).json({ error: "Cluster not found" });
        return;
      }
      const customApi = client.kc.makeApiClient(
        await import("@kubernetes/client-node").then((m) => m.CustomObjectsApi),
      );
      const result = await customApi.listClusterCustomObject({
        group: "cloud.redhat.com",
        version: "v1alpha1",
        plural: "clowdapps",
      });
      const body = result as {
        items?: Array<Record<string, unknown>>;
      };
      const apps = (body.items ?? []).map((item) => {
        const metadata = item.metadata as
          | {
              name?: string;
              namespace?: string;
              creationTimestamp?: string;
            }
          | undefined;
        const spec = item.spec as
          | {
              envName?: string;
              deployments?: Array<{
                name?: string;
                podSpec?: { image?: string };
                webServices?: { public?: { enabled?: boolean } };
              }>;
              dependencies?: string[];
              optionalDependencies?: string[];
              database?: { name?: string; version?: number };
              inMemoryDb?: boolean;
              kafkaTopics?: Array<{
                topicName?: string;
                partitions?: number;
                replicas?: number;
              }>;
              featureFlags?: boolean;
              jobs?: Array<{ name?: string }>;
            }
          | undefined;
        const status = item.status as
          | {
              deployments?: {
                managedDeployments?: number;
                readyDeployments?: number;
              };
              conditions?: Array<{
                type?: string;
                status?: string;
                reason?: string;
                message?: string;
              }>;
            }
          | undefined;

        return {
          name: metadata?.name ?? "unknown",
          namespace: metadata?.namespace ?? "",
          cluster_id: clusterId,
          created_at: metadata?.creationTimestamp ?? "",
          envName: spec?.envName ?? "",
          deploymentCount: spec?.deployments?.length ?? 0,
          deployments: (spec?.deployments ?? []).map((d) => ({
            name: d.name ?? "",
            image: d.podSpec?.image ?? "",
            public: d.webServices?.public?.enabled ?? false,
          })),
          dependencies: spec?.dependencies ?? [],
          optionalDependencies: spec?.optionalDependencies ?? [],
          database: spec?.database ?? null,
          inMemoryDb: spec?.inMemoryDb ?? false,
          kafkaTopics: spec?.kafkaTopics ?? [],
          featureFlags: spec?.featureFlags ?? false,
          jobs: (spec?.jobs ?? []).map((j) => j.name ?? ""),
          managedDeployments: status?.deployments?.managedDeployments ?? 0,
          readyDeployments: status?.deployments?.readyDeployments ?? 0,
          conditions: status?.conditions ?? [],
        };
      });
      res.json(apps);
    } catch (err) {
      k8sError(res, err);
    }
  });

  router.get("/clusters/:id/clowdenvironments", async (req, res) => {
    const clusterId = requireCluster(req, res, clusterMap);
    if (!clusterId) return;
    try {
      const client = getClusterClient(req.params.id);
      if (!client) {
        res.status(404).json({ error: "Cluster not found" });
        return;
      }
      const customApi = client.kc.makeApiClient(
        await import("@kubernetes/client-node").then((m) => m.CustomObjectsApi),
      );
      const result = await customApi.listClusterCustomObject({
        group: "cloud.redhat.com",
        version: "v1alpha1",
        plural: "clowdenvironments",
      });
      const body = result as {
        items?: Array<Record<string, unknown>>;
      };
      const envs = (body.items ?? []).map((item) => {
        const metadata = item.metadata as
          | {
              name?: string;
              namespace?: string;
              creationTimestamp?: string;
            }
          | undefined;
        const spec = item.spec as
          | {
              targetNamespace?: string;
              providers?: {
                db?: { mode?: string };
                inMemoryDb?: { mode?: string };
                kafka?: { mode?: string };
                logging?: { mode?: string };
                featureFlags?: { mode?: string };
                objectStore?: { mode?: string };
              };
            }
          | undefined;
        const status = item.status as
          | {
              deployments?: {
                managedDeployments?: number;
                readyDeployments?: number;
              };
              apps?: Array<{
                name?: string;
                managedDeployments?: number;
                readyDeployments?: number;
              }>;
              conditions?: Array<{ type?: string; status?: string }>;
            }
          | undefined;

        return {
          name: metadata?.name ?? "unknown",
          namespace: metadata?.namespace ?? "",
          cluster_id: clusterId,
          created_at: metadata?.creationTimestamp ?? "",
          targetNamespace: spec?.targetNamespace ?? "",
          providers: spec?.providers ?? {},
          appCount: status?.apps?.length ?? 0,
          apps: (status?.apps ?? []).map((a) => ({
            name: a.name ?? "",
            managedDeployments: a.managedDeployments ?? 0,
            readyDeployments: a.readyDeployments ?? 0,
          })),
          managedDeployments: status?.deployments?.managedDeployments ?? 0,
          readyDeployments: status?.deployments?.readyDeployments ?? 0,
          conditions: status?.conditions ?? [],
        };
      });
      res.json(envs);
    } catch (err) {
      k8sError(res, err);
    }
  });

  return router;
}
