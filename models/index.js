const Hero = require("./Hero");
const Player = require("./Players");
const Rune = require("./Rune");


// Define associations with options for better query optimization
Player.hasMany(Hero, {
    foreignKey: 'playerId',
    as: 'heroes',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
    hooks: true,
    constraints: true // Ensures referential integrity
});

Hero.belongsTo(Player, {
    foreignKey: 'playerId',
    as: 'player',
    targetKey: 'id',
    hooks: true
});

Player.hasMany(Rune, {
    foreignKey: 'playerId',
    as: 'runes',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
    hooks: true,
    constraints: true
});

Rune.belongsTo(Player, {
    foreignKey: 'playerId',
    as: 'player',
    targetKey: 'id',
    hooks: true
});

// Add common query scopes for optimization
Player.addScope('withHeroes', {
    include: [{
        model: Hero,
        as: 'heroes',
    }]
});

Player.addScope('withRunes', {
    include: [{
        model: Rune,
        as: 'runes',
        where: { isEquipped: true }, // Only equipped runes by default
        required: false
    }]
});

// Export as a structured object with clear relationships
module.exports = {
    Player,
    Hero,
    Rune,
    // Add method to sync all models if needed
    sync: async (options = {}) => {
        await Player.sync(options);
        await Hero.sync(options);
        await Rune.sync(options);
    }
};
