/* eslint-disable @typescript-eslint/ban-ts-comment */
import path from "path";
import {
  ModuleFederationPlugin,
  ContainerPlugin,
} from "@module-federation/enhanced";
import { DynamicRemotePlugin } from "@openshift/dynamic-plugin-sdk-webpack";
import { getDynamicModules, createTsLoaderRule } from "@fleetshift/build-utils";
import type { Configuration } from "webpack";

const monorepoRoot = path.resolve(__dirname, "../..");
const nodeModulesRoot = path.resolve(monorepoRoot, "node_modules");
const pfSharedModules = getDynamicModules(__dirname, monorepoRoot);
const tsLoaderRule = createTsLoaderRule({ nodeModulesRoot });

const sharedModules = {
  react: { singleton: true, requiredVersion: "*" },
  "react-dom": { singleton: true, requiredVersion: "*" },
  "@scalprum/core": { singleton: true, requiredVersion: "*" },
  "@scalprum/react-core": { singleton: true, requiredVersion: "*" },
  "@openshift/dynamic-plugin-sdk": { singleton: true, requiredVersion: "*" },
  ...pfSharedModules,
};

// @ts-ignore — @module-federation/enhanced types differ from SDK expectations
const mfOverride = {
  libraryType: "global",
  pluginOverride: {
    ModuleFederationPlugin,
    ContainerPlugin,
  },
};

