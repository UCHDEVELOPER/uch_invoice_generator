import express from "express";
import { adminOnly } from "../../middleware/admin.js";
import { verifyToken } from "../../utils/jwt.js";
import { dashboard } from "../../controllers/selfOwnDriverControllers/dashboardController.js";

const router = express.Router();

router.get("/", verifyToken, dashboard);

export default router;
