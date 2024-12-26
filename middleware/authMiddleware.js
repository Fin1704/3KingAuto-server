// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const { Player } = require('../models');
require('dotenv').config();

const authMiddleware = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Find player and attach to request
        const player = await Player.findByPk(decoded.id);
        if (!player) {
            return res.status(404).json({ message: 'Player not found' });
        }
        
        req.player = player;
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(401).json({ message: 'Invalid token' });
    }
};

module.exports = authMiddleware;
