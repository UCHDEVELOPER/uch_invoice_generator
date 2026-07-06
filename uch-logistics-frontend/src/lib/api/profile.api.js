import api from "./axios";

export const updateProfile = (data) =>
  api.put("/user/profile",data);

export const getuserProfile = () =>
  api.get("/user/get-user-profile");

export const changePassword = (data) =>
  api.post("/auth/change-password",data);