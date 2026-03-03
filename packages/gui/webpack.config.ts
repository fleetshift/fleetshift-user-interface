import path from "path";
import { ModuleFederationPlugin } from "@module-federation/enhanced";
import HtmlWebpackPlugin from "html-webpack-plugin";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import { getDynamicModules, createTsLoaderRule } from "@fleetshift/build-utils";
import type { Configuration } from "webpack";
import type { Configuration as DevServerConfiguration } from "webpack-dev-server";

const monorepoRoot = path.resolve(__dirname, "../..");
const nodeModulesRoot = path.resolve(monorepoRoot, "node_modules");
const pfSharedModules = getDynamicModules(__dirname, monorepoRoot);
const tsLoaderRule = createTsLoaderRule({ nodeModulesRoot });

const config: Configuration & { devServer?: DevServerConfiguration } = {
  entry: "./src/index.ts",
  output: {
    publicPath: "/",
    path: path.resolve(__dirname, "dist"),
    clean: true,
  },
  mode: "development",
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx"],
  },
  module: {
    rules: [
      tsLoaderRule,
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, "css-loader"],
      },
      {
        test: /\.s[ac]ss$/,
        use: [MiniCssExtractPlugin.loader, "css-loader", "sass-loader"],
      },
    ],
  },
  plugins: [
    new ModuleFederationPlugin({
      name: "fleetshift_shell",
      remotes: {},
      shared: {
        react: { singleton: true, requiredVersion: "^18" },
        "react-dom": { singleton: true, requiredVersion: "^18" },
        "react-router-dom": { singleton: true, requiredVersion: "^6" },
        "@scalprum/core": { singleton: true },
        "@scalprum/react-core": { singleton: true },
        ...pfSharedModules,
      },
    }),
    new MiniCssExtractPlugin(),
    new HtmlWebpackPlugin({
      template: "./src/index.html",
    }),
  ],
  devServer: {
    historyApiFallback: true,
    port: 3000,
  },
};

export default config;
