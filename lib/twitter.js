/**
 * Posts a tweet to X (Twitter) via API v2 using OAuth 1.0a.
 *
 * Uses the oauth-1.0a package + Node's built-in crypto for HMAC-SHA1 signing.
 * Credentials are read from environment variables — nothing is hardcoded.
 */

import OAuth from "oauth-1.0a";
import crypto from "crypto";

const TWEET_URL = "https://api.twitter.com/2/tweets";

/**
 * Build an OAuth 1.0a client signed for X API v2.
 * @returns {OAuth}
 */
function buildOAuthClient() {
  return new OAuth({
    consumer: {
      key: process.env.X_API_KEY,
      secret: process.env.X_API_SECRET,
    },
    signature_method: "HMAC-SHA1",
    hash_function(base_string, key) {
      return crypto.createHmac("sha1", key).update(base_string).digest("base64");
    },
  });
}

/**
 * Post a tweet and return the created tweet's ID.
 *
 * @param {string} text
 * @returns {Promise<string>} tweetId
 * @throws if the request fails or the API returns an error
 */
export async function postTweet(text) {
  const oauth = buildOAuthClient();

  const token = {
    key: process.env.X_ACCESS_TOKEN,
    secret: process.env.X_ACCESS_SECRET,
  };

  const requestData = {
    url: TWEET_URL,
    method: "POST",
  };

  // oauth-1.0a computes the Authorization header value
  const authHeader = oauth.toHeader(oauth.authorize(requestData, token));

  const body = JSON.stringify({ text });

  let response;
  try {
    response = await fetch(TWEET_URL, {
      method: "POST",
      headers: {
        ...authHeader,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body,
    });
  } catch (err) {
    throw new Error(`Network error posting tweet: ${err.message}`);
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail = data?.detail ?? data?.title ?? JSON.stringify(data);
    throw new Error(`X API error ${response.status}: ${detail}`);
  }

  const tweetId = data?.data?.id;
  if (!tweetId) {
    throw new Error(`X API returned no tweet ID. Response: ${JSON.stringify(data)}`);
  }

  return tweetId;
}
