"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
export default function PaidCustomDropdown({
  invoice,
  onDownload,
  onDownloadCsv,
  onStatusUpdate,
  onAdjustment,
  onRegenerate,
  isDownloading,
  isRegenerating,
  isFinalInvoice,
}) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(invoice?.is_paid ? "Paid" : "Unpaid");
  const [isUpdating, setIsUpdating] = useState(false);
  const ref = useRef(null);
    const dropdownRef = useRef(null);
      const buttonRef = useRef(null);
    
  

  // Check if invoice is paid - disable regenerate and unpaid option for paid invoices
  const isPaid = invoice?.is_paid === true;

  const isFinalized = invoice?.status === "FINAL";

  // Sync status with invoice prop when it changes
  useEffect(() => {
    setStatus(invoice?.is_paid ? "Paid" : "Unpaid");
  }, [invoice?.is_paid]);

  // Close dropdown when clicking outside
useEffect(() => {
  const handleClickOutside = (event) => {
    const target = event.target;

    if (
      dropdownRef.current?.contains(target) ||
      buttonRef.current?.contains(target)
    ) {
      return;
    }

    setOpen(false);
  };

  document.addEventListener("click", handleClickOutside);
  return () =>
    document.removeEventListener("click", handleClickOutside);
}, []);

  const handleDownload = async () => {
    try {
      await onDownload(invoice.id);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  const handleDownloadCsv = async () => {
    try {
      await onDownloadCsv(invoice.id);
    } catch (error) {
      console.error("CSV Download failed:", error);
    }
  };

  const handleStatusChange = async (newStatus) => {
    const isPaidStatus = newStatus === "Paid";

    // Prevent changing from Paid to Unpaid
    if (isPaid && newStatus === "Unpaid") {
      return;
    }

    // Only update if status actually changed
    if (invoice.is_paid === isPaidStatus) {
      return;
    }

    setIsUpdating(true);
    try {
      await onStatusUpdate(isPaidStatus);
      setStatus(newStatus);
      setOpen(false);
    } catch (error) {
      setStatus(invoice.is_paid ? "Paid" : "Unpaid");
      console.error("Status update failed:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleFinalizeInvoice = () => {
    onAdjustment(invoice.id);
    setOpen(false);
  };

  const handleRegenerate = async () => {
    try {
      await onRegenerate(invoice.id);
      setOpen(false);
    } catch (error) {
      console.error("Regenerate failed:", error);
    }
  };

  // Close dropdown when download completes
  useEffect(() => {
    if (!isDownloading && !isRegenerating && open) {
      const timer = setTimeout(() => {
        setOpen(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isDownloading, isRegenerating]);

    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
    useEffect(() => {
      if (open && buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setDropdownPosition({ top: rect.bottom + window.scrollY, left: rect.right - 192 }); // 192 = width of dropdown
      }
    }, [open]);


      // Close dropdown on outside click
  
  const DropOpen = () => {
    return (
      <div
        ref={dropdownRef}
        style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
        className="absolute z-[9999] w-[200px] rounded-[14px] border border-[#E5E7EB] bg-white shadow-[7px_11px_24px_#22358114] z-50 px-4 py-4"
      >
        <p className="text-[14px] font-bold text-[#0F172A] mb-3">
          Payment Status
        </p>

        {isPaid && (
          <div className="bg-green-50 border border-green-200 rounded-md p-2 mb-3">
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              <span className="text-[10px] text-green-700 font-medium">
                Payment status is locked
              </span>
            </div>
          </div>
        )}

        <div className="space-y-2 mb-4">
          <label
            className={`flex items-center gap-3 ${
              isPaid ? "cursor-not-allowed" : "cursor-pointer"
            }`}
            title={isPaid ? "Payment status is locked" : "Mark as Paid"}
          >
            <input
              type="radio"
              name={`status-${invoice.id}`}
              checked={status === "Paid"}
              onChange={() => handleStatusChange("Paid")}
              disabled={isUpdating || isPaid}
              className="w-4 h-4 accent-[#1E3A8A] disabled:cursor-not-allowed"
            />
            <span
              className={`text-[12px] font-normal text-[#009249] ${
                isPaid ? "opacity-70" : ""
              }`}
            >
              Paid
            </span>
            {isPaid && (
              <svg
                className="w-3 h-3 text-green-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            {isUpdating && status === "Paid" && !isPaid && (
              <svg
                className="animate-spin h-3 w-3 text-[#009249]"
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
            )}
          </label>

          <label
            className={`flex items-center gap-3 ${
              isPaid ? "cursor-not-allowed opacity-50" : "cursor-pointer"
            }`}
            title={
              isPaid ? "Cannot change paid invoice to unpaid" : "Mark as Unpaid"
            }
          >
            <input
              type="radio"
              name={`status-${invoice.id}`}
              checked={status === "Unpaid"}
              onChange={() => handleStatusChange("Unpaid")}
              disabled={isUpdating || isPaid}
              className="w-4 h-4 accent-[#1E3A8A] disabled:cursor-not-allowed"
            />
            <span className="text-[12px] font-normal text-[#C00000]">
              Unpaid
            </span>
            {isPaid && (
              <svg
                className="w-3 h-3 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            )}
            {isUpdating && status === "Unpaid" && !isPaid && (
              <svg
                className="animate-spin h-3 w-3 text-[#C00000]"
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
            )}
          </label>
        </div>

        <button
          onClick={handleFinalizeInvoice}
          className="
              w-full
              bg-[#223581]
              text-white
              text-[12px]
              font-bold              
              rounded-[3px]
              px-[17px]
              py-[8px]
              leading-[1.2]
              mb-2
              hover:bg-[#1B2F73]
              transition
              cursor-pointer
              disabled:opacity-50
              disabled:cursor-not-allowed
            "
          disabled={
            isUpdating || isDownloading || isRegenerating || isFinalInvoice
          }
        >
          Finalize Invoice
        </button>

        {/* Regenerate Invoice Button */}
        <button
          onClick={handleRegenerate}
          disabled={isRegenerating || isUpdating || isDownloading || isPaid}
          className="
              w-full
              flex
              items-center
              justify-center
              gap-2
              bg-[#F59E0B]
              text-white
              text-[12px]
              font-bold
              rounded-[3px]
              py-[8px]
              px-[10px]
              mb-2
              hover:bg-[#D97706]
              transition
              cursor-pointer
              disabled:opacity-50
              disabled:cursor-not-allowed
            "
          title={
            isPaid ? "Cannot regenerate paid invoices" : "Regenerate Invoice"
          }
        >
          {isRegenerating ? (
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
              <span>Regenerating...</span>
            </>
          ) : (
            <>
              {/* Regenerate Icon */}
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span>Regenerate Invoice</span>
            </>
          )}
        </button>

        <button
          onClick={handleDownload}
          disabled={
            isDownloading || isUpdating || isRegenerating || !isFinalized
          }
          className="
              w-full
              flex
              items-center
              justify-center
              gap-2
              border
              border-[#22358114]
              text-[12px]
              text-[#000]
              font-bold
              rounded-[3px]
              py-[8px]
              px-[10px]             
              hover:bg-gray-50
              transition
              cursor-pointer
              disabled:opacity-50
              disabled:cursor-not-allowed
            "
        >
          {isDownloading ? (
            <>
              <svg
                className="animate-spin h-4 w-4 text-[#223581]"
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
              <span>Downloading...</span>
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
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              <span>Download PDF</span>
            </>
          )}
        </button>

        <button
          onClick={handleDownloadCsv}
          disabled={
            isDownloading || isUpdating || isRegenerating || !isFinalized
          }
          className="
              w-full
              flex
              items-center
              justify-center
              gap-2
              border
              border-[#22358114]
              text-[12px]
              text-[#000]
              font-bold
              rounded-[3px]
              py-[8px]
              px-[10px]             
              hover:bg-gray-50
              transition
              cursor-pointer
              disabled:opacity-50
              disabled:cursor-not-allowed
            "
        >
          {isDownloading ? (
            <>
              <svg
                className="animate-spin h-4 w-4 text-[#223581]"
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
              <span>Downloading...</span>
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
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span>Download CSV</span>
            </>
          )}
        </button>
      </div>
    );
  };

  return (
    <div ref={ref} className="relative">
      <button
        ref={buttonRef}

        onClick={() => setOpen(!open)}
        className="p-1 cursor-pointer"
        disabled={isUpdating || isDownloading || isRegenerating}
      >
        <svg width="33" height="8" viewBox="0 0 33 8" fill="none">
          <circle
            cx="29.33"
            cy="3.66"
            r="3.66"
            fill={open ? "#223581" : "#223581"}
            
          />
          <circle
            cx="16.5"
            cy="3.66"
            r="3.66"
            fill={open ? "#223581" : "#223581"}
            
          />
          <circle
            cx="3.66"
            cy="3.66"
            r="3.66"
            fill={open ? "#223581" : "#223581"}
            
          />
        </svg>
      </button>

      {open && createPortal(<DropOpen/>, document.body)}
    </div>
  );
}
