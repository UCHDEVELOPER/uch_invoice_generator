import api from "../axios";

export const fetchAllInvoices = (data) =>
  api.get("/self-own-invoice/get-all-invoices" , {
    params: data
  });

export const fetchSingleInvoice = (id) =>
  api.get("/self-own-invoice/get-invoice/" + id);

export const updateInvoice = (id, data) =>
  api.patch("/self-own-invoice/update-invoice/" + id, data);

export const deleteInvoice = (id) =>
  api.delete("/self-own-invoice/delete-invoice/" + id);

export const generateDraftInvoice = (data) =>
  api.post("/self-own-invoice/generate-draft-invoice", data);

export const generateFinalInvoice = (data) => 
  api.post("/self-own-invoice/generate-final-invoice", data);

export const getInvoicePdfUrl = (invoiceId) =>
  api.get(`/self-own-invoice/pdf/${invoiceId}`);

export const generateBankRemittance = (data) =>
  api.post("/self-own-invoice/generate-bank-remittance", data);

export const generateInvoiceSummary = (data) =>
  api.post("/self-own-invoice/generate-invoice-summary", data);  

export const regenerateInvoice = (data) =>
  api.post("/self-own-invoice/regenerate-invoice", {
    invoiceId: data
  });

export const generateDetailedInvoiceSummary = (data) => 
  api.post("/self-own-invoice/generate-detailed-invoice-summary", data);

export const getInvoiceCsvUrl = (invoiceId) =>
  api.get(`/self-own-invoice/csv/${invoiceId}`);

export const bulkUpdateInvoicesToPaid = (data) =>
    api.post("/self-own-invoice/bulk-update-invoices-to-paid", data);