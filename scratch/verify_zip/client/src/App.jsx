import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import PatientDashboard from './pages/patient/PatientDashboard';
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';

function ProtectedRoute({ children, allowedRole }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-300 text-sm font-semibold">Loading HealthCare Portal...</p>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRole && user.role !== allowedRole) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Patient Nested Routes */}
      <Route
        path="/patient/*"
        element={
          <ProtectedRoute allowedRole="PATIENT">
            <PatientDashboard />
          </ProtectedRoute>
        }
      />

      {/* Doctor Nested Routes */}
      <Route
        path="/doctor/*"
        element={
          <ProtectedRoute allowedRole="DOCTOR">
            <DoctorDashboard />
          </ProtectedRoute>
        }
      />

      {/* Admin Nested Routes */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute allowedRole="ADMIN">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* Wildcard Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
