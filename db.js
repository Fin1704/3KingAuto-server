const { Sequelize } = require('sequelize');
const { logger } = require('sequelize/lib/utils/logger');
require('dotenv').config();
// Create Sequelize instance
const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER || 'root',
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        dialect: 'mysql',
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    },
);

// Test the connection
const testConnection = async () => {
    try {
        await sequelize.authenticate();
        console.log('Successfully connected to MySQL database');
    } catch (error) {
        console.error('Error connecting to MySQL database:', error);
    }
};

testConnection();

// Export the sequelize instance
module.exports = sequelize;
