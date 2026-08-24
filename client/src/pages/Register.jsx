import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export default function Register() {
	const [name, setName] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const { register } = useAuth();
	const navigate = useNavigate();

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError('');

		try {
			const user = await register({
				name,
				email,
				password,
			});

			// Public registration always creates a PATIENT.
			navigate('/patient');
		} catch (err) {
			setError(err.response?.data?.message || 'Registration failed');
		}
	};

	return (
		<div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
			<div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
				<h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">
					Create Patient Account
				</h2>

				{error && (
					<div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
						{error}
					</div>
				)}

				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<label className="block text-sm font-medium text-slate-700 mb-1">
							Full Name
						</label>

						<input
							type="text"
							required
							className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
							value={name}
							onChange={(e) => setName(e.target.value)}
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-slate-700 mb-1">
							Email Address
						</label>

						<input
							type="email"
							required
							className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-slate-700 mb-1">
							Password
						</label>

						<input
							type="password"
							required
							minLength={6}
							className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
						/>
					</div>

					<div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-600">
						You are registering as a <strong>Patient</strong>.
						Doctor and Admin accounts are created through authorized
						administrative processes.
					</div>

					<button
						type="submit"
						className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition"
					>
						Register
					</button>
				</form>

				<p className="mt-4 text-center text-sm text-slate-600">
					Already have an account?{' '}
					<Link
						to="/login"
						className="text-indigo-600 font-medium"
					>
						Sign In
					</Link>
				</p>
			</div>
		</div>
	);
}
