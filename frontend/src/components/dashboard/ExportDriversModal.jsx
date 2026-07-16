// components/ExportDriversModal.jsx
"use client";

import React, { useState } from "react";

const EXPORT_COLUMNS = [
  { key: "name", label: "Name", default: true },
  { key: "call_sign", label: "CallSign", default: true },
  { key: "sage_name" , label: "SageName", default: false },
  { key: "position", label: "Position", default: true },
  { key: "shift_type", label: "ShiftType", default: true },
  { key: "per_hour_rate", label: "HourlyRate", default: true },
  { key: "total_hours", label: "TotalHours", default: true },
  { key: "vat_percent", label: "AdminVATPercentage", default: true },
  { key: "admin_fee", label: "AdminFee", default: true },
  { key: "vehicle_hire_charge", label: "VehicleHireCharge", default: true },
  { key: "vehicle_vat_percent", label: "VehicleVATPercentage", default: true },
  { key: "insurance_charge", label: "InsuranceCharge", default: true },
  { key: "insurance_vat_percent", label: "InsuranceVATPercentage", default: true },
  { key: "fuel_charge", label: "FuelCharge", default: true },
  { key: "fuel_vat_percent", label: "FuelVATPercentage", default: true },
  { key: "bank_user_name", label: "BankUserName", default: false },
  { key: "bank_account_no", label: "BankAccountNo", default: false },
  { key: "iban_no", label: "SortCode", default: false },
  { key: "payment_reference", label: "PaymentReference", default: false },
  { key: "email", label: "Email", default: true },
  { key: "phone_number", label: "PhoneNumber", default: true },
  { key: "address_details", label: "Address", default: false },
  { key: "zip_code", label: "PostCode", default: false },
  { key: "payroll_id", label: "Payroll ID", default: false },
  { key: "carry_forward_admin_fee", label: "CarryForwardAdminFee" , default : true },
  { key: "carry_forward_admin_vat_percent", label: "CarryForwardAdminVATPercentage" , default : true },
  { key: "carry_forward_vehicle_hire_charge", label: "CarryForwardVehicleHireCharge" , default : true },
  { key: "carry_forward_vehicle_vat_percent", label: "CarryForwardVehicleVATPercentage" , default : true },
  { key: "carry_forward_insurance_charge", label: "CarryForwardInsuranceCharge" , default : true },
  { key: "carry_forward_insurance_vat_percent", label: "CarryForwardInsuranceVATPercentage" , default : true },
  { key: "carry_forward_fuel_charge", label: "CarryForwardFuelCharge" , default : true },
  { key: "carry_forward_fuel_vat_percent", label: "CarryForwardFuelVATPercentage" , default : true },
];

