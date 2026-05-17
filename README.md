# Smelloff Daily Tweet Pipeline

Automated daily tweet engine for [@smell0ff](https://x.com/smell0ff). Every day at 10:00 AM IST a Vercel Cron job fires, the Anthropic API generates a fresh on-brand tweet using the day's content pillar (problem / brand / promo), the tweet is validated against brand rules, and it is posted to X via the v2 API — entirely unattended.

---

## How it works

```
Vercel Cron (10 AM IST)
  → GET /api/daily-tweet
      → pillar from day-of-week (IST)
      → Anthropic claude-sonnet-4-20250514 generates tweet
      → validate (length, emojis, banned words, URL policy)
      → retry once if invalid → fallback bank if still invalid
      → POST https://api.twitter.com/2/tweets
      → return JSON { ok, pillar, source, tweet, tweetId, timestamp }
```

Content pillar schedule (IST):

| Day | Pillar |
|---|---|
| Monday, Tuesday, Wednesday, Saturday | problem |
| Thursday, Sunday | brand |
| Friday | promo |

---

## 1. X Developer App setup

> **Critical — read before generating credentials.**

1. Go to [developer.twitter.com](https://developer.twitter.com) and create a project + app if you do not have one.
2. Open the app settings → **User authentication settings**.
3. Set **App permissions** to **Read and Write** (default is Read-only; posting will return a 403 if you skip this).
4. **Regenerate your Access Token and Secret** after changing the permission — the old tokens carry Read-only scope and will not work for posting even after you update the setting.
5. The free X API tier allows approximately 500 tweets per month, which is well within the 30–31 tweets this pipeline sends.

---

## 2. Credentials you need

| Variable | Where to find it |
|---|---|
| `X_API_KEY` | App → Keys and Tokens → **API Key** |
| `X_API_SECRET` | App → Keys and Tokens → **API Key Secret** |
| `X_ACCESS_TOKEN` | App → Keys and Tokens → **Access Token** (generated for @smell0ff) |
| `X_ACCESS_SECRET` | App → Keys and Tokens → **Access Token Secret** |
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) → API Keys |
| `CRON_SECRET` | Generate locally: `openssl rand -hex 32` |

---

## 3. Set environment variables in Vercel

**Via dashboard:**
1. Open your project in the [Vercel dashboard](https://vercel.com).
2. Settings → Environment Variables.
3. Add each variable from `.env.example` with its real value.
4. Select **Production** (and optionally Preview/Development) for each.

**Via CLI:**
```bash
vercel env add ANTHROPIC_API_KEY production
vercel env add X_API_KEY production
vercel env add X_API_SECRET production
vercel env add X_ACCESS_TOKEN production
vercel env add X_ACCESS_SECRET production
vercel env add CRON_SECRET production
```

---

## 4. Deploy

```bash
npm install
vercel --prod
```

Vercel detects `vercel.json` automatically and registers the cron job on the production deployment.

> Cron jobs **only run on production deployments** (`vercel --prod`). Preview deployments do not trigger cron.

---

## 5. Test manually before trusting cron

Once deployed, curl the endpoint with your `CRON_SECRET`:

```bash
curl -s \
  -H "x-cron-secret: YOUR_CRON_SECRET" \
  https://your-project.vercel.app/api/daily-tweet | jq
```

Expected successful response:

```json
{
  "ok": true,
  "pillar": "problem",
  "source": "ai",
  "tweet": "...",
  "tweetId": "1234567890",
  "timestamp": "2025-05-17T04:30:00.000Z"
}
```

Tune `lib/brand.js` — specifically the `BRAND_CORE` block and `PILLAR_INSTRUCTIONS` — until the generated voice feels right. Re-deploy after each change.

---

## 6. File reference

```
api/daily-tweet.js   — serverless handler (auth, pillar, generate, validate, post)
lib/brand.js         — system prompt builder + fallback tweet bank
lib/twitter.js       — X API v2 POST via OAuth 1.0a
lib/validate.js      — tweet length, emoji, banned-word, URL checks
vercel.json          — cron schedule (30 4 * * * = 10:00 AM IST)
.env.example         — env var template
```

---

## 7. Validation rules (enforced on every tweet)

- Max 270 characters
- No emojis
- No exclamation marks *(enforced by the system prompt; not a hard code check)*
- No banned phrases: `best`, `#1`, `guaranteed`, `100%`, `miracle`, `cure`
- **Promo pillar**: must contain `smelloff.in`
- **Non-promo pillars**: must not contain any URL

If the AI fails validation twice, a pre-written fallback tweet from `lib/brand.js` is used. The `source` field in the JSON response tells you which path was taken (`ai`, `ai-retry`, or `fallback`).

---

## 8. Monitoring

- View cron execution logs in the Vercel dashboard under **Logs** (filter by `/api/daily-tweet`).
- Each run logs the pillar, source, and final tweet text to stdout.
- The JSON response is also captured in Vercel's function logs.
