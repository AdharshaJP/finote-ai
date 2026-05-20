import express from 'express';
import auth from '../middleware/auth.js';
import { getReviews, upsertReview, getMyReview } from '../controllers/reviewController.js';

const router = express.Router();

router.get('/', getReviews);
router.get('/mine', auth, getMyReview);
router.post('/', auth, upsertReview);

export default router;
