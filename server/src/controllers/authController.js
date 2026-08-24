const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { google } = require('googleapis');
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
		const { name, email, password, role, specialisation, slotDuration, workingHours } = req.body;

		if (!name || !email || !password) {
			return res.status(400).json({
				success: false,
				message: 'Please provide name, email, and password',
			});
		}

		const targetRole = (role || 'PATIENT').toUpperCase();
		if (!['PATIENT', 'DOCTOR', 'ADMIN'].includes(targetRole)) {
			return res.status(400).json({
				success: false,
				message: 'Invalid role specified. Must be PATIENT, DOCTOR, or ADMIN.',
			});
		}

		const existingUser = await prisma.user.findUnique({
			where: { email },
		});

		if (existingUser) {
			return res.status(400).json({
				success: false,
				message: 'User with this email already exists',
			});
		}

		const hashedPassword = await bcrypt.hash(password, 10);

		const user = await prisma.$transaction(async (tx) => {
			const newUser = await tx.user.create({
				data: {
					name,
					email,
					password: hashedPassword,
					role: targetRole,
				},
			});

			if (targetRole === 'DOCTOR') {
				await tx.doctorProfile.create({
					data: {
						userId: newUser.id,
						specialisation: specialisation || 'General Physician',
						slotDuration: parseInt(slotDuration || '30', 10),
						workingHours: workingHours || { start: '09:00', end: '17:00' },
					},
				});
			}

			return newUser;
		});

		const token = generateToken(user);

		res.status(201).json({
			success: true,
			message: `${targetRole} account registered successfully`,
			token,
			user: {
				id: user.id,
				name: user.name,
				email: user.email,
				role: user.role,
			},
		});
	} catch (error) {
		console.error('Registration error:', error);

		res.status(500).json({
			success: false,
			message: 'Server error during registration',
		});
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

function createOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

async function googleLogin(req, res) {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required',
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'fallback_secret'
    );

    const oauth2Client = createOAuthClient();

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [
        'https://www.googleapis.com/auth/calendar'
      ],
      state: decoded.id,
    });

    res.redirect(url);
  } catch (error) {
    console.error('Google login error:', error);

    return res.status(401).json({
      success: false,
      message: 'Invalid or expired access token',
    });
  }
}

async function googleCallback(req, res) {
  try {
    const { code, state } = req.query;

    if (!code) {
      return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/patient?google=failed`);
    }

    const oauth2Client = createOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);

    if (state && state.trim() !== '') {
      await prisma.googleToken.upsert({
        where: { userId: state },
        update: {
          accessToken: tokens.access_token,
          ...(tokens.refresh_token && { refreshToken: tokens.refresh_token }),
          expiresAt: new Date(tokens.expiry_date || Date.now() + 3600 * 1000),
        },
        create: {
          userId: state,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || 'offline_refresh_token',
          expiresAt: new Date(tokens.expiry_date || Date.now() + 3600 * 1000),
        },
      });
    }

    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/patient?google=connected`);
  } catch (err) {
    console.error('[Google OAuth Error]:', err.message);
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/patient?google=failed`);
  }
}

// Reset password directly in database
async function resetPassword(req, res) {
	try {
		const { email, newPassword } = req.body;

		if (!email || !newPassword) {
			return res.status(400).json({
				success: false,
				message: 'Please provide email and new password',
			});
		}

		if (newPassword.length < 6) {
			return res.status(400).json({
				success: false,
				message: 'Password must be at least 6 characters long',
			});
		}

		const cleanEmail = email.trim().toLowerCase();
		const user = await prisma.user.findFirst({
			where: {
				email: {
					equals: cleanEmail,
					mode: 'insensitive',
				},
			},
		});

		if (!user) {
			return res.status(404).json({
				success: false,
				message: 'No account found with this email address',
			});
		}

		const hashedPassword = await bcrypt.hash(newPassword, 10);

		await prisma.user.update({
			where: { id: user.id },
			data: { password: hashedPassword },
		});

		return res.status(200).json({
			success: true,
			message: `Password updated successfully for ${user.email} (${user.role}). You can now log in.`,
		});
	} catch (error) {
		console.error('Reset password error:', error);
		return res.status(500).json({
			success: false,
			message: 'Server error while updating password in database',
		});
	}
}

// Delete user account and all associated data
async function deleteAccount(req, res) {
	try {
		const userId = req.user.id;

		await prisma.$transaction(async (tx) => {
			// 1. Find if doctor profile exists
			const doctorProf = await tx.doctorProfile.findUnique({
				where: { userId },
			});

			// 2. Delete medication reminders connected to patient appointments
			await tx.medicationReminder.deleteMany({
				where: {
					OR: [
						{ patientId: userId },
						{ appointment: { patientId: userId } },
						...(doctorProf ? [{ appointment: { doctorProfileId: doctorProf.id } }] : []),
					],
				},
			});

			// 3. Delete appointments associated with patientId or doctorProfileId
			await tx.appointment.deleteMany({
				where: {
					OR: [
						{ patientId: userId },
						...(doctorProf ? [{ doctorProfileId: doctorProf.id }] : []),
					],
				},
			});

			// 4. Delete user record (cascades to DoctorProfile, GoogleToken, SlotHold, NotificationLog, BroadcastRecipient)
			await tx.user.delete({
				where: { id: userId },
			});
		});

		res.status(200).json({
			success: true,
			message: 'Your account and all associated data have been permanently deleted.',
		});
	} catch (error) {
		console.error('Delete account error:', error);
		res.status(500).json({
			success: false,
			message: 'Server error while deleting account data',
		});
	}
}

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  resetPassword,
  deleteAccount,
  googleLogin,
  googleCallback,
};

