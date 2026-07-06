import express from "express";
import { login , addAccountant , changePassword , forgotPassword , resetPassword, logout} from "../controllers/authController.js";
import { verifyToken } from "../utils/jwt.js";

const router = express.Router();

router.post("/signin", login);

router.post("/logout", logout);

router.post("/add-accountant", verifyToken , addAccountant);

router.post("/change-password", verifyToken, changePassword);

router.post('/forgot-password',forgotPassword);

router.post('/reset-password/:token' , resetPassword);

export default router;
