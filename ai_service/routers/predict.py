from fastapi import APIRouter, HTTPException
from ai_service.models import PredictRequest
from ai_service.analysis import (
    compute_monthly_totals, compute_predicted_months,
    compute_category_insights, compute_daily_average,
    compute_days_left, compute_savings_rate, compute_trend,
)
from ai_service.groq_service import ask_ai_structured

router = APIRouter()


@router.post("")
async def predict_spending(request: PredictRequest):
    try:
        f = request.financial

        daily_avg = compute_daily_average(f.dailyMap, f.expense)
        days_left = compute_days_left(f.balance, daily_avg)
        monthly_projection = round(daily_avg * 30, 2)
        savings_rate = compute_savings_rate(f.income, f.balance)
        trend = compute_trend(f.dailyMap)

        category_insights = compute_category_insights(f.categoryMap, f.expense)
        risky_category = category_insights[0]["category"] if category_insights else "N/A"

        # Historical monthly spending
        monthly_history = compute_monthly_totals(f.dailyMap)
        # Predicted next 3 months
        monthly_predictions = compute_predicted_months(monthly_history, months_ahead=3)

        all_monthly = monthly_history + monthly_predictions

        # Safe buffer = 15 days of spending
        safe_buffer = round(daily_avg * 15, 2)
        projected_balance_3m = f.balance - (monthly_projection * 3)

        top_cats = "\n".join(
            [f"  - {ci['category']}: ₹{ci['amount']:,.0f} ({ci['percent']}%)" for ci in category_insights[:4]]
        )

        ai_prompt = f"""You are a financial forecasting expert. Analyze spending patterns and provide future predictions.

CURRENT FINANCIAL DATA:
- Income: ₹{f.income:,.0f}
- Total Expenses: ₹{f.expense:,.0f}
- Current Balance: ₹{f.balance:,.0f}
- Daily Spending Average: ₹{daily_avg:,.2f}
- Monthly Spending Projection: ₹{monthly_projection:,.2f}
- Estimated Days Until Balance Runs Out: {days_left} days
- Spending Trend: {trend}
- Savings Rate: {savings_rate}%
- Highest Risk Category: {risky_category}
- Projected Balance in 3 Months (at current rate): ₹{projected_balance_3m:,.0f}

TOP SPENDING CATEGORIES:
{top_cats}

Respond in EXACTLY this format:

**Risk Level**
[LOW / MEDIUM / HIGH with a one-sentence justification based on their data]

**Key Problem**
[The biggest threat to their financial future based on the numbers. Be specific.]

**Action Plan**
1. [Most impactful immediate action - specific and measurable]
2. [Second action to improve their trajectory]

Keep it concise and data-driven. Use ₹ for amounts."""

        ai_advice = await ask_ai_structured(ai_prompt)

        # Chart data: historical + predicted (for combined chart)
        chart_data = {
            "spendingForecast": {
                "labels": [m["label"] for m in all_monthly],
                "historical": [m["amount"] if not m.get("predicted") else None for m in all_monthly],
                "predicted": [m["amount"] if m.get("predicted") else None for m in all_monthly],
            },
            "categoryRisk": {
                "labels": [ci["category"] for ci in category_insights],
                "data": [ci["amount"] for ci in category_insights],
                "colors": [ci["color"] for ci in category_insights],
            },
            "burnRate": {
                "balance": f.balance,
                "safeBuffer": safe_buffer,
                "dailyAvg": daily_avg,
                "daysLeft": days_left,
            },
        }

        return {
            "income": f.income,
            "expense": f.expense,
            "balance": f.balance,
            "dailyAvg": daily_avg,
            "monthlyProjection": monthly_projection,
            "predictedDaysLeft": days_left,
            "safeBuffer": safe_buffer,
            "savingsRate": savings_rate,
            "riskyCategory": risky_category,
            "trend": trend,
            "projectedBalance3M": round(projected_balance_3m, 2),
            "aiAdvice": ai_advice,
            "chartData": chart_data,
            "monthlyHistory": monthly_history,
            "monthlyPredictions": monthly_predictions,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
