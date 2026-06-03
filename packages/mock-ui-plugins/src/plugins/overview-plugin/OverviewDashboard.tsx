import ServiceTopology from "./widgets/ServiceTopology";
import "./overview-dashboard.scss";
import MttrTrend from "./widgets/MttrTrend";
import ActiveIncidents from "./widgets/ActiveIncidents";
import ClusterFleetHealth from "./widgets/ClusterFleetHealth";
import GlobalMap from "./widgets/GlobalMap";
import ComplianceStatus from "./widgets/ComplianceStatus";
import TopServices from "./widgets/TopServices";
import {
  WidgetLayout,
  WidgetMapping,
  type ExtendedTemplateConfig,
} from "@patternfly/widgetized-dashboard";
import "@patternfly/widgetized-dashboard/dist/esm/styles.css";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import SloErrorBudgets from "./widgets/SloErrorBudgets";
import "./overview-dashboard.scss";
import {
  ChartLineIcon,
  CogIcon,
  CubesIcon,
  GlobeIcon,
  ListIcon,
  SecurityIcon,
  ShieldAltIcon,
  TachometerAltIcon,
} from "@patternfly/react-icons";

const LAYOUT_VERSION = 6;
const STORAGE_KEY = "fleetshift:dashboard-layout";
const VERSION_KEY = "fleetshift:dashboard-layout-version";

