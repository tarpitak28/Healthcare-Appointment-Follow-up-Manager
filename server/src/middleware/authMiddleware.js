const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
	const authHeader = req.headers['authorization'];
	const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

	if (!token) {
		return res.status(401).json({ success: false, message: 'Access token missing or malformed' });
	}

	jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret', (err, user) => {
		if (err) {
			return res.status(403).json({ success: false, message: 'Invalid or expired token' });
		}
		req.user = user; // Contains { id, email, role }
		next();
	});
}

function requireRole(roles) {
	return (req, res, next) => {
		if (!req.user || !roles.includes(req.user.role)) {
			return res.status(403).json({ success: false, message: 'Unauthorized: Insufficient permissions' });
		}
		next();
	};
}

module.exports = {
	verifyToken,
	requireRole,
};
