import { validateInvoicePayload } from "../helpers/invoiceValidator.js";
import { validateObjectId, validateRequired } from "../helpers/validator.js";
import {
  deleteInvoiceService,
  generateWeeklyInvoice,
  getAllInvoiceService,
  getInvoiceByIdService,
  generateFinalInvoiceService,
  updateInvoiceService,
  generateInvoiceSummaryService,
  generateBankRemittanceService,
  redraftInvoiceService,
  generateDetailedInvoiceSummaryService,
  bulkUpdateInvoicesToPaidService,
  generateCollectiveBankRemittanceService,
  generateCollectiveInvoiceSummaryService,
  generateCollectiveDetailedInvoiceSummaryService,
} from "../services/invoiceService.js";
import { generateBankRemittancePdf } from "../utils/generateBankRemittancePdf.js";
import { buildUkRange, parseLocalDate } from "../utils/parseUserDate.js";

export async function generateInvoice(req, res) {
  try {
    const requiredCheck = validateRequired(req.body, [
      "driver_id",
      "start_date",
      "end_date",
    ]);
    if (!requiredCheck.valid) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: requiredCheck.message,
      });
    }

    const payloadCheck = await validateInvoicePayload(req.body);
    if (!payloadCheck.valid) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: payloadCheck.message,
      });
    }

    const { driver_id, start_date, end_date } = req.body;

    const result = await generateWeeklyInvoice({
      driverId: driver_id,
      startDate: start_date,
      endDate: end_date,
      payload: req.body,
    });

    const data = {
      ...result.invoice,
      meta: result.meta,
    };

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Generated Draft Invoice Data",
      data,
    });
  } catch (err) {
    console.error("Invoice Generation Error:", err);
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        statusCode: err.statusCode,
        message: err.message,
      });
    } else {
      return res.status(500).json({
        success: false,
        statusCode: 500,
        message: "Internal server error",
        error: err.message,
      });
    }
  }
}

export async function getAllInvoice(req, res) {
  try {
    const { page, limit, search, from_date, to_date } = req.query;

    const result = await getAllInvoiceService(page, limit, {
      search,
      from_date,
      to_date,
    });

    return res.status(result.statusCode).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: error.message,
    });
  }
}

export async function getInvoice(req, res) {
  try {
    const invoiceId = req.params.id;

    if (!validateObjectId(invoiceId)) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Invalid invoice ID format",
      });
    }

    const result = await getInvoiceByIdService(invoiceId);
    return res.status(result.statusCode).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: error.message,
    });
  }
}

export async function deleteInvoice(req, res) {
  try {
    const invoiceId = req.params.id;

    if (!validateObjectId(invoiceId)) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Invalid invoice ID format",
      });
    }

    const result = await deleteInvoiceService(invoiceId);
    return res.status(result.statusCode).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: error.message,
    });
  }
}

export async function generateFinalInvoice(req, res) {
  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Request body is empty",
      });
    }

    const requiredCheck = validateRequired(req.body, ["invoice_id"]);
    if (!requiredCheck.valid) {
      return res.status(400).json({
        success: false,
        message: requiredCheck.message,
      });
    }

    const result = await generateFinalInvoiceService(req.body);

    return res.status(result.statusCode).json(result);
  } catch (err) {
    console.error("Generate Final Invoice Error:", err);

    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal server error",
    });
  }
}

export async function updateInvoice(req, res) {
  try {
    const invoiceId = req.params.id;

    if (!validateObjectId(invoiceId)) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Invalid invoice ID format",
      });
    }

    const result = await updateInvoiceService(invoiceId, req.body);
    return res.status(result.statusCode).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: error.message,
    });
  }
}

export async function generateInvoiceSummary(req, res) {
  try {
    const { start_date, end_date, format = "pdf" } = req.body;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "start_date and end_date are required",
      });
    }

    const { start: startDate, end: endDate } = buildUkRange(
      start_date,
      end_date,
    );

    const baseUrl = `${req.protocol}://${req.get("host")}`;

    const result = await generateInvoiceSummaryService({
      start_date: startDate,
      end_date: endDate,
      format,
    });

    let url = "";
    if (format === "pdf") {
      url = `${baseUrl}${result.pdf_url.startsWith("/") ? "" : "/"}${result.pdf_url}`;
    } else {
      url = `${baseUrl}${result.csv_url.startsWith("/") ? "" : "/"}${result.csv_url}`;
    }

    return res.status(200).json({
      success: true,
      statusCode: 200,
      data: {
        url: url,
      },
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        statusCode: error.statusCode,
        message: error.message,
      });
    } else {
      return res.status(500).json({
        success: false,
        statusCode: 500,
        message: "Failed to generate invoice summary " + error.message,
      });
    }
  }
}

