const express = require('express');
const passport = require('passport');
const bcrypt = require('bcrypt');
const { User } = require('../models'); // Adjust path if needed

const router = express.Router();

// ===============================
// 🔹 Google OAuth
// ===============================
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/',
    successRedirect: '/dashboard',
  })
);

// ===============================
// 🔹 Logout
// ===============================
router.get('/logout', (req, res, next) => {
  req.logout(err => {
    if (err) return next(err);
    res.redirect('/');
  });
});

// ===============================
// ✅ Email/Password Registration
// ===============================
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      username,
      email,
      password: hashedPassword
    });

    res.status(201).json({ message: 'User registered successfully', user: newUser });

  } catch (err) {
    console.error("🔥 Registration error:", err); // 👈 ADD THIS LINE
    res.status(500).json({ message: 'Server error' });
  }
});


// ===============================
// ✅ Email/Password Login
// ===============================
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Optional: Log user in manually via session
    req.login(user, err => {
      if (err) return res.status(500).json({ message: 'Login failed' });
      return res.status(200).json({ message: 'Login successful', user });
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
