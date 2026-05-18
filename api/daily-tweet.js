/**
 * /api/daily-tweet — Vercel serverless function
 *
 * Called twice daily via Vercel Cron (10 AM + 8 PM IST), each with ?slot=0 or ?slot=1.
 * Picks a unique pre-written tweet for today's pillar + slot and posts it to @smell0ff.
 *
 * Rotation formula: (pillarDayIndex * 2 + slot) % pool.length
 *   - pillarDayIndex counts only the days this pillar has been active so far this year
 *   - Every tweet in the pool gets posted — no skipping, no stuck-at-same-tweet bug
 *   - Repeat cycle = pool.length / 2 active days per pillar
 */

import { FALLBACK } from "../lib/brand.js";
import { postTweet } from "../lib/twitter.js";
import { logTweet } from "../lib/supabase.js";

// ---------------------------------------------------------------------------
// Content pillar mapping by IST day-of-week (0 = Sunday … 6 = Saturday)
// ---------------------------------------------------------------------------
const PILLAR_BY_DAY = {
  0: "brand",   // Sunday
  1: "problem", // Monday
  2: "problem", // Tuesday
  3: "problem", // Wednesday
  4: "brand",   // Thursday
  5: "promo",   // Friday
  6: "problem", // Saturday
};

const DAY_ABBR_TO_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/**
 * Parse today's date in IST and return pillar, IST year, and absolute day-of-year.
 * @returns {{ pillar: string, istYear: number, dayOfYear: number }}
 */
function getTodayIST() {
  const now = new Date();

  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(now);

  const get = (type) => parts.find((p) => p.type === type)?.value;

  const istYear  = Number(get("year"));
  const istMonth = Number(get("month")) - 1; // 0-based
  const istDay   = Number(get("day"));

  const startOfYear = new Date(Date.UTC(istYear, 0, 1));
  const todayUTC    = new Date(Date.UTC(istYear, istMonth, istDay));
  const dayOfYear   = Math.floor((todayUTC - startOfYear) / 86_400_000);

  const pillar = PILLAR_BY_DAY[DAY_ABBR_TO_INDEX[get("weekday")]];
  return { pillar, istYear, dayOfYear };
}

/**
 * Count how many days from Jan 1 (inclusive) up to but not including dayOfYear
 * were active days for the given pillar.
 *
 * This gives a monotonically increasing index specific to each pillar's schedule,
 * ensuring the full tweet pool cycles evenly with no tweets skipped.
 *
 * @param {string} pillar
 * @param {number} istYear
 * @param {number} dayOfYear  0-based, today
 * @returns {number}
 */
function getPillarDayIndex(pillar, istYear, dayOfYear) {
  const startOfYear = new Date(Date.UTC(istYear, 0, 1));
  const formatter   = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
  });
  let count = 0;
  for (let d = 0; d < dayOfYear; d++) {
    const date    = new Date(startOfYear.getTime() + d * 86_400_000);
    const weekday = formatter.format(date);
    if (PILLAR_BY_DAY[DAY_ABBR_TO_INDEX[weekday]] === pillar) count++;
  }
  return count;
}

/**
 * Pick the tweet for this pillar + slot combination.
 * @param {string} pillar
 * @param {number} pillarDayIndex
 * @param {number} slot  0 or 1
 * @returns {string}
 */
function pickTweet(pillar, pillarDayIndex, slot) {
  const pool = FALLBACK[pillar];
  return pool[(pillarDayIndex * 2 + slot) % pool.length];
}

// ---------------------------------------------------------------------------
// Auth check
// Accepts either:
//   - "x-cron-secret: <CRON_SECRET>" header  (manual curl tests)
//   - "Authorization: Bearer <CRON_SECRET>"  (Vercel Cron native header)
// ---------------------------------------------------------------------------
function isAuthorized(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const xHeader    = req.headers["x-cron-secret"];
  const authHeader = req.headers["authorization"];
  return xHeader === secret || authHeader === `Bearer ${secret}`;
}

// ---------------------------------------------------------------------------
// Main handler (Vercel serverless default export)
// ---------------------------------------------------------------------------
export default async function handler(req, res) {
  // 1. Auth
  if (!isAuthorized(req)) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  // 2. Slot (0 = 10 AM IST, 1 = 8 PM IST)
  const slot = Math.max(0, Math.min(1, Number(req.query?.slot ?? 0) || 0));

  const timestamp = new Date().toISOString();
  let pillar = null;

  try {
    // 3. Date + pillar
    const today = getTodayIST();
    pillar = today.pillar;
    const { istYear, dayOfYear } = today;

    // 4. Pillar-aware rotation index
    const pillarDayIndex = getPillarDayIndex(pillar, istYear, dayOfYear);

    // 5. Pick tweet
    const tweet = pickTweet(pillar, pillarDayIndex, slot);

    console.log(`[daily-tweet] slot=${slot} pillar=${pillar} pillarDay=${pillarDayIndex} tweetIdx=${(pillarDayIndex * 2 + slot) % FALLBACK[pillar].length}`);
    console.log(`[daily-tweet] tweet: ${tweet}`);

    // 6. Post
    const tweetId = await postTweet(tweet);

    // 7. Log to Supabase (best-effort)
    await logTweet({ slot, pillar, tweet_text: tweet, tweet_id: tweetId, status: "success" });

    // 8. Respond
    return res.status(200).json({
      ok: true,
      slot,
      pillar,
      source: "scheduled",
      tweet,
      tweetId,
      timestamp,
    });
  } catch (err) {
    console.error("[daily-tweet] Fatal error:", err);
    if (pillar) {
      await logTweet({ slot, pillar, tweet_text: "", status: "error", error: err.message }).catch(() => {});
    }
    return res.status(500).json({ ok: false, error: err.message });
  }
}
