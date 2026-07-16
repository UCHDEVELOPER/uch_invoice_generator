"use client";
import React, { useState, useEffect } from "react";
import Breadcrumb from "./Breadcrumb";
import Input from "../form/Input";
import CustomSelect from "../layout/CustomSelect";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { addJob } from "@/lib/api/job.api";
import { fetchAllDrivers } from "@/lib/api/driver.api";

function AddJob() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [drivers, setDrivers] = useState([]);
  const [loadingDrivers, setLoadingDrivers] = useState(true);

  const [formData, setFormData] = useState({
    driver_id: "",
    driver_name: "",
    call_sign: "",
    docket_no: "",
    tariff: "",
    date: "",
    time: "",
    pickup: "",
    dropoff: "",
    driver_total: "",
  });

  const [errors, setErrors] = useState({
    driver_id: "",
    call_sign: "",
    docket_no: "",
    tariff: "",
    date: "",
    time: "",
    pickup: "",
    dropoff: "",
    driver_total: "",
  });

  useEffect(() => {
    getDrivers();
  }, []);

  const getDrivers = async () => {
    try {
      setLoadingDrivers(true);
      const response = await fetchAllDrivers({ limit: 100 });

      if (response.data?.success) {
        const validDrivers = (response.data?.data || []).filter(
          (driver) => driver && driver.id
        );
        setDrivers(validDrivers);
      } else {
        toast.error(response.data?.message || "Failed to fetch drivers");
      }
    } catch (error) {
      console.error("Error fetching drivers:", error);
      toast.error(error.response?.data?.message || "Failed to fetch drivers");
    } finally {
      setLoadingDrivers(false);
    }
  };

  const driverOptions = drivers.map(
    (driver) => `${driver.name || ""} (${driver.call_sign || "N/A"})`
  );

  const getSelectedDriverDisplay = () => {
    if (!formData.driver_id) return "";
    const driver = drivers.find((d) => d.id === formData.driver_id);
    if (driver) {
      return `${driver.name || ""} (${driver.call_sign || "N/A"})`;
    }
    return "";
  };

  const handleInputChange = (field, value) => {

    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  const handleDriverChange = (selectedOption) => {
    // console.log("Selected option:", selectedOption);

    if (!selectedOption) {
      setFormData((prev) => ({
        ...prev,
        driver_id: "",
        driver_name: "",
        call_sign: "",
      }));
      return;
    }

    const selectedDriver = drivers.find(
      (driver) =>
        `${driver.name || ""} (${driver.call_sign || "N/A"})` === selectedOption
    );

    // console.log("Found driver:", selectedDriver);

    if (selectedDriver) {
      setFormData((prev) => ({
        ...prev,
        driver_id: selectedDriver.id,
        driver_name: selectedDriver.name || "",
        call_sign: selectedDriver.call_sign || "",
      }));

      if (errors.driver_id) {
        setErrors((prev) => ({
          ...prev,
          driver_id: "",
        }));
      }
    }
  };

  const formatDataForSubmission = () => {
    const localDateTime = new Date(`${formData.date}T${formData.time}:00`);
    const date_time = localDateTime.toISOString();
    const journey = `${formData.pickup.toUpperCase()} - ${formData.dropoff.toUpperCase()}`;

    return {
      docket_no: formData.docket_no,
      date_time: date_time,
      tariff: formData.tariff,
      journey: journey,
      driver_total: parseFloat(formData.driver_total) || 0,
      driver_id: formData.driver_id,
      call_sign: formData.call_sign,
    };
  };

  const validateForm = () => {
    const newErrors = {
      driver_id: "",
      call_sign: "",
      docket_no: "",
      tariff: "",
      date: "",
      time: "",
      pickup: "",
      dropoff: "",
      driver_total: "",
    };

    let isValid = true;

    if (!formData.driver_id) {
      newErrors.driver_id = "Please select a driver";
      isValid = false;
    }

    if (!formData.docket_no.trim()) {
      newErrors.docket_no = "Docket number is required";
      isValid = false;
    }

    if (!formData.tariff.trim()) {
      newErrors.tariff = "Tariff is required";
      isValid = false;
    }

    if (!formData.date) {
      newErrors.date = "Date is required";
      isValid = false;
    }

    if (!formData.time) {
      newErrors.time = "Time is required";
      isValid = false;
    }

    if (!formData.pickup.trim()) {
      newErrors.pickup = "Pickup location is required";
      isValid = false;
    }

    if (!formData.dropoff.trim()) {
      newErrors.dropoff = "Drop-off location is required";
      isValid = false;
    }

    if (!formData.driver_total) {
      newErrors.driver_total = "Driver total is required";
      isValid = false;
    } else if (isNaN(parseFloat(formData.driver_total))) {
      newErrors.driver_total = "Please enter a valid number";
      isValid = false;
    } else if (parseFloat(formData.driver_total) < 0) {
      newErrors.driver_total = "Driver total cannot be negative";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async () => {
    const isValid = validateForm();
    if (!isValid) {
      return;
    }

    try {
      setSubmitting(true);

      const payload = formatDataForSubmission();
      // console.log("Submitting payload:", payload);

      const response = await addJob(payload);

      if (response.data?.success) {
        toast.success(response.data?.message || "Job added successfully!");

        setFormData({
          driver_id: "",
          driver_name: "",
          call_sign: "",
          docket_no: "",
          tariff: "",
          date: "",
          time: "",
          pickup: "",
          dropoff: "",
          driver_total: "",
        });

        setTimeout(() => {
          router.push("/job-management");
        }, 1000);
      } else {
        toast.error(response.data?.message || "Failed to add job");
      }
    } catch (error) {
      console.error("Error adding job:", error);

      if (error.response?.data?.errors) {
        error.response.data.errors.forEach((err) => {
          toast.error(err.message || err);
        });
      } else {
        toast.error(
          error.response?.data?.message ||
            "Failed to add job. Please try again."
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push("/job-management");
  };

  return (
    <div>
      <Breadcrumb
        items={[
          { href: "/dashboard", isHome: true },
          { label: "Job Management", href: "/job-management" },
          { label: "Add Job" },
        ]}
      />

      <div className="mx-auto bg-white rounded-lg shadow py-[20px] px-[10px] sm:p-[25px] md:p-[40px] md:pt-[28px] mt-[30px]">
        <h2 className="text-[22px] font-black text-primary mb-[20px]">
          Add New Job
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-[24px] gap-y-[18px]">
          <CustomSelect
            label="Select Driver"
            options={driverOptions}
            value={getSelectedDriverDisplay()}
            onChange={handleDriverChange}
            placeholder={
              loadingDrivers ? "Loading drivers..." : "Select a driver"
            }
            disabled={loadingDrivers}
            error={errors.driver_id}
          />

          <div>
            <Input
              label="Callsign"
              value={formData.call_sign}
              placeholder="Auto-populated from driver"
              disabled
            />
          </div>

          {/* Docket */}
          <div>
            <Input
              label="Docket"
              value={formData.docket_no}
              placeholder="Enter docket number"
              onChange={(e) => handleInputChange("docket_no", e.target.value)}
            />
            {errors.docket_no && (
              <p className="text-red-500 font-bold text-xs mt-1">
                {errors.docket_no}
              </p>
            )}
          </div>

          {/* Tariff */}
          <div>
            <Input
              label="Tariff"
              value={formData.tariff}
              placeholder="Enter tariff"
              onChange={(e) => handleInputChange("tariff", e.target.value)}
            />
            {errors.tariff && (
              <p className="text-red-500 font-bold text-xs mt-1">
                {errors.tariff}
              </p>
            )}
          </div>

          {/* Date */}
          <div>
            <Input
              label="Date"
              type="date"
              value={formData.date}
              onChange={(e) => handleInputChange("date", e.target.value)}
              onKeyDown={(e) => e.preventDefault()}
            />
            {errors.date && (
              <p className="text-red-500 font-bold text-xs mt-1">
                {errors.date}
              </p>
            )}
          </div>

          {/* Time */}
          <div>
            <Input
              label="Time"
              type="time"
              value={formData.time}
              onChange={(e) => handleInputChange("time", e.target.value)}
            />
            {errors.time && (
              <p className="text-red-500 font-bold text-xs mt-1">
                {errors.time}
              </p>
            )}
          </div>

          {/* Pickup Location */}
          <div>
            <Input
              label="Pickup Location"
              value={formData.pickup}
              placeholder="Enter pickup location"
              maxLength={50}
              onChange={(e) => handleInputChange("pickup", e.target.value)}
            />
            {errors.pickup && (
              <p className="text-red-500 font-bold text-xs mt-1">
                {errors.pickup}
              </p>
            )}
          </div>

          {/* Drop-off Location */}
          <div>
            <Input
              label="Drop-off Location"
              value={formData.dropoff}
              placeholder="Enter drop-off location"
              maxLength={50}
              onChange={(e) => handleInputChange("dropoff", e.target.value)}
            />
            {errors.dropoff && (
              <p className="text-red-500 font-bold text-xs mt-1">
                {errors.dropoff}
              </p>
            )}
          </div>

          {/* Driver Total */}
          <div>
            <Input
              label="Driver Total"
              type="number"
              step="0.01"
              min="0"
              value={formData.driver_total}
              placeholder="Enter driver total (e.g., 19.23)"
              onChange={(e) =>
                handleInputChange("driver_total", e.target.value)
              }
            />
            {errors.driver_total && (
              <p className="text-red-500 font-bold text-xs mt-1">
                {errors.driver_total}
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mt-[40px]">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-primary border border-primary hover:bg-primary/20 hover:text-primary duration-300 cursor-pointer text-white text-sm font-semibold px-[25px] py-[10px] rounded-[6px] min-w-[150px] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Adding...
              </>
            ) : (
              "Add Job"
            )}
          </button>
          <button
            onClick={handleCancel}
            disabled={submitting}
            className="bg-secondary border border-secondary hover:bg-secondary/20 hover:text-secondary duration-300 cursor-pointer text-white text-sm font-semibold px-[25px] py-[10px] rounded-[6px] min-w-[150px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default AddJob;
