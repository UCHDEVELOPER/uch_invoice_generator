import api from "./axios";

export const fetchAllJobs = (data) =>
  api.get("/job/get-all-jobs", {
    params: data,
  });

export const fetchDriverJobs = (id, data) =>
  api.get(`/job/get-driver-jobs/${id}`, {
    params: data,
  });

export const fetchSingleJob = (id) => api.get("/job/get-job/" + id);

export const addJob = (data) => api.post("/job/add-job", data);

export const updateJob = (id, data) => api.put("/job/update-job/" + id, data);

export const deleteJob = (id) => api.delete(`/job/delete-job/${id}`);

export const importJobs = (data) => api.post("/job/import-jobs", data);

export const exportJobs = (data) => api.post("/job/export-jobs", data);

export const deleteBulkJobs = (data) =>
  api.post("/job/delete-bulk-jobs", {
    jobIds: data,
  });
