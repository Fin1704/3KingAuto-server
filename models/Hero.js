const { DataTypes } = require("sequelize");
const { Player } = require("./Players");
const sequelize = require("../db");

const Hero = sequelize.define('Hero', {
    
    id: {
        type: DataTypes.INTEGER.UNSIGNED, // Optimized for positive numbers
        primaryKey: true,
        autoIncrement: true,
    },
    heroId: {
        type: DataTypes.INTEGER.UNSIGNED, 
    },
    
    level: {
        type: DataTypes.SMALLINT.UNSIGNED, // Optimized for smaller numbers
        allowNull: false,
        defaultValue: 1,
        validate: {
            min: 1,
            max: 100 // Assuming max level is 100
        }
    },
    exp: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        validate: {
            min: 0
        }
    },
    attackMin: {
        type: DataTypes.SMALLINT.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        validate: {
            min: 0
        }
    },
    attackMax: {
        type: DataTypes.SMALLINT.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        validate: {
            min: 0,
            isGreaterThanMin(value) {
                if (value < this.attackMin) {
                    throw new Error('attackMax must be greater than attackMin');
                }
            }
        }
    },
    defense: {
        type: DataTypes.SMALLINT.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        validate: {
            min: 0
        }
    },
    attackSpeed: {
        type: DataTypes.DECIMAL(4, 2), // More precise than FLOAT
        allowNull: false,
        defaultValue: 1.2,
        validate: {
            min: 0.1,
            max: 10.0
        }
    },
    moveSpeed: {
        type: DataTypes.DECIMAL(4, 2), // More precise than FLOAT
        allowNull: false,
        defaultValue: 1.0,
        validate: {
            min: 0.1,
            max: 10.0
        }
    },
    hp: {
        type: DataTypes.MEDIUMINT.UNSIGNED, // Optimized for medium-sized numbers
        allowNull: false,
        defaultValue: 200,
        validate: {
            min: 1
        }
    },
    // playerId: { 
    //     type: DataTypes.INTEGER.UNSIGNED,
    //     allowNull: false,
    //     references: {
    //         model: Player,
    //         key: 'id'
    //     },
    //     index: true // Add index for foreign key
    // }
}, {
    tableName: 'heroes',
    timestamps: true,
    indexes: [
        {
            name: 'idx_heroes_player',
            fields: ['playerId']
        },
        {
            name: 'idx_heroes_level',
            fields: ['level']
        }
    ],
    validate: {
        attackMinMax() {
            if (this.attackMin > this.attackMax) {
                throw new Error('attackMin cannot be greater than attackMax');
            }
        }
    }
});

// Add hooks for data consistency
Hero.beforeValidate((hero) => {
    // Ensure HP is never negative
    if (hero.hp < 0) hero.hp = 0;
});

// Optimize queries by defining common scopes
Hero.addScope('basicStats', {
    attributes: ['id', 'level', 'hp', 'attackMin', 'attackMax', 'defense']
});

Hero.addScope('fullStats', {
    attributes: { exclude: ['createdAt', 'updatedAt'] }
});

module.exports = Hero;
