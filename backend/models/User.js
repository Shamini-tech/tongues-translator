import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    // Emails are stored lowercase so "A@x.com" and "a@x.com" are the same account
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Missing for accounts created with Google sign-in
    passwordHash: { type: String },
    // Google's unique id for this person (set for Google sign-in accounts)
    googleId: { type: String, index: true, sparse: true },
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);