/* eslint-disable @typescript-eslint/ban-ts-comment */
import path from "path";
import {
  ModuleFederationPlugin as BaseMFPlugin,
  ContainerPlugin,
} from "@module-federation/enhanced";
import { DynamicRemotePlugin } from "@openshift/dynamic-plugin-sdk-webpack";
import { getDynamicModules, createTsLoaderRule } from "@fleetshift/build-utils";
import type { Configuration } from "webpack";
import { PluginRegistryPlugin } from "./src/PluginRegistryPlugin";

const monorepoRoot = path.resolve(__dirname, "../..");
const nodeModulesRoot = path.resolve(monorepoRoot, "node_modules");
const pfSharedModules = getDynamicModules(__dirname, monorepoRoot);
const tsLoaderRule = {
  ...createTsLoaderRule({ nodeModulesRoot }),
  exclude: [/node_modules/, /packages\/common\/dist/],
};

const sharedModules = {
  react: { singleton: true, requiredVersion: "*" },
  "@fleetshift/common": {
    requiredVersion: "*",
    version: "*",
  },
  "react-dom": { singleton: true, requiredVersion: "*" },
  "@scalprum/core": { singleton: true, requiredVersion: "*" },
  "@scalprum/react-core": { singleton: true, requiredVersion: "*" },
  "@openshift/dynamic-plugin-sdk": {
    singleton: true,
    requiredVersion: "*",
    version: "*",
  },
  "react-router-dom": { singleton: true, requiredVersion: "*" },
  ...pfSharedModules,
};

// Wrap MF plugin to disable federated type generation (dts-plugin crashes in Docker)
class ModuleFederationPlugin extends BaseMFPlugin {
  constructor(options: ConstructorParameters<typeof BaseMFPlugin>[0]) {
    super({ ...options, dts: false });
  }
}

// @ts-ignore — @module-federation/enhanced types differ from SDK expectations
const mfOverride = {
  libraryType: "global",
  pluginOverride: {
    ModuleFederationPlugin,
    ContainerPlugin,
  },
};

const p = (rel: string) => path.resolve(__dirname, rel);

const CorePlugin = new DynamicRemotePlugin({
  extensions: [
    {
      type: "fleetshift.dashboard-widget",
      properties: { component: { $codeRef: "ClusterOverview.default" } },
    },
    {
      type: "fleetshift.module",
      properties: {
        label: "Pods",
        component: { $codeRef: "PodList.default" },
      },
    },
    {
      type: "fleetshift.module",
      properties: {
        label: "Namespaces",
        component: { $codeRef: "NamespaceList.default" },
      },
    },
    {
      type: "fleetshift.deployment-detail-tab",
      properties: {
        label: "Pods",
        priority: 50,
        component: { $codeRef: "DeploymentPodsTab.default" },
      },
    },
  ],
  sharedModules,
  entryScriptFilename: "core-plugin.[contenthash].js",
  pluginManifestFilename: "core-plugin-manifest.json",
  // @ts-ignore
  moduleFederationSettings: mfOverride,
  pluginMetadata: {
    name: "core-plugin",
    version: "1.0.0",
    exposedModules: {
      Dashboard: p("./src/plugins/core-plugin/Dashboard.tsx"),
      ClusterListPage: p("./src/plugins/core-plugin/ClusterListPage.tsx"),
      ClusterDetailPage: p("./src/plugins/core-plugin/ClusterDetailPage.tsx"),
      ClusterOverview: p("./src/plugins/core-plugin/ClusterOverview.tsx"),
      DeploymentPodsTab: p("./src/plugins/core-plugin/DeploymentPodsTab.tsx"),
      PodList: p("./src/plugins/core-plugin/PodList.tsx"),
      PodDetailPage: p("./src/plugins/core-plugin/PodDetailPage.tsx"),
      NamespaceList: p("./src/plugins/core-plugin/NamespaceList.tsx"),
      usePodStore: p("./src/plugins/core-plugin/podStore.ts"),
      useNamespaceStore: p("./src/plugins/core-plugin/namespaceStore.ts"),
    },
  },
});

