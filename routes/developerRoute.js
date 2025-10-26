const express = require('express');
const { verifyToken } = require('../middleware/authMiddleware');
const { getDevelopersSuggestions } = require('../controllers/developerController');
const router = express.Router();

router.get('/get-developers',getDevelopersSuggestions);

module.exports = router;