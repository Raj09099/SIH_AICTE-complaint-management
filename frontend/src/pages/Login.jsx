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
  CheckCircle2,
  Building2,
  FileText,
  GitCompare,
  KeyRound,
  Terminal,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/auth';

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Preserve intended destination from router state
  const destination = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    // Client-side required validation
    if (!email.trim()) {
      setErrorMessage('Please enter your official AICTE email address.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setLoading(true);

    try {
      const response = await authService.login(email, password);
      // Update global AuthContext with authenticated user entity and signed JWT token
      login(response.user, response.access_token);
      navigate(destination, { replace: true });
    } catch (err) {
      console.error('Sign-in failed:', err);
      const serverDetail = err.response?.data?.detail;
      const displayMsg =
        serverDetail ||
        (err.response?.status === 401
          ? 'Invalid credentials. Please verify your official email and password.'
          : 'Unable to connect to the authentication service. Please verify the backend is active.');
      setErrorMessage(displayMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060c18] text-slate-100 flex flex-col justify-between selection:bg-cyan-500 selection:text-slate-950 font-sans">
      {/* Top Government-Style Institutional Banner */}
      <header className="border-b border-slate-800/80 bg-[#071120] px-4 sm:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-teal-500 p-0.5 flex items-center justify-center shadow-md shadow-cyan-500/20">
            <div className="w-full h-full bg-[#071120] rounded-[6px] flex items-center justify-center">
              <Shield className="w-4 h-4 text-cyan-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold tracking-widest text-teal-400 uppercase">
                Government of India
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-[10px] font-mono text-cyan-400 font-semibold">
                SIH26264
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-200">
              Council Grievance Redressal Network
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center space-x-2 text-xs text-slate-400 font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Redressal Grid TLS 1.3</span>
        </div>
      </header>

      {/* Main Split Portal Area */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 rounded-2xl border border-slate-800/80 bg-[#081325]/90 shadow-2xl backdrop-blur-xl overflow-hidden">
          
          {/* Left Institutional Overview Column */}
          <div className="lg:col-span-5 p-6 sm:p-8 bg-gradient-to-br from-[#0a1830] via-[#071224] to-[#050b18] border-b lg:border-b-0 lg:border-r border-slate-800/80 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[11px] font-medium text-cyan-300">
                <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                <span>Authorized Officer Access</span>
              </div>

              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-snug">
                  AICTE Complaint Intelligence Dashboard
                </h1>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Integrated Complaint Monitoring and Tracking System Across AICTE Bureaus & Regional Cells.
                </p>
              </div>

              <div className="pt-2 space-y-3">
                <div className="flex items-start space-x-3 text-xs text-slate-300">
                  <div className="p-1 rounded bg-teal-500/10 text-teal-400 mt-0.5 border border-teal-500/20">
                    <Building2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-semibold text-white">100 Technical Institutions</span>
                    <p className="text-[11px] text-slate-400">Institutional monitoring dossiers and cross-bureau tracking.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 text-xs text-slate-300">
                  <div className="p-1 rounded bg-cyan-500/10 text-cyan-400 mt-0.5 border border-cyan-500/20">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-semibold text-white">500+ Grievance Records</span>
                    <p className="text-[11px] text-slate-400">SLA enforcement, transfer history, and multi-cell workflows.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 text-xs text-slate-300">
                  <div className="p-1 rounded bg-indigo-500/10 text-indigo-400 mt-0.5 border border-indigo-500/20">
                    <GitCompare className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-semibold text-white">TF-IDF Overlap Intelligence</span>
                    <p className="text-[11px] text-slate-400">Duplicate allegation detection and cross-bureau case linkage.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Officer Account Note Card */}
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400 space-y-1.5">
              <div className="flex items-center space-x-1.5 text-cyan-300 font-semibold">
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                <span>Account Provisioning</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Authorized officer accounts are provisioned via the backend script:
              </p>
              <code className="block p-1.5 rounded bg-slate-950 border border-slate-800/80 text-[10px] font-mono text-cyan-300 select-all overflow-x-auto">
                python scripts/create_officer.py --email officer@aicte-india.org --password &lt;secret&gt;
              </code>
            </div>
          </div>

          {/* Right Sign-in Form Column */}
          <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-center">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-white tracking-tight">
                Officer Sign In
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Enter your official AICTE email address and password to access the portal.
              </p>
            </div>

            {/* Error Message Alert */}
            {errorMessage && (
              <div
                role="alert"
                className="mb-5 p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 flex items-start space-x-2.5 text-xs animate-in fade-in"
              >
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Email / Username Field */}
              <div>
                <label
                  htmlFor="officer-email"
                  className="block text-xs font-semibold text-slate-300 mb-1.5"
                >
                  Official Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="officer-email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="officer@aicte-india.org"
                    disabled={loading}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#050c18] border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="officer-password"
                    className="block text-xs font-semibold text-slate-300"
                  >
                    Password
                  </label>
                  <span className="text-[11px] text-slate-400">Case-sensitive</span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="officer-password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    disabled={loading}
                    className="w-full pl-10 pr-11 py-2.5 bg-[#050c18] border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={0}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 focus:outline-none"
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
                  className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-slate-950 font-semibold text-sm transition-all shadow-lg shadow-cyan-600/20 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-[#081325] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Authenticating Credentials...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In to Dashboard</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Compliance Disclaimer */}
            <div className="mt-6 pt-4 border-t border-slate-800 text-[11px] text-slate-400 text-center leading-relaxed">
              Protected under IT Act & AICTE Redressal Regulations. Unauthorized access attempts are monitored and recorded.
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/70 bg-[#071120] py-3 px-4 text-center text-xs text-slate-400">
        AICTE Multi-Bureau Complaint Intelligence • Smart India Hackathon 2026
      </footer>
    </div>
  );
}

export default Login;
