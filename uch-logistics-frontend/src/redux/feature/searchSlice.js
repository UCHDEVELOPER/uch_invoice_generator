import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  search: "",
};

const search = createSlice({
  name: "search",
  initialState,
  reducers: {
    setSearch: (state, action) => {
      state.search = action.payload;
    },
  },
});

export const { setSearch } = search.actions;

export default search.reducer;
