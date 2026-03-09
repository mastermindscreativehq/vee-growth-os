import { ApifyClient } from "apify-client";

const APIFY_TOKEN = process.env.APIFY_API_TOKEN;

console.log("[apifyClient] Token present:", !!APIFY_TOKEN);

// Client initialized lazily — missing token logs a warning but never crashes the module
export const apify = APIFY_TOKEN ? new ApifyClient({ token: APIFY_TOKEN }) : null;

export async function runActor(actorId, input = {}) {
  if (!APIFY_TOKEN || !apify) {
    console.warn("[apifyClient] APIFY_API_TOKEN not set — skipping actor run");
    return [];
  }
  try {
    console.log(`[apifyClient] Starting actor: ${actorId}`);
    const run = await apify.actor(actorId).call(input);
    const { items } = await apify.dataset(run.defaultDatasetId).listItems();
    console.log(`[apifyClient] Actor "${actorId}" returned ${items.length} items`);
    return items ?? [];
  } catch (err) {
    console.error(`[apifyClient] Actor "${actorId}" failed:`, err.message);
    return [];
  }
}
