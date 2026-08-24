import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { User, Stethoscope, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function Register() {
  const [role, setRole] = useState('PATIENT'); // 'PATIENT', 'DOCTOR', 'ADMIN'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Doctor Specific Fields
  const [specialisation, setSpecialisation] = useState('General Physician');
  const [slotDuration, setSlotDuration] = useState('30');
  const [workStart, setWorkStart] = useState('09:00');
  const [workEnd, setWorkEnd] = useState('17:00');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await register({
        name,
        email,
        password,
        role,
        specialisation: role === 'DOCTOR' ? specialisation : undefined,
        slotDuration: role === 'DOCTOR' ? slotDuration : undefined,
        workingHours: role === 'DOCTOR' ? { start: workStart, end: workEnd } : undefined,
      });

      if (user.role === 'DOCTOR') {
        navigate('/doctor');
      } else if (user.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/patient');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans selection:bg-indigo-500 selection:text-white">
      {/* Dynamic Background Glow Elements */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-600/30 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-lg w-full bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-800 p-6 sm:p-8 z-10 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white font-black text-2xl rounded-2xl shadow-lg shadow-indigo-600/30 mb-1">
            🏥
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Create HealthPulse Account
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            Select your account persona to initialize your dedicated workspace.
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div className="grid grid-cols-3 gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => setRole('PATIENT')}
            className={`py-2.5 px-3 rounded-lg flex items-center justify-center space-x-1.5 transition ${
              role === 'PATIENT'
                ? 'bg-indigo-600 text-white font-extrabold shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Patient</span>
          </button>

          <button
            type="button"
            onClick={() => setRole('DOCTOR')}
            className={`py-2.5 px-3 rounded-lg flex items-center justify-center space-x-1.5 transition ${
              role === 'DOCTOR'
                ? 'bg-indigo-600 text-white font-extrabold shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            <span>Doctor</span>
          </button>

          <button
            type="button"
            onClick={() => setRole('ADMIN')}
            className={`py-2.5 px-3 rounded-lg flex items-center justify-center space-x-1.5 transition ${
              role === 'ADMIN'
                ? 'bg-indigo-600 text-white font-extrabold shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Admin</span>
          </button>
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

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Universal Fields */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
              Full Name
            </label>
            <input
              type="text"
              required
              placeholder={
                role === 'DOCTOR'
                  ? 'e.g. Dr. Sarah Jenkins'
                  : role === 'ADMIN'
                  ? 'e.g. System Administrator'
                  : 'e.g. John Doe'
              }
              className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 transition"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              placeholder="name@example.com"
              className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 transition"
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
                minLength={6}
                placeholder="Minimum 6 characters"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 transition pr-12"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-200 text-xs font-bold"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {/* DOCTOR SPECIFIC FIELDS */}
          {role === 'DOCTOR' && (
            <div className="p-4 bg-indigo-950/60 border border-indigo-500/30 rounded-xl space-y-3">
              <span className="font-bold text-xs text-indigo-300 flex items-center space-x-1.5">
                <Stethoscope className="w-4 h-4 text-indigo-400" />
                <span>Doctor Workspace Configuration</span>
              </span>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                  Medical Specialization
                </label>
                <select
                  value={specialisation}
                  onChange={(e) => setSpecialisation(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs font-semibold outline-none focus:border-indigo-500"
                >
                  <option value="General Physician">General Physician</option>
                  <option value="General Cardiology">General Cardiology</option>
                  <option value="Neurology">Neurology</option>
                  <option value="Pediatrics">Pediatrics</option>
                  <option value="Dermatology">Dermatology</option>
                  <option value="Orthopedics">Orthopedics</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                    Slot Duration (Mins)
                  </label>
                  <select
                    value={slotDuration}
                    onChange={(e) => setSlotDuration(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs font-semibold outline-none"
                  >
                    <option value="15">15 mins</option>
                    <option value="30">30 mins</option>
                    <option value="45">45 mins</option>
                    <option value="60">60 mins</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                    Working Hours
                  </label>
                  <div className="flex items-center space-x-1">
                    <input
                      type="time"
                      value={workStart}
                      onChange={(e) => setWorkStart(e.target.value)}
                      className="w-full px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white text-[11px]"
                    />
                    <span className="text-slate-500 text-xs">-</span>
                    <input
                      type="time"
                      value={workEnd}
                      onChange={(e) => setWorkEnd(e.target.value)}
                      className="w-full px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white text-[11px]"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ADMIN SPECIFIC NOTICE */}
          {role === 'ADMIN' && (
            <div className="p-3.5 bg-emerald-950/60 border border-emerald-500/30 rounded-xl text-xs text-emerald-200 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Admin accounts possess full system control, doctor leave enforcement, and audit logs.</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl shadow-lg transition text-xs disabled:opacity-50"
          >
            {loading ? 'Registering Account...' : `Complete ${role} Registration`}
          </button>
        </form>

        <div className="pt-2 text-center text-xs text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-bold underline ml-1">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
