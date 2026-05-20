from fastapi import APIRouter, HTTPException
from ai_service.models import ChatRequest
from ai_service.analysis import compute_daily_average, compute_days_left
from ai_service.groq_service import ask_ai_fast

router = APIRouter()


def _detect_intent(question: str) -> str:
    q = question.lower()
    if any(w in q for w in ["afford", "buy", "purchase", "spend on", "worth it"]):
        return "afford"
    if any(w in q for w in ["predict", "future", "run out", "last", "how long", "months"]):
        return "prediction"
    if any(w in q for w in ["why", "overspend", "too much", "reduce", "cut", "save more"]):
        return "analysis"
    if any(w in q for w in ["invest", "mutual fund", "stock", "fd", "sip", "portfolio"]):
        return "investment"
    return "general"


@router.post("")
async def chat(request: ChatRequest):
    try:
        f = request.financial
        intent = _detect_intent(request.question)

        daily_avg = compute_daily_average(f.dailyMap, f.expense)
        days_left = compute_days_left(f.balance, daily_avg)
        savings_rate = round((f.balance / f.income * 100), 1) if f.income > 0 else 0

        top_cats = ", ".join(
            [f"{cat}: ₹{amt:,.0f}" for cat, amt in
             sorted(f.categoryMap.items(), key=lambda x: x[1], reverse=True)[:4]]
        ) or "No data"

        # Build intent-specific prompt suffix
        intent_instructions = {
            "afford": (
                "The user is asking about a purchase. Evaluate if they should buy it based on "
                "their balance, daily burn rate, and 15-day safety buffer. "
                "Give a clear YES / RISKY / NO recommendation with a brief reason."
            ),
            "prediction": (
                "The user wants to know about their financial future. "
                f"They have {days_left} days of spending left at the current rate. "
                "Give a realistic but constructive prediction."
            ),
            "analysis": (
                "The user wants to understand their spending behavior. "
                "Identify the root cause of the problem and give one specific, actionable fix."
            ),
            "investment": (
                "The user is asking about investing. Consider their savings rate and balance before advising. "
                "Only recommend investing if they have a stable buffer first."
            ),
            "general": (
                "Answer the user's finance question based on their specific data. "
                "Be practical and personalized — avoid generic advice."
            ),
        }

        prompt = f"""You are Finote AI, a smart personal finance assistant with access to the user's financial data.

USER FINANCIAL SNAPSHOT:
- Income: ₹{f.income:,.0f} | Expenses: ₹{f.expense:,.0f} | Balance: ₹{f.balance:,.0f}
- Daily Spending: ₹{daily_avg:,.2f} | Days Left: {days_left} days
- Savings Rate: {savings_rate}%
- Top Spending: {top_cats}

USER QUESTION: "{request.question}"

INTENT: {intent}

INSTRUCTIONS: {intent_instructions[intent]}

Reply in 3-4 sentences. Be warm, direct, and use the user's actual numbers. Use ₹ for currency."""

        answer = await ask_ai_fast(prompt, max_tokens=400)

        return {"intent": intent, "answer": answer}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