const NodesPlugin = new DynamicRemotePlugin({
  extensions: [
    {
      type: "fleetshift.module",
      properties: {
        label: "Nodes",
        component: { $codeRef: "NodeList.default" },
      },
    },
  ],
  sharedModules,
  entryScriptFilename: "nodes-plugin.[contenthash].js",
  pluginManifestFilename: "nodes-plugin-manifest.json",
  // @ts-ignore
  moduleFederationSettings: mfOverride,
  pluginMetadata: {
    name: "nodes-plugin",
    version: "1.0.0",
    exposedModules: {
      NodeList: p("./src/plugins/nodes-plugin/NodeList.tsx"),
      useNodeStore: p("./src/plugins/nodes-plugin/nodeStore.ts"),
    },
  },
});

const StoragePlugin = new DynamicRemotePlugin({
  extensions: [
    {
      type: "fleetshift.module",
      properties: {
        label: "Storage",
        component: { $codeRef: "StoragePage.default" },
      },
    },
  ],
  sharedModules,
  entryScriptFilename: "storage-plugin.[contenthash].js",
  pluginManifestFilename: "storage-plugin-manifest.json",
  // @ts-ignore
  moduleFederationSettings: mfOverride,
  pluginMetadata: {
    name: "storage-plugin",
    version: "1.0.0",
    exposedModules: {
      StoragePage: p("./src/plugins/storage-plugin/StoragePage.tsx"),
      usePVStore: p("./src/plugins/storage-plugin/pvStore.ts"),
      usePVCStore: p("./src/plugins/storage-plugin/pvcStore.ts"),
    },
  },
});

const EventsPlugin = new DynamicRemotePlugin({
  extensions: [
    {
      type: "fleetshift.module",
      properties: {
        label: "Events",
        component: { $codeRef: "EventList.default" },
      },
    },
    {
      type: "fleetshift.deployment-detail-tab",
      properties: {
        label: "Events",
        priority: 100,
        component: { $codeRef: "DeploymentEventsTab.default" },
      },
    },
  ],
  sharedModules,
  entryScriptFilename: "events-plugin.[contenthash].js",
  pluginManifestFilename: "events-plugin-manifest.json",
  // @ts-ignore
  moduleFederationSettings: mfOverride,
  pluginMetadata: {
    name: "events-plugin",
    version: "1.0.0",
    exposedModules: {
      EventList: p("./src/plugins/events-plugin/EventList.tsx"),
      DeploymentEventsTab: p(
        "./src/plugins/events-plugin/DeploymentEventsTab.tsx",
      ),
      useEventStore: p("./src/plugins/events-plugin/eventStore.ts"),
    },
  },
});

const AlertsPlugin = new DynamicRemotePlugin({
  extensions: [
    {
      type: "fleetshift.module",
      properties: {
        label: "Alerts",
        component: { $codeRef: "AlertList.default" },
      },
    },
  ],
  sharedModules,
  entryScriptFilename: "alerts-plugin.[contenthash].js",
  pluginManifestFilename: "alerts-plugin-manifest.json",
  // @ts-ignore
  moduleFederationSettings: mfOverride,
  pluginMetadata: {
    name: "alerts-plugin",
    version: "1.0.0",
    exposedModules: {
      AlertList: p("./src/plugins/alerts-plugin/AlertList.tsx"),
      useAlertStore: p("./src/plugins/alerts-plugin/alertStore.ts"),
    },
  },
});

const ObservabilityPlugin = new DynamicRemotePlugin({
  extensions: [
    {
      type: "fleetshift.module",
      properties: {
        label: "Observability",
        component: { $codeRef: "MetricsDashboard.default" },
      },
    },
  ],
  sharedModules,
  entryScriptFilename: "observability-plugin.[contenthash].js",
  pluginManifestFilename: "observability-plugin-manifest.json",
  // @ts-ignore
  moduleFederationSettings: mfOverride,
  pluginMetadata: {
    name: "observability-plugin",
    version: "1.0.0",
    exposedModules: {
      MetricsDashboard: p(
        "./src/plugins/observability-plugin/MetricsDashboard.tsx",
      ),
    },
  },
});

