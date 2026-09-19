"use client";

import React, { createContext, useContext } from "react";
import { useAuth } from "../hooks/auth/useAuth";
import type { UpdateProfilePayload, UserProfile } from "../types/auth/types";

interface AuthContextValue {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  updateProfile: (payload: UpdateProfilePayload) => Promise<UserProfile>;
  logout: () => Promise<void>;
  refetchUser: () => Promise<unknown>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const {
    user,
    isUserLoading,
    isAuthenticated,
    updateProfile,
    logout,
    refetchUser,
  } = useAuth();

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading: isUserLoading,
        isAuthenticated: isAuthenticated(),
        updateProfile,
        logout,
        refetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}
