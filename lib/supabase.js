/**
 * Supabase tweet-log helper.
 *
 * Logs each cron run to public.tweet_log so you can audit history without
 * tailing Vercel logs.  Entirely optional — if SUPABASE_URL or
 * SUPABASE_ANON_KEY are missing the function silently skips logging.
 */

import { createClient } from "@supabase/supabase-js";

let _client = null;

function getClient() {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  _client = createClient(url, key);
  return _client;
}

/**
 * @param {{ slot: number, pillar: string, tweet_text: string, tweet_id?: string, status: "success"|"error", error?: string }} entry
 */
export async function logTweet(entry) {
  const supabase = getClient();
  if (!supabase) return;

  const { error } = await supabase.from("tweet_log").insert(entry);
  if (error) {
    console.error("[supabase] Failed to log tweet:", error.message);
  }
}
