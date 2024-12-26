const { DataTypes } = require("sequelize");
const sequelize = require("../db");
const { Player } = require("./Players");

const Rune = sequelize.define('Rune', {
    id: {
        type: DataTypes.INTEGER.UNSIGNED, // Optimized for positive numbers
        primaryKey: true,
        autoIncrement: true,
    },
    runeId: {
        type: DataTypes.INTEGER.UNSIGNED, 
    },
    isEquipped: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        index: true // Add index for common equipment queries
    },
    index:{
        type:DataTypes.INTEGER,
        
    }
    // playerId: {
    //     type: DataTypes.INTEGER.UNSIGNED, // Match Player.id type
    //     allowNull: false,
    //     references: {
    //         model: Player,
    //         key: 'id'
    //     },
    //     index: true // Add index for foreign key lookups
    // },
    // Add additional rune properties
   
}, {
    tableName: 'runes',
    timestamps: true,
    indexes: [
        {
            name: 'idx_runes_player_equipped',
            fields: ['playerId', 'isEquipped'],
            // Composite index for queries that check both player and equipment status
        },
       
    ],
    scopes: {
        equipped: {
            where: {
                isEquipped: true
            }
        },
        available: {
            where: {
                isEquipped: false
            }
        }
    }
});

// Add instance methods for common operations
Rune.prototype.equip = async function() {
    if (this.isEquipped) return false;
    
    const transaction = await sequelize.transaction();
    try {
        // Check if player has reached rune limit
        const equippedCount = await Rune.count({
            where: {
                playerId: this.playerId,
                isEquipped: true
            },
            transaction
        });

        if (equippedCount >= 6) { // Assuming max 6 runes per player
            await transaction.rollback();
            return false;
        }

        this.isEquipped = true;
        await this.save({ transaction });
        await transaction.commit();
        return true;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

Rune.prototype.unequip = async function() {
    if (!this.isEquipped) return false;
    this.isEquipped = false;
    await this.save();
    return true;
};

// Add model methods for bulk operations
Rune.bulkUnequip = async function(playerId) {
    return await this.update(
        { isEquipped: false },
        {
            where: {
                playerId,
                isEquipped: true
            }
        }
    );
};

// Add hooks for data consistency
Rune.beforeDestroy(async (rune, options) => {
    if (rune.isEquipped) {
        // Handle any cleanup needed when destroying an equipped rune
        // For example, update player stats
    }
});

// Add association methods
Rune.associate = (models) => {
    Rune.belongsTo(models.Player, {
        foreignKey: 'playerId',
        onDelete: 'CASCADE'
    });
};

module.exports = Rune;
