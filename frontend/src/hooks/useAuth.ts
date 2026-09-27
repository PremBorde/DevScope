import { useState, useEffect, useCallback } from "react";

export interface AuthUser {
  id: string;
  githubId?: string | null;
  username: string;
  email?: string | null;
  displayName: string | null;
  avatarUrl: string;
  profileUrl: string;
  role: "developer" | "pro" | "admin";
  permissions: string[];
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

// Global modal bus for opening Sign In / Register dialog
type AuthModalListener = (open: boolean, tab?: "login" | "register") => void;
const modalListeners = new Set<AuthModalListener>();

export const authModal = {
  open: (tab: "login" | "register" = "login") => modalListeners.forEach((fn) => fn(true, tab)),
  close: () => modalListeners.forEach((fn) => fn(false)),
  subscribe: (fn: AuthModalListener) => {
    modalListeners.add(fn);
    return () => {
      modalListeners.delete(fn);
    };
  },
};

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

  const loginWithOAuth = useCallback(() => {
    window.location.href = apiUrl("/api/auth/github");
  }, []);

  // Register New Account
  const register = useCallback(
    async (data: {
      username: string;
      email: string;
      password: string;
      confirmPassword?: string;
      githubUsername?: string;
    }) => {
      try {
        const res = await fetch(apiUrl("/api/auth/register"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(data),
        });

        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.message || "Registration failed");
        }

        if (json.token) {
          setAuthToken(json.token);
        }
        setState((prev) => ({
          ...prev,
          user: json.user,
          authError: null,
        }));
        return { success: true, message: json.message };
      } catch (err: any) {
        return { success: false, error: err.message || "Registration failed" };
      }
    },
    []
  );

  // Sign In with Username/Email + Password
  const loginWithCredentials = useCallback(
    async (data: { identifier: string; password: string }) => {
      try {
        const res = await fetch(apiUrl("/api/auth/login"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(data),
        });

        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.message || "Invalid credentials");
        }

        if (json.token) {
          setAuthToken(json.token);
        }
        setState((prev) => ({
          ...prev,
          user: json.user,
          authError: null,
        }));
        return { success: true, message: json.message };
      } catch (err: any) {
        return { success: false, error: err.message || "Sign in failed" };
      }
    },
    []
  );

  // 1-Click Demo Profiles
  const loginAsDemo = useCallback(async (username: string) => {
    try {
      const res = await fetch(apiUrl("/api/auth/signin/demo"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Demo sign in failed");
      }

      if (json.token) {
        setAuthToken(json.token);
      }
      setState((prev) => ({
        ...prev,
        user: json.user,
        authError: null,
      }));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Demo sign in failed" };
    }
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

  const hasPermission = useCallback(
    (permission: string) => {
      if (!state.user) return false;
      if (state.user.role === "admin") return true;
      return state.user.permissions?.includes(permission) ?? false;
    },
    [state.user]
  );

  const isPro = state.user?.role === "pro" || state.user?.role === "admin";

  return {
    ...state,
    login: loginWithOAuth,
    loginWithOAuth,
    register,
    loginWithCredentials,
    loginAsDemo,
    logout,
    hasPermission,
    isPro,
    openSignInModal: (tab: "login" | "register" = "login") => authModal.open(tab),
  };
}
