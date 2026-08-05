import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { API_BASE_URL } from "../config/api";
import {
  canAccessPage as checkPageAccess,
  getFirstAccessiblePage,
  hasPermission,
} from "./accessControl";
import { saveCsrfToken } from "../lib/installSecureFetch";

const AuthContext = createContext(null);

const readJson = async (response) => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.success === false) {
    const error = new Error(data.message || data.error || "Request failed");
    error.status = response.status;
    error.code = data.code;
    throw error;
  }
  return data;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [sessionMessage, setSessionMessage] = useState("");

  const applyAuthResponse = useCallback((data) => {
    saveCsrfToken(data?.csrfToken || null);
    setUser(data?.user || null);
    return data?.user || null;
  }, []);

  const loadSession = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      const data = await readJson(response);
      applyAuthResponse(data);
    } catch (error) {
      saveCsrfToken(null);
      setUser(null);
      if (error.status && error.status !== 401) {
        console.error("Session initialization error:", error);
      }
    } finally {
      setInitializing(false);
    }
  }, [applyAuthResponse]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  useEffect(() => {
    const handleAuthState = (event) => {
      if (event.detail?.status === 401) {
        saveCsrfToken(null);
        setUser(null);
        setSessionMessage("Your session ended. Sign in again to continue.");
      }
    };

    window.addEventListener("erp-auth-state", handleAuthState);
    return () => window.removeEventListener("erp-auth-state", handleAuthState);
  }, []);

  const login = useCallback(
    async ({ login, password, rememberMe }) => {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password, rememberMe }),
      });
      const data = await readJson(response);
      setSessionMessage("");
      applyAuthResponse(data);
      return data;
    },
    [applyAuthResponse]
  );

  const logout = useCallback(async () => {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      saveCsrfToken(null);
      setUser(null);
    }
  }, []);

  const changePassword = useCallback(
    async ({ currentPassword, newPassword }) => {
      const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await readJson(response);
      applyAuthResponse(data);
      return data;
    },
    [applyAuthResponse]
  );

  const updatePreferences = useCallback(async (preferences) => {
    const response = await fetch(`${API_BASE_URL}/auth/preferences`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(preferences),
    });
    const data = await readJson(response);
    setUser(data.user || null);
    return data.user;
  }, []);

  const markNotificationsRead = useCallback(async (readAt) => {
    const response = await fetch(`${API_BASE_URL}/auth/notifications/read`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ readAt }),
    });
    const data = await readJson(response);
    setUser((current) =>
      current
        ? {
            ...current,
            lastNotificationReadAt: data.readAt,
          }
        : current
    );
    return data.readAt;
  }, []);

  const permissions = user?.permissions || [];

  const value = useMemo(
    () => ({
      user,
      permissions,
      initializing,
      sessionMessage,
      setSessionMessage,
      login,
      logout,
      changePassword,
      updatePreferences,
      markNotificationsRead,
      reloadSession: loadSession,
      can: (permission) => hasPermission(permissions, permission),
      canAccessPage: (pageId) => checkPageAccess(permissions, pageId),
      firstAccessiblePage: getFirstAccessiblePage(permissions),
    }),
    [
      user,
      permissions,
      initializing,
      sessionMessage,
      login,
      logout,
      changePassword,
      updatePreferences,
      markNotificationsRead,
      loadSession,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
};
