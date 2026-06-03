export interface MockCluster {
  id: string;
  name: string;
  provider: "on-prem" | "aws" | "gcp" | "azure";
  region: string;
  type: "core" | "edge";
  status: "healthy" | "degraded" | "critical";
  version: string;
  environment: "Production" | "Development" | "Edge" | "Infrastructure";
  lat: number;
  lng: number;
}

export interface MockSlo {
  service: string;
  metric: string;
  target: string;
  budgetRemaining: number;
  budgetTotal: number;
  trend: "stable" | "burning" | "recovering";
}

export interface MockIncident {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  blastRadius: string;
  customerImpact: string;
  duration: string;
  affectedClusters: string[];
}

export interface MockMttrPoint {
  month: string;
  minutes: number;
}

export interface MockCompliance {
  framework: string;
  status: "compliant" | "warning" | "non-compliant";
  lastAudit: string;
}

export interface MockAttentionCluster {
  clusterId: string;
  clusterName: string;
  reason: string;
  severity: "warning" | "danger";
}

export const clusters: MockCluster[] = [
  {
    id: "ocp-vsphere-dc1",
    name: "on-prem-vSphere-datacenter-1",
    provider: "on-prem",
    region: "US-East (Richmond)",
    type: "core",
    status: "healthy",
    version: "4.17.12",
    environment: "Production",
    lat: 37.5,
    lng: -77.4,
  },
  {
    id: "ocp-aws-east1",
    name: "aws-us-east-1",
    provider: "aws",
    region: "US-East (Virginia)",
    type: "core",
    status: "healthy",
    version: "4.20.5",
    environment: "Production",
    lat: 39.0,
    lng: -77.5,
  },
  {
    id: "ocp-aws-west2",
    name: "aws-us-west-2",
    provider: "aws",
    region: "US-West (Oregon)",
    type: "core",
    status: "healthy",
    version: "4.20.5",
    environment: "Development",
    lat: 45.5,
    lng: -122.7,
  },
  {
    id: "ocp-gcp-eu1",
    name: "gcp-eu-central-1",
    provider: "gcp",
    region: "EU-Central (Frankfurt)",
    type: "core",
    status: "healthy",
    version: "4.17.12",
    environment: "Infrastructure",
    lat: 50.1,
    lng: 8.7,
  },
  {
    id: "edge-chicago",
    name: "edge-site-chicago",
    provider: "aws",
    region: "US-Central (Chicago)",
    type: "edge",
    status: "degraded",
    version: "4.14.38",
    environment: "Edge",
    lat: 41.9,
    lng: -87.6,
  },
  {
    id: "edge-dallas",
    name: "edge-site-dallas",
    provider: "aws",
    region: "US-South (Dallas)",
    type: "edge",
    status: "healthy",
    version: "4.20.5",
    environment: "Edge",
    lat: 32.8,
    lng: -96.8,
  },
  {
    id: "edge-london",
    name: "edge-site-london",
    provider: "aws",
    region: "EU-West (London)",
    type: "edge",
    status: "healthy",
    version: "4.17.12",
    environment: "Edge",
    lat: 51.5,
    lng: -0.1,
  },
  {
    id: "edge-tokyo",
    name: "edge-site-tokyo",
    provider: "gcp",
    region: "APAC (Tokyo)",
    type: "edge",
    status: "healthy",
    version: "4.20.5",
    environment: "Edge",
    lat: 35.7,
    lng: 139.7,
  },
];

export const slos: MockSlo[] = [
  {
    service: "Global Fraud Analysis Pipeline",
    metric: "Transaction Approval Latency",
    target: "< 50ms p99",
    budgetRemaining: 85,
    budgetTotal: 100,
    trend: "stable",
  },
  {
    service: "Edge Network (UPF)",
    metric: "Packet Processing Latency",
    target: "< 10ms p99",
    budgetRemaining: 97,
    budgetTotal: 100,
    trend: "stable",
  },
];

export const incidents: MockIncident[] = [
  {
    id: "INC-4821",
    severity: "warning",
    title: "Elevated latency on Edge-Site-Chicago",
    blastRadius: "Isolated to Chicago metro area",
    customerImpact: "~2,100 edge subscribers experiencing degraded throughput",
    duration: "14m",
    affectedClusters: ["edge-chicago"],
  },
  {
    id: "INC-4819",
    severity: "info",
    title: "Scheduled certificate rotation — aws-us-west-2",
    blastRadius: "Single cluster, zero downtime",
    customerImpact: "0 users affected",
    duration: "Scheduled",
    affectedClusters: ["ocp-aws-west2"],
  },
];

export const mttrHistory: MockMttrPoint[] = [
  { month: "Jan", minutes: 240 },
  { month: "Feb", minutes: 195 },
  { month: "Mar", minutes: 142 },
  { month: "Apr", minutes: 98 },
  { month: "May", minutes: 62 },
  { month: "Jun", minutes: 45 },
];

export const complianceStatuses: MockCompliance[] = [
  { framework: "SOC 2 Type II", status: "compliant", lastAudit: "2026-04-15" },
  { framework: "PCI-DSS v4.0", status: "compliant", lastAudit: "2026-03-22" },
  {
    framework: "HIPAA",
    status: "compliant",
    lastAudit: "2026-05-01",
  },
];

export interface MockCapacityGroup {
  environment: string;
  cpuPercent: number;
  memoryPercent: number;
}

export const capacityByGroup: MockCapacityGroup[] = [
  { environment: "Production", cpuPercent: 78, memoryPercent: 72 },
  { environment: "Development", cpuPercent: 41, memoryPercent: 38 },
  { environment: "Edge", cpuPercent: 63, memoryPercent: 55 },
  { environment: "Infrastructure", cpuPercent: 52, memoryPercent: 67 },
];

export const attentionClusters: MockAttentionCluster[] = [
  {
    clusterId: "edge-chicago",
    clusterName: "edge-site-chicago",
    reason: "Degraded — node NotReady",
    severity: "danger",
  },
  {
    clusterId: "ocp-vsphere-dc1",
    clusterName: "on-prem-vSphere-datacenter-1",
    reason: "2 versions behind (4.17 → 4.20)",
    severity: "warning",
  },
  {
    clusterId: "ocp-gcp-eu1",
    clusterName: "gcp-eu-central-1",
    reason: "Policy drift: 3 violations",
    severity: "warning",
  },
  {
    clusterId: "edge-london",
    clusterName: "edge-site-london",
    reason: "Certificate expires in 12 days",
    severity: "warning",
  },
];
