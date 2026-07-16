"use client";

import React, { useState, useEffect } from "react";
import CustomDropdown from "@/components/layout/CustomDropdown";
import Link from "next/link";
import {
  calculatePageNumbers,
  formatDateForAPI,
  getAllowedDateRange,
  parseDDMMYYYYHHmm,
} from "@/utils/helpers";
import { toast } from "react-hot-toast";
import { fetchAllJobs, deleteJob, deleteBulkJobs } from "@/lib/api/job.api";
import Loader from "./Loader";
import ImportJobsModal from "./ImportJobModal";
import ConfirmModal from "./ConfirmModal";
import ExportJobsModal from "./ExportJobModal";
import { useRouter } from "next/navigation";

function JobManagement() {
  const router = useRouter();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Bulk selection states
  const [selectedJobs, setSelectedJobs] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  const isJobEditable = (jobDateTime) => {
    if (!jobDateTime) return false;
    const { minDate, maxDate } = getAllowedDateRange();
    const jobDate = parseDDMMYYYYHHmm(jobDateTime);
    if (!jobDate) return false;
    return jobDate >= minDate && jobDate <= maxDate;
  };

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalJobs, setTotalJobs] = useState(0);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Bulk delete modal
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  const [importModal, setImportModal] = useState(false);
  const [exportModal, setExportModal] = useState(false); // 👈 new state

  const fetchJobs = async () => {
    try {
      setLoading(true);

      const params = {
        page: currentPage,
        limit,
        search: searchTerm || "",
        from_date: formatDateForAPI(fromDate),
        to_date: formatDateForAPI(toDate),
      };

      const res = await fetchAllJobs(params);

      if (!res.data.success) {
        toast.error(res.data.message);
      } else {
        setJobs(res.data.data);
        setTotalPages(res.data.pagination.totalPages || 1);
        setTotalJobs(res.data.pagination.totalCount || 0);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to fetch jobs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    fetchJobs();
    setSelectedJobs([]);
    setSelectAll(false);
  }, [currentPage, limit, searchTerm, fromDate, toDate]);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleLimitChange = (newLimit) => {
    setLimit(newLimit);
    setCurrentPage(1);
  };

  const handleEdit = (jobId) => {
    router.push(`/job-management/edit/${jobId}`);
  };

  const handleDelete = (id, name) => {
    setSelectedJob({ id, name });
    setShowDeleteModal(true);
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setSelectedJob(null);
  };

  const confirmDelete = async () => {
    try {
      setDeleteLoading(true);
      await deleteJob(selectedJob.id);
      toast.success("Job deleted successfully");
      fetchJobs();
    } catch {
      toast.error("Failed to delete job");
    } finally {
      setDeleteLoading(false);
      setShowDeleteModal(false);
    }
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedJobs([]);
    } else {
      setSelectedJobs(jobs.map((job) => job.id));
    }
    setSelectAll(!selectAll);
  };

  const handleSelectJob = (jobId) => {
    setSelectedJobs((prev) =>
      prev.includes(jobId) ? prev.filter((id) => id !== jobId) : [...prev, jobId]
    );
  };

  useEffect(() => {
    if (jobs.length > 0 && selectedJobs.length === jobs.length) {
      setSelectAll(true);
    } else {
      setSelectAll(false);
    }
  }, [selectedJobs, jobs]);

  const handleBulkDelete = () => {
    if (selectedJobs.length === 0) {
      toast.error("Please select jobs to delete");
      return;
    }
    setShowBulkDeleteModal(true);
  };

  const cancelBulkDelete = () => {
    setShowBulkDeleteModal(false);
  };

  const confirmBulkDelete = async () => {
    try {
      setDeleteLoading(true);
      const response = await deleteBulkJobs(selectedJobs);
      if (!response.data.success) {
        toast.error(response.data.message);
        return;
      }
      toast.success(`${selectedJobs.length} job(s) deleted successfully`);
      setSelectedJobs([]);
      setSelectAll(false);
      fetchJobs();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to delete jobs");
    } finally {
      setDeleteLoading(false);
      setShowBulkDeleteModal(false);
    }
  };

  const handleClearFilter = () => {
    setSearchTerm("");
    setFromDate("");
    setToDate("");
  };

  const getPageNumbers = () => calculatePageNumbers(totalPages, currentPage);

  const formatDateTimeWithAmPm = (dateTimeString) => {
    if (!dateTimeString) return "N/A";
    const [datePart, timePart] = dateTimeString.split(" ");
    if (!timePart) return dateTimeString;
    const [hoursStr, minutes] = timePart.split(":");
    const hours24 = parseInt(hoursStr, 10);
    if (isNaN(hours24)) return dateTimeString;
    const period = hours24 >= 12 ? "PM" : "AM";
    const hours12 = String(hours24 % 12 || 12).padStart(2, "0");
    return `${datePart} ${hours12}:${minutes} ${period}`;
  };

  if (!mounted) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader text="Loading..." />
      </div>
    );
  }

  return (
    <div>
      <section className="">
        <div className="flex flex-wrap 2xl:flex-nowrap items-center justify-between gap-[20px] mb-6">
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

            <div className="relative w-full sm:w-[155px]">
              <button
                onClick={handleClearFilter}
                className="whitespace-nowrap group flex justify-center items-center gap-[5px] rounded-[6px] bg-secondary border border-secondary hover:text-secondary hover:bg-secondary/20 duration-300 cursor-pointer w-full sm:w-[fit-content] min-w-[100px] px-[25px] py-[10px] text-sm font-semibold leading-normal text-white transition"
              >
                Clear Filter
              </button>
            </div>

            <div className="relative w-full lg:max-w-[200px] 2xl:max-w-[624px]">
              <input
                type="text"
                placeholder="Search with name, callsign, Journey etc..."
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

          <div className="w-full flex flex-wrap xl:flex-nowrap items-center 2xl:justify-end gap-3 2xl:w-[30%]">
            {selectedJobs.length > 0 && (
              <button
                onClick={handleBulkDelete}
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
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Delete ({selectedJobs.length})
              </button>
            )}

            {/* ✅ Export Jobs Button */}
            <button
              onClick={() => setExportModal(true)}
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
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Export Jobs
            </button>

            <button
              className="whitespace-nowrap group flex justify-center items-center gap-[5px] rounded-[6px] bg-primary border border-primary hover:bg-primary/20 hover:text-primary duration-300 w-full sm:w-[fit-content] px-[25px] py-[10px] min-w-[100px] text-sm font-semibold leading-normal text-white cursor-pointer transition"
              onClick={() => setImportModal(true)}
            >
              <svg
                className="w-[15px] h-[15px]"
                width="27"
                height="28"
                viewBox="0 0 27 28"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M3.11538 12.963H2.33653C1.04614 12.963 0 14.0077 0 15.2963L0.000124547 15.3093L0 15.3151C0 15.3151 0 23.5026 0 26.4444C0 27.3036 0.697347 28 1.55769 28C5.73242 28 21.2675 28 25.4423 28C25.8554 28 26.2516 27.8361 26.5438 27.5444C26.8359 27.2527 27 26.857 27 26.4444C27 24.4576 27 20.1351 27 18.1482C27 17.7357 26.8359 17.34 26.5438 17.0483C26.2516 16.7566 25.8554 16.5927 25.4423 16.5927C21.4944 16.5927 7.38769 16.5927 2.33554 16.5927C1.99148 16.5927 1.66162 16.4562 1.41837 16.2132C1.17512 15.9703 1.03842 15.6409 1.03842 15.2973C1.03842 15.2971 1.03842 15.2967 1.03842 15.2963C1.03842 14.5804 1.61962 14 2.33653 14H3.11538V15.5556H24.4038V7.25934H20.25C19.8369 7.25934 19.4406 7.09545 19.1485 6.80363C18.8564 6.51193 18.6923 6.11632 18.6923 5.70379V0H4.67307C4.25997 0 3.86369 0.163893 3.5716 0.455591C3.2795 0.747413 3.11538 1.14302 3.11538 1.55556V12.963ZM16.3929 19.8963L18.4698 25.0815C18.5486 25.2784 18.7396 25.4074 18.9519 25.4074C19.1642 25.4074 19.3551 25.2784 19.434 25.0815L21.5109 19.8963C21.6174 19.6306 21.4878 19.3286 21.2216 19.2223C20.9555 19.116 20.6531 19.2455 20.5467 19.5111L18.9519 23.4927L17.357 19.5111C17.2506 19.2455 16.9482 19.116 16.6821 19.2223C16.4161 19.3286 16.2865 19.6306 16.3929 19.8963ZM8.34486 19.1852H8.04802C6.6142 19.1852 5.45191 20.3459 5.45191 21.7778C5.45191 22.1194 5.45191 22.4733 5.45191 22.8149C5.45191 24.2468 6.6142 25.4074 8.04802 25.4074H8.34486C9.271 25.4074 10.1121 24.8679 10.4972 24.0266C10.5509 23.9094 10.5615 23.8872 10.596 23.8108C10.732 23.5094 10.5679 23.2343 10.3731 23.1365C10.0475 22.9731 9.75226 23.1541 9.65157 23.3796C9.62104 23.4481 9.55275 23.5955 9.55275 23.5955C9.33667 24.0676 8.86462 24.3705 8.34486 24.3705H8.04802C7.1878 24.3705 6.49033 23.6739 6.49033 22.8149V21.7778C6.49033 20.9187 7.1878 20.2222 8.04802 20.2222H8.34486C8.86462 20.2222 9.33667 20.5251 9.55275 20.9971C9.55275 20.9971 9.61605 21.1388 9.65157 21.2131C9.80759 21.5396 10.1766 21.586 10.4097 21.4347C10.5736 21.3282 10.7284 21.0709 10.596 20.7819C10.4972 20.5661 10.4972 20.5661 10.4972 20.5661C10.1121 19.7248 9.271 19.1852 8.34486 19.1852ZM11.4231 23.5959V23.8529C11.4231 24.2652 11.5871 24.6607 11.8789 24.9521C12.1709 25.2437 12.5668 25.4074 12.9797 25.4074C13.3539 25.4074 13.776 25.4074 14.1501 25.4074C14.5629 25.4074 14.9588 25.2437 15.2508 24.9521C15.5428 24.6607 15.7067 24.2652 15.7067 23.8529C15.7067 23.7832 15.7067 23.714 15.7067 23.6466C15.7067 23.0105 15.3189 22.4386 14.7275 22.2023L12.8395 21.4481C12.6112 21.3569 12.4615 21.1361 12.4615 20.8906V20.7408C12.4615 20.6033 12.5162 20.4714 12.6135 20.3742C12.711 20.2769 12.843 20.2222 12.9807 20.2222C12.9808 20.2222 14.1491 20.2222 14.1491 20.2222C14.2868 20.2222 14.4188 20.2769 14.5162 20.3742C14.6135 20.4714 14.6682 20.6033 14.6682 20.7408C14.6682 20.7408 14.6682 20.9115 14.6682 20.9969C14.6682 21.1432 14.733 21.2756 14.7982 21.3428C14.8995 21.4577 15.045 21.5186 15.1875 21.5186C15.4402 21.5186 15.7067 21.3237 15.7067 20.9969V20.7408C15.7067 20.3282 15.5426 19.9325 15.2505 19.6408C14.9583 19.3491 14.5622 19.1852 14.1491 19.1852H12.9808C12.5676 19.1852 12.1714 19.3491 11.8793 19.6408C11.5872 19.9325 11.4231 20.3282 11.4231 20.7408C11.4231 20.7912 11.4231 20.8412 11.4231 20.8906C11.4231 21.5601 11.8313 22.1623 12.4538 22.411L14.3418 23.1652C14.539 23.2439 14.6682 23.4346 14.6682 23.6466V23.8529C14.6682 23.9902 14.6136 24.1218 14.5164 24.2189C14.4193 24.3159 14.2875 24.3705 14.1501 24.3705H12.9797C12.8422 24.3705 12.7105 24.3159 12.6133 24.2189C12.5161 24.1218 12.4615 23.9902 12.4615 23.853C12.4615 23.8529 12.4615 23.8529 12.4615 23.5958C12.4615 23.2538 12.1824 23.0739 11.9513 23.0739C11.7323 23.0739 11.4231 23.2435 11.4231 23.5927C11.4231 23.5959 11.4231 23.5959 11.4231 23.5959ZM7.78845 13.4816H19.7307C20.0173 13.4816 20.25 13.2492 20.25 12.963C20.25 12.6768 20.0173 12.4444 19.7307 12.4444H7.78845C7.50183 12.4444 7.26918 12.6768 7.26918 12.963C7.26918 13.2492 7.50183 13.4816 7.78845 13.4816ZM7.78845 10.3705H19.7307C20.0173 10.3705 20.25 10.1381 20.25 9.85189C20.25 9.56567 20.0173 9.33333 19.7307 9.33333H7.78845C7.50183 9.33333 7.26918 9.56567 7.26918 9.85189C7.26918 10.1381 7.50183 10.3705 7.78845 10.3705ZM7.78845 7.25934H14.5385C14.825 7.25934 15.0576 7.027 15.0576 6.74078C15.0576 6.45456 14.825 6.22222 14.5385 6.22222H7.78845C7.50183 6.22222 7.26918 6.45456 7.26918 6.74078C7.26918 7.027 7.50183 7.25934 7.78845 7.25934ZM19.7307 0.345707V5.70379C19.7307 5.8413 19.7854 5.97321 19.8829 6.0704C19.9802 6.16759 20.1123 6.22222 20.25 6.22222H24.1442L19.7307 0.345707Z"
                  className="fill-white group-hover:fill-primary duration-300"
                />
              </svg>
              Add CSV
            </button>

            <Link
              href="/job-management/add"
              className="whitespace-nowrap group flex justify-center items-center gap-[5px] rounded-[6px] bg-secondary border border-secondary hover:text-secondary hover:bg-secondary/20 duration-300 cursor-pointer w-full sm:w-[fit-content] min-w-[100px] px-[25px] py-[10px] text-sm font-semibold leading-normal text-white transition"
            >
              <svg
                className="w-[15px]"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M8 0C7.49022 0 7.07692 0.413277 7.07692 0.923077V7.07692H0.923077C0.413262 7.07692 0 7.49018 0 8C0 8.50978 0.413262 8.92308 0.923077 8.92308H7.07692V15.0769C7.07692 15.5867 7.49022 16 8 16C8.50982 16 8.92308 15.5867 8.92308 15.0769V8.92308H15.0769C15.5867 8.92308 16 8.50978 16 8C16 7.49018 15.5867 7.07692 15.0769 7.07692H8.92308V0.923077C8.92308 0.413277 8.50982 0 8 0Z"
                  className="fill-white group-hover:fill-secondary duration-300"
                />
              </svg>
              Add Jobs
            </Link>
          </div>
        </div>

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
              <option value={500}>500</option>
              <option value={1000}>1000</option>
              <option value={1500}>1500</option>
              <option value={2000}>2000</option>
            </select>
            <span className="text-[16px] text-[#515151] font-medium">
              entries per page
            </span>
          </div>

          {jobs.length > 0 && (
            <div className="text-sm text-[#515151]">
              Showing {(currentPage - 1) * limit + 1} to{" "}
              {Math.min(currentPage * limit, totalJobs)} of {totalJobs} jobs
            </div>
          )}
        </div>

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
                <th className="text-center px-[20px] py-[5px] whitespace-nowrap">Docket</th>
                <th className="text-center px-[20px] py-[5px] whitespace-nowrap">Is Invoiced</th>
                <th className="text-left px-[20px] py-[5px] whitespace-nowrap">Callsign</th>
                <th className="text-left px-[20px] py-[5px] whitespace-nowrap">Date/Time</th>
                <th className="text-left px-[20px] py-[5px] whitespace-wrap">Journey</th>
                <th className="text-left px-[20px] py-[5px] whitespace-wrap">Weight</th>
                <th className="text-left px-[20px] py-[5px] whitespace-nowrap">Driver Total</th>
                <th className="text-left px-[20px] py-[5px] whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="text-[16px] text-normal text-[#515151]">
              {loading ? (
                <tr className="bg-white">
                  <td colSpan={9} className="py-[20px] text-center">
                    <Loader text="Fetching jobs..." />
                  </td>
                </tr>
              ) : jobs.length === 0 ? (
                <tr className="bg-white">
                  <td colSpan={9} className="py-[20px] text-center">
                    No jobs found
                  </td>
                </tr>
              ) : (
                jobs.map((job, index) => (
                  <tr key={job.id} className="bg-white">
                    <td className="px-[20px] py-[20px] border-y border-[#22358114] border-l rounded-l-[15px]">
                      <input
                        type="checkbox"
                        checked={selectedJobs.includes(job.id)}
                        onChange={() => handleSelectJob(job.id)}
                        className="w-5 h-5 cursor-pointer accent-primary"
                      />
                    </td>
                    <td className="px-[20px] py-[20px] border-y border-[#22358114]">
                      {(currentPage - 1) * limit + index + 1}
                    </td>
                    <td className="px-[20px] py-[20px] border-y border-[#22358114] whitespace-nowrap">
                      {job.docket_no}
                    </td>
                    <td className="px-[20px] py-[20px] border-y border-[#22358114] whitespace-nowrap font-semibold">
                      {job.is_invoiced ? "Yes" : "No"}
                    </td>
                    <td className="px-[20px] py-[20px] border-y border-[#22358114] whitespace-nowrap font-semibold">
                      {job.call_sign}
                    </td>
                    <td className="px-[20px] py-[20px] border-y border-[#22358114] whitespace-nowrap">
                      {formatDateTimeWithAmPm(job.date_time)}
                    </td>
                    <td className="px-[20px] py-[20px] border-y border-[#22358114] whitespace-nowrap">
                      {job.journey}
                    </td>
                    <td className="px-[20px] py-[20px] border-y border-[#22358114] whitespace-nowrap">
                      {job.weight ? job.weight + " kg" : "N/A"}
                    </td>
                    <td className="px-[20px] py-[20px] border-y border-[#22358114] whitespace-nowrap">
                      {job.driver_total}
                    </td>
                    <td className="px-[20px] py-[20px] border-y border-[#22358114] border-r rounded-r-[15px] whitespace-nowrap">
                      <div className="flex justify-center">
                        <CustomDropdown
                          driverId={job.id}
                          driverName={job.docket_no || job.driver}
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

        {jobs.length > 0 && (
          <div className="flex items-center justify-center mt-8">
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
                <svg width="7" height="12" viewBox="0 0 7 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5.63267 10.8552C5.58042 10.9109 5.50943 10.9424 5.43524 10.9428C5.39842 10.9432 5.36191 10.9356 5.32796 10.9205C5.29401 10.9055 5.26333 10.8832 5.2378 10.8552L0.582305 5.93362C0.556159 5.90634 0.5354 5.87384 0.52123 5.83801C0.507061 5.80219 0.499764 5.76374 0.499764 5.7249C0.499764 5.68607 0.507061 5.64762 0.52123 5.61179C0.5354 5.57596 0.556159 5.54346 0.582305 5.51618L5.2378 0.593579C5.2634 0.564651 5.29424 0.541462 5.32849 0.525392C5.36274 0.509323 5.3997 0.500701 5.43716 0.500041C5.47463 0.499381 5.51184 0.506695 5.54658 0.521548C5.58131 0.536402 5.61287 0.558491 5.63937 0.586502C5.66586 0.614512 5.68676 0.647871 5.70081 0.684594C5.71486 0.721316 5.72178 0.760652 5.72115 0.800259C5.72053 0.839866 5.71237 0.878936 5.69717 0.915143C5.68197 0.951349 5.66004 0.983954 5.63267 1.01101L1.17461 5.7249L5.63267 10.4377C5.6587 10.4651 5.67935 10.4976 5.69345 10.5334C5.70754 10.5693 5.7148 10.6077 5.7148 10.6465C5.7148 10.6853 5.70754 10.7237 5.69345 10.7595C5.67935 10.7953 5.6587 10.8278 5.63267 10.8552Z" className="fill-[#C00000] stroke-[#C00000] group-hover:fill-[#fff] group-hover:stroke-[#fff]" />
                </svg>
              </button>

              {getPageNumbers().map((page, index) => (
                <button
                  key={index}
                  onClick={() => typeof page === "number" && handlePageChange(page)}
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
                disabled={currentPage === totalPages}
                className={`group px-3 border w-[40px] h-[40px] rounded-[50%] text-sm duration-300 flex items-center justify-center ${
                  currentPage === totalPages
                    ? "opacity-50 cursor-not-allowed border-[#22358114]"
                    : "border-[#22358114] hover:border-secondary hover:bg-secondary"
                }`}
              >
                <svg width="7" height="12" viewBox="0 0 7 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M0.58852 10.8552C0.640767 10.9109 0.711764 10.9424 0.785955 10.9428C0.822775 10.9432 0.859278 10.9356 0.893227 10.9205C0.927176 10.9055 0.957857 10.8832 0.983389 10.8552L5.63889 5.93362C5.66503 5.90634 5.68579 5.87384 5.69996 5.83801C5.71413 5.80219 5.72143 5.76374 5.72143 5.7249C5.72143 5.68607 5.71413 5.64762 5.69996 5.61179C5.68579 5.57596 5.66503 5.54346 5.63889 5.51618L0.983389 0.593579C0.957791 0.564651 0.926949 0.541462 0.892699 0.525392C0.85845 0.509323 0.821492 0.500701 0.784026 0.500041C0.74656 0.499381 0.709352 0.506695 0.674614 0.521548C0.639877 0.536402 0.608321 0.558491 0.581825 0.586502C0.555329 0.614512 0.534434 0.647871 0.520384 0.684594C0.506333 0.721316 0.499414 0.760652 0.500039 0.800259C0.500663 0.839866 0.508819 0.878936 0.52402 0.915143C0.53922 0.951349 0.561156 0.983954 0.58852 1.01101L5.04658 5.7249L0.58852 10.4377C0.562494 10.4651 0.541839 10.4976 0.527744 10.5334C0.51365 10.5693 0.506394 10.6077 0.506394 10.6465C0.506394 10.6853 0.51365 10.7237 0.527744 10.7595C0.541839 10.7953 0.562494 10.8278 0.58852 10.8552Z" className="fill-[#C00000] stroke-[#C00000] group-hover:fill-[#fff] group-hover:stroke-[#fff]" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </section>

      <ImportJobsModal
        isOpen={importModal}
        onClose={() => setImportModal(false)}
        onSuccess={fetchJobs}
      />

      {/* ✅ Export Jobs Modal */}
      <ExportJobsModal
        isOpen={exportModal}
        onClose={() => setExportModal(false)}
      />

      <ConfirmModal
        isOpen={showDeleteModal}
        title="Delete Job"
        description={`Are you sure you want to delete job "${
          selectedJob?.name || selectedJob?.id
        }"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        loading={deleteLoading}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
      />

      <ConfirmModal
        isOpen={showBulkDeleteModal}
        title="Delete Multiple Jobs"
        description={`Are you sure you want to delete ${selectedJobs.length} job(s)? This action cannot be undone.`}
        confirmText="Delete All"
        cancelText="Cancel"
        loading={deleteLoading}
        onCancel={cancelBulkDelete}
        onConfirm={confirmBulkDelete}
      />
    </div>
  );
}

export default JobManagement;