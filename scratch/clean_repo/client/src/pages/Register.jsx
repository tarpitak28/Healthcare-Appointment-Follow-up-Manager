import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import CareConnectLogo from '../components/CareConnectLogo';
import { User, Stethoscope, ShieldCheck } from 'lucide-react';
import Button from '../components/ui/Button';

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

      if (user.role === 'DOCTOR') navigate('/doctor');
      else if (user.role === 'ADMIN') navigate('/admin');
      else navigate('/patient');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please check your information.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F9FA] flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-card border border-[#E5E7EB] p-5 sm:p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <CareConnectLogo size="large" className="justify-center mb-1" />
          <h1 className="text-xl sm:text-2xl font-bold text-[#202124] tracking-tight">
            Create your CareConnect account
          </h1>
          <p className="text-xs text-[#6F7378] font-medium">
            Select your account role to initialize your dedicated workspace.
          </p>
        </div>

        {/* Role Selector Tabs (Section 25) */}
        <div className="grid grid-cols-3 gap-1.5 bg-[#F7F9FA] p-1.5 rounded-2xl border border-[#E5E7EB] text-xs font-bold">
          <button
            type="button"
            onClick={() => setRole('PATIENT')}
            className={`py-2.5 px-2 rounded-xl flex items-center justify-center space-x-1 transition min-h-[44px] ${
              role === 'PATIENT'
                ? 'bg-[#3FA3C3] text-white shadow-xs'
                : 'text-[#6F7378] hover:text-[#202124]'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Patient</span>
          </button>

          <button
            type="button"
            onClick={() => setRole('DOCTOR')}
            className={`py-2.5 px-2 rounded-xl flex items-center justify-center space-x-1 transition min-h-[44px] ${
              role === 'DOCTOR'
                ? 'bg-[#3FA3C3] text-white shadow-xs'
                : 'text-[#6F7378] hover:text-[#202124]'
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            <span>Doctor</span>
          </button>

          <button
            type="button"
            onClick={() => setRole('ADMIN')}
            className={`py-2.5 px-2 rounded-xl flex items-center justify-center space-x-1 transition min-h-[44px] ${
              role === 'ADMIN'
                ? 'bg-[#3FA3C3] text-white shadow-xs'
                : 'text-[#6F7378] hover:text-[#202124]'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Admin</span>
          </button>
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#6F7378] mb-1">
              Full Name
            </label>
            <input
              type="text"
              required
              placeholder={role === 'DOCTOR' ? 'e.g. Dr. Sarah Jenkins' : 'e.g. John Doe'}
              className="w-full px-4 py-3 bg-[#F7F9FA] border border-[#E5E7EB] rounded-xl text-[#202124] placeholder-[#6F7378]/60 text-sm outline-none focus:border-[#3FA3C3] focus:bg-white min-h-[44px]"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#6F7378] mb-1">
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
            <label className="block text-xs font-bold uppercase tracking-wider text-[#6F7378] mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                placeholder="Minimum 6 characters"
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

          {/* DOCTOR SPECIFIC FIELDS */}
          {role === 'DOCTOR' && (
            <div className="p-4 bg-[#EAF7FA] border border-[#3FA3C3]/30 rounded-2xl space-y-3">
              <span className="font-bold text-xs text-[#237C9A] flex items-center space-x-1.5">
                <Stethoscope className="w-4 h-4 text-[#3FA3C3]" />
                <span>Doctor Profile Settings</span>
              </span>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#6F7378] mb-1">
                  Medical Specialization
                </label>
                <select
                  value={specialisation}
                  onChange={(e) => setSpecialisation(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-[#202124] text-xs font-semibold outline-none focus:border-[#3FA3C3] min-h-[44px]"
                >
                  <option value="General Physician">General Physician</option>
                  <option value="General Cardiology">General Cardiology</option>
                  <option value="Neurology">Neurology</option>
                  <option value="Pediatrics">Pediatrics</option>
                  <option value="Dermatology">Dermatology</option>
                  <option value="Orthopedics">Orthopedics</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#6F7378] mb-1">
                    Slot Duration
                  </label>
                  <select
                    value={slotDuration}
                    onChange={(e) => setSlotDuration(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-[#202124] text-xs font-semibold outline-none min-h-[44px]"
                  >
                    <option value="15">15 mins</option>
                    <option value="30">30 mins</option>
                    <option value="45">45 mins</option>
                    <option value="60">60 mins</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#6F7378] mb-1">
                    Working Hours
                  </label>
                  <div className="flex items-center space-x-1">
                    <input
                      type="time"
                      value={workStart}
                      onChange={(e) => setWorkStart(e.target.value)}
                      className="w-full px-2 py-2 bg-white border border-[#E5E7EB] rounded-lg text-[#202124] text-[11px] min-h-[44px]"
                    />
                    <span className="text-[#6F7378] text-xs">-</span>
                    <input
                      type="time"
                      value={workEnd}
                      onChange={(e) => setWorkEnd(e.target.value)}
                      className="w-full px-2 py-2 bg-white border border-[#E5E7EB] rounded-lg text-[#202124] text-[11px] min-h-[44px]"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={loading}
            className="w-full min-h-[44px]"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </Button>
        </form>

        <div className="pt-2 text-center text-xs text-[#6F7378] font-medium">
          Already have an account?{' '}
          <Link to="/login" className="text-[#3FA3C3] hover:text-[#237C9A] font-bold underline ml-1">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
