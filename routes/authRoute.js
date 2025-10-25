const express = require('express');
const { authorize, verifyToken } = require('../middleware/authMiddleware');
const { register, login } = require('../controllers/authController');
const router = express.Router();

router.post('/register',verifyToken,register);
router.post('/login',login);

module.exports = router;