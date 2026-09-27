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
  authError: string | null;
}

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.trim().replace(/\/+$/, "") ?? "";
export const apiUrl = (path: string) => `${API_BASE}${path}`;

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem("devscope_token");
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null) {
  try {
    if (token) {
      localStorage.setItem("devscope_token", token);
    } else {
      localStorage.removeItem("devscope_token");
    }
  } catch {
    // ignore
  }
}

export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    oauthEnabled: false,
    authError: null,
  });

  const fetchMe = useCallback(async () => {
    try {
      const headers = { ...getAuthHeaders() };
      const res = await fetch(apiUrl("/api/auth/me"), {
        credentials: "include",
        headers,
      });

      if (!res.ok) throw new Error("auth check failed");
      const data = (await res.json()) as { user: AuthUser | null; oauthEnabled: boolean };
      setState((prev) => ({
        ...prev,
        user: data.user,
        isLoading: false,
        oauthEnabled: data.oauthEnabled,
        authError: null,
      }));
    } catch {
      setState((prev) => ({
        ...prev,
        user: null,
        isLoading: false,
        oauthEnabled: false,
      }));
    }
  }, []);

  useEffect(() => {
    // Check URL parameters for OAuth redirect results
    const params = new URLSearchParams(window.location.search);
    const authStatus = params.get("auth");
    const token = params.get("token");

    if (authStatus === "success") {
      if (token) {
        setAuthToken(token);
      }
      window.history.replaceState({}, "", window.location.pathname);
      void fetchMe();
    } else if (authStatus === "error" || authStatus === "denied") {
      window.history.replaceState({}, "", window.location.pathname);
      setState((prev) => ({
        ...prev,
        authError: "GitHub authorization was not completed or was cancelled.",
        isLoading: false,
      }));
    } else {
      void fetchMe();
    }
  }, [fetchMe]);

  const login = useCallback(() => {
    window.location.href = apiUrl("/api/auth/github");
  }, []);

  const logout = useCallback(async () => {
    try {
      const headers = { ...getAuthHeaders() };
      await fetch(apiUrl("/api/auth/logout"), {
        method: "POST",
        credentials: "include",
        headers,
      });
    } finally {
      setAuthToken(null);
      setState((s) => ({ ...s, user: null }));
    }
  }, []);

  return { ...state, login, logout, refetch: fetchMe };
}
