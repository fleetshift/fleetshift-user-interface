import { createSharedStore } from "@scalprum/core";
import { useGetState } from "@scalprum/react-core";
import { useScalprum } from "@scalprum/react-core";
import { useEffect } from "react";

export interface Alert {
  id: string;
  cluster_id: string;
  name: string;
  severity: string;
  state: string;
  message: string;
  fired_at: string;
}

const EVENTS = ["INIT", "ADDED", "MODIFIED", "DELETED"] as const;

interface AlertStoreState {
  alerts: Record<string, Alert>;
  loading: boolean;
}

type AlertStore = ReturnType<
  typeof createSharedStore<AlertStoreState, typeof EVENTS>
>;

let store: AlertStore | null = null;
let initializedFor = "";

interface FleetShiftApi {
  fleetshift: {
    apiBase: string;
    getClusterIdsForPlugin: (pluginKey: string) => string[];
    on: (topic: string, callback: (event: any) => void) => () => void;
  };
}

function getStore(): AlertStore {
  if (!store) {
    store = createSharedStore<AlertStoreState, typeof EVENTS>({
      initialState: { alerts: {}, loading: true },
      events: EVENTS,
      onEventChange: (state, event, payload: Alert | Alert[]) => {
        switch (event) {
          case "INIT": {
            const items = payload as Alert[];
            const alertsMap: Record<string, Alert> = {};
            for (const item of items) {
              alertsMap[item.id] = item;
            }
            return {
              ...state,
              alerts: { ...state.alerts, ...alertsMap },
              loading: false,
            };
          }
          case "ADDED":
          case "MODIFIED":
            return {
              alerts: {
                ...state.alerts,
                [(payload as Alert).id]: payload as Alert,
              },
              loading: false,
            };
          case "DELETED": {
            const { [(payload as Alert).id]: _, ...alerts } = state.alerts;
            return { alerts, loading: false };
          }
          default:
            return state;
        }
      },
    });
  }
  return store;
}

export function useAlertStore(): { alerts: Alert[]; loading: boolean } {
  const { api } = useScalprum<{ api: FleetShiftApi }>();
  const s = getStore();
  const state = useGetState(s);

  useEffect(() => {
    const clusterIds = api.fleetshift.getClusterIdsForPlugin("alerts");
    const clusterKey = clusterIds.sort().join(",");
    if (initializedFor === clusterKey) return;
    initializedFor = clusterKey;

    Promise.all(
      clusterIds.map((id) =>
        fetch(`${api.fleetshift.apiBase}/clusters/${id}/alerts`).then((res) =>
          res.ok ? res.json() : [],
        ),
      ),
    ).then((results) => {
      const allAlerts: Alert[] = results.flat();
      s.updateState("INIT", allAlerts);
    });

    // Subscribe to alerts WS topic if server supports it
    const unsub = api.fleetshift.on(
      "alerts",
      (event: { verb: string; object: Alert }) => {
        s.updateState(event.verb as (typeof EVENTS)[number], event.object);
      },
    );

    return () => {
      unsub();
      initializedFor = "";
    };
  }, [api, s]);

  return {
    alerts: Object.values(state.alerts),
    loading: state.loading,
  };
}

export default useAlertStore;
