// Vercel serverless function — runs on Node.js, never in the browser.
// Uses process.env (not import.meta.env) so API tokens stay server-side.

import { ApifyClient } from "apify-client";
import { createClient } from "@supabase/supabase-js";

// ── Server-side clients ───────────────────────────────────────────

const apify = new ApifyClient({ token: process.env.APIFY_API_TOKEN });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ── Actor helpers ─────────────────────────────────────────────────

async function runActor(actorId, input) {
  const run = await apify.actor(actorId).call(input);
  const { items } = await apify.dataset(run.defaultDatasetId).listItems();
  return items ?? [];
}

// ── Scrapers ──────────────────────────────────────────────────────

async function scanInstagram() {
  const items = await runActor("apify/instagram-hashtag-scraper", {
    hashtags: ["asoebi", "owambe", "abujaBride", "nigerianwedding", "birthdayoutfit"],
    resultsLimit: 20,
  });

  return items.map((item) => ({
    platform: "instagram",
    hashtag: item.hashtag ?? "",
    engagement_score: (item.likesCount ?? 0) + (item.commentsCount ?? 0),
    sample_post: item.caption ?? "",
  }));
}

async function scanTikTok() {
  const items = await runActor("clockworks/tiktok-scraper", {
    searchQueries: [
      "asoebi outfit",
      "owambe fashion",
      "abuja wedding outfit",
      "birthday dress",
    ],
    maxItems: 20,
  });

  return items.map((item) => ({
    platform: "tiktok",
    hashtag: item.searchQuery ?? item.text?.split(" ")[0] ?? "",
    engagement_score: (item.diggCount ?? 0) + (item.commentCount ?? 0),
    sample_post: item.text ?? item.desc ?? "",
  }));
}

// ── Main handler ──────────────────────────────────────────────────

export default async function handler(req, res) {
  // Allow GET and POST
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const [instagramSignals, tiktokSignals] = await Promise.all([
      scanInstagram(),
      scanTikTok(),
    ]);

    const signals = [...instagramSignals, ...tiktokSignals];

    if (signals.length > 0) {
      const { error } = await supabase.from("trend_signals").insert(signals);
      if (error) throw new Error(`Supabase insert failed: ${error.message}`);
    }

    console.log(`[scan-trends] Stored ${signals.length} trend signals`);
    return res.status(200).json({ success: true, signalsInserted: signals.length });
  } catch (err) {
    console.error("[scan-trends] Error:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}
