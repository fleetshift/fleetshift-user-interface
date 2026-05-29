const BASE = "/v1";

export interface NodepoolSpec {
  id: string;
  replicas: number;
  instanceType: string;
  rootVolumeSize: number;
  rootVolumeType: string;
  autoRepair: boolean;
  upgradeType: string;
}

export interface GcpHcpClusterSpec {
  endpointAccess: string;
  releaseVersion: string;
  channelGroup: string;
  nodepools: NodepoolSpec[];
}

export interface GcpHcpCluster {
  name: string;
  uid: string;
  spec: GcpHcpClusterSpec;
  state: string;
  reconciling: boolean;
  createTime: string;
  updateTime: string;
  etag: string;
}

export async function listGcpHcpClusters(): Promise<GcpHcpCluster[]> {
  const res = await fetch(`${BASE}/gCPHCPClusters`);
  if (!res.ok) {
    throw new Error(`List GCP HCP clusters failed (${res.status})`);
  }
  const data = await res.json();
  return data.gCPHCPClusters ?? [];
}

export async function getGcpHcpCluster(id: string): Promise<GcpHcpCluster> {
  const res = await fetch(
    `${BASE}/gCPHCPClusters/${encodeURIComponent(id)}`,
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      body.message || body.error || `Get GCP HCP cluster failed (${res.status})`,
    );
  }
  return res.json();
}

export async function createGcpHcpCluster(
  clusterId: string,
  spec: GcpHcpClusterSpec,
): Promise<GcpHcpCluster> {
  const res = await fetch(
    `${BASE}/gCPHCPClusters?gCPHCPCluster_id=${encodeURIComponent(clusterId)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spec }),
    },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      body.message || body.error || `GCP HCP create failed (${res.status})`,
    );
  }
  return res.json();
}

export async function deleteGcpHcpCluster(id: string): Promise<void> {
  const res = await fetch(
    `${BASE}/gCPHCPClusters/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      body.message || body.error || `Delete GCP HCP cluster failed (${res.status})`,
    );
  }
}
