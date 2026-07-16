import { validateDriverPayload } from "../../helpers/driverValidator.js";
import { validateRequired, validateObjectId } from "../../helpers/validator.js";
import {
  addDriverService,
  deleteDriverService,
  getAllDriversService,
  getDriverService,
  updateDriverService,
  importDriversService,
  getAllDriverPositionsService,
  getDriverPositionService,
  addDriverPositionService,
  updateDriverPositionService,
  deleteDriverPositionService,
} from "../../services/selfownDriverServices/driverService.js";
import { exportSelfOwnDriversService } from "../../utils/exportSelfOwnDriversPDF.js";
import validateDriverPositionPayload from "../../helpers/driverPositionValidator.js";

export async function addDriver(req, res) {
  try {
    const payloadCheck = validateDriverPayload(req.body , false , true);
    if (!payloadCheck.valid) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: payloadCheck.message,
      });
    }

    if (req.file && !req.file.mimetype.startsWith("image/")) {
      return res.status(400).json({
        success: false,
        message: "Invalid image format",
      });
    }

    const requiredCheck = validateRequired(req.body, ["name", "call_sign"]);
    if (!requiredCheck.valid) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: requiredCheck.message,
      });
    }

    const imagePath = req.file
      ? `/public/uploads/driver/images/${req.file.filename}`
      : null;

    const result = await addDriverService({
      ...req.body,
      image: imagePath,
    });

    return res.status(result.statusCode).json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: err.message,
    });
  }
}

export async function getAllDrivers(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search ? String(req.query.search).trim() : "";

    const result = await getAllDriversService({ limit, page, search });
    return res.status(result.statusCode).json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: err.message,
    });
  }
}

export async function getDriver(req, res) {
  try {
    const { id } = req.params;

    if (!validateObjectId(id)) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Invalid driver ID format",
      });
    }

    const result = await getDriverService(id);

    return res.status(result.statusCode).json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: err.message,
    });
  }
}

export async function updateDriver(req, res) {
  try {
    const { id } = req.params;
    const body = req.body;
       


    if (!validateObjectId(id)) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Invalid driver ID format",
      });
    }
 

    if (!body || Object.keys(body).length === 0) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Request body is empty",
      });
    }
 

    const validation = validateDriverPayload(body, true);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: validation.message,
      });
    }

    
    if (req.file) {
      body.image = `/public/uploads/driver/images/${req.file.filename}`;
    }

    const result = await updateDriverService(id, body);
    return res.status(result.statusCode).json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: err.message,
    });
  }
}

export async function deleteDriver(req, res) {
  try {
    const { id } = req.params;

    if (!validateObjectId(id)) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Invalid driver ID format",
      });
    }

    const result = await deleteDriverService(id);
    return res.status(result.statusCode).json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: err.message,
    });
  }
}

export async function importDrivers(req, res) {
  try {
    const result = await importDriversService(req.file);
    return res.status(result.statusCode).json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: err.message,
    });
  }
}

export async function exportDrivers(req,res){
  try{
    const format = req.body.format;
    const columns = req.body.columns;
    
    const result = await exportSelfOwnDriversService(format,columns);
    return res.status(result.statusCode).json(result);
  }catch(err){
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: err.message,
    });
  }
}

export async function getAllDriverPositions(req, res) {
  try {
    const result = await getAllDriverPositionsService();
    return res.status(result.statusCode).json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: err.message,
    });
  }
}

export async function fetchSingleDriverPosition(req, res) {
  try {
    const { id } = req.params;

    if (!validateObjectId(id)) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Invalid driver position ID format",
      });
    }

    const result = await getDriverPositionService(id);
    return res.status(result.statusCode).json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: err.message,
    });
  }
}

// ─── ADD ────────────────────────────────────────────────────────────────────────

export async function addDriverPosition(req, res) {
  try {
    const body = req.body;

    const validation = validateDriverPositionPayload(body, false);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: validation.message,
      });
    }

    const result = await addDriverPositionService(body);
    return res.status(result.statusCode).json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: err.message,
    });
  }
}

export async function updateDriverPosition(req, res) {
  try {
    const { id } = req.params;

    if (!validateObjectId(id)) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Invalid driver position ID format",
      });
    }

    const body = req.body;

    const validation = validateDriverPositionPayload(body, true);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: validation.message,
      });
    }

    const result = await updateDriverPositionService(id, body);
    return res.status(result.statusCode).json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: err.message,
    });
  }
}

export async function deleteDriverPosition(req, res) {
  try {
    const { id } = req.params;

    if (!validateObjectId(id)) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Invalid driver position ID format",
      });
    }

    const result = await deleteDriverPositionService(id);
    return res.status(result.statusCode).json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: err.message,
    });
  }
}