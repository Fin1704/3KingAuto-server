require('dotenv').config();
const fs = require('fs');
const https = require('https');
const express = require('express');
const cors = require('cors');
const sequelize = require('./db');
const authRoutes = require('./routes/auth');
const gameRoutes = require('./routes/gameRoutes');

const app = express();

// Cấu hình CORS
app.use(cors({
    origin: '*', // Cho phép tất cả origin
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Cho phép các phương thức
    allowedHeaders: ['Content-Type', 'Authorization'], // Cho phép các header
}));

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

// SSL Configuration
const sslOptions = {
    key: fs.readFileSync(process.env.SSL_KEY_PATH || './ssl/key.pem'),
    cert: fs.readFileSync(process.env.SSL_CERT_PATH || './ssl/cert.pem'),
    ca: fs.readFileSync(process.env.SSL_CHAIN_PATH || './ssl/ca.pem'),
};

// Database sync and server start
const startServer = async () => {
    try {
        // Sync database
        await sequelize.sync({ alter: true }); // Use { force: true } to recreate tables (careful in production!)
        console.log('Database synchronized successfully');

        // Start HTTPS server
        https.createServer(sslOptions, app).listen(PORT, () => {
            console.log(`Secure server is running on https://localhost:${PORT}`);
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
