import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Shield,
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  RefreshCw,
  Building2,
  FileText,
  GitCompare,
  KeyRound,
  CheckCircle2,
  UserCheck,
  Send,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/auth';

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  // Role Switcher: 'officer' (AICTE Central Official) vs 'institute' (Technical Institute Representative)
  const [selectedRole, setSelectedRole] = useState('officer');
  const [email, setEmail] = useState('officer@aicte-india.org');
  const [password, setPassword] = useState('Officer@123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [demoLoadingRole, setDemoLoadingRole] = useState(null);

  // Preserve intended destination from router state
  const destination = location.state?.from?.pathname || '/dashboard';

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setErrorMessage(null);
    if (role === 'officer') {
      setEmail('officer@aicte-india.org');
      setPassword('Officer@123');
    } else {
      setEmail('institute@apex.edu.in');
      setPassword('Institute@123');
    }
  };

  const handleDemoLogin = async (role) => {
    setSelectedRole(role);
    setErrorMessage(null);
    setDemoLoadingRole(role);
    setLoading(true);

    const demoEmail = role === 'officer' ? 'officer@aicte-india.org' : 'institute@apex.edu.in';
    const demoPassword = role === 'officer' ? 'Officer@123' : 'Institute@123';

    setEmail(demoEmail);
    setPassword(demoPassword);

    try {
      const response = await authService.login(demoEmail, demoPassword);
      login(response.user, response.access_token);
      navigate(destination, { replace: true });
    } catch (err) {
      console.error('Demo sign-in failed:', err);
      const serverDetail = err.response?.data?.detail;
      let displayMsg = serverDetail;
      if (!displayMsg) {
        if (err.response?.status === 401) {
          displayMsg = 'Invalid demo credentials. Please verify your database seeding.';
        } else if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
          displayMsg = 'Backend is currently waking up from sleep mode (Render free tier). Please retry in 10-15 seconds.';
        } else {
          displayMsg = 'Unable to connect to backend service. If using Render free tier, the instance is spinning up — please click Demo Login again in a moment.';
        }
      }
      setErrorMessage(displayMsg);
    } finally {
      setLoading(false);
      setDemoLoadingRole(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim()) {
      setErrorMessage(
        selectedRole === 'officer'
          ? 'Please enter your official AICTE email address.'
          : 'Please enter your institutional email address.'
      );
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setLoading(true);

    try {
      const response = await authService.login(email, password);
      login(response.user, response.access_token);
      navigate(destination, { replace: true });
    } catch (err) {
      console.error('Sign-in failed:', err);
      const serverDetail = err.response?.data?.detail;
      let displayMsg = serverDetail;
      if (!displayMsg) {
        if (err.response?.status === 401) {
          displayMsg = 'Invalid credentials. Please verify your email and password.';
        } else if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
          displayMsg = 'Backend is currently waking up from sleep mode (Render free tier). Please retry in 10-15 seconds.';
        } else {
          displayMsg = 'Unable to connect to the authentication service. If using Render free tier, the instance is spinning up — please try again in a moment.';
        }
      }
      setErrorMessage(displayMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#374151] flex flex-col font-sans selection:bg-[#0F766E] selection:text-white">
      {/* Top Institutional Banner */}
      <header className="border-b border-[#28343C] bg-[#36454F] px-4 sm:px-8 py-3 flex items-center justify-between text-white">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-[#0F766E] flex items-center justify-center text-white shadow-sm shrink-0">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold tracking-widest text-teal-300 uppercase">
                Government of India
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-[10px] font-mono text-slate-300 font-medium">
                SIH26264
              </span>
            </div>
            <p className="text-xs font-semibold text-white leading-tight">
              All India Council for Technical Education
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center space-x-2 text-xs text-slate-300 font-mono">
          <span className="w-2 h-2 rounded-full bg-[#14B8A6]" />
          <span>National Redressal Grid</span>
        </div>
      </header>

      {/* Main Split Authentication Layout */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-12">
        <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 rounded-2xl border border-[#E5E7EB] shadow-lg overflow-hidden bg-white">
          {/* Left Panel: Charcoal Grey Background with Dynamic Context */}
          <div className="lg:col-span-5 bg-[#36454F] text-white p-6 sm:p-10 flex flex-col justify-between space-y-8 border-b lg:border-b-0 lg:border-r border-[#28343C]">
            <div className="space-y-6">
              {/* Authorized Access Label */}
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#28343C] border border-slate-600/50 text-xs font-medium text-teal-200">
                <KeyRound className="w-3.5 h-3.5 text-[#14B8A6]" />
                <span>
                  {selectedRole === 'officer'
                    ? 'AICTE Central Bureau Portal'
                    : 'Institutional Grievance Dispatch'}
                </span>
              </div>

              {/* Application Title & Subtitle */}
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-snug">
                  AICTE Complaint Intelligence
                </h1>
                <p className="text-sm text-slate-300 mt-1.5 leading-relaxed">
                  {selectedRole === 'officer'
                    ? 'Central Bureau Case Management & Redressal'
                    : 'Direct Institutional Grievance Lodging & Status Tracking'}
                </p>
              </div>

              {/* Dynamic Role Highlights */}
              <div className="space-y-4 pt-2">
                {selectedRole === 'officer' ? (
                  <>
                    <div className="flex items-start space-x-3 text-xs text-slate-200">
                      <div className="p-1.5 rounded-lg bg-[#28343C] text-teal-300 shrink-0 border border-slate-600/50 mt-0.5">
                        <Shield className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-semibold text-white block">Council Case Management</span>
                        <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                          Monitor and manage complaints submitted by institutions and citizens across all AICTE bureaus.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 text-xs text-slate-200">
                      <div className="p-1.5 rounded-lg bg-[#28343C] text-teal-300 shrink-0 border border-slate-600/50 mt-0.5">
                        <GitCompare className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-semibold text-white block">Smart Case Overlap & Deduplication</span>
                        <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                          Automated TF-IDF similarity to identify duplicate filings and cross-bureau transfers.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 text-xs text-slate-200">
                      <div className="p-1.5 rounded-lg bg-[#28343C] text-teal-300 shrink-0 border border-slate-600/50 mt-0.5">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-semibold text-white block">100 Technical Institutions</span>
                        <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                          Full directory oversight, systemic pattern clustering, and regulatory status enforcement.
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-start space-x-3 text-xs text-slate-200">
                      <div className="p-1.5 rounded-lg bg-[#28343C] text-teal-300 shrink-0 border border-slate-600/50 mt-0.5">
                        <Send className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-semibold text-white block">Send Grievances Directly to AICTE</span>
                        <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                          Submit institutional disputes, fee policy clarifications, faculty grievances, or malpractice reports.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 text-xs text-slate-200">
                      <div className="p-1.5 rounded-lg bg-[#28343C] text-teal-300 shrink-0 border border-slate-600/50 mt-0.5">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-semibold text-white block">Live Status Tracking</span>
                        <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                          Track real-time resolution progress (Under Review, Evidence Requested, Resolved) by assigned AICTE officers.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 text-xs text-slate-200">
                      <div className="p-1.5 rounded-lg bg-[#28343C] text-teal-300 shrink-0 border border-slate-600/50 mt-0.5">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-semibold text-white block">Institutional Profile Binding</span>
                        <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                          Locked to your technical campus credentials (e.g. Apex Institute of Technology).
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Quick Demo Switcher Card */}
            <div className="p-3.5 rounded-xl bg-[#28343C] border border-slate-600/50 text-[11px] text-slate-300 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5 text-teal-300 font-semibold">
                  <Zap className="w-3.5 h-3.5 text-[#14B8A6] fill-[#14B8A6]" />
                  <span>1-Click Demo Login</span>
                </div>
                <span className="text-[9px] text-teal-200 bg-teal-900/50 px-1.5 py-0.5 rounded font-mono">
                  Live DB
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Instantly enter either role dashboard with pre-authenticated credentials:
              </p>
              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleDemoLogin('officer')}
                  className={`p-2 rounded-lg text-xs font-medium text-left border transition cursor-pointer disabled:opacity-50 ${
                    selectedRole === 'officer'
                      ? 'bg-[#0F766E] text-white border-teal-400 font-semibold shadow-xs'
                      : 'bg-[#1F2930] text-slate-300 border-slate-700 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <div className="font-bold flex items-center justify-between">
                    <span className="flex items-center space-x-1.5">
                      <Shield className="w-3.5 h-3.5" />
                      <span>AICTE Officer</span>
                    </span>
                    <ArrowRight className="w-3 h-3 opacity-70" />
                  </div>
                  <span className="text-[10px] opacity-85 truncate block mt-0.5">
                    {demoLoadingRole === 'officer' ? 'Logging in...' : '1-Click Login →'}
                  </span>
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleDemoLogin('institute')}
                  className={`p-2 rounded-lg text-xs font-medium text-left border transition cursor-pointer disabled:opacity-50 ${
                    selectedRole === 'institute'
                      ? 'bg-[#0F766E] text-white border-teal-400 font-semibold shadow-xs'
                      : 'bg-[#1F2930] text-slate-300 border-slate-700 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <div className="font-bold flex items-center justify-between">
                    <span className="flex items-center space-x-1.5">
                      <Building2 className="w-3.5 h-3.5" />
                      <span>Institute Level</span>
                    </span>
                    <ArrowRight className="w-3 h-3 opacity-70" />
                  </div>
                  <span className="text-[10px] opacity-85 truncate block mt-0.5">
                    {demoLoadingRole === 'institute' ? 'Logging in...' : '1-Click Login →'}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Panel: Pure White Background Form */}
          <div className="lg:col-span-7 bg-white p-6 sm:p-10 lg:p-12 flex flex-col justify-center">
            {/* Role Tab Selector at Top of Form */}
            <div className="mb-6">
              <div className="flex rounded-lg border border-[#E5E7EB] bg-[#F5F7F7] p-1 text-xs font-medium mb-4">
                <button
                  type="button"
                  onClick={() => handleRoleSelect('officer')}
                  className={`flex-1 py-2 rounded-md flex items-center justify-center space-x-1.5 transition ${
                    selectedRole === 'officer'
                      ? 'bg-white text-[#36454F] font-bold shadow-xs border border-[#E5E7EB]'
                      : 'text-[#6B7280] hover:text-[#36454F]'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5 text-[#0F766E]" />
                  <span>AICTE Central Officer</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRoleSelect('institute')}
                  className={`flex-1 py-2 rounded-md flex items-center justify-center space-x-1.5 transition ${
                    selectedRole === 'institute'
                      ? 'bg-white text-[#36454F] font-bold shadow-xs border border-[#E5E7EB]'
                      : 'text-[#6B7280] hover:text-[#36454F]'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5 text-[#0F766E]" />
                  <span>Technical Institute Portal</span>
                </button>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-[#36454F] tracking-tight">
                {selectedRole === 'officer'
                  ? 'Council Officer Sign In'
                  : 'Institute Representative Sign In'}
              </h2>
              <p className="text-xs sm:text-sm text-[#6B7280] mt-1">
                {selectedRole === 'officer'
                  ? 'Access the Central AICTE Grievance Intelligence & Monitoring Grid.'
                  : 'Access the college dashboard to send complaints and track resolution with AICTE.'}
              </p>
            </div>

            {/* Error Message Alert */}
            {errorMessage && (
              <div
                role="alert"
                className="mb-5 p-3.5 rounded-xl bg-[#B91C1C]/10 border border-[#B91C1C]/25 text-[#B91C1C] flex items-start space-x-2.5 text-xs animate-in fade-in"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Email / Username Field */}
              <div>
                <label
                  htmlFor="user-email"
                  className="block text-xs font-semibold text-[#374151] mb-1.5"
                >
                  {selectedRole === 'officer'
                    ? 'Official AICTE Email Address'
                    : 'Institutional Email Address'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6B7280]">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="user-email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={
                      selectedRole === 'officer'
                        ? 'officer@aicte-india.org'
                        : 'institute@apex.edu.in'
                    }
                    disabled={loading}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E5E7EB] rounded-lg text-sm text-[#374151] placeholder-[#6B7280] focus:outline-hidden focus:border-[#0F766E] focus:ring-1 focus:ring-[#0F766E] transition-colors disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="user-password"
                    className="block text-xs font-semibold text-[#374151]"
                  >
                    Password
                  </label>
                  <span className="text-[11px] text-[#6B7280]">Case-sensitive</span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6B7280]">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="user-password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    disabled={loading}
                    className="w-full pl-10 pr-11 py-2.5 bg-white border border-[#E5E7EB] rounded-lg text-sm text-[#374151] placeholder-[#6B7280] focus:outline-hidden focus:border-[#0F766E] focus:ring-1 focus:ring-[#0F766E] transition-colors disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={0}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#6B7280] hover:text-[#374151] focus:outline-hidden"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Action Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-lg bg-[#0F766E] hover:bg-[#115E59] active:bg-[#134E4A] text-white font-medium text-sm transition-colors shadow-xs focus:outline-hidden focus:ring-2 focus:ring-[#0F766E] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>Authenticating Credentials...</span>
                    </>
                  ) : (
                    <>
                      <span>
                        {selectedRole === 'officer'
                          ? 'Sign In to AICTE Central Dashboard'
                          : 'Sign In to Institute Portal'}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* 1-Click Instant Demo Login Buttons for Both Roles */}
            <div className="mt-6 pt-5 border-t border-[#E5E7EB] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-[#36454F] uppercase tracking-wider">
                  <Zap className="w-3.5 h-3.5 text-[#0F766E] fill-[#0F766E]" />
                  <span>Instant 1-Click Demo Login</span>
                </div>
                <span className="text-[10px] font-semibold text-[#0F766E] bg-teal-50 border border-teal-200 px-2 py-0.5 rounded">
                  No Typing Required
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* AICTE Officer Demo Login Button */}
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleDemoLogin('officer')}
                  className="p-3 rounded-xl border border-teal-200 bg-teal-50/60 hover:bg-teal-50 hover:border-teal-400 text-left transition flex items-start space-x-2.5 group cursor-pointer disabled:opacity-50 shadow-2xs"
                >
                  <div className="p-2 rounded-lg bg-[#0F766E] text-white shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                    {demoLoadingRole === 'officer' ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Shield className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#36454F] group-hover:text-[#0F766E]">
                        AICTE Officer
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#0F766E] group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <p className="text-[10px] text-[#6B7280] truncate mt-0.5">
                      officer@aicte-india.org
                    </p>
                    <span className="inline-block mt-1 text-[9px] font-semibold text-[#0F766E] bg-white border border-teal-200 px-1.5 py-0.5 rounded">
                      Approval Bureau • Case Grid
                    </span>
                  </div>
                </button>

                {/* Institute Representative Demo Login Button */}
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleDemoLogin('institute')}
                  className="p-3 rounded-xl border border-slate-200 bg-[#F5F7F7] hover:bg-slate-100 hover:border-slate-300 text-left transition flex items-start space-x-2.5 group cursor-pointer disabled:opacity-50 shadow-2xs"
                >
                  <div className="p-2 rounded-lg bg-[#36454F] text-white shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                    {demoLoadingRole === 'institute' ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Building2 className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#36454F] group-hover:text-[#0F766E]">
                        Institute Portal
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#36454F] group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <p className="text-[10px] text-[#6B7280] truncate mt-0.5">
                      institute@apex.edu.in
                    </p>
                    <span className="inline-block mt-1 text-[9px] font-semibold text-[#36454F] bg-white border border-slate-300 px-1.5 py-0.5 rounded">
                      Apex Institute • Send Cases
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Subtle Footer */}
            <div className="mt-8 pt-4 border-t border-[#E5E7EB] text-center space-y-1">
              <div className="flex items-center justify-center space-x-1.5 text-xs font-medium text-[#36454F]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#0F766E]" />
                <span>
                  Active Role Mode:{' '}
                  <strong>
                    {selectedRole === 'officer' ? 'AICTE Officer' : 'Institute Portal'}
                  </strong>
                </span>
              </div>
              <p className="text-[11px] text-[#6B7280]">
                Protected under IT Act & AICTE Redressal Regulations. Unauthorized attempts are logged.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Global Footer */}
      <footer className="border-t border-[#E5E7EB] bg-white py-3 px-4 text-center text-xs text-[#6B7280]">
        AICTE Multi-Bureau Complaint Intelligence • Smart India Hackathon 2026
      </footer>
    </div>
  );
}

export default Login;
