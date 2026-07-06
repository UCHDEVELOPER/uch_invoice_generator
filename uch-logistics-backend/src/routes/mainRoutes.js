import express from "express";


import authRoutes from "./authRoutes.js";
import driverRoutes from "./driverRoutes.js";
import jobRoutes from "./jobRoutes.js";
import invoiceRoutes from "./invoiceRoutes.js";
import { invalidRoutes } from "../controllers/commonController.js";
import dashboardRoutes from "./dashboardRoutes.js";
import userRoutes from "./userRoutes.js";

import selfOwndriverRoutes from "./selfOwnDriverRoutes/driverRoutes.js";
import selfOwnjobRoutes from "./selfOwnDriverRoutes/jobRoutes.js";
import selfOwninvoiceRoutes from "./selfOwnDriverRoutes/invoiceRoutes.js";
import selfOwndashboardRoutes from "./selfOwnDriverRoutes/dashboardRoutes.js";

const router = express.Router();

// Base routes
router.use("/auth", authRoutes);
router.use("/driver", driverRoutes);
router.use("/job", jobRoutes);
router.use("/invoice", invoiceRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/user", userRoutes);

router.use("/self-own-driver", selfOwndriverRoutes);
router.use("/self-own-job", selfOwnjobRoutes);
router.use("/self-own-invoice", selfOwninvoiceRoutes);
router.use("/self-own-dashboard", selfOwndashboardRoutes);

router.use(/(.*)/, invalidRoutes);


export default router;
