// models/suggestionModel.js
import mongoose from 'mongoose';

const SuggestionSchema = new mongoose.Schema({
  subject: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Suggestion', SuggestionSchema);