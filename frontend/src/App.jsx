import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
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
import RecurrenceRadar from './pages/RecurrenceRadar';
import PriorityRadar from './pages/PriorityRadar';
import InstitutionRisk from './pages/InstitutionRisk';
import NotFound from './pages/NotFound';

function OfficerOnlyRoute({ children }) {
  const { user } = useAuth();
  if (user?.role === 'institute') {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

export function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
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
              <Route
                path="institutions"
                element={
                  <OfficerOnlyRoute>
                    <Institutions />
                  </OfficerOnlyRoute>
                }
              />
              <Route
                path="institutions/:id"
                element={
                  <OfficerOnlyRoute>
                    <InstitutionDetails />
                  </OfficerOnlyRoute>
                }
              />
              <Route path="complaints" element={<Complaints />} />
              <Route path="complaints/:id" element={<ComplaintDetails />} />
              <Route
                path="case-overlap"
                element={
                  <OfficerOnlyRoute>
                    <CaseOverlap />
                  </OfficerOnlyRoute>
                }
              />
              <Route
                path="problem-patterns"
                element={
                  <OfficerOnlyRoute>
                    <ProblemPatterns />
                  </OfficerOnlyRoute>
                }
              />
              <Route
                path="evidence-checker"
                element={
                  <OfficerOnlyRoute>
                    <EvidenceChecker />
                  </OfficerOnlyRoute>
                }
              />
              <Route
                path="recurrence-radar"
                element={
                  <OfficerOnlyRoute>
                    <RecurrenceRadar />
                  </OfficerOnlyRoute>
                }
              />
              <Route
                path="priority-radar"
                element={
                  <OfficerOnlyRoute>
                    <PriorityRadar />
                  </OfficerOnlyRoute>
                }
              />
              <Route
                path="institution-risk"
                element={
                  <OfficerOnlyRoute>
                    <InstitutionRisk />
                  </OfficerOnlyRoute>
                }
              />
              <Route
                path="analytics"
                element={
                  <OfficerOnlyRoute>
                    <Analytics />
                  </OfficerOnlyRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </LanguageProvider>
    </AuthProvider>
  );
}

export default App;
