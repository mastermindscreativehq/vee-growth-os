import { ApifyClient } from "apify-client";

const APIFY_TOKEN = process.env.APIFY_API_TOKEN;

console.log("[apifyClient] Token present:", !!APIFY_TOKEN);

if (!APIFY_TOKEN) {
  throw new Error("Missing APIFY_API_TOKEN environment variable");
}

export const apify = new ApifyClient({ token: APIFY_TOKEN });

export async function runActor(actorId, input = {}) {
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
