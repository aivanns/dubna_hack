"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { authApi } from "../api";
import { QUERY_KEYS } from "@/shared/enums/query-keys";
import { SessionState, useSessionStore } from "@/entities/session";
import { HOME } from "@/shared/router/routes";
import { AuthFormData } from "../types";

export const useAuth = () => {
  const router = useRouter();
  const setIsAuthenticated = useSessionStore(
    (state: SessionState) => state.setIsAuthenticated
  );

  const {
    mutateAsync: login,
    isPending,
    error,
  } = useMutation({
    mutationKey: [QUERY_KEYS.AUTH],
    mutationFn: async (credentials: AuthFormData) => {
      const data = await authApi.login(credentials);
      await fetch("/api/auth/set-token", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          accessToken: data.accessToken,
          refreshToken: data.refreshToken 
        }),
      });
      return data;
    },
    onSuccess: () => {
      setIsAuthenticated(true);
      router.push(HOME);
    },
  });

  return {
    login,
    isPending,
    error,
  };
};
