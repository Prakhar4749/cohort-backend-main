
// models/faqModel.js
import mongoose from 'mongoose';

const FAQSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true
  },
  answer: {
    type: String,
    required: true
  },
  category: String,
  popularity: {
    type: Number,
    default: 0
  }
});

export default mongoose.model('FAQ', FAQSchema);