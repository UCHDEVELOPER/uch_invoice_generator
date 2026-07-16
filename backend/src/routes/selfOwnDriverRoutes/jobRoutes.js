import express from "express";
import { addJob, deleteJob, getAllJobs, getJob, updateJob , importJobs , deleteBulkJobs , getDriverJobs } from "../../controllers/selfOwnDriverControllers/jobController.js";
import { missingIdResponse } from "../../controllers/commonController.js";
import { adminOnly } from "../../middleware/admin.js";
import { verifyToken } from "../../utils/jwt.js";
import { uploadJobFile } from "../../middleware/uploadJobFile.js";

const router = express.Router();

// router.get("/get-all-jobs", verifyToken, getAllJobs);
router.get("/get-all-jobs", getAllJobs);

router.get("/get-job", verifyToken, missingIdResponse);
router.get("/get-job/:id", verifyToken, getJob);

// Job of driver only
router.get("/get-driver-jobs", verifyToken, missingIdResponse);
router.get("/get-driver-jobs/:id", verifyToken, getDriverJobs);

router.post("/add-job", verifyToken, addJob);

router.put("/update-job", verifyToken, missingIdResponse);
router.put("/update-job/:id", verifyToken, updateJob);

router.delete("/delete-job", verifyToken, missingIdResponse);
router.delete("/delete-job/:id", verifyToken, deleteJob);

router.post("/delete-bulk-jobs", verifyToken, deleteBulkJobs);

router.post("/import-jobs", verifyToken, adminOnly , uploadJobFile, importJobs);


export default router;
