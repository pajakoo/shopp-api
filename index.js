const express = require('express');
const cors = require("cors");
const passport = require('passport');
const cookieSession = require("cookie-session");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');
require("dotenv").config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(passport.initialize());

app.use(
  cookieSession({
    name: 'session',
    keys: ['cyberwolve'],
    maxAge: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    domain: 'https://pajakoo.onrender.com', // Set the domain of your website
    secure: true, // Require HTTPS
  })
);


app.use(passport.initialize());
app.use(passport.session());


app.use(
	cors({
		origin: process.env.CLIENT_URL,
		methods: "GET,POST,PUT,DELETE",
		credentials: true,
	})
);

passport.use(new GoogleStrategy({
  clientID:  process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: 'https://pajakoo-api.onrender.com/auth/google/callback',
}, (accessToken, refreshToken, profile, done) => {
  return done(null, profile);
}));

// Serialize user into JWT
passport.serializeUser((user, done) => {
  const token = jwt.sign(user, process.env.JWT_SECRET);
  done(null, token);
});

// Use the JWT token for subsequent requests
passport.deserializeUser((token, done) => {
  jwt.verify(token,  process.env.JWT_SECRET, (err, decoded) => {
    done(null, decoded);
  });
});

// Google OAuth route
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Google OAuth callback
app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' , successRedirect: process.env.CLIENT_URL}),
  (req, res) => {
    res.redirect('/profile'); // Redirect to profile route
  }
);

// Profile route to demonstrate authentication
app.get('/profile', (req, res) => {
  res.json(req.user);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
