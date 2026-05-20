import math
from typing import List, Optional

# ── Exact same functions from ai_service/routers/anomaly.py ──────────────────

def _compute_zscore(values: List[float]):
    n = len(values)
    mean = sum(values) / n
    variance = sum((x - mean) ** 2 for x in values) / n
    std = math.sqrt(variance)
    z = (values[-1] - mean) / std if std > 0 else 0.0
    return mean, std, z

def _seven_day_avg(values: List[float]) -> Optional[float]:
    window = values[-8:-1]
    if not window:
        return None
    return sum(window) / len(window)

def _try_isolation_forest(values: List[float], latest: float) -> Optional[bool]:
    try:
        import numpy as np
        from sklearn.ensemble import IsolationForest
        if len(values) < 6:
            return None
        X = np.array(values[:-1]).reshape(-1, 1)
        clf = IsolationForest(contamination=0.1, random_state=42)
        clf.fit(X)
        pred = clf.predict([[latest]])
        return bool(pred[0] == -1)
    except Exception:
        return None

def detect(history: List[float]) -> bool:
    """Run detection on history, flag last element."""
    if len(history) < 2:
        return False
    latest = history[-1]
    _, _, z = _compute_zscore(history)
    is_anomaly = abs(z) > 2.0
    if_result = _try_isolation_forest(history, latest)
    if if_result is not None:
        is_anomaly = is_anomaly or if_result
    return is_anomaly

# ── Synthetic dataset ─────────────────────────────────────────────────────────
# Each test case: (history_of_amounts, label)
# label 1 = last value IS an anomaly, 0 = normal
# Covers: grocery, restaurant, utility, digital, salary-scale users

BASE_NORMAL    = [500, 480, 520, 510, 490, 505, 495, 515, 488, 502]
BASE_HIGH      = [5000, 4800, 5200, 5100, 4900, 5050, 4950, 5150, 4880, 5020]
BASE_MIXED     = [300, 520, 410, 480, 390, 510, 460, 440, 500, 470]

test_cases = [
    # ── TRUE ANOMALIES (label=1) ──────────────────────────────────────────────
    # Spike 10x normal
    (BASE_NORMAL + [5000],                                          1, "10x spike"),
    # Spike 20x normal
    (BASE_NORMAL + [10000],                                         1, "20x spike"),
    # Near-zero when normally high (suspiciously low)
    (BASE_HIGH   + [10],                                            1, "near-zero drop"),
    # Single large restaurant bill
    (BASE_MIXED  + [8000],                                          1, "restaurant spike"),
    # Utility bill 5x normal
    ([1200,1150,1300,1180,1220,1190,1250,1170,1210,1195] + [6000], 1, "utility 5x"),
    # Sudden drop to near zero (possible fraud / refund anomaly)
    (BASE_HIGH   + [50],                                            1, "extreme drop"),
    # Grocery run 8x normal
    ([600,580,620,590,610,595,605,615,585,600] + [4800],           1, "grocery 8x"),
    # One-off luxury purchase
    ([800,750,820,780,810,790,815,795,805,800] + [15000],          1, "luxury purchase"),
    # Digital subscription suddenly jumps
    ([199,199,199,199,199,199,199,199,199,199] + [2999],           1, "subscription spike"),
    # Very low baseline, huge spike
    ([50,60,55,58,52,61,57,53,59,56]           + [2000],           1, "low-base spike"),
    # Travel expense 6x normal
    ([1000,950,1050,980,1020,990,1010,970,1030,1000] + [6500],     1, "travel 6x"),
    # Medical emergency
    ([400,380,420,390,410,395,405,415,385,400] + [25000],          1, "medical emergency"),
    # Repeated normal then sudden double
    ([200,210,195,205,200,198,202,207,193,200] + [2000],           1, "sudden double"),
    # High-earner spike
    (BASE_HIGH   + [50000],                                         1, "high-earner spike"),
    # Negative-like (very low on high base)
    ([3000,2900,3100,2950,3050,2980,3020,2970,3030,3000] + [5],    1, "extreme low on high base"),

    # ── TRUE NORMALS (label=0) ────────────────────────────────────────────────
    # Steady normal spending
    (BASE_NORMAL + [498],                                           0, "steady normal"),
    # Slight increase within range
    (BASE_NORMAL + [540],                                           0, "slight increase"),
    # Slight decrease within range
    (BASE_NORMAL + [460],                                           0, "slight decrease"),
    # High-value user, normal for them
    (BASE_HIGH   + [5100],                                          0, "high-value normal"),
    # Restaurant normal
    (BASE_MIXED  + [450],                                           0, "restaurant normal"),
    # Utility within range
    ([1200,1150,1300,1180,1220,1190,1250,1170,1210,1195] + [1230], 0, "utility normal"),
    # Grocery normal
    ([600,580,620,590,610,595,605,615,585,600] + [598],            0, "grocery normal"),
    # Digital subscription same as always
    ([199,199,199,199,199,199,199,199,199,199] + [199],            0, "subscription same"),
    # Slightly higher than avg but within 2 std
    ([800,750,820,780,810,790,815,795,805,800] + [870],            0, "slightly above avg"),
    # Slightly lower
    ([800,750,820,780,810,790,815,795,805,800] + [720],            0, "slightly below avg"),
    # Variable spender, within their own range
    ([300,800,200,700,400,600,350,750,250,650] + [500],            0, "variable spender normal"),
    # Low-value user, normal
    ([50,60,55,58,52,61,57,53,59,56]           + [54],             0, "low-value normal"),
    # Weekend splurge but within 2 std of their pattern
    ([1000,950,1050,980,1020,990,1010,970,1030,1000] + [1080],     0, "weekend within range"),
    # High-earner normal
    (BASE_HIGH   + [4950],                                          0, "high-earner normal"),
    # Rounding variation
    ([500,500,500,500,500,500,500,500,500,500] + [502],            0, "rounding variation"),
]

