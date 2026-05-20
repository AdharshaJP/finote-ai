import math
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()


class AnomalyRequest(BaseModel):
    expenses: List[float]


class AnomalyResponse(BaseModel):
    isAnomaly: bool
    zScore: float
    method: str
    latestExpense: float
    mean: float
    stdDev: float
    sevenDayAvg: Optional[float]
    message: str


# ── Pure-Python Z-score ───────────────────────────────────────────────────────

def _compute_zscore(values: List[float]):
    """Return (mean, std_dev, z_score_of_last_element)."""
    n = len(values)
    mean = sum(values) / n
    variance = sum((x - mean) ** 2 for x in values) / n
    std = math.sqrt(variance)
    z = (values[-1] - mean) / std if std > 0 else 0.0
    return mean, std, z


def _seven_day_avg(values: List[float]) -> Optional[float]:
    """Average of up to 7 transactions immediately before the latest one."""
    window = values[-8:-1]
    if not window:
        return None
    return sum(window) / len(window)


# ── Optional Isolation Forest (only runs if scikit-learn is installed) ─────────

def _try_isolation_forest(values: List[float], latest: float) -> Optional[bool]:
    """
    Returns True if the latest value is anomalous by Isolation Forest,
    False if normal, or None if sklearn is not installed or data is too small.
    """
    try:
        import numpy as np
        from sklearn.ensemble import IsolationForest

        if len(values) < 6:
            return None

        X = np.array(values[:-1]).reshape(-1, 1)
        clf = IsolationForest(contamination=0.1, random_state=42)
        clf.fit(X)
        pred = clf.predict([[latest]])   # -1 = anomaly, 1 = normal
        return bool(pred[0] == -1)
    except Exception:
        # ImportError (sklearn/numpy missing) or any other error — skip silently
        return None


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.post("", response_model=AnomalyResponse)
async def detect_anomaly(request: AnomalyRequest):
    expenses = request.expenses

    if not expenses:
        raise HTTPException(status_code=400, detail="expenses list cannot be empty")

    latest = expenses[-1]

    # Not enough history to compare
    if len(expenses) == 1:
        return AnomalyResponse(
            isAnomaly=False,
            zScore=0.0,
            method="insufficient_data",
            latestExpense=latest,
            mean=latest,
            stdDev=0.0,
            sevenDayAvg=None,
            message="Only one transaction recorded — need more data to detect anomalies.",
        )

    mean, std, z = _compute_zscore(expenses)
    is_anomaly_zscore = abs(z) > 2.0

    # Try Isolation Forest — gracefully degrades if sklearn not installed
    if_result = _try_isolation_forest(expenses, latest)

    if if_result is not None:
        is_anomaly = is_anomaly_zscore or if_result
        method = "z-score + isolation-forest"
    else:
        is_anomaly = is_anomaly_zscore
        method = "z-score"

    seven_day = _seven_day_avg(expenses)

    # Build human-readable message
    if is_anomaly:
        direction = "unusually high" if z > 0 else "unusually low"
        msg = (
            f"Your latest expense of \u20b9{latest:,.0f} is {direction} "
            f"(z-score: {z:+.2f}). Your average spend is \u20b9{mean:,.0f}."
        )
        if seven_day is not None:
            diff_pct = ((latest - seven_day) / seven_day * 100) if seven_day > 0 else 0
            sign = "+" if diff_pct >= 0 else ""
            msg += f" That's {sign}{diff_pct:.0f}% vs your last-7 average of \u20b9{seven_day:,.0f}."
    else:
        msg = (
            f"Your latest expense of \u20b9{latest:,.0f} is within normal range "
            f"(z-score: {z:+.2f}, avg: \u20b9{mean:,.0f})."
        )
        if seven_day is not None:
            diff_pct = ((latest - seven_day) / seven_day * 100) if seven_day > 0 else 0
            sign = "+" if diff_pct >= 0 else ""
            msg += f" It's {sign}{diff_pct:.0f}% vs your recent 7-transaction average."

    return AnomalyResponse(
        isAnomaly=is_anomaly,
        zScore=round(z, 4),
        method=method,
        latestExpense=latest,
        mean=round(mean, 2),
        stdDev=round(std, 2),
        sevenDayAvg=round(seven_day, 2) if seven_day is not None else None,
        message=msg,
    )
