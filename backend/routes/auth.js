import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Create a signed JWT that identifies the user (valid for 7 days)
function signToken(user) {
  return jwt.sign({ sub: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

// Only send safe fields back to the browser (never the password hash)
function publicUser(user) {
  return { id: user._id.toString(), name: user.name, email: user.email };
}

// POST /api/auth/register  { name, email, password }
router.post('/register', async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required.' });
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ error: 'Enter a valid email address.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    // Hash the password: the plain password is never stored
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash });

    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    console.error('Register failed:', err.message);
    res.status(500).json({ error: 'Could not create account.' });
  }
});

// POST /api/auth/login  { email, password }
router.post('/login', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await User.findOne({ email });
    const ok = user && user.passwordHash && (await bcrypt.compare(password, user.passwordHash));

    // Same message for "no such user" and "wrong password" so attackers learn nothing
    if (!ok) {
      return res.status(401).json({ error: 'Incorrect email or password.' });
    }

    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    console.error('Login failed:', err.message);
    res.status(500).json({ error: 'Could not log in.' });
  }
});

// POST /api/auth/google  { credential }  (Google ID token from "Sign in with Google")
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ error: 'Missing Google credential.' });
    }
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(500).json({ error: 'Google sign-in is not configured on the server.' });
    }

    // Verify the token's signature and that it was issued for OUR app
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const profile = ticket.getPayload();

    if (!profile?.email || !profile.email_verified) {
      return res.status(401).json({ error: 'Your Google email is not verified.' });
    }

    const email = profile.email.toLowerCase();
    let user = await User.findOne({ $or: [{ googleId: profile.sub }, { email }] });

    if (!user) {
      // First time with Google: create the account
      user = await User.create({ name: profile.name || email, email, googleId: profile.sub });
    } else if (!user.googleId) {
      // Account existed with this email: link Google to it
      user.googleId = profile.sub;
      await user.save();
    }

    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    console.error('Google sign-in failed:', err.message);
    res.status(401).json({ error: 'Google sign-in failed.' });
  }
});

// GET /api/auth/me  (requires a valid token)
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(401).json({ error: 'Account not found.' });
    res.json({ user: publicUser(user) });
  } catch (err) {
    res.status(500).json({ error: 'Could not load account.' });
  }
});

export default router;