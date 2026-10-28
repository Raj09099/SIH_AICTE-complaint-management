import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Shield, RefreshCw } from 'lucide-react';

export function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#070e1a] text-slate-300">
        <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4 animate-pulse">
          <Shield className="w-6 h-6" />
        </div>
        <div className="flex items-center space-x-2 text-sm font-medium">
          <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
          <span>Verifying AICTE Session Credentials...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Preserve the intended destination location
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Optional role check
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = (user?.role || '').toLowerCase();
    const hasRole = allowedRoles.some((r) => r.toLowerCase() === userRole || userRole === 'admin');
    if (!hasRole) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
          <h2 className="text-xl font-bold text-rose-400 mb-2">Access Restricted</h2>
          <p className="text-sm text-slate-400 max-w-md">
            Your current assigned role ({user?.role || 'officer'}) does not have permission to view this section.
          </p>
        </div>
      );
    }
  }

  return children ? children : <Outlet />;
}

export default ProtectedRoute;

