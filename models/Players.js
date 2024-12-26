const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../db');
const bcrypt = require('bcrypt');

// Constants
const CONSTANTS = {
    USERNAME_MIN_LENGTH: 3,
    USERNAME_MAX_LENGTH: 30,
    PASSWORD_MIN_LENGTH: 6,
    PASSWORD_MAX_LENGTH: 100,
    SALT_ROUNDS: 10,
    DEFAULT_GEMS: 0
};

// Validation rules
const validations = {
    username: {
        len: {
            args: [CONSTANTS.USERNAME_MIN_LENGTH, CONSTANTS.USERNAME_MAX_LENGTH],
            msg: `Username must be between ${CONSTANTS.USERNAME_MIN_LENGTH} and ${CONSTANTS.USERNAME_MAX_LENGTH} characters`
        },
        notEmpty: {
            msg: 'Username cannot be empty'
        },
        isAlphanumeric: {
            msg: 'Username must contain only letters and numbers'
        }
    },
    password: {
        len: {
            args: [CONSTANTS.PASSWORD_MIN_LENGTH, CONSTANTS.PASSWORD_MAX_LENGTH],
            msg: `Password must be between ${CONSTANTS.PASSWORD_MIN_LENGTH} and ${CONSTANTS.PASSWORD_MAX_LENGTH} characters`
        },
        notEmpty: {
            msg: 'Password cannot be empty'
        }
    },
    gems: {
        min: {
            args: [0],
            msg: 'Gems cannot be negative'
        },
        isInt: {
            msg: 'Gems must be an integer'
        }
    }
};

const Player = sequelize.define('Player', {
    id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
    },
    username: {
        type: DataTypes.STRING(CONSTANTS.USERNAME_MAX_LENGTH),
        allowNull: false,
        unique: {
            name: 'unique_username',
            msg: 'Username already exists'
        },
        validate: validations.username,
        set(value) {
            this.setDataValue('username', value.toLowerCase().trim());
        }
    },
    bossCode: {
        type: DataTypes.STRING(30),
        allowNull: true,
        validate: {
            isAlphanumeric: {
                msg: 'Boss code must contain only letters and numbers'
            }
        }
    },
    password: {
        type: DataTypes.STRING(CONSTANTS.PASSWORD_MAX_LENGTH),
        allowNull: false,
        validate: validations.password,
        set(value) {
            const hashedPassword = bcrypt.hashSync(value, CONSTANTS.SALT_ROUNDS);
            this.setDataValue('password', hashedPassword);
        }
    },
    gems: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: CONSTANTS.DEFAULT_GEMS,
        validate: validations.gems
    },
    lastLoginAt: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'players',
    timestamps: true,
    underscored: true,
    
    scopes: {
        public: {
            attributes: ['id', 'username', 'gems', 'lastLoginAt']
        },
        withBossCode: {
            attributes: ['id', 'username', 'bossCode']
        }
    }
});

// Instance Methods
Player.prototype.verifyPassword = async function(password) {
    return bcrypt.compare(password, this.password);
};

Player.prototype.updateGems = async function(amount) {
    const newGemAmount = this.gems + amount;
    if (newGemAmount < 0) {
        throw new Error('Insufficient gems');
    }
    this.gems = newGemAmount;
    return this.save();
};

// Class Methods
Player.findByUsername = async function(username) {
    return this.findOne({
        where: { username: username.toLowerCase().trim() },
        attributes: { exclude: ['password'] }
    });
};

// Hooks
Player.beforeCreate(async (player) => {
    player.username = player.username.toLowerCase().trim();
});

Player.beforeUpdate(async (player) => {
    if (player.changed('password')) {
        player.password = await bcrypt.hash(player.password, CONSTANTS.SALT_ROUNDS);
    }
});

// Cache configuration (assuming Redis is used)
const cacheConfig = {
    ttl: 3600, // 1 hour
    prefix: 'player:'
};

// Optimized query methods
Player.findByIdCached = async function(id) {
    const cacheKey = `${cacheConfig.prefix}${id}`;
    // Implement your caching logic here
    return this.findByPk(id, {
        attributes: { exclude: ['password'] }
    });
};

// Bulk operations
Player.bulkCreateWithValidation = async function(players) {
    return this.bulkCreate(players, {
        validate: true,
        returning: true,
        benchmark: true
    });
};

module.exports = Player;
