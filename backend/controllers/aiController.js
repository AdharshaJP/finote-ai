import Groq from "groq-sdk";
import Transaction from "../models/Transaction.js";
import mongoose from "mongoose";
import { callPythonAnomaly } from "../services/pythonService.js";

// ─── Groq client ──────────────────────────────────────────────────────────────
function getGroq() {
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

async function askAI(prompt, model = "llama-3.3-70b-versatile", maxTokens = 1024) {
  const groq = getGroq();
  const res = await groq.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.5,
    max_tokens: maxTokens,
  });
  return res.choices[0].message.content;
}

async function askAIFast(prompt) {
  return askAI(prompt, "llama-3.1-8b-instant", 400);
}

// ─── Category colors ──────────────────────────────────────────────────────────
const CATEGORY_COLORS = [
  "#3B82F6","#8B5CF6","#10B981","#F59E0B","#EF4444",
  "#0EA5E9","#EC4899","#14B8A6","#F97316","#6366F1",
];

// ─── Analysis helpers ─────────────────────────────────────────────────────────
function computeHealthScore(income, expense, balance, categoryMap) {
  let score = 100;
  if (expense > income) score -= 40;
  else if (income > 0 && expense > income * 0.85) score -= 20;
  else if (income > 0 && expense > income * 0.70) score -= 10;

  if (income > 0) {
    const sr = balance / income;
    if (sr < 0.05) score -= 30;
    else if (sr < 0.15) score -= 15;
    else if (sr < 0.20) score -= 5;
  }

  if (expense > 0 && Object.keys(categoryMap).length) {
    const top = Math.max(...Object.values(categoryMap));
    const conc = top / expense;
    if (conc > 0.60) score -= 20;
    else if (conc > 0.40) score -= 10;
  }

  if (income > 0 && balance > income * 0.35) score = Math.min(100, score + 10);
  return Math.max(0, Math.min(100, score));
}

function computeRiskLevel(score) {
  return score >= 70 ? "LOW" : score >= 40 ? "MEDIUM" : "HIGH";
}

function linearSlope(values) {
  const n = values.length;
  if (n < 2) return 0;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (values[i] - yMean);
    den += (i - xMean) ** 2;
  }
  return den !== 0 ? num / den : 0;
}

function computeTrend(dailyMap) {
  const vals = Object.values(dailyMap);
  if (vals.length < 3) return "stable";
  const slope = linearSlope(vals);
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  if (mean === 0) return "stable";
  const norm = slope / mean;
  if (norm > 0.05) return "increasing";
  if (norm < -0.05) return "decreasing";
  return "stable";
}

function computeMonthlyTotals(dailyMap) {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const monthly = {};
  for (const [date, amount] of Object.entries(dailyMap)) {
    const month = date.slice(0, 7);
    monthly[month] = (monthly[month] || 0) + amount;
  }
  return Object.keys(monthly).sort().map(m => {
    const [year, mn] = m.split("-");
    return { month: m, label: `${months[parseInt(mn) - 1]} '${year.slice(2)}`, amount: Math.round(monthly[m] * 100) / 100 };
  });
}

function computePredictedMonths(monthlyHistory, ahead = 3) {
  if (!monthlyHistory.length) return [];
  const vals = monthlyHistory.map(m => m.amount);
  const slope = linearSlope(vals);
  const last = monthlyHistory[monthlyHistory.length - 1];
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const [ly, lm] = last.month.split("-").map(Number);

  const preds = [];
  for (let i = 1; i <= ahead; i++) {
    const totalMonths = lm + i;
    const year = ly + Math.floor((totalMonths - 1) / 12);
    const month = ((totalMonths - 1) % 12) + 1;
    const mm = String(month).padStart(2, "0");
    const amount = Math.max(0, Math.round((vals[vals.length - 1] + slope * i) * 100) / 100);
    preds.push({ month: `${year}-${mm}`, label: `${months[month - 1]} '${String(year).slice(2)}`, amount, predicted: true });
  }
  return preds;
}

function computeCategoryInsights(categoryMap, expense) {
  if (!expense || !Object.keys(categoryMap).length) return [];
  return Object.entries(categoryMap)
    .sort(([, a], [, b]) => b - a)
    .map(([cat, amt], i) => ({
      category: cat,
      amount: Math.round(amt * 100) / 100,
      percent: Math.round((amt / expense) * 1000) / 10,
      color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
    }));
}

