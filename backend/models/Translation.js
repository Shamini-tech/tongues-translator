import mongoose from "mongoose";

const translationSchema = new mongoose.Schema(
  {
    sourceText: { type: String, required: true },
    translatedText: { type: String, required: true },
    sourceCode: { type: String, required: true },
    targetCode: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Translation", translationSchema);