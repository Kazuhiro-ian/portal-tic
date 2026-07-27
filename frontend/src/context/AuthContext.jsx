import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { login as apiLogin, setUnauthorizedHandler } from '../services/api.js';

const TOKEN_KEY = 'ithub_token';
const USER_KEY = 'ithub_user';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  });

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  const login = useCallback(async (username, password) => {
    const resp = await apiLogin(username, password);
    const loggedUser = { username: resp.username, nomeCompleto: resp.nomeCompleto, role: resp.role };
    localStorage.setItem(TOKEN_KEY, resp.token);
    localStorage.setItem(USER_KEY, JSON.stringify(loggedUser));
    setToken(resp.token);
    setUser(loggedUser);
    return loggedUser;
  }, []);

  const hasRole = useCallback((...roles) => !!user && roles.includes(user.role), [user]);

  const value = useMemo(() => ({
    user,
    token,
    isAuthenticated: !!token && !!user,
    login,
    logout,
    hasRole,
    isAdmin: user?.role === 'ADMIN',
    // Allowlist, e não "diferente de LEITURA": o papel QUALIDADE escreve apenas em
    // /api/qualidade/**, então liberá-lo aqui mostraria botões que o backend recusa com 403.
    canWrite: ['ADMIN', 'TECNICO'].includes(user?.role),
    canWriteQualidade: ['ADMIN', 'TECNICO', 'QUALIDADE'].includes(user?.role),
    isQualidade: user?.role === 'QUALIDADE',
  }), [user, token, login, logout, hasRole]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa ser usado dentro de um <AuthProvider>');
  return ctx;
}
