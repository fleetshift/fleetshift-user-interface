import "dotenv/config";
import express from "express";
import cors from "cors";
import { initPluginRegistryWatcher } from "./pluginRegistry";
import { initCliPluginRegistryWatcher } from "./cliPluginRegistry";
import userRoutes from "./routes/users";
import pluginRegistryRoutes from "./routes/pluginRegistry";
import cliPluginRegistryRoutes from "./routes/cliPluginRegistry";

const PORT = 4000;

const app = express();
app.use(cors());
app.use(express.json());

app.use((req, _res, next) => {
  console.log(`→ ${req.method} ${req.path}`);
  next();
});

app.use("/api/v1", userRoutes);
app.use("/api/v1", pluginRegistryRoutes);
app.use("/api/v1", cliPluginRegistryRoutes);

initPluginRegistryWatcher();
initCliPluginRegistryWatcher();

app.listen(PORT, () => {
  console.log(`FleetShift dev server running on http://localhost:${PORT}`);
});
