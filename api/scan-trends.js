// Vercel serverless function — Node.js only, never runs in the browser.

import { scanTrends } from "../src/services/trendScanner.js";

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  console.log("[scan-trends] Invoked —", req.method);
  console.log("[scan-trends] SUPABASE_URL present:", !!process.env.SUPABASE_URL);
  console.log("[scan-trends] SUPABASE_ANON_KEY present:", !!process.env.SUPABASE_ANON_KEY);
  console.log("[scan-trends] APIFY_API_TOKEN present:", !!process.env.APIFY_API_TOKEN);

  try {
    const signals = await scanTrends();
    console.log(`[scan-trends] Complete — ${signals.length} signals inserted`);
    return res.status(200).json({ success: true, signalsInserted: signals.length });
  } catch (err) {
    console.error("[scan-trends] SCAN_TRENDS_ERROR:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}
