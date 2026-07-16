"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import CustomDropdown from "@/components/layout/CustomDropdown";
import { fetchDashboardData } from "@/lib/api/self-own/dashboard.api";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Loader from "../Loader";
import { handleDeleteDriver } from "@/utils/helpers";
import ConfirmModal from "../ConfirmModal";
import { useSelector } from "react-redux";

function Page() {
  const router = useRouter();
  const { search } = useSelector((state) => state.search);
  // console.log(search);

  const [selectedDrivers, setSelectedDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [drivers, setDrivers] = useState([]);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const res = await fetchDashboardData();
        setDashboard(res.data.data);
        console.log(res.data.data , "-----------------------------------asasdfbkjfb")
        setDrivers(res.data.data?.recent_active_drivers || []);
      } catch (err) {
        if (err.response?.status === 401) {
          router.replace("/login");
        }
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [router]);

  if (loading) {
    return <Loader text="Loading dashboard..." />;
  }

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedDrivers(drivers.map((driver) => driver.id));
    } else {
      setSelectedDrivers([]);
    }
  };

  const handleSelectDriver = (driverId) => {
    if (selectedDrivers.includes(driverId)) {
      setSelectedDrivers(selectedDrivers.filter((id) => id !== driverId));
    } else {
      setSelectedDrivers([...selectedDrivers, driverId]);
    }
  };

  const handleView = (driverId, driverName) => {
    router.push(`/self-own/drivers/view/${driverId}`);
  };

  const handleEdit = (driverId, driverName) => {
    router.push(`/self-own/drivers/edit/${driverId}`);
  };

  const handleDelete = (driverId, driverName) => {
    setSelectedDriver({ id: driverId, name: driverName });
    setShowDeleteModal(true);
  };

  const formatRevenue = (amount) => {
    if (!amount) return "0";

    if (amount >= 1_000_000) {
      return `${(amount / 1_000_000).toFixed(1)}M+`;
    }

    if (amount >= 1_000) {
      return `${(amount / 1_000).toFixed(1)}k+`;
    }

    return amount.toString();
  };

  return (
    <section>
    <div className="flex justify-end  bg-center bg-cover" style={{backgroundImage:"url('/img/dashbg.png')"}}>
      <img src="/img/truck.png" alt="vvehicle" className="w-[70%] md:w-[50%] xl:w-auto" />
    </div>

      <div className="flex flex-wrap md:flex-nowrap  items-stretch justify-between gap-[20px] lg:gap-[30px] mt-[10px]">
        <div className="basis-[100%] sm:basis-[48%] lg:basis-[33%] flex flex-row md:flex-col xl:flex-row justify-between items-end md:items-start xl:items-end gap-[30px] border border-[#22358114] bg-white rounded-[15px] p-[20px]">
          <Image
            alt="Total Jobs Listed"
            src="/icons/total-jobs-listed.png"
            height={100}
            width={100}
            className="w-[60px] 2xl:w-[82px]"
          />
          <div className="text-right md:text-start xl:text-right">
            <p className="text-[#515151] md:text-[18px] 2xl:text-[22px]">
              Total Jobs Listed
            </p>
            <span className="block text-primary text-[22px] md:text-[24px] lg:text-[30px] xl:text-[35px] 2xl:text-[50px] font-black">
              {dashboard?.total_jobs || 0}
            </span>
          </div>
        </div>
        <div className="basis-[100%] sm:basis-[48%] lg:basis-[33%] flex flex-row md:flex-col xl:flex-row justify-between items-end md:items-start xl:items-end gap-[30px] border border-[#22358114] bg-white rounded-[15px] p-[20px]">
          <Image
            alt="Total Jobs Listed"
            src="/icons/active-drivers.png"
            height={100}
            width={100}
            className="w-[60px] 2xl:w-[82px]"
          />
          <div className="text-right md:text-start xl:text-right">
            <p className="text-[#515151] md:text-[18px] 2xl:text-[22px]">
              Active Drivers
            </p>
            <span className="block text-primary text-[22px] md:text-[24px] lg:text-[30px] xl:text-[35px] 2xl:text-[50px] font-black">
              {dashboard?.active_drivers || 0}
            </span>
          </div>
        </div>
        <div className="basis-[100%] sm:basis-[48%] lg:basis-[33%] flex flex-row md:flex-col xl:flex-row justify-between items-end md:items-start xl:items-end gap-[30px] border border-[#22358114] bg-white rounded-[15px] p-[20px]">
          <Image
            alt="Total Jobs Listed"
            src="/icons/total-revenue.png"
            height={100}
            width={100}
            className="w-[60px] 2xl:w-[82px]"
          />
          <div className="text-right md:text-start xl:text-right">
            <p className="text-[#515151] md:text-[18px] 2xl:text-[22px]">
              Total Revenue
            </p>

            <span
              title={`£${dashboard?.total_revenue?.toLocaleString()}`}
              className="block text-primary text-[22px]  md:text-[24px] lg:text-[30px] xl:text-[35px] 2xl:text-[50px] font-black cursor-pointer"
            >
              £{formatRevenue(dashboard?.total_revenue)}
            </span>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap sm:flex-nowrap items-center gap-[20px]  md:gap-[30px] justify-between mt-[30px] sm:mt-[35px] md:mt-[50px] mb-[20px]">
        <h2 className=" text-[22px] md:text-[25px] lg:text-[30px] 2xl:text-[34px] text-primary font-bold">
          Recent Active Drivers
        </h2>
        <Link
          href="/self-own/drivers"
          className="bg-secondary hover:bg-secondary/20 cursor-pointer border border-secondary rounded-[7px] px-[25px] min-w-[100px] py-[10px] hover:text-secondary duration-300 font-semibold text-sm text-white"
        >
          View All Drivers
        </Link>
      </div>
      <div className="w-full overflow-x-scroll">
        <table className="w-full border-separate border-spacing-y-3">
          <thead>
            <tr>
              <th>#ID</th>
              <th className="text-left px-[20px] py-[5px] 2xl:text-[20px]">
                Drivers
              </th>
              <th className="text-left px-[20px] py-[5px] 2xl:text-[20px]">
                Callsign
              </th>
              <th className="text-left px-[20px] py-[5px] 2xl:text-[20px] whitespace-nowrap">
                Position
              </th>
              <th className="text-left px-[20px] py-[5px] 2xl:text-[20px]">
                Status
              </th>
              <th className="text-left px-[20px] py-[5px] 2xl:text-[20px] text-center">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {loading ? (
              <tr>
                <td colSpan={6}>
                  <Loader text="Fetching drivers..." />
                </td>
              </tr>
            ) : drivers.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-20 text-gray-500">
                  No Active drivers found.
                </td>
              </tr>
            ) : (
              drivers.map((items) => (
                <tr key={items.id} className="text-[#515151] bg-white">
                  <td className="px-[20px] py-[20px] 2xl:text-[18px] border-y border-[#22358114] whitespace-nowrap">
                    {drivers.indexOf(items) + 1}
                  </td>
                  <td className="px-[20px] py-[20px] 2xl:text-[18px] border-y border-[#22358114] whitespace-nowrap">
                    {items.name}
                  </td>
                  <td className="px-[20px] py-[20px] 2xl:text-[18px] border-y border-[#22358114] whitespace-nowrap">
                    {items.call_sign}
                  </td>
                  <td className="px-[20px] py-[20px] 2xl:text-[18px] border-y border-[#22358114] whitespace-nowrap">
                    {items.driver_position?.label}
                  </td>
                  <td className="px-[20px] py-[20px] 2xl:text-[18px] border-y border-[#22358114] whitespace-nowrap text-green-500 capitalize">
                    {items.status}
                  </td>
                  <td className="px-[20px] py-[20px] 2xl:text-[18px] border-y border-[#22358114] border-r rounded-r-[15px]">
                    <div className="">
                      <CustomDropdown
                        driverId={items.id}
                        driverName={items.name || "Unknown"}
                        onView={handleView}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        isOpen={showDeleteModal}
        title="Delete Driver"
        description={`Are you sure you want to delete ${selectedDriver?.name}?`}
        confirmText="Delete"
        loading={deleteLoading}
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={() =>
          handleDeleteDriver({
            driverId: selectedDriver.id,
            driverName: selectedDriver.name,
            setLoading: setDeleteLoading,
            closeModal: () => setShowDeleteModal(false),
            onSuccess: (msg) => {
              setShowDeleteModal(false);
              setDrivers((prev) =>
                prev.filter((d) => d.id !== selectedDriver.id)
              );
            },
            onError: (msg) => {
              setShowDeleteModal(false);
            },
          })
        }
      />
    </section>
  );
}

export default Page;
