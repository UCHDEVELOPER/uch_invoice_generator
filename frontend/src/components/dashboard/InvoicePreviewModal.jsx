import Loader from "./Loader";
import { useState, useEffect } from "react";

export const InvoicePreviewModal = ({ isOpen, onClose, invoice, loading }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const jobsPerPage = 30;

  // Reset to page 1 when modal opens or invoice changes
  useEffect(() => {
    if (isOpen) {
      setCurrentPage(1);
    }
  }, [isOpen, invoice?.id]);

  if (!isOpen) return null;

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "";

    const date = new Date(dateString);

    const dateFormatted = date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      timeZone: "Europe/London",
    });

    const timeFormatted = date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Europe/London",
    });

    return `${dateFormatted} ${timeFormatted}`;
  };

  const formatCurrency = (amount) => {
    const num = Number(amount) || 0;
    return num.toLocaleString("en-GB", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatNegativeCurrency = (amount) => {
    const num = Number(amount) || 0;
    if (num === 0) return "";
    return `-${formatCurrency(num)}`;
  };

  // Calculate totals
  const calculateTotalDeductions = () => {
    if (!invoice) return 0;
    const totalDeductions = Number(invoice.total_deductions) || 0;
    const vat = Number(invoice.vat) || 0;

    return totalDeductions - vat;
  };

  const calculatePerRowVat = () => {
    if (!invoice)
      return {
        adminVat: 0,
        vehicleVat: 0,
        insuranceVat: 0,
        fuelVat: 0,
        totalVat: 0,
      };

    const adminFee = Number(invoice.admin_fee) || 0;
    const adminVatPct = Number(invoice.vat) || 0;
    const vehicle = Number(invoice.vehicle_hire_charges) || 0;
    const vehicleVatPct = Number(invoice.driver?.vehicle_vat_percent) || 0;
    const insurance = Number(invoice.insurance_charge) || 0;
    const insVatPct = Number(invoice.driver?.insurance_vat_percent) || 0;
    const fuel = Number(invoice.fuel_charge) || 0;
    const fuelVatPct = Number(invoice.driver?.fuel_vat_percent) || 0;
    const additional_charges_1 =
      Number(invoice.driver.additional_charges_1) || 0;
    const additional_charges_vat_1_percent =
      Number(invoice.driver.additional_charges_vat_1_percent) || 0;
    const additional_charges_2 =
      Number(invoice.driver.additional_charges_2) || 0;
    const additional_charges_vat_2_percent =
      Number(invoice.driver.additional_charges_vat_2_percent) || 0;
    const additional_charges_3 =
      Number(invoice.driver.additional_charges_3) || 0;
    const additional_charges_vat_3_percent =
      Number(invoice.driver.additional_charges_vat_3_percent) || 0;

    const adminVat = adminFee * (adminVatPct / 100);
    const vehicleVat = vehicle * (vehicleVatPct / 100);
    const insuranceVat = insurance * (insVatPct / 100);
    const fuelVat = fuel * (fuelVatPct / 100);

    const carryForwardAdmin = Number(invoice.carry_forward_admin_fee ?? 0);

    const carryForwardVehicle = Number(
      invoice.carry_forward_vehicle_hire_charge ?? 0,
    );

    const carryForwardInsurance = Number(
      invoice.carry_forward_insurance_charge ?? 0,
    );

    const carryForwardFuel = Number(invoice.carry_forward_fuel_charge ?? 0);

    /**
     * Base carry-forward charges
     */
    const carriedForwardCharges =
      carryForwardAdmin +
      carryForwardVehicle +
      carryForwardInsurance +
      carryForwardFuel;

    /**
     * Carry-forward VAT
     */
    const carryForwardAdminVat =
      carryForwardAdmin *
      (Number(invoice.carry_forward_admin_vat_percent ?? 0) / 100);

    const carryForwardVehicleVat =
      carryForwardVehicle *
      (Number(invoice.carry_forward_vehicle_vat_percent ?? 0) / 100);

    const carryForwardInsuranceVat =
      carryForwardInsurance *
      (Number(invoice.carry_forward_insurance_vat_percent ?? 0) / 100);

    const carryForwardFuelVat =
      carryForwardFuel *
      (Number(invoice.carry_forward_fuel_vat_percent ?? 0) / 100);

    const carriedForwardVat =
      carryForwardAdminVat +
      carryForwardVehicleVat +
      carryForwardInsuranceVat +
      carryForwardFuelVat;

    const docketTotalVat =
      invoice.docket_total * (invoice.driver.docket_total_vat / 100);

    const additional_charges_1_vat =
      additional_charges_1 * (additional_charges_vat_1_percent / 100);
    const additional_charges_2_vat =
      additional_charges_2 * (additional_charges_vat_2_percent / 100);
    const additional_charges_3_vat =
      additional_charges_3 * (additional_charges_vat_3_percent / 100);

    const totalVat = invoice.vat;

    return {
      adminVat,
      vehicleVat,
      insuranceVat,
      fuelVat,
      totalVat,
      carriedForwardCharges,
      carriedForwardVat,
      docketTotalVat,
    };
  };

  const calculateAdjustmentTotal = () => {
    return calculateTotalDeductions() + calculatePerRowVat().totalVat;
  };

  // Parse address into lines
  const parseAddress = (address) => {
    if (!address) return [];
    return address.split(",").map((line) => line.trim());
  };

  // Pagination calculations
  const totalJobs = invoice?.jobs?.length || 0;
  const totalPages = Math.ceil(totalJobs / jobsPerPage);
  const startIndex = (currentPage - 1) * jobsPerPage;
  const endIndex = startIndex + jobsPerPage;
  const currentJobs = invoice?.jobs?.slice(startIndex, endIndex) || [];

  // Reset to page 1 when modal opens or invoice changes
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-[900px] max-h-[95vh] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-800 text-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <svg
              className="w-6 h-6"
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
            <h2 className="text-xl font-bold">Invoice Preview</h2>
            {invoice && (
              <span className="text-sm opacity-80">
                #{invoice.id?.slice(-6).toUpperCase() || "N/A"}
              </span>
            )}
            {totalPages > 1 && (
              <span className="text-sm opacity-80">
                - Page {currentPage} of {totalPages}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <svg
                className="w-6 h-6"
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
        </div>

        {/* Invoice Content - Scrollable */}
        <div
          className="flex-1 overflow-y-auto"
          style={{
            fontFamily: "Arial, Helvetica, sans-serif",
            background: "#282828",
          }}
        >
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader text="Loading invoice details..." />
            </div>
          ) : invoice ? (
            <div
              style={{
                width: "100%",
                maxWidth: "794px",
                background: "#ffffff",
                margin: "20px auto",
                padding: "clamp(16px, 4vw, 40px)",
                boxSizing: "border-box",
                color: "#000",
                fontSize: "12px",
                position: "relative",
              }}
            >
              {/* HEADER */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "0 40px",
                }}
              >
                <div>
                  <strong>TO:</strong>
                  <br />
                  <strong>UCH Logistics Ltd</strong>
                  <br />
                  Colnbrook Cargo Centre
                  <br />
                  Old Bath Road
                  <br />
                  Colnbrook
                  <br />
                  Slough
                  <br />
                  SL3 0NW
                  <br />
                  +44 (0)1784 242824
                </div>
              </div>

              <hr
                style={{
                  margin: "25px 0",
                  border: 0,
                  borderTop: "2px solid #000",
                }}
              />

              {/* FROM + INFO */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "0 80px",
                }}
              >
                <div>
                  <strong>FROM:</strong>
                  <br />
                  {invoice.driver?.name || "N/A"}
                  <br />
                  {parseAddress(invoice.driver?.address_details).map(
                    (line, idx) => (
                      <span key={idx}>
                        {line}
                        <br />
                      </span>
                    ),
                  )}
                  {invoice.driver?.zip_code || ""}
                </div>

                <div>
                  <table style={{ borderCollapse: "collapse" }}>
                    <tbody>
                      <tr>
                        <td style={{ padding: "2px 8px" }}>Driver Callsign:</td>
                        <td style={{ padding: "2px 8px" }}>
                          {invoice.driver?.call_sign || "N/A"}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: "2px 8px" }}>Self Bill Date:</td>
                        <td style={{ padding: "2px 8px" }}>
                          {formatDate(invoice.created_at)}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: "2px 8px" }}>
                          Self Bill Number:
                        </td>
                        <td style={{ padding: "2px 8px" }}>
                          {invoice.id?.slice(-6).toUpperCase() || "N/A"}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: "2px 8px" }}></td>
                        <td style={{ padding: "2px 8px" }}>
                          Page: {currentPage} of {totalPages}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: "2px 8px" }}>
                          VAT No:
                        </td>
                        <td style={{ padding: "2px 8px" }}>
                          {invoice.driver?.vat_number || "N/A"}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* JOBS LIST */}
              <div
                style={{
                  width: "100%",
                  marginTop: "25px",
                  fontSize: "11px",
                  minHeight: "400px",
                }}
              >
                <ul
                  style={{
                    border: "2px solid #000",
                    borderRight: 0,
                    borderLeft: 0,
                    listStyle: "none",
                    display: "flex",
                    padding: "4px 0",
                    margin: 0,
                    marginBottom: "5px",
                  }}
                >
                  <li
                    style={{
                      textAlign: "left",
                      fontWeight: 400,
                      flexBasis: "10%",
                    }}
                  >
                    Docket No.
                  </li>
                  <li
                    style={{
                      textAlign: "left",
                      fontWeight: 400,
                      flexBasis: "15%",
                    }}
                  >
                    Pickup Date/Time
                  </li>
                  <li
                    style={{
                      textAlign: "left",
                      fontWeight: 400,
                      flexBasis: "18%",
                    }}
                  >
                    Tariff
                  </li>
                  <li
                    style={{
                      textAlign: "left",
                      fontWeight: 400,
                      flexBasis: "40%",
                    }}
                  >
                    Journey Details
                  </li>
                  <li
                    style={{
                      textAlign: "right",
                      fontWeight: 400,
                      flexGrow: 1,
                      padding: "0 20px",
                    }}
                  >
                    Amount
                  </li>
                </ul>

                {currentJobs.length > 0 ? (
                  currentJobs.map((job, index) => (
                    <ul
                      key={job.id || index}
                      style={{
                        listStyle: "none",
                        display: "flex",
                        padding: 0,
                        margin: 0,
                      }}
                    >
                      <li
                        style={{
                          textAlign: "left",
                          fontWeight: 400,
                          flexBasis: "10%",
                        }}
                      >
                        {job.docket_no || "N/A"}
                      </li>
                      <li
                        style={{
                          textAlign: "left",
                          fontWeight: 400,
                          flexBasis: "15%",
                        }}
                      >
                        {formatDateTime(job.date_time)}
                      </li>
                      <li
                        style={{
                          textAlign: "left",
                          fontWeight: 400,
                          flexBasis: "18%",
                        }}
                      >
                        {job.tariff || "N/A"}
                      </li>
                      <li
                        style={{
                          textAlign: "left",
                          fontWeight: 400,
                          flexBasis: "40%",
                        }}
                      >
                        {job.journey || "N/A"}
                      </li>
                      <li
                        style={{
                          textAlign: "right",
                          fontWeight: 400,
                          flexGrow: 1,
                          padding: "0 20px",
                        }}
                      >
                        {formatCurrency(job.driver_total)}
                      </li>
                    </ul>
                  ))
                ) : (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "20px",
                      color: "#999",
                    }}
                  >
                    No jobs found for this invoice
                  </div>
                )}
              </div>

              {/* Show footer only on last page when there are multiple pages, or always show if only 1 page */}
              {(totalPages === 1 || currentPage === totalPages) && (
                <footer
                  style={{
                    width: "100%",
                    marginTop: "40px",
                    paddingBottom: "40px",
                  }}
                >
                  {/* TOTAL */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      border: "2px solid #000",
                      borderLeft: 0,
                      borderRight: 0,
                      padding: "8px 0",
                    }}
                  >
                    <div>
                      Number of Dockets: {invoice.total_number_of_dockets || 0}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "40px",
                        padding: "0 20px",
                      }}
                    >
                      Docket Total:{" "}
                      <span>{formatCurrency(invoice.docket_total)}</span>
                    </div>
                  </div>

                  {/* ADJUSTMENTS */}
                  <div style={{ marginTop: "10px" }}>
                    <strong style={{ fontSize: "11px" }}>
                      Pay Adjustment Detail
                    </strong>

                    <div
                      style={{
                        width: "70%",
                        marginTop: "4px",
                        borderBottom: "1px solid #000",
                      }}
                    >
                      {/* Header */}
                      <ul
                        style={{
                          listStyle: "none",
                          display: "flex",
                          alignItems: "center",
                          padding: 0,
                          margin: 0,
                          borderBottom: "1px solid #ccc",
                          paddingBottom: "3px",
                        }}
                      >
                        <li style={{ flexBasis: "38%" }}>Description</li>
                        <li style={{ flexBasis: "14%", textAlign: "center" }}>
                          Value
                        </li>
                        <li style={{ flexBasis: "10%", textAlign: "center" }}>
                          VAT %
                        </li>
                        <li style={{ flexBasis: "14%", textAlign: "center" }}>
                          VAT £
                        </li>
                      </ul>

                      {Number(invoice.admin_fee) > 0 &&
                        (() => {
                          const vatPct =
                            Number(invoice.driver.vat_percent) || 0;
                          const vatAmt =
                            Number(invoice.admin_fee) * (vatPct / 100);
                          return (
                            <ul
                              style={{
                                listStyle: "none",
                                display: "flex",
                                alignItems: "center",
                                padding: "2px 0",
                                margin: 0,
                              }}
                            >
                              <li style={{ flexBasis: "38%" }}>Admin Fee</li>
                              <li
                                style={{
                                  flexBasis: "14%",
                                  textAlign: "center",
                                }}
                              >
                                {formatNegativeCurrency(invoice.admin_fee)}
                              </li>
                              <li
                                style={{
                                  flexBasis: "10%",
                                  textAlign: "center",
                                }}
                              >
                                {vatPct}%
                              </li>
                              <li
                                style={{
                                  flexBasis: "14%",
                                  textAlign: "center",
                                }}
                              >
                                -{formatCurrency(vatAmt)}
                              </li>
                            </ul>
                          );
                        })()}

                      {Number(invoice.vehicle_hire_charges) > 0 &&
                        (() => {
                          const vatPct =
                            Number(invoice.driver?.vehicle_vat_percent) || 0;
                          const vatAmt =
                            Number(invoice.vehicle_hire_charges) *
                            (vatPct / 100);
                          return (
                            <ul
                              style={{
                                listStyle: "none",
                                display: "flex",
                                alignItems: "center",
                                padding: "2px 0",
                                margin: 0,
                              }}
                            >
                              <li style={{ flexBasis: "38%" }}>
                                Vehicle Hire charges
                              </li>
                              <li
                                style={{
                                  flexBasis: "14%",
                                  textAlign: "center",
                                }}
                              >
                                {formatNegativeCurrency(
                                  invoice.vehicle_hire_charges,
                                )}
                              </li>
                              <li
                                style={{
                                  flexBasis: "10%",
                                  textAlign: "center",
                                }}
                              >
                                {vatPct}%
                              </li>
                              <li
                                style={{
                                  flexBasis: "14%",
                                  textAlign: "center",
                                }}
                              >
                                -{formatCurrency(vatAmt)}
                              </li>
                            </ul>
                          );
                        })()}

                      {Number(invoice.insurance_charge) > 0 &&
                        (() => {
                          const vatPct =
                            Number(invoice.driver?.insurance_vat_percent) || 0;
                          const vatAmt =
                            Number(invoice.insurance_charge) * (vatPct / 100);
                          return (
                            <ul
                              style={{
                                listStyle: "none",
                                display: "flex",
                                alignItems: "center",
                                padding: "2px 0",
                                margin: 0,
                              }}
                            >
                              <li style={{ flexBasis: "38%" }}>
                                Insurance charge
                              </li>
                              <li
                                style={{
                                  flexBasis: "14%",
                                  textAlign: "center",
                                }}
                              >
                                {formatNegativeCurrency(
                                  invoice.insurance_charge,
                                )}
                              </li>
                              <li
                                style={{
                                  flexBasis: "10%",
                                  textAlign: "center",
                                }}
                              >
                                {vatPct}%
                              </li>
                              <li
                                style={{
                                  flexBasis: "14%",
                                  textAlign: "center",
                                }}
                              >
                                -{formatCurrency(vatAmt)}
                              </li>
                            </ul>
                          );
                        })()}

                      {Number(invoice.fuel_charge) > 0 &&
                        (() => {
                          const vatPct =
                            Number(invoice.driver?.fuel_vat_percent) || 0;
                          const vatAmt =
                            Number(invoice.fuel_charge) * (vatPct / 100);
                          return (
                            <ul
                              style={{
                                listStyle: "none",
                                display: "flex",
                                alignItems: "center",
                                padding: "2px 0",
                                margin: 0,
                              }}
                            >
                              <li style={{ flexBasis: "38%" }}>Fuel charge</li>
                              <li
                                style={{
                                  flexBasis: "14%",
                                  textAlign: "center",
                                }}
                              >
                                {formatNegativeCurrency(invoice.fuel_charge)}
                              </li>
                              <li
                                style={{
                                  flexBasis: "10%",
                                  textAlign: "center",
                                }}
                              >
                                {vatPct}%
                              </li>
                              <li
                                style={{
                                  flexBasis: "14%",
                                  textAlign: "center",
                                }}
                              >
                                -{formatCurrency(vatAmt)}
                              </li>
                            </ul>
                          );
                        })()}

                      {/* Docket Total VAT */}
                      {Number(invoice.driver?.docket_total_vat_percent) > 0 &&
                        (() => {
                          const docketVatPct =
                            Number(invoice.driver?.docket_total_vat_percent) ||
                            0;
                          const docketVatAmt =
                            Number(invoice.docket_total) * (docketVatPct / 100);
                          return (
                            <ul
                              style={{
                                listStyle: "none",
                                display: "flex",
                                alignItems: "center",
                                padding: "2px 0",
                                margin: 0,
                              }}
                            >
                              <li style={{ flexBasis: "38%" }}>Docket VAT</li>
                              <li
                                style={{
                                  flexBasis: "14%",
                                  textAlign: "center",
                                }}
                              >
                                {formatNegativeCurrency(invoice.docket_total)}
                              </li>
                              <li
                                style={{
                                  flexBasis: "10%",
                                  textAlign: "center",
                                }}
                              >
                                {docketVatPct}%
                              </li>
                              <li
                                style={{
                                  flexBasis: "14%",
                                  textAlign: "center",
                                }}
                              >
                                -{formatCurrency(docketVatAmt)}
                              </li>
                            </ul>
                          );
                        })()}

                      {/* Additional Charges 1 */}
                      {Number(invoice.driver?.additional_charges_1) > 0 &&
                        (() => {
                          const add1Val =
                            Number(invoice.driver?.additional_charges_1) || 0;
                          const add1VatPct =
                            Number(
                              invoice.driver?.additional_charges_vat_1_percent,
                            ) || 0;
                          const add1VatAmt = add1Val * (add1VatPct / 100);
                          return (
                            <ul
                              style={{
                                listStyle: "none",
                                display: "flex",
                                alignItems: "center",
                                padding: "2px 0",
                                margin: 0,
                              }}
                            >
                              <li style={{ flexBasis: "38%" }}>
                                Additional Charge 1
                              </li>
                              <li
                                style={{
                                  flexBasis: "14%",
                                  textAlign: "center",
                                }}
                              >
                                {formatNegativeCurrency(add1Val)}
                              </li>
                              <li
                                style={{
                                  flexBasis: "10%",
                                  textAlign: "center",
                                }}
                              >
                                {add1VatPct}%
                              </li>
                              <li
                                style={{
                                  flexBasis: "14%",
                                  textAlign: "center",
                                }}
                              >
                                -{formatCurrency(add1VatAmt)}
                              </li>
                            </ul>
                          );
                        })()}

                      {/* Additional Charges 2 */}
                      {Number(invoice.driver?.additional_charges_2) > 0 &&
                        (() => {
                          const add2Val =
                            Number(invoice.driver?.additional_charges_2) || 0;
                          const add2VatPct =
                            Number(
                              invoice.driver?.additional_charges_vat_2_percent,
                            ) || 0;
                          const add2VatAmt = add2Val * (add2VatPct / 100);
                          return (
                            <ul
                              style={{
                                listStyle: "none",
                                display: "flex",
                                alignItems: "center",
                                padding: "2px 0",
                                margin: 0,
                              }}
                            >
                              <li style={{ flexBasis: "38%" }}>
                                Additional Charge 2
                              </li>
                              <li
                                style={{
                                  flexBasis: "14%",
                                  textAlign: "center",
                                }}
                              >
                                {formatNegativeCurrency(add2Val)}
                              </li>
                              <li
                                style={{
                                  flexBasis: "10%",
                                  textAlign: "center",
                                }}
                              >
                                {add2VatPct}%
                              </li>
                              <li
                                style={{
                                  flexBasis: "14%",
                                  textAlign: "center",
                                }}
                              >
                                -{formatCurrency(add2VatAmt)}
                              </li>
                            </ul>
                          );
                        })()}

                      {/* Additional Charges 3 */}
                      {Number(invoice.driver?.additional_charges_3) > 0 &&
                        (() => {
                          const add3Val =
                            Number(invoice.driver?.additional_charges_3) || 0;
                          const add3VatPct =
                            Number(
                              invoice.driver?.additional_charges_vat_3_percent,
                            ) || 0;
                          const add3VatAmt = add3Val * (add3VatPct / 100);
                          return (
                            <ul
                              style={{
                                listStyle: "none",
                                display: "flex",
                                alignItems: "center",
                                padding: "2px 0",
                                margin: 0,
                              }}
                            >
                              <li style={{ flexBasis: "38%" }}>
                                Additional Charge 3
                              </li>
                              <li
                                style={{
                                  flexBasis: "14%",
                                  textAlign: "center",
                                }}
                              >
                                {formatNegativeCurrency(add3Val)}
                              </li>
                              <li
                                style={{
                                  flexBasis: "10%",
                                  textAlign: "center",
                                }}
                              >
                                {add3VatPct}%
                              </li>
                              <li
                                style={{
                                  flexBasis: "14%",
                                  textAlign: "center",
                                }}
                              >
                                -{formatCurrency(add3VatAmt)}
                              </li>
                            </ul>
                          );
                        })()}

                      {/* Carry Forward Charges */}
                      {Number(invoice.carry_forward_admin_fee) > 0 &&
                        (() => {
                          const cfAdminVal =
                            Number(invoice.carry_forward_admin_fee) || 0;
                          const cfAdminVatPct =
                            Number(invoice.carry_forward_admin_vat_percent) ||
                            0;
                          const cfAdminVatAmt =
                            cfAdminVal * (cfAdminVatPct / 100);
                          return (
                            <ul
                              style={{
                                listStyle: "none",
                                display: "flex",
                                alignItems: "center",
                                padding: "2px 0",
                                margin: 0,
                              }}
                            >
                              <li style={{ flexBasis: "38%" }}>CF Admin Fee</li>
                              <li
                                style={{
                                  flexBasis: "14%",
                                  textAlign: "center",
                                }}
                              >
                                {formatNegativeCurrency(cfAdminVal)}
                              </li>
                              <li
                                style={{
                                  flexBasis: "10%",
                                  textAlign: "center",
                                }}
                              >
                                {cfAdminVatPct}%
                              </li>
                              <li
                                style={{
                                  flexBasis: "14%",
                                  textAlign: "center",
                                }}
                              >
                                -{formatCurrency(cfAdminVatAmt)}
                              </li>
                            </ul>
                          );
                        })()}

                      {Number(invoice.carry_forward_vehicle_hire_charge) > 0 &&
                        (() => {
                          const cfVehVal =
                            Number(invoice.carry_forward_vehicle_hire_charge) ||
                            0;
                          const cfVehVatPct =
                            Number(invoice.carry_forward_vehicle_vat_percent) ||
                            0;
                          const cfVehVatAmt = cfVehVal * (cfVehVatPct / 100);
                          return (
                            <ul
                              style={{
                                listStyle: "none",
                                display: "flex",
                                alignItems: "center",
                                padding: "2px 0",
                                margin: 0,
                              }}
                            >
                              <li style={{ flexBasis: "38%" }}>
                                CF Vehicle Hire
                              </li>
                              <li
                                style={{
                                  flexBasis: "14%",
                                  textAlign: "center",
                                }}
                              >
                                {formatNegativeCurrency(cfVehVal)}
                              </li>
                              <li
                                style={{
                                  flexBasis: "10%",
                                  textAlign: "center",
                                }}
                              >
                                {cfVehVatPct}%
                              </li>
                              <li
                                style={{
                                  flexBasis: "14%",
                                  textAlign: "center",
                                }}
                              >
                                -{formatCurrency(cfVehVatAmt)}
                              </li>
                            </ul>
                          );
                        })()}

                      {Number(invoice.carry_forward_insurance_charge) > 0 &&
                        (() => {
                          const cfInsVal =
                            Number(invoice.carry_forward_insurance_charge) || 0;
                          const cfInsVatPct =
                            Number(
                              invoice.carry_forward_insurance_vat_percent,
                            ) || 0;
                          const cfInsVatAmt = cfInsVal * (cfInsVatPct / 100);
                          return (
                            <ul
                              style={{
                                listStyle: "none",
                                display: "flex",
                                alignItems: "center",
                                padding: "2px 0",
                                margin: 0,
                              }}
                            >
                              <li style={{ flexBasis: "38%" }}>CF Insurance</li>
                              <li
                                style={{
                                  flexBasis: "14%",
                                  textAlign: "center",
                                }}
                              >
                                {formatNegativeCurrency(cfInsVal)}
                              </li>
                              <li
                                style={{
                                  flexBasis: "10%",
                                  textAlign: "center",
                                }}
                              >
                                {cfInsVatPct}%
                              </li>
                              <li
                                style={{
                                  flexBasis: "14%",
                                  textAlign: "center",
                                }}
                              >
                                -{formatCurrency(cfInsVatAmt)}
                              </li>
                            </ul>
                          );
                        })()}

                      {Number(invoice.carry_forward_fuel_charge) > 0 &&
                        (() => {
                          const cfFuelVal =
                            Number(invoice.carry_forward_fuel_charge) || 0;
                          const cfFuelVatPct =
                            Number(invoice.carry_forward_fuel_vat_percent) || 0;
                          const cfFuelVatAmt = cfFuelVal * (cfFuelVatPct / 100);
                          return (
                            <ul
                              style={{
                                listStyle: "none",
                                display: "flex",
                                alignItems: "center",
                                padding: "2px 0",
                                margin: 0,
                              }}
                            >
                              <li style={{ flexBasis: "38%" }}>CF Fuel</li>
                              <li
                                style={{
                                  flexBasis: "14%",
                                  textAlign: "center",
                                }}
                              >
                                {formatNegativeCurrency(cfFuelVal)}
                              </li>
                              <li
                                style={{
                                  flexBasis: "10%",
                                  textAlign: "center",
                                }}
                              >
                                {cfFuelVatPct}%
                              </li>
                              <li
                                style={{
                                  flexBasis: "14%",
                                  textAlign: "center",
                                }}
                              >
                                -{formatCurrency(cfFuelVatAmt)}
                              </li>
                            </ul>
                          );
                        })()}

                      {Number(
                        invoice.driver?.carry_forward_additional_charge_1,
                      ) > 0 &&
                        (() => {
                          const cfAdd1Val =
                            Number(
                              invoice.driver?.carry_forward_additional_charge_1,
                            ) || 0;
                          const cfAdd1VatPct =
                            Number(
                              invoice.driver
                                ?.carry_forward_additional_charge_1_vat_percent,
                            ) || 0;
                          const cfAdd1VatAmt = cfAdd1Val * (cfAdd1VatPct / 100);
                          return (
                            <ul
                              style={{
                                listStyle: "none",
                                display: "flex",
                                alignItems: "center",
                                padding: "2px 0",
                                margin: 0,
                              }}
                            >
                              <li style={{ flexBasis: "38%" }}>
                                CF Additional 1
                              </li>
                              <li
                                style={{
                                  flexBasis: "14%",
                                  textAlign: "center",
                                }}
                              >
                                {formatNegativeCurrency(cfAdd1Val)}
                              </li>
                              <li
                                style={{
                                  flexBasis: "10%",
                                  textAlign: "center",
                                }}
                              >
                                {cfAdd1VatPct}%
                              </li>
                              <li
                                style={{
                                  flexBasis: "14%",
                                  textAlign: "center",
                                }}
                              >
                                -{formatCurrency(cfAdd1VatAmt)}
                              </li>
                            </ul>
                          );
                        })()}

                      {Number(
                        invoice.driver?.carry_forward_additional_charge_2,
                      ) > 0 &&
                        (() => {
                          const cfAdd2Val =
                            Number(
                              invoice.driver?.carry_forward_additional_charge_2,
                            ) || 0;
                          const cfAdd2VatPct =
                            Number(
                              invoice.driver
                                ?.carry_forward_additional_charge_2_vat_percent,
                            ) || 0;
                          const cfAdd2VatAmt = cfAdd2Val * (cfAdd2VatPct / 100);
                          return (
                            <ul
                              style={{
                                listStyle: "none",
                                display: "flex",
                                alignItems: "center",
                                padding: "2px 0",
                                margin: 0,
                              }}
                            >
                              <li style={{ flexBasis: "38%" }}>
                                CF Additional 2
                              </li>
                              <li
                                style={{
                                  flexBasis: "14%",
                                  textAlign: "center",
                                }}
                              >
                                {formatNegativeCurrency(cfAdd2Val)}
                              </li>
                              <li
                                style={{
                                  flexBasis: "10%",
                                  textAlign: "center",
                                }}
                              >
                                {cfAdd2VatPct}%
                              </li>
                              <li
                                style={{
                                  flexBasis: "14%",
                                  textAlign: "center",
                                }}
                              >
                                -{formatCurrency(cfAdd2VatAmt)}
                              </li>
                            </ul>
                          );
                        })()}

                      {Number(
                        invoice.driver?.carry_forward_additional_charge_3,
                      ) > 0 &&
                        (() => {
                          const cfAdd3Val =
                            Number(
                              invoice.driver?.carry_forward_additional_charge_3,
                            ) || 0;
                          const cfAdd3VatPct =
                            Number(
                              invoice.driver
                                ?.carry_forward_additional_charge_3_vat_percent,
                            ) || 0;
                          const cfAdd3VatAmt = cfAdd3Val * (cfAdd3VatPct / 100);
                          return (
                            <ul
                              style={{
                                listStyle: "none",
                                display: "flex",
                                alignItems: "center",
                                padding: "2px 0",
                                margin: 0,
                              }}
                            >
                              <li style={{ flexBasis: "38%" }}>
                                CF Additional 3
                              </li>
                              <li
                                style={{
                                  flexBasis: "14%",
                                  textAlign: "center",
                                }}
                              >
                                {formatNegativeCurrency(cfAdd3Val)}
                              </li>
                              <li
                                style={{
                                  flexBasis: "10%",
                                  textAlign: "center",
                                }}
                              >
                                {cfAdd3VatPct}%
                              </li>
                              <li
                                style={{
                                  flexBasis: "14%",
                                  textAlign: "center",
                                }}
                              >
                                -{formatCurrency(cfAdd3VatAmt)}
                              </li>
                            </ul>
                          );
                        })()}

                      {/* MANUAL DOCKETS SECTION */}
                      {(() => {
                        // Normalize manual dockets from string or array
                        let manualDockets = [];
                        if (invoice.driver?.manual_dockets) {
                          if (
                            typeof invoice.driver.manual_dockets === "string"
                          ) {
                            try {
                              const parsed = JSON.parse(
                                invoice.driver.manual_dockets,
                              );
                              manualDockets = Array.isArray(parsed)
                                ? parsed
                                : [];
                            } catch (err) {
                              manualDockets = [];
                            }
                          } else if (
                            Array.isArray(invoice.driver.manual_dockets)
                          ) {
                            manualDockets = invoice.driver.manual_dockets;
                          }
                        }

                        if (manualDockets.length === 0) {
                          return null;
                        }

                        // Calculate total of manual dockets
                        const manualDocketTotal = manualDockets.reduce(
                          (sum, md) => sum + Number(md.driver_total || 0),
                          0,
                        );

                        return (
                          <div
                            style={{
                              marginTop: "8px",
                              paddingTop: "6px",
                              borderTop: "1px solid #ccc",
                            }}
                          >
                            {manualDockets.map((md, idx) => (
                              <ul
                                key={idx}
                                style={{
                                  listStyle: "none",
                                  display: "flex",
                                  alignItems: "center",
                                  padding: "2px 0",
                                  margin: 0,
                                }}
                              >
                                <li style={{ flexBasis: "38%" }}>
                                  {md.docket_no}
                                </li>
                                <li
                                  style={{
                                    flexBasis: "14%",
                                    textAlign: "center",
                                  }}
                                >
                                  {formatCurrency(Number(md.driver_total || 0))}
                                </li>
                                <li
                                  style={{
                                    flexBasis: "10%",
                                    textAlign: "center",
                                  }}
                                >
                                  -
                                </li>
                                <li
                                  style={{
                                    flexBasis: "14%",
                                    textAlign: "center",
                                  }}
                                >
                                  -
                                </li>
                              </ul>
                            ))}

                            {/* Manual Dockets Total Line */}
                            <ul
                              style={{
                                listStyle: "none",
                                display: "flex",
                                alignItems: "center",
                                padding: "2px 0",
                                margin: 0,
                                marginTop: "4px",
                                paddingTop: "6px",
                                borderTop: "1px solid #000",
                                fontWeight: "bold",
                              }}
                            >
                              <li style={{ flexBasis: "38%" }}>Total</li>
                              <li
                                style={{
                                  flexBasis: "14%",
                                  textAlign: "center",
                                }}
                              >
                                {formatCurrency(manualDocketTotal)}
                              </li>
                              <li
                                style={{
                                  flexBasis: "10%",
                                  textAlign: "center",
                                }}
                              >
                                -
                              </li>
                              <li
                                style={{
                                  flexBasis: "14%",
                                  textAlign: "center",
                                }}
                              >
                                -
                              </li>
                            </ul>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* FINAL TOTAL */}
                  <div
                    style={{
                      borderBottom: "2px solid black",
                      padding: "4px 0",
                    }}
                  >
                    <ul
                      style={{
                        listStyle: "none",
                        display: "flex",
                        alignItems: "center",
                        padding: 0,
                        margin: 0,
                      }}
                    >
                      <ul
                        style={{
                          listStyle: "none",
                          display: "flex",
                          alignItems: "center",
                          padding: 0,
                          margin: 0,
                          width: "100%",
                          maxWidth: "70%",
                        }}
                      >
                        <li style={{ flexBasis: "38%" }}>Total</li>
                        <li style={{ flexBasis: "14%", textAlign: "center" }}>
                          {calculateTotalDeductions() > 0
                            ? `${formatCurrency(calculateTotalDeductions())}`
                            : "0.00"}
                        </li>
                        <li
                          style={{ flexBasis: "10%", textAlign: "center" }}
                        ></li>
                        <li style={{ flexBasis: "14%", textAlign: "center" }}>
                          {calculatePerRowVat().totalVat > 0
                            ? `-${formatCurrency(calculatePerRowVat().totalVat)}`
                            : "0.00"}
                        </li>
                      </ul>
                      <li style={{ flexGrow: 1, textAlign: "right" }}>
                        Adjustment Total:
                      </li>
                      <li style={{ flexBasis: "12%", textAlign: "center" }}>
                        -{formatCurrency(calculateAdjustmentTotal())}
                      </li>
                    </ul>
                  </div>

                  {/* query */}
                  <div
                    style={{
                      padding: "0 0 25px 0",
                      fontSize: "11px",
                      display: "flex",
                      alignItems: "center",
                      borderBottom: "1px solid black",
                    }}
                  >
                    <strong
                      style={{
                        flexBasis: "10%",
                        textAlign: "right",
                        paddingTop: "10px",
                      }}
                    >
                      Total:
                    </strong>
                    <strong
                      style={{
                        flexBasis: "10%",
                        textAlign: "center",
                        paddingTop: "10px",
                      }}
                    >
                      {formatCurrency(invoice.final_total.toFixed(2))}
                    </strong>
                  </div>

                  {/* payment detail */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "11px",
                      paddingTop: "2px",
                    }}
                  >
                    <strong>Payment Details</strong>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        width: "50%",
                        gap: "10px",
                      }}
                    >
                      <span>Signed:</span>
                      <div
                        style={{
                          border: "2px solid gray",
                          padding: "5px",
                          width: "100%",
                        }}
                      >
                        {invoice.signature || ""}
                      </div>
                    </div>
                  </div>
                  <p style={{ margin: 0 }}>
                    BACS: {formatCurrency(invoice.final_total.toFixed(2))}
                  </p>
                </footer>
              )}

              {/* Show "Continued on next page" message on non-last pages when there are multiple pages */}
              {totalPages > 1 && currentPage < totalPages && (
                <div
                  style={{
                    width: "100%",
                    marginTop: "40px",
                    paddingBottom: "40px",
                    textAlign: "center",
                    fontSize: "14px",
                    fontWeight: "bold",
                    borderTop: "2px solid #000",
                    paddingTop: "20px",
                  }}
                >
                  Continued on next page...
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-20">
              <svg
                className="w-16 h-16 text-gray-300 mx-auto mb-4"
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
              <p className="text-gray-500 text-lg">No invoice data available</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex justify-between items-center gap-3 px-6 py-4 border-t bg-gray-50 flex-shrink-0">
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`px-4 py-2 border rounded-lg transition-colors font-medium ${
                  currentPage === 1
                    ? "border-gray-200 text-gray-400 cursor-not-allowed"
                    : "border-gray-300 hover:bg-gray-100"
                }`}
              >
                Previous
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => {
                    // Show first page, last page, current page, and pages around current
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`px-3 py-1 rounded transition-colors ${
                            currentPage === page
                              ? "bg-gray-800 text-white font-semibold"
                              : "hover:bg-gray-200"
                          }`}
                        >
                          {page}
                        </button>
                      );
                    } else if (
                      page === currentPage - 2 ||
                      page === currentPage + 2
                    ) {
                      return (
                        <span key={page} className="px-1">
                          ...
                        </span>
                      );
                    }
                    return null;
                  },
                )}
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`px-4 py-2 border rounded-lg transition-colors font-medium ${
                  currentPage === totalPages
                    ? "border-gray-200 text-gray-400 cursor-not-allowed"
                    : "border-gray-300 hover:bg-gray-100"
                }`}
              >
                Next
              </button>
            </div>
          )}

          {/* Close Button */}
          <button
            onClick={onClose}
            className="px-6 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-medium ml-auto"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
