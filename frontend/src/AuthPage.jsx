import React, { useState } from "react";
import "./Auth.css";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isLogin) {
      console.log("Logging in with:", formData.email, formData.password);
    } else {
      console.log("Signing up with:", formData);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        {/* Header with Icon and Title aligned together */}
        <div className="auth-header">
          <div className="auth-logo">谷</div>
          <h1 className="auth-title">Tongues</h1>
        </div>

        <p className="auth-subtitle">
          {isLogin
            ? "Welcome back. Log in to continue."
            : "Create an account to save your translations."}
        </p>

        {/* Tab Toggle */}
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${isLogin ? "active" : ""}`}
            onClick={() => setIsLogin(true)}
          >
            Log in
          </button>
          <button
            type="button"
            className={`auth-tab ${!isLogin ? "active" : ""}`}
            onClick={() => setIsLogin(false)}
          >
            Create account
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <input
              type="text"
              name="fullName"
              placeholder="Full name"
              value={formData.fullName}
              onChange={handleChange}
              className="auth-input"
              required
            />
          )}

          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            className="auth-input"
            required
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            className="auth-input"
            required
          />

          <button type="submit" className="auth-submit-btn">
            {isLogin ? "Log in" : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
}