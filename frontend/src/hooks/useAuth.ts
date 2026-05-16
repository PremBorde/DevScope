import { useState, useEffect, useCallback } from "react";

export interface AuthUser {
  githubId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string;
  profileUrl: string;
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  oauthEnabled: boolean;
}

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.trim().replace(/\/+$/, "") ?? "";
const apiUrl = (path: string) => `${API_BASE}${path}`;

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    oauthEnabled: false,
  });

  const fetchMe = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/api/auth/me"), { credentials: "include" });
      if (!res.ok) throw new Error("auth check failed");
      const data = await res.json() as { user: AuthUser | null; oauthEnabled: boolean };
      setState({ user: data.user, isLoading: false, oauthEnabled: data.oauthEnabled });
    } catch {
      setState({ user: null, isLoading: false, oauthEnabled: false });
    }
  }, []);

  useEffect(() => {
    void fetchMe();

    // Re-check after returning from OAuth redirect
    const params = new URLSearchParams(window.location.search);
    if (params.get("auth") === "success") {
      // Clean the URL without reloading
      window.history.replaceState({}, "", window.location.pathname);
      void fetchMe();
    }
  }, [fetchMe]);

  const login = useCallback(() => {
    window.location.href = apiUrl("/api/auth/github");
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch(apiUrl("/api/auth/logout"), { method: "POST", credentials: "include" });
    } finally {
      setState((s) => ({ ...s, user: null }));
    }
  }, []);

  return { ...state, login, logout, refetch: fetchMe };
}
