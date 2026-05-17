# Smelloff Daily Tweet Pipeline

Automated tweet engine for [@smell0ff](https://x.com/smell0ff). Posts 2 pre-written brand tweets per day via Vercel Cron — entirely unattended, completely free. Vercel Hobby plan (free) allows 2 cron jobs. X API free tier allows 500 posts/month; 2/day = ~62/month, well within that limit.

---

## Schedule

2 posts per day on the Vercel free plan:

| Slot | IST time | UTC (cron) |
|---|---|---|
| 0 | 10:00 AM | `30 4 * * *` |
| 1 | 8:00 PM | `30 14 * * *` |

Content pillar by day (IST):

| Day | Pillar |
|---|---|
| Monday, Tuesday, Wednesday, Saturday | problem |
| Thursday, Sunday | brand |
| Friday | promo |

Each slot picks a different tweet from the 10-tweet pool, so no tweet repeats within the same day.

> **Vercel Hobby (free) allows 2 cron jobs.** This config uses exactly 2 — no paid plan needed.

---

## How it works

```
Vercel Cron fires (10x daily)
  → GET /api/daily-tweet?slot=N
      → pillar from day-of-week (IST)
      → tweet = pool[(dayOfYear * 10 + slot) % pool.length]
      → POST https://api.twitter.com/2/tweets
      → return JSON { ok, slot, pillar, source, tweet, tweetId, timestamp }
```

---

## 1. X Developer App setup

> **Critical — read before generating credentials.**

1. Go to [developer.twitter.com](https://developer.twitter.com) and create a project + app.
2. Open app settings → **User authentication settings**.
3. Set **App permissions** to **Read and Write** (default is Read-only — posting returns 403 otherwise).
4. **Regenerate your Access Token and Secret** after changing the permission. Old tokens carry Read-only scope and will fail silently.
5. X free tier: ~500 posts/month. 10/day = ~310/month — within limit.

---

## 2. Credentials (5 env vars total — no AI key needed)

| Variable | Where to find it |
|---|---|
| `X_API_KEY` | App → Keys and Tokens → **API Key** |
| `X_API_SECRET` | App → Keys and Tokens → **API Key Secret** |
| `X_ACCESS_TOKEN` | App → Keys and Tokens → **Access Token** (for @smell0ff) |
| `X_ACCESS_SECRET` | App → Keys and Tokens → **Access Token Secret** |
| `CRON_SECRET` | Generate: `openssl rand -hex 32` |

---

## 3. Set environment variables in Vercel

**Via dashboard:**
Settings → Environment Variables → add each var → select **Production**.

**Via CLI:**
```bash
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

Vercel detects `vercel.json` and registers the 2 cron jobs on the production deployment.

> Cron jobs **only run on production** (`vercel --prod`). Preview deployments do not trigger cron.

---

## 5. Test manually

```bash
# Test slot 0 (10 AM tweet)
curl -s \
  -H "x-cron-secret: YOUR_CRON_SECRET" \
  "https://your-project.vercel.app/api/daily-tweet?slot=0" | jq

# Test slot 1 (8 PM tweet)
curl -s \
  -H "x-cron-secret: YOUR_CRON_SECRET" \
  "https://your-project.vercel.app/api/daily-tweet?slot=1" | jq
```

Expected response:
```json
{
  "ok": true,
  "slot": 0,
  "pillar": "problem",
  "source": "scheduled",
  "tweet": "...",
  "tweetId": "1234567890",
  "timestamp": "2025-05-17T04:30:00.000Z"
}
```

---

## 6. Editing tweets

Open `lib/brand.js` and edit the `FALLBACK` arrays. Each pillar has 10 tweets — the 2 daily slots cycle through them over time. Adding more tweets extends the repeat cycle.

Rules:
- Max 270 characters
- No emojis, no exclamation marks, no hashtags
- No banned phrases: `best`, `#1`, `guaranteed`, `100%`, `miracle`, `cure`
- **Promo tweets**: must contain `smelloff.in`
- **Problem / brand tweets**: must not contain any URL

---

## 7. File reference

```
api/daily-tweet.js   — serverless handler (auth, slot, pillar, pick, post)
lib/brand.js         — 30 pre-written tweets (10 per pillar) — edit content here
lib/twitter.js       — X API v2 POST via OAuth 1.0a
lib/validate.js      — validation helpers
vercel.json          — 2 cron schedules (10 AM + 8 PM IST)
.env.example         — env var template
```

---

## 8. Monitoring

Vercel dashboard → **Logs** → filter by `/api/daily-tweet`. Each run logs slot, pillar, and tweet text.
