// Import React hooks for managing state, lifecycle side-effects, and persistent values
import { useState, useEffect, useRef } from 'react';
// Import language arrays from our central configuration file
import { LANGUAGES, QUICK } from './languages';
// Import custom styling rules
import './App.css';

// Backend address: from frontend/.env (VITE_API_URL) or localhost as a fallback
const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function App() {
  // State 1: Input text typed or spoken by the user
  const [sourceText, setSourceText] = useState('');
  // State 2: Output translation string returned from backend
  const [outputText, setOutputText] = useState('');
  // State 3: Selected source language ('auto' or language name)
  const [sourceLang, setSourceLang] = useState('auto');
  // State 4: Selected target language (e.g., 'Spanish')
  const [targetLang, setTargetLang] = useState('Spanish');
  // State 5: Boolean flag indicating if an API call is actively in progress
  const [isTranslating, setIsTranslating] = useState(false);
  // State 6: Boolean flag indicating if microphone recording is active
  const [isRecording, setIsRecording] = useState(false);
  // State 7: Saved translations loaded from MongoDB
  const [history, setHistory] = useState([]);
  // State 8: Feedback after clicking Save ('', 'saved' or 'error')
  const [saveStatus, setSaveStatus] = useState('');
  // Maximum character limit permitted in input box
  const MAX_CHARS = 2000;
  // useRef sequence counter to track request order and solve race conditions
  const translateSeq = useRef(0);

  // Helper function: Find matching language object by name, or return null
  const getLang = (name) => LANGUAGES.find(l => l.name === name) || null;

  // Helper: Convert a saved language code (e.g. 'es') back to a display name (e.g. 'Spanish')
  const codeToName = (code) => LANGUAGES.find(l => l.tr === code)?.name || null;
  // Helper: Label shown in the history list
  const langLabel = (code) => (code === 'auto' ? 'Auto' : codeToName(code) || code);

  // Helper: Current source/target language codes for the backend
  const getCodes = () => ({
    srcCode: sourceLang === 'auto' ? 'auto' : (getLang(sourceLang)?.tr || 'auto'),
    tgtCode: getLang(targetLang)?.tr || 'es'
  });

  // Load saved translations from the backend
  const loadHistory = async () => {
    try {
      const res = await fetch(`${API}/api/history`);
      if (!res.ok) throw new Error(`History request failed: ${res.status}`);
      const data = await res.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Could not load history:', err);
    }
  };

  // Load history once when the page opens
  useEffect(() => {
    loadHistory();
  }, []);

  // React useEffect Hook: Handles automatic translation triggering and debouncing
  useEffect(() => {
    // If text box is empty or only whitespace, clear output and skip API call
    if (!sourceText.trim()) {
      setOutputText('');
      return;
    }

    // DEBOUNCE: Delay API call by 500ms so we don't send requests on every single keystroke
    const timer = setTimeout(async () => {
      setIsTranslating(true);
      // Increment sequence counter for every new translation request
      const currentSeq = ++translateSeq.current;

      // Extract ISO language codes for backend parameters
      const { srcCode, tgtCode } = getCodes();

      try {
        // Send POST request to our Node.js Express backend proxy
        const res = await fetch(`${API}/api/translate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: sourceText, sourceCode: srcCode, targetCode: tgtCode })
        });

        const data = await res.json();

        // RACE CONDITION GUARD: If a newer request was sent while this one was fetching, ignore stale data
        if (currentSeq !== translateSeq.current) return;

        // Update translation output state if data is returned
        if (data.translated) {
          setOutputText(data.translated);
        }
      } catch (err) {
        console.error('Translation error:', err);
      } finally {
        // Only turn off loading indicator if this is still the active sequence
        if (currentSeq === translateSeq.current) setIsTranslating(false);
      }
    }, 500);

    // CLEANUP FUNCTION: Cancels pending timer if sourceText/sourceLang/targetLang changes before 500ms
    return () => clearTimeout(timer);
  }, [sourceText, sourceLang, targetLang]);

  // Handler: Swaps source and target language selections and text values
  const handleSwap = () => {
    if (sourceLang === 'auto') return; // Cannot swap if source is set to auto-detect
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    setSourceText(outputText);
  };

  // Handler: Copies translated text to clipboard using Web Clipboard API
  const handleCopy = async () => {
    if (outputText) await navigator.clipboard.writeText(outputText);
  };

  // Handler: Saves the current translation to MongoDB, then refreshes the history list
  const handleSave = async () => {
    if (!sourceText.trim() || !outputText) return;
    const { srcCode, tgtCode } = getCodes();

    try {
      const res = await fetch(`${API}/api/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceText,
          translatedText: outputText,
          sourceCode: srcCode,
          targetCode: tgtCode
        })
      });
      if (!res.ok) throw new Error(`Save failed: ${res.status}`);
      setSaveStatus('saved');
      loadHistory();
    } catch (err) {
      console.error('Could not save translation:', err);
      setSaveStatus('error');
    }
    // Hide the message after 2 seconds
    setTimeout(() => setSaveStatus(''), 2000);
  };

  // Handler: Deletes one saved translation
  const handleDelete = async (id) => {
    try {
      const res = await fetch(`${API}/api/history/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
      setHistory(prev => prev.filter(item => item._id !== id));
    } catch (err) {
      console.error('Could not delete translation:', err);
    }
  };

  // Handler: Puts a saved translation back into the translator
  const handleReuse = (item) => {
    setSourceLang(item.sourceCode === 'auto' ? 'auto' : (codeToName(item.sourceCode) || 'auto'));
    setTargetLang(codeToName(item.targetCode) || targetLang);
    setSourceText(item.sourceText);
  };

  // Handler: Pronounces translated output text using Web SpeechSynthesis API
  const handleSpeak = () => {
    if (!outputText || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel(); // Stop any active speech
    const utter = new SpeechSynthesisUtterance(outputText); // Create speech instance
    const langObj = getLang(targetLang);
    if (langObj?.speech) utter.lang = langObj.speech; // Assign speech locale code (e.g., 'es-ES')
    window.speechSynthesis.speak(utter); // Speak text aloud
  };

  // Handler: Captures microphone input using Web SpeechRecognition API
  const handleMic = () => {
    const SpeechCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechCtor) return alert('Speech recognition not supported in this browser.');

    const recognizer = new SpeechCtor(); // Initialize recognition instance
    const langObj = getLang(sourceLang);
    recognizer.lang = langObj?.speech || 'en-US'; // Set recognition language

    recognizer.onstart = () => setIsRecording(true); // Turn on recording state/ui
    recognizer.onend = () => setIsRecording(false); // Turn off recording state/ui
    recognizer.onresult = (e) => {
      // Concatenate spoken audio result chunks into text transcript
      const transcript = Array.from(e.results).map(res => res[0].transcript).join('');
      setSourceText(prev => (prev + ' ' + transcript).trim().slice(0, MAX_CHARS));
    };

    recognizer.start(); // Open browser microphone listening mode
  };

  return (
    <div className="app-wrapper">
      {/* Header section with brand logo and slogan */}
      <header>
        <div className="brand">
          <div className="logo-icon">谷</div>
          <h1>Tongues</h1>
        </div>
        <div className="tagline">
          Type it, say it, understand it — in any language.
        </div>
      </header>

      {/* Main 3-column translation grid layout */}
      <div className="translator-grid">
        {/* LEFT COLUMN: Input controls & textarea */}
        <div className="column">
          <select
            className="dropdown-select"
            value={sourceLang}
            onChange={(e) => setSourceLang(e.target.value)}
          >
            <option value="auto">Detect language</option>
            {LANGUAGES.map(l => (
              <option key={l.name} value={l.name}>{l.name} — {l.native}</option>
            ))}
          </select>

          <div className="panel">
            <textarea
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value.slice(0, MAX_CHARS))}
              placeholder="Type here, or tap the microphone to speak…"
            />
            <div className="panel-footer">
              <button className="icon-btn" onClick={handleMic} style={{ color: isRecording ? '#ef4444' : '' }}>
                🎤
              </button>
              <span>{sourceText.length} / {MAX_CHARS}</span>
              <button className="icon-btn" onClick={() => setSourceText('')}>🗑️</button>
            </div>
          </div>
        </div>

        {/* MIDDLE COLUMN: Swap language button */}
        <button className="swap-btn" onClick={handleSwap} disabled={sourceLang === 'auto'}>
          ⇆
        </button>

        {/* RIGHT COLUMN: Output controls & translated text */}
        <div className="column">
          <select
            className="dropdown-select"
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
          >
            {LANGUAGES.map(l => (
              <option key={l.name} value={l.name}>{l.name} — {l.native}</option>
            ))}
          </select>

          <div className="panel">
            <div className="output-content">
              {isTranslating ? (
                <span className="placeholder-text">Translating…</span>
              ) : outputText ? (
                outputText
              ) : (
                <span className="placeholder-text">Your translation will appear here.</span>
              )}
            </div>
            <div className="panel-footer">
              <button className="icon-btn" onClick={handleSpeak} disabled={!outputText}>🔊</button>
              <button className="icon-btn" onClick={handleCopy} disabled={!outputText}>📋</button>
              <button
                className="icon-btn"
                onClick={handleSave}
                disabled={!outputText || isTranslating}
                title="Save this translation"
              >
                💾
              </button>
              {saveStatus === 'saved' && <span className="save-status">Saved ✓</span>}
              {saveStatus === 'error' && <span className="save-status error">Could not save</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Quick selection chips section */}
      <div className="quick-section">
        <h3>Quick languages</h3>
        <div className="quick-chips">
          {QUICK.map(name => (
            <button
              key={name}
              className={`chip ${targetLang === name ? 'active' : ''}`}
              onClick={() => setTargetLang(name)}
            >
              {name.replace(' (Simplified)', '')}
            </button>
          ))}
        </div>
      </div>

      {/* Saved translations loaded from MongoDB */}
      <div className="history-section">
        <h3>Saved translations</h3>
        {history.length === 0 ? (
          <p className="placeholder-text">Nothing saved yet. Translate something and tap 💾.</p>
        ) : (
          <ul className="history-list">
            {history.map(item => (
              <li key={item._id} className="history-item">
                <button
                  className="history-main"
                  onClick={() => handleReuse(item)}
                  title="Use this translation again"
                >
                  <span className="history-langs">
                    {langLabel(item.sourceCode)} → {langLabel(item.targetCode)}
                  </span>
                  <span className="history-source">{item.sourceText}</span>
                  <span className="history-target">{item.translatedText}</span>
                </button>
                <button
                  className="icon-btn"
                  onClick={() => handleDelete(item._id)}
                  title="Delete"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}