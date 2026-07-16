import api from "./axios";

export const fetchAllDrivers = (data) =>
  api.get("/driver/get-all-drivers", {
    params: data,
  });

export const fetchSingleDriver = (id) =>
  api.get("/driver/get-driver/" + id);

export const addDriver = (data) =>
  api.post("/driver/add-driver", data);

export const updateDriver = (id, data) =>
  api.patch("/driver/update-driver/" + id, data);

export const deleteDriver = (id) =>
  api.delete(`/driver/delete-driver/${id}`);

export const importDrivers = (data) =>
  api.post("/driver/import-drivers", data);

export const exportDrivers = (data) =>
  api.post("/driver/export-drivers" , data);

export const getAllDriverPositions = () =>
  api.get("/driver/get-all-positions");

export const addDriverPosition = (data) =>
  api.post("/driver/add-driver-position", data);

export const deleteDriverPosition = (id) =>
  api.delete(`/driver/delete-driver-position/${id}`);

export const updateDriverPosition = (id, data) =>
  api.patch("/driver/update-driver-position/" + id, data);

export const fetchSingleDriverPosition = (id) =>
  api.get("/driver/get-driver-position/" + id);

export const deleteCarryForwardCharges = (id) =>
  api.delete(`/driver/driver-carry-forward/${id}`);