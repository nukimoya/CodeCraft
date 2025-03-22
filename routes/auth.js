const express = require('express');
const { signupUser, signinUser } = require('../controllers/authController.js');


const router = express.Router();

router.post("/signup", signupUser);
router.post("/login", signinUser);

module.exports = router;