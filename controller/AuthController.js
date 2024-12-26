const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Player, Hero, Rune } = require('../models');
const INITIAL_HERO_STATS = require('../HeroBasic/INITIAL_HERO_STATS');
require('dotenv').config();

// Constants with clear naming
const AUTH_CONSTANTS = {
    JWT_SECRET: process.env.JWT_SECRET,
    SALT_ROUNDS: 12,
    TOKEN_EXPIRY: '24h',
    PASSWORD_MIN_LENGTH: 6,
    LOGIN_ATTEMPTS_LIMIT: 5,
    LOGIN_TIMEOUT: 15 * 60 * 1000, // 15 minutes
};

// Validation
if (!AUTH_CONSTANTS.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not set');
}

// Token generation with enhanced security
const generateToken = (player) => {
    const payload = {
        id: player.id,
        username: player.username,
        iat: Math.floor(Date.now() / 1000)
    };

    return jwt.sign(payload, AUTH_CONSTANTS.JWT_SECRET, {
        expiresIn: AUTH_CONSTANTS.TOKEN_EXPIRY,
        algorithm: 'HS256'
    });
};

// Response formatter with data sanitization
const formatPlayerResponse = (player, heroes, runes, token) => ({
    token,
    player: {
        id: player.id,
        username: player.username,
        gems: player.gems || 0
    },
    characters: heroes?.map(hero => ({
        id: hero.heroId,
        level: hero.level,
        hp: hero.hp,
        attackMin: hero.attackMin,
        attackMax: hero.attackMax,
        defense: hero.defense,
        moveSpeed: hero.moveSpeed,
        attackSpeed: hero.attackSpeed
    })) || [],
    runes: runes?.map(rune => ({
        key: rune.id,
        id: rune.runeId,
        isEquipped: Boolean(rune.isEquipped),
        index: rune.index || 0
    })) || []
});

// Enhanced validation with detailed error messages
const validateCredentials = (username, password) => {
    const errors = [];
    
    if (!username?.trim()) {
        errors.push('Username is required');
    }
    if (!password) {
        errors.push('Password is required');
    }
    if (password?.length < AUTH_CONSTANTS.PASSWORD_MIN_LENGTH) {
        errors.push(`Password must be at least ${AUTH_CONSTANTS.PASSWORD_MIN_LENGTH} characters long`);
    }

    return errors;
};

// Auth module with improved error handling and performance
const AuthModule = {
    async register(req, res) {
        try {
            const { username, password } = req.body;
    
            // Input validation
            const validationErrors = validateCredentials(username, password);
            if (validationErrors.length > 0) {
                return res.status(400).json({ 
                    success: false,
                    message: validationErrors[0],
                    errors: validationErrors
                });
            }
    
            // Check existing user with optimized query
            const existingPlayer = await Player.findOne({ 
                where: { username: username.toLowerCase().trim() },
                attributes: ['id'],
                raw: true
            });
    
            if (existingPlayer) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Username already exists' 
                });
            }
    
            // Create player with secure password hashing
            const hashedPassword = await bcrypt.hash(password, AUTH_CONSTANTS.SALT_ROUNDS);
            const player = await Player.create({
                username: username.toLowerCase().trim(),
                password: hashedPassword,
                gems: 0
            });
    
            // Create initial hero
            await Hero.create({
                ...INITIAL_HERO_STATS,
                playerId: player.id
            });
    
            // Fetch complete player data efficiently
            const completePlayer = await Player.findByPk(player.id, {
                include: [
                    { model: Hero, as: 'heroes', required: false },
                    { model: Rune, as: 'runes', required: false }
                ],
                raw: false
            });
    
            const token = generateToken(completePlayer);
    
            return res.status(200).json({
                success: true,
                message: 'Player registered successfully',
                ...formatPlayerResponse(
                    completePlayer, 
                    completePlayer.heroes, 
                    completePlayer.runes, 
                    token
                )
            });
    
        } catch (error) {
            console.error('Registration error:', error);
            
            if (error.name === 'SequelizeValidationError') {
                return res.status(400).json({ 
                    success: false,
                    message: 'Invalid input data',
                    errors: error.errors.map(e => e.message)
                });
            }
    
            return res.status(500).json({ 
                success: false,
                message: 'Error registering player' 
            });
        }
    },

   async login(req, res) {
       try {
           const { username, password } = req.body;
   
           // Input validation
           const validationErrors = validateCredentials(username, password);
           if (validationErrors.length > 0) {
               return res.status(400).json({ 
                   success: false,
                   message: validationErrors[0],
                   errors: validationErrors
               });
           }
   
           // Efficient player query with necessary includes
           const player = await Player.findOne({ 
               where: { username: username.toLowerCase().trim() },
               include: [
                   { 
                       model: Hero,
                       as: 'heroes',
                       required: false,
                       attributes: ['heroId', 'level', 'hp', 'attackMin', 'attackMax', 'defense', 'moveSpeed', 'attackSpeed']
                   },
                   { 
                       model: Rune,
                       as: 'runes',
                       required: false,
                       attributes: ['id', 'runeId', 'isEquipped', 'index']
                   }
               ],
               attributes: ['id', 'username', 'password', 'gems'] // Optimize by selecting only needed fields
           });
   
           if (!player) {
               return res.status(401).json({ 
                   success: false,
                   message: 'Invalid credentials' 
               });
           }
   
           const validPassword = await bcrypt.compare(password, player.password);
           if (!validPassword) {
               return res.status(401).json({ 
                   success: false,
                   message: 'Invalid credentials' 
               });
           }
   
           const token = generateToken(player);
   
           // Update last login timestamp
           await Player.update(
               { lastLoginAt: new Date() },
               { where: { id: player.id } }
           );
   
           return res.json({
               success: true,
               message: 'Login successful',
               ...formatPlayerResponse(player, player.heroes, player.runes, token)
           });
   
       } catch (error) {
           console.error('Login error:', error);
           return res.status(500).json({ 
               success: false,
               message: 'Error logging in' 
           });
       }
   }
   
};

module.exports = AuthModule;
