"use client";

import React, { useState } from "react";
import { toast } from "react-hot-toast";
import { exportJobs } from "@/lib/api/job.api";

function ExportJobsModal({ isOpen, onClose }) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    setStartDate("");
    setEndDate("");
    onClose();
  };

  const handleExport = async () => {
    if (!startDate || !endDate) {
      toast.error("Please select both start and end dates");
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast.error("Start date cannot be after end date");
      return;
    }

    try {
      setLoading(true);

      const res = await exportJobs({ start_date: startDate, end_date: endDate });

      if (!res.data.success) {
        toast.error(res.data.message || "Export failed");
        return;
      }

      const { csv, filename } = res.data.data;

      // Trigger browser CSV download
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename || "jobs_export.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Jobs exported successfully");
      handleClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to export jobs");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-[16px] shadow-xl w-full max-w-[460px] mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#22358114]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-primary"
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
            </div>
            <div>
              <h2 className="text-[18px] font-bold text-[#1a1a1a]">
                Export Jobs
              </h2>
              <p className="text-[13px] text-[#888] font-normal">
                Download jobs as a CSV file
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#f5f5f5] transition"
          >
            <svg
              className="w-4 h-4 text-[#888]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-5">
          <p className="text-[14px] text-[#515151]">
            Select a date range to export jobs. All jobs within the selected
            period will be included in the CSV file.
          </p>

          <div className="space-y-4">
            {/* From Date */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] font-semibold text-[#333]">
                From Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                onKeyDown={(e) => e.preventDefault()}
                max={endDate || undefined}
                className="py-[10px] px-[14px] w-full rounded-[8px] border border-[#22358114] focus-visible:outline-0 focus:border-primary duration-300 text-[#515151] text-[15px] font-normal"
              />
            </div>

            {/* To Date */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] font-semibold text-[#333]">
                To Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                onKeyDown={(e) => e.preventDefault()}
                min={startDate || undefined}
                className="py-[10px] px-[14px] w-full rounded-[8px] border border-[#22358114] focus-visible:outline-0 focus:border-primary duration-300 text-[#515151] text-[15px] font-normal"
              />
            </div>
          </div>

          {/* Date range preview */}
          {startDate && endDate && (
            <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-[8px] px-4 py-3">
              <svg
                className="w-4 h-4 text-primary shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p className="text-[13px] text-primary font-medium">
                Exporting jobs from{" "}
                <span className="font-bold">
                  {new Date(startDate).toLocaleDateString("en-GB")}
                </span>{" "}
                to{" "}
                <span className="font-bold">
                  {new Date(endDate).toLocaleDateString("en-GB")}
                </span>
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#22358114] bg-[#fafafa]">
          <button
            onClick={handleClose}
            disabled={loading}
            className="px-5 py-[9px] rounded-[8px] border border-[#22358114] text-[14px] font-semibold text-[#515151] hover:bg-[#f0f0f0] duration-300 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={loading || !startDate || !endDate}
            className="flex items-center gap-2 px-5 py-[9px] rounded-[8px] bg-primary border border-primary text-white text-[14px] font-semibold hover:bg-primary/90 duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <svg
                  className="w-4 h-4 animate-spin"
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
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Exporting...
              </>
            ) : (
              <>
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
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Export CSV
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ExportJobsModal;