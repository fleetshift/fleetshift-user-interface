import { type Cluster, fetchClusters } from "@fleetshift/common";

export type { Cluster };

export async function resolveCluster(
  apiBase: string,
  query: string,
): Promise<Cluster> {
  const clusters = await fetchClusters(apiBase);
  const lower = query.toLowerCase();
  const match =
    clusters.find((c) => c.id === query) ??
    clusters.find((c) => c.name.toLowerCase().startsWith(lower)) ??
    clusters.find((c) => c.name.toLowerCase().includes(lower));
  if (!match) {
    throw new Error(
      `No cluster matching "${query}". Run 'clusters' to see available.`,
    );
  }
  return match;
}
