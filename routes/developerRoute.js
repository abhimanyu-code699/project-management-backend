const express = require('express');
const { verifyToken } = require('../middleware/authMiddleware');
const { getDevelopersSuggestions, getTotalDevelopers } = require('../controllers/developerController');
const router = express.Router();

router.get('/get-developers',getDevelopersSuggestions);
router.get('/total-developers',verifyToken,getTotalDevelopers);

module.exports = router;