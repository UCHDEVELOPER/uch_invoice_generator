"use client";

import { useState, useEffect, useCallback } from "react";
import Breadcrumb from "../Breadcrumb";
import Image from "next/image";
import Link from "next/link";
import CustomDropdown from "@/components/layout/CustomDropdown";
import { useParams, useRouter } from "next/navigation";
import { fetchSingleDriver } from "@/lib/api/self-own/driver.api";
import { fetchDriverJobs } from "@/lib/api/self-own/job.api";
import {
  generateDraftInvoice,
  generateFinalInvoice,
} from "@/lib/api/self-own/invoice.api";
import {
  calculatePageNumbers,
  formatDriverRate,
  handleDeleteSelfOwnDriver,
  formatDateForAPI,
  parseDDMMYYYYHHmm,
  getAllowedDateRange,
} from "@/utils/helpers";
import Loader from "../Loader";
import ConfirmModal from "../ConfirmModal";
import toast from "react-hot-toast";

function DriverProfileDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [driver, setDriver] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [jobsLoading, setJobsLoading] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalJobs, setTotalJobs] = useState(0);
  const limit = 10;

  const isJobEditable = (jobDateTime) => {
    if (!jobDateTime) return false;
    const { minDate, maxDate } = getAllowedDateRange();
    const jobDate = parseDDMMYYYYHHmm(jobDateTime);
    if (!jobDate) return false;
    return jobDate >= minDate && jobDate <= maxDate;
  };

  // Filter state - renamed to match JobManagement
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);

  // Invoice modal states
  const [dateModalOpen, setDateModalOpen] = useState(false);
  const [adjustmentModalOpen, setAdjustmentModalOpen] = useState(false);
  const [invoiceStartDate, setInvoiceStartDate] = useState("");
  const [invoiceEndDate, setInvoiceEndDate] = useState("");
  const [draftInvoice, setDraftInvoice] = useState(null);
  const [draftLoading, setDraftLoading] = useState(false);
  const [finalLoading, setFinalLoading] = useState(false);

  // Adjustment form state
  const [adjustmentData, setAdjustmentData] = useState({
    admin_fee: 0,
    vehicle_hire_charges: 0,
    insurance_charge: 0,
    fuel_charge: 0,
    additional_charges: 0,
    vat: 0,
  });

  // Fetch driver data
  useEffect(() => {
    const getDriver = async () => {
      try {
        setLoading(true);
        const response = await fetchSingleDriver(id);

        if (response.data.success && response.data.statusCode === 200) {
          const data = response.data.data;
          setDriver(data);
        } else {
          toast.error(response.data.message);
          router.push("/self-own/drivers");
        }
      } catch (error) {
        toast.error("Driver not found");
        router.push("/self-own/drivers");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      getDriver();
    }
  }, [id]);

  // Fetch jobs with filters - same pattern as JobManagement
  const getJobs = useCallback(async () => {
    if (!driver?.call_sign) return;

    try {
      setJobsLoading(true); 

      // Combine driver's call_sign with search term if provided
      const searchValue = searchTerm
        ? `${searchTerm}`.trim()
        : ""; 

      const response = await fetchDriverJobs(driver.id, {
        page: currentPage,
        limit: limit,
        search: searchValue,
        from_date: formatDateForAPI(fromDate),
        to_date: formatDateForAPI(toDate),
      });

      if (response.data.success && response.data.statusCode === 200) {
        const data = response.data;

        // Filter to ensure only this driver's jobs are shown
        let filteredJobs = data.data || [];
        if (searchTerm) {
          filteredJobs = filteredJobs.filter(
            (job) =>
              job.call_sign === driver.call_sign ||
              job.callsign === driver.call_sign,
          );
        }

        setJobs(filteredJobs);
        setTotalPages(
          data.pagination.totalPages ||
            Math.ceil(data.pagination.totalCount / limit) ||
            1,
        );
        setTotalJobs(
          searchTerm ? filteredJobs.length : data.pagination.totalCount || 0,
        );
      }
    } catch (error) {
      console.error("Error fetching jobs:", error);
      toast.error("Failed to fetch jobs");
    } finally {
      setJobsLoading(false);
    }
  }, [driver?.call_sign, currentPage, fromDate, toDate, searchTerm, limit]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, fromDate, toDate]);

  // Fetch jobs when dependencies change - same pattern as JobManagement
  useEffect(() => {
    if (driver?.call_sign) {
      getJobs();
    }
  }, [driver?.call_sign, currentPage, fromDate, toDate, searchTerm, getJobs]);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Clear filter function - same as JobManagement
  const handleClearFilter = () => {
    setSearchTerm("");
    setFromDate("");
    setToDate("");
  };

  const getPageNumbers = () => calculatePageNumbers(totalPages, currentPage);

  const handleView = (driverId, driverName) => {
    // console.log(`View driver: ${driverName} (ID: ${driverId})`);
    alert(`Viewing details for ${driverName}`);
  };

  const handleEdit = (jobId, driverName) => {
    router.push(`/job-management/edit/${jobId}`);
  };

  const handleDelete = (driverId, driverName) => {
    // console.log(`Delete driver: ${driverName} (ID: ${driverId})`);
    setSelectedDriver({ id: driverId, name: driverName });
    setShowDeleteModal(true);
  };

  // Handle opening date selection modal
  const handleOpenDateModal = () => {
    setInvoiceStartDate("");
    setInvoiceEndDate("");
    setDateModalOpen(true);
  };

  // Handle draft invoice generation
  const handleGenerateDraftInvoice = async () => {
    if (!invoiceStartDate || !invoiceEndDate) {
      toast.error("Please select both start and end dates");
      return;
    }

    if (new Date(invoiceStartDate) > new Date(invoiceEndDate)) {
      toast.error("Start date cannot be greater than end date");
      return;
    }

    try {
      setDraftLoading(true);
      const response = await generateDraftInvoice({
        driver_id: id,
        start_date: invoiceStartDate,
        end_date: invoiceEndDate,
      });

      if (response.data.success && response.data.statusCode === 200) {
        toast.success(response.data.message);
        setDraftInvoice(response.data.data);
        setDateModalOpen(false);
        setAdjustmentModalOpen(true);

        // Pre-fill adjustment data from draft
        setAdjustmentData({
          admin_fee: response.data.data.admin_fee || 0,
          vehicle_hire_charges: response.data.data.vehicle_hire_charges || 0,
          insurance_charge: response.data.data.insurance_charge || 0,
          fuel_charge: response.data.data.fuel_charge || 0,
          additional_charges: response.data.data.additional_charges || 0,
          vat: response.data.data.vat || 0,
        });
      } else {
        toast.error(
          response.data.message || "Failed to generate draft invoice",
        );
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Error generating draft invoice",
      );
    } finally {
      setDraftLoading(false);
    }
  };

  // Handle adjustment input change
  const handleAdjustmentChange = (field, value) => {
    setAdjustmentData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Calculate totals for adjustment modal
  const calculateTotals = () => {
    const adminFee = parseFloat(adjustmentData.admin_fee) || 0;
    const vehicleHire = parseFloat(adjustmentData.vehicle_hire_charges) || 0;
    const insurance = parseFloat(adjustmentData.insurance_charge) || 0;
    const fuel = parseFloat(adjustmentData.fuel_charge) || 0;
    const additional = parseFloat(adjustmentData.additional_charges) || 0;

    const totalDeductions =
      adminFee + vehicleHire + insurance + fuel + additional;

    // Calculate VAT
    let vatAmount = 0;
    const vatValue = adjustmentData.vat;
    if (vatValue && adminFee != 0) {
      vatAmount = (adminFee * vatValue) / 100;
    }

    const totalWithVat = totalDeductions + vatAmount;
    const docketTotal = draftInvoice?.docket_total || 0;
    const finalTotal = docketTotal - totalWithVat;

    return {
      totalDeductions,
      vatAmount,
      totalWithVat,
      docketTotal,
      finalTotal,
    };
  };

  // Handle final invoice generation
  const handleGenerateFinalInvoice = async () => {
    try {
      setFinalLoading(true);
      const response = await generateFinalInvoice({
        invoice_id: draftInvoice.id,
        admin_fee: parseFloat(adjustmentData.admin_fee) || 0,
        vehicle_hire_charges:
          parseFloat(adjustmentData.vehicle_hire_charges) || 0,
        insurance_charge: parseFloat(adjustmentData.insurance_charge) || 0,
        fuel_charge: parseFloat(adjustmentData.fuel_charge) || 0,
        additional_charges: parseFloat(adjustmentData.additional_charges) || 0,
        vat: adjustmentData.vat || 0,
      });

      if (response.data.success && response.data.statusCode === 200) {
        toast.success(response.data.message);
        setAdjustmentModalOpen(false);
        setDraftInvoice(null);
        setAdjustmentData({
          admin_fee: 0,
          vehicle_hire_charges: 0,
          insurance_charge: 0,
          fuel_charge: 0,
          additional_charges: 0,
          vat: 0,
        });
        router.push("/invoices");
        getJobs();
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

  // Close adjustment modal
  const handleCloseAdjustmentModal = () => {
    setAdjustmentModalOpen(false);
    setDraftInvoice(null);
    setAdjustmentData({
      admin_fee: 0,
      vehicle_hire_charges: 0,
      insurance_charge: 0,
      fuel_charge: 0,
      additional_charges: 0,
      vat: 0,
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader />
      </div>
    );
  }

  const totals = draftInvoice ? calculateTotals() : null;

  const validHistory =
    driver?.driver_history?.filter(
      (history) => history.old_position_label !== null,
    ) || [];

  return (
    <div>
      <Breadcrumb
        items={[
          { label: "", href: "/dashboard", isHome: true },
          { label: "Driver Profiles", href: "/self-own/drivers" },
          { label: driver.name ?? "Driver Details" },
        ]}
      />

      <div className="w-full flex flex-col lg:flex-row gap-[30px] mt-[30px]">
        <div className="bg-white rounded-[15px] border border-[#22358114] py-[22px] px-[20px] xl:basis-[312px] xl:shrink-0">
          <div className="flex flex-col items-center text-center">
            <div className="w-[53px] h-[53px] rounded-full">
              <img
                src={driver?.image || "/img/user-img.png"}
                alt=""
                width={200}
                height={200}
                className="object-cover rounded-full"
              />
            </div>

            <h3 className="mt-3 text-[18px] md:text-[20px] xl:text-[22px] font-black text-primary">
              {driver?.name || "N/A"}
            </h3>
            <p className="text-sm text-[#515151]">
              {driver?.call_sign || "N/A"}
            </p>
          </div>
          <div className="border-b border-[#22358114] mt-[20px] mb-[25px]"></div>
          <div className="space-y-3 text-sm text-[#515151]">
            <div className="flex justify-between">
              <span className="font-bold">Callsign:</span>
              <span className="font-normal">{driver?.call_sign || "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold">Position:</span>
              <span className="font-normal">{driver?.position || "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold">Account:</span>
              <span className="font-normal">
                {driver?.bank_account_no || "N/A"}
              </span>
            </div>
          </div>

          <div className="mt-[25px] flex flex-col sm:flex-row lg:flex-col xl:flex-row gap-3">
            <Link
              href={`/self-own/drivers/edit/${id}`}
              className="block text-center flex-1 min-w-[80px] cursor-pointer rounded-[6px] bg-primary border border-primary px-[20px] py-[10px] text-sm font-semibold text-white hover:bg-primary/20 hover:text-primary duration-300 transition"
            >
              Edit Info
            </Link>
            <button
              onClick={() =>
                handleDelete(id, driver?.name || driver?.call_sign)
              }
              className="flex-1 min-w-[80px] cursor-pointer rounded-[6px] bg-secondary border border-secondary px-[20px] py-[10px] text-sm font-semibold text-white hover:bg-secondary/20 hover:text-secondary duration-300 transition"
            >
              Delete Profile
            </button>
          </div>
        </div>

        <div className="flex-1 bg-white rounded-xl border border-[#22358114] grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          <div className="py-[20px] px-[10px] md:py-[30px] md:pl-[30px] 2xl:pl-[41px] md:pr-[30px] border-b md:border-b-0 md:border-r border-[#22358114]">
            <h4 className="font-bold text-primary text-[17px] sm:text-[19px] mb-[15px]">
              Contact Information
            </h4>

            <div className="space-y-3 text-sm text-[#515151]">
              <p>
                <span className="font-bold">Address:</span>
                <br />
                <span className="break-words ">
                  {[driver?.address_details, driver?.address, driver?.zip_code]
                    .filter(Boolean)
                    .join(", ") || "N/A"}
                </span>
              </p>
              <p>
                <span className="font-bold">Email:</span>
                <br />
                {driver?.email || "N/A"}
              </p>
              <p>
                <span className="font-bold">Phone:</span>
                <br />
                {driver?.phone_number || "N/A"}
              </p>
            </div>
          </div>

          <div className="px-[10px] py-[20px] md:py-[30px] md:pl-[30px] md:pr-[30px] 2xl:pl-[59px] border-b md:border-b-0 md:border-r border-[#22358114]">
            <h4 className="font-bold text-primary text-[17px] sm:text-[19px] mb-[15px]">
              Payment Details
            </h4>

            <div className="space-y-3 text-sm text-[#515151]">
              <p>
                <span className="font-bold">Rate:</span>
                <br />
                {formatDriverRate(driver)}
              </p>

              <p>
                <span className="font-bold">Bank Account Number:</span>
                <br />
                {driver?.bank_account_no || "N/A"}
              </p>
              <p>
                <span className="font-bold">Sort Code:</span>
                <br />
                {driver?.iban_no || "N/A"}
              </p>
              <p>
                <span className="font-bold">Payroll ID:</span>
                <br />
                {driver?.payroll_id || "N/A"}
              </p>
            </div>
          </div>

          <div className="px-[10px] py-[20px] md:py-[30px] md:pl-[30px] md:pr-[30px] 2xl:pl-[59px]">
            <h4 className="font-bold text-primary text-[17px] sm:text-[19px] mb-[15px]">
              Operational Details
            </h4>

            <div className="space-y-3 text-sm text-[#515151]">
              <p>
                <span className="font-bold">Working as:</span>
                <br />
                {driver?.position || "N/A"}
              </p>
              <p>
                <span className="font-bold">Status:</span>
                <br />
                <span
                  className={`font-normal ${
                    driver?.status === "active"
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {driver?.status == "active" ? "Active" : "Inactive" || "N/A"}
                </span>
              </p>
              <p>
                <span className="font-bold">Shift Type:</span>
                <br />
                <span className="font-normal">{driver?.shift_type}</span>
              </p>
              <p>
                <span className="font-bold">Bank User Name:</span>
                <br />
                {driver?.bank_user_name || "N/A"}
              </p>
              {validHistory.length > 0 && (
                <div className="mt-4">
                  <p className="font-bold text-sm mb-2">
                    Position History{" "}
                    <span className="text-xs">(OLD → NEW)</span>
                  </p>

                  <div className="space-y-2">
                    {validHistory.map((history) => (
                      <div
                        key={history.id}
                        className="text-xs p-2 rounded border bg-gray-50"
                      >
                        <p className="text-gray-700">
                          <span className="text-red-600 font-medium">
                            {history.old_position_label}
                          </span>
                          {" → "}
                          <span className="text-green-600 font-medium">
                            {history.new_position_label || "N/A"}
                          </span>
                        </p>

                        <p className="text-gray-400 mt-1">
                          {new Date(history.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <h2 className="text-[18px] md:text-[22px] lg:text-[25px] font-bold text-primary mt-[30px]">
        Journey Completed ({totalJobs})
      </h2>

      <section className="mt-[30px]">
        {/* Updated Filter Section - Same as JobManagement */}
        <div className="flex flex-wrap xl:flex-nowrap items-center justify-between gap-[20px] mb-6">
          <div className="flex flex-col items-start sm:flex-row sm:items-center flex-wrap xl:flex-nowrap gap-[20px] w-full xl:w-[70%]">
            <span className="text-[20px] font-bold">Filter:</span>

            <div className="flex w-full sm:w-[fit-content] flex-col sm:flex-row md:flex-nowrap flex-wrap items-center gap-[10px]">
              <div className="relative w-full">
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  onKeyDown={(e) => e.preventDefault()}
                  className="py-[10px] px-[16px] w-full sm:w-[155px] rounded-[6px] border border-[#22358114] focus-visible:!outline-0 duration-300 focus-visible:border-[#515151] text-[#B4B4B4] text-[16px] font-normal"
                />
              </div>

              <p className="text-[#515151]">To</p>

              <div className="relative w-full sm:w-[155px]">
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  onKeyDown={(e) => e.preventDefault()}
                  className="py-[10px] px-[16px] w-full text-[#B4B4B4] text-[16px] rounded-[6px] border border-[#22358114] focus-visible:!outline-0 duration-300 focus-visible:border-[#515151]"
                />
              </div>
            </div>

            {/* Clear Filter Button - Same as JobManagement */}
            <div className="relative w-full sm:w-[155px]">
              <button
                onClick={handleClearFilter}
                className="whitespace-nowrap group flex justify-center items-center gap-[5px] rounded-[6px] bg-secondary border border-secondary hover:text-secondary hover:bg-secondary/20 duration-300 cursor-pointer w-full sm:w-[fit-content] min-w-[100px] px-[25px] py-[10px] text-sm font-semibold leading-normal text-white transition"
              >
                Clear Filter
              </button>
            </div>

            {/* Search Input - Same as JobManagement */}
            <div className="relative w-full lg:max-w-[200px] 2xl:max-w-[624px]">
              <input
                type="text"
                placeholder="Search with docket no."
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

          {/* <div className="w-full flex flex-wrap xl:flex-nowrap items-center xl:justify-end gap-3 xl:w-[30%]">
            <button
              onClick={handleOpenDateModal}
              className="whitespace-nowrap group flex justify-center items-center gap-[5px] rounded-[6px] bg-primary border border-primary hover:bg-primary/20 hover:text-primary duration-300 w-full sm:w-[fit-content] px-[25px] py-[10px] min-w-[100px] text-sm font-semibold leading-normal text-white cursor-pointer transition"
            >
              Generate Invoice
            </button>
          </div> */}
        </div>

        <div className="w-full overflow-x-scroll">
          <table className="w-full border-separate border-spacing-y-3">
            <thead className="text-[16px] sm:text-[18px] lg:text-[20px] font-bold">
              <tr>
                <th>#ID</th>
                <th className="text-center px-[20px] py-[5px] whitespace-nowrap">
                  Docket
                </th>
                <th className="text-left px-[20px] py-[5px] whitespace-nowrap">
                  Drivers
                </th>
                <th className="text-left px-[20px] py-[5px] whitespace-nowrap">
                  Callsign
                </th>
                <th className="text-left px-[20px] py-[5px] whitespace-nowrap">
                  Date/Time
                </th>
                <th className="text-left px-[20px] py-[5px] whitespace-nowrap">
                  Journey
                </th>
                <th className="text-left px-[20px] py-[5px] whitespace-nowrap">
                  Driver Total
                </th>
                <th className="text-left px-[20px] py-[5px] whitespace-nowrap">
                  Weight
                </th>
                <th className="text-left px-[20px] py-[5px] whitespace-nowrap">
                  Is Invoiced
                </th>
                <th className="text-left px-[20px] py-[5px] whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="text-[16px] text-normal text-[#515151]">
              {jobsLoading ? (
                <tr className="bg-white">
                  <td colSpan={9} className="py-[20px] text-center">
                    <Loader text="Fetching jobs..." />
                  </td>
                </tr>
              ) : jobs.length === 0 ? (
                <tr className="bg-white">
                  <td colSpan={10} className="py-[20px] text-center">
                    No jobs found for this driver.
                  </td>
                </tr>
              ) : (
                jobs.map((job, index) => (
                  <tr key={job.id} className="bg-white">
                    <td className="px-[20px] py-[20px] text-center border-y border-[#22358114] border-l rounded-l-[15px]">
                      {(currentPage - 1) * limit + index + 1}
                    </td>
                    <td className="px-[20px] py-[20px] border-y border-[#22358114] whitespace-nowrap">
                      {job.docket_no}
                    </td>
                    <td className="px-[20px] py-[20px] border-y border-[#22358114] whitespace-nowrap">
                      {job.driver_name || driver?.name || "N/A"}
                    </td>
                    <td className="px-[20px] py-[20px] border-y border-[#22358114] whitespace-nowrap">
                      {job.callsign ||
                        job.call_sign ||
                        driver?.call_sign ||
                        "N/A"}
                    </td>
                    <td className="px-[20px] py-[20px] border-y border-[#22358114] whitespace-nowrap">
                      {job.date_time || "N/A"}
                    </td>
                    <td className="px-[20px] py-[20px] border-y border-[#22358114] whitespace-nowrap">
                      {job.journey || "N/A"}
                    </td>
                    <td className="px-[20px] py-[20px] border-y border-[#22358114] whitespace-nowrap">
                      {job.driver_total || "N/A"}
                    </td>
                    <td className="px-[20px] py-[20px] border-y border-[#22358114] whitespace-nowrap">
                      {job.weight ? job.weight + " kg" : "N/A"}
                    </td>
                    <td className="px-[20px] py-[20px] border-y border-[#22358114] whitespace-nowrap">
                      {job.is_invoiced == false ? "No" : "Yes"}
                    </td>
                    <td className="px-[20px] py-[20px] border-y border-[#22358114] border-r rounded-r-[15px] whitespace-nowrap">
                      <div className="flex justify-center">
                        <CustomDropdown  
                          driverId={job.id}
                          driverName={job.call_sign}
                          onView={handleView}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          show={{
                            view: false,
                            edit: isJobEditable(job.date_time),
                            delete: true,
                          }}
                          labels={{
                            view: "View Job",
                            edit: "Edit Job",
                            delete: "Remove Job",
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination - Same style as JobManagement */}
        {jobs.length > 0 ? (
          <div className="flex items-center justify-between mt-8">
            <div className="text-sm text-gray-600">
              Showing {(currentPage - 1) * limit + 1} to{" "}
              {Math.min(currentPage * limit, totalJobs)} of {totalJobs} jobs
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`group px-3 border w-[40px] h-[40px] rounded-[50%] text-sm duration-300 flex items-center justify-center ${
                  currentPage === 1
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

              {/* Page Numbers */}
              {getPageNumbers().map((page, index) => (
                <button
                  key={index}
                  onClick={() =>
                    typeof page === "number" && handlePageChange(page)
                  }
                  disabled={page === "..."}
                  className={`px-3 border w-[40px] h-[40px] rounded-[50%] text-sm duration-300 ${
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
                disabled={currentPage === totalPages}
                className={`group px-3 border w-[40px] h-[40px] rounded-[50%] text-sm duration-300 flex items-center justify-center ${
                  currentPage === totalPages
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
        ) : null}
      </section>

      {/* Date Selection Modal - Step 1 */}
      {dateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-scroll no-scrollbar">
          <div className="relative w-full max-w-[480px] mx-[10px] my-[50px] rounded-xl bg-white p-[35px] pt-[40px]">
            <div className="flex items-center justify-between mb-[30px]">
              <h2 className="mx-auto text-[20px] md:text-[24px] lg:text-[28px] font-black text-primary">
                Select Date Range
              </h2>

              <button
                onClick={() => setDateModalOpen(false)}
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

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-[#515151] mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={invoiceStartDate}
                  onChange={(e) => setInvoiceStartDate(e.target.value)}
                  onKeyDown={(e) => e.preventDefault()}
                  className="w-full py-[12px] px-[16px] rounded-[6px] border border-[#22358114] focus-visible:!outline-0 duration-300 focus-visible:border-[#515151] text-[16px] font-normal"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-[#515151] mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={invoiceEndDate}
                  onChange={(e) => setInvoiceEndDate(e.target.value)}
                  onKeyDown={(e) => e.preventDefault()}
                  className="w-full py-[12px] px-[16px] rounded-[6px] border border-[#22358114] focus-visible:!outline-0 duration-300 focus-visible:border-[#515151] text-[16px] font-normal"
                />
              </div>
            </div>

            <div className="flex justify-center gap-3 mt-[28px]">
              <button
                onClick={() => setDateModalOpen(false)}
                className="min-w-[100px] cursor-pointer rounded-[6px] bg-gray-200 border border-gray-200 px-[25px] py-[10px] text-sm font-semibold text-gray-700 hover:bg-gray-300 duration-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateDraftInvoice}
                disabled={draftLoading}
                className="min-w-[100px] cursor-pointer rounded-[6px] bg-secondary border border-secondary px-[25px] py-[10px] text-sm font-semibold text-white hover:bg-secondary/80 duration-300 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {draftLoading ? (
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
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Generating...
                  </>
                ) : (
                  "Generate Draft"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pay Adjustment Modal - Step 2 */}
      {adjustmentModalOpen && draftInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-scroll no-scrollbar">
          <div className="relative w-full max-w-[580px] mx-[10px] my-[50px] rounded-xl bg-white p-[35px] pt-[40px]">
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
              {/* Invoice Info */}
              <div className="bg-blue-50 rounded-lg p-3 mb-4 text-sm">
                <div className="flex justify-between mb-1">
                  <span className="font-semibold">Driver:</span>
                  <span>{draftInvoice.driver?.name || driver?.name}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="font-semibold">Period:</span>
                  <span>
                    {draftInvoice.start_date} - {draftInvoice.end_date}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">Total Dockets:</span>
                  <span>{draftInvoice.total_number_of_dockets}</span>
                </div>
              </div>

              <div className="flex justify-between mb-4 py-[18px] border-y border-[#EEEFF5]">
                <span className="font-bold">Docket Total</span>
                <span>£{draftInvoice.docket_total?.toFixed(2)}</span>
              </div>

              <div className="max-h-[150px] overflow-y-scroll scrollbar-thin scrollbar-thumb-red-500 scrollbar-track-gray-200">
                <div className="grid grid-cols-3 gap-[12px] font-bold mb-2">
                  <span>Description</span>
                  <span>Value (£)</span>
                  <span>VAT</span>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-2 items-center">
                  <span>Admin Fee</span>
                  <input
                    type="number"
                    step="0.01"
                    value={adjustmentData.admin_fee}
                    onChange={(e) =>
                      handleAdjustmentChange("admin_fee", e.target.value)
                    }
                    className="border text-[14px] border-[#22358114] rounded px-[20px] py-[10px] focus:border-[#515151] duration-300 focus-visible:!outline-0"
                    placeholder="0.00"
                  />
                  <input
                    type="text"
                    value={adjustmentData.vat}
                    onChange={(e) =>
                      handleAdjustmentChange("vat", e.target.value)
                    }
                    className="text-[14px] border border-[#22358114] rounded px-[20px] py-[10px] focus:border-[#515151] duration-300 focus-visible:!outline-0"
                    placeholder="e.g. 20%"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3 mb-2">
                  <span>Vehicle Hire charges</span>
                  <input
                    type="number"
                    step="0.01"
                    value={adjustmentData.vehicle_hire_charges}
                    onChange={(e) =>
                      handleAdjustmentChange(
                        "vehicle_hire_charges",
                        e.target.value,
                      )
                    }
                    className="border text-[14px] border-[#22358114] rounded px-[20px] py-[10px] focus:border-[#515151] duration-300 focus-visible:!outline-0"
                    placeholder="0.00"
                  />
                  <input
                    type="text"
                    disabled
                    value="-"
                    className="text-[14px] border border-[#22358114] rounded px-[20px] py-[10px] bg-gray-50 cursor-not-allowed"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3 mb-2">
                  <span>Insurance charge</span>
                  <input
                    type="number"
                    step="0.01"
                    value={adjustmentData.insurance_charge}
                    onChange={(e) =>
                      handleAdjustmentChange("insurance_charge", e.target.value)
                    }
                    className="border text-[14px] border-[#22358114] rounded px-[20px] py-[10px] focus:border-[#515151] duration-300 focus-visible:!outline-0"
                    placeholder="0.00"
                  />
                  <input
                    type="text"
                    disabled
                    value="-"
                    className="text-[14px] border border-[#22358114] rounded px-[20px] py-[10px] bg-gray-50 cursor-not-allowed"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3 mb-2">
                  <span>Fuel charge</span>
                  <input
                    type="number"
                    step="0.01"
                    value={adjustmentData.fuel_charge}
                    onChange={(e) =>
                      handleAdjustmentChange("fuel_charge", e.target.value)
                    }
                    className="border text-[14px] border-[#22358114] rounded px-[20px] py-[10px] focus:border-[#515151] duration-300 focus-visible:!outline-0"
                    placeholder="0.00"
                  />
                  <input
                    type="text"
                    disabled
                    value="-"
                    className="text-[14px] border border-[#22358114] rounded px-[20px] py-[10px] bg-gray-50 cursor-not-allowed"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3 mb-2 items-center">
                  <span>Any additional charges</span>
                  <input
                    type="number"
                    step="0.01"
                    value={adjustmentData.additional_charges}
                    onChange={(e) =>
                      handleAdjustmentChange(
                        "additional_charges",
                        e.target.value,
                      )
                    }
                    className="col-span-2 border text-[14px] border-[#22358114] rounded px-[20px] py-[10px] focus:border-[#515151] duration-300 focus-visible:!outline-0"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="border-b border-[#EEEFF5] mt-[30px] mb-[20px]"></div>

              <div className="grid grid-cols-3 gap-3 mt-4">
                <span className="font-bold">Total Deductions</span>
                <span>-£{totals?.totalDeductions?.toFixed(2)}</span>
                <span>
                  {totals?.vatAmount > 0
                    ? `-£${totals?.vatAmount?.toFixed(2)}`
                    : "-"}
                </span>
              </div>

              <div className="bg-[#22358114] rounded-[15px] p-4 mt-[25px]">
                <div className="flex justify-between text-primary font-bold">
                  <span>Adjustment Total:</span>
                  <span>-£{totals?.totalWithVat?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between mt-[15px] text-primary font-bold">
                  <span>Final Total:</span>
                  <span>£{totals?.finalTotal?.toFixed(2)}</span>
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
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Generating...
                  </>
                ) : (
                  "Generate Invoice"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showDeleteModal}
        title="Delete Driver"
        description={`Are you sure you want to delete ${selectedDriver?.name}?`}
        confirmText="Delete"
        loading={deleteLoading}
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={() =>
          handleDeleteSelfOwnDriver({
            driverId: selectedDriver.id,
            driverName: selectedDriver.name,
            setLoading: setDeleteLoading,
            closeModal: () => setShowDeleteModal(false),
            onSuccess: (msg) => {
              setShowDeleteModal(false);
              router.push("/self-own/drivers");
            },
            onError: (msg) => {
              setShowDeleteModal(false);
            },
          })
        }
      />
    </div>
  );
}

export default DriverProfileDetail;