function loadTemplate(): ExtendedTemplateConfig | null {
  try {
    const ver = localStorage.getItem(VERSION_KEY);
    if (Number(ver) !== LAYOUT_VERSION) return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveTemplate(template: ExtendedTemplateConfig) {
  localStorage.setItem(VERSION_KEY, String(LAYOUT_VERSION));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(template));
}

const widgetMapping: WidgetMapping = {
  "slo-error-budgets": {
    defaults: { w: 2, h: 3, maxH: 5, minH: 2 },
    config: { title: "SLO Error Budgets", icon: <TachometerAltIcon /> },
    renderWidget: (id) => <SloErrorBudgets widgetId={id} />,
  },
  "service-topology": {
    defaults: { w: 2, h: 4, maxH: 8, minH: 3 },
    config: { title: "Service Topology", icon: <CubesIcon /> },
    renderWidget: (id) => <ServiceTopology widgetId={id} />,
  },
  "mttr-trend": {
    defaults: { w: 2, h: 3, maxH: 5, minH: 2 },
    config: { title: "Mean Time to Resolution", icon: <ChartLineIcon /> },
    renderWidget: (id) => <MttrTrend widgetId={id} />,
  },
  "active-incidents": {
    defaults: { w: 2, h: 3, maxH: 6, minH: 2 },
    config: { title: "Active Incidents", icon: <ShieldAltIcon /> },
    renderWidget: (id) => <ActiveIncidents widgetId={id} />,
  },
  "cluster-fleet-health": {
    defaults: { w: 1, h: 2, maxH: 4, minH: 2 },
    config: { title: "Cluster Fleet Health", icon: <CogIcon /> },
    renderWidget: (id) => <ClusterFleetHealth widgetId={id} />,
  },
  "global-map": {
    defaults: { w: 2, h: 3, maxH: 6, minH: 2 },
    config: { title: "Global Cluster Map", icon: <GlobeIcon /> },
    renderWidget: (id) => <GlobalMap widgetId={id} />,
  },
  "compliance-status": {
    defaults: { w: 1, h: 2, maxH: 4, minH: 2 },
    config: { title: "Compliance Status", icon: <SecurityIcon /> },
    renderWidget: (id) => <ComplianceStatus widgetId={id} />,
  },
  "top-services": {
    defaults: { w: 2, h: 3, maxH: 5, minH: 2 },
    config: { title: "Top Services", icon: <ListIcon /> },
    renderWidget: (id) => <TopServices widgetId={id} />,
  },
};

// Grid columns: xl=4, lg=3, md=2, sm=1
// rowHeight = 56px
const defaultTemplate: ExtendedTemplateConfig = {
  xl: [
    {
      i: "slo-error-budgets#1",
      x: 0,
      y: 0,
      w: 2,
      h: 6,
      widgetType: "slo-error-budgets",
      title: "SLO Error Budgets",
    },
    {
      i: "cluster-fleet-health#1",
      x: 2,
      y: 0,
      w: 1,
      h: 6,
      widgetType: "cluster-fleet-health",
      title: "Cluster Fleet Health",
    },
    {
      i: "compliance-status#1",
      x: 3,
      y: 0,
      w: 1,
      h: 6,
      widgetType: "compliance-status",
      title: "Compliance Status",
    },
    {
      i: "global-map#1",
      x: 0,
      y: 3,
      w: 4,
      h: 6,
      widgetType: "global-map",
      title: "Global Cluster Map",
    },
    {
      i: "active-incidents#1",
      x: 0,
      y: 9,
      w: 2,
      h: 4,
      widgetType: "active-incidents",
      title: "Active Incidents",
    },
    {
      i: "mttr-trend#1",
      x: 2,
      y: 9,
      w: 2,
      h: 4,
      widgetType: "mttr-trend",
      title: "Mean Time to Resolution",
    },
    {
      i: "service-topology#1",
      x: 0,
      y: 13,
      w: 2,
      h: 5,
      widgetType: "service-topology",
      title: "Service Topology",
    },
    {
      i: "top-services#1",
      x: 2,
      y: 13,
      w: 2,
      h: 5,
      widgetType: "top-services",
      title: "Top Services",
    },
  ],
  lg: [
    {
      i: "slo-error-budgets#1",
      x: 0,
      y: 0,
      w: 2,
      h: 6,
      widgetType: "slo-error-budgets",
      title: "SLO Error Budgets",
    },
    {
      i: "cluster-fleet-health#1",
      x: 2,
      y: 0,
      w: 1,
      h: 6,
      widgetType: "cluster-fleet-health",
      title: "Cluster Fleet Health",
    },
    {
      i: "global-map#1",
      x: 0,
      y: 6,
      w: 3,
      h: 6,
      widgetType: "global-map",
      title: "Global Cluster Map",
    },
    {
      i: "compliance-status#1",
      x: 0,
      y: 12,
      w: 1,
      h: 4,
      widgetType: "compliance-status",
      title: "Compliance Status",
    },
    {
      i: "active-incidents#1",
      x: 1,
      y: 12,
      w: 2,
      h: 4,
      widgetType: "active-incidents",
      title: "Active Incidents",
    },
    {
      i: "mttr-trend#1",
      x: 0,
      y: 16,
      w: 2,
      h: 6,
      widgetType: "mttr-trend",
      title: "Mean Time to Resolution",
    },
    {
      i: "service-topology#1",
      x: 2,
      y: 16,
      w: 1,
      h: 6,
      widgetType: "service-topology",
      title: "Service Topology",
    },
    {
      i: "top-services#1",
      x: 0,
      y: 22,
      w: 3,
      h: 5,
      widgetType: "top-services",
      title: "Top Services",
    },
  ],
  md: [
    {
      i: "slo-error-budgets#1",
      x: 0,
      y: 0,
      w: 2,
      h: 6,
      widgetType: "slo-error-budgets",
      title: "SLO Error Budgets",
    },
    {
      i: "cluster-fleet-health#1",
      x: 0,
      y: 6,
      w: 1,
      h: 4,
      widgetType: "cluster-fleet-health",
      title: "Cluster Fleet Health",
    },
    {
      i: "compliance-status#1",
      x: 1,
      y: 6,
      w: 1,
      h: 4,
      widgetType: "compliance-status",
      title: "Compliance Status",
    },
    {
      i: "global-map#1",
      x: 0,
      y: 10,
      w: 2,
      h: 6,
      widgetType: "global-map",
      title: "Global Cluster Map",
    },
    {
      i: "active-incidents#1",
      x: 0,
      y: 16,
      w: 2,
      h: 4,
      widgetType: "active-incidents",
      title: "Active Incidents",
    },
    {
      i: "mttr-trend#1",
      x: 0,
      y: 20,
      w: 1,
      h: 5,
      widgetType: "mttr-trend",
      title: "Mean Time to Resolution",
    },
    {
      i: "service-topology#1",
      x: 1,
      y: 20,
      w: 1,
      h: 5,
      widgetType: "service-topology",
      title: "Service Topology",
    },
    {
      i: "top-services#1",
      x: 0,
      y: 25,
      w: 2,
      h: 5,
      widgetType: "top-services",
      title: "Top Services",
    },
  ],
  sm: [
    {
      i: "slo-error-budgets#1",
      x: 0,
      y: 0,
      w: 1,
      h: 5,
      widgetType: "slo-error-budgets",
      title: "SLO Error Budgets",
    },
    {
      i: "cluster-fleet-health#1",
      x: 0,
      y: 5,
      w: 1,
      h: 4,
      widgetType: "cluster-fleet-health",
      title: "Cluster Fleet Health",
    },
    {
      i: "compliance-status#1",
      x: 0,
      y: 9,
      w: 1,
      h: 3,
      widgetType: "compliance-status",
      title: "Compliance Status",
    },
    {
      i: "global-map#1",
      x: 0,
      y: 12,
      w: 1,
      h: 6,
      widgetType: "global-map",
      title: "Global Cluster Map",
    },
    {
      i: "active-incidents#1",
      x: 0,
      y: 18,
      w: 1,
      h: 4,
      widgetType: "active-incidents",
      title: "Active Incidents",
    },
    {
      i: "mttr-trend#1",
      x: 0,
      y: 22,
      w: 1,
      h: 4,
      widgetType: "mttr-trend",
      title: "Mean Time to Resolution",
    },
    {
      i: "service-topology#1",
      x: 0,
      y: 26,
      w: 1,
      h: 5,
      widgetType: "service-topology",
      title: "Service Topology",
    },
    {
      i: "top-services#1",
      x: 0,
      y: 31,
      w: 1,
      h: 5,
      widgetType: "top-services",
      title: "Top Services",
    },
  ],
};

export default function OverviewDashboard() {
  // const saved = loadTemplate();

  return (
    <WidgetLayout
      widgetMapping={widgetMapping}
      // initialTemplate={saved ?? defaultTemplate}
      initialTemplate={defaultTemplate}
      onTemplateChange={saveTemplate}
      showDrawer={false}
      isLayoutLocked={false}
    />
  );
}
