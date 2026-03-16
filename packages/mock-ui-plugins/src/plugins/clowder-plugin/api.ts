import { useScalprum } from "@scalprum/react-core";
import { useState, useEffect, useCallback, useRef } from "react";

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
    api.fleetshift.getClusterIdsForPlugin("clowder"),
  );

  useEffect(() => {
    const update = () =>
      setIds(api.fleetshift.getClusterIdsForPlugin("clowder"));
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

export function useFetch<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController>();

  const refetch = useCallback(() => {
    if (!url) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    fetch(url, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        return res.json();
      })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setError(err.message);
          setLoading(false);
        }
      });
  }, [url]);

  useEffect(() => {
    refetch();
    return () => abortRef.current?.abort();
  }, [refetch]);

  return { data, loading, error, refetch };
}

export function fetchJson<T>(url: string): Promise<T> {
  return fetch(url).then((r) =>
    r.ok ? r.json() : Promise.reject(r.statusText),
  );
}
