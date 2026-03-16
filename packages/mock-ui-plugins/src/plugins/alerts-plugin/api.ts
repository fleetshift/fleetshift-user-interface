import { useScalprum } from "@scalprum/react-core";
import { useState, useEffect } from "react";

interface FleetShiftApi {
  fleetshift: {
    apiBase: string;
    getClusterIdsForPlugin: (pluginKey: string) => string[];
    onClustersChange: (fn: () => void) => () => void;
    getScope: () => string;
    onScopeChange: (fn: () => void) => () => void;
  };
}

export function useApiBase(): string {
  const { api } = useScalprum<{ api: FleetShiftApi }>();
  return api.fleetshift.apiBase;
}

export function useClusterIds(): string[] {
  const { api } = useScalprum<{ api: FleetShiftApi }>();
  const [ids, setIds] = useState(() =>
    api.fleetshift.getClusterIdsForPlugin("alerts"),
  );

  useEffect(() => {
    const update = () =>
      setIds(api.fleetshift.getClusterIdsForPlugin("alerts"));
    const unsub1 = api.fleetshift.onClustersChange(update);
    const unsub2 = api.fleetshift.onScopeChange(update);
    update();
    return () => {
      unsub1();
      unsub2();
    };
  }, [api]);

  return ids;
}
