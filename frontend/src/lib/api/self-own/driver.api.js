import api from "../axios";

export const fetchAllDrivers = (data) =>
  api.get("/self-own-driver/get-all-drivers", {
    params: data,
  });

export const fetchSingleDriver = (id) =>
  api.get("/self-own-driver/get-driver/" + id);

export const addDriver = (data) =>
  api.post("/self-own-driver/add-driver", data);

export const updateDriver = (id, data) =>
  api.patch("/self-own-driver/update-driver/" + id, data);

export const deleteSelfOwnDriver = (id) =>
  api.delete(`/self-own-driver/delete-driver/${id}`);

export const importDrivers = (data) =>
  api.post("/self-own-driver/import-drivers", data);

export const exportDrivers = (data) =>
  api.post("/self-own-driver/export-drivers" , data);

export const getAllDriverPositions = () =>
  api.get("/self-own-driver/get-all-positions");

export const addDriverPosition = (data) =>
  api.post("/self-own-driver/add-driver-position", data);

export const deleteDriverPosition = (id) =>
  api.delete(`/self-own-driver/delete-driver-position/${id}`);

export const updateDriverPosition = (id, data) =>
  api.patch("/self-own-driver/update-driver-position/" + id, data);

export const fetchSingleDriverPosition = (id) =>
  api.get("/self-own-driver/get-driver-position/" + id);