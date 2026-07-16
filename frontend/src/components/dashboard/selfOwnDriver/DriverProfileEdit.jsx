"use client";
import { useState, useEffect } from "react";
import Breadcrumb from "../Breadcrumb";
import Input from "../../form/Input";
import CustomSelect from "../../layout/CustomSelect";
import { useParams, useRouter } from "next/navigation";
import { fetchSingleDriver, updateDriver } from "@/lib/api/self-own/driver.api";
import { getAllDriverPositions } from "@/lib/api/self-own/driver.api";
import toast from "react-hot-toast";
import Loader from "../Loader";

export default function DriverProfileEdit() {
  const { id } = useParams();
  const router = useRouter();

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [driverName, setDriverName] = useState("");

  const [errors, setErrors] = useState({});

  // Driver positions state
  const [driverPositions, setDriverPositions] = useState([]);
  const [positionsLoading, setPositionsLoading] = useState(true);

  // Manual dockets state
  const [manualDockets, setManualDockets] = useState([]);

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
    vat_number: 0,
    additional_charges_1: 0,
    additional_charges_2: 0,
    additional_charges_3: 0,
    additional_charges_vat_1_percent: 0,
    additional_charges_vat_2_percent: 0,
    additional_charges_vat_3_percent: 0,
    docket_total_vat_percent: 0,
    carry_forward_admin_fee: 0,
    carry_forward_admin_vat_percent: 0,
    carry_forward_vehicle_hire_charge: 0,
    carry_forward_vehicle_vat_percent: 0,
    carry_forward_insurance_charge: 0,
    carry_forward_insurance_vat_percent: 0,
    carry_forward_fuel_charge: 0,
    carry_forward_fuel_vat_percent: 0,
  });

  // ─── DERIVED: Position helpers ──────────────────────────────────────────────

  const positionOptions = driverPositions.map((pos) => pos.label);

  const getPositionIdByLabel = (label) => {
    const found = driverPositions.find((pos) => pos.label === label);
    return found ? found.id : null;
  };

  const getPositionLabelById = (id) => {
    const found = driverPositions.find((pos) => pos.id === id);
    return found ? found.label : "";
  };

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

  // ─── FETCH DRIVER DATA ─────────────────────────────────────────────────────

  useEffect(() => {
    const fetchDriver = async () => {
      setIsFetching(true);
      try {
        const res = await fetchSingleDriver(id);

        if (res.status === 200 && res.data.success === true) {
          const data = res.data.data;
          console.log(data, " -------------------------daa");
          setDriverName(data.name || "");

          let workingType = "";
          if (data.per_hour_rate && data.total_hours) {
            workingType = "Fixed Hours (Hourly Rate)";
          } else if (data.weekly_fixed_rate && data.total_days) {
            workingType = "Fixed Days (Weekly Rate)";
          }

          if (data.image) {
            setPhotoPreview(data.image);
          }

          const formattedStatus = data.status
            ? data.status.charAt(0).toUpperCase() + data.status.slice(1)
            : "";

          setFormData({
            name: data.name ?? "",
            sage_name: data.sage_name ?? "",
            call_sign: data.call_sign ?? "",
            driver_position_id: data.driver_position_id ?? "",
            bank_account_no: data.bank_account_no ?? "",
            payment_reference: data.payment_reference ?? "",
            iban_no: data.iban_no ?? "",
            address_details: data.address_details ?? "",
            phone_number: data.phone_number ?? "",
            email: data.email ?? "",
            status: formattedStatus,
            zip_code: data.zip_code ?? "",
            payroll_id: data.payroll_id ?? "",
            working_type: workingType,
            bank_user_name: data.bank_user_name ?? "",
            vat_percent: data.vat_percent ?? 0,
            admin_fee: data.admin_fee ?? 0,
            vehicle_hire_charge: data.vehicle_hire_charge ?? 0,
            insurance_charge: data.insurance_charge ?? 0,
            fuel_charge: data.fuel_charge ?? 0,
            shift_type: data.shift_type ?? "",
            vehicle_vat_percent: data.vehicle_vat_percent ?? 0,
            insurance_vat_percent: data.insurance_vat_percent ?? 0,
            fuel_vat_percent: data.fuel_vat_percent ?? 0,
            vat_number: data.vat_number ?? 0,
            additional_charges_1: data.additional_charges_1 ?? 0,
            additional_charges_2: data.additional_charges_2 ?? 0,
            additional_charges_3: data.additional_charges_3 ?? 0,
            additional_charges_vat_1_percent:
              data.additional_charges_vat_1_percent ?? 0,
            additional_charges_vat_2_percent:
              data.additional_charges_vat_2_percent ?? 0,
            additional_charges_vat_3_percent:
              data.additional_charges_vat_3_percent ?? 0,
            docket_total_vat_percent: data.docket_total_vat_percent ?? 0,
            carry_forward_admin_fee: data.carry_forward_admin_fee ?? 0,
            carry_forward_admin_vat_percent:
              data.carry_forward_admin_vat_percent ?? 0,
            carry_forward_vehicle_hire_charge:
              data.carry_forward_vehicle_hire_charge ?? 0,
            carry_forward_vehicle_vat_percent:
              data.carry_forward_vehicle_vat_percent ?? 0,
            carry_forward_insurance_charge:
              data.carry_forward_insurance_charge ?? 0,
            carry_forward_insurance_vat_percent:
              data.carry_forward_insurance_vat_percent ?? 0,
            carry_forward_fuel_charge: data.carry_forward_fuel_charge ?? 0,
            carry_forward_fuel_vat_percent:
              data.carry_forward_fuel_vat_percent ?? 0,
          });

          // Load manual dockets if they exist
          if (data.manual_dockets) {
            try {
              // If manual_dockets is a string, parse it as JSON
              let docketsData = data.manual_dockets;

              if (typeof docketsData === "string") {
                docketsData = JSON.parse(docketsData);
              }

              if (Array.isArray(docketsData) && docketsData.length > 0) {
                const formattedDockets = docketsData.map((docket, index) => ({
                  id: Date.now() + index, // Generate unique IDs for existing dockets
                  docket_no: docket.docket_no ?? "",
                  driver_total: docket.driver_total ?? "",
                }));
                setManualDockets(formattedDockets);
              }
            } catch (e) {
              console.log("Could not parse manual_dockets:", e);
              setManualDockets([]);
            }
          }
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to fetch driver details");
      } finally {
        setIsFetching(false);
      }
    };

    if (id) {
      fetchDriver();
    }
  }, [id]);

  // ─── MANUAL DOCKETS HANDLERS ──────────────────────────────────────────────────

  const handleAddDocket = () => {
    if (manualDockets.length >= 10) {
      toast.error("Maximum 10 dockets allowed");
      return;
    }
    setManualDockets([
      ...manualDockets,
      {
        id: Date.now(),
        docket_no: "",
        driver_total: "",
      },
    ]);
  };

  const handleDocketChange = (docId, field, value) => {
    setManualDockets(
      manualDockets.map((docket) =>
        docket.id === docId ? { ...docket, [field]: value } : docket,
      ),
    );
  };

  const handleRemoveDocket = (docId) => {
    setManualDockets(manualDockets.filter((docket) => docket.id !== docId));
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

    if (!formData.status) newErrors.status = "Status is required";

    if (!formData.bank_user_name.trim())
      newErrors.bank_user_name = "Bank user name is required";

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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    const toastId = toast.loading("Updating driver...");

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

      // Add manual dockets as JSON string
      if (manualDockets.length > 0) {
        const docketsForSubmit = manualDockets.map(({ id, ...rest }) => rest);
        submitData.append("manual_dockets", JSON.stringify(docketsForSubmit));
      }

      submitData.delete("working_type");

      const response = await updateDriver(id, submitData);

      toast.success(response.data.message || "Driver updated successfully", {
        id: toastId,
      });

      router.push("/self-own/drivers");
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          "Failed to update driver. Please try again.",
        { id: toastId },
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      if (photoPreview && photoPreview.startsWith("blob:")) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  // Show loading state while fetching data
  if (isFetching) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg font-semibold text-primary">
          <Loader text="Loading driver details..." />
        </div>
      </div>
    );
  }

  return (
    <div>
      <Breadcrumb
        items={[
          { href: "/dashboard", isHome: true },
          { label: "Driver Profiles", href: "/self-own/drivers" },
          {
            label: driverName || "Driver",
            href: `/self-own/drivers/view/${id}`,
          },
          { label: "Profile Edit" },
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
                alt="Driver"
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

          <div className="flex flex-col gap-1">
            <Input
              label="VAT Number"
              type="number"
              value={formData.vat_number}
              onChange={(e) => handleInputChange("vat_number", e.target.value)}
            />
            <p
              className={`text-xs text-red-500 font-bold min-h-[14px] transition-opacity ${
                errors.vat_number ? "opacity-100" : "opacity-0"
              }`}
            >
              {errors.vat_number}
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
              <Input
              label="Site Type"
              value={formData.shift_type}
              onChange={(e) =>
                handleInputChange("shift_type", e.target.value)
              }
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
              label="VAT Percentage"
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
          <div className="flex flex-col gap-1">
            <Input
              label="Additional Charges 1"
              type="number"
              value={formData.additional_charges_1}
              onChange={(e) =>
                handleInputChange("additional_charges_1", e.target.value)
              }
            />
            <p
              className={`text-xs text-red-500 font-bold min-h-[14px] transition-opacity ${
                errors.additional_charges_1 ? "opacity-100" : "opacity-0"
              }`}
            >
              {errors.additional_charges_1}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <Input
              label="Additional Charges 2"
              type="number"
              value={formData.additional_charges_2}
              onChange={(e) =>
                handleInputChange("additional_charges_2", e.target.value)
              }
            />
            <p
              className={`text-xs text-red-500 font-bold min-h-[14px] transition-opacity ${
                errors.additional_charges_2 ? "opacity-100" : "opacity-0"
              }`}
            >
              {errors.additional_charges_2}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <Input
              label="Additional Charges 3"
              type="number"
              value={formData.additional_charges_3}
              onChange={(e) =>
                handleInputChange("additional_charges_3", e.target.value)
              }
            />
            <p
              className={`text-xs text-red-500 font-bold min-h-[14px] transition-opacity ${
                errors.additional_charges_3 ? "opacity-100" : "opacity-0"
              }`}
            >
              {errors.additional_charges_3}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <Input
              label="Additional Charges 1 VAT Percentage"
              type="number"
              value={formData.additional_charges_vat_1_percent}
              onChange={(e) =>
                handleInputChange(
                  "additional_charges_vat_1_percent",
                  e.target.value,
                )
              }
            />
            <p
              className={`text-xs text-red-500 font-bold min-h-[14px] transition-opacity ${
                errors.additional_charges_vat_1_percent
                  ? "opacity-100"
                  : "opacity-0"
              }`}
            >
              {errors.additional_charges_vat_1_percent}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <Input
              label="Additional Charges 2 VAT Percentage"
              type="number"
              value={formData.additional_charges_vat_2_percent}
              onChange={(e) =>
                handleInputChange(
                  "additional_charges_vat_2_percent",
                  e.target.value,
                )
              }
            />
            <p
              className={`text-xs text-red-500 font-bold min-h-[14px] transition-opacity ${
                errors.additional_charges_vat_2_percent
                  ? "opacity-100"
                  : "opacity-0"
              }`}
            >
              {errors.additional_charges_vat_2_percent}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <Input
              label="Additional Charges 3 VAT Percentage"
              type="number"
              value={formData.additional_charges_vat_3_percent}
              onChange={(e) =>
                handleInputChange(
                  "additional_charges_vat_3_percent",
                  e.target.value,
                )
              }
            />
            <p
              className={`text-xs text-red-500 font-bold min-h-[14px] transition-opacity ${
                errors.additional_charges_vat_3_percent
                  ? "opacity-100"
                  : "opacity-0"
              }`}
            >
              {errors.additional_charges_vat_3_percent}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <Input
              label="Docket Total VAT Percentage"
              type="number"
              value={formData.docket_total_vat_percent}
              onChange={(e) =>
                handleInputChange("docket_total_vat_percent", e.target.value)
              }
            />
            <p
              className={`text-xs text-red-500 font-bold min-h-[14px] transition-opacity ${
                errors.docket_total_vat_percent ? "opacity-100" : "opacity-0"
              }`}
            >
              {errors.docket_total_vat_percent}
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

        {/* Driver Status */}
        <h2 className="text-[18px] lg:text-[22px] text-primary font-black mb-[20px]">
          Driver Status
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-[20px] mb-[50px]">
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
        </div>

        {/* Manual Dockets Section */}
        <h2 className="text-[18px] lg:text-[22px] text-primary font-black mb-[20px]">
          Manual Dockets
        </h2>

        <div className="mb-[30px]">
          <div className="flex justify-between items-center mb-[20px]">
            <div>
              <p className="text-sm text-gray-600 font-semibold">
                Total Dockets: {manualDockets.length}/10
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Edit existing dockets or add new ones below
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddDocket}
              disabled={manualDockets.length >= 10 || isLoading}
              className={`text-sm font-bold px-[20px] py-[10px] rounded-[6px] transition-colors ${
                manualDockets.length >= 10 || isLoading
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-primary text-white hover:bg-primary/90"
              }`}
            >
              + Add New Docket
            </button>
          </div>

          {manualDockets.length > 0 && (
            <div className="space-y-[15px] border border-gray-200 rounded-lg p-[20px] bg-gray-50">
              <div className="hidden md:grid md:grid-cols-12 gap-[20px] pb-[15px] border-b border-gray-200 px-[15px]">
                <div className="md:col-span-1">
                  <label className="text-xs font-bold text-gray-700 uppercase">
                    #
                  </label>
                </div>
                <div className="md:col-span-5">
                  <label className="text-xs font-bold text-gray-700 uppercase">
                    Docket Number
                  </label>
                </div>
                <div className="md:col-span-4">
                  <label className="text-xs font-bold text-gray-700 uppercase">
                    Driver Total (£)
                  </label>
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-gray-700 uppercase">
                    Action
                  </label>
                </div>
              </div>

              {manualDockets.map((docket, index) => (
                <div
                  key={docket.id}
                  className="grid grid-cols-1 md:grid-cols-12 gap-[20px] md:gap-[15px] p-[15px] bg-white rounded-lg border border-gray-200 hover:border-primary/50 transition-colors"
                >
                  {/* Index */}
                  <div className="md:col-span-1 flex items-center">
                    <span className="inline-flex items-center justify-center w-[32px] h-[32px] bg-primary/10 text-primary font-bold rounded-full text-sm">
                      {index + 1}
                    </span>
                  </div>

                  {/* Docket Number */}
                  <div className="md:col-span-5">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-gray-700 md:hidden">
                        Docket Number
                      </label>
                      <Input
                        placeholder="e.g., DOC001 or 1124563"
                        type="text"
                        value={docket.docket_no}
                        onChange={(e) =>
                          handleDocketChange(
                            docket.id,
                            "docket_no",
                            e.target.value,
                          )
                        }
                      />
                    </div>
                  </div>

                  {/* Driver Total */}
                  <div className="md:col-span-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-gray-700 md:hidden">
                        Driver Total
                      </label>
                      <Input
                        placeholder="e.g., 150.00"
                        type="number"
                        step="0.01"
                        value={docket.driver_total}
                        onChange={(e) =>
                          handleDocketChange(
                            docket.id,
                            "driver_total",
                            e.target.value,
                          )
                        }
                      />
                    </div>
                  </div>

                  {/* Remove Button */}
                  <div className="md:col-span-2 flex items-end">
                    <button
                      type="button"
                      onClick={() => handleRemoveDocket(docket.id)}
                      disabled={isLoading}
                      className="w-full h-[44px] bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-[6px] transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed border border-red-200"
                    >
                      <span className="hidden md:inline">Remove</span>
                      <span className="md:hidden">Delete</span>
                    </button>
                  </div>
                </div>
              ))}

              {/* Summary Section */}
              {manualDockets.length > 0 && (
                <div className="mt-[20px] pt-[20px] border-t border-gray-200 bg-white p-[15px] rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-[20px]">
                    <div>
                      <p className="text-xs text-gray-600 font-semibold">
                        Total Docket Number
                      </p>
                      <p className="text-lg font-bold text-primary mt-1">
                        {manualDockets.length}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 font-semibold">
                        Sum of Driver Totals
                      </p>
                      <p className="text-lg font-bold text-primary mt-1">
                        £
                        {manualDockets
                          .reduce(
                            (sum, dock) =>
                              sum + (parseFloat(dock.driver_total) || 0),
                            0,
                          )
                          .toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 font-semibold">
                        Capacity Remaining
                      </p>
                      <p className="text-lg font-bold text-orange-600 mt-1">
                        {10 - manualDockets.length} slots
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {manualDockets.length === 0 && (
            <div className="p-[30px] bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg text-center">
              <svg
                className="w-[48px] h-[48px] mx-auto mb-[12px] text-gray-400"
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
              <p className="text-sm text-gray-600 font-semibold">
                No dockets added yet
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Click "Add New Docket" to add manual dockets (maximum 10)
              </p>
            </div>
          )}
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex gap-[10px]">
          <button
            className="bg-primary border border-primary hover:bg-primary/20 hover:text-primary duration-300 cursor-pointer text-white text-sm font-bold px-[25px] py-[12px] rounded-[6px] min-w-[150px] disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleSave}
            disabled={isLoading}
          >
            {isLoading ? "Saving..." : "Save Changes"}
          </button>
          <button
            className="bg-secondary border border-secondary hover:bg-secondary/20 hover:text-secondary duration-300 cursor-pointer text-white text-sm font-bold px-[25px] py-[12px] rounded-[6px] min-w-[150px] disabled:opacity-50 disabled:cursor-not-allowed"
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
