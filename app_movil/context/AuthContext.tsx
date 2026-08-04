import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { AUTH } from '@/constants/api';

type Usuario = {
  id: number;
  nombre: string;
  email: string;
  rol: 'admin' | 'proteccion_civil' | 'ciudadano';
};

type AuthContextType = {
  usuario: Usuario | null;
  token: string | null;
  cargando: boolean;
  login: (email: string, password: string) => Promise<void>;
  registro: (nombre: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'firewatch_token';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const guardado = await SecureStore.getItemAsync(TOKEN_KEY);
        if (guardado) {
          await cargarPerfil(guardado);
        }
      } finally {
        setCargando(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cargarPerfil = async (tok: string) => {
    try {
      const resp = await fetch(AUTH.perfil, {
        headers: { Authorization: `Bearer ${tok}` },
      });
      if (!resp.ok) {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        setToken(null);
        setUsuario(null);
        return;
      }
      const data = await resp.json();
      setToken(tok);
      setUsuario(data);
    } catch {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      setToken(null);
      setUsuario(null);
    }
  };

  const login = async (email: string, password: string) => {
    const resp = await fetch(AUTH.login, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await resp.json();
    if (!resp.ok) {
      throw new Error(data.error || 'No se pudo iniciar sesión');
    }
    await SecureStore.setItemAsync(TOKEN_KEY, data.access_token);
    setToken(data.access_token);
    setUsuario(data.usuario);
  };

  const registro = async (nombre: string, email: string, password: string) => {
    const resp = await fetch(AUTH.registro, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, email, password }),
    });
    const data = await resp.json();
    if (!resp.ok) {
      throw new Error(data.error || 'No se pudo registrar');
    }
    await login(email, password);
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setToken(null);
    setUsuario(null);
  };

  return (
    <AuthContext.Provider value={{ usuario, token, cargando, login, registro, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
