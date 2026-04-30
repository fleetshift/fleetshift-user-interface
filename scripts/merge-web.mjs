import { cpSync, rmSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const webDir = resolve(root, "web");

// Clean and recreate
rmSync(webDir, { recursive: true, force: true });
mkdirSync(webDir, { recursive: true });

// Copy GUI shell (index.html, main.js, CSS, fonts, chunks)
cpSync(resolve(root, "packages/gui/dist"), webDir, { recursive: true });

// Merge plugin assets (manifests, entry scripts, plugin-registry.json)
cpSync(resolve(root, "packages/mock-ui-plugins/dist"), webDir, {
  recursive: true,
  force: true,
});

console.log("Merged GUI + plugin assets into web/");
