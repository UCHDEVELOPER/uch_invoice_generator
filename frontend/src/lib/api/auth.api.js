import api from "./axios";

export const loginUser = (data) =>
  api.post("/auth/signin", data);

export const logoutUser = () =>
  api.post("/auth/logout");

export const resetPassword = (data) =>
  api.post("/auth/reset-password", data);
