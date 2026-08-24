import React, { createContext, useContext, useState, useEffect } from 'react';
import API from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
	const [user, setUser] = useState(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const token = localStorage.getItem('token');
		if (token) {
			API.get('/auth/me')
				.then((res) => {
					setUser(res.data.user);
				})
				.catch(() => {
					localStorage.removeItem('token');
					setUser(null);
				})
				.finally(() => setLoading(false));
		} else {
			setLoading(false);
		}
	}, []);

	const login = async (email, password) => {
		const res = await API.post('/auth/login', { email, password });
		localStorage.setItem('token', res.data.token);
		setUser(res.data.user);
		return res.data.user;
	};

	const register = async ({ name, email, password }) => {
		const res = await API.post('/auth/register', {
			name,
			email,
			password,
		});

		localStorage.setItem('token', res.data.token);
		setUser(res.data.user);

		return res.data.user;
	};

	const logout = () => {
		localStorage.removeItem('token');
		setUser(null);
	};

	return (
		<AuthContext.Provider value={{ user, login, register, logout, loading }}>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuth() {
	return useContext(AuthContext);
}
