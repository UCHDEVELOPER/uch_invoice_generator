import api from "./axios";

export const fetchAllInvoices = (data) =>
  api.get("/invoice/get-all-invoices", {
    params: data,
  });

export const fetchSingleInvoice = (id) => api.get("/invoice/get-invoice/" + id);

export const updateInvoice = (id, data) =>
  api.patch("/invoice/update-invoice/" + id, data);

export const deleteInvoice = (id) =>
  api.delete("/invoice/delete-invoice/" + id);

export const generateDraftInvoice = (data) =>
  api.post("/invoice/generate-draft-invoice", data);

export const generateFinalInvoice = (data) =>
  api.post("/invoice/generate-final-invoice", data);

export const getInvoicePdfUrl = (invoiceId) =>
  api.get(`/invoice/pdf/${invoiceId}`);

export const getInvoiceCsvUrl = (invoiceId) =>
  api.get(`/invoice/csv/${invoiceId}`);

export const generateBankRemittance = (data) =>
  api.post("/invoice/generate-bank-remittance", data);

export const generateInvoiceSummary = (data) =>
  api.post("/invoice/generate-invoice-summary", data);

export const regenerateInvoice = (data) =>
  api.post("/invoice/regenerate-invoice", {
    invoiceId: data,
  });

export const generateDetailedInvoiceSummary = (data) =>
  api.post("/invoice/generate-detailed-invoice-summary", data);

export const bulkUpdateInvoicesToPaid = (data) =>
  api.post("/invoice/bulk-update-invoices-to-paid", data);

export const generateCollectiveBankRemittance = (data) =>
  api.post("/invoice/generate-collective-bank-remittance", data);

export const generateCollectiveInvoiceSummary = (data) => 
  api.post("/invoice/generate-collective-invoice-summary", data);

export const generateCollectiveDetailedInvoiceSummary = (data) =>
  api.post("/invoice/generate-collective-detailed-invoice-summary", data);
