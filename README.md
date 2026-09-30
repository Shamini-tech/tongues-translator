# Tongues 谷

**Type it, say it, understand it — in any language.**

Tongues is a full-stack translation web app. Type or speak text, get an instant translation, listen to it, copy it, and save your favourite translations to a MongoDB database so they are there next time you open the app.

---

## Features

- **Instant translation** with automatic language detection and a debounced auto-translate as you type
- **Reliable backend proxy** that uses Google Translate first and falls back to MyMemory if it fails or is rate-limited
- **Voice input** with the browser's Speech Recognition API
- **Text-to-speech** for the translated output
- **One-click copy** to the clipboard
- **Language swap** and quick-select chips for popular languages
- **Saved translations** stored in MongoDB, with the ability to reload an entry into the translator or delete it
- **Responsive layout** that stacks into one column on small screens

---

## Tech stack

| Layer     | Technology                                                             |
| --------- | ---------------------------------------------------------------------- |
| Frontend  | React, Vite, custom CSS, Web Speech API, Clipboard API                 |
| Backend   | Node.js, Express, CORS, node-fetch                                     |
| Database  | MongoDB with Mongoose                                                  |
| Services  | Google Translate public endpoint (primary), MyMemory API (fallback)    |

---

## Project structure

```
tongues-translator/
├── backend/
│   ├── models/
│   │   └── Translation.js      # Mongoose schema for saved translations
│   ├── server.js               # Express server, translation + history routes
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx             # Main React component
│   │   ├── App.css             # Styles
│   │   ├── languages.js        # Language list and quick-select chips
│   │   └── main.jsx
│   └── package.json
└── README.md
```

---

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) 18 or newer
- A MongoDB database: either [MongoDB Community Server](https://www.mongodb.com/try/download/community) running locally, or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster

### 1. Clone the repository

```bash
git clone https://github.com/Shamini-tech/tongues-translator.git
cd tongues-translator
```

### 2. Set up the backend

```bash
cd backend
npm install
```

Create a file named `.env` inside `backend/`:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/tongues
```

For MongoDB Atlas, use your Atlas connection string instead, with `/tongues` as the database name.

Start the server:

```bash
npm start
```

You should see `MongoDB connected` and `Backend server running on http://localhost:5000`.

### 3. Set up the frontend

Open a second terminal:

```bash
cd frontend
npm install
```

Create a file named `.env` inside `frontend/`:

```env
VITE_API_URL=http://localhost:5000
```

Start the development server:

```bash
npm run dev
```

Open the address Vite prints, usually `http://localhost:5173`.

---

## API reference

Base URL: `http://localhost:5000`

| Method   | Endpoint            | Description                               |
| -------- | ------------------- | ----------------------------------------- |
| `POST`   | `/api/translate`    | Translate text                            |
| `GET`    | `/api/health`       | Health check                              |
| `POST`   | `/api/history`      | Save a translation                        |
| `GET`    | `/api/history`      | Get the 20 most recent saved translations |
| `DELETE` | `/api/history/:id`  | Delete a saved translation                |

### Translate

```http
POST /api/translate
Content-Type: application/json

{
  "text": "Good morning",
  "sourceCode": "auto",
  "targetCode": "es"
}
```

Response:

```json
{ "translated": "Buenos días" }
```

### Save a translation

```http
POST /api/history
Content-Type: application/json

{
  "sourceText": "Good morning",
  "translatedText": "Buenos días",
  "sourceCode": "en",
  "targetCode": "es"
}
```

---

## Data model

Each saved translation is stored in the `translations` collection of the `tongues` database:

| Field            | Type     | Notes                         |
| ---------------- | -------- | ----------------------------- |
| `sourceText`     | String   | Original text (required)      |
| `translatedText` | String   | Translated text (required)    |
| `sourceCode`     | String   | Source language code, or `auto` |
| `targetCode`     | String   | Target language code          |
| `createdAt`      | Date     | Added automatically           |
| `updatedAt`      | Date     | Added automatically           |

---

## Deployment

The app can be hosted on free tiers:

1. **Database:** create a free MongoDB Atlas cluster and copy its connection string.
2. **Backend:** deploy the `backend` folder as a web service on [Render](https://render.com). Set the build command to `npm install`, the start command to `npm start`, and add `MONGODB_URI` as an environment variable.
3. **Frontend:** deploy the `frontend` folder on [Vercel](https://vercel.com) or Netlify, and set `VITE_API_URL` to your Render backend URL.

Free Render services sleep after a period of inactivity, so the first request after a quiet spell can take up to a minute.

---

## Notes and limitations

- The Google Translate endpoint used here is an unofficial public endpoint and may be rate-limited; MyMemory acts as the fallback.
- MyMemory does not support automatic language detection, so the fallback assumes English when the source is set to auto-detect.
- Voice input depends on the browser's Speech Recognition support and works best in Chrome and Edge over HTTPS or `localhost`.
- Saved translations are shared across all users; there is no login or per-user history yet.

---

## Future improvements

- User accounts and per-user saved translations
- Search and filtering for saved translations
- Translation history for the current session
- Official translation API integration for production use

---

## Author

Built by [Shamini-tech](https://github.com/Shamini-tech).
