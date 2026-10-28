import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/common/ProtectedRoute';

// Page Imports
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Institutions from './pages/Institutions';
import InstitutionDetails from './pages/InstitutionDetails';
import Complaints from './pages/Complaints';
import ComplaintDetails from './pages/ComplaintDetails';
import CaseOverlap from './pages/CaseOverlap';
import ProblemPatterns from './pages/ProblemPatterns';
import EvidenceChecker from './pages/EvidenceChecker';
import Analytics from './pages/Analytics';
import NotFound from './pages/NotFound';

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication Route */}
          <Route path="/login" element={<Login />} />

          {/* Protected Application Routes inside Master Layout */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="institutions" element={<Institutions />} />
            <Route path="institutions/:id" element={<InstitutionDetails />} />
            <Route path="complaints" element={<Complaints />} />
            <Route path="complaints/:id" element={<ComplaintDetails />} />
            <Route path="case-overlap" element={<CaseOverlap />} />
            <Route path="problem-patterns" element={<ProblemPatterns />} />
            <Route path="evidence-checker" element={<EvidenceChecker />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