const CorePlugin = new DynamicRemotePlugin({
  extensions: [
    {
      type: "fleetshift.dashboard-widget",
      properties: {
        component: { $codeRef: "ClusterOverview.default" },
      },
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
  ],
  sharedModules,
  entryScriptFilename: "core-plugin.[contenthash].js",
  pluginManifestFilename: "core-plugin-manifest.json",
  // @ts-ignore — enhanced MF types differ from SDK expectations
  moduleFederationSettings: mfOverride,
  pluginMetadata: {
    name: "core-plugin",
    version: "1.0.0",
    exposedModules: {
      ClusterOverview: path.resolve(
        __dirname,
        "./src/plugins/core-plugin/ClusterOverview.tsx",
      ),
      PodList: path.resolve(__dirname, "./src/plugins/core-plugin/PodList.tsx"),
      NamespaceList: path.resolve(
        __dirname,
        "./src/plugins/core-plugin/NamespaceList.tsx",
      ),
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
  // @ts-ignore — enhanced MF types differ from SDK expectations
  moduleFederationSettings: mfOverride,
  pluginMetadata: {
    name: "observability-plugin",
    version: "1.0.0",
    exposedModules: {
      MetricsDashboard: path.resolve(
        __dirname,
        "./src/plugins/observability-plugin/MetricsDashboard.tsx",
      ),
      PodMetrics: path.resolve(
        __dirname,
        "./src/plugins/observability-plugin/PodMetrics.tsx",
      ),
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
  // @ts-ignore — enhanced MF types differ from SDK expectations
  moduleFederationSettings: mfOverride,
  pluginMetadata: {
    name: "nodes-plugin",
    version: "1.0.0",
    exposedModules: {
      NodeList: path.resolve(
        __dirname,
        "./src/plugins/nodes-plugin/NodeList.tsx",
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
  // @ts-ignore — enhanced MF types differ from SDK expectations
  moduleFederationSettings: mfOverride,
  pluginMetadata: {
    name: "networking-plugin",
    version: "1.0.0",
    exposedModules: {
      NetworkingPage: path.resolve(
        __dirname,
        "./src/plugins/networking-plugin/NetworkingPage.tsx",
      ),
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
  // @ts-ignore — enhanced MF types differ from SDK expectations
  moduleFederationSettings: mfOverride,
  pluginMetadata: {
    name: "storage-plugin",
    version: "1.0.0",
    exposedModules: {
      StoragePage: path.resolve(
        __dirname,
        "./src/plugins/storage-plugin/StoragePage.tsx",
      ),
    },
  },
});

const UpgradesPlugin = new DynamicRemotePlugin({
  extensions: [
    {
      type: "fleetshift.module",
      properties: {
        label: "Upgrades",
        component: { $codeRef: "UpgradePage.default" },
      },
    },
  ],
  sharedModules,
  entryScriptFilename: "upgrades-plugin.[contenthash].js",
  pluginManifestFilename: "upgrades-plugin-manifest.json",
  // @ts-ignore — enhanced MF types differ from SDK expectations
  moduleFederationSettings: mfOverride,
  pluginMetadata: {
    name: "upgrades-plugin",
    version: "1.0.0",
    exposedModules: {
      UpgradePage: path.resolve(
        __dirname,
        "./src/plugins/upgrades-plugin/UpgradePage.tsx",
      ),
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
  // @ts-ignore — enhanced MF types differ from SDK expectations
  moduleFederationSettings: mfOverride,
  pluginMetadata: {
    name: "alerts-plugin",
    version: "1.0.0",
    exposedModules: {
      AlertList: path.resolve(
        __dirname,
        "./src/plugins/alerts-plugin/AlertList.tsx",
      ),
    },
  },
});

const CostPlugin = new DynamicRemotePlugin({
  extensions: [
    {
      type: "fleetshift.module",
      properties: {
        label: "Cost",
        component: { $codeRef: "CostPage.default" },
      },
    },
  ],
  sharedModules,
  entryScriptFilename: "cost-plugin.[contenthash].js",
  pluginManifestFilename: "cost-plugin-manifest.json",
  // @ts-ignore — enhanced MF types differ from SDK expectations
  moduleFederationSettings: mfOverride,
  pluginMetadata: {
    name: "cost-plugin",
    version: "1.0.0",
    exposedModules: {
      CostPage: path.resolve(
        __dirname,
        "./src/plugins/cost-plugin/CostPage.tsx",
      ),
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
  // @ts-ignore — enhanced MF types differ from SDK expectations
  moduleFederationSettings: mfOverride,
  pluginMetadata: {
    name: "deployments-plugin",
    version: "1.0.0",
    exposedModules: {
      DeploymentList: path.resolve(
        __dirname,
        "./src/plugins/deployments-plugin/DeploymentList.tsx",
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
  ],
  sharedModules,
  entryScriptFilename: "logs-plugin.[contenthash].js",
  pluginManifestFilename: "logs-plugin-manifest.json",
  // @ts-ignore — enhanced MF types differ from SDK expectations
  moduleFederationSettings: mfOverride,
  pluginMetadata: {
    name: "logs-plugin",
    version: "1.0.0",
    exposedModules: {
      LogViewer: path.resolve(
        __dirname,
        "./src/plugins/logs-plugin/LogViewer.tsx",
      ),
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
  // @ts-ignore — enhanced MF types differ from SDK expectations
  moduleFederationSettings: mfOverride,
  pluginMetadata: {
    name: "pipelines-plugin",
    version: "1.0.0",
    exposedModules: {
      PipelineList: path.resolve(
        __dirname,
        "./src/plugins/pipelines-plugin/PipelineList.tsx",
      ),
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
  // @ts-ignore — enhanced MF types differ from SDK expectations
  moduleFederationSettings: mfOverride,
  pluginMetadata: {
    name: "config-plugin",
    version: "1.0.0",
    exposedModules: {
      ConfigPage: path.resolve(
        __dirname,
        "./src/plugins/config-plugin/ConfigPage.tsx",
      ),
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
  // @ts-ignore — enhanced MF types differ from SDK expectations
  moduleFederationSettings: mfOverride,
  pluginMetadata: {
    name: "gitops-plugin",
    version: "1.0.0",
    exposedModules: {
      GitOpsList: path.resolve(
        __dirname,
        "./src/plugins/gitops-plugin/GitOpsList.tsx",
      ),
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
  ],
  sharedModules,
  entryScriptFilename: "events-plugin.[contenthash].js",
  pluginManifestFilename: "events-plugin-manifest.json",
  // @ts-ignore — enhanced MF types differ from SDK expectations
  moduleFederationSettings: mfOverride,
  pluginMetadata: {
    name: "events-plugin",
    version: "1.0.0",
    exposedModules: {
      EventList: path.resolve(
        __dirname,
        "./src/plugins/events-plugin/EventList.tsx",
      ),
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
  entryScriptFilename: "routes-plugin.[contenthash].js",
  pluginManifestFilename: "routes-plugin-manifest.json",
  // @ts-ignore — enhanced MF types differ from SDK expectations
  moduleFederationSettings: mfOverride,
  pluginMetadata: {
    name: "routes-plugin",
    version: "1.0.0",
    exposedModules: {
      RouteList: path.resolve(
        __dirname,
        "./src/plugins/routes-plugin/RouteList.tsx",
      ),
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
  plugins: [
    CorePlugin,
    ObservabilityPlugin,
    NodesPlugin,
    NetworkingPlugin,
    StoragePlugin,
    UpgradesPlugin,
    AlertsPlugin,
    CostPlugin,
    DeploymentsPlugin,
    LogsPlugin,
    PipelinesPlugin,
    ConfigPlugin,
    GitOpsPlugin,
    EventsPlugin,
    RoutesPlugin,
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
    ],
  },
};

export default config;
