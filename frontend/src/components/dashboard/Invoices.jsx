"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import PaidCustomDropdown from "../layout/PaidCustomDropdown";
import {
  fetchAllInvoices,
  getInvoicePdfUrl,
  getInvoiceCsvUrl,
  updateInvoice,
  fetchSingleInvoice,
  generateBankRemittance,
  generateInvoiceSummary,
  generateFinalInvoice,
  regenerateInvoice,
  generateDetailedInvoiceSummary,
  bulkUpdateInvoicesToPaid,
  // ── NEW ──────────────────────────────────────────────────────────────────
  generateCollectiveInvoiceSummary,
  generateCollectiveBankRemittance,
  generateCollectiveDetailedInvoiceSummary,
} from "@/lib/api/invoice.api";
import Loader from "./Loader";
import { calculatePageNumbers } from "@/utils/helpers";
import { InvoicePreviewModal } from "./InvoicePreviewModal";
import { DateRangeModal } from "./DateRangeModal";

function Invoices() {
  const router = useRouter();

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [downloadingId, setDownloadingId] = useState(null);
  const [regeneratingId, setRegeneratingId] = useState(null);
  const [draftInvoice, setDraftInvoice] = useState(null);

  // Bulk selection states
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [bulkUpdating, setBulkUpdating] = useState(false);

  // Modal states
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [adjustmentModalOpen, setAdjustmentModalOpen] = useState(false);
  const [finalLoading, setFinalLoading] = useState(false);

  // Only additional_charges is editable
  const [additionalCharges, setAdditionalCharges] = useState(0);

  // Date Range Modal states
  const [isBankRemittanceModalOpen, setIsBankRemittanceModalOpen] =
    useState(false);
  const [isInvoiceSummaryModalOpen, setIsInvoiceSummaryModalOpen] =
    useState(false);
  const [
    isCollectiveInvoiceSummaryModalOpen,
    setIsCollectiveInvoiceSummaryModalOpen,
  ] = useState(false);

  const [generatingCollectiveSummary, setGeneratingCollectiveSummary] =
    useState(false);

  const [
    isDetailedInvoiceSummaryModalOpen,
    setIsDetailedInvoiceSummaryModalOpen,
  ] = useState(false);

  const [
    isCollectiveDetailedSummaryModalOpen,
    setIsCollectiveDetailedSummaryModalOpen,
  ] = useState(false);
  const [
    generatingCollectiveDetailedSummary,
    setGeneratingCollectiveDetailedSummary,
  ] = useState(false);

  const [generatingRemittance, setGeneratingRemittance] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [generatingDetailedSummary, setGeneratingDetailedSummary] =
    useState(false);

  // ── NEW: Collective Bank Remittance modal state ───────────────────────────
  const [isCollectiveRemittanceModalOpen, setIsCollectiveRemittanceModalOpen] =
    useState(false);
  const [generatingCollectiveRemittance, setGeneratingCollectiveRemittance] =
    useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalCount: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });

  // Fetch invoices
  const fetchInvoicesData = useCallback(async () => {
    try {
      setLoading(true);
      setSelectedInvoices([]);
      setSelectAll(false);

      const params = { page: currentPage, limit };
      if (searchTerm) params.search = searchTerm;
      if (fromDate) params.from_date = fromDate;
      if (toDate) params.to_date = toDate;

      const response = await fetchAllInvoices(params);

      if (response.data.success) {
        setInvoices(response.data.data);
        if (response.data.pagination) setPagination(response.data.pagination);
      } else {
        toast.error(response.data.message || "Failed to fetch invoices");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch invoices");
    } finally {
      setLoading(false);
    }
  }, [currentPage, limit, searchTerm, fromDate, toDate]);

  useEffect(() => {
    fetchInvoicesData();
  }, [fetchInvoicesData]);

  // Keep selectAll in sync with individual selections
  useEffect(() => {
    if (invoices.length > 0 && selectedInvoices.length === invoices.length) {
      setSelectAll(true);
    } else {
      setSelectAll(false);
    }
  }, [selectedInvoices, invoices]);

  // Bulk selection handlers
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedInvoices([]);
    } else {
      setSelectedInvoices(invoices.map((inv) => inv.id));
    }
    setSelectAll(!selectAll);
  };

  const handleSelectInvoice = (id) => {
    setSelectedInvoices((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  // Bulk mark as paid
  const handleBulkMarkAsPaid = async () => {
    if (selectedInvoices.length === 0) {
      toast.error("Please select invoices to update");
      return;
    }
    try {
      setBulkUpdating(true);
      const response = await bulkUpdateInvoicesToPaid({
        invoiceIds: selectedInvoices,
      });
      if (response?.data?.success) {
        toast.success(`${selectedInvoices.length} invoice(s) marked as Paid`);
        setInvoices((prev) =>
          prev.map((inv) =>
            selectedInvoices.includes(inv.id) ? { ...inv, is_paid: true } : inv,
          ),
        );
        setSelectedInvoices([]);
        setSelectAll(false);
      } else {
        toast.error(response?.data?.message || "Bulk update failed");
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Bulk update failed");
    } finally {
      setBulkUpdating(false);
    }
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= pagination.totalPages) {
      setCurrentPage(page);
    }
  };

  const handleLimitChange = (newLimit) => {
    setLimit(Number(newLimit));
    setCurrentPage(1);
  };

  const handleFromDateChange = (value) => {
    setFromDate(value);
    setCurrentPage(1);
  };
  const handleToDateChange = (value) => {
    setToDate(value);
    setCurrentPage(1);
  };
  const handleClearFilters = () => {
    setSearchTerm("");
    setFromDate("");
    setToDate("");
    setCurrentPage(1);
  };

  // ── Helper: trigger a programmatic file download from a URL ──────────────
  const triggerDownload = (url, filename) => {
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    link.setAttribute("target", "_blank");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Bank Remittance (existing — unchanged)
  const handleGenerateBankRemittance = async (
    startDate,
    endDate,
    format = "csv",
  ) => {
    try {
      setGeneratingRemittance(true);
      const response = await generateBankRemittance({
        start_date: startDate,
        end_date: endDate,
        format,
      });
      if (response?.data?.success) {
        const link = document.createElement("a");
        link.href = response.data.data?.url || response.data.data;
        link.setAttribute(
          "download",
          `bank-remittance-${startDate}-to-${endDate}.${format}`,
        );
        link.setAttribute("target", "_blank");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(
          `Bank Remittance ${format.toUpperCase()} downloaded successfully`,
        );
        setIsBankRemittanceModalOpen(false);
      }
    } catch (error) {
      const status = error?.response?.status;
      const message = error?.response?.data?.message;
      if (status === 400 || status === 404) {
        toast.error(message || "No invoices found for the selected date range");
        return;
      }
      toast.error("Something went wrong while generating Bank Remittance");
    } finally {
      setGeneratingRemittance(false);
    }
  };

  // ── NEW: Collective Bank Remittance ───────────────────────────────────────
  // The API returns a single merged URL containing both regular and self-driver
  // invoices — same response shape as the existing Bank Remittance endpoint.
  const handleGenerateCollectiveBankRemittance = async (
    startDate,
    endDate,
    format = "csv",
  ) => {
    try {
      setGeneratingCollectiveRemittance(true);
      const response = await generateCollectiveBankRemittance({
        start_date: startDate,
        end_date: endDate,
        format,
      });

      if (response?.data?.success) {
        const link = document.createElement("a");
        link.href = response.data.data?.url || response.data.data;
        link.setAttribute(
          "download",
          `bank-remittance-collective-${startDate}-to-${endDate}.${format}`,
        );
        link.setAttribute("target", "_blank");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(
          `Collective Bank Remittance ${format.toUpperCase()} downloaded successfully`,
        );
        setIsCollectiveRemittanceModalOpen(false);
      }
    } catch (error) {
      const status = error?.response?.status;
      const message = error?.response?.data?.message;
      if (status === 400 || status === 404) {
        toast.error(message || "No invoices found for the selected date range");
        return;
      }
      toast.error(
        "Something went wrong while generating Collective Bank Remittance",
      );
    } finally {
      setGeneratingCollectiveRemittance(false);
    }
  };

  // Invoice Summary (unchanged)
  const handleGenerateInvoiceSummary = async (startDate, endDate, format) => {
    try {
      setGeneratingSummary(true);
      const response = await generateInvoiceSummary({
        start_date: startDate,
        end_date: endDate,
        format,
      });
      if (response?.data?.success && response?.data?.statusCode === 200) {
        const link = document.createElement("a");
        link.href = response.data.data.url || response.data.data;
        link.setAttribute(
          "download",
          `invoice-summary-${startDate}-to-${endDate}.${format}`,
        );
        link.setAttribute("target", "_blank");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(
          `Invoice Summary ${format.toUpperCase()} downloaded successfully`,
        );
        setIsInvoiceSummaryModalOpen(false);
      } else {
        toast.error(
          response?.data?.message || "Failed to generate Invoice Summary",
        );
      }
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to generate Invoice Summary",
      );
    } finally {
      setGeneratingSummary(false);
    }
  };

  const handleGenerateCollectiveInvoiceSummary = async (
    startDate,
    endDate,
    format,
  ) => {
    try {
      setGeneratingCollectiveSummary(true);

      const response = await generateCollectiveInvoiceSummary({
        start_date: startDate,
        end_date: endDate,
        format,
      });

      if (response?.data?.success && response?.data?.statusCode === 200) {
        const link = document.createElement("a");
        link.href = response.data.data.url || response.data.data;
        link.setAttribute(
          "download",
          `invoice-collective-summary-${startDate}-to-${endDate}.${format}`,
        );
        link.setAttribute("target", "_blank");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(
          `Invoice Summary ${format.toUpperCase()} downloaded successfully`,
        );
        setIsCollectiveInvoiceSummaryModalOpen(false);
      } else {
        toast.error(
          response?.data?.message || "Failed to generate Invoice Summary",
        );
      }
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          "Failed to generate Collective Invoice Summary" + error,
      );
    } finally {
      setGeneratingCollectiveSummary(false);
    }
  };

  // Detailed Invoice Summary (unchanged)
  const handleGenerateDetailedInvoiceSummary = async (
    startDate,
    endDate,
    format,
  ) => {
    try {
      setGeneratingDetailedSummary(true);
      const response = await generateDetailedInvoiceSummary({
        start_date: startDate,
        end_date: endDate,
        format,
      });
      if (response?.data?.success && response?.data?.statusCode === 200) {
        const link = document.createElement("a");
        link.href = response.data.data.url || response.data.data;
        link.setAttribute(
          "download",
          `detailed-invoice-summary-${startDate}-to-${endDate}.${format}`,
        );
        link.setAttribute("target", "_blank");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(
          `Detailed Invoice Summary ${format.toUpperCase()} downloaded successfully`,
        );
        setIsDetailedInvoiceSummaryModalOpen(false);
      } else {
        toast.error(
          response?.data?.message ||
            "Failed to generate Detailed Invoice Summary",
        );
      }
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          "Failed to generate Detailed Invoice Summary",
      );
    } finally {
      setGeneratingDetailedSummary(false);
    }
  };

  const handleGenerateCollectiveDetailedInvoiceSummary = async (
    startDate,
    endDate,
    format,
  ) => {
    try {
      setGeneratingCollectiveDetailedSummary(true);
      const response = await generateCollectiveDetailedInvoiceSummary({
        start_date: startDate,
        end_date: endDate,
        format,
      });
      if (response?.data?.success) {
        const rawUrl = response.data.data?.url;
        const resolvedUrl = rawUrl?.startsWith("http")
          ? rawUrl
          : `${process.env.NEXT_PUBLIC_API_URL}${rawUrl}`;
        const link = document.createElement("a");
        link.href = resolvedUrl;
        link.setAttribute(
          "download",
          `collective-detailed-summary-${startDate}-to-${endDate}.${format}`,
        );
        link.setAttribute("target", "_blank");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(
          `Collective Detailed Summary ${format.toUpperCase()} downloaded successfully`,
        );
        setIsCollectiveDetailedSummaryModalOpen(false);
      } else {
        toast.error(
          response?.data?.message ||
            "Failed to generate Collective Detailed Summary",
        );
      }
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          "Failed to generate Collective Detailed Summary",
      );
    } finally {
      setGeneratingCollectiveDetailedSummary(false);
    }
  };

  const handlePreviewInvoice = async (invoiceId) => {
    try {
      setPreviewLoading(true);
      setIsPreviewModalOpen(true);
      const response = await fetchSingleInvoice(invoiceId);
      if (response.data.success) {
        setSelectedInvoice(response.data.data);
      } else {
        toast.error(response.data.message || "Failed to fetch invoice details");
        setIsPreviewModalOpen(false);
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to fetch invoice details",
      );
      setIsPreviewModalOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleClosePreviewModal = () => {
    setIsPreviewModalOpen(false);
    setSelectedInvoice(null);
  };

  const handleUpdatePaidStatus = async (invoiceId, isPaid) => {
    try {
      const response = await updateInvoice(invoiceId, { is_paid: isPaid });
      if (response.data.success) {
        toast.success(
          `Invoice marked as ${isPaid ? "Paid" : "Unpaid"} successfully`,
        );
        setInvoices((prev) =>
          prev.map((inv) =>
            inv.id === invoiceId ? { ...inv, is_paid: isPaid } : inv,
          ),
        );
        return true;
      } else {
        toast.error(response.data.message || "Failed to update invoice status");
        throw new Error(response.data.message);
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to update invoice status",
      );
      throw error;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      timeZone: "Europe/London",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const handleDownloadInvoice = async (invoiceId) => {
    try {
      setDownloadingId(invoiceId);
      const response = await getInvoicePdfUrl(invoiceId);
      if (response?.data?.success && response?.data?.statusCode === 200) {
        window.open(response.data.data.url, "_blank");
        toast.success("Invoice PDF opened successfully");
        return true;
      } else {
        toast.error(response?.data?.message || "Failed to download invoice");
        throw new Error(response?.data?.message);
      }
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to download invoice",
      );
      throw error;
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadInvoiceCsv = async (invoiceId) => {
    try {
      setDownloadingId(invoiceId);
      const response = await getInvoiceCsvUrl(invoiceId);
      if (response?.data?.success && response?.data?.statusCode === 200) {
        const link = document.createElement("a");
        link.href = response.data.data.url;
        link.setAttribute("download", `invoice-${invoiceId}.csv`);
        link.setAttribute("target", "_blank");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Invoice CSV downloaded successfully");
        return true;
      } else {
        toast.error(
          response?.data?.message || "Failed to download invoice CSV",
        );
        throw new Error(response?.data?.message);
      }
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to download invoice CSV",
      );
      throw error;
    } finally {
      setDownloadingId(null);
    }
  };

  const handleRegenerateInvoice = async (invoiceId) => {
    try {
      setRegeneratingId(invoiceId);
      const response = await regenerateInvoice(invoiceId);
      if (response?.data?.success) {
        toast.success(
          response.data.message || "Invoice regenerated successfully",
        );
        fetchInvoicesData();
        return true;
      } else {
        toast.error(response?.data?.message || "Failed to regenerate invoice");
        throw new Error(response?.data?.message);
      }
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to regenerate invoice",
      );
      throw error;
    } finally {
      setRegeneratingId(null);
    }
  };

  const calculateTotals = () => {
    if (!draftInvoice) return null;

    const adminFee = Number(draftInvoice.admin_fee) || 0;
    const vehicleHire = Number(draftInvoice.vehicle_hire_charges) || 0;
    const insurance = Number(draftInvoice.insurance_charge) || 0;
    const fuel = Number(draftInvoice.fuel_charge) || 0;

    const additional = Number(additionalCharges) || 0;

    const adminVatPercent = Number(draftInvoice.driver?.vat_percent) || 0;
    const vehicleVatPercent =
      Number(draftInvoice.driver?.vehicle_vat_percent) || 0;
    const insuranceVatPercent =
      Number(draftInvoice.driver?.insurance_vat_percent) || 0;
    const fuelVatPercent = Number(draftInvoice.driver?.fuel_vat_percent) || 0;

    const adminVat = (adminFee * adminVatPercent) / 100;
    const vehicleVat = (vehicleHire * vehicleVatPercent) / 100;
    const insuranceVat = (insurance * insuranceVatPercent) / 100;
    const fuelVat = (fuel * fuelVatPercent) / 100;

    const totalVatAmount = adminVat + vehicleVat + insuranceVat + fuelVat;
    const totalCharges = adminFee + vehicleHire + insurance + fuel;
    const existingTotalDeductions = Number(draftInvoice.total_deductions) || 0;
    const totalDeductions = existingTotalDeductions + additional;
    const docketTotal = Number(draftInvoice.docket_total) || 0;
    const carryForwardTotal = Number(draftInvoice.carried_forward_total) || 0;
    const finalTotal = docketTotal - totalDeductions - carryForwardTotal;

    return {
      adminFee,
      adminVatPercent,
      adminVat,
      vehicleHire,
      vehicleVatPercent,
      vehicleVat,
      insurance,
      insuranceVatPercent,
      insuranceVat,
      fuel,
      fuelVatPercent,
      fuelVat,
      additional,
      totalCharges,
      totalVatAmount,
      existingTotalDeductions,
      totalDeductions,
      docketTotal,
      carryForwardTotal,
      finalTotal,
    };
  };

  const totals = calculateTotals();

  const handleCloseAdjustmentModal = () => {
    setAdjustmentModalOpen(false);
    setDraftInvoice(null);
    setAdditionalCharges(0);
  };

  const handleAdjustment = async (invoiceId) => {
    try {
      const response = await fetchSingleInvoice(invoiceId);
      if (response.data.success) {
        const invoice = response.data.data;
        setDraftInvoice(invoice);
        setAdditionalCharges(Number(invoice.additional_charges) || 0);
        setAdjustmentModalOpen(true);
      } else {
        toast.error(response.data.message || "Failed to fetch invoice details");
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to fetch invoice details",
      );
    }
  };

  const handleGenerateFinalInvoice = async () => {
    try {
      setFinalLoading(true);
      const response = await generateFinalInvoice({
        invoice_id: draftInvoice.id,
        admin_fee: Number(draftInvoice.admin_fee) || 0,
        vehicle_hire_charges: Number(draftInvoice.vehicle_hire_charges) || 0,
        insurance_charge: Number(draftInvoice.insurance_charge) || 0,
        fuel_charge: Number(draftInvoice.fuel_charge) || 0,
        additional_charges: Number(additionalCharges) || 0,
        total_deduction: parseFloat(totals?.totalDeductions?.toFixed(2)) || 0,
      });
      if (response.data.success && response.data.statusCode === 200) {
        toast.success(
          response.data.message || "Invoice generated successfully",
        );
        handleCloseAdjustmentModal();
        fetchInvoicesData();
      } else {
        toast.error(
          response.data.message || "Failed to generate final invoice",
        );
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Error generating final invoice",
      );
    } finally {
      setFinalLoading(false);
    }
  };

  const getPageNumbers = () =>
    calculatePageNumbers(pagination.totalPages, currentPage);

  return (
    <div>
      {/* Modals */}
      <InvoicePreviewModal
        isOpen={isPreviewModalOpen}
        onClose={handleClosePreviewModal}
        invoice={selectedInvoice}
        loading={previewLoading}
      />
      <DateRangeModal
        isOpen={isBankRemittanceModalOpen}
        onClose={() => setIsBankRemittanceModalOpen(false)}
        title="Bank Remittance"
        onGenerate={handleGenerateBankRemittance}
        loading={generatingRemittance}
        supportedFormats={["csv", "pdf"]}
      />

      {/* ── NEW: Collective Bank Remittance modal ─────────────────────────── */}
      <DateRangeModal
        isOpen={isCollectiveRemittanceModalOpen}
        onClose={() => setIsCollectiveRemittanceModalOpen(false)}
        title="Collective Bank Remittance"
        onGenerate={handleGenerateCollectiveBankRemittance}
        loading={generatingCollectiveRemittance}
        supportedFormats={["csv", "pdf"]}
      />

      <DateRangeModal
        isOpen={isInvoiceSummaryModalOpen}
        onClose={() => setIsInvoiceSummaryModalOpen(false)}
        title="Invoice Summary"
        onGenerate={handleGenerateInvoiceSummary}
        loading={generatingSummary}
        supportedFormats={["csv", "pdf"]}
      />
      <DateRangeModal
        isOpen={isDetailedInvoiceSummaryModalOpen}
        onClose={() => setIsDetailedInvoiceSummaryModalOpen(false)}
        title="Detailed Invoice Summary"
        onGenerate={handleGenerateDetailedInvoiceSummary}
        loading={generatingDetailedSummary}
        supportedFormats={["csv", "pdf"]}
      />
      <DateRangeModal
        isOpen={isCollectiveInvoiceSummaryModalOpen}
        onClose={() => setIsCollectiveInvoiceSummaryModalOpen(false)}
        title="Collective Invoice Summary"
        onGenerate={handleGenerateCollectiveInvoiceSummary}
        loading={generatingCollectiveSummary}
        supportedFormats={["csv", "pdf"]}
      />

      <DateRangeModal
        isOpen={isCollectiveDetailedSummaryModalOpen}
        onClose={() => setIsCollectiveDetailedSummaryModalOpen(false)}
        title="Collective Detailed Summary"
        onGenerate={handleGenerateCollectiveDetailedInvoiceSummary}
        loading={generatingCollectiveDetailedSummary}
        supportedFormats={["csv", "pdf"]}
      />

      <section>
        {/* ── Top filter bar ─────────────────────────────────────── */}
        <div className=" xl:flex-nowrap items-center justify-between gap-[20px] mb-6">
          {/* Left: filters + search */}
          <div className="flex flex-col items-start sm:flex-row sm:items-center flex-wrap xl:flex-nowrap gap-[20px] w-full ">
            <span className="text-[20px] font-bold">Filter:</span>

            <div className="flex w-full sm:w-[fit-content] flex-col sm:flex-row md:flex-nowrap flex-wrap items-center gap-[10px]">
              <div className="relative w-full">
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => handleFromDateChange(e.target.value)}
                  onKeyDown={(e) => e.preventDefault()}
                  className="py-[10px] px-[16px] w-full sm:w-[155px] rounded-[6px] border border-[#22358114] focus-visible:!outline-0 duration-300 focus-visible:border-[#515151] text-[#B4B4B4] text-[16px] font-normal"
                />
              </div>
              <p className="text-[#515151]">To</p>
              <div className="relative w-full sm:w-[155px]">
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => handleToDateChange(e.target.value)}
                  onKeyDown={(e) => e.preventDefault()}
                  className="py-[10px] px-[16px] w-full sm:w-[155px] rounded-[6px] border border-[#22358114] focus-visible:!outline-0 duration-300 focus-visible:border-[#515151] text-[#B4B4B4] text-[16px] font-normal"
                />
              </div>
            </div>

            <div className="relative w-full sm:w-[155px]">
              <button
                onClick={handleClearFilters}
                className="whitespace-nowrap group flex justify-center items-center gap-[5px] rounded-[6px] bg-secondary border border-secondary hover:text-secondary hover:bg-secondary/20 duration-300 cursor-pointer w-full sm:w-[fit-content] min-w-[100px] px-[25px] py-[10px] text-sm font-semibold leading-normal text-white transition"
              >
                Clear Filter
              </button>
            </div>

            <div className="relative w-full lg:max-w-[600px] ">
              <input
                type="text"
                placeholder="Search by name, callsign, status..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="py-[10px] pl-[16px] pr-[60px] w-full rounded-md border border-[#22358114] focus-visible:!outline-0 duration-300 focus-visible:border-[#515151] text-[#B4B4B4] text-[16px] font-normal"
              />
              <svg
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          {/* Right: bulk action + report buttons */}
          <div className="w-full flex flex-wrap xl:flex-nowrap items-center mt-5 gap-3 ">
            {selectedInvoices.length > 0 && (
              <button
                onClick={handleBulkMarkAsPaid}
                disabled={bulkUpdating}
                className="whitespace-nowrap group flex justify-center items-center gap-[5px] rounded-[6px] bg-[#009249] border border-[#009249] hover:text-[#009249] hover:bg-[#009249]/20 duration-300 cursor-pointer w-full sm:w-[fit-content] min-w-[100px] px-[25px] py-[10px] text-sm font-semibold leading-normal text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bulkUpdating ? (
                  <svg
                    className="animate-spin h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-[15px] h-[15px]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
                Mark Paid ({selectedInvoices.length})
              </button>
            )}

            {/* Existing: Bank Remittance (regular drivers only) */}
            <button
              onClick={() => setIsBankRemittanceModalOpen(true)}
              className="whitespace-nowrap group flex justify-center items-center gap-[5px] rounded-[6px] bg-primary border border-primary hover:bg-primary/20 hover:text-primary duration-300 w-full sm:w-[fit-content] px-[25px] py-[10px] min-w-[100px] text-sm font-semibold leading-normal text-white cursor-pointer transition"
            >
              <svg
                className="w-[15px] h-[15px]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                />
              </svg>
              Bank Remittance
            </button>

            <button
              onClick={() => setIsInvoiceSummaryModalOpen(true)}
              className="whitespace-nowrap group flex justify-center items-center gap-[5px] rounded-[6px] bg-secondary border border-secondary hover:text-secondary hover:bg-secondary/20 duration-300 cursor-pointer w-full sm:w-[fit-content] min-w-[100px] px-[25px] py-[10px] text-sm font-semibold leading-normal text-white transition"
            >
              <svg
                className="w-[15px] h-[15px]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Invoice Summary
            </button>

            <button
              onClick={() => setIsDetailedInvoiceSummaryModalOpen(true)}
              className="whitespace-nowrap group flex justify-center items-center gap-[5px] rounded-[6px] bg-[#009249] border border-[#009249] hover:text-[#009249] hover:bg-[#009249]/20 duration-300 cursor-pointer w-full sm:w-[fit-content] min-w-[100px] px-[25px] py-[10px] text-sm font-semibold leading-normal text-white transition"
            >
              <svg
                className="w-[15px] h-[15px]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Detailed Summary
            </button>
            {/* ── NEW: Collective Bank Remittance (drivers + self-drivers) ── */}
            <button
              onClick={() => setIsCollectiveRemittanceModalOpen(true)}
              className="whitespace-nowrap group flex justify-center items-center gap-[5px] rounded-[6px] bg-primary border border-primary hover:bg-primary/20 hover:text-primary duration-300 w-full sm:w-[fit-content] px-[25px] py-[10px] min-w-[100px] text-sm font-semibold leading-normal text-white cursor-pointer transition"
            >
              <svg
                className="w-[15px] h-[15px]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                />
                {/* Second card offset to visually signal "collective" */}
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 6h18"
                />
              </svg>
              Collective Remittance
            </button>

            <button
              onClick={() => setIsCollectiveInvoiceSummaryModalOpen(true)}
              className="whitespace-nowrap group flex justify-center items-center gap-[5px] rounded-[6px] bg-secondary border border-secondary hover:text-secondary hover:bg-secondary/20 duration-300 cursor-pointer w-full sm:w-[fit-content] min-w-[100px] px-[25px] py-[10px] text-sm font-semibold leading-normal text-white transition"
            >
              <svg
                className="w-[15px] h-[15px]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Collective Summary
            </button>

            <button
              onClick={() => setIsCollectiveDetailedSummaryModalOpen(true)}
              className="whitespace-nowrap group flex justify-center items-center gap-[5px] rounded-[6px] bg-[#009249] border border-[#009249] hover:text-[#009249] hover:bg-[#009249]/20 duration-300 cursor-pointer w-full sm:w-[fit-content] min-w-[100px] px-[25px] py-[10px] text-sm font-semibold leading-normal text-white transition"
            >
              <svg
                className="w-[15px] h-[15px]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Collective Detailed
            </button>
          </div>
        </div>

        {/* ── Show entries per page bar ── */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-[16px] text-[#515151] font-medium">Show</span>
            <select
              value={limit}
              onChange={(e) => handleLimitChange(Number(e.target.value))}
              className="py-[8px] px-[12px] rounded-[6px] border border-[#22358114] focus-visible:!outline-0 duration-300 focus-visible:border-[#515151] text-[#515151] text-[16px] font-normal bg-white cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
              <option value={500}>500</option>
            </select>
            <span className="text-[16px] text-[#515151] font-medium">
              entries per page
            </span>
          </div>

          {invoices.length > 0 && (
            <div className="text-sm text-[#515151]">
              Showing {(currentPage - 1) * limit + 1} to{" "}
              {Math.min(currentPage * limit, pagination.totalCount)} of{" "}
              {pagination.totalCount} invoices
            </div>
          )}
        </div>

        {/* ── Table ─────────────────────────────────────────────── */}
        <div className="w-full overflow-x-scroll">
          <table className="w-full border-separate border-spacing-y-3">
            <thead className="text-[16px] sm:text-[18px] 2xl:text-[20px] font-bold">
              <tr>
                <th className="px-[20px]">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={handleSelectAll}
                    className="w-5 h-5 cursor-pointer accent-primary"
                  />
                </th>
                <th>#ID</th>
                <th className="text-left px-[20px] py-[5px] whitespace-nowrap">
                  Invoice ID
                </th>
                <th className="text-left px-[20px] py-[5px] whitespace-nowrap">
                  Driver
                </th>
                <th className="text-left px-[20px] py-[5px] whitespace-nowrap">
                  Callsign
                </th>
                <th className="text-left px-[20px] py-[5px] whitespace-nowrap">
                  Date Range
                </th>
                <th className="text-left px-[20px] py-[5px] whitespace-nowrap">
                  Final Total
                </th>
                <th className="text-left px-[20px] py-[5px] whitespace-nowrap">
                  Invoice Status
                </th>
                <th className="text-left px-[20px] py-[5px] whitespace-nowrap">
                  Payment Status
                </th>
                <th className="text-left px-[20px] py-[5px] whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="text-[16px] text-normal text-[#515151]">
              {loading ? (
                <tr className="bg-white">
                  <td colSpan={10} className="py-[20px] text-center">
                    <Loader text="Fetching invoices..." />
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr className="bg-white">
                  <td colSpan={10} className="py-[20px] text-center">
                    No invoices found
                  </td>
                </tr>
              ) : (
                invoices.map((invoice, index) => (
                  <tr key={invoice.id} className="bg-white">
                    <td className="px-[20px] py-[20px] border-y border-[#22358114] border-l rounded-l-[15px]">
                      <input
                        type="checkbox"
                        checked={selectedInvoices.includes(invoice.id)}
                        onChange={() => handleSelectInvoice(invoice.id)}
                        className="w-5 h-5 cursor-pointer accent-primary"
                      />
                    </td>
                    <td className="px-[20px] py-[20px] border-y border-[#22358114]">
                      {(currentPage - 1) * limit + index + 1}
                    </td>
                    <td className="px-[20px] py-[20px] border-y border-[#22358114] whitespace-nowrap">
                      #{invoice.id?.slice(-6).toUpperCase()}
                    </td>
                    <td className="px-[20px] py-[20px] border-y border-[#22358114] whitespace-nowrap font-semibold">
                      {invoice.driver?.name || "N/A"}
                    </td>
                    <td className="px-[20px] py-[20px] border-y border-[#22358114] whitespace-nowrap">
                      {invoice.driver?.call_sign || "N/A"}
                    </td>
                    <td className="px-[20px] py-[20px] border-y border-[#22358114] whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm">
                          {formatDate(invoice.start_date)}
                        </span>
                        <span className="text-xs text-gray-400">to</span>
                        <span className="text-sm">
                          {formatDate(invoice.end_date)}
                        </span>
                      </div>
                    </td>
                    <td className="px-[20px] py-[20px] border-y border-[#22358114] whitespace-nowrap">
                      £
                      {Number(
                        invoice.old_per_hour_rate * invoice.old_total_hours,
                      ).toFixed(2)}
                    </td>
                    <td className="px-[20px] py-[20px] border-y border-[#22358114]">
                      <span
                        className={`text-sm font-medium ${invoice.status !== "DRAFT" ? "text-[#009249]" : "text-[#C00000]"}`}
                      >
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-[20px] py-[20px] border-y border-[#22358114]">
                      <span
                        className={`text-sm font-medium px-3 py-1 rounded-full ${invoice.is_paid ? "text-[#009249] bg-[#009249]/10" : "text-[#C00000] bg-[#C00000]/10"}`}
                      >
                        {invoice.is_paid ? "Paid" : "Unpaid"}
                      </span>
                    </td>
                    <td className="px-[20px] py-[20px] border-y border-[#22358114] border-r rounded-r-[15px] whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        {invoice.status != "DRAFT" && (
                          <button
                            onClick={() => handlePreviewInvoice(invoice.id)}
                            className="p-2 hover:bg-blue-50 rounded-lg transition-colors group"
                            title="Preview Invoice"
                          >
                            <svg
                              className="w-5 h-5 text-blue-500 group-hover:text-blue-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                              />
                            </svg>
                          </button>
                        )}
                        <PaidCustomDropdown
                          invoice={invoice}
                          onDownload={handleDownloadInvoice}
                          onDownloadCsv={handleDownloadInvoiceCsv}
                          onStatusUpdate={(isPaid) =>
                            handleUpdatePaidStatus(invoice.id, isPaid)
                          }
                          onAdjustment={() => handleAdjustment(invoice.id)}
                          onRegenerate={() =>
                            handleRegenerateInvoice(invoice.id)
                          }
                          isDownloading={downloadingId === invoice.id}
                          isRegenerating={regeneratingId === invoice.id}
                          isFinalInvoice={invoice.status !== "DRAFT"}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        {invoices.length > 0 && (
          <div className="flex items-center justify-center mt-8">
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={!pagination.hasPrevPage}
                className={`group px-3 border w-[40px] h-[40px] rounded-[50%] text-sm duration-300 flex items-center justify-center ${
                  !pagination.hasPrevPage
                    ? "opacity-50 cursor-not-allowed border-[#22358114]"
                    : "border-[#22358114] hover:border-secondary hover:bg-secondary"
                }`}
              >
                <svg
                  width="7"
                  height="12"
                  viewBox="0 0 7 12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M5.63267 10.8552C5.58042 10.9109 5.50943 10.9424 5.43524 10.9428C5.39842 10.9432 5.36191 10.9356 5.32796 10.9205C5.29401 10.9055 5.26333 10.8832 5.2378 10.8552L0.582305 5.93362C0.556159 5.90634 0.5354 5.87384 0.52123 5.83801C0.507061 5.80219 0.499764 5.76374 0.499764 5.7249C0.499764 5.68607 0.507061 5.64762 0.52123 5.61179C0.5354 5.57596 0.556159 5.54346 0.582305 5.51618L5.2378 0.593579C5.2634 0.564651 5.29424 0.541462 5.32849 0.525392C5.36274 0.509323 5.3997 0.500701 5.43716 0.500041C5.47463 0.499381 5.51184 0.506695 5.54658 0.521548C5.58131 0.536402 5.61287 0.558491 5.63937 0.586502C5.66586 0.614512 5.68676 0.647871 5.70081 0.684594C5.71486 0.721316 5.72178 0.760652 5.72115 0.800259C5.72053 0.839866 5.71237 0.878936 5.69717 0.915143C5.68197 0.951349 5.66004 0.983954 5.63267 1.01101L1.17461 5.7249L5.63267 10.4377C5.6587 10.4651 5.67935 10.4976 5.69345 10.5334C5.70754 10.5693 5.7148 10.6077 5.7148 10.6465C5.7148 10.6853 5.70754 10.7237 5.69345 10.7595C5.67935 10.7953 5.6587 10.8278 5.63267 10.8552Z"
                    className="fill-[#C00000] stroke-[#C00000] group-hover:fill-[#fff] group-hover:stroke-[#fff]"
                  />
                </svg>
              </button>

              {getPageNumbers().map((page, index) => (
                <button
                  key={index}
                  onClick={() =>
                    typeof page === "number" && handlePageChange(page)
                  }
                  disabled={page === "..."}
                  className={`inline-flex items-center justify-center px-3 border w-[40px] h-[40px] rounded-[50%] text-sm duration-300 ${
                    page === currentPage
                      ? "border-primary bg-primary text-white"
                      : page === "..."
                        ? "border-transparent cursor-default"
                        : "border-[#22358114] hover:border-primary text-[#515151] hover:text-primary"
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={!pagination.hasNextPage}
                className={`group px-3 border w-[40px] h-[40px] rounded-[50%] text-sm duration-300 flex items-center justify-center ${
                  !pagination.hasNextPage
                    ? "opacity-50 cursor-not-allowed border-[#22358114]"
                    : "border-[#22358114] hover:border-secondary hover:bg-secondary"
                }`}
              >
                <svg
                  width="7"
                  height="12"
                  viewBox="0 0 7 12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M0.58852 10.8552C0.640767 10.9109 0.711764 10.9424 0.785955 10.9428C0.822775 10.9432 0.859278 10.9356 0.893227 10.9205C0.927176 10.9055 0.957857 10.8832 0.983389 10.8552L5.63889 5.93362C5.66503 5.90634 5.68579 5.87384 5.69996 5.83801C5.71413 5.80219 5.72143 5.76374 5.72143 5.7249C5.72143 5.68607 5.71413 5.64762 5.69996 5.61179C5.68579 5.57596 5.66503 5.54346 5.63889 5.51618L0.983389 0.593579C0.957791 0.564651 0.926949 0.541462 0.892699 0.525392C0.85845 0.509323 0.821492 0.500701 0.784026 0.500041C0.74656 0.499381 0.709352 0.506695 0.674614 0.521548C0.639877 0.536402 0.608321 0.558491 0.581825 0.586502C0.555329 0.614512 0.534434 0.647871 0.520384 0.684594C0.506333 0.721316 0.499414 0.760652 0.500039 0.800259C0.500663 0.839866 0.508819 0.878936 0.52402 0.915143C0.53922 0.951349 0.561156 0.983954 0.58852 1.01101L5.04658 5.7249L0.58852 10.4377C0.562494 10.4651 0.541839 10.4976 0.527744 10.5334C0.51365 10.5693 0.506394 10.6077 0.506394 10.6465C0.506394 10.6853 0.51365 10.7237 0.527744 10.7595C0.541839 10.7953 0.562494 10.8278 0.58852 10.8552Z"
                    className="fill-[#C00000] stroke-[#C00000] group-hover:fill-[#fff] group-hover:stroke-[#fff]"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── Adjustment Modal (unchanged) ──────────────────────────────────── */}
      {adjustmentModalOpen && draftInvoice && totals && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            className="relative w-full max-w-[580px] mx-[10px] my-[50px] rounded-xl  max-h-[95vh]  bg-white p-[35px] pt-[40px] overflow-y-scroll no-scrollbar  "
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            <div className="flex items-center justify-between mb-[30px]">
              <h2 className="mx-auto text-[20px] md:text-[24px] lg:text-[34px] 2xl:text-[42px] font-black text-primary">
                Pay Adjustment Detail
              </h2>
              <button
                onClick={handleCloseAdjustmentModal}
                className="w-5 h-5 md:w-8 md:h-8 rounded-full absolute top-[20px] right-[20px] bg-secondary text-white flex items-center justify-center text-lg font-bold"
              >
                <svg
                  viewBox="0 0 14 14"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-[10px] h-[10px] md:w-[14px] md:h-[14px]"
                >
                  <path
                    d="M11.9268 13.4982L6.90334 8.4747L1.78513 13.5929L-0.000174888 11.8076L5.11804 6.6894L0.1192 1.69055L1.72608 0.0836703L6.72493 5.08251L11.8074 2.39727e-06L13.5927 1.7853L8.51023 6.86781L13.5337 11.8913L11.9268 13.4982Z"
                    fill="white"
                  />
                </svg>
              </button>
            </div>

            <div className="text-[14px] sm:text-[16px] font-normal text-[#515151]">
              <div className="bg-blue-50 rounded-lg p-3 mb-4 text-sm">
                <div className="flex justify-between mb-1">
                  <span className="font-semibold">Driver:</span>
                  <span>{draftInvoice.driver?.name || "N/A"}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="font-semibold">Period:</span>
                  <span>
                    {formatDate(draftInvoice.start_date)} -{" "}
                    {formatDate(draftInvoice.end_date)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">Total Dockets:</span>
                  <span>{draftInvoice.total_number_of_dockets}</span>
                </div>
              </div>

              <div className="flex justify-between mb-4 py-[18px] border-y border-[#EEEFF5]">
                <span className="font-bold">Docket Total</span>£{" "}
                {Number(
                  draftInvoice.old_per_hour_rate * draftInvoice.old_total_hours,
                ).toFixed(2)}
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h3 className="font-bold mb-3 text-[#515151]">Fixed Charges</h3>
                <div className="space-y-3 text-sm">
                  <div className="grid grid-cols-4 gap-2 pb-2 border-b border-gray-200 font-semibold text-[12px]">
                    <span>Description</span>
                    <span className="text-right">Amount (£)</span>
                    <span className="text-right">VAT %</span>
                    <span className="text-right">VAT (£)</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 items-center">
                    <span>Admin Fee</span>
                    <span className="text-right">
                      £{totals.adminFee.toFixed(2)}
                    </span>
                    <span className="text-right text-blue-600 font-semibold">
                      {totals.adminVatPercent}%
                    </span>
                    <span className="text-right text-blue-600 font-semibold">
                      £{totals.adminVat.toFixed(2)}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 items-center">
                    <span>Vehicle Hire</span>
                    <span className="text-right">
                      £{totals.vehicleHire.toFixed(2)}
                    </span>
                    <span className="text-right text-blue-600 font-semibold">
                      {totals.vehicleVatPercent}%
                    </span>
                    <span className="text-right text-blue-600 font-semibold">
                      £{totals.vehicleVat.toFixed(2)}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 items-center">
                    <span>Insurance</span>
                    <span className="text-right">
                      £{totals.insurance.toFixed(2)}
                    </span>
                    <span className="text-right text-blue-600 font-semibold">
                      {totals.insuranceVatPercent}%
                    </span>
                    <span className="text-right text-blue-600 font-semibold">
                      £{totals.insuranceVat.toFixed(2)}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 items-center">
                    <span>Fuel</span>
                    <span className="text-right">
                      £{totals.fuel.toFixed(2)}
                    </span>
                    <span className="text-right text-blue-600 font-semibold">
                      {totals.fuelVatPercent}%
                    </span>
                    <span className="text-right text-blue-600 font-semibold">
                      £{totals.fuelVat.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">
                  Additional Charges
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={additionalCharges}
                  onChange={(e) => setAdditionalCharges(Number(e.target.value))}
                  className="w-full border text-[14px] border-[#22358114] rounded px-[20px] py-[10px] focus:border-[#515151] duration-300 focus-visible:!outline-0"
                  placeholder="0.00"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This is the only field you can edit
                </p>
              </div>

              <div className="border-y border-[#EEEFF5] py-3 mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span>Subtotal (excl. VAT)</span>
                  <span>£{totals.totalCharges.toFixed(2)}</span>
                </div>
                <div className="bg-blue-50 rounded p-3 mt-2">
                  <div className="text-xs font-semibold text-blue-900 mb-2">
                    VAT Breakdown by Charge:
                  </div>
                  <div className="space-y-1 text-sm text-blue-800">
                    <div className="flex justify-between">
                      <span>Admin Fee VAT ({totals.adminVatPercent}%)</span>
                      <span>£{totals.adminVat.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>
                        Vehicle Hire VAT ({totals.vehicleVatPercent}%)
                      </span>
                      <span>£{totals.vehicleVat.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Insurance VAT ({totals.insuranceVatPercent}%)</span>
                      <span>£{totals.insuranceVat.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Fuel VAT ({totals.fuelVatPercent}%)</span>
                      <span>£{totals.fuelVat.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-blue-200 font-semibold">
                      <span>Total VAT</span>
                      <span>£{totals.totalVatAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {totals.carryForwardTotal > 0 && (
                <div className="flex justify-between mb-3 text-[15px] text-[#C00000] font-semibold">
                  <span>Previous Carry Forward</span>
                  <span>- £{totals.carryForwardTotal.toFixed(2)}</span>
                </div>
              )}

              <div className="bg-[#22358114] rounded-[15px] p-4 mt-[25px]">
                <div className="space-y-2 text-sm mb-4 pb-4 border-b border-[#515151]/20">
                  <div className="flex justify-between">
                    <span>Subtotal (Charges + Additional)</span>
                    <span>£{totals.totalCharges.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-blue-600 font-semibold">
                    <span>Total VAT</span>
                    <span>£{totals.totalVatAmount.toFixed(2)}</span>
                  </div>
                </div>
                {totals.carryForwardTotal > 0 && (
                  <div className="flex justify-between text-sm mb-3 pb-3 border-b border-[#515151]/20 text-[#C00000]">
                    <span>Carry Forward Deductions</span>
                    <span>- £{totals.carryForwardTotal.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-primary font-bold mb-3">
                  <span>Total Deductions</span>
                  <span>- £{totals.totalDeductions.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-primary font-bold text-lg">
                  <span>Final Total (Payable)</span>
                  <span>
                    £{" "}
                    {Number(
                      draftInvoice.old_per_hour_rate *
                        draftInvoice.old_total_hours,
                    ).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-center gap-3 mt-[28px]">
              <button
                onClick={handleCloseAdjustmentModal}
                className="min-w-[100px] cursor-pointer rounded-[6px] bg-gray-200 border border-gray-200 px-[25px] py-[10px] text-sm font-semibold text-gray-700 hover:bg-gray-300 duration-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateFinalInvoice}
                disabled={finalLoading}
                className="min-w-[100px] cursor-pointer rounded-[6px] bg-secondary border border-secondary px-[25px] py-[10px] text-sm font-semibold text-white hover:bg-secondary/80 duration-300 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {finalLoading ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Generating...
                  </>
                ) : (
                  "Finalize Invoice"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Invoices;
