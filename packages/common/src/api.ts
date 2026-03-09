import type {
  Alert,
  AvailableCluster,
  Cluster,
  ConfigMap,
  Deployment,
  Event,
  GitOpsApp,
  Ingress,
  Namespace,
  Node,
  PersistentVolume,
  PersistentVolumeClaim,
  Pipeline,
  Pod,
  Route,
  Secret,
  Service,
} from "./types.js";

export async function makeRequest<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export function fetchClusters(apiBase: string): Promise<Cluster[]> {
  return makeRequest(`${apiBase}/clusters`);
}

export function fetchCluster(apiBase: string, id: string): Promise<Cluster> {
  return makeRequest(`${apiBase}/clusters/${id}`);
}

export function fetchAvailableClusters(
  apiBase: string,
): Promise<AvailableCluster[]> {
  return makeRequest(`${apiBase}/clusters/available`);
}

export function fetchPods(apiBase: string, clusterId: string): Promise<Pod[]> {
  return makeRequest(`${apiBase}/clusters/${clusterId}/pods`);
}

export function fetchNamespaces(
  apiBase: string,
  clusterId: string,
): Promise<Namespace[]> {
  return makeRequest(`${apiBase}/clusters/${clusterId}/namespaces`);
}

export function fetchNodes(
  apiBase: string,
  clusterId: string,
): Promise<Node[]> {
  return makeRequest(`${apiBase}/clusters/${clusterId}/nodes`);
}

export function fetchAlerts(
  apiBase: string,
  clusterId: string,
): Promise<Alert[]> {
  return makeRequest(`${apiBase}/clusters/${clusterId}/alerts`);
}

export function fetchDeployments(
  apiBase: string,
  clusterId: string,
): Promise<Deployment[]> {
  return makeRequest(`${apiBase}/clusters/${clusterId}/deployments`);
}

export function fetchServices(
  apiBase: string,
  clusterId: string,
): Promise<Service[]> {
  return makeRequest(`${apiBase}/clusters/${clusterId}/services`);
}

export function fetchIngresses(
  apiBase: string,
  clusterId: string,
): Promise<Ingress[]> {
  return makeRequest(`${apiBase}/clusters/${clusterId}/ingresses`);
}

export function fetchPersistentVolumes(
  apiBase: string,
  clusterId: string,
): Promise<PersistentVolume[]> {
  return makeRequest(`${apiBase}/clusters/${clusterId}/pvs`);
}

export function fetchPersistentVolumeClaims(
  apiBase: string,
  clusterId: string,
): Promise<PersistentVolumeClaim[]> {
  return makeRequest(`${apiBase}/clusters/${clusterId}/pvcs`);
}

export function fetchPipelines(
  apiBase: string,
  clusterId: string,
): Promise<Pipeline[]> {
  return makeRequest(`${apiBase}/clusters/${clusterId}/pipelines`);
}

export function fetchConfigMaps(
  apiBase: string,
  clusterId: string,
): Promise<ConfigMap[]> {
  return makeRequest(`${apiBase}/clusters/${clusterId}/configmaps`);
}

export function fetchSecrets(
  apiBase: string,
  clusterId: string,
): Promise<Secret[]> {
  return makeRequest(`${apiBase}/clusters/${clusterId}/secrets`);
}

export function fetchGitOpsApps(
  apiBase: string,
  clusterId: string,
): Promise<GitOpsApp[]> {
  return makeRequest(`${apiBase}/clusters/${clusterId}/gitops`);
}

export function fetchEvents(
  apiBase: string,
  clusterId: string,
): Promise<Event[]> {
  return makeRequest(`${apiBase}/clusters/${clusterId}/events`);
}

export function fetchRoutes(
  apiBase: string,
  clusterId: string,
): Promise<Route[]> {
  return makeRequest(`${apiBase}/clusters/${clusterId}/routes`);
}
