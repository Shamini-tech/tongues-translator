# 谷 Tongues - Fullstack Translation Web App

A full-stack, real-time language translation web application built with React and Express. Features multi-provider fallback translation logic to ensure high availability, user authentication, and persistent translation history backed by MongoDB.

![Tongues App](https://raw.githubusercontent.com/Shamini-tech/tongues-translator/main/frontend/src/assets/preview.png) <!-- Optional: Add a screenshot link -->

## 🚀 Key Features

* **Multi-Provider Fallback System:** Prevents rate-limiting and service downtime by seamlessly cycling through translation providers:
  1. Google Translate
  2. LibreTranslate
  3. Lingva Mirror
  4. MyMemory API (Last resort)
* **User Authentication:** Secure JWT-based register, login, and Google OAuth integration.
* **Translation History:** Logged-in users can save, view, and delete their translation history stored in MongoDB.
* **In-Memory Caching:** Caches recent translation pairs on the server to reduce redundant API calls and speed up responses.
* **Language Utilities:** Supports auto-language detection, speech-to-text input, and text-to-speech output.

---

## 🛠️ Tech Stack

* **Frontend:** React, Vite, CSS
* **Backend:** Node.js, Express.js
* **Database:** MongoDB (via Mongoose)
* **Authentication:** JSON Web Tokens (JWT), Google OAuth
* **APIs & Services:** Google Translate, LibreTranslate, Lingva, MyMemory API

---

## 📂 Project Structure

```text
tongues-fullstack/
├── backend/
│   ├── middleware/        # JWT Authentication Guard
│   ├── models/            # MongoDB Schemas (User, Translation)
│   ├── routes/            # Auth & User Routes
│   ├── .env               # Environment Variables (Ignored in Git)
│   └── server.js          # Express Server & Translation Logic
└── frontend/
    ├── src/
    │   ├── App.jsx        # Main Translator Interface
    │   ├── AuthPage.jsx   # Login & Registration Component
    │   └── Auth.css       # Authentication Styling
    └── package.json
