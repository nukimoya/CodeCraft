const express = require('express');
const authRoutes = require('./auth.js');
const learnerRoutes = require('./learner.js')
const adminRoutes = require('./admin.js')

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/learner", learnerRoutes);
router.use("/admin", adminRoutes);

module.exports = router;