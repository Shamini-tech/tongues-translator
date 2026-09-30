// Load variables from backend/.env (e.g. MONGODB_URI) into process.env
import 'dotenv/config';
// Import the Express framework to create our HTTP web server
import express from 'express';
// Import CORS middleware to allow cross-origin requests from our React frontend (port 5173)
import cors from 'cors';
// Import node-fetch to make HTTP requests from Node.js to external APIs (Google & MyMemory)
import fetch from 'node-fetch';
// Import Mongoose to talk to MongoDB
import mongoose from 'mongoose';
// Import the Translation model (history of saved translations)
import Translation from './models/Translation.js';

// Initialize the Express application instance
const app = express();
// Use the port given by the host (Render) or fall back to 5000 locally
const PORT = process.env.PORT || 5000;

// Middleware 1: Enable CORS so browsers permit port 5173 to talk to port 5000
app.use(cors());
// Middleware 2: Automatically parse incoming request bodies containing raw JSON into req.body
app.use(express.json());

// Connect to MongoDB. If it fails, translation still works; only /api/history will fail.
try {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB connected');
} catch (err) {
  console.error('MongoDB connection failed:', err.message);
}

/**
 * Helper function to translate text via Google Translate's public endpoint.
 * @param {string} text - The input string to translate
 * @param {string} sourceCode - Source language code (e.g., 'en' or 'auto')
 * @param {string} targetCode - Target language code (e.g., 'es')
 */
async function translateViaGoogle(text, sourceCode, targetCode) {
  // Format the URL with query parameters, using encodeURIComponent to handle spaces/symbols safely
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceCode}&tl=${targetCode}&dt=t&q=${encodeURIComponent(text)}`;

  // Send an asynchronous GET request to Google's translation service
  const res = await fetch(url);
  // Throw an error if Google returns an HTTP error status code (e.g., 429 Rate Limited or 500 Server Error)
  if (!res.ok) throw new Error(`Google responded ${res.status}`);

  // Parse the raw response into a JSON array
  const data = await res.json();

  // Google breaks long translations into array chunks: data[0] contains pairs like [['Hola', 'Hello']]
  // .map() extracts the translated string from each pair, and .join('') combines them into a full sentence
  return data[0].map(chunk => chunk[0]).join('');
}

/**
 * Fallback helper function to translate text via MyMemory API if Google fails.
 * @param {string} text - The input string to translate
 * @param {string} sourceCode - Source language code (e.g., 'en' or 'auto')
 * @param {string} targetCode - Target language code (e.g., 'es')
 */
async function translateViaMyMemory(text, sourceCode, targetCode) {
  // MyMemory does NOT support auto-detection ('auto'). If 'auto' is passed, default source language to 'en'
  const sl = sourceCode === 'auto' ? 'en' : sourceCode;

  // Format the MyMemory endpoint URL with language pairs (e.g., langpair=en|es)
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sl}|${targetCode}`;

  // Send an asynchronous GET request to MyMemory
  const res = await fetch(url);
  if (!res.ok) throw new Error(`MyMemory responded ${res.status}`);

  const data = await res.json();

  // Safely extract the translated string using optional chaining (?.) to prevent crashes
  const translated = data?.responseData?.translatedText;
  if (!translated) throw new Error('MyMemory returned no translation');

  return translated;
}

// Health check (useful for uptime pingers on free hosting)
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// Define POST endpoint route at '/api/translate'
app.post('/api/translate', async (req, res) => {
  // Destructure payload properties sent from the React client
  const { text, sourceCode, targetCode } = req.body;

  // Validation: Guard clause to return a 400 Bad Request error if input text is empty
  if (!text) {
    return res.status(400).json({ error: 'Text input is required.' });
  }

  try {
    // Attempt 1: Call Google Translate primary provider
    const translated = await translateViaGoogle(text, sourceCode, targetCode);
    // Return successful translation as JSON back to React
    res.json({ translated });
  } catch (err) {
    // Log warning if primary call fails
    console.warn('Google endpoint failed, falling back to MyMemory:', err.message);

    try {
      // Attempt 2: Failover to MyMemory secondary provider
      const fallbackTranslated = await translateViaMyMemory(text, sourceCode, targetCode);
      // Return fallback translation back to React
      res.json({ translated: fallbackTranslated });
    } catch (fallbackErr) {
      // If both Google and MyMemory fail, return a 500 Internal Server Error
      res.status(500).json({ error: 'Translation failed on all providers.' });
    }
  }
});

// ---------- History routes (MongoDB) ----------

// Save a translation to history
app.post('/api/history', async (req, res) => {
  try {
    const { sourceText, translatedText, sourceCode, targetCode } = req.body;
    const saved = await Translation.create({ sourceText, translatedText, sourceCode, targetCode });
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: 'Could not save translation.' });
  }
});

// Get the latest 20 saved translations, newest first
app.get('/api/history', async (req, res) => {
  try {
    const items = await Translation.find().sort({ createdAt: -1 }).limit(20);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Could not load history.' });
  }
});

// Delete one saved translation by its id
app.delete('/api/history/:id', async (req, res) => {
  try {
    await Translation.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: 'Could not delete translation.' });
  }
});

// Start listening for incoming network requests
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});