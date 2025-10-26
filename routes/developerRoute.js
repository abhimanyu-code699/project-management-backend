const express = require('express');
const { verifyToken } = require('../middleware/authMiddleware');
const { getDevelopersSuggestions, getTotalDevelopers, developersData } = require('../controllers/developerController');
const router = express.Router();

router.get('/get-developers',getDevelopersSuggestions);
router.get('/total-developers',verifyToken,getTotalDevelopers);
router.get('/getDeveloper-data',verifyToken,developersData);

module.exports = router;