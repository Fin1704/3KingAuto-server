// app.js or index.js
require('dotenv').config();
const express = require('express');
const app = express();
const sequelize = require('./db');
const authRoutes = require('./routes/auth');
const gameRoutes = require('./routes/gameRoutes');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);


// Default route
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to the game server' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});

// Port configuration
const PORT = process.env.PORT || 3000;

// Database sync and server start
const startServer = async () => {
    try {
        // Sync database
        await sequelize.sync({ alter: true }); // Use { force: true } to recreate tables (careful in production!)
        console.log('Database synchronized successfully');

        // Start server
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection:', error);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    process.exit(1);
});