import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState({
    name: 'Authorized AICTE Official',
    email: 'officer@aicte-india.org',
    bureau: 'Central Grievance Redressal Cell',
    role: 'Case Officer',
  });
  const [isAuthenticated, setIsAuthenticated] = useState(true);

  const login = (userData, token) => {
    setUser(userData);
    setIsAuthenticated(true);
    if (token) {
      localStorage.setItem('sih26264_auth_token', token);
    }
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('sih26264_auth_token');
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
