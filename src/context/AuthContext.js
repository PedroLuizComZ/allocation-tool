import React, { createContext, useContext, useState, useEffect } from 'react';
import { useMsal } from '@azure/msal-react';
import { setAuthToken } from '../services/api';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const { instance, accounts } = useMsal();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if Azure AD is configured
  const isAzureConfigured = process.env.REACT_APP_AZURE_CLIENT_ID && 
                           process.env.REACT_APP_AZURE_CLIENT_ID.trim() !== '';

  useEffect(() => {
    const initAuth = async () => {
      if (!isAzureConfigured) {
        // Demo mode - auto login with demo user
        try {
          const response = await api.post('/auth/login');
          setUser(response.data.user);
        } catch (error) {
          console.error('Demo login error:', error);
          // If auto-login fails, set a default demo user to allow access
          setUser({
            id: 'demo-user',
            email: 'demo@example.com',
            name: 'Demo User',
            roles: ['user'],
            role: 'admin'
          });
        }
      } else if (accounts.length > 0) {
        try {
          const response = await api.post('/auth/login');
          setUser(response.data.user);
        } catch (error) {
          console.error('Auth initialization error:', error);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, [accounts, isAzureConfigured]);

  const login = async () => {
    if (!isAzureConfigured) {
      // Demo mode login
      try {
        const response = await api.post('/auth/login');
        setUser(response.data.user);
      } catch (error) {
        console.error('Demo login error:', error);
        // Fallback to local demo user
        setUser({
          id: 'demo-user',
          email: 'demo@example.com',
          name: 'Demo User',
          roles: ['user'],
          role: 'admin'
        });
      }
    } else {
      try {
        await instance.loginPopup({ scopes: ['User.Read'] });
        const response = await api.post('/auth/login');
        setUser(response.data.user);
      } catch (error) {
        console.error('Login error:', error);
      }
    }
  };

  const logout = () => {
    if (isAzureConfigured) {
      instance.logoutPopup();
    }
    setUser(null);
    setAuthToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
