"use client";
import { useState, useEffect } from "react";
import Breadcrumb from "./Breadcrumb";
import Input from "../form/Input";
import CustomSelect from "../layout/CustomSelect";
import { addDriver } from "@/lib/api/driver.api";
import { getAllDriverPositions } from "@/lib/api/driver.api";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

function AddNewDriver() {
  const router = useRouter();

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Driver positions state
  const [driverPositions, setDriverPositions] = useState([]);
  const [positionsLoading, setPositionsLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: "",
    sage_name: "",
    call_sign: "",
    driver_position_id: "",
    per_hour_rate: "",
    total_hours: "",
    weekly_fixed_rate: "",
    total_days: "",
    bank_account_no: "",
    payment_reference: "",
    iban_no: "",
    address_details: "",
    phone_number: "",
    email: "",
    status: "",
    zip_code: "",
    payroll_id: "",
    working_type: "",
    bank_user_name: "",
    vat_percent: 0,
    admin_fee: 0,
    vehicle_hire_charge: 0,
    insurance_charge: 0,
    fuel_charge: 0,
    vehicle_vat_percent: 0,
    insurance_vat_percent: 0,
    fuel_vat_percent: 0,
    shift_type: "",
    carry_forward_admin_fee: 0,
    carry_forward_admin_vat_percent: 0,
    carry_forward_vehicle_hire_charge: 0,
    carry_forward_vehicle_vat_percent: 0,
    carry_forward_insurance_charge: 0,
    carry_forward_insurance_vat_percent: 0,
    carry_forward_fuel_charge: 0,
    carry_forward_fuel_vat_percent: 0,
  });

  // ─── FETCH DRIVER POSITIONS ─────────────────────────────────────────────────

  useEffect(() => {
    const fetchPositions = async () => {
      setPositionsLoading(true);
      try {
        const response = await getAllDriverPositions();
        if (response?.data?.success && response?.data?.statusCode === 200) {
          setDriverPositions(response.data.data || []);
        }
      } catch (err) {
        toast.error(
          err?.response?.data?.message || "Failed to fetch driver positions.",
        );
      } finally {
        setPositionsLoading(false);
      }
    };

    fetchPositions();
  }, []);

  // ─── DERIVED: Position options for the select ───────────────────────────────
  // CustomSelect shows labels, but we need to map label → id

  const positionOptions = driverPositions.map((pos) => pos.label);

  const getPositionIdByLabel = (label) => {
    const found = driverPositions.find((pos) => pos.label === label);
    return found ? found.id : null;
  };

  const getPositionLabelById = (id) => {
    const found = driverPositions.find((pos) => pos.id === id);
    return found ? found.label : "";
  };

  // ─── HANDLERS ───────────────────────────────────────────────────────────────

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB");
      return;
    }

    setPhotoFile(file);
    const url = URL.createObjectURL(file);
    setPhotoPreview(url);
  };

  const handleInputChange = (field, value) => {
    setErrors((prev) => ({ ...prev, [field]: null }));
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSelectChange = (field, value) => {
    setErrors((prev) => ({ ...prev, [field]: null }));
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Special handler for position select — maps label to ID
  const handlePositionChange = (label) => {
    setErrors((prev) => ({ ...prev, driver_position_id: null }));
    const positionId = getPositionIdByLabel(label);
    setFormData((prev) => ({
      ...prev,
      driver_position_id: positionId || "",
    }));
  };

  const handleAddDriver = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    const toastId = toast.loading("Adding driver...");

    try {
      const submitData = new FormData();

      if (photoFile) submitData.append("image", photoFile);

      Object.entries(formData).forEach(([key, value]) => {
        if (value === "" || value === null || value === undefined) return;

        if (
          formData.working_type === "Fixed Hours (Hourly Rate)" &&
          ["weekly_fixed_rate", "total_days"].includes(key)
        )
          return;

        if (
          formData.working_type === "Fixed Days (Weekly Rate)" &&
          ["per_hour_rate", "total_hours"].includes(key)
        )
          return;

        if (key === "status") value = value.toLowerCase();

        submitData.append(key, value);
      });

      const response = await addDriver(submitData);

      toast.success(response.data.message || "Driver added", {
        id: toastId,
      });

      setTimeout(resetForm, 1500);
      router.push("/drivers");
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          "Failed to add driver. Please try again.",
        { id: toastId },
      );
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.sage_name.trim())
      newErrors.sage_name = "Sage name is required";
    if (!formData.call_sign.trim())
      newErrors.call_sign = "Call sign is required";
    if (!formData.driver_position_id)
      newErrors.driver_position_id = "Position is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    if (!formData.phone_number.trim())
      newErrors.phone_number = "Phone number is required";
    if (!formData.address_details.trim())
      newErrors.address_details = "Address is required";
    if (!formData.zip_code.trim()) newErrors.zip_code = "Zip code is required";
    if (!formData.bank_account_no.trim())
      newErrors.bank_account_no = "Bank account number is required";
    if (!formData.payroll_id.trim())
      newErrors.payroll_id = "Payroll ID is required";
    if (!formData.bank_user_name.trim())
      newErrors.bank_user_name = "Bank user name is required";
    if (!formData.working_type)
      newErrors.working_type = "Working type is required";
    if (
      formData.vat_percent === "" ||
      formData.vat_percent === null ||
      formData.vat_percent === undefined
    )
      newErrors.vat_percent = "VAT percentage is required";
    if (
      formData.admin_fee === "" ||
      formData.admin_fee === null ||
      formData.admin_fee === undefined
    )
      newErrors.admin_fee = "Admin fee is required";
    if (
      formData.vehicle_hire_charge === "" ||
      formData.vehicle_hire_charge === null ||
      formData.vehicle_hire_charge === undefined
    )
      newErrors.vehicle_hire_charge = "Vehicle hire charge is required";
    if (
      formData.insurance_charge === "" ||
      formData.insurance_charge === null ||
      formData.insurance_charge === undefined
    )
      newErrors.insurance_charge = "Insurance charge is required";
    if (
      formData.fuel_charge === "" ||
      formData.fuel_charge === null ||
      formData.fuel_charge === undefined
    )
      newErrors.fuel_charge = "Fuel charge is required";
    if (!formData.shift_type) newErrors.shift_type = "Shift type is required";
    if (!formData.status) newErrors.status = "Status is required";

    if (formData.working_type === "Fixed Hours (Hourly Rate)") {
      if (!formData.per_hour_rate)
        newErrors.per_hour_rate = "Hourly rate is required";
      if (!formData.total_hours)
        newErrors.total_hours = "Total hours are required";
    }

    if (formData.working_type === "Fixed Days (Weekly Rate)") {
      if (!formData.weekly_fixed_rate)
        newErrors.weekly_fixed_rate = "Weekly rate is required";
      if (!formData.total_days)
        newErrors.total_days = "Total working days are required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setFormData({
      name: "",
      sage_name: "",
      call_sign: "",
      driver_position_id: "",
      per_hour_rate: "",
      total_hours: "",
      weekly_fixed_rate: "",
      total_days: "",
      bank_account_no: "",
      payment_reference: "",
      iban_no: "",
      address_details: "",
      phone_number: "",
      email: "",
      status: "",
      zip_code: "",
      payroll_id: "",
      working_type: "",
      bank_user_name: "",
      vat_percent: 0,
      admin_fee: 0,
      vehicle_hire_charge: 0,
      insurance_charge: 0,
      fuel_charge: 0,
      vehicle_vat_percent: 0,
      insurance_vat_percent: 0,
      fuel_vat_percent: 0,
      shift_type: "",
      carry_forward_admin_fee: 0,
      carry_forward_admin_vat_percent: 0,
      carry_forward_vehicle_hire_charge: 0,
      carry_forward_vehicle_vat_percent: 0,
      carry_forward_insurance_charge: 0,
      carry_forward_insurance_vat_percent: 0,
      carry_forward_fuel_charge: 0,
      carry_forward_fuel_vat_percent: 0,
    });
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const handleCancel = () => {
    resetForm();
    router.back();
  };

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  return (
    <div>
      <Breadcrumb
        items={[
          { href: "/dashboard", isHome: true },
          { label: "Driver Profiles", href: "/drivers" },
          { label: "Add New Driver" },
        ]}
      />

      <div className="mx-auto bg-white rounded-lg shadow px-[30px] py-[30px] md:px-[40px] md:py-[40px] mt-[20px]">
        <h2 className="text-[18px] lg:text-[22px] text-primary font-black mb-[20px]">
          Driver Information
        </h2>

        {/* Photo Upload */}
        <div className="flex flex-col sm:flex-row items-center gap-[15px]">
          <div className="w-[120px] h-[120px] rounded-[15px] border border-[#22358114] flex items-center justify-center overflow-hidden">
            {photoPreview ? (
              <img
                src={photoPreview}
                className="w-full h-full object-cover"
                alt="Preview"
              />
            ) : (
              <span className="w-[53px] h-[53px] rounded-full">
                <img src="/img/user-img.png" alt="" />
              </span>
            )}
          </div>
          <div className="flex items-center flex-col gap-[14px]">
            <label className="text-[16px] font-bold">Profile Photo</label>
            <label className="text-sm font-bold bg-[#223581]/10 text-primary px-[22px] py-[12px] rounded cursor-pointer hover:bg-[#223581]/20 duration-300 transition-colors">
              Upload Photo
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={handlePhotoUpload}
              />
            </label>
          </div>
        </div>

        {/* Driver Info Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[20px] mb-[30px] mt-[20px]">
          <div className="flex flex-col gap-1">
            <Input
              label="Name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
            />
            <p
              className={`text-xs text-red-500 font-bold min-h-[14px] transition-opacity ${
                errors.name ? "opacity-100" : "opacity-0"
              }`}
            >
              {errors.name}
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <Input
              label="Callsign"
              value={formData.call_sign}
              onChange={(e) => handleInputChange("call_sign", e.target.value)}
            />
            <p
              className={`text-xs text-red-500 font-bold min-h-[14px] transition-opacity ${
                errors.call_sign ? "opacity-100" : "opacity-0"
              }`}
            >
              {errors.call_sign}
            </p>
          </div>

          {/* ─── POSITION SELECT (Dynamic with ID mapping) ──────────────── */}
          <div className="flex flex-col gap-1">
            <CustomSelect
              label="Position"
              placeholder={
                positionsLoading
                  ? "Loading positions..."
                  : positionOptions.length === 0
                    ? "No positions available"
                    : "Choose Position"
              }
              options={positionOptions}
              value={getPositionLabelById(formData.driver_position_id)}
              onChange={handlePositionChange}
              disabled={positionsLoading || positionOptions.length === 0}
            />
            <p
              className={`text-xs font-bold min-h-[14px] transition-opacity ${
                errors.driver_position_id
                  ? "text-red-500 opacity-100"
                  : positionOptions.length === 0 && !positionsLoading
                    ? "text-amber-500 opacity-100"
                    : "opacity-0"
              }`}
            >
              {errors.driver_position_id
                ? errors.driver_position_id
                : positionOptions.length === 0 && !positionsLoading
                  ? "No positions found. Please add positions first."
                  : ""}
            </p>
          </div>
          {/* ─── END POSITION SELECT ────────────────────────────────────── */}

          <div className="flex flex-col gap-1">
            <Input
              label="Payment Reference"
              value={formData.payment_reference}
              onChange={(e) =>
                handleInputChange("payment_reference", e.target.value)
              }
            />
            <p
              className={`text-xs text-red-500 font-bold min-h-[14px] transition-opacity ${
                errors.payment_reference ? "opacity-100" : "opacity-0"
              }`}
            >
              {errors.payment_reference}
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <Input
              label="Sage Name"
              value={formData.sage_name}
              onChange={(e) => handleInputChange("sage_name", e.target.value)}
            />
            <p
              className={`text-xs text-red-500 font-bold min-h-[14px] transition-opacity ${
                errors.sage_name ? "opacity-100" : "opacity-0"
              }`}
            >
              {errors.sage_name}
            </p>
          </div>
        </div>

        {/* Contact Information */}
        <h2 className="text-[18px] lg:text-[22px] text-primary font-black mb-[20px]">
          Contact Information
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-[20px] mb-[30px] mt-[20px]">
          <div className="flex flex-col gap-1">
            <Input
              label="Address"
              wrapperClassName="flex-[2]"
              value={formData.address_details}
              onChange={(e) =>
                handleInputChange("address_details", e.target.value)
              }
            />
            <p
              className={`text-xs text-red-500 font-bold min-h-[14px] transition-opacity ${
                errors.address_details ? "opacity-100" : "opacity-0"
              }`}
            >
              {errors.address_details}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <Input
              label="Postal Code"
              wrapperClassName="flex-1"
              value={formData.zip_code}
              onChange={(e) => handleInputChange("zip_code", e.target.value)}
            />
            <p
              className={`text-xs text-red-500 font-bold min-h-[14px] transition-opacity ${
                errors.zip_code ? "opacity-100" : "opacity-0"
              }`}
            >
              {errors.zip_code}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-[20px] my-[20px]">
          <div className="flex flex-col gap-1">
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
            />
            <p
              className={`text-xs text-red-500 font-bold min-h-[14px] transition-opacity ${
                errors.email ? "opacity-100" : "opacity-0"
              }`}
            >
              {errors.email}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <Input
              label="Phone"
              value={formData.phone_number}
              onChange={(e) =>
                handleInputChange("phone_number", e.target.value)
              }
            />
            <p
              className={`text-xs text-red-500 font-bold min-h-[14px] transition-opacity ${
                errors.phone_number ? "opacity-100" : "opacity-0"
              }`}
            >
              {errors.phone_number}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <CustomSelect
              label="Shift Type"
              placeholder="Choose Shift Type"
              options={["DAY", "NIGHT"]}
              value={formData.shift_type}
              onChange={(value) => handleSelectChange("shift_type", value)}
            />
            <p
              className={`text-xs text-red-500 font-bold min-h-[14px] transition-opacity ${
                errors.shift_type ? "opacity-100" : "opacity-0"
              }`}
            >
              {errors.shift_type}
            </p>
          </div>
        </div>

        {/* Payment Details */}
        <h2 className="text-[18px] lg:text-[22px] text-primary font-black mb-[20px]">
          Payment Details
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-[20px] mb-[20px]">
          <div className="flex flex-col gap-1">
            <Input
              label="Bank Account Number"
              value={formData.bank_account_no}
              onChange={(e) =>
                handleInputChange("bank_account_no", e.target.value)
              }
            />
            <p
              className={`text-xs text-red-500 font-bold min-h-[14px] transition-opacity ${
                errors.bank_account_no ? "opacity-100" : "opacity-0"
              }`}
            >
              {errors.bank_account_no}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <Input
              label="Sort Code"
              value={formData.iban_no}
              onChange={(e) => handleInputChange("iban_no", e.target.value)}
            />
            <p
              className={`text-xs text-red-500 font-bold min-h-[14px] transition-opacity ${
                errors.iban_no ? "opacity-100" : "opacity-0"
              }`}
            >
              {errors.iban_no}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <Input
              label="Payroll ID"
              value={formData.payroll_id}
              onChange={(e) => handleInputChange("payroll_id", e.target.value)}
            />
            <p
              className={`text-xs text-red-500 font-bold min-h-[14px] transition-opacity ${
                errors.payroll_id ? "opacity-100" : "opacity-0"
              }`}
            >
              {errors.payroll_id}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <Input
              label="Bank Name"
              value={formData.bank_user_name}
              onChange={(e) =>
                handleInputChange("bank_user_name", e.target.value)
              }
            />
            <p
              className={`text-xs text-red-500 font-bold min-h-[14px] transition-opacity ${
                errors.bank_user_name ? "opacity-100" : "opacity-0"
              }`}
            >
              {errors.bank_user_name}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <Input
              label="Admin Fee"
              type="number"
              value={formData.admin_fee}
              onChange={(e) => handleInputChange("admin_fee", e.target.value)}
            />
            <p
              className={`text-xs text-red-500 font-bold min-h-[14px] transition-opacity ${
                errors.admin_fee ? "opacity-100" : "opacity-0"
              }`}
            >
              {errors.admin_fee}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <Input
              label="Admin FeeVAT Percentage"
              type="number"
              value={formData.vat_percent}
              onChange={(e) => handleInputChange("vat_percent", e.target.value)}
            />
            <p
              className={`text-xs text-red-500 font-bold min-h-[14px] transition-opacity ${
                errors.vat_percent ? "opacity-100" : "opacity-0"
              }`}
            >
              {errors.vat_percent}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <Input
              label="Vehicle Hire Charge"
              type="number"
              value={formData.vehicle_hire_charge}
              onChange={(e) =>
                handleInputChange("vehicle_hire_charge", e.target.value)
              }
            />
            <p
              className={`text-xs text-red-500 font-bold min-h-[14px] transition-opacity ${
                errors.vehicle_hire_charge ? "opacity-100" : "opacity-0"
              }`}
            >
              {errors.vehicle_hire_charge}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <Input
              label="Vehicle VAT Percentage"
              type="number"
              value={formData.vehicle_vat_percent}
              onChange={(e) =>
                handleInputChange("vehicle_vat_percent", e.target.value)
              }
            />
            <p
              className={`text-xs text-red-500 font-bold min-h-[14px] transition-opacity ${
                errors.vehicle_vat_percent ? "opacity-100" : "opacity-0"
              }`}
            >
              {errors.vehicle_vat_percent}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <Input
              label="Insurance Charge"
              type="number"
              value={formData.insurance_charge}
              onChange={(e) =>
                handleInputChange("insurance_charge", e.target.value)
              }
            />
            <p
              className={`text-xs text-red-500 font-bold min-h-[14px] transition-opacity ${
                errors.insurance_charge ? "opacity-100" : "opacity-0"
              }`}
            >
              {errors.insurance_charge}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <Input
              label="Insurance VAT Percentage"
              type="number"
              value={formData.insurance_vat_percent}
              onChange={(e) =>
                handleInputChange("insurance_vat_percent", e.target.value)
              }
            />
            <p
              className={`text-xs text-red-500 font-bold min-h-[14px] transition-opacity ${
                errors.insurance_vat_percent ? "opacity-100" : "opacity-0"
              }`}
            >
              {errors.insurance_vat_percent}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <Input
              label="Fuel Charge"
              type="number"
              value={formData.fuel_charge}
              onChange={(e) => handleInputChange("fuel_charge", e.target.value)}
            />
            <p
              className={`text-xs text-red-500 font-bold min-h-[14px] transition-opacity ${
                errors.fuel_charge ? "opacity-100" : "opacity-0"
              }`}
            >
              {errors.fuel_charge}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <Input
              label="Fuel VAT Percentage"
              type="number"
              value={formData.fuel_vat_percent}
              onChange={(e) =>
                handleInputChange("fuel_vat_percent", e.target.value)
              }
            />
            <p
              className={`text-xs text-red-500 font-bold min-h-[14px] transition-opacity ${
                errors.fuel_vat_percent ? "opacity-100" : "opacity-0"
              }`}
            >
              {errors.fuel_vat_percent}
            </p>
          </div>
        </div>

        {/* Carry Forward Charges */}
        <h2 className="text-[18px] lg:text-[22px] text-primary font-black mb-[20px]">
          Carry Forward Charges
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-[20px] mb-[40px]">
          <Input
            label="Carry Forward Admin Fee"
            type="number"
            value={formData.carry_forward_admin_fee}
            onChange={(e) =>
              handleInputChange("carry_forward_admin_fee", e.target.value)
            }
          />

          <Input
            label="Carry Forward Admin VAT %"
            type="number"
            value={formData.carry_forward_admin_vat_percent}
            onChange={(e) =>
              handleInputChange(
                "carry_forward_admin_vat_percent",
                e.target.value,
              )
            }
          />

          <Input
            label="Carry Forward Vehicle Hire Charge"
            type="number"
            value={formData.carry_forward_vehicle_hire_charge}
            onChange={(e) =>
              handleInputChange(
                "carry_forward_vehicle_hire_charge",
                e.target.value,
              )
            }
          />

          <Input
            label="Carry Forward Vehicle VAT %"
            type="number"
            value={formData.carry_forward_vehicle_vat_percent}
            onChange={(e) =>
              handleInputChange(
                "carry_forward_vehicle_vat_percent",
                e.target.value,
              )
            }
          />

          <Input
            label="Carry Forward Insurance Charge"
            type="number"
            value={formData.carry_forward_insurance_charge}
            onChange={(e) =>
              handleInputChange(
                "carry_forward_insurance_charge",
                e.target.value,
              )
            }
          />

          <Input
            label="Carry Forward Insurance VAT %"
            type="number"
            value={formData.carry_forward_insurance_vat_percent}
            onChange={(e) =>
              handleInputChange(
                "carry_forward_insurance_vat_percent",
                e.target.value,
              )
            }
          />

          <Input
            label="Carry Forward Fuel Charge"
            type="number"
            value={formData.carry_forward_fuel_charge}
            onChange={(e) =>
              handleInputChange("carry_forward_fuel_charge", e.target.value)
            }
          />

          <Input
            label="Carry Forward Fuel VAT %"
            type="number"
            value={formData.carry_forward_fuel_vat_percent}
            onChange={(e) =>
              handleInputChange(
                "carry_forward_fuel_vat_percent",
                e.target.value,
              )
            }
          />
        </div>

        {/* Weekly Rate & Operational Details */}
        <h2 className="text-[18px] lg:text-[22px] text-primary font-black mb-[20px]">
          Weekly Rate & Operational Details
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-[20px] mb-[50px]">
          <div className="flex flex-col gap-1">
            <CustomSelect
              label="Weekly Working Type"
              placeholder="Choose working type"
              options={["Fixed Hours (Hourly Rate)"]}
              value={formData.working_type}
              onChange={(value) => handleSelectChange("working_type", value)}
            />
            <p
              className={`text-xs text-red-500 font-bold min-h-[14px] transition-opacity ${
                errors.working_type ? "opacity-100" : "opacity-0"
              }`}
            >
              {errors.working_type}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <CustomSelect
              label="Status"
              placeholder="Select Status"
              options={["Active", "Inactive"]}
              value={formData.status}
              onChange={(value) => handleSelectChange("status", value)}
            />
            <p
              className={`text-xs text-red-500 font-bold min-h-[14px] transition-opacity ${
                errors.status ? "opacity-100" : "opacity-0"
              }`}
            >
              {errors.status}
            </p>
          </div>

          {formData.working_type === "Fixed Hours (Hourly Rate)" && (
            <>
              <div className="flex flex-col gap-1">
                <Input
                  label="Per Hour Rate (£)"
                  type="number"
                  placeholder="Enter hourly rate"
                  value={formData.per_hour_rate}
                  onChange={(e) =>
                    handleInputChange("per_hour_rate", e.target.value)
                  }
                />
                <p
                  className={`text-xs text-red-500 font-bold min-h-[14px] transition-opacity ${
                    errors.per_hour_rate ? "opacity-100" : "opacity-0"
                  }`}
                >
                  {errors.per_hour_rate}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <Input
                  label="Total Hours Per Week"
                  type="number"
                  placeholder="Enter weekly hours"
                  value={formData.total_hours}
                  onChange={(e) =>
                    handleInputChange("total_hours", e.target.value)
                  }
                />
                <p
                  className={`text-xs text-red-500 font-bold min-h-[14px] transition-opacity ${
                    errors.total_hours ? "opacity-100" : "opacity-0"
                  }`}
                >
                  {errors.total_hours}
                </p>
              </div>
            </>
          )}

          {formData.working_type === "Fixed Days (Weekly Rate)" && (
            <>
              <div className="flex flex-col gap-1">
                <Input
                  label="Weekly Fixed Rate ($)"
                  type="number"
                  placeholder="Enter weekly rate"
                  value={formData.weekly_fixed_rate}
                  onChange={(e) =>
                    handleInputChange("weekly_fixed_rate", e.target.value)
                  }
                />
                <p
                  className={`text-xs text-red-500 font-bold min-h-[14px] transition-opacity ${
                    errors.weekly_fixed_rate ? "opacity-100" : "opacity-0"
                  }`}
                >
                  {errors.weekly_fixed_rate}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <Input
                  label="Working Days Per Week"
                  type="number"
                  placeholder="Enter number of days (1-7)"
                  value={formData.total_days}
                  onChange={(e) =>
                    handleInputChange("total_days", e.target.value)
                  }
                  min="1"
                  max="7"
                />
                <p
                  className={`text-xs text-red-500 font-bold min-h-[14px] transition-opacity ${
                    errors.total_days ? "opacity-100" : "opacity-0"
                  }`}
                >
                  {errors.total_days}
                </p>
              </div>
            </>
          )}
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex gap-[10px]">
          <button
            className="bg-primary border border-primary hover:bg-primary/20 hover:text-primary duration-300 cursor-pointer text-white text-sm font-bold px-[25px] py-[12px] rounded-[6px] min-w-[150px]"
            onClick={handleAddDriver}
            disabled={isLoading}
          >
            {isLoading ? "Adding..." : "Add Driver"}
          </button>
          <button
            className="bg-secondary border border-secondary hover:bg-secondary/20 hover:text-secondary duration-300 cursor-pointer text-white text-sm font-bold px-[25px] py-[12px] rounded-[6px] min-w-[150px]"
            onClick={handleCancel}
            disabled={isLoading}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default AddNewDriver;
