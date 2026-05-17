/**
 * /api/daily-tweet — Vercel serverless function
 *
 * Runs daily via Vercel Cron (30 4 * * * UTC = 10:00 AM IST).
 * Generates a brand-voice tweet with Anthropic, validates it, posts to @smell0ff.
 *
 * Flow:
 *   1. Auth check  (x-cron-secret header or Vercel's Authorization: Bearer)
 *   2. Pillar selection from day-of-week in IST
 *   3. AI generation (claude-sonnet-4-20250514)
 *   4. Validate → retry once → fallback to pre-written bank
 *   5. Post to X API v2
 *   6. Return JSON result
 */

import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt, FALLBACK } from "../lib/brand.js";
import { validateTweet } from "../lib/validate.js";
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
 * Returns today's content pillar using the IST timezone.
 * Vercel functions run in UTC, so we compute IST explicitly.
 * @returns {"problem"|"brand"|"promo"}
 */
function getPillar() {
  // "en-IN" locale in "Asia/Kolkata" gives us the local weekday
  const formatter = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
  });
  const dayShort = formatter.format(new Date()); // e.g. "Mon", "Tue" …

  // Map abbreviated weekday → 0-based index (Sun=0)
  const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const dayIndex = dayMap[dayShort];
  return PILLAR_BY_DAY[dayIndex];
}

// ---------------------------------------------------------------------------
// Anthropic generation
// ---------------------------------------------------------------------------
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Ask Anthropic to write a tweet for the given pillar.
 * @param {"problem"|"brand"|"promo"} pillar
 * @returns {Promise<string>} raw tweet text
 */
async function generateTweet(pillar) {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    system: buildSystemPrompt(pillar),
    messages: [{ role: "user", content: "Write today's tweet." }],
  });

  // Extract plain text from the first content block
  const raw = message.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  // Strip wrapping quotes the model sometimes adds
  return raw.replace(/^["'"']|["'"']$/g, "").trim();
}

// ---------------------------------------------------------------------------
// Pick a random fallback tweet for the given pillar
// ---------------------------------------------------------------------------
function pickFallback(pillar) {
  const pool = FALLBACK[pillar];
  return pool[Math.floor(Math.random() * pool.length)];
}

// ---------------------------------------------------------------------------
// Auth check
// Accepts either:
//   - "x-cron-secret: <CRON_SECRET>" header  (manual curl tests)
//   - "Authorization: Bearer <CRON_SECRET>"  (Vercel Cron native header)
// ---------------------------------------------------------------------------
function isAuthorized(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // No secret configured — block all requests for safety
    return false;
  }
  const xHeader = req.headers["x-cron-secret"];
  const authHeader = req.headers["authorization"];
  return (
    xHeader === secret ||
    authHeader === `Bearer ${secret}`
  );
}

// ---------------------------------------------------------------------------
// Main handler (Vercel serverless default export)
// ---------------------------------------------------------------------------
export default async function handler(req, res) {
  // 1. Auth
  if (!isAuthorized(req)) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  const timestamp = new Date().toISOString();

  try {
    // 2. Pillar
    const pillar = getPillar();

    // 3 & 4. Generate → validate → retry → fallback
    let tweet;
    let source;

    const first = await generateTweet(pillar);
    const firstCheck = validateTweet(first, pillar);

    if (firstCheck.valid) {
      tweet = first;
      source = "ai";
    } else {
      console.warn(`[daily-tweet] First generation failed validation: ${firstCheck.reason}`);

      const second = await generateTweet(pillar);
      const secondCheck = validateTweet(second, pillar);

      if (secondCheck.valid) {
        tweet = second;
        source = "ai-retry";
      } else {
        console.warn(`[daily-tweet] Second generation failed validation: ${secondCheck.reason}. Using fallback.`);
        tweet = pickFallback(pillar);
        source = "fallback";
      }
    }

    console.log(`[daily-tweet] pillar=${pillar} source=${source}`);
    console.log(`[daily-tweet] tweet: ${tweet}`);

    // 5. Post
    const tweetId = await postTweet(tweet);

    // 6. Respond
    return res.status(200).json({
      ok: true,
      pillar,
      source,
      tweet,
      tweetId,
      timestamp,
    });
  } catch (err) {
    console.error("[daily-tweet] Fatal error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
