from fastapi import APIRouter, HTTPException
from ai_service.models import AffordRequest
from ai_service.analysis import compute_daily_average
from ai_service.groq_service import ask_ai_structured

router = APIRouter()


@router.post("")
async def afford_check(request: AffordRequest):
    try:
        f = request.financial
        amount = request.amount
        item = request.item

        daily_avg = compute_daily_average(f.dailyMap, f.expense)
        safe_buffer = round(daily_avg * 15, 2)   # 15-day emergency buffer
        balance_after = f.balance - amount
        remaining_after_buffer = balance_after - safe_buffer

        # Decision logic
        if amount > f.balance:
            decision = "NO"
            confidence = "HIGH"
        elif balance_after < safe_buffer:
            decision = "RISKY"
            confidence = "HIGH"
        elif balance_after < safe_buffer * 2:
            decision = "RISKY"
            confidence = "MEDIUM"
        else:
            decision = "YES"
            confidence = "HIGH" if remaining_after_buffer > safe_buffer else "MEDIUM"

        savings_rate = round((f.balance / f.income * 100), 1) if f.income > 0 else 0

        ai_prompt = f"""You are a financial advisor evaluating a purchase decision.

USER DATA:
- Current Balance: ₹{f.balance:,.0f}
- Daily Spending: ₹{daily_avg:,.2f}
- 15-Day Safety Buffer: ₹{safe_buffer:,.2f}
- Savings Rate: {savings_rate}%

PURCHASE REQUEST:
- Item: {item}
- Amount: ₹{amount:,.0f}
- Balance After Purchase: ₹{balance_after:,.2f}
- Buffer Coverage After Purchase: ₹{remaining_after_buffer:,.2f}

SYSTEM DECISION: {decision} (Confidence: {confidence})

Write 2 concise sentences explaining this decision:
1. State the financial reason clearly with numbers.
2. Give a practical suggestion (alternative timing, saving target, or proceed with confidence).

Use ₹ for amounts. Be direct."""

        ai_reason = await ask_ai_structured(ai_prompt)

        # Chart data for budget breakdown visualization
        chart_data = {
            "budgetBreakdown": {
                "labels": ["Purchase Amount", "Safety Buffer", "Remaining Balance"],
                "data": [
                    round(min(amount, f.balance), 2),
                    round(safe_buffer, 2),
                    round(max(0, balance_after - safe_buffer), 2),
                ],
                "colors": ["#EF4444", "#F59E0B", "#10B981"],
            },
            "balanceImpact": {
                "before": f.balance,
                "after": round(max(0, balance_after), 2),
                "safeBuffer": safe_buffer,
            },
        }

        return {
            "decision": decision,
            "confidence": confidence,
            "balance": f.balance,
            "purchaseAmount": amount,
            "balanceAfter": round(balance_after, 2),
            "safeBuffer": safe_buffer,
            "dailyAvg": daily_avg,
            "aiReason": ai_reason,
            "chartData": chart_data,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
