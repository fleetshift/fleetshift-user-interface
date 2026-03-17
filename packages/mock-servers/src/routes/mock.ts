import { Router } from "express";
import clusterRoutes from "./clusters";
import namespaceRoutes from "./namespaces";
import podRoutes from "./pods";
import metricsRoutes from "./metrics";
import nodeRoutes from "./nodes";
import serviceRoutes from "./services";
import storageRoutes from "./storage";
import upgradeRoutes from "./upgrades";
import alertRoutes from "./alerts";

import deploymentRoutes from "./deployments";
import logRoutes from "./logs";
import pipelineRoutes from "./pipelines";
import configRoutes from "./config";
import gitopsRoutes from "./gitops";
import eventRoutes from "./events";
import appRoutes from "./appRoutes";

const router = Router();

router.use(clusterRoutes);
router.use(namespaceRoutes);
router.use(podRoutes);
router.use(metricsRoutes);
router.use(nodeRoutes);
router.use(serviceRoutes);
router.use(storageRoutes);
router.use(upgradeRoutes);
router.use(alertRoutes);

router.use(deploymentRoutes);
router.use(logRoutes);
router.use(pipelineRoutes);
router.use(configRoutes);
router.use(gitopsRoutes);
router.use(eventRoutes);
router.use(appRoutes);

export default router;
