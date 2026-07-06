import express from "express";
import { generateInvoice } from "../../controllers/invoiceController.js";
import { verifyToken } from "../../utils/jwt.js";
import { missingIdResponse } from "../../controllers/commonController.js";
import { getAllInvoice, getInvoice, deleteInvoice , generateFinalInvoice , updateInvoice , generateBankRemittance ,generateInvoiceSummary , redraftInvoice , generateDetailedInvoiceSummary , bulkUpdateInvoicesToPaid } from "../../controllers/selfOwnDriverControllers/invoiceController.js";
import { generatePdf } from "../../controllers/selfOwnDriverControllers/invoicePdfController.js";
import { generateCsv } from "../../controllers/selfOwnDriverControllers/invoiceCsvController.js";

const router = express.Router();

router.post("/generate-draft-invoice", verifyToken, generateInvoice);

router.get("/get-all-invoices", verifyToken, getAllInvoice);

router.get("/get-invoice", verifyToken, missingIdResponse);
router.get("/get-invoice/:id", verifyToken, getInvoice);

router.delete("/delete-invoice", verifyToken, missingIdResponse);
router.delete("/delete-invoice/:id", verifyToken, deleteInvoice);

router.post("/generate-final-invoice", verifyToken, generateFinalInvoice);

router.patch("/update-invoice", verifyToken, missingIdResponse);
router.patch("/update-invoice/:id", verifyToken, updateInvoice);

router.get("/pdf/:invoiceId", verifyToken, generatePdf);
router.get("/csv/:invoiceId", verifyToken, generateCsv);

router.post("/generate-bank-remittance" , verifyToken, generateBankRemittance);

router.post("/generate-invoice-summary", verifyToken, generateInvoiceSummary);

router.post("/regenerate-invoice", verifyToken, redraftInvoice);

router.post("/generate-detailed-invoice-summary", verifyToken, generateDetailedInvoiceSummary);

router.post("/bulk-update-invoices-to-paid", verifyToken, bulkUpdateInvoicesToPaid);

export default router;