import express from 'express';
import multer from 'multer';
import { createWorker } from 'tesseract.js';
import Groq from 'groq-sdk';
import Bill from '../models/Bill.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Memory storage — no files saved to disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ['image/jpeg','image/jpg','image/png','image/webp','application/pdf'];
    ok.includes(file.mimetype) ? cb(null, true) : cb(new Error('Only images and PDFs allowed'));
  },
});

const VALID_CATS  = ['Food','Transportation','Entertainment','Shopping','Bills','Healthcare','Education','Travel','Investment','Other'];
const VALID_TYPES = ['shopping','utility','food','other'];

// ── OCR ───────────────────────────────────────────────────────────────────────
async function extractText(buffer, mimetype) {
  if (mimetype === 'application/pdf') {
    try {
      const { default: pdfParse } = await import('pdf-parse/lib/pdf-parse.js');
      const data = await pdfParse(buffer);
      return (data.text || '').trim();
    } catch { return ''; }
  }
  const worker = await createWorker('eng');
  try {
    const { data: { text } } = await worker.recognize(buffer);
    return (text || '').trim();
  } finally {
    await worker.terminate();
  }
}

// ── AI parse with individual items ────────────────────────────────────────────
async function parseWithAI(rawText) {
  const groq  = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const today = new Date().toISOString().split('T')[0];

  const prompt = `You are a receipt/bill parser. Extract all data carefully.
Return ONLY valid JSON (no markdown):

{
  "billType": "shopping" | "utility" | "food" | "other",
  "merchant": "store or company name",
  "date": "YYYY-MM-DD",
  "billingPeriod": "e.g. March 2024 — only for utility bills, else null",
  "category": "${VALID_CATS.join('|')}",
  "items": [
    { "name": "item or charge name", "quantity": 1, "unitPrice": 0.00, "amount": 0.00 }
  ],
  "subtotal": 0.00,
  "taxes": 0.00,
  "discount": 0.00,
  "totalAmount": 0.00
}

Rules:
- "shopping": grocery, retail, pharmacy, clothing stores
- "utility": electricity, water, gas, internet, phone, cable TV
- "food": restaurants, cafes, food delivery (Swiggy, Zomato)
- Extract EVERY line item individually — do NOT aggregate
- For utility: extract each charge component (energy units, fixed charge, surcharge, GST)
- totalAmount is the final payable amount
- Use today ${today} if date not found

Bill text:
${rawText.slice(0, 4000)}`;

  const res = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1,
    max_tokens: 1000,
  });

  const match = res.choices[0].message.content.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON in AI response');
  const p = JSON.parse(match[0]);

  return {
    billType:      VALID_TYPES.includes(p.billType) ? p.billType : 'other',
    merchant:      typeof p.merchant === 'string' && p.merchant.trim() ? p.merchant.trim() : 'Unknown',
    date:          p.date && /^\d{4}-\d{2}-\d{2}$/.test(p.date) ? p.date : today,
    billingPeriod: p.billingPeriod || null,
    category:      VALID_CATS.includes(p.category) ? p.category : 'Other',
    items: Array.isArray(p.items)
      ? p.items
          .map(i => ({
            name:      String(i.name || '').trim(),
            quantity:  Math.max(0, Number(i.quantity) || 1),
            unitPrice: Math.max(0, Number(i.unitPrice) || 0),
            amount:    Math.max(0, Number(i.amount) || 0),
          }))
          .filter(i => i.name && i.amount > 0)
      : [],
    subtotal:    Math.max(0, Number(p.subtotal)    || 0),
    taxes:       Math.max(0, Number(p.taxes)       || 0),
    discount:    Math.max(0, Number(p.discount)    || 0),
    totalAmount: Math.max(0, Number(p.totalAmount) || 0),
  };
}

// ── POST /api/bills/scan — OCR + AI, no DB write ──────────────────────────────
router.post('/scan', auth, upload.single('bill'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    let rawText = '';
    try { rawText = await extractText(req.file.buffer, req.file.mimetype); } catch { /* ignore */ }

    if (!rawText.trim()) {
      return res.status(422).json({ error: 'Could not read text from this image. Try a clearer photo.' });
    }

    let extracted = null;
    let parseError = null;
    const today = new Date().toISOString().split('T')[0];

    try {
      extracted = await parseWithAI(rawText);
    } catch {
      parseError = 'AI could not parse the bill — please fill in the details manually.';
      extracted = { billType:'other', merchant:'Unknown', date: today, billingPeriod:null,
        category:'Other', items:[], subtotal:0, taxes:0, discount:0, totalAmount:0 };
    }

    res.json({ extracted, parseError });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/bills — list with filters ───────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const { month, status } = req.query;
    const query = { user: req.user._id };

    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [y, m] = month.split('-').map(Number);
      query.date = { $gte: new Date(y, m - 1, 1), $lt: new Date(y, m, 1) };
    }
    if (status === 'paid')    query.isPaid = true;
    if (status === 'unpaid')  query.isPaid = false;
    if (status === 'duesoon') {
      const in7 = new Date(); in7.setDate(in7.getDate() + 7);
      Object.assign(query, { isPaid: false, deadline: { $lte: in7, $gte: new Date() } });
    }

    const bills = await Bill.find(query).sort({ date: -1, createdAt: -1 });
    res.json(bills);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// ── POST /api/bills — save bill ───────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const { name, billType, category, date, deadline, items, totalAmount,
            subtotal, taxes, discount, merchant, billingPeriod, note } = req.body;

    if (!name) return res.status(400).json({ message: 'name is required' });
    if (!date) return res.status(400).json({ message: 'date is required' });

    const autoPaid = ['shopping', 'food'].includes(billType);

    const bill = await Bill.create({
      user: req.user._id,
      name: name.trim(),
      billType:      billType      || 'other',
      category:      category      || 'Other',
      date:          new Date(date),
      deadline:      deadline ? new Date(deadline) : null,
      isPaid:        autoPaid,
      items:         Array.isArray(items) ? items : [],
      totalAmount:   Number(totalAmount)  || 0,
      subtotal:      Number(subtotal)     || 0,
      taxes:         Number(taxes)        || 0,
      discount:      Number(discount)     || 0,
      merchant:      merchant             || '',
      billingPeriod: billingPeriod        || '',
      note:          note?.trim()         || '',
    });

    res.status(201).json(bill);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── PUT /api/bills/:id ────────────────────────────────────────────────────────
router.put('/:id', auth, async (req, res) => {
  try {
    const bill = await Bill.findOne({ _id: req.params.id, user: req.user._id });
    if (!bill) return res.status(404).json({ message: 'Bill not found' });

    const editable = ['name','billType','category','date','deadline','isPaid','note','totalAmount','items'];
    editable.forEach(k => { if (req.body[k] !== undefined) bill[k] = req.body[k]; });
    await bill.save();
    res.json(bill);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// ── DELETE /api/bills/:id ─────────────────────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    const bill = await Bill.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!bill) return res.status(404).json({ message: 'Bill not found' });
    res.json({ message: 'Deleted' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