function ExportDriversModal({ isOpen, onClose, onExport, exportLoading }) {
  const [format, setFormat] = useState("csv");
  const [selectedColumns, setSelectedColumns] = useState(
    EXPORT_COLUMNS.filter((col) => col.default).map((col) => col.key)
  );

  const handleToggleColumn = (key) => {
    setSelectedColumns((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSelectAll = () => {
    if (selectedColumns.length === EXPORT_COLUMNS.length) {
      setSelectedColumns([]);
    } else {
      setSelectedColumns(EXPORT_COLUMNS.map((col) => col.key));
    }
  };

  const handleExport = () => {
    if (selectedColumns.length === 0) return;
    onExport({ format, columns: selectedColumns });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-[15px] w-full max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#22358114]">
          <h2 className="text-[20px] font-bold text-[#223581]">
            Export Drivers
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition cursor-pointer"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M1 1L13 13M1 13L13 1"
                stroke="#515151"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto flex-1">
          {/* Format Selection */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-[#223581] mb-3">
              Export Format
            </label>
            <div className="flex gap-4">
              <label
                className={`flex items-center gap-3 px-4 py-3 rounded-[10px] border-2 cursor-pointer transition-all duration-200 flex-1 ${
                  format === "csv"
                    ? "border-[#009249] bg-[#009249]/5"
                    : "border-[#22358114] hover:border-[#009249]/40"
                }`}
              >
                <input
                  type="radio"
                  name="format"
                  value="csv"
                  checked={format === "csv"}
                  onChange={() => setFormat("csv")}
                  className="accent-[#009249] w-4 h-4"
                />
                <div className="flex items-center gap-2">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z"
                      fill="#009249"
                      fillOpacity="0.15"
                      stroke="#009249"
                      strokeWidth="1.5"
                    />
                    <path d="M14 2V8H20" stroke="#009249" strokeWidth="1.5" />
                    <text
                      x="12"
                      y="17"
                      textAnchor="middle"
                      fontSize="6"
                      fill="#009249"
                      fontWeight="bold"
                    >
                      CSV
                    </text>
                  </svg>
                  <span className="font-semibold text-sm">CSV File</span>
                </div>
              </label>

              <label
                className={`flex items-center gap-3 px-4 py-3 rounded-[10px] border-2 cursor-pointer transition-all duration-200 flex-1 ${
                  format === "pdf"
                    ? "border-[#C00000] bg-[#C00000]/5"
                    : "border-[#22358114] hover:border-[#C00000]/40"
                }`}
              >
                <input
                  type="radio"
                  name="format"
                  value="pdf"
                  checked={format === "pdf"}
                  onChange={() => setFormat("pdf")}
                  className="accent-[#C00000] w-4 h-4"
                />
                <div className="flex items-center gap-2">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z"
                      fill="#C00000"
                      fillOpacity="0.15"
                      stroke="#C00000"
                      strokeWidth="1.5"
                    />
                    <path d="M14 2V8H20" stroke="#C00000" strokeWidth="1.5" />
                    <text
                      x="12"
                      y="17"
                      textAnchor="middle"
                      fontSize="6"
                      fill="#C00000"
                      fontWeight="bold"
                    >
                      PDF
                    </text>
                  </svg>
                  <span className="font-semibold text-sm">PDF File</span>
                </div>
              </label>
            </div>
          </div>

          {/* Column Selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-semibold text-[#223581]">
                Select Columns ({selectedColumns.length}/{EXPORT_COLUMNS.length})
              </label>
              <button
                onClick={handleSelectAll}
                className="text-xs font-semibold text-[#223581] hover:text-[#C00000] transition cursor-pointer"
              >
                {selectedColumns.length === EXPORT_COLUMNS.length
                  ? "Deselect All"
                  : "Select All"}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-2">
              {EXPORT_COLUMNS.map((col,index) => (
                <label
                  key={`${col.key}-${index}`} 
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-[8px] border cursor-pointer transition-all duration-200 ${
                    selectedColumns.includes(col.key)
                      ? "border-[#223581]/30 bg-[#223581]/5"
                      : "border-[#22358114] hover:border-[#223581]/20"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedColumns.includes(col.key)}
                    onChange={() => handleToggleColumn(col.key)}
                    className="accent-[#223581] w-4 h-4 rounded"
                  />
                  <span className="text-sm text-[#515151]">{col.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#22358114]">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-[6px] border border-[#22358114] text-sm font-semibold text-[#515151] hover:bg-gray-50 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={exportLoading || selectedColumns.length === 0}
            className={`px-6 py-2.5 rounded-[6px] text-sm font-semibold text-white transition cursor-pointer flex items-center gap-2 ${
              format === "csv"
                ? "bg-[#009249] hover:bg-[#007a3d]"
                : "bg-[#C00000] hover:bg-[#a00000]"
            } ${
              exportLoading || selectedColumns.length === 0
                ? "opacity-50 cursor-not-allowed"
                : ""
            }`}
          >
            {exportLoading ? (
              <>
                <svg
                  className="animate-spin h-4 w-4"
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
                Exporting...
              </>
            ) : (
              <>
                Export as {format.toUpperCase()}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ExportDriversModal;