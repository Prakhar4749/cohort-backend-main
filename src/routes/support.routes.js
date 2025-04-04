
import { Router } from 'express';
import { createSuggestion } from '../controller/suggestionController.js';
import { getAllFAQs, searchFAQs } from '../controller/faqController.js';
import { authMiddleware } from "../middleware/auth.middleware.js";

import { initChat } from '../controller/chatController.js';

const router = Router();

router.use(authMiddleware);

router.post('/suggestion', createSuggestion);

router.get('/faq', getAllFAQs);
router.get('/faq/search', searchFAQs);

router.post('/init', initChat);

export default router;