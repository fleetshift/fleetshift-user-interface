import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import { useClusters } from "./ClusterContext";

type Scope = "all" | string;

interface ScopeContextValue {
  scope: Scope;
  setScope: (scope: Scope) => void;
  scopedClusterIds: string[];
  clusterIdsForPlugin: (pluginKey: string) => string[];
}

const ScopeContext = createContext<ScopeContextValue | null>(null);

export function ScopeProvider({ children }: { children: ReactNode }) {
  const { installed } = useClusters();
  const [scope, setScope] = useState<Scope>("all");

  // Reset to "all" if the selected cluster is uninstalled
  useEffect(() => {
    if (scope !== "all" && !installed.some((c) => c.id === scope)) {
      setScope("all");
    }
  }, [scope, installed]);

  const scopedClusterIds =
    scope === "all" ? installed.map((c) => c.id) : [scope];

  const clusterIdsForPlugin = useCallback(
    (pluginKey: string) => {
      return installed
        .filter(
          (c) => c.plugins.includes(pluginKey) && scopedClusterIds.includes(c.id),
        )
        .map((c) => c.id);
    },
    [installed, scopedClusterIds],
  );

  return (
    <ScopeContext.Provider
      value={{ scope, setScope, scopedClusterIds, clusterIdsForPlugin }}
    >
      {children}
    </ScopeContext.Provider>
  );
}

export function useScope(): ScopeContextValue {
  const ctx = useContext(ScopeContext);
  if (!ctx) throw new Error("useScope must be used within a ScopeProvider");
  return ctx;
}
