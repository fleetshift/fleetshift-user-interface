import express from "express";
import cors from "cors";
import clusterRoutes from "./routes/clusters";
import namespaceRoutes from "./routes/namespaces";
import podRoutes from "./routes/pods";
import metricsRoutes from "./routes/metrics";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/v1", clusterRoutes);
app.use("/api/v1", namespaceRoutes);
app.use("/api/v1", podRoutes);
app.use("/api/v1", metricsRoutes);

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`FleetShift mock server running on http://localhost:${PORT}`);
});