// ─── Build financial context from userId ──────────────────────────────────────
async function buildContext(userId) {
  const transactions = await Transaction.find({
    user: new mongoose.Types.ObjectId(userId),
  });

  let income = 0, expense = 0;
  const categoryMap = {}, dailyMap = {};

  for (const t of transactions) {
    const date = new Date(t.date).toISOString().split("T")[0];
    if (t.type === "income") {
      income += t.amount;
    } else {
      expense += t.amount;
      categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount;
      dailyMap[date] = (dailyMap[date] || 0) + t.amount;
    }
  }

  return { income, expense, balance: income - expense, categoryMap, dailyMap };
}

// ─── CHAT ─────────────────────────────────────────────────────────────────────
export const chatWithAI = async (req, res) => {
  try {
    const { question, userId } = req.body;
    if (!question || !userId) return res.status(400).json({ error: "question and userId are required" });

    const { income, expense, balance, categoryMap, dailyMap } = await buildContext(userId);
    const days = Object.keys(dailyMap).length || 1;
    const dailyAvg = expense / days;
    const daysLeft = dailyAvg > 0 ? Math.round(balance / dailyAvg) : 9999;
    const savingsRate = income > 0 ? Math.round((balance / income) * 100) : 0;

    const topCats = Object.entries(categoryMap)
      .sort(([, a], [, b]) => b - a).slice(0, 4)
      .map(([c, a]) => `${c}: ₹${Math.round(a).toLocaleString()}`).join(", ") || "No data";

    const q = question.toLowerCase();
    let intent = "general";
    if (q.includes("afford") || q.includes("buy") || q.includes("purchase")) intent = "afford";
    else if (q.includes("future") || q.includes("run out") || q.includes("last") || q.includes("predict")) intent = "prediction";
    else if (q.includes("why") || q.includes("overspend") || q.includes("reduce") || q.includes("save more")) intent = "analysis";
    else if (q.includes("invest") || q.includes("mutual") || q.includes("stock") || q.includes("sip")) intent = "investment";

    const intentInstructions = {
      afford: "Evaluate if the user can afford the purchase. Give a clear YES/RISKY/NO with brief reasoning.",
      prediction: `User has ${daysLeft} days of spending left at current rate. Give a realistic financial prediction.`,
      analysis: "Identify the root cause of the spending problem and give one specific, actionable fix.",
      investment: "Consider their savings rate before advising investment. Recommend investing only if they have a stable buffer.",
      general: "Answer the finance question based on their specific data. Be practical and personalized.",
    };

    const prompt = `You are Finote AI, a smart personal finance assistant.

USER FINANCIAL SNAPSHOT:
- Income: ₹${Math.round(income).toLocaleString()} | Expenses: ₹${Math.round(expense).toLocaleString()} | Balance: ₹${Math.round(balance).toLocaleString()}
- Daily Spending: ₹${dailyAvg.toFixed(2)} | Days Left: ${daysLeft} days
- Savings Rate: ${savingsRate}%
- Top Spending: ${topCats}

USER QUESTION: "${question}"
INTENT: ${intent}
INSTRUCTIONS: ${intentInstructions[intent]}

Reply in 3-4 sentences. Be warm, direct, and use the user's actual numbers. Use ₹ for currency.`;

    const answer = await askAIFast(prompt);
    res.json({ intent, answer });
  } catch (err) {
    console.error("Chat error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ─── INSIGHTS ─────────────────────────────────────────────────────────────────
export const getInsights = async (req, res) => {
  try {
    const { userId } = req.params;
    const { income, expense, balance, categoryMap, dailyMap } = await buildContext(userId);

    if (income === 0 && expense === 0) return res.json({ message: "No transactions found" });

    const healthScore = computeHealthScore(income, expense, balance, categoryMap);
    const riskLevel = computeRiskLevel(healthScore);
    const trend = computeTrend(dailyMap);
    const savingsRate = income > 0 ? Math.round((balance / income) * 1000) / 10 : 0;
    const categoryInsights = computeCategoryInsights(categoryMap, expense);
    const monthlyTrend = computeMonthlyTotals(dailyMap);
    const riskyCategory = categoryInsights[0]?.category || "N/A";

    const topCatsText = categoryInsights.slice(0, 5)
      .map(ci => `  - ${ci.category}: ₹${ci.amount.toLocaleString()} (${ci.percent}%)`).join("\n");

    const aiAdvice = await askAI(`You are an expert personal finance advisor. Analyze this user's financial data and provide structured, actionable insights.

FINANCIAL SUMMARY:
- Total Income: ₹${Math.round(income).toLocaleString()}
- Total Expenses: ₹${Math.round(expense).toLocaleString()}
- Current Balance: ₹${Math.round(balance).toLocaleString()}
- Savings Rate: ${savingsRate}%
- Health Score: ${healthScore}/100
- Risk Level: ${riskLevel}
- Spending Trend: ${trend}
- Highest Spending Category: ${riskyCategory}

TOP SPENDING CATEGORIES:
${topCatsText}

Respond in EXACTLY this format (2-3 sentences each):

**Key Insight**
[One powerful, data-driven observation about their overall financial health. Be specific with numbers.]

**Risk Warning**
[The biggest financial risk you see based on their data. Name the specific problem.]

**Top Recommendation**
[The single most impactful action they should take right now. Be specific and actionable.]

Use ₹ for all currency. Be direct, not generic.`);

    const chartData = {
      categoryPie: {
        labels: categoryInsights.map(ci => ci.category),
        data: categoryInsights.map(ci => ci.amount),
        colors: categoryInsights.map(ci => ci.color),
      },
      monthlyTrend: {
        labels: monthlyTrend.map(m => m.label),
        data: monthlyTrend.map(m => m.amount),
      },
      healthGauge: healthScore,
      incomeVsExpense: { income, expense, balance },
    };

    res.json({
      income, expense, balance, savingsRate, categoryInsights,
      riskyCategory, trend, healthScore, riskLevel, aiAdvice,
      chartData, monthlyTrend,
    });
  } catch (err) {
    console.error("Insights error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ─── PREDICT ──────────────────────────────────────────────────────────────────
export const predictSpending = async (req, res) => {
  try {
    const { userId } = req.params;
    const { income, expense, balance, categoryMap, dailyMap } = await buildContext(userId);

    if (income === 0 && expense === 0) return res.json({ message: "No data available" });

    const days = Object.keys(dailyMap).length || 1;
    const dailyAvg = Math.round((expense / days) * 100) / 100;
    const monthlyProjection = Math.round(dailyAvg * 30 * 100) / 100;
    const daysLeft = dailyAvg > 0 ? Math.round((balance / dailyAvg) * 10) / 10 : 9999;
    const safeBuffer = Math.round(dailyAvg * 15 * 100) / 100;
    const savingsRate = income > 0 ? Math.round((balance / income) * 1000) / 10 : 0;
    const trend = computeTrend(dailyMap);
    const categoryInsights = computeCategoryInsights(categoryMap, expense);
    const riskyCategory = categoryInsights[0]?.category || "N/A";
    const monthlyHistory = computeMonthlyTotals(dailyMap);
    const monthlyPredictions = computePredictedMonths(monthlyHistory, 3);
    const projectedBalance3M = Math.round((balance - monthlyProjection * 3) * 100) / 100;

    const topCats = categoryInsights.slice(0, 4)
      .map(ci => `  - ${ci.category}: ₹${ci.amount.toLocaleString()} (${ci.percent}%)`).join("\n");

    const aiAdvice = await askAI(`You are a financial forecasting expert. Analyze spending patterns and provide future predictions.

CURRENT FINANCIAL DATA:
- Income: ₹${Math.round(income).toLocaleString()}
- Total Expenses: ₹${Math.round(expense).toLocaleString()}
- Current Balance: ₹${Math.round(balance).toLocaleString()}
- Daily Spending Average: ₹${dailyAvg.toLocaleString()}
- Monthly Spending Projection: ₹${monthlyProjection.toLocaleString()}
- Estimated Days Until Balance Runs Out: ${daysLeft} days
- Spending Trend: ${trend}
- Savings Rate: ${savingsRate}%
- Highest Risk Category: ${riskyCategory}
- Projected Balance in 3 Months (at current rate): ₹${projectedBalance3M.toLocaleString()}

TOP SPENDING CATEGORIES:
${topCats}

Respond in EXACTLY this format:

**Risk Level**
[LOW / MEDIUM / HIGH with a one-sentence justification based on their data]

**Key Problem**
[The biggest threat to their financial future based on the numbers. Be specific.]

**Action Plan**
1. [Most impactful immediate action - specific and measurable]
2. [Second action to improve their trajectory]

Keep it concise and data-driven. Use ₹ for amounts.`);

    const allMonthly = [...monthlyHistory, ...monthlyPredictions];
    const chartData = {
      spendingForecast: {
        labels: allMonthly.map(m => m.label),
        historical: allMonthly.map(m => m.predicted ? null : m.amount),
        predicted: allMonthly.map(m => m.predicted ? m.amount : null),
      },
      categoryRisk: {
        labels: categoryInsights.map(ci => ci.category),
        data: categoryInsights.map(ci => ci.amount),
        colors: categoryInsights.map(ci => ci.color),
      },
      burnRate: { balance, safeBuffer, dailyAvg, daysLeft },
    };

    res.json({
      income, expense, balance, dailyAvg, monthlyProjection, predictedDaysLeft: daysLeft,
      safeBuffer, savingsRate, riskyCategory, trend, projectedBalance3M,
      aiAdvice, chartData, monthlyHistory, monthlyPredictions,
    });
  } catch (err) {
    console.error("Predict error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ─── AFFORD CHECK ─────────────────────────────────────────────────────────────
export const affordCheck = async (req, res) => {
  try {
    const { userId, amount, item } = req.body;
    if (!userId || !amount || !item) return res.status(400).json({ error: "userId, amount, and item are required" });

    const { income, expense, balance, dailyMap } = await buildContext(userId);
    const days = Object.keys(dailyMap).length || 1;
    const dailyAvg = Math.round((expense / days) * 100) / 100;
    const safeBuffer = Math.round(dailyAvg * 15 * 100) / 100;
    const balanceAfter = Math.round((balance - Number(amount)) * 100) / 100;
    const remainingAfterBuffer = balanceAfter - safeBuffer;
    const savingsRate = income > 0 ? Math.round((balance / income) * 1000) / 10 : 0;

    let decision = "YES", confidence = "HIGH";
    if (Number(amount) > balance) {
      decision = "NO"; confidence = "HIGH";
    } else if (balanceAfter < safeBuffer) {
      decision = "RISKY"; confidence = "HIGH";
    } else if (balanceAfter < safeBuffer * 2) {
      decision = "RISKY"; confidence = "MEDIUM";
    } else {
      confidence = remainingAfterBuffer > safeBuffer ? "HIGH" : "MEDIUM";
    }

    const aiReason = await askAI(`You are a financial advisor evaluating a purchase decision.

USER DATA:
- Current Balance: ₹${Math.round(balance).toLocaleString()}
- Daily Spending: ₹${dailyAvg.toLocaleString()}
- 15-Day Safety Buffer: ₹${safeBuffer.toLocaleString()}
- Savings Rate: ${savingsRate}%
- Balance After Purchase: ₹${balanceAfter.toLocaleString()}

PURCHASE REQUEST:
- Item: ${item}
- Amount: ₹${Number(amount).toLocaleString()}

SYSTEM DECISION: ${decision} (Confidence: ${confidence})

Write exactly 2 sentences:
1. State the financial reason clearly with numbers.
2. Give a practical suggestion (alternative timing, saving target, or proceed with confidence).

Use ₹ for amounts. Be direct.`);

    const chartData = {
      budgetBreakdown: {
        labels: ["Purchase Amount", "Safety Buffer", "Remaining Balance"],
        data: [
          Math.min(Number(amount), balance),
          safeBuffer,
          Math.max(0, balanceAfter - safeBuffer),
        ],
        colors: ["#EF4444", "#F59E0B", "#10B981"],
      },
      balanceImpact: { before: balance, after: Math.max(0, balanceAfter), safeBuffer },
    };

    res.json({
      decision, confidence, balance, purchaseAmount: Number(amount),
      balanceAfter, safeBuffer, dailyAvg, aiReason, chartData,
    });
  } catch (err) {
    console.error("Afford check error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ─── ANOMALY DETECTION ────────────────────────────────────────────────────────
export const getAnomaly = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ error: "userId is required" });

    // Fetch all expense transactions for the user, sorted oldest→newest
    const transactions = await Transaction.find({
      user: new mongoose.Types.ObjectId(userId),
      type: "expense",
    }).sort({ date: 1 });

    if (transactions.length === 0) {
      return res.json({
        isAnomaly: false,
        zScore: 0,
        method: "no_data",
        latestExpense: 0,
        mean: 0,
        stdDev: 0,
        sevenDayAvg: null,
        message: "No expense transactions found. Add some expenses to enable anomaly detection.",
        _serviceAvailable: false,
      });
    }

    // Extract plain amounts in chronological order
    const expenses = transactions.map((t) => t.amount);

    // Delegate ML work to Python service
    const result = await callPythonAnomaly(expenses);

    // Attach extra context useful for the frontend
    res.json({
      ...result,
      totalExpenses: expenses.length,
      latestCategory: transactions[transactions.length - 1]?.category ?? null,
      latestDate: transactions[transactions.length - 1]?.date ?? null,
    });
  } catch (err) {
    console.error("Anomaly detection error:", err.message);
    res.status(500).json({ error: err.message });
  }
};
