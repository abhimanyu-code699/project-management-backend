const express = require('express');
const { addProject } = require('../controllers/managerController');
const { verifyToken } = require('../middleware/authMiddleware');
const router = express.Router();

router.post('/add-project',verifyToken,addProject);

module.exports = router;