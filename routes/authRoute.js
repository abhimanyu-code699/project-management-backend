const express = require('express');
const { authorize } = require('../middleware/authMiddleware');
const { register } = require('../controllers/authController');
const router = express.Router();

router.post('/register',authorize('admin'),register);


module.exports = router;