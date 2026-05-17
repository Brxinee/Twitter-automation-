/**
 * /api/daily-tweet — Vercel serverless function
 *
 * Called 10 times daily via Vercel Cron, each with a different ?slot=N (0–9).
 * Picks a unique pre-written tweet for this pillar + slot combination and posts
 * it to @smell0ff via X API v2.
 *
 * Schedule (IST):  slot 0 = 7:00 AM  slot 5 = 3:00 PM
 *                  slot 1 = 8:30 AM  slot 6 = 5:00 PM
 *                  slot 2 = 10:00 AM slot 7 = 6:30 PM
 *                  slot 3 = 12:00 PM slot 8 = 8:00 PM
 *                  slot 4 = 1:30 PM  slot 9 = 9:30 PM
 *
 * Flow:
 *   1. Auth check  (x-cron-secret header or Vercel's Authorization: Bearer)
 *   2. Read slot index (0–9) from ?slot query param
 *   3. Pillar from day-of-week in IST
 *   4. Pick tweet: index = (dayOfYear * 10 + slot) % pool.length
 *   5. Post to X API v2
 *   6. Return JSON result
 */

import { FALLBACK } from "../lib/brand.js";
import { postTweet } from "../lib/twitter.js";

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

/**
 * Returns the IST-based pillar and day-of-year.
 * @returns {{ pillar: string, dayOfYear: number }}
 */
function getPillarAndDay() {
  const now = new Date();

  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    month: "numeric",
    day: "numeric",
    year: "numeric",
  }).formatToParts(now);

  const get = (type) => parts.find((p) => p.type === type)?.value;

  const dayShort = get("weekday");
  const istYear  = Number(get("year"));
  const istMonth = Number(get("month")) - 1;
  const istDay   = Number(get("day"));

  const startOfYear = new Date(Date.UTC(istYear, 0, 1));
  const istDate     = new Date(Date.UTC(istYear, istMonth, istDay));
  const dayOfYear   = Math.floor((istDate - startOfYear) / 86_400_000);

  const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const pillar = PILLAR_BY_DAY[dayMap[dayShort]];

  return { pillar, dayOfYear };
}

/**
 * Pick a tweet that is unique within the day.
 * Using (dayOfYear * 10 + slot) ensures no two slots on the same day repeat,
 * and the sequence rotates across the full pool over time.
 *
 * @param {"problem"|"brand"|"promo"} pillar
 * @param {number} dayOfYear  0-based
 * @param {number} slot       0-9
 * @returns {string}
 */
function pickTweet(pillar, dayOfYear, slot) {
  const pool = FALLBACK[pillar];
  return pool[(dayOfYear * 10 + slot) % pool.length];
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

  // 2. Slot
  const slotRaw = req.query?.slot ?? "0";
  const slot = Math.max(0, Math.min(9, Number(slotRaw) || 0));

  const timestamp = new Date().toISOString();

  try {
    // 3. Pillar + day
    const { pillar, dayOfYear } = getPillarAndDay();

    // 4. Pick tweet
    const tweet = pickTweet(pillar, dayOfYear, slot);

    console.log(`[daily-tweet] slot=${slot} pillar=${pillar} day=${dayOfYear}`);
    console.log(`[daily-tweet] tweet: ${tweet}`);

    // 5. Post
    const tweetId = await postTweet(tweet);

    // 6. Respond
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
    return res.status(500).json({ ok: false, error: err.message });
  }
}
