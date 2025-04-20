// controllers/suggestionController.js
import Suggestion from '../models/other/suggestionModel.js';
import { sendEmailNotification } from '../utils/emailService.js';
import { AsyncHandler } from "../utils/responseUtils.js";

export const createSuggestion = AsyncHandler(async (req, res) => {
  const { subject, description } = req.body;
  
  if (!subject || !description) {
    return res.status(400).json({ success: false, message: 'Subject and description are required' });
  }
  
  const suggestion = new Suggestion({
    subject,
    description
  });
  
  await suggestion.save();
  
  // Send email notification
  sendEmailNotification('New Suggestion', `Subject: ${subject}\nDescription: ${description}`);
  
  res.status(201).json({ success: true, message: 'Suggestion submitted successfully' });
});