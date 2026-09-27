import { useState, useEffect, useCallback } from "react";

export interface AuthUser {
  id: string;
  githubId: string;
  username: string;
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

// Global modal bus for opening Sign In dialog from any button
type AuthModalListener = (open: boolean) => void;
const modalListeners = new Set<AuthModalListener>();

export const authModal = {
  open: () => modalListeners.forEach((fn) => fn(true)),
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

  const loginAsDeveloper = useCallback(async (username: string) => {
    try {
      const res = await fetch(apiUrl("/api/auth/signin/developer"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to sign in");
      }

      if (data.token) {
        setAuthToken(data.token);
      }
      setState((prev) => ({
        ...prev,
        user: data.user,
        authError: null,
      }));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Sign in failed" };
    }
  }, []);

  const loginWithPAT = useCallback(async (pat: string) => {
    try {
      const res = await fetch(apiUrl("/api/auth/signin/pat"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ pat }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Invalid Personal Access Token");
      }

      if (data.token) {
        setAuthToken(data.token);
      }
      setState((prev) => ({
        ...prev,
        user: data.user,
        authError: null,
      }));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "PAT verification failed" };
    }
  }, []);

  const loginAsDemo = useCallback(async (username: string) => {
    try {
      const res = await fetch(apiUrl("/api/auth/signin/demo"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Demo sign in failed");
      }

      if (data.token) {
        setAuthToken(data.token);
      }
      setState((prev) => ({
        ...prev,
        user: data.user,
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

  const isRole = useCallback(
    (role: string) => {
      return state.user?.role === role;
    },
    [state.user]
  );

  const isPro = state.user?.role === "pro" || state.user?.role === "admin";

  return {
    ...state,
    login: loginWithOAuth,
    loginWithOAuth,
    loginAsDeveloper,
    loginWithPAT,
    loginAsDemo,
    logout,
    hasPermission,
    isRole,
    isPro,
    openSignInModal: authModal.open,
  };
}
