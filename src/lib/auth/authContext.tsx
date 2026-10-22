"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  createdAt?: string;
  simulationsCount?: number;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  signup: (name: string, email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  loginDemo: () => void;
}

const STORAGE_KEY = "multiverse_user_session";

const DEMO_USER: AuthUser = {
  id: "usr_demo_4021",
  name: "Gautham Ram",
  email: "gautham@multiverse.ai",
  avatarUrl: "/logo.png",
  createdAt: "2026-10-15",
  simulationsCount: 4,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) return JSON.parse(stored);
      } catch {
        // Ignore storage errors on init
      }
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(false);

  const login = async (email: string, password?: string) => {
    void password;
    setIsLoading(true);
    // Simulate brief network authentication latency
    await new Promise((r) => setTimeout(r, 450));

    if (!email || !email.includes("@")) {
      setIsLoading(false);
      return { success: false, error: "Please enter a valid email address." };
    }

    const nameFromEmail = email.split("@")[0].replace(/[._-]/g, " ");
    const formattedName = nameFromEmail
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

    const authenticatedUser: AuthUser = {
      id: `usr_${Date.now()}`,
      name: formattedName || "Explorer",
      email,
      avatarUrl: "/logo.png",
      createdAt: new Date().toISOString().split("T")[0],
      simulationsCount: 1,
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(authenticatedUser));
    } catch {
      // Ignore storage errors
    }

    setUser(authenticatedUser);
    setIsLoading(false);
    return { success: true };
  };

  const signup = async (name: string, email: string, password?: string) => {
    void password;
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 500));

    if (!name || name.trim().length < 2) {
      setIsLoading(false);
      return { success: false, error: "Please provide a valid name (at least 2 characters)." };
    }

    if (!email || !email.includes("@")) {
      setIsLoading(false);
      return { success: false, error: "Please enter a valid email address." };
    }

    const newUser: AuthUser = {
      id: `usr_${Date.now()}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      avatarUrl: "/logo.png",
      createdAt: new Date().toISOString().split("T")[0],
      simulationsCount: 0,
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
    } catch {
      // Ignore storage errors
    }

    setUser(newUser);
    setIsLoading(false);
    return { success: true };
  };

  const logout = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
    setUser(null);
  };

  const loginDemo = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEMO_USER));
    } catch {
      // Ignore storage errors
    }
    setUser(DEMO_USER);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        logout,
        loginDemo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
