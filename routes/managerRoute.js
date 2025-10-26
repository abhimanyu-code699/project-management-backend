const express = require('express');
const { addProject, getTotalManagers, getTotalProjects } = require('../controllers/managerController');
const { verifyToken } = require('../middleware/authMiddleware');
const router = express.Router();

router.post('/add-project',verifyToken,addProject);
router.get('/total-managers',verifyToken,getTotalManagers);
router.get('/total-projects',verifyToken,getTotalProjects);

module.exports = router;