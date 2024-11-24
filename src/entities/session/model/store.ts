import { create } from "zustand";
import { SessionState } from "../types";
import { sessionApi } from "../api";
import { config } from "@/shared/config";

const getInitialAuthState = () => {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem(config.auth.JWT.REFRESH_TOKEN);
};

export const useSessionStore = create<SessionState>((set) => ({
  isLoading: false,
  isAuthenticated: getInitialAuthState(),
  error: null,
  setIsAuthenticated: (value: boolean) => set({ isAuthenticated: value }),

  refreshTokens: async () => {
    try {
      set({ isLoading: true, error: null });

      if (typeof window === "undefined") {
        throw new Error("Cannot refresh token on server side");
      }

      const refreshToken = localStorage.getItem(config.auth.JWT.REFRESH_TOKEN);
      if (!refreshToken) {
        throw new Error("No refresh token found");
      }

      const data = await sessionApi.refreshToken(refreshToken);

      if (data.refreshToken) {
        localStorage.setItem(config.auth.JWT.REFRESH_TOKEN, data.refreshToken);
        await fetch("/api/auth/set-token", {
          method: "POST",
          body: JSON.stringify({ token: data.refreshToken }),
        });
      }

      set({ isAuthenticated: true });
      return data;
    } catch (error) {
      localStorage.removeItem(config.auth.JWT.REFRESH_TOKEN);
      await fetch("/api/auth/remove-token", { method: "POST" });
      set({
        error: error as Error,
        isAuthenticated: false,
      });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(config.auth.JWT.REFRESH_TOKEN);
    }
    await fetch("/api/auth/remove-token", { method: "POST" });
    set({ isAuthenticated: false });
  },
}));
