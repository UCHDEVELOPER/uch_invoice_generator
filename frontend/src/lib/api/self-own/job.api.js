import api from "../axios";

export const fetchAllJobs = (data) =>
  api.get("/self-own-job/get-all-jobs", {
    params: data,
  });

export const fetchDriverJobs = (id, data) =>
  api.get(`/self-own-job/get-driver-jobs/${id}`, {
    params: data,
  });

export const fetchSingleJob = (id) => api.get("/self-own-job/get-job/" + id);

export const addJob = (data) => api.post("/self-own-job/add-job", data);

export const updateJob = (id, data) => api.put("/self-own-job/update-job/" + id, data);

export const deleteJob = (id) => api.delete(`/self-own-job/delete-job/${id}`);

export const importJobs = (data) => api.post("/self-own-job/import-jobs", data);

export const deleteBulkJobs = (data) =>
  api.post("/self-own-job/delete-bulk-jobs", {
    jobIds: data,
  });
