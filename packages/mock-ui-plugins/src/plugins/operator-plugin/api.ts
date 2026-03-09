import { useScalprum } from "@scalprum/react-core";

interface FleetShiftApi {
  fleetshift: {
    apiBase: string;
    getClusterIdsForPlugin: (pluginKey: string) => string[];
  };
}

export function useApiBase(): string {
  const { api } = useScalprum<{ api: FleetShiftApi }>();
  return api.fleetshift.apiBase;
}
