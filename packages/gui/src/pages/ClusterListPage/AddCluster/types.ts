export type ClusterType = "kubeconfig" | "token" | null;

export type StepKey =
  | "config"
  | "connect"
  | "clients"
  | "plugins"
  | "platform"
  | "nodes"
  | "register";

export type StepStatus = "pending" | "running" | "done" | "error";

export interface StepState {
  key: StepKey;
  label: string;
  status: StepStatus;
  detail?: string;
}

export const INITIAL_STEPS: StepState[] = [
  { key: "config", label: "Building configuration", status: "pending" },
  { key: "connect", label: "Connecting to cluster API", status: "pending" },
  { key: "clients", label: "Creating Kubernetes clients", status: "pending" },
  { key: "plugins", label: "Discovering plugins", status: "pending" },
  { key: "platform", label: "Detecting platform", status: "pending" },
  { key: "nodes", label: "Counting nodes", status: "pending" },
  { key: "register", label: "Registering cluster", status: "pending" },
];
