import { useState } from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import './Auth.css';

// Backend address and Google client id come from frontend/.env
const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function AuthPage({ onAuth }) {
  // 'login' or 'register'
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Send a request to the backend and hand the result (token + user) to App
  const sendAuth = async (path, payload) => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong.');
      onAuth(data);
    } catch (err) {
      setError(err.message === 'Failed to fetch' ? 'Cannot reach the server. Is the backend running?' : err.message);
    } finally {
      setLoading(false);
    }
  };

  // Email + password form submit
  const handleSubmit = (e) => {
    e.preventDefault();
    if (mode === 'register') sendAuth('register', { name, email, password });
    else sendAuth('login', { email, password });
  };

  // Google gives us an ID token (credential); the server verifies it
  const handleGoogle = (response) => {
    if (response.credential) sendAuth('google', { credential: response.credential });
  };

  const switchMode = (next) => {
    setMode(next);
    setError('');
  };

  const content = (
    <div className="auth-card">
      <div className="auth-brand">
        <div className="logo-icon">谷</div>
        <h1>Tongues</h1>
      </div>
      <p className="auth-sub">
        {mode === 'login' ? 'Welcome back. Log in to continue.' : 'Create an account to save your translations.'}
      </p>

      <div className="auth-tabs">
        <button type="button" className={`auth-tab ${mode === 'login' ? 'active' : ''}`} onClick={() => switchMode('login')}>
          Log in
        </button>
        <button type="button" className={`auth-tab ${mode === 'register' ? 'active' : ''}`} onClick={() => switchMode('register')}>
          Create account
        </button>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        {mode === 'register' && (
          <input
            className="auth-input"
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            required
          />
        )}
        <input
          className="auth-input"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        <input
          className="auth-input"
          type="password"
          placeholder={mode === 'register' ? 'Password (at least 8 characters)' : 'Password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          required
        />

        {error && <div className="auth-error">{error}</div>}

        <button className="auth-submit" type="submit" disabled={loading}>
          {loading ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
        </button>
      </form>

      {GOOGLE_CLIENT_ID && (
        <>
          <div className="auth-divider">or</div>
          <div className="google-wrap">
            <GoogleLogin
              onSuccess={handleGoogle}
              onError={() => setError('Google sign-in was cancelled or failed.')}
            />
          </div>
        </>
      )}
    </div>
  );

  // The Google button only works inside the provider, and only if a client id is configured
  return GOOGLE_CLIENT_ID ? (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>{content}</GoogleOAuthProvider>
  ) : (
    content
  );
}