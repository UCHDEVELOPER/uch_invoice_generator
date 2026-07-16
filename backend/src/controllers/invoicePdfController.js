import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";
import { generateInvoiceHTML } from "../utils/generateInvoiceHTML.js";
import {
  getInvoiceByIdService,
  updateInvoiceService, 
} from "../services/invoiceService.js";
import { validateObjectId } from "../helpers/validator.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PDF_STORAGE_DIR = path.join(__dirname, "../../src/public/invoices");

const PDF_EXPIRY_HOURS = 24;

let browserInstance = null;

/**
 * Ensure storage directory exists
 */
function ensureStorageDir() {
  if (!fs.existsSync(PDF_STORAGE_DIR)) {
    fs.mkdirSync(PDF_STORAGE_DIR, { recursive: true });
  }
}

/**
 * Cleanup old PDF files
 */
function cleanupOldPdfs() {
  try {
    const files = fs.readdirSync(PDF_STORAGE_DIR);
    const now = Date.now();
    const expiryMs = PDF_EXPIRY_HOURS * 60 * 60 * 1000;

    files.forEach((file) => {
      const filePath = path.join(PDF_STORAGE_DIR, file);
      const stats = fs.statSync(filePath);

      if (now - stats.mtimeMs > expiryMs) {
        fs.unlinkSync(filePath);
      }
    });
  } catch (error) {}
}

// Run cleanup every hour
setInterval(cleanupOldPdfs, 60 * 60 * 1000);

/**
 * Initialize or get existing browser instance
 */
// async function initBrowser() {
//   try {
//     if (!browserInstance || !browserInstance.isConnected()) {
//       browserInstance = await puppeteer.launch({
//         headless: "new",
//         args: [
//           "--no-sandbox",
//           "--disable-setuid-sandbox",
//           "--disable-dev-shm-usage",
//           "--disable-gpu",
//           "--font-render-hinting=none",
//           "--disable-web-security",
//           "--disable-features=VizDisplayCompositor",
//         ],
//       });

//       browserInstance.on("disconnected", () => {
//         browserInstance = null;
//       });
//     }

//     return browserInstance;
//   } catch (error) {
//     browserInstance = null;
//     throw error;
//   }
// }

async function initBrowser() {
  try {
    if (!browserInstance || !browserInstance.isConnected()) {
      browserInstance = await puppeteer.launch({
        executablePath: "/snap/bin/chromium",
        headless: "new",
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--font-render-hinting=none",
          "--disable-web-security",
          "--disable-features=VizDisplayCompositor",
        ],
      });

      browserInstance.on("disconnected", () => {
        browserInstance = null;
      });
    }

    return browserInstance;
  } catch (error) {
    browserInstance = null;
    throw error;
  }
}

/**
 * Cleanup browser instance
 */
async function closeBrowser() {
  if (browserInstance) {
    try {
      await browserInstance.close();
    } catch (error) {
    } finally {
      browserInstance = null;
    }
  }
}

// Cleanup on process exit
process.on("exit", closeBrowser);
process.on("SIGINT", async () => {
  await closeBrowser();
  process.exit(0);
});
process.on("SIGTERM", async () => {
  await closeBrowser();
  process.exit(0);
});

/**
 * Generate PDF and return URL
 */

export async function generatePdf(req, res) {
  const { invoiceId } = req.params;
  let page = null;

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

    if (invoiceData.pdf_url) {
      const pdfFilePath = path.join(PDF_STORAGE_DIR, invoiceData.pdf_url);
      if (fs.existsSync(pdfFilePath)) {
        return res.status(200).json({
          success: true,
          statusCode: 200,
          message: "Invoice PDF URL fetched successfully",
          data: {
            url: invoiceData.pdf_url,
          },
        });
      }
    }

     const browser = await initBrowser();

   


    page = await browser.newPage();

    await page.setViewport({
      width: 1200,
      height: 800,
      deviceScaleFactor: 2,
    });

    const htmlContent = generateInvoiceHTML(invoiceData);

    if (!htmlContent) {
      throw new Error("Failed to generate HTML content");
    }

    await page.setContent(htmlContent, {
      waitUntil: ["load", "domcontentloaded", "networkidle0"],
      timeout: 30000,
    });

    await page.evaluateHandle("document.fonts.ready");
    await new Promise((resolve) => setTimeout(resolve, 500));

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: "10mm",
        right: "10mm",
        bottom: "10mm",
        left: "10mm",
      },
    });

    ensureStorageDir();

    const uniqueId = uuidv4();
    const invoiceNumber = invoiceData.invoice_number || invoiceId;
    const filename = `invoice-${invoiceNumber}-${uniqueId}.pdf`;
    const filePath = path.join(PDF_STORAGE_DIR, filename);

    fs.writeFileSync(filePath, pdfBuffer);

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const pdfUrl = `${baseUrl}/public/invoices/${filename}`;

    await updateInvoiceService(invoiceId, { pdf_url: pdfUrl });

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "PDF generated successfully",
      data: {
        url: pdfUrl,
      },
    });
  } catch (error) {
    if (error.message?.includes("timeout")) {
      return res.status(504).json({
        success: false,
        statusCode: 504,
        message: "PDF generation timed out",
      });
    }

    if (error.message?.includes("Protocol error")) {
      browserInstance = null;
      return res.status(500).json({
        success: false,
        statusCode: 500,
        message: "PDF generation failed. Please try again.",
      });
    }

    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: error.message || "Failed to generate PDF",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  } finally {
    if (page) {
      try {
        await page.close();
      } catch (closeError) {}
    }
  }
}

/**
 * Download PDF directly (optional - keep for backward compatibility)
 */
export async function downloadPdf(req, res) {
  const { filename } = req.params;

  try {
    const filePath = path.join(PDF_STORAGE_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "PDF not found or has expired",
      });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Failed to download PDF",
    });
  }
}
