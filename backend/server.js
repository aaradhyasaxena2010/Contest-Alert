const express = require('express');
const session = require('express-session');
const dotenv = require('dotenv');
const passport = require('passport');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const { sequelize } = require('./models'); // Sequelize instance
require('./config/passport'); // Google strategy config

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session Store in MySQL
const sessionStore = new SequelizeStore({
  db: sequelize,
});

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'defaultSecret',
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
  })
);

sessionStore.sync(); // create session table if it doesn't exist

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// ==========================
// Routes
// ==========================

// Home Route
app.get('/', (req, res) => {
  res.send(`<h2>Welcome to Contest Alert</h2>
    <a href="/auth/google">Login with Google</a>`);
});

// Auth Routes (Google + Email/Password)
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes); // for /api/auth/login and /api/auth/register
app.use('/auth', authRoutes);     // for /auth/google

// Protected Route
app.get('/dashboard', (req, res) => {
  if (req.isAuthenticated()) {
    res.send(`
      <h2>Hello, ${req.user.name || req.user.username}!</h2>
      <p>Email: ${req.user.email}</p>
      <a href="/logout">Logout</a>
    `);
  } else {
    res.redirect('/');
  }
});

// Logout
app.get('/logout', (req, res, next) => {
  req.logout(err => {
    if (err) return next(err);
    res.redirect('/');
  });
});

// Sync DB and Start Server
sequelize.sync().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ Server is running on http://localhost:${PORT}`);
  });
});
