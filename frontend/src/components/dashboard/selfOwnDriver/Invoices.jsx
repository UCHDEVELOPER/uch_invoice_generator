"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import PaidCustomDropdown from "../../layout/PaidCustomDropdown";
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
} from "@/lib/api/self-own/invoice.api";
import Loader from "../Loader";
import { calculatePageNumbers } from "@/utils/helpers";
import { InvoicePreviewModal } from "../InvoicePreviewModal";
import { DateRangeModal } from "./../DateRangeModal";

// ─── helpers ────────────────────────────────────────────────────────────────

function n(v) {
  return Number(v || 0);
}

function vatAmt(amount, percent) {
  return n(amount) * (n(percent) / 100);
}

function round2(v) {
  return Math.round((n(v) + Number.EPSILON) * 100) / 100;
}

function fmtGBP(v) {
  return `£${round2(v).toFixed(2)}`;
}

function normalizeManualDockets(md) {
  if (!md) return [];
  if (typeof md === "string") {
    try {
      const p = JSON.parse(md);
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }
  return Array.isArray(md) ? md : [];
}

/**
 * Mirrors calculateSelfInvoiceFinancials exactly.
 * additionalOverride lets the UI pass editable additional charge values.
 */
// function calcFinancials(
//   driver,
//   docketTotal,
//   manualDockets = [],
//   additionalOverride = null,
//   draftInvoice
// ) {
//   const d = driver;

//   // standard charges
//   const adminFee = n(d.admin_fee);
//   const vehicleHire = n(d.vehicle_hire_charge);
//   const insurance = n(d.insurance_charge);
//   const fuel = n(d.fuel_charge);
//   const add1 = additionalOverride
//     ? n(additionalOverride.additional_charges_1)
//     : n(d.additional_charges_1);
//   const add2 = additionalOverride
//     ? n(additionalOverride.additional_charges_2)
//     : n(d.additional_charges_2);
//   const add3 = additionalOverride
//     ? n(additionalOverride.additional_charges_3)
//     : n(d.additional_charges_3);

//   const add1VatPct = additionalOverride
//     ? n(additionalOverride.additional_charges_vat_1_percent)
//     : n(d.additional_charges_vat_1_percent);
//   const add2VatPct = additionalOverride
//     ? n(additionalOverride.additional_charges_vat_2_percent)
//     : n(d.additional_charges_vat_2_percent);
//   const add3VatPct = additionalOverride
//     ? n(additionalOverride.additional_charges_vat_3_percent)
//     : n(d.additional_charges_vat_3_percent);

//   // standard VAT
//   const adminVat = vatAmt(adminFee, d.vat_percent);
//   const vehicleVat = vatAmt(vehicleHire, d.vehicle_vat_percent);
//   const insuranceVat = vatAmt(insurance, d.insurance_vat_percent);
//   const fuelVat = vatAmt(fuel, d.fuel_vat_percent);
//   const add1Vat = vatAmt(add1, add1VatPct);
//   const add2Vat = vatAmt(add2, add2VatPct);
//   const add3Vat = vatAmt(add3, add3VatPct);

//   // docket VAT
//   const docketTotalVat = vatAmt(docketTotal, d.docket_total_vat_percent);

//   // carry forward charges
//   const cfAdmin = n(draftInvoice.carry_forward_admin_fee ?? 0);
//   const cfVeh = n(draftInvoice.carry_forward_vehicle_hire_charge);
//   const cfIns = n(draftInvoice.carry_forward_insurance_charge);
//   const cfFuel = n(draftInvoice.carry_forward_fuel_charge);
//   const cfAdd1 = n(draftInvoice.carry_forward_additional_charge_1);
//   const cfAdd2 = n(draftInvoice.carry_forward_additional_charge_2);
//   const cfAdd3 = n(draftInvoice.carry_forward_additional_charge_3);

//   // carry forward VAT
//   const cfAdminVat = vatAmt(cfAdmin, draftInvoice.carry_forward_admin_vat_percent);
//   const cfVehVat = vatAmt(cfVeh, draftInvoice.carry_forward_vehicle_vat_percent);
//   const cfInsVat = vatAmt(cfIns, draftInvoice.carry_forward_insurance_vat_percent);
//   const cfFuelVat = vatAmt(cfFuel, draftInvoice.carry_forward_fuel_vat_percent);
//   const cfAdd1Vat = vatAmt(
//     cfAdd1,
//     draftInvoice.carry_forward_additional_charge_1_vat_percent,
//   );
//   const cfAdd2Vat = vatAmt(
//     cfAdd2,
//     draftInvoice.carry_forward_additional_charge_2_vat_percent,
//   );
//   const cfAdd3Vat = vatAmt(
//     cfAdd3,
//     draftInvoice.carry_forward_additional_charge_3_vat_percent,
//   );

//   const cfTotal = cfAdmin + cfVeh + cfIns + cfFuel + cfAdd1 + cfAdd2 + cfAdd3;
//   const cfVatTotal =
//     cfAdminVat +
//     cfVehVat +
//     cfInsVat +
//     cfFuelVat +
//     cfAdd1Vat +
//     cfAdd2Vat +
//     cfAdd3Vat;

//   const standardVatTotal =
//     adminVat +
//     vehicleVat +
//     insuranceVat +
//     fuelVat +
//     add1Vat +
//     add2Vat +
//     add3Vat +
//     cfVatTotal;

//   const standardChargeTotal =
//     adminFee + vehicleHire + insurance + fuel + add1 + add2 + add3 + cfTotal;

//   // manualDockets is pre-normalized; n() coerces string values like "78" → 78
//   const manualDriverTotal = manualDockets.reduce(
//     (s, m) => s + n(m.driver_total),
//     0,
//   );

//   const finalTaxDeduction =
//     standardVatTotal + standardChargeTotal - (manualDriverTotal + docketTotalVat);
    
//   const finalTotal = docketTotal - finalTaxDeduction;

//   return {
//     // standard
//     adminFee,
//     adminVat,
//     adminVatPct: n(d.vat_percent),
//     vehicleHire,
//     vehicleVat,
//     vehicleVatPct: n(d.vehicle_vat_percent),
//     insurance,
//     insuranceVat,
//     insuranceVatPct: n(d.insurance_vat_percent),
//     fuel,
//     fuelVat,
//     fuelVatPct: n(d.fuel_vat_percent),
//     add1,
//     add1Vat,
//     add1VatPct,
//     add2,
//     add2Vat,
//     add2VatPct,
//     add3,
//     add3Vat,
//     add3VatPct,
//     // docket VAT
//     docketTotalVat,
//     docketTotalVatPct: n(d.docket_total_vat_percent),
//     // carry forward
//     cfAdmin,
//     cfAdminVat,
//     cfAdminVatPct: n(draftInvoice.carry_forward_admin_vat_percent),
//     cfVeh,
//     cfVehVat,
//     cfVehVatPct: n(draftInvoice.carry_forward_vehicle_vat_percent),
//     cfIns,
//     cfInsVat,
//     cfInsVatPct: n(draftInvoice.carry_forward_insurance_vat_percent),
//     cfFuel,
//     cfFuelVat,
//     cfFuelVatPct: n(draftInvoice.carry_forward_fuel_vat_percent),
//     cfAdd1,
//     cfAdd1Vat,
//     cfAdd1VatPct: n(draftInvoice.carry_forward_additional_charge_1_vat_percent),
//     cfAdd2,
//     cfAdd2Vat,
//     cfAdd2VatPct: n(draftInvoice.carry_forward_additional_charge_2_vat_percent),
//     cfAdd3,
//     cfAdd3Vat,
//     cfAdd3VatPct: n(draftInvoice.carry_forward_additional_charge_3_vat_percent),
//     cfTotal,
//     cfVatTotal,
//     // totals
//     standardChargeTotal,
//     standardVatTotal,
//     manualDriverTotal,
//     finalTaxDeduction: round2(finalTaxDeduction),
//     finalTotal: round2(finalTotal),
//   };
// }

// ─── sub-components ─────────────────────────────────────────────────────────

function calcFinancials(
  driver,
  docketTotal,
  manualDockets = [],
  additionalOverride = null,
  draftInvoice // kept for signature compatibility; no longer used for carry-forward values
) {
  const d = driver;

  // standard charges
  const adminFee = n(d.admin_fee);
  const vehicleHire = n(d.vehicle_hire_charge);
  const insurance = n(d.insurance_charge);
  const fuel = n(d.fuel_charge);
  const add1 = additionalOverride
    ? n(additionalOverride.additional_charges_1)
    : n(d.additional_charges_1);
  const add2 = additionalOverride
    ? n(additionalOverride.additional_charges_2)
    : n(d.additional_charges_2);
  const add3 = additionalOverride
    ? n(additionalOverride.additional_charges_3)
    : n(d.additional_charges_3);

  const add1VatPct = additionalOverride
    ? n(additionalOverride.additional_charges_vat_1_percent)
    : n(d.additional_charges_vat_1_percent);
  const add2VatPct = additionalOverride
    ? n(additionalOverride.additional_charges_vat_2_percent)
    : n(d.additional_charges_vat_2_percent);
  const add3VatPct = additionalOverride
    ? n(additionalOverride.additional_charges_vat_3_percent)
    : n(d.additional_charges_vat_3_percent);

  // standard VAT
  const adminVat = vatAmt(adminFee, d.vat_percent);
  const vehicleVat = vatAmt(vehicleHire, d.vehicle_vat_percent);
  const insuranceVat = vatAmt(insurance, d.insurance_vat_percent);
  const fuelVat = vatAmt(fuel, d.fuel_vat_percent);
  const add1Vat = vatAmt(add1, add1VatPct);
  const add2Vat = vatAmt(add2, add2VatPct);
  const add3Vat = vatAmt(add3, add3VatPct);

  // docket VAT
  const docketTotalVat = vatAmt(docketTotal, d.docket_total_vat_percent);

  // carry forward charges — sourced from driver, matching backend
  const cfAdmin = n(d.carry_forward_admin_fee);
  const cfVeh = n(d.carry_forward_vehicle_hire_charge);
  const cfIns = n(d.carry_forward_insurance_charge);
  const cfFuel = n(d.carry_forward_fuel_charge);
  const cfAdd1 = n(d.carry_forward_additional_charge_1);
  const cfAdd2 = n(d.carry_forward_additional_charge_2);
  const cfAdd3 = n(d.carry_forward_additional_charge_3);

  // carry forward VAT — sourced from driver, matching backend
  const cfAdminVat = vatAmt(cfAdmin, d.carry_forward_admin_vat_percent);
  const cfVehVat = vatAmt(cfVeh, d.carry_forward_vehicle_vat_percent);
  const cfInsVat = vatAmt(cfIns, d.carry_forward_insurance_vat_percent);
  const cfFuelVat = vatAmt(cfFuel, d.carry_forward_fuel_vat_percent);
  const cfAdd1Vat = vatAmt(
    cfAdd1,
    d.carry_forward_additional_charge_1_vat_percent,
  );
  const cfAdd2Vat = vatAmt(
    cfAdd2,
    d.carry_forward_additional_charge_2_vat_percent,
  );
  const cfAdd3Vat = vatAmt(
    cfAdd3,
    d.carry_forward_additional_charge_3_vat_percent,
  );

  const cfTotal = cfAdmin + cfVeh + cfIns + cfFuel + cfAdd1 + cfAdd2 + cfAdd3;
  const cfVatTotal =
    cfAdminVat +
    cfVehVat +
    cfInsVat +
    cfFuelVat +
    cfAdd1Vat +
    cfAdd2Vat +
    cfAdd3Vat;

  const standardVatTotal =
    adminVat +
    vehicleVat +
    insuranceVat +
    fuelVat +
    add1Vat +
    add2Vat +
    add3Vat +
    cfVatTotal;

  const standardChargeTotal =
    adminFee + vehicleHire + insurance + fuel + add1 + add2 + add3 + cfTotal;

  // manualDockets is pre-normalized; n() coerces string values like "78" → 78
  const manualDriverTotal = manualDockets.reduce(
    (s, m) => s + n(m.driver_total),
    0,
  );

  const finalTaxDeduction = Math.abs(
    (manualDriverTotal + docketTotalVat) - (standardVatTotal + standardChargeTotal)
  );

  const finalTotal = Math.abs(docketTotal - finalTaxDeduction);

  return {
    // standard
    adminFee,
    adminVat,
    adminVatPct: n(d.vat_percent),
    vehicleHire,
    vehicleVat,
    vehicleVatPct: n(d.vehicle_vat_percent),
    insurance,
    insuranceVat,
    insuranceVatPct: n(d.insurance_vat_percent),
    fuel,
    fuelVat,
    fuelVatPct: n(d.fuel_vat_percent),
    add1,
    add1Vat,
    add1VatPct,
    add2,
    add2Vat,
    add2VatPct,
    add3,
    add3Vat,
    add3VatPct,
    // docket VAT
    docketTotalVat,
    docketTotalVatPct: n(d.docket_total_vat_percent),
    // carry forward
    cfAdmin,
    cfAdminVat,
    cfAdminVatPct: n(d.carry_forward_admin_vat_percent),
    cfVeh,
    cfVehVat,
    cfVehVatPct: n(d.carry_forward_vehicle_vat_percent),
    cfIns,
    cfInsVat,
    cfInsVatPct: n(d.carry_forward_insurance_vat_percent),
    cfFuel,
    cfFuelVat,
    cfFuelVatPct: n(d.carry_forward_fuel_vat_percent),
    cfAdd1,
    cfAdd1Vat,
    cfAdd1VatPct: n(d.carry_forward_additional_charge_1_vat_percent),
    cfAdd2,
    cfAdd2Vat,
    cfAdd2VatPct: n(d.carry_forward_additional_charge_2_vat_percent),
    cfAdd3,
    cfAdd3Vat,
    cfAdd3VatPct: n(d.carry_forward_additional_charge_3_vat_percent),
    cfTotal,
    cfVatTotal,
    // totals
    standardChargeTotal,
    standardVatTotal,
    manualDriverTotal,
    finalTaxDeduction: round2(finalTaxDeduction),
    finalTotal: round2(finalTotal),
  };
}

/** A single read-only row: label | value | vat% | vat amount */
function ChargeRow({ label, value, vatPct, vatAmount, nilIfZero = false }) {
  const isNil = nilIfZero && value === 0;
  return (
    <div className="grid grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)_minmax(0,0.85fr)_minmax(0,1fr)] gap-[5px] items-center mb-[5px]">
      <span
        className={`text-[13px] ${isNil ? "text-[#B4B4B4]" : "text-[#515151]"}`}
      >
        {label}
      </span>
      <span
        className={`text-right text-[12px] px-[9px] py-[6px] rounded-[6px] border border-[#22358114] bg-[#f7f7f7] ${isNil ? "text-[#B4B4B4]" : "text-[#515151]"}`}
      >
        {fmtGBP(value)}
      </span>
      <span
        className={`text-right text-[12px] px-[9px] py-[6px] rounded-[6px] border border-[#22358114] bg-[#f7f7f7] ${isNil || !vatPct ? "text-[#B4B4B4]" : "text-[#515151]"}`}
      >
        {vatPct ? `${vatPct}%` : "—"}
      </span>
      <span
        className={`text-right text-[12px] px-[9px] py-[6px] rounded-[6px] border border-[#22358114] bg-[#f7f7f7] ${vatAmount > 0 ? "text-[#C00000]" : "text-[#B4B4B4]"}`}
      >
        {fmtGBP(vatAmount)}
      </span>
    </div>
  );
}

/** Column header row */
function ColHeader() {
  return (
    <div className="grid grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)_minmax(0,0.85fr)_minmax(0,1fr)] gap-[5px] mb-[5px]">
      <span className="text-[11px] font-medium text-[#B4B4B4]">
        Description
      </span>
      <span className="text-right text-[11px] font-medium text-[#B4B4B4]">
        Value (£)
      </span>
      <span className="text-right text-[11px] font-medium text-[#B4B4B4]">
        VAT %
      </span>
      <span className="text-right text-[11px] font-medium text-[#B4B4B4]">
        VAT amt (£)
      </span>
    </div>
  );
}

/** Section heading */
function SectionHead({ children }) {
  return (
    <div className="text-[11px] font-medium text-[#B4B4B4] uppercase tracking-wider mt-[14px] mb-[6px] pb-[4px] border-b border-[#22358114]">
      {children}
    </div>
  );
}

// ─── main component ─────────────────────────────────────────────────────────

function Invoices() {
  const router = useRouter();

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [bulkUpdating, setBulkUpdating] = useState(false);

  const [downloadingId, setDownloadingId] = useState(null);
  const [regeneratingId, setRegeneratingId] = useState(null);
  const [draftInvoice, setDraftInvoice] = useState(null);

  // modal states
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [adjustmentModalOpen, setAdjustmentModalOpen] = useState(false);
  const [finalLoading, setFinalLoading] = useState(false);

  // editable additional charges
  const [additionalData, setAdditionalData] = useState({
    additional_charges_1: 0,
    additional_charges_vat_1_percent: 0,
    additional_charges_2: 0,
    additional_charges_vat_2_percent: 0,
    additional_charges_3: 0,
    additional_charges_vat_3_percent: 0,
  });

  // date range modals
  const [isBankRemittanceModalOpen, setIsBankRemittanceModalOpen] =
    useState(false);
  const [isInvoiceSummaryModalOpen, setIsInvoiceSummaryModalOpen] =
    useState(false);
  const [
    isDetailedInvoiceSummaryModalOpen,
    setIsDetailedInvoiceSummaryModalOpen,
  ] = useState(false);
  const [generatingRemittance, setGeneratingRemittance] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [generatingDetailedSummary, setGeneratingDetailedSummary] =
    useState(false);

  // pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalCount: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [limit, setLimit] = useState(10);

  // ── derived financials ────────────────────────────────────────────────────
  // manual_dockets is a JSON string on the driver object, e.g.
  // '[{"docket_no":"345345345","driver_total":"78"},...]'
  const manualDockets = draftInvoice
    ? normalizeManualDockets(draftInvoice.driver?.manual_dockets)
    : [];

  const totals = draftInvoice
    ? calcFinancials(
        draftInvoice.driver,
        n(draftInvoice.docket_total),
        manualDockets, // already normalized — pass directly
        additionalData,
        draftInvoice
      )
    : null;

  // ── data fetching ─────────────────────────────────────────────────────────
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

  useEffect(() => {
    if (invoices.length > 0 && selectedInvoices.length === invoices.length) {
      setSelectAll(true);
    } else {
      setSelectAll(false);
    }
  }, [selectedInvoices, invoices]);

  // ── handlers ─────────────────────────────────────────────────────────────
  const handlePageChange = (page) => {
    if (page >= 1 && page <= pagination.totalPages && page !== currentPage) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSearch = () => setCurrentPage(1);
  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter") handleSearch();
  };
  const handleFromDateChange = (v) => {
    setFromDate(v);
    setCurrentPage(1);
  };
  const handleToDateChange = (v) => {
    setToDate(v);
    setCurrentPage(1);
  };
  const handleClearFilters = () => {
    setSearchTerm("");
    setFromDate("");
    setToDate("");
    setCurrentPage(1);
  };
  const handleLimitChange = (v) => {
    setLimit(Number(v));
    setCurrentPage(1);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedInvoices([]);
    } else {
      setSelectedInvoices(invoices.map((i) => i.id));
    }
    setSelectAll(!selectAll);
  };

  const handleSelectInvoice = (id) => {
    setSelectedInvoices((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleBulkMarkAsPaid = async () => {
    if (!selectedInvoices.length) {
      toast.error("Please select invoices to update");
      return;
    }
    try {
      setBulkUpdating(true);
      const res = await bulkUpdateInvoicesToPaid({
        invoiceIds: selectedInvoices,
      });
      if (res?.data?.success) {
        toast.success(`${selectedInvoices.length} invoice(s) marked as Paid`);
        setInvoices((prev) =>
          prev.map((inv) =>
            selectedInvoices.includes(inv.id) ? { ...inv, is_paid: true } : inv,
          ),
        );
        setSelectedInvoices([]);
        setSelectAll(false);
      } else {
        toast.error(res?.data?.message || "Bulk update failed");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Bulk update failed");
    } finally {
      setBulkUpdating(false);
    }
  };

  // date-range report handlers
  const handleGenerateBankRemittance = async (
    startDate,
    endDate,
    format = "csv",
  ) => {
    try {
      setGeneratingRemittance(true);
      const res = await generateBankRemittance({
        start_date: startDate,
        end_date: endDate,
        format,
      });
      if (res?.data?.success) {
        const url = res.data.data?.url || res.data.data;
        const a = document.createElement("a");
        a.href = url;
        a.setAttribute(
          "download",
          `bank-remittance-${startDate}-to-${endDate}.${format}`,
        );
        a.setAttribute("target", "_blank");
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success(`Bank Remittance ${format.toUpperCase()} downloaded`);
        setIsBankRemittanceModalOpen(false);
      }
    } catch (err) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message;
      if (status === 400 || status === 404) {
        toast.error(msg || "No invoices found for the date range");
        return;
      }
      toast.error("Something went wrong generating Bank Remittance");
    } finally {
      setGeneratingRemittance(false);
    }
  };

  const handleGenerateInvoiceSummary = async (startDate, endDate, format) => {
    try {
      setGeneratingSummary(true);
      const res = await generateInvoiceSummary({
        start_date: startDate,
        end_date: endDate,
        format,
      });
      if (res?.data?.success && res?.data?.statusCode === 200) {
        const url = res.data.data.url || res.data.data;
        const a = document.createElement("a");
        a.href = url;
        a.setAttribute(
          "download",
          `invoice-summary-${startDate}-to-${endDate}.${format}`,
        );
        a.setAttribute("target", "_blank");
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success(`Invoice Summary ${format.toUpperCase()} downloaded`);
        setIsInvoiceSummaryModalOpen(false);
      } else {
        toast.error(res?.data?.message || "Failed to generate Invoice Summary");
      }
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to generate Invoice Summary",
      );
    } finally {
      setGeneratingSummary(false);
    }
  };

  const handleGenerateDetailedInvoiceSummary = async (
    startDate,
    endDate,
    format,
  ) => {
    try {
      setGeneratingDetailedSummary(true);
      const res = await generateDetailedInvoiceSummary({
        start_date: startDate,
        end_date: endDate,
        format,
      });
      if (res?.data?.success && res?.data?.statusCode === 200) {
        const url = res.data.data.url || res.data.data;
        const a = document.createElement("a");
        a.href = url;
        a.setAttribute(
          "download",
          `detailed-invoice-summary-${startDate}-to-${endDate}.${format}`,
        );
        a.setAttribute("target", "_blank");
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success(
          `Detailed Invoice Summary ${format.toUpperCase()} downloaded`,
        );
        setIsDetailedInvoiceSummaryModalOpen(false);
      } else {
        toast.error(
          res?.data?.message || "Failed to generate Detailed Invoice Summary",
        );
      }
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          "Failed to generate Detailed Invoice Summary",
      );
    } finally {
      setGeneratingDetailedSummary(false);
    }
  };

  const handlePreviewInvoice = async (invoiceId) => {
    try {
      setPreviewLoading(true);
      setIsPreviewModalOpen(true);
      const res = await fetchSingleInvoice(invoiceId);
      if (res.data.success) {
        setSelectedInvoice(res.data.data);
      } else {
        toast.error(res.data.message || "Failed to fetch invoice details");
        setIsPreviewModalOpen(false);
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to fetch invoice details",
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
      const res = await updateInvoice(invoiceId, { is_paid: isPaid });
      if (res.data.success) {
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
        toast.error(res.data.message || "Failed to update invoice status");
        throw new Error(res.data.message);
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to update invoice status",
      );
      throw err;
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
      const res = await getInvoicePdfUrl(invoiceId);
      if (res?.data?.success && res?.data?.statusCode === 200) {
        window.open(res.data.data.url, "_blank");
        toast.success("Invoice PDF opened successfully");
        return true;
      } else {
        toast.error(res?.data?.message || "Failed to download invoice");
        throw new Error(res?.data?.message);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to download invoice");
      throw err;
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadInvoiceCsv = async (invoiceId) => {
    try {
      setDownloadingId(invoiceId);
      const res = await getInvoiceCsvUrl(invoiceId);
      if (res?.data?.success && res?.data?.statusCode === 200) {
        const a = document.createElement("a");
        a.href = res.data.data.url;
        a.setAttribute("download", `invoice-${invoiceId}.csv`);
        a.setAttribute("target", "_blank");
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success("Invoice CSV downloaded");
        return true;
      } else {
        toast.error(res?.data?.message || "Failed to download invoice CSV");
        throw new Error(res?.data?.message);
      }
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to download invoice CSV",
      );
      throw err;
    } finally {
      setDownloadingId(null);
    }
  };

  const handleRegenerateInvoice = async (invoiceId) => {
    try {
      setRegeneratingId(invoiceId);
      const res = await regenerateInvoice(invoiceId);
      if (res?.data?.success) {
        toast.success(res.data.message || "Invoice regenerated successfully");
        fetchInvoicesData();
        return true;
      } else {
        toast.error(res?.data?.message || "Failed to regenerate invoice");
        throw new Error(res?.data?.message);
      }
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to regenerate invoice",
      );
      throw err;
    } finally {
      setRegeneratingId(null);
    }
  };

  // ── adjustment modal ───────────────────────────────────────────────────────
  const handleAdjustment = async (invoiceId) => {
    try {
      const res = await fetchSingleInvoice(invoiceId);
      if (res.data.success) {
        const inv = res.data.data;
        setDraftInvoice(inv);
        setAdditionalData({
          additional_charges_1: n(inv.driver.additional_charges_1),
          additional_charges_vat_1_percent: n(
            inv.driver.additional_charges_vat_1_percent,
          ),
          additional_charges_2: n(inv.driver.additional_charges_2),
          additional_charges_vat_2_percent: n(
            inv.driver.additional_charges_vat_2_percent,
          ),
          additional_charges_3: n(inv.driver.additional_charges_3),
          additional_charges_vat_3_percent: n(
            inv.driver.additional_charges_vat_3_percent,
          ),
        });
        setAdjustmentModalOpen(true);
      } else {
        toast.error(res.data.message || "Failed to fetch invoice details");
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to fetch invoice details",
      );
    }
  };

  const handleCloseAdjustmentModal = () => {
    setAdjustmentModalOpen(false);
    setDraftInvoice(null);
    setAdditionalData({
      additional_charges_1: 0,
      additional_charges_vat_1_percent: 0,
      additional_charges_2: 0,
      additional_charges_vat_2_percent: 0,
      additional_charges_3: 0,
      additional_charges_vat_3_percent: 0,
    });
  };

  const handleAdditionalChange = (field, value) => {
    setAdditionalData((prev) => ({ ...prev, [field]: value }));
  };

  const handleGenerateFinalInvoice = async () => {
    try {
      setFinalLoading(true);
      // Backend recalculates all financials from the driver record;
      // we only need to pass the invoice_id to trigger status → FINAL.
      const res = await generateFinalInvoice({ invoice_id: draftInvoice.id });
      if (res.data.success && res.data.statusCode === 200) {
        toast.success(res.data.message || "Invoice generated successfully");
        handleCloseAdjustmentModal();
        fetchInvoicesData();
      } else {
        toast.error(res.data.message || "Failed to generate final invoice");
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Error generating final invoice",
      );
    } finally {
      setFinalLoading(false);
    }
  };

  const getPageNumbers = () =>
    calculatePageNumbers(pagination.totalPages, currentPage);
  const startIndex =
    pagination.totalCount === 0 ? 0 : (currentPage - 1) * limit + 1;
  const endIndex = Math.min(currentPage * limit, pagination.totalCount);

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* ── modals (preview, date-range) ── */}
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

      <section>
        {/* ── filter bar ── */}
        <div className="flex flex-wrap xl:flex-nowrap items-center justify-between gap-[20px] mb-6">
          <div className="flex flex-col items-start sm:flex-row sm:items-center flex-wrap xl:flex-nowrap gap-[20px] w-full xl:w-[70%]">
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
            <button
              onClick={handleClearFilters}
              className="whitespace-nowrap group flex justify-center items-center gap-[5px] rounded-[6px] bg-secondary border border-secondary hover:text-secondary hover:bg-secondary/20 duration-300 cursor-pointer w-full sm:w-[fit-content] min-w-[100px] px-[25px] py-[10px] text-sm font-semibold leading-normal text-white transition"
            >
              Clear Filter
            </button>
            <div className="relative w-full 2xl:min-w-[400px] xl:!min-w-[125px]">
              <input
                type="text"
                placeholder="Search by name, callsign, status..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="pl-[16px] pr-[60px] py-[10px] w-full rounded-md border border-[#22358114] focus-visible:!outline-0 duration-300 focus-visible:border-[#515151] text-[#515151] text-[16px] font-normal"
              />
              <button
                onClick={handleSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <svg
                  className="w-5 h-5 text-gray-400 cursor-pointer hover:text-gray-600 transition-colors"
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
              </button>
            </div>
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
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full sm:w-auto">
              <button
                onClick={() => setIsBankRemittanceModalOpen(true)}
                className="whitespace-nowrap group flex justify-center items-center gap-2 rounded-[6px] bg-primary border border-primary hover:bg-primary/20 hover:text-primary duration-300 w-full sm:w-auto px-[12px] py-[10px] text-sm font-semibold leading-normal text-white cursor-pointer transition"
              >
                <svg
                  className="w-4 h-4"
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
                className="whitespace-nowrap group flex justify-center items-center gap-2 rounded-[6px] bg-secondary border border-secondary hover:text-secondary hover:bg-secondary/20 duration-300 cursor-pointer w-full sm:w-auto px-[12px] py-[10px] text-sm font-semibold leading-normal text-white transition"
              >
                <svg
                  className="w-4 h-4"
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
                className="whitespace-nowrap group flex justify-center items-center gap-2 rounded-[6px] bg-[#009249] border border-[#009249] hover:text-[#009249] hover:bg-[#009249]/20 duration-300 cursor-pointer w-full sm:w-auto px-[12px] py-[10px] text-sm font-semibold leading-normal text-white transition"
              >
                <svg
                  className="w-4 h-4"
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
            </div>
          </div>
        </div>

        {/* ── entries-per-page + count ── */}
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

        {/* ── table ── */}
        <div className="w-full overflow-x-auto">
          <table className="w-full border-separate border-spacing-y-3 min-w-[1000px]">
            <thead className="text-[16px] sm:text-[18px] 2xl:text-[20px] font-bold">
              <tr className="bg-gray-50">
                <th className="px-[20px]">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={handleSelectAll}
                    className="w-5 h-5 cursor-pointer accent-primary"
                  />
                </th>
                <th className="text-center px-[20px] py-[15px] whitespace-nowrap rounded-l-[15px]">
                  #
                </th>
                <th className="text-left px-[20px] py-[15px] whitespace-nowrap">
                  Invoice ID
                </th>
                <th className="text-left px-[20px] py-[15px] whitespace-nowrap">
                  Site Type
                </th>
                <th className="text-left px-[20px] py-[15px] whitespace-nowrap">
                  Driver
                </th>
                <th className="text-left px-[20px] py-[15px] whitespace-nowrap">
                  Callsign
                </th>
                <th className="text-left px-[20px] py-[15px] whitespace-nowrap">
                  Date Range
                </th>
                <th className="text-left px-[20px] py-[15px] whitespace-nowrap">
                  Final Total
                </th>
                <th className="text-left px-[20px] py-[15px] whitespace-nowrap">
                  Invoice Status
                </th>
                <th className="text-left px-[20px] py-[15px] whitespace-nowrap">
                  Payment Status
                </th>
                <th className="text-center px-[20px] py-[15px] whitespace-nowrap rounded-r-[15px]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="text-[16px] text-[#515151]">
              {loading ? (
                <tr>
                  <td colSpan="10" className="text-center py-20">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader text="Loading invoices..." />
                    </div>
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan="11" className="text-center py-20">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <svg
                        className="w-16 h-16 text-gray-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <p className="text-gray-500 text-lg">No invoices found</p>
                    </div>
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
                    <td className="px-[20px] py-[20px] border-y border-[#22358114] w-[100px] text-center">
                      {/* {(currentPage - 1) * limit + index + 1} */}
                      {invoice.generated_id}
                    </td>
                    <td className="px-[20px] py-[20px] 2xl:text-[18px] border-y border-[#22358114] whitespace-nowrap">
                      #{invoice.id?.slice(-6).toUpperCase()}
                    </td>
                    <td className="px-[20px] py-[20px] border-y border-[#22358114] w-[100px] text-center">
                      {invoice.driver?.shift_type || "N/A"}
                    </td>
                    <td className="px-[20px] py-[20px] 2xl:text-[18px] border-y border-[#22358114] whitespace-nowrap">
                      {invoice.driver?.name || "N/A"}
                    </td>
                    <td className="px-[20px] py-[20px] 2xl:text-[18px] border-y border-[#22358114] whitespace-nowrap">
                      {invoice.driver?.call_sign || "N/A"}
                    </td>
                    <td className="px-[20px] py-[20px] 2xl:text-[18px] border-y border-[#22358114] whitespace-nowrap">
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
                    <td className="px-[20px] py-[20px] 2xl:text-[18px] border-y border-[#22358114] whitespace-nowrap">
                      £{Number(invoice.final_total).toFixed(2)}
                    </td>
                    <td className="px-[20px] py-[20px] 2xl:text-[18px] border-y border-[#22358114]">
                      <span
                        className={`text-sm font-medium ${invoice.status !== "DRAFT" ? "text-[#009249]" : "text-[#C00000]"}`}
                      >
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-[20px] py-[20px] 2xl:text-[18px] border-y border-[#22358114]">
                      <span
                        className={`text-sm font-medium px-3 py-1 rounded-full ${invoice.is_paid ? "text-[#009249] bg-[#009249]/10" : "text-[#C00000] bg-[#C00000]/10"}`}
                      >
                        {invoice.is_paid ? "Paid" : "Unpaid"}
                      </span>
                    </td>
                    <td className="px-[20px] py-[20px] 2xl:text-[18px] border-y border-[#22358114] border-r rounded-r-[15px]">
                      <div className="flex items-center justify-center gap-2">
                        {invoice.status !== "DRAFT" && (
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

        {/* ── pagination ── */}
        {!loading && pagination.totalCount > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between mt-8 gap-4">
            <div className="text-sm text-gray-500">
              Showing {startIndex} to {endIndex} of {pagination.totalCount}{" "}
              entries
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={!pagination.hasPrevPage}
                className={`group px-3 border border-[#22358114] w-[40px] h-[40px] rounded-full text-sm duration-300 flex items-center justify-center ${!pagination.hasPrevPage ? "opacity-50 cursor-not-allowed" : "hover:border-secondary hover:bg-secondary"}`}
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
                    className={`${!pagination.hasPrevPage ? "fill-gray-400 stroke-gray-400" : "fill-[#C00000] stroke-[#C00000] group-hover:fill-white group-hover:stroke-white"}`}
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
                  className={`px-3 border w-[40px] h-[40px] rounded-full text-sm duration-300 ${page === currentPage ? "border-secondary bg-secondary text-white" : page === "..." ? "border-transparent cursor-default" : "border-[#22358114] text-[#515151] hover:border-secondary hover:text-secondary"}`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={!pagination.hasNextPage}
                className={`group px-3 border border-[#22358114] w-[40px] h-[40px] rounded-full text-sm duration-300 flex items-center justify-center ${!pagination.hasNextPage ? "opacity-50 cursor-not-allowed" : "hover:border-secondary hover:bg-secondary"}`}
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
                    className={`${!pagination.hasNextPage ? "fill-gray-400 stroke-gray-400" : "fill-[#C00000] stroke-[#C00000] group-hover:fill-white group-hover:stroke-white"}`}
                  />
                </svg>
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          ADJUSTMENT MODAL
      ════════════════════════════════════════════════════════════════════ */}
      {adjustmentModalOpen && draftInvoice && totals && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto">
          <div
            className="relative w-full max-w-[680px] mx-[10px] my-[40px] rounded-xl bg-white p-[28px] pt-[36px] max-h-[90vh] overflow-y-scroll no-scrollbar"
            style={{ scrollbarWidth: "none" }}
          >
            {/* close */}
            <button
              onClick={handleCloseAdjustmentModal}
              className="w-7 h-7 rounded-full absolute top-[16px] right-[16px] bg-secondary text-white flex items-center justify-center font-bold"
            >
              <svg
                viewBox="0 0 14 14"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-[10px] h-[10px]"
              >
                <path
                  d="M11.9268 13.4982L6.90334 8.4747L1.78513 13.5929L-0.000174888 11.8076L5.11804 6.6894L0.1192 1.69055L1.72608 0.0836703L6.72493 5.08251L11.8074 2.39727e-06L13.5927 1.7853L8.51023 6.86781L13.5337 11.8913L11.9268 13.4982Z"
                  fill="white"
                />
              </svg>
            </button>

            <h2 className="text-[20px] md:text-[24px] font-black text-primary text-center mb-[18px]">
              Pay Adjustment Detail
            </h2>

            {/* info bar */}
            <div className="bg-blue-50 rounded-lg p-3 mb-4 grid grid-cols-3 gap-2 text-sm">
              <div>
                <span className="font-semibold block text-[11px] text-gray-500 mb-[1px]">
                  Driver
                </span>
                {draftInvoice.driver?.name || "N/A"}
              </div>
              <div>
                <span className="font-semibold block text-[11px] text-gray-500 mb-[1px]">
                  Period
                </span>
                {formatDate(draftInvoice.start_date)} –{" "}
                {formatDate(draftInvoice.end_date)}
              </div>
              <div>
                <span className="font-semibold block text-[11px] text-gray-500 mb-[1px]">
                  Dockets
                </span>
                {draftInvoice.total_number_of_dockets}
              </div>
            </div>

            {/* docket total */}
            <div className="flex justify-between items-center py-[10px] border-b border-[#EEEFF5] mb-[4px]">
              <span className="font-bold text-[15px]">Docket Total</span>
              <span className="font-bold text-[15px]">
                {fmtGBP(draftInvoice.docket_total)}
              </span>
            </div>

            {/* ── scrollable charges area ── */}
            <div className="max-h-[340px] overflow-y-auto pr-[4px] scrollbar-thin scrollbar-thumb-red-400 scrollbar-track-gray-100">
              {/* STANDARD CHARGES */}
              <SectionHead>Standard charges &amp; deductions</SectionHead>
              <ColHeader />
              <ChargeRow
                label="Admin fee"
                value={totals.adminFee}
                vatPct={totals.adminVatPct}
                vatAmount={totals.adminVat}
              />
              <ChargeRow
                label="Vehicle hire"
                value={totals.vehicleHire}
                vatPct={totals.vehicleVatPct}
                vatAmount={totals.vehicleVat}
              />
              <ChargeRow
                label="Insurance"
                value={totals.insurance}
                vatPct={totals.insuranceVatPct}
                vatAmount={totals.insuranceVat}
              />
              <ChargeRow
                label="Fuel"
                value={totals.fuel}
                vatPct={totals.fuelVatPct}
                vatAmount={totals.fuelVat}
              />

              {/* DOCKET VAT */}
              <SectionHead>Docket VAT</SectionHead>
              <ColHeader />
              <ChargeRow
                label="Docket VAT"
                value={n(draftInvoice.docket_total)}
                vatPct={totals.docketTotalVatPct || null}
                vatAmount={totals.docketTotalVat}
                nilIfZero
              />

              {/* CARRY FORWARD */}
              <SectionHead>Carry forward charges</SectionHead>
              <ColHeader />
              <ChargeRow
                label="CF Admin fee"
                value={totals.cfAdmin}
                vatPct={totals.cfAdminVatPct}
                vatAmount={totals.cfAdminVat}
                nilIfZero
              />
              <ChargeRow
                label="CF Vehicle hire"
                value={totals.cfVeh}
                vatPct={totals.cfVehVatPct}
                vatAmount={totals.cfVehVat}
                nilIfZero
              />
              <ChargeRow
                label="CF Insurance"
                value={totals.cfIns}
                vatPct={totals.cfInsVatPct}
                vatAmount={totals.cfInsVat}
                nilIfZero
              />
              <ChargeRow
                label="CF Fuel"
                value={totals.cfFuel}
                vatPct={totals.cfFuelVatPct}
                vatAmount={totals.cfFuelVat}
                nilIfZero
              />
              <ChargeRow
                label="CF Additional 1"
                value={totals.cfAdd1}
                vatPct={totals.cfAdd1VatPct}
                vatAmount={totals.cfAdd1Vat}
                nilIfZero
              />
              <ChargeRow
                label="CF Additional 2"
                value={totals.cfAdd2}
                vatPct={totals.cfAdd2VatPct}
                vatAmount={totals.cfAdd2Vat}
                nilIfZero
              />
              <ChargeRow
                label="CF Additional 3"
                value={totals.cfAdd3}
                vatPct={totals.cfAdd3VatPct}
                vatAmount={totals.cfAdd3Vat}
                nilIfZero
              />

              {/* ADDITIONAL CHARGES — editable */}
              <SectionHead>Additional charges</SectionHead>
              <ColHeader />
              {[1, 2, 3].map((i) => {
                const valKey = `additional_charges_${i}`;
                const vatKey = `additional_charges_vat_${i}_percent`;
                const val = n(additionalData[valKey]);
                const pct = n(additionalData[vatKey]);
                const vat = vatAmt(val, pct);
                return (
                  <div
                    key={i}
                    className="grid grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)_minmax(0,0.85fr)_minmax(0,1fr)] gap-[5px] items-center mb-[5px]"
                  >
                    <span className="text-[13px] text-[#515151]">
                      Additional {i}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={additionalData[valKey] || ""}
                      onChange={(e) =>
                        handleAdditionalChange(valKey, e.target.value)
                      }
                      className="text-right text-[12px] px-[9px] py-[6px] rounded-[6px] border border-[#22358114] bg-white text-[#515151] focus:outline-none focus:border-[#515151]"
                    />
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0"
                      value={additionalData[vatKey] || ""}
                      onChange={(e) =>
                        handleAdditionalChange(vatKey, e.target.value)
                      }
                      className="text-right text-[12px] px-[9px] py-[6px] rounded-[6px] border border-[#22358114] bg-white text-[#515151] focus:outline-none focus:border-[#515151]"
                    />
                    <span
                      className={`text-right text-[12px] px-[9px] py-[6px] rounded-[6px] border border-[#22358114] bg-[#f7f7f7] ${vat > 0 ? "text-[#C00000]" : "text-[#B4B4B4]"}`}
                    >
                      {fmtGBP(vat)}
                    </span>
                  </div>
                );
              })}

              {/* MANUAL DOCKETS */}
              <SectionHead>
                Manual dockets{" "}
                <span className="font-normal normal-case tracking-normal text-[10px] text-green-600">
                  (credited — reduces deductions)
                </span>
              </SectionHead>
              {manualDockets.length === 0 ? (
                <p className="text-[12px] text-[#B4B4B4] py-[6px] text-center">
                  No manual dockets for this invoice
                </p>
              ) : (
                <table className="w-full text-[12px] border-collapse mb-2">
                  <thead>
                    <tr className="border-b border-[#22358114]">
                      <th className="text-left py-[5px] px-[6px] text-[#B4B4B4] font-medium">
                        Docket no.
                      </th>
                      <th className="text-left py-[5px] px-[6px] text-[#B4B4B4] font-medium">
                        Journey
                      </th>
                      <th className="text-left py-[5px] px-[6px] text-[#B4B4B4] font-medium">
                        Tariff
                      </th>
                      <th className="text-right py-[5px] px-[6px] text-[#B4B4B4] font-medium">
                        Driver total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {manualDockets.map((m) => (
                      <tr
                        key={m.id || m.docket_no}
                        className="border-b border-[#22358114]"
                      >
                        <td className="py-[5px] px-[6px]">{m.docket_no}</td>
                        <td className="py-[5px] px-[6px]">
                          {m.journey || "—"}
                        </td>
                        <td className="py-[5px] px-[6px]">{m.tariff || "—"}</td>
                        <td className="py-[5px] px-[6px] text-right">
                          {fmtGBP(m.driver_total)}
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <td
                        colSpan={3}
                        className="py-[6px] px-[6px] font-medium text-green-700"
                      >
                        Manual total (credited)
                      </td>
                      <td className="py-[6px] px-[6px] text-right font-medium text-green-700">
                        + {fmtGBP(totals.manualDriverTotal)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>

            {/* ── totals summary ── */}
            <div className="border-t border-[#EEEFF5] mt-[14px] pt-[14px]">
              <div className="bg-[#f7f7f7] rounded-[12px] p-[14px] text-[13px] text-[#515151] space-y-[6px]">
                <div className="flex justify-between">
                  <span>Standard charges</span>
                  <span>
                    {fmtGBP(
                      totals.adminFee +
                        totals.vehicleHire +
                        totals.insurance +
                        totals.fuel,
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-[#C00000]">
                  <span>VAT on standard</span>
                  <span>
                    {fmtGBP(
                      totals.adminVat +
                        totals.vehicleVat +
                        totals.insuranceVat +
                        totals.fuelVat,
                    )}
                  </span>
                </div>
                {totals.docketTotalVat > 0 && (
                  <div className="flex justify-between text-green-700 text-[#C00000]">
                    <span>Docket VAT</span>
                    <span>{fmtGBP(totals.docketTotalVat)}</span>
                  </div>
                )}  
                {totals.cfTotal > 0 && (
                  <>
                    <div className="flex justify-between">
                      <span>Carry forward charges</span>
                      <span>{fmtGBP(totals.cfTotal)}</span>
                    </div>
                    <div className="flex justify-between text-[#C00000]">
                      <span>VAT on carry forward</span>
                      <span>{fmtGBP(totals.cfVatTotal)}</span>
                    </div>
                  </>
                )}
                {totals.add1 + totals.add2 + totals.add3 > 0 && (
                  <>
                    <div className="flex justify-between">
                      <span>Additional charges</span>
                      <span>
                        {fmtGBP(totals.add1 + totals.add2 + totals.add3)}
                      </span>
                    </div>
                    <div className="flex justify-between text-[#C00000]">
                      <span>VAT on additional</span>
                      <span>
                        {fmtGBP(
                          totals.add1Vat + totals.add2Vat + totals.add3Vat,
                        )}
                      </span>
                    </div>
                  </>
                )}
                {totals.manualDriverTotal > 0 && (
                  <div className="flex justify-between text-green-700 border-t border-[#EEEFF5] pt-[6px]">
                    <span>Manual docket credit</span>
                    <span> {fmtGBP(totals.manualDriverTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-[#C00000] border-t border-[#EEEFF5] pt-[8px] mt-[4px] text-[14px]">
                  <span>Total deductions (incl. VAT)</span>
                  <span>{fmtGBP(totals.finalTaxDeduction)}</span>
                </div>
                <div className="flex justify-between font-bold text-primary text-[15px] border-t border-[#EEEFF5] pt-[8px]">
                  <span>Final Total</span>
                  <span>{fmtGBP(totals.finalTotal)}</span>
                </div>
              </div>
            </div>

            {/* buttons */}
            <div className="flex justify-center gap-3 mt-[20px]">
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
