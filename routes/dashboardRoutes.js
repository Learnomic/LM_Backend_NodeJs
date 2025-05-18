const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { getDashboardData } = require('../controllers/dashboardController');

router.get('/', authMiddleware, getDashboardData); // 🛡️ Protected

module.exports = router;
