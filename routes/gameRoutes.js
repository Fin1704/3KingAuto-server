// routes/gameRoutes.js
const express = require('express');
const router = express.Router();
const gameController = require('../controller/gameController');
const authMiddleware = require('../middleware/authMiddleware');

// Protected route that requires JWT
router.post('/kill-monster', authMiddleware, gameController.killMonster);
router.get('/summon-boss', authMiddleware, gameController.summonBoss);
router.post('/kill-boss', authMiddleware, gameController.killBoss);
router.post('/equip-rune', authMiddleware, gameController.equipRune);
router.post('/unequip-rune', authMiddleware, gameController.unequipRune);
router.post('/buy-hero', authMiddleware, gameController.buyHero);
router.get('/top',authMiddleware,gameController.getTop10Gems)
module.exports = router;
