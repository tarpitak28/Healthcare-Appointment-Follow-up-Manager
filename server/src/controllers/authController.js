const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

// Helper to generate JWT token
function generateToken(user) {
	return jwt.sign(
		{ id: user.id, email: user.email, role: user.role },
		process.env.JWT_SECRET || 'fallback_secret',
		{ expiresIn: '7d' }
	);
}

// Register user (Patient / Doctor / Admin)
async function register(req, res) {
	try {
		const { name, email, password, role = 'PATIENT', specialisation, slotDuration, workingHours } = req.body;

		if (!name || !email || !password) {
			return res.status(400).json({ success: false, message: 'Please provide name, email, and password' });
		}

		// Check if user already exists
		const existingUser = await prisma.user.findUnique({ where: { email } });
		if (existingUser) {
			return res.status(400).json({ success: false, message: 'User with this email already exists' });
		}

		const hashedPassword = await bcrypt.hash(password, 10);

		// Create user with transaction if doctor profile is needed
		const result = await prisma.$transaction(async (tx) => {
			const user = await tx.user.create({
				data: {
					name,
					email,
					password: hashedPassword,
					role: role.toUpperCase(),
				},
			});

			// If registered as a doctor, create their profile
			if (role.toUpperCase() === 'DOCTOR') {
				await tx.doctorProfile.create({
					data: {
						userId: user.id,
						specialisation: specialisation || 'General Physician',
						slotDuration: slotDuration ? parseInt(slotDuration) : 30,
						workingHours: workingHours || { start: '09:00', end: '17:00' },
					},
				});
			}

			return user;
		});

		const token = generateToken(result);

		res.status(201).json({
			success: true,
			message: 'User registered successfully',
			token,
			user: {
				id: result.id,
				name: result.name,
				email: result.email,
				role: result.role,
			},
		});
	} catch (error) {
		console.error('Registration error:', error);
		res.status(500).json({ success: false, message: 'Server error during registration' });
	}
}

// Login user
async function login(req, res) {
	try {
		const { email, password } = req.body;

		if (!email || !password) {
			return res.status(400).json({ success: false, message: 'Please provide email and password' });
		}

		const user = await prisma.user.findUnique({
			where: { email },
			include: { doctorProfile: true },
		});

		if (!user) {
			return res.status(401).json({ success: false, message: 'Invalid email or password' });
		}

		const isMatch = await bcrypt.compare(password, user.password);
		if (!isMatch) {
			return res.status(401).json({ success: false, message: 'Invalid email or password' });
		}

		const token = generateToken(user);

		res.status(200).json({
			success: true,
			message: 'Login successful',
			token,
			user: {
				id: user.id,
				name: user.name,
				email: user.email,
				role: user.role,
				doctorProfileId: user.doctorProfile ? user.doctorProfile.id : null,
			},
		});
	} catch (error) {
		console.error('Login error:', error);
		res.status(500).json({ success: false, message: 'Server error during login' });
	}
}

// Get current logged-in user profile
async function getProfile(req, res) {
	try {
		const user = await prisma.user.findUnique({
			where: { id: req.user.id },
			include: { doctorProfile: true },
		});

		if (!user) {
			return res.status(404).json({ success: false, message: 'User not found' });
		}

		res.status(200).json({
			success: true,
			user: {
				id: user.id,
				name: user.name,
				email: user.email,
				role: user.role,
				doctorProfile: user.doctorProfile || null,
			},
		});
	} catch (error) {
		console.error('Profile fetch error:', error);
		res.status(500).json({ success: false, message: 'Server error fetching profile' });
	}
}

async function updateProfile(req, res) {
	try {
		const { name, email } = req.body;
		const userId = req.user.id;

		const updatedUser = await prisma.user.update({
			where: { id: userId },
			data: { name, email },
			include: { doctorProfile: true },
		});

		res.status(200).json({
			success: true,
			message: 'Profile updated successfully',
			user: {
				id: updatedUser.id,
				name: updatedUser.name,
				email: updatedUser.email,
				role: updatedUser.role,
				doctorProfile: updatedUser.doctorProfile || null,
			},
		});
	} catch (error) {
		console.error('Update profile error:', error);
		res.status(500).json({ success: false, message: 'Server error updating profile' });
	}
}

module.exports = {
	register,
	login,
	getProfile,
	updateProfile,
};
