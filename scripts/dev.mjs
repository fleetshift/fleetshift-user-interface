import { spawn } from "child_process";
import { mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import Watchpack from "watchpack";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const guiDist = resolve(root, "packages/gui/dist");
const pluginsDist = resolve(root, "packages/mock-ui-plugins/dist");
const watchOnly = process.argv.includes("--watch");

// Always rebuild common — it's fast (tsc only) and webpack depends on its dist
console.log("Building @fleetshift/common...");
execSync("npm run build -w packages/common", { cwd: root, stdio: "inherit" });

function merge() {
  try {
    execSync("node scripts/merge-web.mjs --incremental", {
      cwd: root,
      stdio: "inherit",
    });
  } catch {
    console.error("merge-web.mjs failed");
  }
}

if (!watchOnly) {
  console.log("Running initial build...");
  execSync("npm run build -w packages/mock-ui-plugins", {
    cwd: root,
    stdio: "inherit",
  });
  execSync("node scripts/generate-plugin-registry.mjs", {
    cwd: root,
    stdio: "inherit",
  });
  execSync("npm run build -w packages/gui", { cwd: root, stdio: "inherit" });
  execSync("node scripts/merge-web.mjs", { cwd: root, stdio: "inherit" });
}

console.log("\nStarting watch mode...\n");

function spawnWebpack(cwd) {
  return spawn(
    "npx",
    ["webpack", "--watch", "--config", "webpack.config.ts"],
    {
      cwd,
      stdio: "inherit",
      env: { ...process.env, NODE_OPTIONS: "--loader ts-node/esm --max-old-space-size=8192" },
    },
  );
}

const pluginsCwd = resolve(root, "packages/mock-ui-plugins");
const guiCwd = resolve(root, "packages/gui");

let pluginsWatch = spawnWebpack(pluginsCwd);
const guiWatch = spawnWebpack(guiCwd);

const configWatcher = new Watchpack({ aggregateTimeout: 300 });
configWatcher.watch({ files: [resolve(pluginsCwd, "webpack.config.ts")] });
configWatcher.on("change", () => {
  console.log("\nwebpack.config.ts changed — restarting plugins build...\n");
  const prev = pluginsWatch;
  prev.kill();
  prev.on("close", () => {
    pluginsWatch = spawnWebpack(pluginsCwd);
  });
});

mkdirSync(guiDist, { recursive: true });
mkdirSync(pluginsDist, { recursive: true });
const distWatcher = new Watchpack({ aggregateTimeout: 1500 });
distWatcher.watch({ directories: [guiDist, pluginsDist] });
distWatcher.on("aggregated", merge);

process.on("SIGINT", () => {
  pluginsWatch.kill();
  guiWatch.kill();
  configWatcher.close();
  distWatcher.close();
  process.exit(0);
});
