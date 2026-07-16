import { configureStore } from "@reduxjs/toolkit";
import searchRedcser from "./feature/searchSlice"
const store = configureStore({
  reducer: {
    search: searchRedcser,
  },
});

export default store;
