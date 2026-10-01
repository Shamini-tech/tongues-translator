// Load variables from backend/.env (MONGODB_URI, JWT_SECRET, GOOGLE_CLIENT_ID) into process.env
import 'dotenv/config';
// Import the Express framework to create our HTTP web server
import express from 'express';
// Import CORS middleware to allow cross-origin requests from our React frontend (port 5173)
import cors from 'cors';
// Import node-fetch to make HTTP requests from Node.js to external APIs
import fetch from 'node-fetch';
// Import Mongoose to talk to MongoDB
import mongoose from 'mongoose';
// Import the Translation model (history of saved translations)
import Translation from './models/Translation.js';
// Import login / register / Google routes and the JWT guard
import authRoutes from './routes/auth.js';
import { requireAuth } from './middleware/auth.js';

// Initialize the Express application instance
const app = express();
// Use the port given by the host (Render) or fall back to 5000 locally
const PORT = process.env.PORT || 5000;

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is missing in .env. Login and history will not work until it is set.');
}

// Middleware 1: Enable CORS so browsers permit port 5173 to talk to port 5000
app.use(cors());
// Middleware 2: Automatically parse incoming request bodies containing raw JSON into req.body
app.use(express.json());

// Connect to MongoDB. If it fails, translation still works; only login/history will fail.
try {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB connected');
} catch (err) {
  console.error('MongoDB connection failed:', err.message);
}

/**
 * Option 1: Google Translate public endpoint
 */
async function translateViaGoogle(text, sourceCode, targetCode) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(sourceCode)}&tl=${encodeURIComponent(targetCode)}&dt=t&q=${encodeURIComponent(text)}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
      }
    });

    if (!res.ok) throw new Error(`Google responded ${res.status}`);

    const data = await res.json();
    return data[0].map(chunk => chunk[0]).join('');
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Option 2: LibreTranslate via Argos Open Tech
 */
async function translateViaLibre(text, sourceCode, targetCode) {
  const url = 'https://translate.argosopentech.com/translate';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        q: text,
        source: sourceCode === 'auto' ? 'auto' : sourceCode,
        target: targetCode,
        format: 'text'
      })
    });

    if (!res.ok) throw new Error(`LibreTranslate responded ${res.status}`);
    const data = await res.json();
    if (!data?.translatedText) throw new Error('LibreTranslate returned no translation');

    return data.translatedText;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Option 3: Lingva Mirror Instance (fyralabs)
 */
async function translateViaLingva(text, sourceCode, targetCode) {
  const url = `https://lingva.fyralabs.com/api/v1/${encodeURIComponent(sourceCode)}/${encodeURIComponent(targetCode)}/${encodeURIComponent(text)}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`Lingva responded ${res.status}`);

    const data = await res.json();
    if (!data?.translation) throw new Error('Lingva returned no translation');

    return data.translation;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Option 4: MyMemory API (Last resort fallback)
 */
async function translateViaMyMemory(text, sourceCode, targetCode) {
  const sl = sourceCode === 'auto' ? 'en' : sourceCode;
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sl}|${targetCode}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`MyMemory responded ${res.status}`);

  const data = await res.json();
  const translated = data?.responseData?.translatedText;
  if (!translated) throw new Error('MyMemory returned no translation');

  return translated;
}

// Remember recent good translations
const translationCache = new Map();
const CACHE_LIMIT = 500;

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// Account routes
app.use('/api/auth', authRoutes);

// Translation route
app.post('/api/translate', async (req, res) => {
  const { text, sourceCode, targetCode } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'Text input is required.' });
  }

  const cacheKey = `${sourceCode}|${targetCode}|${text}`;
  if (translationCache.has(cacheKey)) {
    return res.json({ translated: translationCache.get(cacheKey) });
  }

  const remember = (translated) => {
    if (translationCache.size >= CACHE_LIMIT) {
      translationCache.delete(translationCache.keys().next().value);
    }
    translationCache.set(cacheKey, translated);
  };

  // Attempt 1: Google Translate
  try {
    const translated = await translateViaGoogle(text, sourceCode, targetCode);
    remember(translated);
    return res.json({ translated });
  } catch (err) {
    console.warn('Google failed:', err.message);
  }

  // Attempt 2: LibreTranslate
  try {
    const translated = await translateViaLibre(text, sourceCode, targetCode);
    console.log('Translated via LibreTranslate');
    remember(translated);
    return res.json({ translated });
  } catch (err) {
    console.warn('LibreTranslate failed:', err.message);
  }

  // Attempt 3: Lingva Mirror
  try {
    const translated = await translateViaLingva(text, sourceCode, targetCode);
    console.log('Translated via Lingva');
    remember(translated);
    return res.json({ translated });
  } catch (err) {
    console.warn('Lingva failed:', err.message);
  }

  // Attempt 4: MyMemory (Last Resort)
  try {
    const translated = await translateViaMyMemory(text, sourceCode, targetCode);
    console.log('Translated via MyMemory (last resort)');
    return res.json({ translated });
  } catch (err) {
    console.error('All providers failed:', err.message);
    return res.status(500).json({ error: 'Translation failed on all providers.' });
  }
});

// ---------- History routes (MongoDB) ----------

app.post('/api/history', requireAuth, async (req, res) => {
  try {
    const { sourceText, translatedText, sourceCode, targetCode } = req.body;
    const saved = await Translation.create({
      user: req.userId,
      sourceText,
      translatedText,
      sourceCode,
      targetCode,
    });
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: 'Could not save translation.' });
  }
});

app.get('/api/history', requireAuth, async (req, res) => {
  try {
    const items = await Translation.find({ user: req.userId }).sort({ createdAt: -1 }).limit(20);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Could not load history.' });
  }
});

app.delete('/api/history/:id', requireAuth, async (req, res) => {
  try {
    await Translation.findOneAndDelete({ _id: req.params.id, user: req.userId });
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: 'Could not delete translation.' });
  }
});

// Start listening for incoming network requests
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});