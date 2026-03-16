import { createSharedStore } from "@scalprum/core";
import { useGetState } from "@scalprum/react-core";
import { useScalprum } from "@scalprum/react-core";
import { useEffect, useRef } from "react";

// --- Types ---

export interface ClowdAppDeployment {
  name: string;
  image: string;
  public: boolean;
}

export interface ClowdApp {
  name: string;
  namespace: string;
  cluster_id: string;
  created_at: string;
  envName: string;
  deploymentCount: number;
  deployments: ClowdAppDeployment[];
  dependencies: string[];
  optionalDependencies: string[];
  database: { name?: string; version?: number } | null;
  inMemoryDb: boolean;
  kafkaTopics: Array<{
    topicName?: string;
    partitions?: number;
    replicas?: number;
  }>;
  featureFlags: boolean;
  jobs: string[];
  managedDeployments: number;
  readyDeployments: number;
  conditions: Array<{
    type?: string;
    status?: string;
    reason?: string;
    message?: string;
  }>;
}

export interface ClowdEnvApp {
  name: string;
  managedDeployments: number;
  readyDeployments: number;
}

export interface ClowdEnvironment {
  name: string;
  namespace: string;
  cluster_id: string;
  created_at: string;
  targetNamespace: string;
  providers: Record<string, { mode?: string }>;
  appCount: number;
  apps: ClowdEnvApp[];
  managedDeployments: number;
  readyDeployments: number;
  conditions: Array<{ type?: string; status?: string }>;
}

// --- Store ---

const EVENTS = ["INIT"] as const;

interface ClowderStoreState {
  apps: ClowdApp[];
  environments: ClowdEnvironment[];
  /** Maps "clusterId/deploymentName" → K8s deployment UID */
  deployMap: Record<string, string>;
  loading: boolean;
  error: string | null;
}

type ClowderStore = ReturnType<
  typeof createSharedStore<ClowderStoreState, typeof EVENTS>
>;

let store: ClowderStore | null = null;
let initializedFor = "";

export function getStore(): ClowderStore {
  if (!store) {
    store = createSharedStore<ClowderStoreState, typeof EVENTS>({
      initialState: {
        apps: [],
        environments: [],
        deployMap: {},
        loading: true,
        error: null,
      },
      events: EVENTS,
      onEventChange: (_state, event, payload) => {
        if (event === "INIT") {
          return payload as ClowderStoreState;
        }
        return _state;
      },
    });
  }
  return store;
}

// --- Scalprum API type ---

interface FleetShiftApi {
  fleetshift: {
    apiBase: string;
    getClusterIdsForPlugin: (pluginKey: string) => string[];
    onClustersChange: (fn: () => void) => () => void;
    onScopeChange: (fn: () => void) => () => void;
  };
}

// --- Hook ---

export function useClowderStore(): ClowderStoreState {
  const { api } = useScalprum<{ api: FleetShiftApi }>();
  const s = getStore();
  const state = useGetState(s);
  const apiRef = useRef(api);
  apiRef.current = api;

  useEffect(() => {
    const clusterIds = api.fleetshift.getClusterIdsForPlugin("clowder");
    const clusterKey = clusterIds.sort().join(",");
    if (initializedFor === clusterKey) return;
    initializedFor = clusterKey;

    if (clusterIds.length === 0) {
      s.updateState("INIT", {
        apps: [],
        environments: [],
        deployMap: {},
        loading: false,
        error: null,
      });
      return;
    }

    type DepInfo = { id: string; name: string; cluster_id: string };

    const appFetches = clusterIds.map((id) =>
      fetch(`${api.fleetshift.apiBase}/clusters/${id}/clowdapps`)
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => [] as ClowdApp[]),
    );

    const envFetches = clusterIds.map((id) =>
      fetch(`${api.fleetshift.apiBase}/clusters/${id}/clowdenvironments`)
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => [] as ClowdEnvironment[]),
    );

    const deployFetches = clusterIds.map((id) =>
      fetch(`${api.fleetshift.apiBase}/clusters/${id}/deployments`)
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => [] as DepInfo[]),
    );

    Promise.all([
      Promise.all(appFetches),
      Promise.all(envFetches),
      Promise.all(deployFetches),
    ])
      .then(([appResults, envResults, deployResults]) => {
        const map: Record<string, string> = {};
        for (const dep of deployResults.flat()) {
          map[`${dep.cluster_id}/${dep.name}`] = dep.id;
        }
        s.updateState("INIT", {
          apps: appResults.flat(),
          environments: envResults.flat(),
          deployMap: map,
          loading: false,
          error: null,
        });
      })
      .catch((err) => {
        s.updateState("INIT", {
          apps: [],
          environments: [],
          deployMap: {},
          loading: false,
          error: String(err),
        });
      });

    const unsub1 = api.fleetshift.onClustersChange(() => {
      initializedFor = "";
    });
    const unsub2 = api.fleetshift.onScopeChange(() => {
      initializedFor = "";
    });

    return () => {
      unsub1();
      unsub2();
      initializedFor = "";
    };
  }, [api, s]);

  return state;
}

export default useClowderStore;
