import React, { createContext, useState, useContext, useEffect } from 'react';
import { User, UserRole, AuthContextType } from '../types';
import toast from 'react-hot-toast';

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const USER_STORAGE_KEY = 'nexus_user';
const TOKEN_STORAGE_KEY = 'nexus_token';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem(USER_STORAGE_KEY);
    if (storedUser) setUser(JSON.parse(storedUser));
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string, role: UserRole): Promise<void> => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Login failed');
      const userData: User = {
        id: data._id,
        name: data.name,
        email: data.email,
        role: data.role,
        avatarUrl: data.avatarUrl,
        bio: data.bio,
        isOnline: true,
        createdAt: new Date().toISOString()
      };
      setUser(userData);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
      localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
      toast.success('Successfully logged in!');
    } catch (error) {
      toast.error((error as Error).message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string, role: UserRole): Promise<void> => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Registration failed');
      const userData: User = {
        id: data._id,
        name: data.name,
        email: data.email,
        role: data.role,
        avatarUrl: data.avatarUrl,
        bio: data.bio,
        isOnline: true,
        createdAt: new Date().toISOString()
      };
      setUser(userData);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
      localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
      toast.success('Account created successfully!');
    } catch (error) {
      toast.error((error as Error).message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = (): void => {
    setUser(null);
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    toast.success('Logged out successfully');
  };

  const forgotPassword = async (email: string): Promise<void> => {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Password reset instructions sent to your email');
    } catch (error) {
      toast.error((error as Error).message);
      throw error;
    }
  };

  const resetPassword = async (_token: string, _newPassword: string): Promise<void> => {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Password reset successfully');
    } catch (error) {
      toast.error((error as Error).message);
      throw error;
    }
  };

  const updateProfile = async (userId: string, updates: Partial<User>): Promise<void> => {
    try {
      const token = localStorage.getItem(TOKEN_STORAGE_KEY);
      const res = await fetch(`${API_URL}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Update failed');
      const updatedUser: User = { ...user!, ...updates };
      setUser(updatedUser);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error((error as Error).message);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, forgotPassword, resetPassword, updateProfile, isAuthenticated: !!user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
