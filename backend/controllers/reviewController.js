import Review from '../models/Review.js';

// GET /api/reviews — public, returns latest 20 reviews
export const getReviews = async (req, res) => {
  try {
    const reviews = await Review.find()
      .sort({ createdAt: -1 })
      .limit(20)
      .select('name rating content createdAt');
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/reviews — authenticated, upsert (one per user)
export const upsertReview = async (req, res) => {
  try {
    const { rating, content } = req.body;
    if (!rating || !content?.trim()) {
      return res.status(400).json({ error: 'rating and content are required' });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'rating must be 1–5' });
    }

    const review = await Review.findOneAndUpdate(
      { user: req.user._id },
      { user: req.user._id, name: req.user.name, rating: Number(rating), content: content.trim() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json(review);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/reviews/mine — returns the current user's own review if it exists
export const getMyReview = async (req, res) => {
  try {
    const review = await Review.findOne({ user: req.user._id });
    res.json(review || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
