# Setting up real AI analysis (optional)

By default, Ruka's English Lab gives phrase suggestions and challenge
analysis using a small built-in static dictionary — no server, no cost,
works instantly. If you'd like the app to use real Claude AI for these
instead (better suggestions, personalized written analysis), follow the
steps below. This is **optional** — the app works fine without it.

This takes about 5–10 minutes and costs only pennies per use (Claude
Haiku 4.5 pricing: $1 per million input tokens, $5 per million output
tokens — a single suggestion or analysis call uses well under 1,000
tokens total).

## Why a separate backend is needed

GitHub Pages only serves static files — it can't run server code or
keep secrets. An Anthropic API key must never be placed in the
frontend's `script.js`, because anyone who views the page's source
could steal it and run up charges on your account. So a tiny backend
("Cloudflare Worker") holds the key and the frontend calls that
instead of calling Claude directly.

## Step 1 — Get an Anthropic API key

1. Go to [console.anthropic.com](https://console.anthropic.com) and sign up / log in.
2. Add a small amount of credit (Settings → Billing). A few dollars will last a very long time at this usage level.
3. Go to **API Keys** and create a new key. Copy it somewhere safe — you won't be able to see it again.

## Step 2 — Create a free Cloudflare account

1. Go to [dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up) and sign up (free).
2. No credit card is required for the free Workers tier (100,000 requests/day).

## Step 3 — Deploy the Worker

You can do this from the Cloudflare dashboard (no command line needed):

1. In the Cloudflare dashboard, go to **Workers & Pages** → **Create** → **Create Worker**.
2. Give it any name (e.g. `ruka-english-lab-ai`) and click **Deploy** to create the placeholder.
3. Click **Edit code**, delete the placeholder code, and paste in the entire contents of this repo's `worker/index.js` file.
4. Click **Deploy** to save.
5. Go to the Worker's **Settings → Variables and Secrets**, add a new **Secret** named `ANTHROPIC_API_KEY`, and paste in the API key from Step 1. Save.
6. Copy the Worker's URL — it looks like `https://ruka-english-lab-ai.<your-subdomain>.workers.dev`.

(If you prefer the command line: install [`wrangler`](https://developers.cloudflare.com/workers/wrangler/), run `wrangler login`, then from the `worker/` folder run `wrangler secret put ANTHROPIC_API_KEY` followed by `wrangler deploy`.)

## Step 4 — Connect the app to your Worker

1. Open the deployed app and go to the **Recordings** tab.
2. Find the **🤖 AI Setup** card and paste your Worker's URL from Step 3 into the field.
3. Save. The phrase checker and challenge analysis will now call your Worker instead of the built-in static dictionary.

If the URL is left blank, or a request to it fails for any reason, the
app automatically falls back to the static (free, offline) suggestions
— it will never break the app.

## Cost expectations

With Claude Haiku 4.5, a single phrase check or analysis request costs
a small fraction of a cent. Realistic personal use (a few checks per
day) comes out to well under $1/month. You control spending directly
in your Anthropic Console — you can set a monthly spend limit there.
