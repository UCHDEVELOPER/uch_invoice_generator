"use client";

import React, { useState, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { calculatePageNumbers } from "@/utils/helpers";

// ── Dummy data (replace with API call later) ────────────────────────────────
const DUMMY_BATCHES = Array.from({ length: 27 }, (_, i) => {
  const start = new Date(2025, 0, 1 + i * 7); // every 7 days
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const pad = (n) => String(n).padStart(2, "0");
  const toISO = (d) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return {
    id: `BATCH${String(1000 + i + 1)}`,
    start_date: toISO(start),
    end_date: toISO(end),
  };
});

export default function BatchInvoice() {
  const router = useRouter();
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const pathname = usePathname();

  const isSelfOwn = pathname.startsWith("/self-own");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // ── Client-side filtering (dummy data) ────────────────────────────────────
  const filteredBatches = useMemo(() => {
    return DUMMY_BATCHES.filter((b) => {
      const matchesSearch =
        !searchTerm || b.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFrom = !fromDate || b.end_date >= fromDate;
      const matchesTo = !toDate || b.start_date <= toDate;
      return matchesSearch && matchesFrom && matchesTo;
    });
  }, [searchTerm, fromDate, toDate]);

  // ── Client-side pagination ────────────────────────────────────────────────
  const totalCount = filteredBatches.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));
  const pagination = {
    hasPrevPage: currentPage > 1,
    hasNextPage: currentPage < totalPages,
  };
  const batches = filteredBatches.slice(
    (currentPage - 1) * limit,
    currentPage * limit,
  );

  // Handlers
  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
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

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setFromDate("");
    setToDate("");
    setCurrentPage(1);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-GB", {
      timeZone: "Europe/London",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getPageNumbers = () => calculatePageNumbers(totalPages, currentPage);

  return (
    <div>
      <section>
        {/* ── Filter bar ───────────────────────────────────────── */}
        <div className="xl:flex-nowrap items-center justify-between gap-[20px] mb-6">
          <div className="flex flex-col items-start sm:flex-row sm:items-center flex-wrap xl:flex-nowrap gap-[20px] w-full">
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

            <div className="relative w-full lg:max-w-[600px]">
              <input
                type="text"
                placeholder="Search by batch ID..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
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

          {batches.length > 0 && (
            <div className="text-sm text-[#515151]">
              Showing {(currentPage - 1) * limit + 1} to{" "}
              {Math.min(currentPage * limit, totalCount)} of {totalCount}{" "}
              batches
            </div>
          )}
        </div>

        {/* ── Table ── */}
        <div className="w-full overflow-x-scroll">
          <table className="w-full border-separate border-spacing-y-3">
            <thead className="text-[16px] sm:text-[18px] 2xl:text-[20px] font-bold">
              <tr>
                <th className="text-left px-[20px] py-[5px] whitespace-nowrap">
                  Sr No.
                </th>
                <th className="text-left px-[20px] py-[5px] whitespace-nowrap">
                  Batch ID
                </th>
                <th className="text-left px-[20px] py-[5px] whitespace-nowrap">
                  Date Range
                </th>
              </tr>
            </thead>
            <tbody className="text-[16px] text-normal text-[#515151]">
              {batches.length === 0 ? (
                <tr className="bg-white">
                  <td colSpan={3} className="py-[20px] text-center">
                    No batches found
                  </td>
                </tr>
              ) : (
                batches.map((batch, index) => (
                  <tr
                    key={batch.id}
                    role="link"
                    tabIndex={0}
                    onClick={() =>
                      router.push(
                        isSelfOwn
                          ? `/self-own/batch-management/${batch.id}`
                          : `/batch-management/${batch.id}`,
                      )
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter")
                        router.push(
                          isSelfOwn
                            ? `/self-own/batch-management/${batch.id}`
                            : `/batch-management/${batch.id}`,
                        );
                    }}
                    className="bg-white cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-[20px] py-[20px] border-y border-[#22358114] border-l rounded-l-[15px]">
                      {(currentPage - 1) * limit + index + 1}
                    </td>
                    <td className="px-[20px] py-[20px] border-y border-[#22358114] whitespace-nowrap font-semibold text-[#000]">
                      {batch.id}
                    </td>
                    <td className="px-[20px] py-[20px] border-y border-[#22358114] border-r rounded-r-[15px] whitespace-nowrap">
                      {formatDate(batch.start_date)} -{" "}
                      {formatDate(batch.end_date)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        {batches.length > 0 && (
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
                <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
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
                <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
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
    </div>
  );
}
