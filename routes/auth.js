// routes/auth.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const AuthController = require('../Controller/AuthController');

// Public routes
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);

// Protected route example
router.get('/profile', authMiddleware, async (req, res) => {
    // Access authenticated user with req.user
    res.json({ user: req.user });
});

module.exports = router;
