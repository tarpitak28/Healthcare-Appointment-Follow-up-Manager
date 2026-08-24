import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      setError(err.response?.data?.message || 'Login failed. Please check your email and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = (demoEmail, demoRole) => {
    setEmail(demoEmail);
    setPassword('Password123!');
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* Dynamic Background Glow Elements */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/30 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-md w-full bg-slate-800/90 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-700/60 p-8 z-10 space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-600 text-white font-black text-2xl rounded-2xl shadow-lg mb-1">
            🏥
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            HealthCare Portal
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            Sign in to access your Patient, Doctor, or Admin account.
          </p>
        </div>

        {/* Quick Demo Login Pills */}
        <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700/80 space-y-2">
          <div className="flex justify-between items-center text-xs font-bold text-slate-400">
            <span>⚡ ONE-CLICK DEMO LOGIN</span>
            <span className="text-indigo-400">Select Role</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleFillDemo('patient@clinic.com', 'PATIENT')}
              className="py-2 px-2 bg-slate-800 hover:bg-indigo-600 hover:text-white border border-slate-700 text-slate-200 text-xs font-bold rounded-lg transition text-center shadow-xs"
            >
              👤 Patient
            </button>

            <button
              type="button"
              onClick={() => handleFillDemo('doctor@clinic.com', 'DOCTOR')}
              className="py-2 px-2 bg-slate-800 hover:bg-indigo-600 hover:text-white border border-slate-700 text-slate-200 text-xs font-bold rounded-lg transition text-center shadow-xs"
            >
              👨‍⚕️ Doctor
            </button>

            <button
              type="button"
              onClick={() => handleFillDemo('admin@clinic.com', 'ADMIN')}
              className="py-2 px-2 bg-slate-800 hover:bg-indigo-600 hover:text-white border border-slate-700 text-slate-200 text-xs font-bold rounded-lg transition text-center shadow-xs"
            >
              🛡️ Admin
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl flex items-center justify-between font-medium">
            <span>⚠️ {error}</span>
            <button onClick={() => setError('')} className="text-red-400 hover:text-red-200 text-xs font-bold">
              ✕
            </button>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              placeholder="name@example.com"
              className="w-full px-4 py-3 bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 transition"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 transition pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-200 text-xs font-bold"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing In...' : 'Sign In to Dashboard'}
          </button>
        </form>

        {/* Register Link */}
        <div className="pt-2 text-center text-xs text-slate-400">
          Need a new patient account?{' '}
          <Link to="/register" className="text-indigo-400 hover:text-indigo-300 font-bold underline ml-1">
            Register Patient Account
          </Link>
        </div>
      </div>
    </div>
  );
}
