import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import CareConnectLogo from '../components/CareConnectLogo';
import { CheckCircle2 } from 'lucide-react';
import Button from '../components/ui/Button';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      if (user.role === 'ADMIN') navigate('/admin');
      else if (user.role === 'DOCTOR') navigate('/doctor');
      else navigate('/patient');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please verify your email and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('password123');
    setError('');
  };

  return (
    <div className="min-h-screen bg-[#F7F9FA] flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className="max-w-5xl w-full bg-white rounded-2xl shadow-card border border-[#E5E7EB] overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[550px]">
        {/* Left Branding Panel (Desktop/Tablet Split ~45%) (Section 24) */}
        <div className="hidden md:flex md:col-span-5 bg-gradient-to-br from-[#237C9A] via-[#1B637B] to-[#12485A] p-8 sm:p-10 text-white flex-col justify-between relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#3FA3C3]/20 rounded-full blur-2xl pointer-events-none"></div>

          {/* Header Logo */}
          <div className="z-10">
            <CareConnectLogo size="large" className="text-white" />
          </div>

          {/* Value Proposition Message */}
          <div className="z-10 my-8 space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight leading-snug">
                Trusted healthcare, made simple.
              </h2>
              <p className="text-xs text-[#EAF7FA] font-medium mt-2 leading-relaxed">
                Find qualified doctors and manage your appointments from one place.
              </p>
            </div>

            {/* Floating Feature Cards */}
            <div className="space-y-3 pt-2">
              <div className="p-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/15 flex items-center space-x-3 text-xs font-semibold text-white">
                <CheckCircle2 className="w-4 h-4 text-[#EAF7FA]" />
                <span>✓ Qualified Verified Doctors</span>
              </div>

              <div className="p-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/15 flex items-center space-x-3 text-xs font-semibold text-white">
                <CheckCircle2 className="w-4 h-4 text-[#EAF7FA]" />
                <span>✓ Easy Appointment Booking</span>
              </div>
            </div>
          </div>

          {/* Footer Subtitle */}
          <div className="z-10 text-[11px] text-[#EAF7FA]/80 font-medium border-t border-white/15 pt-4">
            CareConnect Healthcare Platform • v2.0
          </div>
        </div>

        {/* Right Form Panel (~55% Desktop, 100% Mobile) (Section 24) */}
        <div className="md:col-span-7 p-6 sm:p-10 lg:p-12 flex flex-col justify-between bg-white">
          <div className="space-y-6 max-w-sm mx-auto w-full">
            {/* Mobile Header Logo (<768px) */}
            <div className="md:hidden text-center pb-2">
              <CareConnectLogo size="large" className="justify-center" />
            </div>

            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#202124] tracking-tight">
                Welcome back
              </h1>
              <p className="text-xs text-[#6F7378] font-medium mt-1">
                Sign in to continue to CareConnect
              </p>
            </div>

            {/* Quick Demo Role Fillers */}
            <div className="bg-[#F7F9FA] p-3 sm:p-3.5 rounded-2xl border border-[#E5E7EB] space-y-2">
              <div className="flex justify-between items-center text-xs font-bold text-[#6F7378]">
                <span>⚡ ONE-CLICK DEMO LOGIN</span>
                <span className="text-[#3FA3C3]">Select Account</span>
              </div>

              <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => handleFillDemo('patient@example.com')}
                  className="py-2 px-1.5 sm:px-2 bg-white hover:bg-[#EAF7FA] hover:text-[#237C9A] border border-[#E5E7EB] hover:border-[#3FA3C3]/40 text-[#202124] text-[11px] sm:text-xs font-semibold rounded-xl transition text-center shadow-xs min-h-[44px] sm:min-h-0"
                >
                  👤 Patient
                </button>

                <button
                  type="button"
                  onClick={() => handleFillDemo('doctor@example.com')}
                  className="py-2 px-1.5 sm:px-2 bg-white hover:bg-[#EAF7FA] hover:text-[#237C9A] border border-[#E5E7EB] hover:border-[#3FA3C3]/40 text-[#202124] text-[11px] sm:text-xs font-semibold rounded-xl transition text-center shadow-xs min-h-[44px] sm:min-h-0"
                >
                  👨‍⚕️ Doctor
                </button>

                <button
                  type="button"
                  onClick={() => handleFillDemo('admin@healthpulse.app')}
                  className="py-2 px-1.5 sm:px-2 bg-white hover:bg-[#EAF7FA] hover:text-[#237C9A] border border-[#E5E7EB] hover:border-[#3FA3C3]/40 text-[#202124] text-[11px] sm:text-xs font-semibold rounded-xl transition text-center shadow-xs min-h-[44px] sm:min-h-0"
                >
                  🛡️ Admin
                </button>
              </div>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="p-3.5 bg-[#FDF2F2] border border-[#E46B6B]/30 text-[#E46B6B] text-xs rounded-xl flex items-center justify-between font-medium">
                <span>⚠️ {error}</span>
                <button onClick={() => setError('')} className="text-[#E46B6B] font-bold ml-2">
                  ✕
                </button>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#6F7378] mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  className="w-full px-4 py-3 bg-[#F7F9FA] border border-[#E5E7EB] rounded-xl text-[#202124] placeholder-[#6F7378]/60 text-sm outline-none focus:border-[#3FA3C3] focus:bg-white min-h-[44px]"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#6F7378] mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    className="w-full px-4 py-3 bg-[#F7F9FA] border border-[#E5E7EB] rounded-xl text-[#202124] placeholder-[#6F7378]/60 text-sm outline-none focus:border-[#3FA3C3] focus:bg-white pr-14 min-h-[44px]"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-[#6F7378] hover:text-[#202124] text-xs font-bold min-h-[44px] flex items-center px-1"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-[#6F7378]">
                <label className="flex items-center space-x-2 cursor-pointer py-1">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="accent-[#3FA3C3] rounded w-4 h-4"
                  />
                  <span>Remember me</span>
                </label>

                <a href="#forgot" onClick={(e) => { e.preventDefault(); alert('Password reset link sent to your registered email.'); }} className="text-[#3FA3C3] hover:underline font-semibold py-1">
                  Forgot password?
                </a>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={loading}
                className="w-full min-h-[44px]"
              >
                {loading ? 'Signing In...' : 'Log In'}
              </Button>
            </form>
          </div>

          {/* Register Link */}
          <div className="pt-6 text-center text-xs text-[#6F7378] font-medium">
            Don't have an account yet?{' '}
            <Link to="/register" className="text-[#3FA3C3] hover:text-[#237C9A] font-bold underline ml-1">
              Create Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