const NetworkingPlugin = new DynamicRemotePlugin({
  extensions: [
    {
      type: "fleetshift.module",
      properties: {
        label: "Networking",
        component: { $codeRef: "NetworkingPage.default" },
      },
    },
  ],
  sharedModules,
  entryScriptFilename: "networking-plugin.[contenthash].js",
  pluginManifestFilename: "networking-plugin-manifest.json",
  // @ts-ignore
  moduleFederationSettings: mfOverride,
  pluginMetadata: {
    name: "networking-plugin",
    version: "1.0.0",
    exposedModules: {
      NetworkingPage: p("./src/plugins/networking-plugin/NetworkingPage.tsx"),
      useServiceStore: p("./src/plugins/networking-plugin/serviceStore.ts"),
      useIngressStore: p("./src/plugins/networking-plugin/ingressStore.ts"),
    },
  },
});

const DeploymentsPlugin = new DynamicRemotePlugin({
  extensions: [
    {
      type: "fleetshift.module",
      properties: {
        label: "Deployments",
        component: { $codeRef: "DeploymentList.default" },
      },
    },
  ],
  sharedModules,
  entryScriptFilename: "deployments-plugin.[contenthash].js",
  pluginManifestFilename: "deployments-plugin-manifest.json",
  // @ts-ignore
  moduleFederationSettings: mfOverride,
  pluginMetadata: {
    name: "deployments-plugin",
    version: "1.0.0",
    exposedModules: {
      DeploymentList: p("./src/plugins/deployments-plugin/DeploymentList.tsx"),
      DeploymentDetailPage: p(
        "./src/plugins/deployments-plugin/DeploymentDetailPage.tsx",
      ),
      useDeploymentStore: p(
        "./src/plugins/deployments-plugin/deploymentStore.ts",
      ),
    },
  },
});

const LogsPlugin = new DynamicRemotePlugin({
  extensions: [
    {
      type: "fleetshift.module",
      properties: {
        label: "Logs",
        component: { $codeRef: "LogViewer.default" },
      },
    },
    {
      type: "fleetshift.deployment-detail-tab",
      properties: {
        label: "Logs",
        priority: 200,
        component: { $codeRef: "DeploymentLogsTab.default" },
      },
    },
  ],
  sharedModules,
  entryScriptFilename: "logs-plugin.[contenthash].js",
  pluginManifestFilename: "logs-plugin-manifest.json",
  // @ts-ignore
  moduleFederationSettings: mfOverride,
  pluginMetadata: {
    name: "logs-plugin",
    version: "1.0.0",
    exposedModules: {
      LogViewer: p("./src/plugins/logs-plugin/LogViewer.tsx"),
      DeploymentLogsTab: p("./src/plugins/logs-plugin/DeploymentLogsTab.tsx"),
      useLogStore: p("./src/plugins/logs-plugin/logStore.ts"),
    },
  },
});

const PipelinesPlugin = new DynamicRemotePlugin({
  extensions: [
    {
      type: "fleetshift.module",
      properties: {
        label: "Pipelines",
        component: { $codeRef: "PipelineList.default" },
      },
    },
  ],
  sharedModules,
  entryScriptFilename: "pipelines-plugin.[contenthash].js",
  pluginManifestFilename: "pipelines-plugin-manifest.json",
  // @ts-ignore
  moduleFederationSettings: mfOverride,
  pluginMetadata: {
    name: "pipelines-plugin",
    version: "1.0.0",
    exposedModules: {
      PipelineList: p("./src/plugins/pipelines-plugin/PipelineList.tsx"),
    },
  },
});

const ConfigPlugin = new DynamicRemotePlugin({
  extensions: [
    {
      type: "fleetshift.module",
      properties: {
        label: "Config",
        component: { $codeRef: "ConfigPage.default" },
      },
    },
  ],
  sharedModules,
  entryScriptFilename: "config-plugin.[contenthash].js",
  pluginManifestFilename: "config-plugin-manifest.json",
  // @ts-ignore
  moduleFederationSettings: mfOverride,
  pluginMetadata: {
    name: "config-plugin",
    version: "1.0.0",
    exposedModules: {
      ConfigPage: p("./src/plugins/config-plugin/ConfigPage.tsx"),
    },
  },
});

