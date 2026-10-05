module.exports = (req, res, next) => {
 if (req.customerId || req.adminId) return next();
 return res.status(401).json({ message: 'Please sign in to continue.' });
};
