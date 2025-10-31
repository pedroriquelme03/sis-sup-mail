import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: number;
  nome: string;
  email: string;
  tipo_usuario: 'admin' | 'tecnico';
}

interface AuthContextType {
  user: User | null;
  login: (email: string, senha: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  updateProfile: (updates: { nome: string; email: string }) => Promise<boolean>;
  changePassword: (senhaAtual: string, novaSenha: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const login = async (email: string, senha: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha })
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erro no login:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  const updateProfile = async (updates: { nome: string; email: string }): Promise<boolean> => {
    if (!user) return false;
    try {
      const response = await fetch(`/api/usuarios/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!response.ok) return false;
      const updated = await response.json();
      const newUser = { ...user, nome: updated.nome, email: updated.email } as User;
      setUser(newUser);
      localStorage.setItem('user', JSON.stringify(newUser));
      return true;
    } catch {
      return false;
    }
  };

  const changePassword = async (
    senhaAtual: string,
    novaSenha: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'not_authenticated' };
    try {
      const response = await fetch(`/api/usuarios/${user.id}/senha`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senha_atual: senhaAtual, nova_senha: novaSenha })
      });
      if (response.ok) return { success: true };
      const err = await response.json().catch(() => ({}));
      return { success: false, error: err?.error || 'error' };
    } catch {
      return { success: false, error: 'network' };
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, updateProfile, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
