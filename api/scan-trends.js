// Vercel serverless function — runs on Node.js, never in the browser.
// API tokens stay server-side via process.env (see src/services/apifyClient.js).

import { scanTrends } from "../src/services/trendScanner.js";

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const signals = await scanTrends();
    return res.status(200).json({ success: true, signalsInserted: signals.length });
  } catch (err) {
    console.error("[scan-trends] Error:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}
