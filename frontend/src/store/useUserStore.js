const { create } = require("zustand");
const { persist } = require("zustand/middleware");

const useUserStore = create(
  persist(
    (set, get) => ({
      user: null,

      setUser: (user) => set({ user }),

      setAvatar: (avatar) =>
        set((state) => ({
          user: state.user
            ? { ...state.user, avatar }
            : state.user,
        })),

      clearUser: () => set({ user: null }),
    }),
    {
      name: "user-session",
    }
  )
);

module.exports = useUserStore;
