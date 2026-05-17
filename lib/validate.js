/**
 * Tweet validation — enforces brand rules and pillar-specific URL policy.
 *
 * @param {string} tweet
 * @param {"problem"|"brand"|"promo"} pillar
 * @returns {{ valid: boolean, reason: string }}
 */
export function validateTweet(tweet, pillar) {
  // 1. Length
  if (tweet.length > 270) {
    return { valid: false, reason: `Tweet is ${tweet.length} chars (limit 270)` };
  }

  // 2. No emojis — \p{Extended_Pictographic} matches actual emoji glyphs without
  //    the false positives that \p{Emoji} has for digits and punctuation.
  const emojiRegex = /\p{Extended_Pictographic}/u;
  if (emojiRegex.test(tweet)) {
    return { valid: false, reason: "Tweet contains an emoji" };
  }

  // 3. Banned phrases
  const banned = ["best", "#1", "guaranteed", "100%", "miracle", "cure"];
  for (const word of banned) {
    if (tweet.toLowerCase().includes(word.toLowerCase())) {
      return { valid: false, reason: `Tweet contains banned phrase: "${word}"` };
    }
  }

  // 4. URL policy
  const urlRegex = /https?:\/\/\S+/gi;
  const urls = tweet.match(urlRegex) ?? [];

  if (pillar === "promo") {
    // Must contain smelloff.in at least once
    if (!tweet.includes("smelloff.in")) {
      return { valid: false, reason: 'Promo tweet must contain "smelloff.in"' };
    }
  } else {
    // Non-promo tweets must not contain any URL
    if (urls.length > 0) {
      return { valid: false, reason: `Non-promo tweet must not contain URLs (found: ${urls[0]})` };
    }
  }

  return { valid: true, reason: "ok" };
}
