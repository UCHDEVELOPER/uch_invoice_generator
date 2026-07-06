import {
  updateUserProfileService,
  getUserProfileService,
} from "../services/userService.js";
import { validateUserPayload } from "../helpers/userValidator.js";

export async function updateUserProfile(req, res) {
  try {
    const userId = req.user.id;

    if (req.file) {
      req.body.image = `/public/uploads/userProfile/${req.file.filename}`;
    }

    const validation = validateUserPayload(req.body, true);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: validation.message,
      });
    }

    const result = await updateUserProfileService(userId, req.body);
    return res.status(result.statusCode).json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: err.message,
    });
  }
}

export async function getUserProfile(req, res) {
  try {
    const userId = req.user.id;  
   
    const result = await getUserProfileService(userId);
    return res.status(result.statusCode).json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: err.message,
    });
  }
}
