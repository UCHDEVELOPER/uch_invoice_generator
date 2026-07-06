"use client";
import { useState, useEffect, useRef } from "react";
import {
  getuserProfile,
  updateProfile,
  changePassword,
} from "@/lib/api/profile.api";
import { toast } from "react-hot-toast"; 
import Loader from "./Loader";
import useUserStore from "@/store/useUserStore";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";

function Setting() {
  const router = useRouter();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const fileInputRef = useRef(null);

  // Store original data for cancel functionality
  const [originalInfo, setOriginalInfo] = useState(null);

  const [personalInfo, setPersonalInfo] = useState({
    username: "",
    firstname: "",
    lastname: "",
    email: "",
    phone_no: "",
  });

  const [imagePreview, setImagePreview] = useState("/img/setting-img.png");
  const [imageFile, setImageFile] = useState(null);

  const [passwordData, setPasswordData] = useState({
    old_password: "",
    new_password: "",
    confirm_password: "",
  });

  const [passwordErrors, setPasswordErrors] = useState({});

  // Fetch user profile on mount
  useEffect(() => {
    const fetchProfile = async () => {
      setProfileLoading(true);
      try {
        const response = await getuserProfile();

        if (response.status === 200 && response.data.success) {
          const userData = response.data.data;
          const profileData = {
            username: userData.username || "",
            firstname: userData.firstname || "",
            lastname: userData.lastname || "",
            email: userData.email || "",
            phone_no: userData.phone_no || "",
          };

          setPersonalInfo(profileData);
          setOriginalInfo(profileData);

          if (userData.image) {
            setImagePreview(userData.image);
          }
        } else {
          toast.error(response.data?.message || "Failed to fetch profile");
        }
      } catch (error) {
        console.error("Profile fetch error:", error);
        toast.error(error.response?.data?.message || "Failed to fetch profile");
      } finally {
        setProfileLoading(false);
      }
    };

    fetchProfile();
  }, []);

  // Handle image click
  const handleImageClick = () => {
    if (!isEditing) {
      setIsEditing(true);
    }
    if (isEditing && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handle image change
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      if (!validTypes.includes(file.type)) {
        toast.error(
          "Please select a valid image file (JPEG, PNG, GIF, or WebP)"
        );
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size should be less than 5MB");
        return;
      }

      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Save personal info
  const handleSavePersonalInfo = async () => {
    // Validate required fields
    if (!personalInfo.firstname.trim()) {
      toast.error("First name is required");
      return;
    }
    if (!personalInfo.lastname.trim()) {
      toast.error("Last name is required");
      return;
    }
    if (!personalInfo.email.trim()) {
      toast.error("Email is required");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(personalInfo.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("username", personalInfo.username);
      formData.append("firstname", personalInfo.firstname);
      formData.append("lastname", personalInfo.lastname);
      formData.append("phone_no", personalInfo.phone_no);
      formData.append("email", personalInfo.email);

      if (imageFile) {
        formData.append("image", imageFile);
      }

      const response = await updateProfile(formData);

      if (response.status === 200 && response.data.success) {
        // console.log("response", response);
        toast.success(response.data.message || "Profile updated successfully");

        if (response.data.data?.image) {
          useUserStore.getState().setAvatar(response.data.data.image);
        }

        setOriginalInfo({ ...personalInfo });
        setIsEditing(false);
        setImageFile(null);
      } else {
        toast.error(response.data?.message || "Failed to update profile");
      }
    } catch (error) {
      console.error("Profile update error:", error);
      toast.error(error.response?.data?.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    if (originalInfo) {
      setPersonalInfo({ ...originalInfo });
    }
    // Reset image preview to original
    if (originalInfo?.image) {
      setImagePreview(originalInfo.image);
    } else {
      setImagePreview("/img/setting-img.png");
    }
    setImageFile(null);
    setIsEditing(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPersonalInfo((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle password input change
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear errors when user types
    if (passwordErrors[name]) {
      setPasswordErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  // Validate password
  const validatePassword = () => {
    const errors = {};

    if (!passwordData.old_password) {
      errors.old_password = "Current password is required";
    }

    if (!passwordData.new_password) {
      errors.new_password = "New password is required";
    } else if (passwordData.new_password.length < 6) {
      errors.new_password = "Password must be at least 6 characters";
    }

    if (!passwordData.confirm_password) {
      errors.confirm_password = "Please confirm your password";
    } else if (passwordData.new_password !== passwordData.confirm_password) {
      errors.confirm_password = "Passwords do not match";
    }

    if (
      passwordData.old_password &&
      passwordData.new_password &&
      passwordData.old_password === passwordData.new_password
    ) {
      errors.new_password =
        "New password must be different from current password";
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle change password
  const handleChangePassword = async () => {
    if (!validatePassword()) {
      return;
    }

    setPasswordLoading(true);
    try {
      const payload = {
        old_password: passwordData.old_password,
        new_password: passwordData.new_password,
      };

      const response = await changePassword(payload);

      if (response.status === 200 && response.data.success) {
        toast.success(response.data.message || "Password changed successfully");
        setPasswordData({
          old_password: "",
          new_password: "",
          confirm_password: "",
        });
        setPasswordErrors({});
        
      } else {
        toast.error(response.data?.message || "Failed to change password");
      }
    } catch (error) {
      console.error("Password change error:", error);
      toast.error(error.response?.data?.message || "Failed to change password");
    } finally {
      setPasswordLoading(false);

      Cookies.remove("auth_token", { path: "/" });
      useUserStore.getState().clearUser();
      router.replace("/login");
    }
  };

  // Handle cancel password
  const handleCancelPassword = () => {
    setPasswordData({
      old_password: "",
      new_password: "",
      confirm_password: "",
    });
    setPasswordErrors({});
  };

  const EyeIcon = ({ show }) =>
    show ? (
      <svg
        className="w-[15px] 2xl:w-[20px]"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M17.94 17.94C16.2306 19.243 14.1491 19.9649 12 20C5.63636 20 1 12 1 12C2.015 9.747 3.558 7.607 5.06 6.06M9.9 4.24C10.5883 4.07888 11.2931 3.99834 12 4C18.3636 4 23 12 23 12C22.393 13.136 21.669 14.23 20.87 15.17M14.12 14.12C13.8454 14.4147 13.5141 14.6512 13.1462 14.8151C12.7782 14.9791 12.3809 15.0673 11.9781 15.0744C11.5753 15.0815 11.1752 15.0074 10.8016 14.8565C10.4281 14.7056 10.0887 14.481 9.80385 14.1962C9.51897 13.9113 9.29439 13.5719 9.14351 13.1984C8.99262 12.8248 8.91853 12.4247 8.92563 12.0219C8.93274 11.6191 9.02091 11.2218 9.18488 10.8538C9.34884 10.4859 9.58525 10.1546 9.88 9.88"
          stroke="#515151"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M1 1L23 23"
          stroke="#515151"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ) : (
      <svg
        className="w-[15px] 2xl:w-[20px]"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 5C5.63636 5 1 12 1 12C1 12 5.63636 19 12 19C18.3636 19 23 12 23 12C23 12 18.3636 5 12 5Z"
          stroke="#515151"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z"
          stroke="#515151"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader text="Loading profile..." />
      </div>
    );
  }


  
  return (
    <div>
      {/* Profile Header Card */}
      <div className="w-full rounded-[15px] border border-[#22358114] bg-white px-[15px] py-[20px] sm:px-[20px] sm:py-[25px] lg:py-[35px] lg:px-[30px] mb-[30px]">
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-[30px]">
          <div className="relative w-[80px] h-[80px] md:w-[100px] md:h-[100px] lg:w-[120px] lg:h-[120px] rounded-full">
            <img
              src={imagePreview}
              alt="Profile"
              width={200}
              height={200}
              className="object-cover rounded-full w-full h-full text-center border-2 border-gray-100"
            />

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageChange}
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
            />

            <span
              onClick={handleImageClick}
              className={`flex items-center justify-center rounded-full bg-primary absolute bottom-0 right-0 border-2 border-white h-[30px] w-[30px] md:h-[32px] md:w-[32px] ${
                isEditing
                  ? "cursor-pointer hover:bg-primary/80 transition-colors"
                  : "cursor-default opacity-50"
              }`}
            >
              <svg
                className="w-[12px] h-[10px] md:w-[16px] md:h-[14px]"
                viewBox="0 0 18 14"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M11.5714 7.63636C11.5714 9.04272 10.4207 10.1818 9 10.1818C7.5793 10.1818 6.42857 9.04272 6.42857 7.63636C6.42857 6.23001 7.5793 5.09091 9 5.09091C10.4207 5.09091 11.5714 6.23001 11.5714 7.63636ZM18 4.45455V12.0909C18 13.1409 17.1321 14 16.0714 14H1.92857C0.867867 14 0 13.1409 0 12.0909V4.45455C0 3.40456 0.867867 2.54545 1.92857 2.54545H4.78286C5.07857 2.54545 5.33571 2.34818 5.40642 2.06182L5.5607 1.44456C5.77928 0.591828 6.54427 0 7.43143 0H10.5686C11.4557 0 12.2207 0.591808 12.4393 1.44456L12.5936 2.06182C12.6643 2.34817 12.9214 2.54545 13.2171 2.54545H16.0714C17.1321 2.54545 18 3.40456 18 4.45455ZM12.8571 7.63636C12.8571 5.52995 11.1279 3.81818 9 3.81818C6.87213 3.81818 5.14286 5.52999 5.14286 7.63636C5.14286 9.74274 6.87213 11.4545 9 11.4545C11.1279 11.4545 12.8571 9.74274 12.8571 7.63636Z"
                  fill="white"
                />
              </svg>
            </span>
          </div>
          <div>
            <p className="text-[18px] md:text-[20px] 2xl:text-[22px] font-black">
              {personalInfo.firstname} {personalInfo.lastname}
            </p>
            <p className="text-[16px] md:text-[18px] 2xl:text-[20px] font-medium text-primary">
              Admin
            </p>
            {isEditing && (
              <p className="text-xs text-gray-500 mt-1">
                Click camera icon to change photo
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Personal Information Card */}
      <div className="w-full rounded-[15px] border border-[#22358114] bg-white mb-[30px]">
        <div className="flex flex-wrap sm:flex-nowrap gap-[20px] items-center justify-between px-[15px] py-[20px] sm:px-[20px] sm:py-[25px] lg:pl-[30px] lg:pr-[60px] lg:py-[20px] border-b border-[#22358114]">
          <h2 className="text-[18px] md:text-[22px] lg:text-[25px] 2xl:text-[34px] font-bold">
            Personal Information
          </h2>

          {isEditing ? (
            <div className="flex gap-3">
              <button
                onClick={handleCancelEdit}
                disabled={loading}
                className="min-w-[100px] cursor-pointer rounded-[6px] hover:bg-[#515151]/20 border border-[#22358114] hover:border-[#515151] duration-300 px-[25px] py-[10px] 2xl:text-[18px] text-sm text-[#515151] font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePersonalInfo}
                disabled={loading}
                className="min-w-[100px] cursor-pointer rounded-[6px] bg-primary border border-primary px-[25px] py-[10px] 2xl:text-[18px] text-sm font-semibold text-white hover:bg-primary/20 hover:text-primary duration-300 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Saving..
                  </>
                ) : (
                  "Save"
                )}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="group flex items-center gap-2 rounded-md bg-secondary border border-secondary hover:bg-secondary/20 hover:text-secondary duration-300 px-[25px] py-[10px] min-w-[100px] 2xl:text-[18px] text-sm text-white transition"
            >
              <svg
                className="w-[15px] h-[15px]"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M21.5442 0.531628C20.8368 -0.175716 19.6818 -0.178701 18.9744 0.531628L9.20851 10.2971C8.97869 10.527 8.81751 10.8105 8.73394 11.1239L7.5729 15.5888C7.52216 15.7888 7.57887 16.0007 7.72512 16.1469C7.83555 16.2573 7.98479 16.317 8.13701 16.317C8.18476 16.317 8.2355 16.3111 8.28326 16.2991L12.7483 15.1381C13.0617 15.0575 13.3483 14.8934 13.5751 14.6636L23.341 4.89806C24.0484 4.19071 24.0484 3.03568 23.341 2.32834L21.5442 0.528643V0.531628ZM8.95183 14.9232L9.69203 12.0789L11.7962 14.1831L8.95183 14.9232ZM12.9274 13.6697L10.2054 10.9478L17.1717 3.98179L19.8937 6.70372L12.9274 13.6697ZM20.7175 5.87998L17.9954 3.15805L18.3297 2.82378L21.0517 5.54571L20.7175 5.87998ZM22.5202 4.0773L21.8755 4.72197L19.1535 2.00004L19.7982 1.35537C19.9265 1.22703 20.0937 1.16436 20.2608 1.16436C20.4279 1.16436 20.5951 1.22703 20.7234 1.35537L22.5202 3.15507C22.7739 3.40876 22.7739 3.82361 22.5202 4.0773Z"
                  className="fill-white duration-300 group-hover:fill-secondary"
                />
                <path
                  d="M3.05333 23.8768H19.4154C21.0987 23.8768 22.4687 22.5069 22.4687 20.8236V9.03151C22.4687 8.70918 22.2091 8.44952 21.8867 8.44952C21.5644 8.44952 21.3047 8.70918 21.3047 9.03151V20.8236C21.3047 21.8652 20.457 22.7098 19.4184 22.7098H3.05333C2.01168 22.7098 1.16701 21.8622 1.16701 20.8236V4.46213C1.16701 3.42051 2.01466 2.57588 3.05333 2.57588H14.8488C15.1712 2.57588 15.4308 2.31622 15.4308 1.99389C15.4308 1.67155 15.1712 1.4119 14.8488 1.4119H3.05333C1.36997 1.4119 0 2.78181 0 4.46511V20.8265C0 22.5098 1.36997 23.8798 3.05333 23.8798V23.8768Z"
                  className="fill-white duration-300 group-hover:fill-secondary"
                />
              </svg>
              Edit
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-[20px] px-[15px] py-[20px] sm:px-[20px] sm:py-[25px] lg:px-[38px] lg:py-[30px] sm:grid-cols-2 md:grid-cols-3">
          <div>
            <p className="text-sm 2xl:text-[18px] text-[#515151] mb-1">
              Username
            </p>
            {isEditing ? (
              <input
                type="text"
                name="username"
                value={personalInfo.username}
                onChange={handleInputChange}
                className="w-full rounded-md 2xl:text-[20px] border border-[#22358114] px-4 py-2 text-sm focus:border-[#515151] duration-300 focus:outline-none"
              />
            ) : (
              <p className="font-semibold 2xl:text-[18px] text-black">
                {personalInfo.username || "-"}
              </p>
            )}
          </div>

          <div>
            <p className="text-sm 2xl:text-[18px] text-[#515151] mb-1">
              First Name <span className="text-red-500">*</span>
            </p>
            {isEditing ? (
              <input
                type="text"
                name="firstname"
                value={personalInfo.firstname}
                onChange={handleInputChange}
                className="w-full rounded-md 2xl:text-[20px] border border-[#22358114] px-4 py-2 text-sm focus:border-[#515151] duration-300 focus:outline-none"
                required
              />
            ) : (
              <p className="font-semibold 2xl:text-[18px] text-black">
                {personalInfo.firstname || "-"}
              </p>
            )}
          </div>

          <div>
            <p className="text-sm 2xl:text-[18px] text-[#515151] mb-1">
              Last Name <span className="text-red-500">*</span>
            </p>
            {isEditing ? (
              <input
                type="text"
                name="lastname"
                value={personalInfo.lastname}
                onChange={handleInputChange}
                className="w-full rounded-md 2xl:text-[20px] border border-[#22358114] px-4 py-2 text-sm focus:border-[#515151] duration-300 focus:outline-none"
                required
              />
            ) : (
              <p className="font-semibold 2xl:text-[18px] text-black">
                {personalInfo.lastname || "-"}
              </p>
            )}
          </div>

          <div>
            <p className="text-sm 2xl:text-[18px] text-[#515151] mb-1">
              Email Address <span className="text-red-500">*</span>
            </p>
            {isEditing ? (
              <input
                type="email"
                name="email"
                value={personalInfo.email}
                onChange={handleInputChange}
                className="w-full rounded-md 2xl:text-[20px] border border-[#22358114] px-4 py-2 text-sm focus:border-[#515151] duration-300 focus:outline-none"
                required
              />
            ) : (
              <p className="font-semibold 2xl:text-[18px] text-black">
                {personalInfo.email || "-"}
              </p>
            )}
          </div>

          <div>
            <p className="text-sm 2xl:text-[18px] text-[#515151] mb-1">
              Phone Number
            </p>
            {isEditing ? (
              <input
                type="tel"
                name="phone_no"
                value={personalInfo.phone_no}
                onChange={handleInputChange}
                className="w-full rounded-md 2xl:text-[20px] border border-[#22358114] px-4 py-2 text-sm focus:border-[#515151] duration-300 focus:outline-none"
              />
            ) : (
              <p className="font-semibold 2xl:text-[18px] text-black">
                {personalInfo.phone_no || "-"}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Password Card */}
      <div className="w-full rounded-[15px] border border-[#22358114] bg-white">
        <div className="flex gap-[20px] flex-wrap sm:flex-nowrap items-center justify-between px-[15px] py-[20px] sm:px-[20px] sm:py-[25px] lg:pl-[30px] lg:pr-[60px] lg:py-[20px] border-b border-[#22358114]">
          <h2 className="text-[18px] md:text-[22px] lg:text-[25px] 2xl:text-[34px] font-semibold text-black">
            Password
          </h2>

          <div className="flex gap-3 items-center">
            <button
              onClick={handleCancelPassword}
              disabled={passwordLoading}
              className="min-w-[100px] cursor-pointer rounded-[6px] border hover:bg-[#515151]/20 border-[#22358114] hover:border-[#515151] duration-300 px-[25px] py-[10px] 2xl:text-[18px] text-sm text-[#515151] font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleChangePassword}
              disabled={passwordLoading}
              className="min-w-[100px] cursor-pointer rounded-[6px] bg-primary border border-primary px-[25px] py-[10px] 2xl:text-[18px] text-sm font-semibold text-white hover:bg-primary/20 hover:text-primary duration-300 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {passwordLoading ? (
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
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 px-[15px] py-[20px] sm:px-[20px] sm:py-[25px] lg:px-[38px] lg:py-[30px] sm:grid-cols-2 md:grid-cols-3">
          <div>
            <label className="mb-2 block 2xl:text-base text-sm text-[#515151]">
              Current Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                name="old_password"
                value={passwordData.old_password}
                onChange={handlePasswordChange}
                placeholder="Enter current password"
                className={`w-full rounded-[5px] border ${
                  passwordErrors.old_password
                    ? "border-red-500"
                    : "border-[#22358114]"
                } px-4 py-2 md:text-[16px] lg:text-[18px] 2xl:text-[20px] text-sm focus:border-[#515151] duration-300 focus:outline-none pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="cursor-pointer absolute right-4 top-1/2 -translate-y-1/2 text-[#515151]"
              >
                <EyeIcon show={showCurrent} />
              </button>
            </div>
            {passwordErrors.old_password && (
              <p className="text-red-500 text-xs mt-1">
                {passwordErrors.old_password}
              </p>
            )}
          </div>

          <div>
            <label className="mb-2 block 2xl:text-base text-sm text-[#515151]">
              New Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                name="new_password"
                value={passwordData.new_password}
                onChange={handlePasswordChange}
                placeholder="Enter new password"
                className={`w-full rounded-[5px] border ${
                  passwordErrors.new_password
                    ? "border-red-500"
                    : "border-[#22358114]"
                } px-4 py-2 md:text-[16px] lg:text-[18px] 2xl:text-[20px] text-sm focus:border-[#515151] duration-300 focus:outline-none pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="cursor-pointer absolute right-4 top-1/2 -translate-y-1/2 text-[#515151]"
              >
                <EyeIcon show={showNew} />
              </button>
            </div>
            {passwordErrors.new_password && (
              <p className="text-red-500 text-xs mt-1">
                {passwordErrors.new_password}
              </p>
            )}
          </div>

          <div>
            <label className="mb-2 block 2xl:text-base text-sm text-[#515151]">
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                name="confirm_password"
                value={passwordData.confirm_password}
                onChange={handlePasswordChange}
                placeholder="Confirm new password"
                className={`w-full rounded-[5px] border ${
                  passwordErrors.confirm_password
                    ? "border-red-500"
                    : "border-[#22358114]"
                } px-4 py-2 md:text-[16px] lg:text-[18px] 2xl:text-[20px] text-sm focus:border-[#515151] duration-300 focus:outline-none pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="cursor-pointer absolute right-4 top-1/2 -translate-y-1/2 text-[#515151]"
              >
                <EyeIcon show={showConfirm} />
              </button>
            </div>
            {passwordErrors.confirm_password && ( 
              <p className="text-red-500 text-xs mt-1">
                {passwordErrors.confirm_password}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Setting;
