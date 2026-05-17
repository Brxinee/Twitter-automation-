# Smelloff Daily Tweet Pipeline

Automated tweet engine for [@smell0ff](https://x.com/smell0ff). Posts 10 pre-written brand tweets per day at optimal IST times via Vercel Cron — entirely unattended. No AI API cost. Only dependency beyond Vercel is the X free tier (500 posts/month; 10/day = ~310/month, well within limit).

---

## Schedule

10 posts per day, spread across peak engagement windows in IST:

| Slot | IST time | UTC (cron) |
|---|---|---|
| 0 | 7:00 AM | `30 1 * * *` |
| 1 | 8:30 AM | `0 3 * * *` |
| 2 | 10:00 AM | `30 4 * * *` |
| 3 | 12:00 PM | `30 6 * * *` |
| 4 | 1:30 PM | `0 8 * * *` |
| 5 | 3:00 PM | `30 9 * * *` |
| 6 | 5:00 PM | `30 11 * * *` |
| 7 | 6:30 PM | `0 13 * * *` |
| 8 | 8:00 PM | `30 14 * * *` |
| 9 | 9:30 PM | `0 16 * * *` |

Content pillar by day (IST):

| Day | Pillar |
|---|---|
| Monday, Tuesday, Wednesday, Saturday | problem |
| Thursday, Sunday | brand |
| Friday | promo |

Each slot picks a different tweet from the 10-tweet pool, so no tweet repeats within the same day.

> **Vercel plan required:** 10 cron jobs require **Vercel Pro** ($20/month). The free Hobby plan caps at 2 cron jobs. If you want fewer posts to stay on the free plan, remove entries from `vercel.json`.

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

Vercel detects `vercel.json` and registers all 10 cron jobs on the production deployment.

> Cron jobs **only run on production** (`vercel --prod`). Preview deployments do not trigger cron.

---

## 5. Test manually

```bash
# Test slot 0 (7 AM tweet)
curl -s \
  -H "x-cron-secret: YOUR_CRON_SECRET" \
  "https://your-project.vercel.app/api/daily-tweet?slot=0" | jq

# Test slot 5 (3 PM tweet)
curl -s \
  -H "x-cron-secret: YOUR_CRON_SECRET" \
  "https://your-project.vercel.app/api/daily-tweet?slot=5" | jq
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
  "timestamp": "2025-05-17T01:30:00.000Z"
}
```

---

## 6. Editing tweets

Open `lib/brand.js` and edit the `FALLBACK` arrays. Each pillar has 10 tweets (one per daily slot). Adding more tweets extends the repeat cycle.

Rules:
- Max 270 characters
- No emojis, no exclamation marks, no hashtags
- No banned phrases: `best`, `#1`, `guaranteed`, `100%`, `miracle`, `cure`
- **Promo tweets**: must contain `smelloff.in`
- **Problem / brand tweets**: must not contain any URL

---

## 7. Want fewer than 10 posts/day (free Vercel plan)?

Remove cron entries from `vercel.json`. Hobby plan allows up to 2. For example, keep slots 2 and 8 for a 10 AM and 8 PM post:

```json
{
  "crons": [
    { "path": "/api/daily-tweet?slot=2", "schedule": "30 4 * * *" },
    { "path": "/api/daily-tweet?slot=8", "schedule": "30 14 * * *" }
  ]
}
```

---

## 8. File reference

```
api/daily-tweet.js   — serverless handler (auth, slot, pillar, pick, post)
lib/brand.js         — 30 pre-written tweets (10 per pillar) — edit content here
lib/twitter.js       — X API v2 POST via OAuth 1.0a
lib/validate.js      — validation helpers
vercel.json          — 10 cron schedules
.env.example         — env var template
```

---

## 9. Monitoring

Vercel dashboard → **Logs** → filter by `/api/daily-tweet`. Each run logs slot, pillar, and tweet text.
