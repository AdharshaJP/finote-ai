/**
 * pythonService.js
 * Bridge between the Node.js backend and the Python ML microservice.
 * All functions handle errors gracefully and never throw to callers.
 */

const PYTHON_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

/**
 * Send expense amounts to the Python anomaly detection endpoint.
 * @param {number[]} expenses  Array of expense amounts in chronological order.
 * @returns {Promise<object>}  Anomaly detection result, or a fallback object on error.
 */
export async function callPythonAnomaly(expenses) {
  if (!expenses || expenses.length === 0) {
    return {
      isAnomaly: false,
      zScore: 0,
      method: "no_data",
      latestExpense: 0,
      mean: 0,
      stdDev: 0,
      sevenDayAvg: null,
      message: "No expense data available for anomaly detection.",
      _serviceAvailable: false,
    };
  }

  try {
    const { default: fetch } = await import("node-fetch");
    const url = `${PYTHON_SERVICE_URL}/anomaly`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expenses }),
      // 5-second timeout so a missing Python service fails fast
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Python service responded ${response.status}: ${errText}`);
    }

    const data = await response.json();
    return { ...data, _serviceAvailable: true };
  } catch (err) {
    // Python service is down or unreachable — return a safe fallback
    // so the Node route can still respond without a 500.
    const isTimeout = err.name === "TimeoutError" || err.message?.includes("timeout");
    console.warn(
      `[pythonService] anomaly endpoint unavailable${isTimeout ? " (timeout)" : ""}: ${err.message}`
    );

    return {
      isAnomaly: false,
      zScore: 0,
      method: "fallback",
      latestExpense: expenses[expenses.length - 1] ?? 0,
      mean: 0,
      stdDev: 0,
      sevenDayAvg: null,
      message: "ML service is currently offline. Start the Python service with: npm run ai-service",
      _serviceAvailable: false,
    };
  }
}
