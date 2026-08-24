import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import PatientDashboard from './pages/patient/PatientDashboard';
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';

function ProtectedRoute({ children, allowedRole }) {
	const { user, loading } = useAuth();
	if (loading) return <div className="text-center p-12">Loading...</div>;
	if (!user) return <Navigate to="/login" />;
	if (allowedRole && user.role !== allowedRole) return <Navigate to="/login" />;
	return children;
}

export default function App() {
	return (
		<AuthProvider>
			<BrowserRouter>
				<Routes>
					<Route path="/login" element={<Login />} />
					<Route path="/register" element={<Register />} />
					<Route
						path="/patient"
						element={
							<ProtectedRoute allowedRole="PATIENT">
								<PatientDashboard />
							</ProtectedRoute>
						}
					/>
					<Route
						path="/doctor"
						element={
							<ProtectedRoute allowedRole="DOCTOR">
								<DoctorDashboard />
							</ProtectedRoute>
						}
					/>
					<Route
						path="/admin"
						element={
							<ProtectedRoute allowedRole="ADMIN">
								<AdminDashboard />
							</ProtectedRoute>
						}
					/>
					<Route path="*" element={<Navigate to="/login" />} />
				</Routes>
			</BrowserRouter>
		</AuthProvider>
	);
}
