import { runActor } from "./apifyClient";
import { supabase } from "../lib/supabaseClient";

const INSTAGRAM_HASHTAGS = [
  "asoebi",
  "owambe",
  "abujaBride",
  "nigerianwedding",
  "birthdayoutfit",
];

const TIKTOK_QUERIES = [
  "asoebi outfit",
  "owambe fashion",
  "abuja wedding outfit",
  "birthday dress",
];

async function scanInstagram() {
  const items = await runActor("apify/instagram-hashtag-scraper", {
    hashtags: INSTAGRAM_HASHTAGS,
    resultsLimit: 20,
  });

  return items.map((item) => ({
    platform: "instagram",
    hashtag: item.hashtag ?? item.topPostsOnly ?? "",
    engagement_score: (item.likesCount ?? 0) + (item.commentsCount ?? 0),
    sample_post: item.caption ?? item.alt ?? "",
  }));
}

async function scanTikTok() {
  const items = await runActor("clockworks/tiktok-scraper", {
    searchQueries: TIKTOK_QUERIES,
    maxItems: 20,
  });

  return items.map((item) => ({
    platform: "tiktok",
    hashtag: item.searchQuery ?? item.text?.split(" ")[0] ?? "",
    engagement_score: (item.diggCount ?? 0) + (item.commentCount ?? 0),
    sample_post: item.text ?? item.desc ?? "",
  }));
}

async function storeTrends(signals) {
  if (!signals.length) return;
  const { error } = await supabase.from("trend_signals").insert(signals);
  if (error) {
    console.error("[trendScanner] Failed to store signals:", error.message);
  }
}

export async function scanTrends() {
  try {
    const [instagramSignals, tiktokSignals] = await Promise.all([
      scanInstagram(),
      scanTikTok(),
    ]);

    const combined = [...instagramSignals, ...tiktokSignals];
    await storeTrends(combined);

    console.log(`[trendScanner] Stored ${combined.length} trend signals`);
    return combined;
  } catch (err) {
    console.error("[trendScanner] scanTrends failed:", err.message);
    return [];
  }
}
