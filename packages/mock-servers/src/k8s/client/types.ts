import * as k8s from "@kubernetes/client-node";

export interface LiveCluster {
  id: string;
  name: string;
  version: string;
  context: string;
  plugins: string[];
  platform: "openshift" | "kubernetes";
  server: string;
  nodeCount: number;
}

export interface ClusterConfig {
  id: string;
  name: string;
  type: "kubeconfig" | "token";
  /** For type: kubeconfig — the kubeconfig context name */
  context?: string;
  /** For type: token — the K8s API server URL */
  server?: string;
  /** For type: token — env var name holding the bearer token */
  tokenEnv?: string;
  /** For type: token — raw token value (alternative to tokenEnv) */
  tokenValue?: string;
  /** Skip TLS verification */
  skipTLSVerify?: boolean;
}

/** Runtime state for a connected cluster */
export interface ClusterClient {
  config: ClusterConfig;
  kc: k8s.KubeConfig;
  core: k8s.CoreV1Api;
  apps: k8s.AppsV1Api;
  networking: k8s.NetworkingV1Api;
  metrics: k8s.Metrics | null;
  live: LiveCluster;
}
