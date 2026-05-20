import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema({
  name:      { type: String, required: true },
  quantity:  { type: Number, default: 1 },
  unitPrice: { type: Number, default: 0 },
  amount:    { type: Number, required: true },
}, { _id: false });

const billSchema = new mongoose.Schema({
  user:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:          { type: String, required: true, trim: true },
  billType:      { type: String, enum: ['shopping', 'utility', 'food', 'other'], default: 'other' },
  category:      { type: String, default: 'Other' },
  date:          { type: Date, required: true },
  deadline:      { type: Date, default: null },
  isPaid:        { type: Boolean, default: false },
  items:         { type: [itemSchema], default: [] },
  totalAmount:   { type: Number, default: 0 },
  subtotal:      { type: Number, default: 0 },
  taxes:         { type: Number, default: 0 },
  discount:      { type: Number, default: 0 },
  merchant:      { type: String, default: '' },
  billingPeriod: { type: String, default: '' },
  note:          { type: String, maxlength: 1000, default: '' },
}, { timestamps: true });

billSchema.index({ user: 1, date: -1 });

export default mongoose.model('Bill', billSchema);
