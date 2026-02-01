// lib/auth/AuthContext.tsx
"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import type { UserSession } from "@/lib/db/schemas/user";
import type { Permission } from "@/lib/types/roles";
import { hasPermission } from "@/lib/types/roles";

interface AuthContextType {
  user: UserSession | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<UserSession>;
  logout: () => Promise<void>;
  hasPermission: (permission: Permission) => boolean;
  canAccessResource: (
    resourceType: "association" | "club",
    resourceId: string
  ) => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const response = await fetch("/api/auth/session");
      if (response.ok) {
        const session = await response.json();
        if (session.user) {
          setUser(session.user);
        }
      }
    } catch (error) {
      console.error("Failed to load user session:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (
    email: string,
    password: string
  ): Promise<UserSession> => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Login failed");
    }

    const data = await response.json();
    setUser(data.user);

    // Return user data for role-based redirect
    return data.user;
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  };

  const checkPermission = (permission: Permission): boolean => {
    if (!user) return false;
    return hasPermission(user.role, permission);
  };

  const canAccessResource = (
    resourceType: "association" | "club",
    resourceId: string
  ): boolean => {
    if (!user) return false;

    // Super admin can access everything
    if (user.role === "super-admin") return true;

    // Association admin can access their association
    if (resourceType === "association") {
      if (user.role === "association-admin") {
        return user.associationId === resourceId;
      }
    }

    // Club admin can access their club
    if (resourceType === "club") {
      if (
        user.role === "club-admin" ||
        user.role === "coach" ||
        user.role === "manager"
      ) {
        return user.clubId === resourceId;
      }
    }

    return false;
  };

  const refreshUser = async () => {
    await loadUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        hasPermission: checkPermission,
        canAccessResource,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
