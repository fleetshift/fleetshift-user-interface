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

export async function createGcpHcpCluster(
  clusterId: string,
  spec: GcpHcpClusterSpec,
): Promise<GcpHcpCluster> {
  const res = await fetch(
    `${BASE}/gcphCPClusters?gcphCPCluster_id=${encodeURIComponent(clusterId)}`,
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
