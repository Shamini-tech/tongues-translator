import mongoose from 'mongoose';

const translationSchema = new mongoose.Schema(
  {
    // Which account saved this translation
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sourceText: { type: String, required: true },
    translatedText: { type: String, required: true },
    sourceCode: { type: String, required: true },
    targetCode: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model('Translation', translationSchema);