/**
 * Public routes — no auth required.
 * Returns real-time aggregate stats for the homepage.
 */
import express from 'express';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import Review from '../models/Review.js';

const router = express.Router();

// GET /api/public/stats
router.get('/stats', async (req, res) => {
  try {
    const [
      userCount,
      txCount,
      volumeAgg,
      reviewAgg,
    ] = await Promise.all([
      User.countDocuments(),
      Transaction.countDocuments(),
      Transaction.aggregate([
        { $match: { type: 'income' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Review.aggregate([
        { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
      ]),
    ]);

    const totalVolume  = volumeAgg[0]?.total  || 0;
    const avgRating    = reviewAgg[0]?.avg     || 0;
    const reviewCount  = reviewAgg[0]?.count   || 0;

    res.json({
      users:        userCount,
      transactions: txCount,
      volumeTracked: Math.round(totalVolume),
      avgRating:    Math.round(avgRating * 10) / 10,
      reviewCount,
    });
  } catch (err) {
    console.error('[public/stats]', err.message);
    res.status(500).json({ error: 'Could not fetch stats' });
  }
});

export default router;
