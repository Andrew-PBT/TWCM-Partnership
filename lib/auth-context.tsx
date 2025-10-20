"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { OktaAuth, AuthState } from "@okta/okta-auth-js";
import { oktaAuth } from "./okta-config";

interface AuthContextType {
  authState: AuthState | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  user: any;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleAuthStateChange = (authState: AuthState) => {
      console.log("Auth state changed:", authState);
      setAuthState(authState);
      setLoading(false);
    };

    oktaAuth.authStateManager.subscribe(handleAuthStateChange);

    // Start the auth state manager
    oktaAuth.start();

    return () => {
      oktaAuth.authStateManager.unsubscribe(handleAuthStateChange);
    };
  }, []);

  const login = async () => {
    try {
      await oktaAuth.signInWithRedirect();
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  const logout = async () => {
    try {
      await oktaAuth.signOut();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const value: AuthContextType = {
    authState,
    login,
    logout,
    isAuthenticated: authState?.isAuthenticated ?? false,
    user: authState?.idToken?.claims ?? null,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
