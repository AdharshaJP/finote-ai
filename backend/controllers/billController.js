import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createWorker } from "tesseract.js";
import Groq from "groq-sdk";
import Transaction from "../models/Transaction.js";
import mongoose from "mongoose";

// ── Resolve absolute uploads path and create it if missing ────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// ── Multer config ─────────────────────────────────────────────────────────────
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `bill-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only images (JPG, PNG, WebP) and PDFs are allowed"));
    }
  },
});

export const uploadMiddleware = upload.single("bill");

// ── Valid categories (must match Transaction model enum) ──────────────────────
const VALID_CATEGORIES = [
  "Food", "Transportation", "Entertainment", "Shopping",
  "Bills", "Healthcare", "Education", "Travel", "Investment", "Other",
];

// ── OCR / text extraction ─────────────────────────────────────────────────────
async function extractText(filePath, mimetype) {
  // PDF: use pdf-parse to pull embedded text
  if (mimetype === "application/pdf") {
    try {
      const { default: pdfParse } = await import("pdf-parse/lib/pdf-parse.js");
      const buffer = fs.readFileSync(filePath);
      const data = await pdfParse(buffer);
      return (data.text || "").trim();
    } catch {
      return ""; // image-only PDF — fall through to OCR if needed
    }
  }

  // Image: Tesseract OCR — use local traineddata if available
  const langPath = path.join(__dirname, '..');
  const worker = await createWorker("eng", 1, { langPath });
  try {
    const {
      data: { text },
    } = await worker.recognize(filePath);
    return (text || "").trim();
  } finally {
    await worker.terminate();
  }
}

// ── Auto-categorize by keywords (fallback if AI returns unknown) ──────────────
function categorizeByKeyword(text, merchant) {
  const combined = `${text} ${merchant}`.toLowerCase();
  if (/restaurant|cafe|coffee|pizza|food|eat|swiggy|zomato|burger|biryani|sushi/.test(combined)) return "Food";
  if (/uber|ola|metro|bus|train|fuel|petrol|cab|taxi|auto/.test(combined)) return "Transportation";
  if (/netflix|amazon|spotify|movie|cinema|game|entertainment/.test(combined)) return "Entertainment";
  if (/amazon|flipkart|myntra|mall|shop|store|cloth/.test(combined)) return "Shopping";
  if (/electricity|water|gas|wifi|internet|phone|bill|recharge/.test(combined)) return "Bills";
  if (/hospital|pharmacy|medicine|doctor|clinic|health|medical/.test(combined)) return "Healthcare";
  if (/school|college|university|course|book|education|tuition/.test(combined)) return "Education";
  if (/hotel|flight|airbnb|booking|travel|trip|holiday/.test(combined)) return "Travel";
  if (/mutual fund|sip|stock|investment|zerodha|groww/.test(combined)) return "Investment";
  return "Other";
}

// ── AI parsing via Groq ───────────────────────────────────────────────────────
async function parseWithAI(rawText) {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const today = new Date().toISOString().split("T")[0];

  const prompt = `Extract structured financial data from this bill or receipt text.
Return ONLY a valid JSON object — no explanation, no markdown.

Required format:
{
  "amount": <number — the final total amount paid, required>,
  "category": <string — one of: Food, Transportation, Entertainment, Shopping, Bills, Healthcare, Education, Travel, Investment, Other>,
  "date": <string — YYYY-MM-DD format; use "${today}" if not found>,
  "merchant": <string — store or vendor name; use "Unknown" if not found>
}

Bill text:
${rawText.slice(0, 3000)}

Return ONLY the JSON.`;

  const res = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.1,
    max_tokens: 300,
  });

  const content = res.choices[0].message.content.trim();

  // Strip markdown code fences if present
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("AI response did not contain JSON");

  const parsed = JSON.parse(jsonMatch[0]);

  const amount =
    typeof parsed.amount === "number" && parsed.amount > 0
      ? Math.round(parsed.amount * 100) / 100
      : null;

  const category = VALID_CATEGORIES.includes(parsed.category)
    ? parsed.category
    : categorizeByKeyword(rawText, parsed.merchant || "");

  const date =
    parsed.date && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date)
      ? parsed.date
      : today;

  const merchant =
    typeof parsed.merchant === "string" && parsed.merchant.trim()
      ? parsed.merchant.trim().slice(0, 100)
      : "Unknown";

  return { amount, category, date, merchant };
}

// ── POST /api/ai/upload-bill ──────────────────────────────────────────────────
export const processBillUpload = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const filePath = req.file.path;

  try {
    // 1. Extract text
    let rawText = "";
    try {
      rawText = await extractText(filePath, req.file.mimetype);
    } catch (ocrErr) {
      console.warn("[bill] OCR error:", ocrErr.message);
    }

    if (!rawText.trim()) {
      return res.status(422).json({
        error:
          "Could not read any text from the file. Try a clearer image or a text-based PDF.",
        rawText: "",
        parsed: null,
      });
    }

    // 2. Parse with AI
    let parsed = null;
    let parseError = null;

    try {
      parsed = await parseWithAI(rawText);
    } catch (aiErr) {
      console.warn("[bill] AI parse error:", aiErr.message);
      parseError =
        "AI could not parse the bill automatically. Please fill in the details below.";
      // Return a best-effort skeleton so frontend can show manual entry
      const today = new Date().toISOString().split("T")[0];
      parsed = {
        amount: null,
        category: categorizeByKeyword(rawText, ""),
        date: today,
        merchant: "Unknown",
      };
    }

    res.json({
      rawText: rawText.slice(0, 600),
      parsed,
      parseError: parseError || null,
    });
  } finally {
    // Always delete the temp file
    fs.unlink(filePath, () => {});
  }
};

// ── POST /api/ai/confirm-bill ─────────────────────────────────────────────────
// Saves the (possibly edited) parsed data as a Transaction.
export const confirmBill = async (req, res) => {
  try {
    const { userId, amount, category, date, merchant } = req.body;

    if (!userId || !amount || !category || !date) {
      return res.status(400).json({ error: "userId, amount, category, and date are required" });
    }

    if (!VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(", ")}` });
    }

    const transaction = new Transaction({
      user: new mongoose.Types.ObjectId(userId),
      type: "expense",
      amount: Number(amount),
      category,
      date: new Date(date),
      note: merchant || "Bill upload",
    });

    await transaction.save();

    res.status(201).json({
      message: "Transaction saved successfully",
      transaction,
    });
  } catch (err) {
    console.error("[bill] confirm error:", err.message);
    res.status(500).json({ error: err.message });
  }
};
