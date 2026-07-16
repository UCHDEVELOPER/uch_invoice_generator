// components/Header.jsx
"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import useUserStore from "@/store/useUserStore";
import { fetchSingleDriver } from "@/lib/api/driver.api";

function Header({ collapsed, setcollapsed }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useUserStore((state) => state.user);

  const isSelfOwn = pathname.startsWith("/self-own");

  const [pageTitle, setPageTitle] = useState("Dashboard");
  const [loading, setLoading] = useState(false);

  const handleDashboardToggle = (mode) => {
    if (mode === "self-own") {
      router.push("/self-own/dashboard");
    } else {
      router.push("/dashboard");
    }
  };

  useEffect(() => {
    const getPageTitle = async () => {
      // Self-Own section
      if (isSelfOwn) {
        if (pathname === "/self-own/dashboard") return setPageTitle("Self Own Dashboard");

        if (pathname.startsWith("/self-own/drivers/view/")) {
          const driverId = pathname.split("/").pop();
          setLoading(true);
          try {
            const response = await fetchSingleDriver(driverId);
            if (response.data.success && response.data.statusCode === 200) {
              setPageTitle(response.data.data.name ?? "Driver Details");
            } else {
              setPageTitle("Driver Details");
            }
          } catch {
            setPageTitle("Driver Details");
          } finally {
            setLoading(false);
          }
          return;
        }
        if (pathname.startsWith("/self-own/drivers/edit/")) return setPageTitle("Self Own Driver Profile Edit");
        if (pathname === "/self-own/drivers/add") return setPageTitle("Self Own Add New Driver");
        if (pathname.startsWith("/self-own/drivers")) return setPageTitle("Self Own Driver Profiles");
        if (pathname === "/self-own/driver-positions") return setPageTitle("Self Own Driver Positions");
        if (pathname === "/self-own/jobs/add") return setPageTitle("Self Own Add New Job");
        if (pathname.startsWith("/self-own/job-management")) return setPageTitle("Self Own Job Management");
        if (pathname.startsWith("/self-own/invoices")) return setPageTitle("Self Own Invoices");
        if (pathname === "/self-own/settings") return setPageTitle("Settings");

        // Fallback
        const pathSegment = pathname.split("/").filter(Boolean).pop();
        setPageTitle(
          pathSegment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
        );
        return;
      }

      // Main section (your existing logic unchanged)
      if (pathname === "/" || pathname === "/dashboard") return setPageTitle("Dashboard");

      const routeTitleMap = [
        { prefix: "/job-management", title: "Job Management" },
        { prefix: "/drivers", title: "Driver Profiles" },
        { prefix: "/invoices", title: "Invoice Management" },
        { prefix: "/driver-positions", title: "Driver Positions" },
        { prefix: "/settings", title: "Settings" },
      ];

      const matchedRoute = routeTitleMap.find((route) =>
        pathname.startsWith(route.prefix)
      );

      if (matchedRoute) {
        if (pathname.startsWith("/drivers/view/")) {
          const driverId = pathname.split("/").pop();
          setLoading(true);
          try {
            const response = await fetchSingleDriver(driverId);
            if (response.data.success && response.data.statusCode === 200) {
              setPageTitle(response.data.data.name ?? "Driver Details");
            } else {
              setPageTitle("Driver Details");
            }
          } catch {
            setPageTitle("Driver Details");
          } finally {
            setLoading(false);
          }
        } else if (pathname.startsWith("/drivers/edit/")) {
          setPageTitle("Driver Profile Edit");
        } else if (pathname.startsWith("/drivers/add")) {
          setPageTitle("Add New Driver");
        } else {
          setPageTitle(matchedRoute.title);
        }
      } else {
        const pathSegment = pathname.split("/").filter(Boolean).pop();
        if (pathSegment) {
          setPageTitle(
            pathSegment.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
          );
        }
      }
    };

    getPageTitle();
  }, [pathname, isSelfOwn]);

  return (
    <header className="h-[80px] 2xl:h-[120px] flex items-center gap-[30px] justify-between px-[30px] py-[20px] bg-white">
      <div className="flex items-center gap-[36px]">
        <div className="cursor-pointer" onClick={() => setcollapsed(!collapsed)}>
          <svg className="w-[25px]" width="25" height="20" viewBox="0 0 25 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <line y1="1" x2="25" y2="1" stroke="black" strokeWidth="2" />
            <line y1="9.82353" x2="25" y2="9.82353" stroke="black" strokeWidth="2" />
            <line y1="18.6471" x2="25" y2="18.6471" stroke="black" strokeWidth="2" />
          </svg>
        </div>
        <p className="text-[#223581] text-[20px] md:text-[26px] 2xl:text-[34px] font-bold">
          {loading ? "Loading..." : pageTitle}
        </p>
      </div>

      <div className="flex items-center gap-[20px] 2xl:gap-[30px]">
        {/* Toggle */}
        <div className="flex items-center bg-[#F8FAFC] rounded-full p-[4px] border border-[#E2E8F0]">
          <button
            onClick={() => handleDashboardToggle("main")}
            className={`
              px-[16px] py-[8px] 2xl:px-[20px] 2xl:py-[10px]
              rounded-full text-[12px] 2xl:text-[14px] font-medium
              transition-all duration-300 ease-in-out
              ${!isSelfOwn
                ? "bg-[#223581] text-white shadow-md"
                : "bg-transparent text-[#64748B] hover:text-[#223581]"
              }
            `}
          >
            Main Dashboard
          </button>
          <button
            onClick={() => handleDashboardToggle("self-own")}
            className={`
              px-[16px] py-[8px] 2xl:px-[20px] 2xl:py-[10px]
              rounded-full text-[12px] 2xl:text-[14px] font-medium
              transition-all duration-300 ease-in-out
              flex items-center gap-[6px]
              ${isSelfOwn
                ? "bg-[#223581] text-white shadow-md"
                : "bg-transparent text-[#64748B] hover:text-[#223581]"
              }
            `}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="2xl:w-[18px] 2xl:h-[18px]">
              <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M20.5899 22C20.5899 18.13 16.7399 15 11.9999 15C7.25991 15 3.40991 18.13 3.40991 22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Self-Owned Drivers
          </button>
        </div>

        {/* Avatar */}
        <div>
          {user?.avatar ? (
            <img src={user.avatar} alt="User" height={60} width={60} className="rounded-full w-[50px] 2xl:w-[60px] object-cover" />
          ) : (
            <div className="w-[50px] h-[50px] 2xl:w-[60px] 2xl:h-[60px] rounded-full bg-gray-300 flex items-center justify-center text-sm font-semibold text-gray-600">
              {user?.name?.[0]?.toUpperCase() || "AD"}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;