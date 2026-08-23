import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const { login } = useAuth();
	const navigate = useNavigate();

	const handleSubmit = async (e) => {
		e.preventDefault();
		try {
			const user = await login(email, password);
			if (user.role === 'ADMIN') navigate('/admin');
			else if (user.role === 'DOCTOR') navigate('/doctor');
			else navigate('/patient');
		} catch (err) {
			setError(err.response?.data?.message || 'Login failed');
		}
	};

	return (
		<div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
			<div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
				<h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">Healthcare Login</h2>
				{error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}
				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
						<input
							type="email"
							required
							className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
						<input
							type="password"
							required
							className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
						/>
					</div>
					<button
						type="submit"
						className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition"
					>
						Sign In
					</button>
				</form>
				<p className="mt-4 text-center text-sm text-slate-600">
					Don&apos;t have an account? <Link to="/register" className="text-indigo-600 font-medium">Register</Link>
				</p>
			</div>
		</div>
	);
}
