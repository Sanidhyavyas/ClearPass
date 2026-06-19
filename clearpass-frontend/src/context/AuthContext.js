import { createContext, useContext, useState } from "react";

import { clearAuth, getAuth, saveAuth } from "../utils/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => getAuth());

  const login = (payload) => {
    saveAuth(payload);
    setAuth(getAuth());
  };

  const logout = () => {
    clearAuth();
    setAuth(null);
  };

  /**
   * Merge partial user field updates into the current auth state.
   * Used by the Profile page after a successful name/department edit
   * so the header and other consumers reflect the change immediately.
   */
  const updateUser = (updates) => {
    setAuth((prev) => {
      if (!prev) return prev;
      const next = { ...prev, user: { ...prev.user, ...updates } };
      saveAuth(next);
      return next;
    });
  };

  const isAdmin = () => auth?.user?.role === "admin";
  const isStudent = () => auth?.user?.role === "student";
  const isTeacher = () => auth?.user?.role === "teacher";
  const isSuperAdmin = () => auth?.user?.role === "super_admin";

  return (
    <AuthContext.Provider value={{ auth, user: auth?.user || null, login, logout, updateUser, isAdmin, isStudent, isTeacher, isSuperAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export default AuthContext;
