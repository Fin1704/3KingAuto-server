require('dotenv').config();
const HERO_BASIC = require('../HeroBasic/HERO_2_BASIC');
const { Player, Rune, Hero } = require("../models");

// Utility functions
const calculateRewards = () => {
    return Math.floor(Math.random() * 10) + 1;
};

const invalidatePlayerCache = async (playerId) => {
    try {
        // Implement cache invalidation logic here
        // Example: await cache.del(`player:${playerId}`);
    } catch (error) {
        console.error('Cache invalidation error:', error);
    }
};

const formatResponse = (success, data = {}, message = '') => {
    return {
        success,
        ...data,
        message
    };
};
const formatResponseWithRunes = (success, data = {}, message = '') => {
    data.newRune.key = data.newRune.id;
    data.newRune.id = data.newRune.runeId;
    return {
        success,
        newRune: {
            key: data.newRune.id,
            id: data.newRune.runeId,
            isEquipped: data.newRune.isEquipped,
            index: data.newRune.index || 0,
        }
        ,
        message
    };
};
function generateRandomString() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    let result = '';
    for (let i = 0; i < 5; i++) {
        const randomIndex = Math.floor(Math.random() * chars.length);
        result += chars[randomIndex];
    }
    return result;
}
// Game module
const GameModule = {
   async killMonster(req, res) {
       try {
           const player = req.player;
   
           // Calculate rewards
           const gems = calculateRewards();
   
           // Update player gems
           const [updateCount] = await Player.update({
               gems: player.gems + gems,
           }, {
               where: {
                   id: player.id,
               }
           });
   
           if (updateCount === 0) {
               throw new Error("Player update failed");
           }
   
           // Get updated player data
           const updatedPlayer = await Player.findByPk(player.id);
   
           if (!updatedPlayer) {
               throw new Error("Player update failed");
           }
   
           // Cache invalidation
           await invalidatePlayerCache(player.id);
   
           return res.json(formatResponse(
               true,
               {
                   rewards: { gems },
                   newTotals: {
                       gems: updatedPlayer.gems,
                   }
               },
               `You earned ${gems} gems!`
           ));
   
       } catch (error) {
           console.error('Error in killMonster:', error);
   
           if (error.name === 'SequelizeOptimisticLockError') {
               return res.status(409).json(formatResponse(
                   false,
                   {},
                   'Conflict detected. Please try again.'
               ));
           }
   
           return res.status(500).json(formatResponse(
               false,
               {},
                   'Error processing monster kill reward'
           ));
       }
   },
   

   async summonBoss(req, res) {
       try {
           const player = req.player;
   
           if (player.gems < 200) {
               return res.status(400).json(formatResponse(
                   false,
                   {},
                   'Not enough gems to summon the boss.'
               ));
           }
   
           const bossCode = generateRandomString();
           
           // Update player's gems and bossCode
           const [updateCount] = await Player.update({
               gems: player.gems - 200,
               bossCode: bossCode
           }, {
               where: {
                   id: player.id,
                   gems: player.gems // Add this condition to prevent race conditions
               }
           });
   
           if (updateCount === 0) {
               return res.status(409).json(formatResponse(
                   false,
                   {},
                   'Update failed. Please try again.'
               ));
           }
   
           // Get updated player data
           const updatedPlayer = await Player.findByPk(player.id);
   
           if (!updatedPlayer) {
               throw new Error("Player update failed");
           }
   
           // Invalidate cache
           await invalidatePlayerCache(player.id);
   
           return res.json({ code: bossCode });
   
       } catch (error) {
           console.error('Error in summonBoss:', error);
   
           if (error.name === 'SequelizeOptimisticLockError') {
               return res.status(409).json(formatResponse(
                   false,
                   {},
                   'Conflict detected. Please try again.'
               ));
           }
   
           return res.status(500).json(formatResponse(
               false,
               {},
               'Error processing boss summoning'
           ));
       }
   },
   async getTop10Gems(req, res) {
    try {
        // Fetch the top 10 players sorted by gems in descending order
        const topPlayers = await Player.findAll({
            attributes: ['id', 'username', 'gems'], // Replace 'name' with the actual player name field if different
            order: [['gems', 'DESC']],
            limit: 10
        });

        if (!topPlayers.length) {
            return res.status(404).json(formatResponse(
                false,
                {},
                'No players found.'
            ));
        }

        // Add rank to each player
        const rankedPlayers = topPlayers.map((player, index) => ({
            ...player.toJSON(),
            rank: index + 1
        }));

        return res.status(200).json(formatResponse(
            true,
            { topPlayers: rankedPlayers },
            'Top 10 players fetched successfully.'
        ));
    } catch (error) {
        console.error('Error in getTop10Gems:', error);

        return res.status(500).json(formatResponse(
            false,
            {},
            'Error fetching top 10 players.'
        ));
    }
},

async killBoss(req, res) {
    try {
        const player = req.player;
        const { bossCode } = req.body; 

        if (!bossCode) {
            return res.status(400).json(formatResponse(
                false,
                {},
                'Boss code is required.'
            ));
        }

        if (player.bossCode !== bossCode) {
            return res.status(400).json(formatResponse(
                false,
                {},
                'Invalid boss code. You failed to kill the boss.'
            ));
        }

        // Update player's bossCode
        await Player.update({
            bossCode: null
        }, {
            where: {
                id: player.id
            }
        });

        // Create random rune
        const randomRuneId = Math.floor(Math.random() * 10) + 1;
        const newRune = await Rune.create({
            playerId: player.id,
            runeId: randomRuneId,
            isEquipped: false,
            index: null
        });

        const updatedPlayer = await Player.findByPk(player.id);

        if (!updatedPlayer) {
            throw new Error("Player update failed");
        }

        // Cache invalidation
        await invalidatePlayerCache(player.id);

        return res.json(formatResponseWithRunes(
            true,
            { newRune },
            'Boss defeated successfully! A new rune has been awarded.'
        ));

    } catch (error) {
        console.error('Error in killBoss:', error);

        if (error.name === 'SequelizeOptimisticLockError') {
            return res.status(409).json(formatResponse(
                false,
                {},
                'Conflict detected. Please try again.'
            ));
        }

        return res.status(500).json(formatResponse(
            false,
            {},
            'Error processing boss kill'
        ));
    }
},

   async equipRune(req, res) {
       try {
           const { id, index } = req.body;
   
           if (!id || index == null) {
               return res.status(400).json(formatResponse(
                   false,
                   {},
                   'Rune ID and index are required.'
               ));
           }
   
           // Find Rune by ID
           const rune = await Rune.findByPk(id);
   
           if (!rune) {
               return res.status(404).json(formatResponse(
                   false,
                   {},
                   'Rune not found.'
               ));
           }
   
           // Update Rune
           rune.index = index;
           rune.isEquipped = true;
   
           await rune.save();
   
           return res.json(formatResponse(
               true,
               { rune },
               'Rune equipped successfully.'
           ));
       } catch (error) {
           console.error('Error in equipRune:', error);
   
           return res.status(500).json(formatResponse(
               false,
               {},
               'Error equipping Rune.'
           ));
       }
   },
   
   async unequipRune(req, res) {
       try {
           const { id } = req.body;
   
           if (!id) {
               return res.status(400).json(formatResponse(
                   false,
                   {},
                   'Rune ID is required.'
               ));
           }
   
           // Find Rune by ID
           const rune = await Rune.findByPk(id);
   
           if (!rune) {
               return res.status(404).json(formatResponse(
                   false,
                   {},
                   'Rune not found.'
               ));
           }
   
           // Update Rune
           rune.isEquipped = false;
           rune.index = null; // Reset index
   
           await rune.save();
   
           return res.json(formatResponse(
               true,
               { rune },
               'Rune unequipped successfully.'
           ));
       } catch (error) {
           console.error('Error in unequipRune:', error);
   
           return res.status(500).json(formatResponse(
               false,
               {},
               'Error unequipping Rune.'
           ));
       }
   },
   
  async buyHero(req, res) {
      try {
          const player = req.player;
          const { idHero } = req.body;
  
          if (!idHero) {
              return res.status(400).json(formatResponse(
                  false,
                  {},
                  'Hero ID is required.'
              ));
          }
  
          // Check if the player already owns the hero
          const existingHero = await Hero.findOne({
              where: {
                  playerId: player.id,
                  heroId: idHero
              }
          });
  
          if (existingHero) {
              return res.status(200).json(formatResponse(
                  false,
                  {},
                  'You already own this hero.'
              ));
          }
  
          if (player.gems < 10000) {
              return res.status(200).json(formatResponse(
                  false,
                  {},
                  'Not enough gems to buy this hero.'
              ));
          }
  
          // Deduct gems
          await Player.update({
              gems: player.gems - 10000
          }, {
              where: {
                  id: player.id
              }
          });
  
          // Create the hero
          const hero = await Hero.create({
              ...HERO_BASIC[idHero],
              playerId: player.id
          });
  
          return res.json(formatResponse(
              true,
              { hero },
              'Hero purchased successfully.'
          ));
  
      } catch (error) {
          console.error('Error in buyHero:', error);
  
          return res.status(200).json(formatResponse(
              false,
              {},
              'Error purchasing hero.'
          ));
      }
  },
  async mineMinerals(req, res) {
    try {
        const player = req.player;

        // Check if player has enough gems
        if (player.gems < 100) {
            return res.status(400).json(formatResponse(
                false,
                {},
                'Not enough gems to mine minerals.'
            ));
        }

        // Subtract mining fee
        await Player.update({
            gems: player.gems - 100
        }, {
            where: {
                id: player.id
            }
        });

        // Define drop chances for each ID (higher ID = lower chance)
        const dropChances = [
            { id: 1, chance: 50 }, // 50%
            { id: 2, chance: 20 }, // 20%
            { id: 3, chance: 15 }, // 15%
            { id: 4, chance: 10 }, // 10%
            { id: 5, chance: 4 },  // 4%
            { id: 6, chance: 0.9 },// 0.9%
            { id: 7, chance: 0.1 } // 0.1%
        ];

        // Calculate random drop
        const randomNumber = Math.random() * 100;
        let accumulatedChance = 0;
        let selectedId = 1;

        for (const drop of dropChances) {
            accumulatedChance += drop.chance;
            if (randomNumber <= accumulatedChance) {
                selectedId = drop.id;
                break;
            }
        }

        // Gem rewards based on ID
        const gemRewards = {
            1: 5,
            2: 100,
            3: 150,
            4: 200,
            5: 250,
            6: 300,
            7: 500
        };

        const rewardGems = gemRewards[selectedId];

        // Update player's gems with reward
        await Player.update({
            gems: player.gems - 100 + rewardGems
        }, {
            where: {
                id: player.id
            }
        });

        // Refresh player data
        const updatedPlayer = await Player.findByPk(player.id);

        if (!updatedPlayer) {
            throw new Error('Player update failed after mining.');
        }

        // Cache invalidation
        await invalidatePlayerCache(player.id);

        return res.json(formatResponse(
            true,
            { selectedId, rewardGems },
            `You mined minerals and received ID ${selectedId} with a reward of ${rewardGems} gems!`
        ));

    } catch (error) {
        console.error('Error in mineMinerals:', error);

        return res.status(500).json(formatResponse(
            false,
            {},
            'Error processing mineral mining'
        ));
    }
}

  

};

module.exports = GameModule;
