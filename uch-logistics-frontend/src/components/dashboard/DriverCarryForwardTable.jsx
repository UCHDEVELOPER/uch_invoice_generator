"use client";

import { deleteCarryForwardCharges } from "@/lib/api/driver.api";
import React, { useState } from "react";
import toast from "react-hot-toast";

function DriverCarryForwardTable({
  carryForwards = [],
  onDeleted,
}) {
  const [deletingId, setDeletingId] = useState(null);

  const formatCurrency = (amount) => {
    return `£${Number(amount || 0).toFixed(2)}`;
  };

  const handleDeleteCarryForward = async (
    carryForwardId,
  ) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this carry-forward charge?",
    );

    if (!confirmed) return;

    try {
      setDeletingId(carryForwardId);

      const response = await deleteCarryForwardCharges(carryForwardId);

      if (response.data?.success) {
        toast.success(
          response.data?.message ||
            "Carry-forward deleted successfully",
        );

        if (onDeleted) {
          onDeleted(carryForwardId);
        }
      } else {
        toast.error(
          response.data?.message ||
            "Failed to delete carry-forward",
        );
      }
    } catch (error) {
      console.error(error);

      toast.error(
        error.response?.data?.message ||
          "Failed to delete carry-forward",
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mt-8">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-[22px] font-black text-primary">
            Pending Carry Forward Charges
          </h2>

          <p className="text-sm text-gray-500 mt-1">
            These deductions will be added to the
            next payable invoice.
          </p>
        </div>
      </div>

      {!carryForwards.length ? (
        <div className="border rounded-lg py-10 text-center text-gray-500">
          No pending carry-forward charges found.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-primary text-white">
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Week
                </th>

                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Year
                </th>

                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Admin Fee
                </th>

                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Admin VAT
                </th>

                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Vehicle Hire
                </th>

                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Vehicle VAT
                </th>

                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Insurance
                </th>

                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Insurance VAT
                </th>

                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Fuel
                </th>

                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Fuel VAT
                </th>

                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Total
                </th>

                <th className="px-4 py-3 text-center text-sm font-semibold">
                  Status
                </th>

                <th className="px-4 py-3 text-center text-sm font-semibold">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {carryForwards.map((item, index) => (
                <tr
                  key={item.id}
                  className={`border-b ${
                    index % 2 === 0
                      ? "bg-gray-50"
                      : "bg-white"
                  }`}
                >
                  <td className="px-4 py-3 text-sm">
                    {item.invoice_week}
                  </td>

                  <td className="px-4 py-3 text-sm">
                    {item.invoice_year}
                  </td>

                  <td className="px-4 py-3 text-sm">
                    {formatCurrency(item.admin_fee)}
                  </td>

                  <td className="px-4 py-3 text-sm">
                    {formatCurrency(
                      item.admin_fee_vat,
                    )}
                  </td>

                  <td className="px-4 py-3 text-sm">
                    {formatCurrency(
                      item.vehicle_hire_charge,
                    )}
                  </td>

                  <td className="px-4 py-3 text-sm">
                    {formatCurrency(
                      item.vehicle_hire_vat,
                    )}
                  </td>

                  <td className="px-4 py-3 text-sm">
                    {formatCurrency(
                      item.insurance_charge,
                    )}
                  </td>

                  <td className="px-4 py-3 text-sm">
                    {formatCurrency(
                      item.insurance_vat,
                    )}
                  </td>

                  <td className="px-4 py-3 text-sm">
                    {formatCurrency(
                      item.fuel_charge,
                    )}
                  </td>

                  <td className="px-4 py-3 text-sm">
                    {formatCurrency(
                      item.fuel_vat,
                    )}
                  </td>

                  <td className="px-4 py-3 text-sm font-bold text-primary">
                    {formatCurrency(
                      item.total_amount,
                    )}
                  </td>

                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                        item.status === "PENDING"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-center">
                    <button
                      disabled={
                        deletingId === item.id ||
                        item.status !== "PENDING"
                      }
                      onClick={() =>
                        handleDeleteCarryForward(
                          item.id,
                        )
                      }
                      className="bg-red-500 hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-xs font-semibold px-4 py-2 rounded-md duration-200"
                    >
                      {deletingId === item.id
                        ? "Deleting..."
                        : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>

            <tfoot>
              <tr className="bg-gray-100 border-t">
                <td
                  colSpan={10}
                  className="px-4 py-4 text-right font-bold text-primary"
                >
                  Grand Pending Total
                </td>

                <td className="px-4 py-4 font-black text-primary">
                  {formatCurrency(
                    carryForwards.reduce(
                      (sum, item) =>
                        sum +
                        Number(
                          item.total_amount || 0,
                        ),
                      0,
                    ),
                  )}
                </td>

                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

export default DriverCarryForwardTable;
