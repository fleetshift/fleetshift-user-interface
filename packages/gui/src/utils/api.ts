const API_BASE = "http://localhost:4000/api/v1";

export interface AvailableCluster {
  id: string;
  name: string;
  version: string;
  installed: boolean;
}

export interface InstalledCluster {
  id: string;
  name: string;
  status: string;
  version: string;
  plugins: string[];
  created_at: string;
}

export async function fetchAvailableClusters(): Promise<AvailableCluster[]> {
  const res = await fetch(`${API_BASE}/clusters/available`);
  return res.json();
}

export async function fetchInstalledClusters(): Promise<InstalledCluster[]> {
  const res = await fetch(`${API_BASE}/clusters`);
  return res.json();
}

export async function fetchCluster(id: string): Promise<InstalledCluster> {
  const res = await fetch(`${API_BASE}/clusters/${id}`);
  return res.json();
}

export async function installCluster(id: string): Promise<InstalledCluster> {
  const res = await fetch(`${API_BASE}/clusters/${id}/install`, {
    method: "POST",
  });
  return res.json();
}

export async function uninstallCluster(id: string): Promise<void> {
  await fetch(`${API_BASE}/clusters/${id}`, { method: "DELETE" });
}

export async function updateClusterPlugins(
  id: string,
  plugins: string[],
): Promise<InstalledCluster> {
  const res = await fetch(`${API_BASE}/clusters/${id}/plugins`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plugins }),
  });
  return res.json();
}
