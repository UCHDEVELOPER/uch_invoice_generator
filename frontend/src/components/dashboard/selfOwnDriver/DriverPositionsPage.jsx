"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  getAllDriverPositions,
  addDriverPosition,
  updateDriverPosition,
  deleteDriverPosition,
} from "@/lib/api/self-own/driver.api";
import { calculatePageNumbers } from "@/utils/helpers";
import toast from "react-hot-toast";
import Loader from "../Loader";
import ConfirmModal from "../ConfirmModal";

// ─── ADD / EDIT MODAL ────────────────────────────────────────────────────────────

function DriverPositionModal({
  isOpen,
  onClose,
  onSuccess,
  editData = null,
}) {
  const isEdit = !!editData;

  const [label, setLabel] = useState("");
  const [maxWeight, setMaxWeight] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isEdit && editData) {
      setLabel(editData.label || "");
      setMaxWeight(
        editData.max_weight !== null && editData.max_weight !== undefined
          ? String(editData.max_weight)
          : ""
      );
    } else {
      setLabel("");
      setMaxWeight("");
    }
    setErrors({});
  }, [isOpen, editData]);

  const validate = () => {
    const newErrors = {};

    if (!label.trim()) {
      newErrors.label = "Label is required";
    }

    if (maxWeight !== "" && maxWeight !== null) {
      const parsed = parseFloat(maxWeight);
      if (isNaN(parsed)) {
        newErrors.maxWeight = "Max weight must be a valid number";
      } else if (parsed < 0) {
        newErrors.maxWeight = "Max weight must be non-negative";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);

    try {
      const payload = {
        label: label.trim(),
      };

      if (maxWeight !== "" && maxWeight !== null) {
        payload.max_weight = parseFloat(maxWeight);
      } else {
        payload.max_weight = null;
      }

      let response;

      if (isEdit) {
        response = await updateDriverPosition(editData.id, payload);
      } else {
        response = await addDriverPosition(payload);
      }

      if (response?.data?.success) {
        toast.success(
          response.data.message ||
            `Position ${isEdit ? "updated" : "created"} successfully!`
        );
        onSuccess();
        onClose();
      } else {
        toast.error(response?.data?.message || "Something went wrong");
      }
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          `Failed to ${isEdit ? "update" : "create"} position.`
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={!loading ? onClose : undefined}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-[15px] w-full max-w-[500px] mx-4 p-6 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[20px] 2xl:text-[24px] font-bold text-[#223581]">
            {isEdit ? "Edit Position" : "Add New Position"}
          </h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="w-[35px] h-[35px] rounded-full border border-[#22358114] flex items-center justify-center hover:bg-red-50 hover:border-red-300 duration-300 cursor-pointer"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M1 1L11 11M1 11L11 1"
                stroke="#515151"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Label */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-[#515151] mb-2">
              Label <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => {
                setLabel(e.target.value);
                if (errors.label) {
                  setErrors((prev) => ({ ...prev, label: "" }));
                }
              }}
              placeholder="e.g., Front Left"
              className={`w-full py-[12px] px-[16px] border rounded-[6px] placeholder:text-[#B4B4B4] focus:outline-0 focus:border-[#515151] duration-300 ${
                errors.label ? "border-red-500" : "border-[#22358114]"
              }`}
              disabled={loading}
            />
            {errors.label && (
              <p className="text-red-500 text-xs mt-1">{errors.label}</p>
            )}
          </div>

          {/* Max Weight */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-[#515151] mb-2">
              Max Weight (kg)
            </label>
            <input
              type="number"
              value={maxWeight}
              onChange={(e) => {
                setMaxWeight(e.target.value);
                if (errors.maxWeight) {
                  setErrors((prev) => ({ ...prev, maxWeight: "" }));
                }
              }}
              placeholder="e.g., 85.5"
              step="0.1"
              min="0"
              className={`w-full py-[12px] px-[16px] border rounded-[6px] placeholder:text-[#B4B4B4] focus:outline-0 focus:border-[#515151] duration-300 ${
                errors.maxWeight ? "border-red-500" : "border-[#22358114]"
              }`}
              disabled={loading}
            />
            {errors.maxWeight && (
              <p className="text-red-500 text-xs mt-1">{errors.maxWeight}</p>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-[25px] py-[10px] rounded-[6px] border border-[#22358114] text-sm font-semibold text-[#515151] hover:bg-gray-50 duration-300 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-[25px] py-[10px] rounded-[6px] bg-secondary border border-secondary hover:bg-secondary/20 hover:text-secondary text-sm font-semibold text-white duration-300 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
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
                  {isEdit ? "Updating..." : "Adding..."}
                </>
              ) : isEdit ? (
                "Update Position"
              ) : (
                "Add Position"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────────

export default function DriverPositionsPage() {
  const router = useRouter();

  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(10);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState(null);

  // Add/Edit modal state
  const [showFormModal, setShowFormModal] = useState(false);
  const [editData, setEditData] = useState(null);

  const loadPositions = async () => {
    setLoading(true);
    try {
      const response = await getAllDriverPositions();

      if (response?.data?.success && response?.data?.statusCode === 200) {
        setPositions(response.data.data || []);
      }
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to fetch driver positions."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPositions();
  }, []);

  // ─── SEARCH & PAGINATION (client-side) ──────────────────────────────────────

  const filteredPositions = positions.filter((position) => {
    const term = searchTerm.toLowerCase();
    return (
      position.label?.toLowerCase().includes(term) ||
      position.slug?.toLowerCase().includes(term) ||
      (position.max_weight !== null &&
        position.max_weight !== undefined &&
        String(position.max_weight).includes(term))
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredPositions.length / limit));
  const totalPositions = filteredPositions.length;

  const paginatedPositions = filteredPositions.slice(
    (currentPage - 1) * limit,
    currentPage * limit
  );

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // ─── HANDLERS ───────────────────────────────────────────────────────────────

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const getPageNumbers = () => calculatePageNumbers(totalPages, currentPage);

  const handleAddNew = () => {
    setEditData(null);
    setShowFormModal(true);
  };

  const handleEdit = (position) => {
    setEditData(position);
    setShowFormModal(true);
  };

  const handleDeleteClick = (position) => {
    setSelectedPosition(position);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedPosition) return;

    setDeleteLoading(true);

    try {
      const response = await deleteDriverPosition(selectedPosition.id);

      if (response?.data?.success) {
        toast.success(
          response.data.message || "Position deleted successfully!"
        );
        setShowDeleteModal(false);
        setSelectedPosition(null);
        loadPositions();
      } else {
        toast.error(response?.data?.message || "Failed to delete position.");
      }
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to delete position."
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleFormSuccess = () => {
    loadPositions();
  };

  // ─── RENDER ─────────────────────────────────────────────────────────────────

  return (
    <section className="">
      {/* Header */}
      <div className="flex flex-wrap sm:flex-nowrap items-center gap-[20px] justify-between mb-6">
        <div className="relative lg:min-w-[450px] 2xl:min-w-[624px]">
          <input
            type="text"
            placeholder="Search by label, slug, max weight..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full py-[15px] pl-[20px] pr-[60px] border border-[#22358114] rounded-[6px] placeholder:text-[#B4B4B4] focus:outline-0 focus:border-[#515151] duration-300"
          />
          <svg
            className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <div className="flex gap-4">
          <button
            onClick={handleAddNew}
            className="group flex items-center gap-[5px] bg-secondary border border-secondary hover:bg-secondary/20 min-w-[100px] hover:text-secondary duration-300 cursor-pointer rounded-[7px] px-[25px] 2xl:py-[13px] py-[10px] 2xl:text-[18px] font-bold text-sm text-white hover:bg-opacity-90 transition-colors"
          >
            <svg
              className="w-[15px] h-[15px] 2xl:w-[20px] 2xl:h-[20px]"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 5V19M5 12H19"
                className="stroke-white group-hover:stroke-secondary duration-300"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Add Position
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="w-full overflow-x-scroll">
        <table className="w-full border-separate border-spacing-y-3">
          <thead className="text-[16px] sm:text-[18px] 2xl:text-[20px] font-bold">
            <tr>
              <th className="text-left px-[20px] py-[10px]">#</th>
              <th className="text-left px-[20px] py-[10px]">Label</th>
              <th className="text-left px-[20px] py-[10px]">Slug</th>
              <th className="text-left px-[20px] py-[10px]">Max Weight (kg)</th>
              <th className="text-left px-[20px] py-[10px]">Drivers</th>
              <th className="text-left px-[20px] py-[10px]">Created At</th>
              <th className="text-left px-[20px] py-[10px] !text-center">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="text-sm text-[#515151]">
            {loading ? (
              <tr>
                <td colSpan={7}>
                  <Loader text="Fetching positions..." />
                </td>
              </tr>
            ) : paginatedPositions.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-20 text-gray-500">
                  No positions found.
                </td>
              </tr>
            ) : (
              paginatedPositions.map((position, index) => (
                <tr key={position.id} className="bg-white">
                  {/* # */}
                  <td className="px-[20px] py-[20px] border-y border-[#22358114] border-l rounded-l-[15px] w-[80px]">
                    {(currentPage - 1) * limit + index + 1}
                  </td>

                  {/* Label */}
                  <td className="px-[20px] py-[20px] 2xl:text-[18px] border-y border-[#22358114] whitespace-nowrap font-medium">
                    {position.label}
                  </td>

                  {/* Slug */}
                  <td className="px-[20px] py-[20px] 2xl:text-[18px] border-y border-[#22358114] whitespace-nowrap">
                    <span className="bg-[#f0f1f5] text-[#515151] px-3 py-1 rounded-full text-xs font-mono">
                      {position.slug}
                    </span>
                  </td>

                  {/* Max Weight */}
                  <td className="px-[20px] py-[20px] 2xl:text-[18px] border-y border-[#22358114] whitespace-nowrap">
                    {position.max_weight !== null &&
                    position.max_weight !== undefined
                      ? `${position.max_weight} kg`
                      : "—"}
                  </td>

                  {/* Drivers Count */}
                  <td className="px-[20px] py-[20px] 2xl:text-[18px] border-y border-[#22358114] whitespace-nowrap">
                    <span
                      className={`font-medium ${
                        (position._count?.drivers || 0) > 0
                          ? "text-[#223581]"
                          : "text-[#B4B4B4]"
                      }`}
                    >
                      {position._count?.drivers || 0}
                    </span>
                  </td>

                  {/* Created At */}
                  <td className="px-[20px] py-[20px] 2xl:text-[18px] border-y border-[#22358114] whitespace-nowrap">
                    {new Date(position.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>

                  {/* Actions */}
                  <td className="px-[20px] py-[20px] 2xl:text-[18px] border-y border-[#22358114] border-r rounded-r-[15px]">
                    <div className="flex items-center justify-center gap-2">
                      {/* Edit Button */}
                      <button
                        onClick={() => handleEdit(position)}
                        className="w-[36px] h-[36px] rounded-full border border-[#22358114] flex items-center justify-center hover:bg-blue-50 hover:border-blue-300 duration-300 cursor-pointer group"
                        title="Edit"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13"
                            className="stroke-[#515151] group-hover:stroke-blue-500 duration-300"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M18.5 2.50001C18.8978 2.10219 19.4374 1.87869 20 1.87869C20.5626 1.87869 21.1022 2.10219 21.5 2.50001C21.8978 2.89784 22.1213 3.4374 22.1213 4.00001C22.1213 4.56262 21.8978 5.10219 21.5 5.50001L12 15L8 16L9 12L18.5 2.50001Z"
                            className="stroke-[#515151] group-hover:stroke-blue-500 duration-300"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDeleteClick(position)}
                        className="w-[36px] h-[36px] rounded-full border border-[#22358114] flex items-center justify-center hover:bg-red-50 hover:border-red-300 duration-300 cursor-pointer group"
                        title="Delete"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M3 6H5H21"
                            className="stroke-[#515151] group-hover:stroke-red-500 duration-300"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z"
                            className="stroke-[#515151] group-hover:stroke-red-500 duration-300"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M10 11V17"
                            className="stroke-[#515151] group-hover:stroke-red-500 duration-300"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M14 11V17"
                            className="stroke-[#515151] group-hover:stroke-red-500 duration-300"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {paginatedPositions.length > 0 && totalPages > 1 ? (
        <div className="flex items-center justify-center mt-8">
          <div className="flex gap-2">
            {/* Previous */}
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

            {/* Next */}
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

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        title="Delete Position"
        description={`Are you sure you want to delete "${selectedPosition?.label}"? ${
          (selectedPosition?._count?.drivers || 0) > 0
            ? `This position has ${selectedPosition._count.drivers} driver(s) assigned to it.`
            : ""
        }`}
        confirmText="Delete"
        loading={deleteLoading}
        onCancel={() => {
          setShowDeleteModal(false);
          setSelectedPosition(null);
        }}
        onConfirm={handleConfirmDelete}
      />

      {/* Add / Edit Modal */}
      <DriverPositionModal
        isOpen={showFormModal}
        onClose={() => {
          setShowFormModal(false);
          setEditData(null);
        }}
        onSuccess={handleFormSuccess}
        editData={editData}
      />
    </section>
  );
}