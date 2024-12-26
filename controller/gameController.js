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
        const transaction = await Player.sequelize.transaction();

        try {
            const player = req.player;

            // Calculate rewards
            const gems = calculateRewards();

            await Player.update({
                gems: player.gems + gems,
            }, {
                where: {
                    id: player.id,
                },
                transaction
            });

            const updatedPlayer = await Player.findByPk(player.id, { transaction });

            if (!updatedPlayer) {
                throw new Error("Player update failed");
            }

            // Commit the transaction only after all operations are successful
            await transaction.commit();

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
            // Rollback the transaction if there is any error
            await transaction.rollback();
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
        const transaction = await Player.sequelize.transaction();

        try {
            const player = req.player;

            if (player.gems < 200) {
                return res.status(400).json(formatResponse(
                    false,
                    {},
                    'Not enough gems to summon the boss.'
                ));
            }
            var bossCode = generateRandomString();
            await Player.update({
                gems: player.gems - 200,
                bossCode: bossCode
            }, {
                where: {
                    id: player.id,
                },
                transaction
            });

            const updatedPlayer = await Player.findByPk(player.id, { transaction });

            if (!updatedPlayer) {
                throw new Error("Player update failed");
            }

            await transaction.commit();

            await invalidatePlayerCache(player.id);

            return res.json({ code: bossCode });

        } catch (error) {
            // Rollback the transaction if there is any error
            await transaction.rollback();
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
    async killBoss(req, res) {
        const transaction = await Player.sequelize.transaction();

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

            // Kiểm tra mã bossCode có khớp không
            if (player.bossCode !== bossCode) {
                return res.status(400).json(formatResponse(
                    false,
                    {},
                    'Invalid boss code. You failed to kill the boss.'
                ));
            }

            // Nếu khớp, xóa bossCode
            await Player.update({
                bossCode: null // Reset bossCode sau khi tiêu diệt boss
            }, {
                where: {
                    id: player.id,
                },
                transaction
            });

            // Tạo một Rune ngẫu nhiên cho người chơi
            const randomRuneId = Math.floor(Math.random() * 10) + 1; // runeId từ 1 đến 10
            const newRune = await Rune.create({
                playerId: player.id,
                runeId: randomRuneId,
                isEquipped: false,
                index: null,
            }, { transaction });

            const updatedPlayer = await Player.findByPk(player.id, { transaction });

            if (!updatedPlayer) {
                throw new Error("Player update failed");
            }

            // Hoàn tất giao dịch
            await transaction.commit();

            // Cache invalidation
            await invalidatePlayerCache(player.id);

            return res.json(formatResponseWithRunes(
                true,
                { newRune },
                'Boss defeated successfully! A new rune has been awarded.'
            ));

        } catch (error) {
            // Rollback nếu có lỗi xảy ra
            await transaction.rollback();
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
        const transaction = await Rune.sequelize.transaction();

        try {
            const { id, index } = req.body; // Lấy id và index từ request body

            if (!id || index == null) {
                return res.status(400).json(formatResponse(
                    false,
                    {},
                    'Rune ID and index are required.'
                ));
            }

            // Tìm Rune theo ID
            const rune = await Rune.findByPk(id, { transaction });

            if (!rune) {
                return res.status(404).json(formatResponse(
                    false,
                    {},
                    'Rune not found.'
                ));
            }

            // Cập nhật Rune
            rune.index = index;
            rune.isEquipped = true;

            await rune.save({ transaction });

            // Commit transaction
            await transaction.commit();

            return res.json(formatResponse(
                true,
                { rune },
                'Rune equipped successfully.'
            ));
        } catch (error) {
            // Rollback transaction nếu có lỗi
            await transaction.rollback();
            console.error('Error in equipRune:', error);

            return res.status(500).json(formatResponse(
                false,
                {},
                'Error equipping Rune.'
            ));
        }
    },
    async unequipRune(req, res) {
        const transaction = await Rune.sequelize.transaction();

        try {
            const { id } = req.body; // Lấy id từ request body

            if (!id) {
                return res.status(400).json(formatResponse(
                    false,
                    {},
                    'Rune ID is required.'
                ));
            }

            // Tìm Rune theo ID
            const rune = await Rune.findByPk(id, { transaction });

            if (!rune) {
                return res.status(404).json(formatResponse(
                    false,
                    {},
                    'Rune not found.'
                ));
            }

            // Cập nhật Rune
            rune.isEquipped = false;
            rune.index = null; // Reset index nếu muốn

            await rune.save({ transaction });

            // Commit transaction
            await transaction.commit();

            return res.json(formatResponse(
                true,
                { rune },
                'Rune unequipped successfully.'
            ));
        } catch (error) {
            // Rollback transaction nếu có lỗi
            await transaction.rollback();
            console.error('Error in unequipRune:', error);

            return res.status(500).json(formatResponse(
                false,
                {},
                'Error unequipping Rune.'
            ));
        }
    },
    async buyHero(req, res) {
        const transaction = await Player.sequelize.transaction();

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
                },
                transaction
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

            // Deduct gems and create the hero
            await Player.update({
                gems: player.gems - 10000
            }, {
                where: {
                    id: player.id
                },
                transaction
            });
            const hero = await Hero.create({
                ...HERO_BASIC[idHero],
                playerId: player.id
            }, { transaction });

            await transaction.commit();

            return res.json(formatResponse(
                true,
                { hero },
                'Hero purchased successfully.'
            ));

        } catch (error) {
            await transaction.rollback();
            console.error('Error in buyHero:', error);

            return res.status(200).json(formatResponse(
                false,
                {},
                'Error purchasing hero.'
            ));
        }
    },

};

module.exports = GameModule;