const GitOpsPlugin = new DynamicRemotePlugin({
  extensions: [
    {
      type: "fleetshift.module",
      properties: {
        label: "GitOps",
        component: { $codeRef: "GitOpsList.default" },
      },
    },
  ],
  sharedModules,
  entryScriptFilename: "gitops-plugin.[contenthash].js",
  pluginManifestFilename: "gitops-plugin-manifest.json",
  // @ts-ignore
  moduleFederationSettings: mfOverride,
  pluginMetadata: {
    name: "gitops-plugin",
    version: "1.0.0",
    exposedModules: {
      GitOpsList: p("./src/plugins/gitops-plugin/GitOpsList.tsx"),
    },
  },
});

const RoutesPlugin = new DynamicRemotePlugin({
  extensions: [
    {
      type: "fleetshift.module",
      properties: {
        label: "Routes",
        component: { $codeRef: "RouteList.default" },
      },
    },
  ],
  sharedModules,
  entryScriptFilename: "routes-plugin-ext.[contenthash].js",
  pluginManifestFilename: "routes-plugin-ext-manifest.json",
  // @ts-ignore
  moduleFederationSettings: mfOverride,
  pluginMetadata: {
    name: "routes-plugin-ext",
    version: "1.0.0",
    exposedModules: {
      RouteList: p("./src/plugins/routes-plugin/RouteList.tsx"),
    },
  },
});

const UpgradesPlugin = new DynamicRemotePlugin({
  extensions: [
    {
      type: "fleetshift.module",
      properties: {
        label: "Upgrades",
        component: { $codeRef: "UpgradesPage.default" },
      },
    },
  ],
  sharedModules,
  entryScriptFilename: "upgrades-plugin.[contenthash].js",
  pluginManifestFilename: "upgrades-plugin-manifest.json",
  // @ts-ignore
  moduleFederationSettings: mfOverride,
  pluginMetadata: {
    name: "upgrades-plugin",
    version: "1.0.0",
    exposedModules: {
      UpgradesPage: p("./src/plugins/upgrades-plugin/UpgradesPage.tsx"),
    },
  },
});

const ClowderPlugin = new DynamicRemotePlugin({
  extensions: [
    {
      type: "fleetshift.module",
      properties: {
        label: "Clowder",
        component: { $codeRef: "ClowderPage.default" },
      },
    },
    {
      type: "fleetshift.deployment-detail-tab",
      properties: {
        label: "Clowder",
        priority: 300,
        component: { $codeRef: "ClowderDeploymentTab.default" },
        isApplicable: { $codeRef: "ClowderApplicable.isApplicable" },
      },
    },
  ],
  sharedModules,
  entryScriptFilename: "clowder-plugin.[contenthash].js",
  pluginManifestFilename: "clowder-plugin-manifest.json",
  // @ts-ignore
  moduleFederationSettings: mfOverride,
  pluginMetadata: {
    name: "clowder-plugin",
    version: "1.0.0",
    exposedModules: {
      ClowderPage: p("./src/plugins/clowder-plugin/ClowderPage.tsx"),
      ClowderDeploymentTab: p(
        "./src/plugins/clowder-plugin/ClowderDeploymentTab.tsx",
      ),
      ClowderApplicable: p("./src/plugins/clowder-plugin/ClowderApplicable.ts"),
      useClowderStore: p("./src/plugins/clowder-plugin/clowderStore.ts"),
    },
  },
});

const ManagementPlugin = new DynamicRemotePlugin({
  extensions: [
    {
      type: "fleetshift.module",
      properties: {
        label: "Auth Methods",
        component: { $codeRef: "AuthMethodsPage.default" },
      },
    },
    {
      type: "fleetshift.module",
      properties: {
        label: "Targets",
        component: { $codeRef: "TargetsPage.default" },
      },
    },
    {
      type: "fleetshift.module",
      properties: {
        label: "Orchestration",
        component: { $codeRef: "DeploymentsPage.default" },
      },
    },
  ],
  sharedModules,
  entryScriptFilename: "management-plugin.[contenthash].js",
  pluginManifestFilename: "management-plugin-manifest.json",
  // @ts-ignore
  moduleFederationSettings: mfOverride,
  pluginMetadata: {
    name: "management-plugin",
    version: "1.0.0",
    exposedModules: {
      AuthMethodsPage: p("./src/plugins/management-plugin/AuthMethodsPage.tsx"),
      TargetsPage: p("./src/plugins/management-plugin/TargetsPage.tsx"),
      DeploymentsPage: p("./src/plugins/management-plugin/DeploymentsPage.tsx"),
      DeploymentDetailPage: p(
        "./src/plugins/management-plugin/DeploymentDetailPage.tsx",
      ),
      authState: p("./src/plugins/management-plugin/authState.ts"),
    },
  },
});

