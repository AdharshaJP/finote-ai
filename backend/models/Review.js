import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  content: { type: String, required: true, trim: true, maxlength: 600 },
}, { timestamps: true });

// One review per user
reviewSchema.index({ user: 1 }, { unique: true });

export default mongoose.model('Review', reviewSchema);
