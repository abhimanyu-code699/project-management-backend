const express = require('express');
const { addAdmin } = require('../controllers/adminController');
const router = express.Router();

router.post('/add-admin',addAdmin);

module.exports = router;