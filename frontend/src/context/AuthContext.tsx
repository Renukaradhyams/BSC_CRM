import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import api from '../services/api';
import { User, CompanySettings, CompanyInput, SectionInput, AdminInput } from '../types';

interface AuthContextType {
  user: User | null;
  settings: CompanySettings | null;
  loading: boolean;
  setupComplete: boolean;
  checkSetupStatus: () => Promise<boolean>;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  onboard: (company: CompanyInput, sections: SectionInput[], admin: AdminInput) => Promise<{ ok: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [setupComplete, setSetupComplete] = useState<boolean>(true);

  useEffect(() => {
    const token = localStorage.getItem('crm_token');
    const storedUser = localStorage.getItem('crm_user');
    const storedSettings = localStorage.getItem('crm_settings');

    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem('crm_user');
      }
    }
    if (storedSettings) {
      try {
        setSettings(JSON.parse(storedSettings));
      } catch (e) {
        localStorage.removeItem('crm_settings');
      }
    }

    checkSetupStatus().finally(() => setLoading(false));
  }, []);

  const checkSetupStatus = async (): Promise<boolean> => {
    try {
      const res = await api.get('/api/auth/setup-check');
      if (res.data && res.data.ok) {
        setSetupComplete(res.data.setup_complete);
        return res.data.setup_complete;
      }
      return true;
    } catch (err) {
      console.error('Setup audit request failed:', err);
      return true;
    }
  };

  const login = async (email: string, password: string): Promise<{ ok: boolean; error?: string }> => {
    try {
      const res = await api.post('/api/auth/login', { email, password });
      if (res.data && res.data.ok) {
        const { token, user: userData, settings: settingsData } = res.data;
        localStorage.setItem('crm_token', token);
        localStorage.setItem('crm_user', JSON.stringify(userData));
        setUser(userData);

        if (settingsData) {
          localStorage.setItem('crm_settings', JSON.stringify(settingsData));
          setSettings(settingsData);
        }
        return { ok: true };
      } else {
        return { ok: false, error: res.data.error || 'Login failed' };
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Network error occurred during login';
      return { ok: false, error: errorMsg };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await api.post('/api/auth/logout');
    } catch (err) {
      console.error('Server session logout failed:', err);
    }
    localStorage.removeItem('crm_token');
    localStorage.removeItem('crm_user');
    localStorage.removeItem('crm_settings');
    setUser(null);
    setSettings(null);
  };

  const onboard = async (
    companyData: CompanyInput,
    sectionsData: SectionInput[],
    adminData: AdminInput
  ): Promise<{ ok: boolean; error?: string }> => {
    try {
      const res = await api.post('/api/auth/onboard', {
        company: companyData,
        sections: sectionsData,
        admin_user: adminData
      });

      if (res.data && res.data.ok) {
        await checkSetupStatus();
        return { ok: true };
      } else {
        return { ok: false, error: res.data.error || 'Onboarding failed' };
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Connection error. Please try again.';
      return { ok: false, error: errorMsg };
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      settings,
      loading,
      setupComplete,
      checkSetupStatus,
      login,
      logout,
      onboard,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
