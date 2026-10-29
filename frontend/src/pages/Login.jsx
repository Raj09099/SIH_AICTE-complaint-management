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
    <div className="min-h-screen bg-white text-[#374151] flex flex-col font-sans selection:bg-[#0F766E] selection:text-white">
      {/* Top Government-Style Institutional Banner */}
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
          
          {/* Left Panel: Charcoal Grey Background */}
          <div className="lg:col-span-5 bg-[#36454F] text-white p-6 sm:p-10 flex flex-col justify-between space-y-8 border-b lg:border-b-0 lg:border-r border-[#28343C]">
            <div className="space-y-6">
              {/* Authorized Access Label */}
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#28343C] border border-slate-600/50 text-xs font-medium text-teal-200">
                <KeyRound className="w-3.5 h-3.5 text-[#14B8A6]" />
                <span>Authorized Officer Access</span>
              </div>

              {/* Application Title & Subtitle */}
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-snug">
                  AICTE Complaint Intelligence
                </h1>
                <p className="text-sm text-slate-300 mt-1.5 leading-relaxed">
                  Institution Monitoring & Resolution
                </p>
              </div>

              {/* Three Feature Highlights */}
              <div className="space-y-4 pt-2">
                <div className="flex items-start space-x-3 text-xs text-slate-200">
                  <div className="p-1.5 rounded-lg bg-[#28343C] text-teal-300 shrink-0 border border-slate-600/50 mt-0.5">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-white block">Secure Officer Authentication</span>
                    <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                      Role-aware session control and verified access for AICTE regional bureaus.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 text-xs text-slate-200">
                  <div className="p-1.5 rounded-lg bg-[#28343C] text-teal-300 shrink-0 border border-slate-600/50 mt-0.5">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-white block">Cross-Bureau Case Tracking</span>
                    <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                      Real-time grievance monitoring across 100 approved technical institutions.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 text-xs text-slate-200">
                  <div className="p-1.5 rounded-lg bg-[#28343C] text-teal-300 shrink-0 border border-slate-600/50 mt-0.5">
                    <GitCompare className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-white block">Complaint Intelligence Engine</span>
                    <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                      Automated TF-IDF overlap detection and multi-bureau duplicate identification.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Officer Provisioning CLI Guide */}
            <div className="p-3.5 rounded-xl bg-[#28343C] border border-slate-600/50 text-[11px] text-slate-300 space-y-1.5">
              <div className="flex items-center space-x-1.5 text-teal-300 font-semibold">
                <Terminal className="w-3.5 h-3.5 text-[#14B8A6]" />
                <span>Account Provisioning</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Authorized accounts are created via the provisioning utility:
              </p>
              <code className="block p-1.5 rounded bg-[#1F2930] border border-slate-700/60 text-[10px] font-mono text-teal-200 select-all overflow-x-auto">
                python scripts/create_officer.py --email officer@aicte-india.org --password &lt;secret&gt;
              </code>
            </div>
          </div>

          {/* Right Panel: Pure White Background Form */}
          <div className="lg:col-span-7 bg-white p-6 sm:p-10 lg:p-12 flex flex-col justify-center">
            <div className="mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-[#36454F] tracking-tight">
                Officer Sign In
              </h2>
              <p className="text-xs sm:text-sm text-[#6B7280] mt-1">
                Authorized officers can sign in using their official AICTE email credentials.
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
                  htmlFor="officer-email"
                  className="block text-xs font-semibold text-[#374151] mb-1.5"
                >
                  Official Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6B7280]">
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
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E5E7EB] rounded-lg text-sm text-[#374151] placeholder-[#6B7280] focus:outline-none focus:border-[#0F766E] focus:ring-1 focus:ring-[#0F766E] transition-colors disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="officer-password"
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
                    id="officer-password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    disabled={loading}
                    className="w-full pl-10 pr-11 py-2.5 bg-white border border-[#E5E7EB] rounded-lg text-sm text-[#374151] placeholder-[#6B7280] focus:outline-none focus:border-[#0F766E] focus:ring-1 focus:ring-[#0F766E] transition-colors disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={0}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#6B7280] hover:text-[#374151] focus:outline-none"
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
                  className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-lg bg-[#0F766E] hover:bg-[#115E59] active:bg-[#134E4A] text-white font-medium text-sm transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0F766E] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
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

            {/* Subtle Footer */}
            <div className="mt-8 pt-4 border-t border-[#E5E7EB] text-center space-y-1">
              <p className="text-xs font-medium text-[#36454F]">
                Authorized access only
              </p>
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
