import { ApifyClient } from "apify-client";

// Works in both Vite (browser) and Node.js (Vercel serverless)
const token =
  import.meta.env?.VITE_APIFY_API_TOKEN ?? process.env.APIFY_API_TOKEN;

export const apify = new ApifyClient({ token });

export async function runActor(actorId, input = {}) {
  try {
    const run = await apify.actor(actorId).call(input);
    const { items } = await apify.dataset(run.defaultDatasetId).listItems();
    return items ?? [];
  } catch (err) {
    console.error(`[apifyClient] Actor "${actorId}" failed:`, err.message);
    return [];
  }
}
