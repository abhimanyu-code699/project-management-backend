const express = require('express');
const { verifyToken } = require('../middleware/authMiddleware');
const { 
    addAdmin, 
    getAllProjectsData 
} = require('../controllers/adminController');
const router = express.Router();

router.post('/add-admin',addAdmin);
router.get('/getAll-projects-data',verifyToken,getAllProjectsData);

module.exports = router;