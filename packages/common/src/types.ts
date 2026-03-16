export interface Cluster {
  id: string;
  name: string;
  status: string;
  version: string;
  plugins: string[];
  platform?: "openshift" | "kubernetes";
  server?: string;
  nodeCount?: number;
  created_at: string;
}

export interface AvailableCluster {
  id: string;
  name: string;
  version: string;
  installed: boolean;
}

export interface Pod {
  id: string;
  name: string;
  namespace_id?: string;
  namespace_name?: string;
  status: string;
  restarts: number;
  cpu_usage: number;
  memory_usage: number;
  cluster_id?: string;
  created_at?: string;
}

export interface Namespace {
  id: string;
  cluster_id: string;
  name: string;
  status: string;
  podCount?: number;
}

export interface Node {
  id: string;
  cluster_id: string;
  name: string;
  role: string;
  status: string;
  cpu_capacity: number;
  memory_capacity: number;
  cpu_used: number;
  memory_used: number;
  kubelet_version: string;
}

export interface Alert {
  id: string;
  cluster_id: string;
  name: string;
  severity: string;
  state: string;
  message: string;
  fired_at: string;
}

export interface Deployment {
  id: string;
  cluster_id: string;
  namespace_id: string;
  name: string;
  replicas: number;
  available: number;
  ready: number;
  strategy: string;
  image: string;
}

export interface ServicePort {
  port: number;
  targetPort: number;
  protocol: string;
}

export interface Service {
  id: string;
  cluster_id: string;
  namespace_id: string;
  name: string;
  type: string;
  cluster_ip: string;
  ports: ServicePort[];
}

export interface Ingress {
  id: string;
  cluster_id: string;
  namespace_id: string;
  name: string;
  host: string;
  path: string;
  service_name: string;
  tls: number;
}

export interface PersistentVolume {
  id: string;
  cluster_id: string;
  name: string;
  capacity: string;
  access_mode: string;
  status: string;
  storage_class: string;
}

export interface PersistentVolumeClaim {
  id: string;
  cluster_id: string;
  namespace_id: string;
  name: string;
  status: string;
  capacity: string;
  storage_class: string;
  pv_name: string;
}

export interface Pipeline {
  id: string;
  cluster_id: string;
  name: string;
  status: string;
  started_at: string;
  duration_seconds: number;
  stages: string[];
}

export interface ConfigMap {
  id: string;
  cluster_id: string;
  namespace_id: string;
  name: string;
  data_keys: string[];
}

export interface Secret {
  id: string;
  cluster_id: string;
  namespace_id: string;
  name: string;
  type: string;
  data_keys: string[];
}

export interface GitOpsApp {
  id: string;
  cluster_id: string;
  name: string;
  repo: string;
  path: string;
  sync_status: string;
  health_status: string;
  last_synced: string;
}

export interface Event {
  id: string;
  cluster_id: string;
  namespace_id: string;
  type: string;
  reason: string;
  message: string;
  source: string;
  created_at: string;
}

export interface Route {
  id: string;
  cluster_id: string;
  namespace_id: string;
  name: string;
  host: string;
  path: string;
  service_name: string;
  tls: number;
  status: string;
}

export interface User {
  id: string;
  username: string;
  display_name: string;
  role: string;
}

export interface PluginEntry {
  name: string;
  key: string;
  label: string;
  persona: "ops" | "dev";
}

export interface PluginRegistry {
  assetsHost: string;
  plugins: Record<string, PluginEntry>;
}
