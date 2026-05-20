from fastapi import APIRouter, HTTPException
from ai_service.models import InsightsRequest
from ai_service.analysis import (
    compute_health_score, compute_risk_level, compute_trend,
    compute_monthly_totals, compute_category_insights, compute_savings_rate,
)
from ai_service.groq_service import ask_ai_structured

router = APIRouter()


@router.post("")
async def get_insights(request: InsightsRequest):
    try:
        f = request.financial

        health_score = compute_health_score(f.income, f.expense, f.balance, f.categoryMap)
        risk_level = compute_risk_level(health_score)
        trend = compute_trend(f.dailyMap)
        savings_rate = compute_savings_rate(f.income, f.balance)
        category_insights = compute_category_insights(f.categoryMap, f.expense)
        monthly_trend = compute_monthly_totals(f.dailyMap)

        risky_category = category_insights[0]["category"] if category_insights else "N/A"
        top_cats_text = "\n".join(
            [f"  - {ci['category']}: ₹{ci['amount']:,.0f} ({ci['percent']}%)" for ci in category_insights[:5]]
        )

        ai_prompt = f"""You are an expert personal finance advisor. Analyze this user's financial data and provide structured, actionable insights.

FINANCIAL SUMMARY:
- Total Income: ₹{f.income:,.0f}
- Total Expenses: ₹{f.expense:,.0f}
- Current Balance: ₹{f.balance:,.0f}
- Savings Rate: {savings_rate}%
- Health Score: {health_score}/100
- Risk Level: {risk_level}
- Spending Trend: {trend}
- Highest Spending Category: {risky_category}

TOP SPENDING CATEGORIES:
{top_cats_text}

Respond in EXACTLY this format (keep each section concise, 2-3 sentences max):

**Key Insight**
[One powerful, data-driven observation about their overall financial health. Be specific with numbers.]

**Risk Warning**
[The biggest financial risk you see based on their data. Name the specific problem.]

**Top Recommendation**
[The single most impactful action they should take right now. Be specific and actionable.]

Use ₹ for all currency. Be direct, not generic."""

        ai_advice = await ask_ai_structured(ai_prompt)

        chart_data = {
            "categoryPie": {
                "labels": [ci["category"] for ci in category_insights],
                "data": [ci["amount"] for ci in category_insights],
                "colors": [ci["color"] for ci in category_insights],
            },
            "monthlyTrend": {
                "labels": [m["label"] for m in monthly_trend],
                "data": [m["amount"] for m in monthly_trend],
            },
            "healthGauge": health_score,
            "incomeVsExpense": {
                "income": f.income,
                "expense": f.expense,
                "balance": f.balance,
            },
        }

        return {
            "income": f.income,
            "expense": f.expense,
            "balance": f.balance,
            "savingsRate": savings_rate,
            "categoryInsights": category_insights,
            "riskyCategory": risky_category,
            "trend": trend,
            "healthScore": health_score,
            "riskLevel": risk_level,
            "aiAdvice": ai_advice,
            "chartData": chart_data,
            "monthlyTrend": monthly_trend,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
