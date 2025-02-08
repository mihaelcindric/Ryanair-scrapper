const express = require('express');
const router = express.Router();
const {
  login,
  register,
  getCurrentUser,
  updateProfile
} = require('../controllers/auth.controller');

router.post('/login', login);
router.post('/register', register);
router.get('/current-user', getCurrentUser)
router.put('/update-profile', updateProfile);


module.exports = router;
