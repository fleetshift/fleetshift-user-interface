import { createSharedStore } from "@scalprum/core";
import { useGetState } from "@scalprum/react-core";
import { useScalprum } from "@scalprum/react-core";
import { useEffect } from "react";

export interface LogLine {
  timestamp: string;
  pod: string;
  namespace: string;
  level: string;
  message: string;
  cluster: string;
}

const MAX_LINES = 500;

const EVENTS = ["LOG_LINE", "BULK"] as const;

interface LogStoreState {
  lines: LogLine[];
  loading: boolean;
}

type LogStore = ReturnType<
  typeof createSharedStore<LogStoreState, typeof EVENTS>
>;

let store: LogStore | null = null;
let initialized = false;

interface FleetShiftApi {
  fleetshift: {
    apiBase: string;
    getClusterIdsForPlugin: (pluginKey: string) => string[];
    on: (topic: string, callback: (event: any) => void) => () => void;
  };
}

function getStore(): LogStore {
  if (!store) {
    store = createSharedStore<LogStoreState, typeof EVENTS>({
      initialState: { lines: [], loading: true },
      events: EVENTS,
      onEventChange: (state, event, payload) => {
        switch (event) {
          case "LOG_LINE": {
            const line = payload as LogLine;
            const lines = [...state.lines, line];
            // Keep circular buffer capped
            if (lines.length > MAX_LINES) {
              lines.splice(0, lines.length - MAX_LINES);
            }
            return { lines, loading: false };
          }
          case "BULK": {
            const bulk = payload as LogLine[];
            const lines = [...state.lines, ...bulk];
            if (lines.length > MAX_LINES) {
              lines.splice(0, lines.length - MAX_LINES);
            }
            return { lines, loading: false };
          }
          default:
            return state;
        }
      },
    });
  }
  return store;
}

export function useLogStore(): { lines: LogLine[]; loading: boolean } {
  const { api } = useScalprum<{ api: FleetShiftApi }>();
  const s = getStore();
  const state = useGetState(s);

  useEffect(() => {
    if (initialized) return;
    initialized = true;

    const clusterIds = api.fleetshift.getClusterIdsForPlugin("logs");

    // Fetch initial logs from ALL clusters via REST
    if (clusterIds.length > 0) {
      Promise.all(
        clusterIds.map((clusterId) =>
          fetch(`${api.fleetshift.apiBase}/clusters/${clusterId}/logs`)
            .then((res) => (res.ok ? res.json() : []))
            .then((data: Omit<LogLine, "cluster">[]) =>
              data.map((line) => ({ ...line, cluster: clusterId })),
            ),
        ),
      ).then((results) => {
        const allLines = results
          .flat()
          .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
        if (allLines.length > 0) {
          s.updateState("BULK", allLines);
        }
      });
    }

    // Subscribe to live log lines via WS
    const unsub = api.fleetshift.on(
      "logs",
      (event: { line: Omit<LogLine, "cluster">; cluster: string }) => {
        s.updateState("LOG_LINE", { ...event.line, cluster: event.cluster });
      },
    );

    return () => {
      unsub();
    };
  }, [api, s]);

  return {
    lines: state.lines,
    loading: state.loading,
  };
}

export default useLogStore;
