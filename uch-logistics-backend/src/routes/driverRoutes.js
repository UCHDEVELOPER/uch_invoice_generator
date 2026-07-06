import express from "express";
import { addDriver, getAllDrivers, getDriver, updateDriver, deleteDriver , importDrivers , exportDrivers , getAllDriverPositions , addDriverPosition , updateDriverPosition , deleteDriverPosition , fetchSingleDriverPosition , deleteCarryForwardCharges} from "../controllers/driverController.js";
import { missingIdResponse } from "../controllers/commonController.js";
import { adminOnly } from "../middleware/admin.js";
import { verifyToken } from "../utils/jwt.js";
import { driverImageUpload } from "../middleware/driverImageUpload.js";
import { uploadDriverFile } from "../middleware/uploadDriverFile.js";

const router = express.Router();

router.get("/get-all-drivers", verifyToken, getAllDrivers);

router.get("/get-driver", verifyToken, missingIdResponse);
router.get("/get-driver/:id", verifyToken, getDriver);


router.post("/add-driver", verifyToken, adminOnly, driverImageUpload.single("image"), addDriver);

router.patch("/update-driver", verifyToken, adminOnly, missingIdResponse);
router.patch("/update-driver/:id", verifyToken, adminOnly, driverImageUpload.single("image"), updateDriver);

router.delete("/delete-driver", verifyToken, adminOnly, missingIdResponse);
router.delete("/delete-driver/:id", verifyToken, adminOnly, deleteDriver);  

router.post("/import-drivers", verifyToken, adminOnly, uploadDriverFile, importDrivers);

router.post("/export-drivers", verifyToken , exportDrivers)

// Driver Positions Routes
router.get("/get-all-positions", verifyToken, getAllDriverPositions);

router.post("/add-driver-position", verifyToken, addDriverPosition); 

router.get("/get-driver-position", verifyToken, missingIdResponse);
router.get("/get-driver-position/:id", verifyToken, fetchSingleDriverPosition);

router.patch("/update-driver-position", verifyToken, missingIdResponse);
router.patch("/update-driver-position/:id", verifyToken, updateDriverPosition);

router.delete("/delete-driver-position", verifyToken, missingIdResponse);
router.delete("/delete-driver-position/:id", verifyToken, deleteDriverPosition);

router.delete("/driver-carry-forward",verifyToken, missingIdResponse);
router.delete("/driver-carry-forward/:id",verifyToken, deleteCarryForwardCharges);

export default router;
