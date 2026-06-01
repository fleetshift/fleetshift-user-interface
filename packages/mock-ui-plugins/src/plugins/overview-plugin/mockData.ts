export interface MockCluster {
  id: string;
  name: string;
  provider: "on-prem" | "aws" | "gcp" | "azure";
  region: string;
  type: "core" | "edge";
  status: "healthy" | "degraded" | "critical";
  lat: number;
  lng: number;
}

export interface MockService {
  name: string;
  clusterId: string;
  requestsPerSec: number;
  errorRate: number;
  p99Latency: number;
  status: "healthy" | "degraded" | "critical";
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

export const clusters: MockCluster[] = [
  {
    id: "ocp-vsphere-dc1",
    name: "on-prem-vSphere-datacenter-1",
    provider: "on-prem",
    region: "US-East (Richmond)",
    type: "core",
    status: "healthy",
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
    lat: 35.7,
    lng: 139.7,
  },
];

export const services: MockService[] = [
  {
    name: "Fraud Analysis Pipeline",
    clusterId: "ocp-vsphere-dc1",
    requestsPerSec: 12400,
    errorRate: 0.02,
    p99Latency: 38,
    status: "healthy",
  },
  {
    name: "Transaction Gateway",
    clusterId: "ocp-aws-east1",
    requestsPerSec: 45200,
    errorRate: 0.01,
    p99Latency: 12,
    status: "healthy",
  },
  {
    name: "Edge UPF - Chicago",
    clusterId: "edge-chicago",
    requestsPerSec: 8300,
    errorRate: 0.15,
    p99Latency: 85,
    status: "degraded",
  },
  {
    name: "Edge UPF - Dallas",
    clusterId: "edge-dallas",
    requestsPerSec: 9100,
    errorRate: 0.01,
    p99Latency: 22,
    status: "healthy",
  },
  {
    name: "Roaming Gateway",
    clusterId: "ocp-gcp-eu1",
    requestsPerSec: 18700,
    errorRate: 0.03,
    p99Latency: 45,
    status: "healthy",
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

export const serviceTopology = {
  services: [
    {
      name: "Global Fraud Analysis Pipeline",
      status: "healthy" as const,
      clusters: [
        {
          id: "ocp-vsphere-dc1",
          role: "Secure Data (on-prem)",
          status: "healthy" as const,
        },
        {
          id: "ocp-aws-east1",
          role: "ML Compute (cloud)",
          status: "healthy" as const,
        },
      ],
    },
    {
      name: "5G Edge Network (UPF)",
      status: "degraded" as const,
      clusters: [
        {
          id: "ocp-gcp-eu1",
          role: "Central Control Plane",
          status: "healthy" as const,
        },
        { id: "edge-chicago", role: "Edge Site", status: "degraded" as const },
        { id: "edge-dallas", role: "Edge Site", status: "healthy" as const },
        { id: "edge-london", role: "Edge Site", status: "healthy" as const },
        { id: "edge-tokyo", role: "Edge Site", status: "healthy" as const },
      ],
    },
  ],
};
