// components/Sidebar.jsx
"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutUser } from "@/lib/api/auth.api";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import useUserStore from "@/store/useUserStore";

function Sidebar({ collapsed, setCollapsed }) {
  const router = useRouter();
  const pathname = usePathname();

  // Detect section
  const isSelfOwn = pathname.startsWith("/self-own");

  // Active states — main
  const isActive = pathname === "/dashboard" || pathname === "/";
  const isDriverActive = pathname === "/drivers" || pathname === "/drivers/add" || pathname.startsWith("/drivers/view") || pathname.startsWith("/drivers/edit");
  const isDriverPositionsActive = pathname === "/driver-positions";
  const isJobActive = pathname === "/job-management" || pathname === "/job-management/add";
  const isInvoiceActive = pathname === "/invoices";
  const isSettingsActive = pathname === "/settings";

  // Active states — self-own
  const isSelfOwnDashboard = pathname === "/self-own/dashboard";
  const isSelfOwnDriverActive = pathname.startsWith("/self-own/drivers");
  const isSelfOwnDriverPositionsActive = pathname === "/self-own/driver-positions";
  const isSelfOwnJobActive = pathname.startsWith("/self-own/job-management");
  const isSelfOwnInvoiceActive = pathname.startsWith("/self-own/invoices");
  const isSelfOwnSettingsActive = pathname === "/self-own/settings";

  const handleLogout = async () => {
    try {
      await logoutUser();
      router.replace("/login");
    } catch (err) {
      console.error("Logout failed", err);
    } finally {
      Cookies.remove("auth_token", { path: "/" });
      useUserStore.getState().clearUser();
      router.replace("/login");
    }
  };

  // Choose active states based on section
  const dashboardActive = isSelfOwn ? isSelfOwnDashboard : isActive;
  const driverActive = isSelfOwn ? isSelfOwnDriverActive : isDriverActive;
  const driverPositionsActive = isSelfOwn ? isSelfOwnDriverPositionsActive : isDriverPositionsActive;
  const jobActive = isSelfOwn ? isSelfOwnJobActive : isJobActive;
  const invoiceActive = isSelfOwn ? isSelfOwnInvoiceActive : isInvoiceActive;
  const settingsActive = isSettingsActive;

  // Choose links based on section
  const dashboardLink = isSelfOwn ? "/self-own/dashboard" : "/dashboard";
  const driverLink = isSelfOwn ? "/self-own/drivers" : "/drivers";
  const driverPositionsLink = isSelfOwn ? "/self-own/driver-positions" : "/driver-positions";
  const jobLink = isSelfOwn ? "/self-own/job-management" : "/job-management";
  const invoiceLink = isSelfOwn ? "/self-own/invoices" : "/invoices";
  const settingsLink = "/settings";

  return (
    <aside
      className={`${
        collapsed ? "w-[100px] 2xl:w-[112px]" : "w-[250px] 2xl:w-[374px]"
      } bg-primary h-screen duration-300 overflow-hidden`}
    >
      <div
        className={`${
          collapsed ? "px-[5px]" : "px-[30px] mx-[10px] 2xl:mx-[15px]"
        } duration-300 py-[5px] h-[80px] 2xl:h-[120px] flex items-center justify-center border-b border-[#FFFFFF33]`}
      >
        <Image
          src="/img/logo.png"
          alt="Logo"
          width={300}
          height={300}
          className={`${
            collapsed ? "2xl:w-[90px] w-[80px]" : "w-[120px] 2xl:w-[165px]"
          } duration-300`}
        />
      </div>
      <div
        className={`${
          collapsed ? "pl-[20px]" : "pl-[20px] 2xl:pl-[55px]"
        } py-[50px] 2xl:h-[calc(100vh-220px)] h-[calc(100vh-180px)] duration-300`}
      >
        <nav className="space-y-[10px]">
          {/* Dashboard */}
          <Link
            href={dashboardLink}
            className={`
              ${collapsed ? "2xl:gap-[45px] gap-[35px]" : "gap-[10px]"}
              flex items-center whitespace-nowrap 2xl:text-[20px] hover:font-black
              rounded-l-[170px] p-[10px] pr-[20px] duration-300 text-white group
              ${dashboardActive ? "bg-[#C00000] font-black" : "hover:bg-[#C00000]"}`}
          >
            <span
              className={`border border-white p-[10px] flex items-center justify-center min-w-[40px] min-h-[40px] 2xl:min-w-[46px] 2xl:min-h-[46px] w-[40px] h-[40px] 2xl:w-[46px] 2xl:h-[46px] rounded-full duration-300
                ${dashboardActive ? "bg-white" : "group-hover:bg-white"}`}
            >
              <svg className="w-[18px] h-[18px]" viewBox="0 0 18 18" fill="none">
                <path
                  d="M17.6918 9.24483L9.62669 0.283622C9.28706 -0.0945407 8.63468 -0.0945407 8.29505 0.283622L0.229969 9.24483C0.114083 9.37362 0.0380173 9.53325 0.0109797 9.70438C-0.0160578 9.87551 0.00709263 10.0508 0.0776284 10.2091C0.221008 10.5326 0.541819 10.7405 0.895787 10.7405H2.68803V17.0133C2.68803 17.251 2.78244 17.4789 2.9505 17.6469C3.11855 17.815 3.34648 17.9094 3.58415 17.9094H6.27251C6.51018 17.9094 6.73811 17.815 6.90616 17.6469C7.07422 17.4789 7.16863 17.251 7.16863 17.0133V13.4288H10.7531V17.0133C10.7531 17.251 10.8475 17.4789 11.0156 17.6469C11.1836 17.815 11.4116 17.9094 11.6492 17.9094H14.3376C14.5753 17.9094 14.8032 17.815 14.9713 17.6469C15.1393 17.4789 15.2337 17.251 15.2337 17.0133V10.7405H17.026C17.1995 10.7412 17.3695 10.6914 17.5153 10.5972C17.661 10.503 17.7762 10.3684 17.8468 10.2099C17.9174 10.0513 17.9403 9.87564 17.9128 9.70429C17.8853 9.53294 17.8085 9.37329 17.6918 9.24483Z"
                  className={`duration-300 ${
                    dashboardActive ? "fill-secondary" : "fill-white group-hover:fill-secondary"
                  }`}
                />
              </svg>
            </span>
            Dashboard
          </Link>

          {/* Driver Profiles */}
          <Link
            href={driverLink}
            className={`
              ${collapsed ? "2xl:gap-[45px] gap-[35px]" : "gap-[10px]"}
              flex items-center whitespace-nowrap 2xl:text-[20px] hover:font-black
              rounded-l-[170px] p-[10px] pr-[20px] duration-300 text-white group
              ${driverActive ? "bg-[#C00000] font-black" : "hover:bg-[#C00000]"}`}
          >
            <span
              className={`border border-white p-[10px] flex items-center justify-center min-w-[40px] min-h-[40px] 2xl:min-w-[46px] 2xl:min-h-[46px] w-[40px] h-[40px] 2xl:w-[46px] 2xl:h-[46px] rounded-full duration-300
                ${driverActive ? "bg-white" : "group-hover:bg-white"}`}
            >
              <svg className="w-[18px] h-[18px]" width="21" height="15" viewBox="0 0 21 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M1.90909 0C0.854698 0 0 0.859101 0 1.9091V11.4546V12.4091C0 13.4591 0.854698 14.3182 1.90909 14.3182H17.1818H19.0909C20.1457 14.3182 21 13.4591 21 12.4091V11.4546V2.86364V1.9091C21 0.859101 20.1457 0 19.0909 0H17.1818H3.81818H1.90909ZM2.86364 1.9091H8.59091C9.11782 1.9091 9.54545 2.33645 9.54545 2.86364V10.321C8.8725 10.0347 8.23119 9.64687 7.48721 9.45598C7.04583 9.45598 6.8658 9.15171 6.83096 8.76988C7.44464 8.2926 7.77477 7.53495 7.99432 6.77131C8.33757 6.48495 8.59286 5.72132 8.14346 5.3395C7.92315 4.95768 7.91103 4.47443 7.60653 3.99717C7.20362 3.42444 6.49081 2.95313 5.72727 2.95313C5.09202 2.95313 4.48884 3.34689 4.05682 3.72871C3.6876 4.20598 3.47855 4.67728 3.34091 5.25002C2.93847 5.63183 2.98353 6.21052 3.28125 6.59235C3.59596 6.97416 3.57916 7.45739 3.81818 7.93467C3.91764 8.3165 4.50445 8.59687 4.50426 8.97871C4.64658 9.64687 3.82973 9.44404 3.46023 9.63496C2.94486 9.82587 2.27373 10.0287 1.90909 10.4105V2.86364C1.90909 2.33645 2.33644 1.9091 2.86364 1.9091ZM11.4545 2.86364H15.2727V3.81819H11.4545V2.86364ZM11.4545 4.77273H18.1364V5.72727H11.4545V4.77273ZM11.4545 6.68183H18.1364V7.63636H11.4545V6.68183Z"
                  className={`duration-300 ${
                    driverActive ? "fill-secondary" : "fill-white group-hover:fill-secondary"
                  }`}
                />
              </svg>
            </span>
            Driver Profiles
          </Link>

          {/* Driver Positions */}
          <Link
            href={driverPositionsLink}
            className={`
              ${collapsed ? "2xl:gap-[45px] gap-[35px]" : "gap-[10px]"}
              flex items-center whitespace-nowrap 2xl:text-[20px] hover:font-black
              rounded-l-[170px] p-[10px] pr-[20px] duration-300 text-white group
              ${driverPositionsActive ? "bg-[#C00000] font-black" : "hover:bg-[#C00000]"}`}
          >
            <span
              className={`border border-white p-[10px] flex items-center justify-center min-w-[40px] min-h-[40px] 2xl:min-w-[46px] 2xl:min-h-[46px] w-[40px] h-[40px] 2xl:w-[46px] 2xl:h-[46px] rounded-full duration-300
                ${driverPositionsActive ? "bg-white" : "group-hover:bg-white"}`}
            >
              <svg className="w-[18px] h-[18px]" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 0C7.79 0 6 1.79 6 4C6 6.21 7.79 8 10 8C12.21 8 14 6.21 14 4C14 1.79 12.21 0 10 0Z"
                  className={`duration-300 ${driverPositionsActive ? "fill-secondary" : "fill-white group-hover:fill-secondary"}`} />
                <path d="M10 9C6.13 9 3 11.13 3 14V15H9V13C9 12.45 9.45 12 10 12H15.5C15.82 12 16.11 12.17 16.28 12.43C16.78 11.58 17 10.77 17 14V15H17.5V14C17.5 11.13 13.87 9 10 9Z"
                  className={`duration-300 ${driverPositionsActive ? "fill-secondary" : "fill-white group-hover:fill-secondary"}`} />
                <path d="M18.5 14H12.5C12.22 14 12 14.22 12 14.5V19.5C12 19.78 12.22 20 12.5 20H18.5C18.78 20 19 19.78 19 19.5V14.5C19 14.22 18.78 14 18.5 14ZM17.5 18.5H13.5V17.5H17.5V18.5ZM17.5 16.5H13.5V15.5H17.5V16.5Z"
                  className={`duration-300 ${driverPositionsActive ? "fill-secondary" : "fill-white group-hover:fill-secondary"}`} />
              </svg>
            </span>
            Driver Positions
          </Link>

          {/* Job Management */}
          <Link
            href={jobLink}
            className={`
              ${collapsed ? "2xl:gap-[45px] gap-[35px]" : "gap-[10px]"}
              flex items-center whitespace-nowrap 2xl:text-[20px] hover:font-black
              rounded-l-[170px] p-[10px] pr-[20px] duration-300 text-white group
              ${jobActive ? "bg-[#C00000] font-black" : "hover:bg-[#C00000]"}`}
          >
            <span
              className={`border border-white p-[10px] flex items-center justify-center min-w-[40px] min-h-[40px] 2xl:min-w-[46px] 2xl:min-h-[46px] w-[40px] h-[40px] 2xl:w-[46px] 2xl:h-[46px] rounded-full duration-300
                ${jobActive ? "bg-white" : "group-hover:bg-white"}`}
            >
              <svg className="w-[18px] h-[18px]" width="17" height="19" viewBox="0 0 17 19" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9.50432 14.5822C9.69039 11.6471 13.3244 10.0633 15.6541 11.9266V9.271H15.5144C15.1414 9.31729 10.4827 10.1559 9.96992 10.2494C10.0634 11.088 9.45714 11.8803 8.57223 11.8803H8.05945C7.31431 11.8803 6.66176 11.2749 6.66176 10.4826V10.2494L1.90963 9.41076L1.11731 9.271H0.977539V12.8115C0.977539 14.3027 2.00221 15.4671 3.26013 15.4671H9.45624C9.40994 15.1876 9.40994 14.8617 9.45624 14.535L9.50432 14.5822Z"
                  className={`duration-300 ${jobActive ? "fill-secondary" : "fill-white group-hover:fill-secondary"}`} />
                <path d="M16.8659 17.8432C16.5863 17.5174 15.981 16.8648 15.6542 16.5853C16.6789 15.2811 16.2133 13.1374 14.7221 12.3922C12.9986 11.3204 10.5754 12.5783 10.4356 14.5822C10.1098 17.0518 13.0449 18.7753 15.048 17.2378C15.3275 17.5637 15.9329 18.1699 16.2124 18.4957C16.6317 18.9151 17.2843 18.3097 16.865 17.8904L16.8659 17.8432ZM13.2782 16.9111C10.6689 16.8176 10.6689 12.9976 13.2782 12.9513C15.9338 13.0448 15.8875 16.8648 13.2782 16.9111Z"
                  className={`duration-300 ${jobActive ? "fill-secondary" : "fill-white group-hover:fill-secondary"}`} />
                <path d="M7.64111 10.2494V10.4826C7.64111 10.7622 7.87436 10.9482 8.10671 10.9482H8.61949C8.89903 10.9482 9.08509 10.715 9.08509 10.4826V8.10657H7.64111V10.2031V10.2494ZM8.29366 9.08408C8.89903 9.03778 8.94622 9.96898 8.33996 9.96898C7.82718 9.96898 7.78089 9.13037 8.29366 9.08408Z"
                  className={`duration-300 ${jobActive ? "fill-secondary" : "fill-white group-hover:fill-secondary"}`} />
                <path d="M1.3514 8.38522C1.49116 8.38522 6.38307 9.27013 6.70889 9.3636V7.68638C6.70889 7.45314 6.89496 7.22078 7.17449 7.22078H9.55056C9.7838 7.22078 10.0162 7.40685 10.0162 7.68638V7.96592V9.3636C10.342 9.31731 15.2339 8.43152 15.3737 8.38522C16.166 8.24546 16.7713 7.54661 16.7713 6.66171V5.26402C16.7713 4.28564 16.0262 3.54051 15.0941 3.54051H12.1127V2.14282C12.1127 0.97838 11.1343 0 9.96987 0H6.80148C5.63704 0 4.65866 0.97838 4.65866 2.14282V3.54051H1.67722C0.745135 3.54051 0 4.33283 0 5.26402V6.66171C0 7.50032 0.559075 8.24546 1.39769 8.38522H1.3514ZM5.54445 2.60842V2.09564C5.54445 1.39679 6.10353 0.884008 6.80237 0.884008H9.97076C10.6696 0.884008 11.2287 1.44308 11.2287 2.09564V3.49332H5.59164V2.56123L5.54445 2.60842Z"
                  className={`duration-300 ${jobActive ? "fill-secondary" : "fill-white group-hover:fill-secondary"}`} />
                <path d="M13.6049 13.7436C13.4188 13.9297 13.4188 14.2092 13.6049 14.3962C13.8844 14.6757 13.8844 15.1413 13.6049 15.4208C13.1856 15.8864 13.8844 16.4927 14.2574 16.0262C14.8165 15.4208 14.8165 14.3953 14.2574 13.7436C14.0714 13.5575 13.7918 13.5575 13.6049 13.7436Z"
                  className={`duration-300 ${jobActive ? "fill-secondary" : "fill-white group-hover:fill-secondary"}`} />
              </svg>
            </span>
            Job Management
          </Link>

          {/* Invoices */}
          <Link
            href={invoiceLink}
            className={`
              ${collapsed ? "2xl:gap-[45px] gap-[35px]" : "gap-[10px]"}
              flex items-center whitespace-nowrap 2xl:text-[20px] hover:font-black
              rounded-l-[170px] p-[10px] pr-[20px] duration-300 text-white group
              ${invoiceActive ? "bg-[#C00000] font-black" : "hover:bg-[#C00000]"}`}
          >
            <span
              className={`border border-white p-[10px] flex items-center justify-center min-w-[40px] min-h-[40px] 2xl:min-w-[46px] 2xl:min-h-[46px] w-[40px] h-[40px] 2xl:w-[46px] 2xl:h-[46px] rounded-full duration-300
                ${invoiceActive ? "bg-white" : "group-hover:bg-white"}`}
            >
              <svg className="w-[18px] h-[18px]" width="17" height="17" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15.4736 0H5.0088C4.16834 0.00490136 3.48731 0.684534 3.48321 1.52511V10.456H10.6778C11.0367 10.4609 11.3269 10.7509 11.3318 11.1095V14.1679C11.3318 15.7322 12.6007 17 14.1655 17C15.7311 17 17 15.7322 17 14.1679V1.52511C16.9951 0.684555 16.3149 0.00491432 15.4736 0ZM7.625 8.71362H6.75347C6.3921 8.71362 6.09942 8.42037 6.09942 8.06012C6.09942 7.69905 6.3921 7.40662 6.75347 7.40662H7.62582H7.625C7.98637 7.40662 8.27905 7.69905 8.27905 8.06012C8.27905 8.42037 7.98637 8.71362 7.625 8.71362ZM7.625 6.09961H6.75347C6.3921 6.09961 6.09942 5.80637 6.09942 5.44611C6.09942 5.08505 6.3921 4.79261 6.75347 4.79261H7.62582H7.625C7.98637 4.79261 8.27905 5.08505 8.27905 5.44611C8.27905 5.80637 7.98637 6.09961 7.625 6.09961ZM7.625 3.48561H6.75347C6.3921 3.48561 6.09942 3.19236 6.09942 2.83211C6.09942 2.47105 6.3921 2.17861 6.75347 2.17861H7.62582H7.625C7.98637 2.17861 8.27905 2.47105 8.27905 2.83211C8.27905 3.19236 7.98637 3.48561 7.625 3.48561ZM13.7298 8.71362H10.2412C9.88065 8.71362 9.58716 8.42037 9.58716 8.06012C9.58716 7.69905 9.88065 7.40662 10.2412 7.40662H13.7298C14.0911 7.40662 14.3838 7.69905 14.3838 8.06012C14.3838 8.42037 14.0911 8.71362 13.7298 8.71362ZM13.7298 6.09961H10.2412C9.88065 6.09961 9.58716 5.80637 9.58716 5.44611C9.58716 5.08505 9.88065 4.79261 10.2412 4.79261H13.7298C14.0911 4.79261 14.3838 5.08505 14.3838 5.44611C14.3838 5.80637 14.0911 6.09961 13.7298 6.09961ZM13.7298 3.48561H10.2412C9.88065 3.48561 9.58716 3.19236 9.58716 2.83211C9.58716 2.47105 9.88065 2.17861 10.2412 2.17861H13.7298C14.0911 2.17861 14.3838 2.47105 14.3838 2.83211C14.3838 3.19236 14.0911 3.48561 13.7298 3.48561ZM10.3115 15.684C10.5143 16.1725 10.8102 16.6161 11.1831 16.991H3.26496C2.43596 16.991 1.6372 16.6757 1.03218 16.1096C0.426374 15.5427 0.0584729 14.7683 0.00367912 13.9417C-0.00122637 13.869 -0.00122637 13.7963 0.00367912 13.7235V12.6347C0.00367912 12.1535 0.393661 11.763 0.875211 11.763H9.16042C9.3918 11.763 9.61336 11.8545 9.77686 12.0179C9.94037 12.1813 10.032 12.4035 10.032 12.6347V14.1679C10.0287 14.6867 10.1235 15.2004 10.3115 15.684Z"
                  className={`duration-300 ${invoiceActive ? "fill-secondary" : "fill-white group-hover:fill-secondary"}`} />
              </svg>
            </span>
            Invoices
          </Link>

          {/* Settings */}
          {!isSelfOwn && (
            <Link
            href={settingsLink}
            className={`
              ${collapsed ? "2xl:gap-[45px] gap-[35px]" : "gap-[10px]"}
              flex items-center whitespace-nowrap 2xl:text-[20px] hover:font-black
              rounded-l-[170px] p-[10px] pr-[20px] duration-300 text-white group
              ${settingsActive ? "bg-[#C00000] font-black" : "hover:bg-[#C00000]"}`}
          >
            <span
              className={`border border-white p-[10px] flex items-center justify-center min-w-[40px] min-h-[40px] 2xl:min-w-[46px] 2xl:min-h-[46px] w-[40px] h-[40px] 2xl:w-[46px] 2xl:h-[46px] rounded-full duration-300
                ${settingsActive ? "bg-white" : "group-hover:bg-white"}`}
            >
              <svg className="w-[18px] h-[18px]" width="17" height="18" viewBox="0 0 17 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16.5069 11.1823L15.5487 10.587C14.3719 9.8566 14.3719 8.14334 15.5487 7.41297L16.5076 6.81768C16.9965 6.51457 17.1464 5.87162 16.8434 5.38336L15.4417 3.12486C15.1388 2.63582 14.4961 2.48583 14.008 2.78893L13.7222 2.96627C12.4783 3.7389 10.8704 2.84362 10.8704 1.37884V1.04213C10.8704 0.466379 10.4042 0 9.82868 0H7.17132C6.59581 0 6.12963 0.466379 6.12963 1.04213V1.37884C6.12963 2.84361 4.52101 3.73894 3.27777 2.96627L2.99196 2.78893C2.50313 2.48583 1.86125 2.63582 1.55825 3.12486L0.156572 5.38336C-0.146406 5.8724 0.00352003 6.51455 0.492355 6.81768L1.45051 7.41297C2.62729 8.1434 2.62729 9.85666 1.45051 10.587L0.492355 11.1823C0.00352399 11.4854 -0.146406 12.1284 0.156572 12.6166L1.55825 14.8751C1.86123 15.3642 2.50391 15.5142 2.99196 15.2111L3.27777 15.0337C4.52173 14.2611 6.12963 15.1564 6.12963 16.6212V16.9579C6.12963 17.5336 6.59581 18 7.17132 18H9.82868C10.4042 18 10.8704 17.5336 10.8704 16.9579V16.6212C10.8704 15.1564 12.4782 14.2611 13.7222 15.0337L14.008 15.2111C14.4969 15.5142 15.1387 15.3642 15.4417 14.8751L16.8434 12.6166C17.1464 12.1276 16.9965 11.4854 16.5076 11.1823ZM8.49882 12.2542C6.702 12.2542 5.24575 10.7972 5.24575 8.9997C5.24575 7.20222 6.7021 5.74524 8.49882 5.74524C10.2955 5.74524 11.7519 7.20222 11.7519 8.9997C11.7519 10.7972 10.2955 12.2542 8.49882 12.2542Z"
                  className={`duration-300 ${settingsActive ? "fill-secondary" : "fill-white group-hover:fill-secondary"}`} />
              </svg>
            </span>
            Settings
          </Link>
          )}
        </nav>
      </div>
      {/* logout button  */}
      <div className="px-[20px] mt-[30px]">
        <button
          onClick={handleLogout}
          className={`
                    border border-[#FFFFFF33] 2xl:text-[20px] bg-[#FFFFFF0D] rounded-[130px] flex items-center w-fit m-auto
                    text-white duration-300 py-[10px] cursor-pointer
                    ${collapsed ? "gap-0 px-[10px]" : "gap-[5px] px-[30px]"}`}
        >
          <svg
            className="w-[20px] h-[20px]"
            width="18"
            height="22"
            viewBox="0 0 18 22"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M10.8432 20.3609H1.37791V1.37791H10.8432C11.224 1.37791 11.5321 1.06971 11.5321 0.688953C11.5321 0.308192 11.224 0 10.8432 0H0.688953C0.308192 0 0 0.308192 0 0.688953V21.0498C0 21.4301 0.308192 21.7388 0.688953 21.7388H10.8432C11.224 21.7388 11.5321 21.4301 11.5321 21.0498C11.5321 20.6695 11.224 20.3609 10.8432 20.3609Z"
              fill="white"
            />
            <path
              d="M16.9593 10.3394L12.6533 6.03341C12.3842 5.76426 11.9483 5.76426 11.6791 6.03341C11.41 6.3021 11.41 6.73889 11.6791 7.00758L14.852 10.1804H7.51879C7.13803 10.1804 6.82983 10.4891 6.82983 10.8694C6.82983 11.2497 7.13803 11.5583 7.51879 11.5583H14.8525L11.6796 14.7312C11.4105 15.0004 11.4105 15.4362 11.6796 15.7054C11.8142 15.84 11.9905 15.907 12.1669 15.907C12.3433 15.907 12.5197 15.84 12.6542 15.7054L16.9602 11.3994C17.1058 11.2538 17.166 11.06 17.1536 10.8694C17.165 10.6788 17.1053 10.485 16.9593 10.3394Z"
              fill="white"
            />
          </svg>

          <span
            className={`duration-300 ${
              collapsed
                ? "opacity-0 scale-0 text-[0px]"
                : "opacity-100 scale 1 text-inherit"
            }`}
          >
            Logout
          </span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;