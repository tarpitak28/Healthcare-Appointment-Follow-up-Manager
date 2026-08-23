import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';

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
								<div className="p-8 text-center text-2xl font-bold">Patient Dashboard (Coming Next!)</div>
							</ProtectedRoute>
						}
					/>
					<Route
						path="/doctor"
						element={
							<ProtectedRoute allowedRole="DOCTOR">
								<div className="p-8 text-center text-2xl font-bold">Doctor Dashboard (Coming Next!)</div>
							</ProtectedRoute>
						}
					/>
					<Route
						path="/admin"
						element={
							<ProtectedRoute allowedRole="ADMIN">
								<div className="p-8 text-center text-2xl font-bold">Admin Dashboard (Coming Next!)</div>
							</ProtectedRoute>
						}
					/>
					<Route path="*" element={<Navigate to="/login" />} />
				</Routes>
			</BrowserRouter>
		</AuthProvider>
	);
}