const RoutingPlugin = new DynamicRemotePlugin({
  extensions: [],
  sharedModules,
  entryScriptFilename: "routing-plugin.[contenthash].js",
  pluginManifestFilename: "routing-plugin-manifest.json",
  // @ts-ignore
  moduleFederationSettings: mfOverride,
  pluginMetadata: {
    name: "routing-plugin",
    version: "1.0.0",
    exposedModules: {
      PluginLink: p("./src/plugins/routing-plugin/PluginLink.tsx"),
      usePluginNavigate: p(
        "./src/plugins/routing-plugin/usePluginNavigate.tsx",
      ),
      usePluginLinks: p("./src/plugins/routing-plugin/usePluginLinks.tsx"),
    },
  },
});

const config: Configuration = {
  entry: {
    mock: path.resolve(__dirname, "./src/index.ts"),
  },
  output: {
    publicPath: "auto",
  },
  mode: "development",
  cache: {
    type: "filesystem",
  },
  plugins: [
    CorePlugin,
    NodesPlugin,
    StoragePlugin,
    EventsPlugin,
    AlertsPlugin,
    ObservabilityPlugin,
    NetworkingPlugin,
    DeploymentsPlugin,
    LogsPlugin,
    PipelinesPlugin,
    ConfigPlugin,
    GitOpsPlugin,
    RoutesPlugin,
    UpgradesPlugin,
    ClowderPlugin,
    ManagementPlugin,
    RoutingPlugin,
    new PluginRegistryPlugin({
      assetsHost: "http://localhost:8001",
      plugins: [
        { name: "core-plugin", key: "core", label: "Core", persona: "ops" },
        { name: "nodes-plugin", key: "nodes", label: "Nodes", persona: "ops" },
        {
          name: "storage-plugin",
          key: "storage",
          label: "Storage",
          persona: "ops",
        },
        {
          name: "events-plugin",
          key: "events",
          label: "Events",
          persona: "dev",
        },
        {
          name: "alerts-plugin",
          key: "alerts",
          label: "Alerts",
          persona: "ops",
        },
        {
          name: "observability-plugin",
          key: "observability",
          label: "Observability",
          persona: "ops",
        },
        {
          name: "networking-plugin",
          key: "networking",
          label: "Networking",
          persona: "ops",
        },
        {
          name: "deployments-plugin",
          key: "deployments",
          label: "Deployments",
          persona: "dev",
        },
        { name: "logs-plugin", key: "logs", label: "Logs", persona: "dev" },
        {
          name: "pipelines-plugin",
          key: "pipelines",
          label: "Pipelines",
          persona: "dev",
        },
        {
          name: "config-plugin",
          key: "config",
          label: "Config",
          persona: "dev",
        },
        {
          name: "gitops-plugin",
          key: "gitops",
          label: "GitOps",
          persona: "dev",
        },
        {
          name: "routes-plugin-ext",
          key: "routes",
          label: "Routes",
          persona: "dev",
        },

        {
          name: "upgrades-plugin",
          key: "upgrades",
          label: "Upgrades",
          persona: "ops",
        },
        {
          name: "clowder-plugin",
          key: "clowder",
          label: "Clowder",
          persona: "ops",
        },
        {
          name: "management-plugin",
          key: "management",
          label: "Management",
          persona: "ops",
        },
        {
          name: "routing-plugin",
          key: "routing",
          label: "Routing",
          persona: "ops",
        },
      ],
    }),
  ],
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx"],
  },
  module: {
    rules: [
      tsLoaderRule,
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
      {
        test: /\.scss$/,
        use: ["style-loader", "css-loader", "sass-loader"],
      },
    ],
  },
};

export default config;
