import api from "./axios";

export const fetchDashboardData = (data) =>
  api.get("/dashboard", data);

