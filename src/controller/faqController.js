// controllers/faqController.js
import FAQ from '../models/other/faqModel.js';
import { AsyncHandler } from '../utils/server-utils.js';

export const getAllFAQs = AsyncHandler(async (req, res) => {
  const faqs = await FAQ.find().sort({ popularity: -1 });
  res.status(200).json({ success: true, data: faqs });
});

export const searchFAQs = AsyncHandler(async (req, res) => {
  const { query } = req.query;
  
  if (!query) {
    return res.status(400).json({ success: false, message: 'Search query is required' });
  }
  
  const faqs = await FAQ.find({ 
    $or: [
      { question: { $regex: query, $options: 'i' } },
      { answer: { $regex: query, $options: 'i' } }
    ]
  }).sort({ popularity: -1 });
  
  res.status(200).json({ success: true, data: faqs });
});