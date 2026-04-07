import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { ApiUser, authService } from "../services/api";
import { useLanguage } from "./LanguageContext";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  status: AuthStatus;
  user: ApiUser | null;
  signInWithToken: (token: string, user: ApiUser) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { changeLanguage } = useLanguage();
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<ApiUser | null>(null);

  useEffect(() => {
    const bootstrap = async () => {
      const token = await authService.bootstrapToken();
      if (!token) {
        setStatus("unauthenticated");
        return;
      }

      try {
        const profile = await authService.fetchProfile();
        setUser(profile.user);
        if (profile.user.language) {
          await changeLanguage(String(profile.user.language));
        }
        setStatus("authenticated");
      } catch {
        await authService.saveToken(null);
        setUser(null);
        setStatus("unauthenticated");
      }
    };

    void bootstrap();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      signInWithToken: async (token, nextUser) => {
        await authService.saveToken(token);
        if (nextUser.language) {
          await changeLanguage(String(nextUser.language));
        }
        setUser(nextUser);
        setStatus("authenticated");
      },
      signOut: async () => {
        await authService.saveToken(null);
        setUser(null);
        setStatus("unauthenticated");
      },
    }),
    [status, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
};

