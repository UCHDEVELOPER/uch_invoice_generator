import {
  getInvoiceByIdService,
} from "../../services/selfownDriverServices/invoiceService.js";
import { validateObjectId } from "../../helpers/validator.js";
import { generateInvoiceCsv } from "../../utils/generateInvoiceCsv.js";

/**
 * Generate CSV for a single invoice and return the download URL
 */
export async function generateCsv(req, res) {
  const { invoiceId } = req.params;

  try {
    // Validation
    if (!invoiceId) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Invoice ID is required",
      });
    }

    if (!validateObjectId(invoiceId)) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Invalid invoice ID format",
      });
    }

    // Fetch invoice data
    const invoiceResponse = await getInvoiceByIdService(invoiceId);

    if (!invoiceResponse?.success) {
      return res.status(invoiceResponse?.statusCode || 404).json({
        success: false,
        statusCode: invoiceResponse?.statusCode || 404,
        message: invoiceResponse?.message || "Invoice not found",
      });
    }

    if (!invoiceResponse?.data) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Invoice not found",
      });
    }

    const invoiceData = invoiceResponse.data;

    // Generate CSV file
    const { fileName } = generateInvoiceCsv(invoiceData);

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const csvUrl = `${baseUrl}/public/invoices/${fileName}`;

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "CSV generated successfully",
      data: {
        url: csvUrl,
      },
    });
  } catch (error) {
    console.error("Error generating invoice CSV:", error);

    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: error.message || "Failed to generate CSV",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
}
