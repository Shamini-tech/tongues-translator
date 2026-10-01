import React, { useState, useEffect } from "react";
import AuthPage from "./AuthPage";
import "./App.css";

const QUICK_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "hi", label: "Hindi" },
  { code: "zh", label: "Chinese" },
  { code: "fr", label: "French" },
  { code: "ar", label: "Arabic" },
  { code: "pt", label: "Portuguese" },
  { code: "ru", label: "Russian" },
  { code: "bn", label: "Bengali" },
  { code: "ja", label: "Japanese" },
];

const LANGUAGE_MAP = {
  auto: "English",
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  hi: "Hindi",
  zh: "Chinese",
  ar: "Arabic",
  pt: "Portuguese",
  ru: "Russian",
  bn: "Bengali",
  ja: "Japanese",
};

export default function App() {
  // Set to true so it skips the login page and opens the translator directly
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [sourceLang, setSourceLang] = useState("auto");
  const [targetLang, setTargetLang] = useState("es");
  const [inputText, setInputText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [savedItems, setSavedItems] = useState([
    {
      id: 1,
      sourceLabel: "English",
      targetLabel: "de",
      original: "How are you?",
      translated: "Wie geht es dir?",
    },
    {
      id: 2,
      sourceLabel: "English",
      targetLabel: "French",
      original: "Thank you",
      translated: "Merci",
    },
    {
      id: 3,
      sourceLabel: "English",
      targetLabel: "Spanish",
      original: "Good morning",
      translated: "Buenos días",
    },
    {
      id: 4,
      sourceLabel: "English",
      targetLabel: "Spanish",
      original: "hello",
      translated: "hola",
    },
  ]);

  const translateText = async (text, fromLang, toLang) => {
    if (!text.trim()) {
      setTranslatedText("");
      return;
    }

    setIsLoading(true);
    try {
      const src = fromLang === "auto" ? "en" : fromLang;
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
        text
      )}&langpair=${src}|${toLang}`;

      const response = await fetch(url);
      const data = await response.json();
      
      if (data && data.responseData && data.responseData.translatedText) {
        setTranslatedText(data.responseData.translatedText);
      }
    } catch (error) {
      console.error("Translation error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    const timer = setTimeout(() => {
      if (inputText) {
        translateText(inputText, sourceLang, targetLang);
      } else {
        setTranslatedText("");
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [inputText, sourceLang, targetLang, isAuthenticated]);

  const handleSwap = () => {
    if (sourceLang === "auto") return;
    const temp = sourceLang;
    setSourceLang(targetLang);
    setTargetLang(temp);
    setInputText(translatedText);
    setTranslatedText(inputText);
  };

  const handleSaveTranslation = () => {
    if (!translatedText.trim()) return;
    const newItem = {
      id: Date.now(),
      sourceLabel: LANGUAGE_MAP[sourceLang] || "English",
      targetLabel: LANGUAGE_MAP[targetLang] || targetLang,
      original: inputText,
      translated: translatedText,
    };
    if (!savedItems.some((item) => item.translated === translatedText)) {
      setSavedItems([newItem, ...savedItems]);
    }
  };

  const handleDeleteSaved = (id) => {
    setSavedItems(savedItems.filter((item) => item.id !== id));
  };

  if (!isAuthenticated) {
    return <AuthPage onAuthSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="translator-wrapper">
      <div className="translator-container">
        {/* Header */}
        <header className="app-header">
          <div className="brand-section">
            <div className="app-logo">谷</div>
            <h1 className="app-title">Tongues</h1>
          </div>
          <p className="header-tagline">
            Type it, say it, understand it — in any<br />language.
          </p>
        </header>

        {/* Dropdowns Bar */}
        <div className="dropdown-bar">
          <select
            className="lang-dropdown"
            value={sourceLang}
            onChange={(e) => setSourceLang(e.target.value)}
          >
            <option value="auto">Detect language</option>
            <option value="en">English</option>
            <option value="es">Spanish — Español</option>
            <option value="fr">French — Français</option>
            <option value="de">German — Deutsch</option>
            <option value="hi">Hindi — हिन्दी</option>
          </select>

          <button className="swap-circle-btn" onClick={handleSwap} title="Swap Languages">
            ⇄
          </button>

          <select
            className="lang-dropdown"
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
          >
            <option value="es">Spanish — Español</option>
            <option value="en">English</option>
            <option value="fr">French — Français</option>
            <option value="de">German — Deutsch</option>
            <option value="hi">Hindi — हिन्दी</option>
          </select>
        </div>

        {/* Translation Cards */}
        <div className="cards-grid">
          {/* Input Card */}
          <div className="translation-card">
            <textarea
              className="translation-textarea"
              placeholder="Type here, or tap the microphone to speak..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              maxLength={2000}
            />
            <div className="card-toolbar">
              <button className="icon-action-btn" title="Speak input">🎙️</button>
              <span className="char-counter">{inputText.length} / 2000</span>
              {inputText && (
                <button
                  className="icon-action-btn"
                  onClick={() => {
                    setInputText("");
                    setTranslatedText("");
                  }}
                  title="Clear input"
                >
                  🗑️
                </button>
              )}
            </div>
          </div>

          {/* Output Card */}
          <div className="translation-card">
            <textarea
              className="translation-textarea"
              placeholder={isLoading ? "Translating..." : "Your translation will appear here."}
              value={translatedText}
              readOnly
            />
            <div className="card-toolbar">
              <div className="left-icons">
                <button className="icon-action-btn" title="Listen to translation">🔊</button>
              </div>

              <div className="right-icons">
                <button
                  className="icon-action-btn"
                  onClick={() => navigator.clipboard.writeText(translatedText)}
                  title="Copy translation"
                  disabled={!translatedText}
                >
                  📋
                </button>
                <button
                  className="icon-action-btn"
                  onClick={handleSaveTranslation}
                  title="Save translation"
                  disabled={!translatedText}
                >
                  🔖
                </button>
                <button
                  className="icon-action-btn"
                  onClick={() => setTranslatedText("")}
                  title="Clear output"
                  disabled={!translatedText}
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Languages */}
        <div className="quick-languages-section">
          <div className="quick-title">Quick languages</div>
          <div className="quick-pills">
            {QUICK_LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                className={`pill-btn ${targetLang === lang.code ? "active" : ""}`}
                onClick={() => setTargetLang(lang.code)}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        {/* Saved Translations Section Directly Below Quick Languages */}
        {savedItems.length > 0 && (
          <div className="saved-section">
            <div className="saved-list">
              {savedItems.map((item) => (
                <div key={item.id} className="saved-card">
                  <div className="saved-content">
                    <span className="saved-language-tag">
                      {item.sourceLabel} → {item.targetLabel}
                    </span>
                    <p className="saved-original">{item.original}</p>
                    <p className="saved-translated">{item.translated}</p>
                  </div>
                  <button
                    className="delete-saved-btn"
                    onClick={() => handleDeleteSaved(item.id)}
                    title="Remove item"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}