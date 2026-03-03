import { useScalprum } from "@scalprum/react-core";

interface FleetShiftApi {
  fleetshift: { apiBase: string };
}

export function useApiBase(): string {
  const { api } = useScalprum<{ api: FleetShiftApi }>();
  return api.fleetshift.apiBase;
}

export async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}
