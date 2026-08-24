/** @type {import('tailwindcss').Config} */
module.exports = {
	content: [
		'./index.html',
		'./src/**/*.{js,ts,jsx,tsx}',
	],
	theme: {
		extend: {
			colors: {
				care: {
					primary: '#3FA3C3',
					dark: '#237C9A',
					light: '#EAF7FA',
					bg: '#F7F9FA',
					surface: '#FFFFFF',
					textPrimary: '#202124',
					textSecondary: '#6F7378',
					border: '#E5E7EB',
					success: '#3FAF7A',
					warning: '#F2B84B',
					error: '#E46B6B',
				},
			},
			fontFamily: {
				sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
			},
			borderRadius: {
				'card': '16px',
				'button': '10px',
			},
			boxShadow: {
				'subtle': '0 2px 10px rgba(0, 0, 0, 0.04)',
				'card': '0 4px 20px -2px rgba(32, 33, 36, 0.05)',
			},
		},
	},
	plugins: [],
};
