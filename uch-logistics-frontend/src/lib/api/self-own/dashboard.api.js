import api from "../axios";

export const fetchDashboardData = (data) =>
  api.get("/self-own-dashboard", data);

