import express from "express";
import { updateUserProfile , getUserProfile } from "../controllers/userController.js";
import { verifyToken } from "../utils/jwt.js";
import { userProfileImageUpload } from "../middleware/userProfileImageUpload.js";

const router = express.Router();

router.put("/profile", verifyToken, userProfileImageUpload.single("image"), updateUserProfile);

router.get('/get-user-profile', verifyToken, getUserProfile);

export default router;
