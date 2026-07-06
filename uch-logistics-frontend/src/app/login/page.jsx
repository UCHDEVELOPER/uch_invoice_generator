"use client";
import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { loginUser } from "@/lib/api/auth.api";
import Cookies from "js-cookie";
import useUserStore from "@/store/useUserStore";

function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleRememberMeChange = (e) => {
    setRememberMe(e.target.checked);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await loginUser({ email, password });

      if (response.data.success && response.data.statusCode === 200) {
        const token = response.data.data.token;
        const user = response.data.data;
        Cookies.set("auth_token", token, {
          expires: 30, // 30 day
          secure: false,
          sameSite: "lax",
          path: "/",
        });

        useUserStore.getState().setUser({
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.image || null,
        });

        router.replace("/dashboard");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(
        err?.response?.data?.message || "Login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="flex flex-col items-center justify-center relative z-[2] p-[20px] md:p-[30px] ">
      <div className="mb-[30px] md:mb-[50px]">
        <Image
          src="/img/logo.png"
          alt="Logo"
          width={300}
          height={300}
          className="w-[150px] md:w-[200px] 2xl:w-[308px]"
        />
      </div>
      <div className="w-full max-w-[600px] 2xl:max-w-[721px]">
        <div className="bg-white rounded-[25px] shadow-[0px_64px_94px_0px_#2235810D] p-[30px] md:p-[50px]">
          <div className="text-center mb-8">
            <h1 className="text-[25px] md:text-[30px] 2xl:text-[42px] font-black text-primary leading-[1.2]">
              Welcome Back, Admin!
            </h1>
            <p className="text-[#515151] text-sm 2xl:text-[18px] mt-[5px]">
              Your command center for real-time logistics control starts here.
            </p>
          </div>

          {error && (
            <p className="text-red-500 text-sm mb-4 text-center">{error}</p>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <input
                type="email"
                value={email}
                required
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-[#22358114] rounded-[7px] focus:outline-0 focus:border-[#515151] duration-300 text-sm placeholder:text-[#515151] placeholder:font-light"
                placeholder="Enter Your Email"
              />
            </div>

            <div className="mb-6 relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                required
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-[#22358114] rounded-[7px] focus:outline-0 focus:border-[#515151] duration-300 text-sm placeholder:text-[#515151] placeholder:font-light pr-10"
                placeholder="Password"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                onClick={togglePasswordVisibility}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path
                      fillRule="evenodd"
                      d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z"
                      clipRule="evenodd"
                    />
                    <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                  </svg>
                )}
              </button>
            </div>

            <div className="mb-[20px]">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-black border-[#22358114] border rounded focus:ring-0 cursor-pointer"
                  checked={rememberMe}
                  onChange={handleRememberMeChange}
                />
                <span className="ml-2 text-[#515151] text-sm">
                  Remember Me?
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full block text-center bg-secondary border border-secondary hover:bg-secondary/20 hover:text-secondary duration-300 text-white py-3 px-4 rounded-[7px] font-medium"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>
          {/* <div className="mt-[15px] text-center">
            <a
              href="#"
              className="text-[#515151] text-sm font-medium hover:text-primary duration-300"
            >
              Forgot Password?
            </a>
          </div> */}
        </div>
      </div>

     

    </div>
  );
}

export default LoginPage;
