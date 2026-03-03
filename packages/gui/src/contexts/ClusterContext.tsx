import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import {
  AvailableCluster,
  InstalledCluster,
  fetchAvailableClusters,
  fetchInstalledClusters,
  installCluster as apiInstall,
  uninstallCluster as apiUninstall,
  updateClusterPlugins as apiUpdatePlugins,
} from "../utils/api";

interface ClusterState {
  available: AvailableCluster[];
  installed: InstalledCluster[];
  loading: boolean;
}

type ClusterAction =
  | { type: "SET_LOADING" }
  | {
      type: "SET_DATA";
      available: AvailableCluster[];
      installed: InstalledCluster[];
    }
  | { type: "ADD_INSTALLED"; cluster: InstalledCluster }
  | { type: "REMOVE_INSTALLED"; id: string }
  | { type: "UPDATE_INSTALLED"; cluster: InstalledCluster };

function reducer(state: ClusterState, action: ClusterAction): ClusterState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, loading: true };
    case "SET_DATA":
      return {
        available: action.available,
        installed: action.installed,
        loading: false,
      };
    case "ADD_INSTALLED":
      return {
        ...state,
        available: state.available.map((c) =>
          c.id === action.cluster.id ? { ...c, installed: true } : c,
        ),
        installed: [...state.installed, action.cluster],
      };
    case "REMOVE_INSTALLED":
      return {
        ...state,
        available: state.available.map((c) =>
          c.id === action.id ? { ...c, installed: false } : c,
        ),
        installed: state.installed.filter((c) => c.id !== action.id),
      };
    case "UPDATE_INSTALLED":
      return {
        ...state,
        installed: state.installed.map((c) =>
          c.id === action.cluster.id ? action.cluster : c,
        ),
      };
  }
}

interface ClusterContextValue extends ClusterState {
  install: (id: string) => Promise<void>;
  uninstall: (id: string) => Promise<void>;
  togglePlugin: (id: string, plugin: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const ClusterContext = createContext<ClusterContextValue | null>(null);

export function ClusterProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    available: [],
    installed: [],
    loading: true,
  });

  const refresh = useCallback(async () => {
    dispatch({ type: "SET_LOADING" });
    const [available, installed] = await Promise.all([
      fetchAvailableClusters(),
      fetchInstalledClusters(),
    ]);
    dispatch({ type: "SET_DATA", available, installed });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const install = useCallback(async (id: string) => {
    const cluster = await apiInstall(id);
    dispatch({ type: "ADD_INSTALLED", cluster });
  }, []);

  const uninstall = useCallback(async (id: string) => {
    await apiUninstall(id);
    dispatch({ type: "REMOVE_INSTALLED", id });
  }, []);

  const togglePlugin = useCallback(
    async (id: string, plugin: string) => {
      const cluster = state.installed.find((c) => c.id === id);
      if (!cluster) return;
      const plugins = cluster.plugins.includes(plugin)
        ? cluster.plugins.filter((p) => p !== plugin)
        : [...cluster.plugins, plugin];
      const updated = await apiUpdatePlugins(id, plugins);
      dispatch({ type: "UPDATE_INSTALLED", cluster: updated });
    },
    [state.installed],
  );

  return (
    <ClusterContext.Provider
      value={{ ...state, install, uninstall, togglePlugin, refresh }}
    >
      {children}
    </ClusterContext.Provider>
  );
}

export function useClusters(): ClusterContextValue {
  const ctx = useContext(ClusterContext);
  if (!ctx)
    throw new Error("useClusters must be used within a ClusterProvider");
  return ctx;
}
