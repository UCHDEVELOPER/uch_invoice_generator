"use client";
import React, { useState, useRef } from "react";
import toast from "react-hot-toast";
import { importDrivers } from "@/lib/api/self-own/driver.api";
import DriverProfilesPage from "./DriverProfile";

function ImportDriversModal({ isOpen, onClose, onSuccess , loadDrivers  }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const allowedTypes = [
    "text/csv",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ];

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    validateAndSetFile(selected);
  };

  const validateAndSetFile = (selected) => {
    if (!selected) return;

    if (!allowedTypes.includes(selected.type)) {
      toast.error("Only CSV or Excel files are allowed");
      return;
    }

    if (selected.size > 10 * 1024 * 1024) {
      toast.error("File size should not exceed 10MB");
      return;
    }

    setFile(selected);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast.error("Please select a file");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setLoading(true);
      await importDrivers(formData);
      toast.success("Drivers are being imported, it may take a few minutes");
      onSuccess();
      handleClose();
      loadDrivers();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to import drivers");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setDragActive(false);
    onClose();
  };

  const handleRemoveFile = (e) => {
    e.stopPropagation();
    setFile(null);
    setDragActive(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-[12px] w-[90%] max-w-[420px] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold mb-4">Import Drivers</h2>

        {/* Info Message */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg
                className="w-5 h-5 text-blue-500 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-blue-800 mb-1">
                Import Guidelines
              </h4>
              <p className="text-sm text-blue-700">
                Upload a CSV or Excel file with driver details. Ensure all required fields (name, callsign, position, status) are included for successful import.
              </p>
            </div>
          </div>
        </div>

        {/* Upload Box */}
        <div
          className={`relative border-2 border-dashed rounded-[8px] p-6 mb-4 text-center transition-all duration-200 ${
            dragActive
              ? "border-primary bg-primary/5"
              : file
              ? "border-green-500 bg-green-50"
              : "border-gray-300 hover:border-primary hover:bg-gray-50"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            id="file-upload"
            accept=".csv,.xls,.xlsx"
            onChange={handleFileChange}
            className={`absolute inset-0 w-full h-full opacity-0 ${
              file ? "pointer-events-none" : "cursor-pointer"
            }`}
            disabled={loading}
            ref={fileInputRef}
          />

          {!file ? (
            <div className="pointer-events-none">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15"
                    stroke="#223581"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M17 8L12 3L7 8"
                    stroke="#223581"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M12 3V15"
                    stroke="#223581"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-700 mb-1">
                {dragActive ? "Drop file here" : "Drop file or click to browse"}
              </p>
              <p className="text-xs text-gray-500">CSV, XLS, XLSX (Max 10MB)</p>
            </div>
          ) : (
            <div className="pointer-events-none">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-green-100 flex items-center justify-center">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M20 6L9 17L4 12"
                    stroke="#22C55E"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-700 mb-1 truncate px-4">
                {file.name}
              </p>
              <p className="text-xs text-gray-500 mb-2">
                {formatFileSize(file.size)}
              </p>
              <button
                onClick={handleRemoveFile}
                className="pointer-events-auto text-xs text-red-600 hover:text-red-700 font-medium"
              >
                Remove file
              </button>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2 border rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={loading || !file}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Importing..." : "Import"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ImportDriversModal;