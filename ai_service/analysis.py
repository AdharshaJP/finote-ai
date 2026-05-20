from typing import Dict, List
from datetime import datetime, timedelta


CATEGORY_COLORS = [
    "#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444",
    "#0EA5E9", "#EC4899", "#14B8A6", "#F97316", "#6366F1",
]

MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def compute_health_score(
    income: float,
    expense: float,
    balance: float,
    category_map: Dict[str, float],
) -> int:
    score = 100

    # Expense vs income
    if expense > income:
        score -= 40
    elif income > 0 and expense > income * 0.85:
        score -= 20
    elif income > 0 and expense > income * 0.70:
        score -= 10

    # Savings buffer
    if income > 0:
        savings_rate = balance / income
        if savings_rate < 0.05:
            score -= 30
        elif savings_rate < 0.15:
            score -= 15
        elif savings_rate < 0.20:
            score -= 5

    # Category concentration risk
    if expense > 0 and category_map:
        top_cat_amount = max(category_map.values())
        concentration = top_cat_amount / expense
        if concentration > 0.60:
            score -= 20
        elif concentration > 0.40:
            score -= 10

    # Bonus for strong savings
    if income > 0 and balance > income * 0.35:
        score = min(100, score + 10)

    return max(0, min(100, score))


def compute_risk_level(score: int) -> str:
    if score >= 70:
        return "LOW"
    elif score >= 40:
        return "MEDIUM"
    return "HIGH"


def _linear_regression_slope(values: List[float]) -> float:
    """Return the slope of a linear regression through the values."""
    n = len(values)
    if n < 2:
        return 0.0
    x = list(range(n))
    x_mean = sum(x) / n
    y_mean = sum(values) / n
    num = sum((xi - x_mean) * (yi - y_mean) for xi, yi in zip(x, values))
    den = sum((xi - x_mean) ** 2 for xi in x)
    return num / den if den != 0 else 0.0


def compute_trend(daily_map: Dict[str, float]) -> str:
    if len(daily_map) < 3:
        return "stable"

    sorted_values = [v for _, v in sorted(daily_map.items())]
    slope = _linear_regression_slope(sorted_values)
    y_mean = sum(sorted_values) / len(sorted_values)

    if y_mean > 0:
        normalized = slope / y_mean
        if normalized > 0.05:
            return "increasing"
        elif normalized < -0.05:
            return "decreasing"
    return "stable"


def compute_monthly_totals(daily_map: Dict[str, float]) -> List[Dict]:
    monthly: Dict[str, float] = {}
    for date_str, amount in daily_map.items():
        month = date_str[:7]
        monthly[month] = monthly.get(month, 0) + amount

    result = []
    for month_str in sorted(monthly.keys()):
        year, month_num = month_str.split("-")
        label = f"{MONTHS_SHORT[int(month_num) - 1]} '{year[2:]}"
        result.append({"month": month_str, "label": label, "amount": round(monthly[month_str], 2)})
    return result


def compute_predicted_months(
    monthly_totals: List[Dict], months_ahead: int = 3
) -> List[Dict]:
    """Extend monthly spending with linear-regression-based future predictions."""
    if not monthly_totals:
        return []

    values = [m["amount"] for m in monthly_totals]
    slope = _linear_regression_slope(values)
    last_val = values[-1]

    # Determine the next calendar months
    last_month_str = monthly_totals[-1]["month"]
    last_date = datetime.strptime(last_month_str + "-01", "%Y-%m-%d")

    predictions = []
    for i in range(1, months_ahead + 1):
        next_date = last_date + timedelta(days=32 * i)
        next_date = next_date.replace(day=1)
        month_str = next_date.strftime("%Y-%m")
        label = f"{MONTHS_SHORT[next_date.month - 1]} '{str(next_date.year)[2:]}"
        predicted_val = max(0, last_val + slope * i)
        predictions.append({"month": month_str, "label": label, "amount": round(predicted_val, 2), "predicted": True})

    return predictions


def compute_category_insights(
    category_map: Dict[str, float], expense: float
) -> List[Dict]:
    if expense == 0 or not category_map:
        return []

    sorted_cats = sorted(category_map.items(), key=lambda x: x[1], reverse=True)
    return [
        {
            "category": cat,
            "amount": round(amount, 2),
            "percent": round((amount / expense) * 100, 1),
            "color": CATEGORY_COLORS[i % len(CATEGORY_COLORS)],
        }
        for i, (cat, amount) in enumerate(sorted_cats)
    ]


def compute_daily_average(daily_map: Dict[str, float], expense: float) -> float:
    days = len(daily_map) if daily_map else 1
    return round(expense / days, 2)


def compute_days_left(balance: float, daily_avg: float) -> float:
    if daily_avg <= 0:
        return 9999
    return round(balance / daily_avg, 1)


def compute_savings_rate(income: float, balance: float) -> float:
    if income <= 0:
        return 0.0
    return round((balance / income) * 100, 1)