# ── Run tests ─────────────────────────────────────────────────────────────────
print(f"\n{'='*65}")
print(f"  ANOMALY DETECTION TEST  —  {len(test_cases)} synthetic transactions")
print(f"{'='*65}")
print(f"  {'#':<3} {'Label':<8} {'Predicted':<10} {'Result':<8} Description")
print(f"  {'-'*60}")

TP = FP = TN = FN = 0
for i, (history, label, desc) in enumerate(test_cases, 1):
    pred = detect(history)
    pred_label = 1 if pred else 0
    if label == 1 and pred_label == 1: TP += 1; result = "[OK] TP"
    elif label == 0 and pred_label == 0: TN += 1; result = "[OK] TN"
    elif label == 0 and pred_label == 1: FP += 1; result = "[!!] FP"
    else: FN += 1; result = "[!!] FN"
    actual_str  = "ANOMALY" if label == 1 else "NORMAL"
    predict_str = "ANOMALY" if pred_label == 1 else "NORMAL"
    print(f"  {i:<3} {actual_str:<8} {predict_str:<10} {result:<8} {desc}")

# ── Metrics ───────────────────────────────────────────────────────────────────
precision = TP / (TP + FP) if (TP + FP) > 0 else 0
recall    = TP / (TP + FN) if (TP + FN) > 0 else 0
f1        = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0
accuracy  = (TP + TN) / len(test_cases)

print(f"\n{'='*65}")
print(f"  RESULTS")
print(f"{'='*65}")
print(f"  Total test cases : {len(test_cases)}  ({sum(l for _,l,_ in test_cases)} anomalies, {sum(1-l for _,l,_ in test_cases)} normals)")
print(f"  True  Positives  : {TP}   (anomalies correctly caught)")
print(f"  True  Negatives  : {TN}   (normals correctly passed)")
print(f"  False Positives  : {FP}   (normals wrongly flagged)")
print(f"  False Negatives  : {FN}   (anomalies missed)")
print(f"  {'─'*40}")
print(f"  Accuracy         : {accuracy*100:.1f}%")
print(f"  Precision        : {precision*100:.1f}%")
print(f"  Recall           : {recall*100:.1f}%")
print(f"  F1 Score         : {f1*100:.1f}%")
print(f"{'='*65}\n")