export async function generateBankRemittance(req, res) {
  try {
    const { start_date, end_date, format = "csv" } = req.body;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: "start_date and end_date are required",
      });
    }

    const baseUrl = `${req.protocol}://${req.get("host")}`;

    const result = await generateBankRemittanceService({
      start_date,
      end_date,
      format,
    });

    let url = "";

    if (format === "csv") {
      url = `${baseUrl}${result.csv_url}`;
    } else {
      url = `${baseUrl}${result.pdf_url}`;
    }

    return res.status(200).json({
      success: true,
      statusCode: 200,
      data: {
        url: url,
      },
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        statusCode: error.statusCode,
        message: error.message,
      });
    } else {
      return res.status(500).json({
        success: false,
        statusCode: 500,
        message: "Failed to generate bank remittance",
        error: error.message,
      });
    }
  }
}

export async function generateDetailedInvoiceSummary(req, res) {
  try {
    const { start_date, end_date, format = "pdf" } = req.body;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: "start_date and end_date are required",
      });
    }

    const result = await generateDetailedInvoiceSummaryService(
      start_date,
      end_date,
      format,
    );

    return res.status(result.statusCode).json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: err.message,
    });
  }
}

export async function redraftInvoice(req, res) {
  try {
    const { invoiceId } = req.body;

    if (!invoiceId) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Invoice ID is required",
        data: null,
      });
    }

    const result = await redraftInvoiceService(invoiceId);

    return res.status(result.statusCode).json({
      success: result.success,
      statusCode: result.statusCode,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: error.message,
      data: null,
    });
  }
}

export async function bulkUpdateInvoicesToPaid(req, res) {
  try {
    const { invoiceIds } = req.body;

    if (!invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length === 0) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Invoice IDs are required",
      });
    }

    const result = await bulkUpdateInvoicesToPaidService(invoiceIds);

    return res.status(result.statusCode).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: error.message,
    });
  }
}

export async function generateCollectiveBankRemittance(req, res) {
  try {
    const { start_date, end_date, format = "csv" } = req.body;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: "start_date and end_date are required",
      });
    }

    const baseUrl = `${req.protocol}://${req.get("host")}`;

    const result = await generateCollectiveBankRemittanceService({
      start_date,
      end_date,
      format,
    });

    // Single URL — same shape as the existing bank remittance endpoint
    const url =
      format === "pdf"
        ? `${baseUrl}${result.pdf_url}`
        : `${baseUrl}${result.csv_url}`;

    return res.status(200).json({
      success: true,
      statusCode: 200,
      data: { url },
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        statusCode: error.statusCode,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Failed to generate collective bank remittance",
      error: error.message,
    });
  }
}

export async function generateCollectiveInvoiceSummary(req, res) {
  try {
    const { start_date, end_date, format = "pdf" } = req.body;

    const result = await generateCollectiveInvoiceSummaryService({
      start_date,
      end_date,
      format,
    });

    const baseUrl = `${req.protocol}://${req.get("host")}`;

    let url = "";
    if (format === "pdf") {
      url = `${baseUrl}${result.pdf_url.startsWith("/") ? "" : "/"}${result.pdf_url}`;
    } else {
      url = `${baseUrl}${result.csv_url.startsWith("/") ? "" : "/"}${result.csv_url}`;
    }

    return res.status(200).json({
      success: true,
      statusCode: 200,
      data: {
        url: url,
      },
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      statusCode: error.statusCode || 500,
      message: error.message,
    });
  }
}

export async function generateCollectiveDetailedInvoiceSummary(req, res) {
  try {
    const { start_date, end_date, format = "pdf" } = req.body;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: "start_date and end_date are required",
      });
    }

    const result = await generateCollectiveDetailedInvoiceSummaryService(
      start_date,
      end_date,
      format,
    );

    return res.status(result.statusCode).json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: err.message,
    });
  }
}
