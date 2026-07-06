import { validateJobPayload } from "../../helpers/jobValidator.js";
import {
  validateRequired,
  validateObjectId,
  getFileType,
} from "../../helpers/validator.js";
import {
  addJobService,
  getAllJobsService,
  getJobService,
  updateJobService,
  deleteJobService,
  deleteBulkJobsService,
  getDriverJobsService
} from "../../services/selfownDriverServices/jobService.js";
import { selfJobImportQueue } from "../../workers/job-import/selfJobImport.queue.js";
import fs from "fs";

export async function addJob(req, res) {
  try {
    const requiredCheck = validateRequired(req.body, [
      "docket_no",
      "date_time",
      "journey",
      "driver_total",
      "tariff",
    ]);
    if (!requiredCheck.valid) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: requiredCheck.message,
      });
    }

    const validation = validateJobPayload(req.body);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: validation.message,
      });
    }

    const result = await addJobService(req.body);
    return res.status(result.statusCode).json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: err.message,
    });
  }
}

export async function updateJob(req, res) {
  try {
    const { id } = req.params;
    const body = req.body;

    if (!validateObjectId(id)) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Invalid job ID format",
      });
    }

    if (!body || Object.keys(body).length === 0) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Request body is empty",
      });
    }

    const validation = validateJobPayload(body);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: validation.message,
      });
    }

    const result = await updateJobService(id, body);
    return res.status(result.statusCode).json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: err.message,
    });
  }
}
export async function getJob(req, res) {
  try {
    const { id } = req.params;

    if (!validateObjectId(id)) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Invalid Job ID format",
      });
    }

    const result = await getJobService(id);

    return res.status(result.statusCode).json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: err.message,
    });
  }
}
export async function getAllJobs(req, res) {
  try {
    const query = req.query || {};
    const { page = 1, limit = 10, search, from_date, to_date } = query;

    const result = await getAllJobsService(page, limit, {
      search,
      from_date,
      to_date,
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

export async function deleteJob(req, res) {
  try {
    const { id } = req.params;

    if (!validateObjectId(id)) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Invalid driver ID format",
      });
    }

    const result = await deleteJobService(id);
    return res.status(result.statusCode).json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: err.message,
    });
  }
}

export async function importJobs(req, res) {
  try {
    console.log(req.file, "req.file");
    if (!req.file) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Upload a CSV/XLSX file as 'file'",
      });
    }

    const filePath = req.file.path;
    const originalName = req.file.originalname;

    const fileType = getFileType(filePath, originalName);

    if (!fileType) {
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          console.log("File deleted:", filePath);
        } catch (deleteErr) {
          console.error("Failed to delete file:", deleteErr);
        }
      }

      return res.status(400).json({
        success: false,
        statusCode: 400,
        message:
          "Unsupported file type. Only CSV and Excel files are supported.",
      });
    }

    await selfJobImportQueue.add("importSelfJobs", {
      filePath: filePath,
      originalName: originalName,
    });

    return res.json({
      success: true,
      statusCode: 200,
      message: "Import started. Processing in background.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: error.message,
    });
  }
}

export async function deleteBulkJobs(req, res) {
  try {
    const { jobIds } = req.body;

    if (!Array.isArray(jobIds) || jobIds.length === 0) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "jobIds must be a non-empty array",
      });
    }

    const response = await deleteBulkJobsService(jobIds);

    return res.status(response.statusCode).json(response);
  } catch (err) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: err.message || "Internal server error",
    });
  }
}

export async function getDriverJobs(req, res) {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10, search, from_date, to_date } = req.query;

    if (!validateObjectId(id)) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Invalid driver ID format",
      });
    }

    const result = await getDriverJobsService(id, page, limit, {
      search,
      from_date,
      to_date,
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