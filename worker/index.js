// Ruka's English Lab — AI backend (Cloudflare Worker)
//
// Holds the Anthropic API key server-side and exposes two endpoints the
// static frontend (GitHub Pages) calls over fetch(). Never put an API key
// in the frontend — this Worker exists precisely so the key never reaches
// the browser.
//
//   POST /suggest   { phrase }                  -> { natives: string[], tip }
//   POST /analyze   { tags, notes }              -> { summary }
//
// Setup: see ../SETUP_AI.md

const MODEL = 'claude-haiku-4-5';
const ANTHROPIC_VERSION = '2023-06-01';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

async function callClaude(env, system, userText, maxTokens = 512) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: userText }],
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${errText}`);
  }
  const data = await res.json();
  const textBlock = (data.content || []).find(b => b.type === 'text');
  return textBlock ? textBlock.text : '';
}

function extractJson(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch (e) { return null; }
}

async function handleSuggest(request, env) {
  const { phrase } = await request.json();
  if (!phrase || typeof phrase !== 'string') {
    return json({ error: 'Missing "phrase" string in request body.' }, 400);
  }
  const system = `You are an English speaking coach helping a Japanese learner practicing C1 to C2 spoken English.
Given a phrase the learner used or is unsure about, suggest 2-3 more natural, native-sounding alternative ways to say it, and a one-sentence tip explaining the nuance or why it sounds more natural.
Respond with ONLY a JSON object, no other text, in exactly this shape:
{"natives": ["alternative 1", "alternative 2"], "tip": "one sentence explaining the nuance"}`;

  const text = await callClaude(env, system, `Phrase: "${phrase}"`, 400);
  const parsed = extractJson(text);
  if (!parsed || !Array.isArray(parsed.natives)) {
    return json({ natives: [], tip: text.trim() || 'No suggestion could be generated.' });
  }
  return json({ natives: parsed.natives, tip: parsed.tip || '' });
}

async function handleAnalyze(request, env) {
  const { tags, notes } = await request.json();
  const tagSummary = tags && typeof tags === 'object'
    ? Object.entries(tags).map(([t, c]) => `${t}: ${c}`).join(', ')
    : 'none recorded';
  const notesText = Array.isArray(notes) && notes.length
    ? notes.map(n => `- (${n.date || '?'}) topic: ${n.topic || '?'} | note: ${n.note || ''} | unsure phrase: ${n.phrase || ''}`).join('\n')
    : 'No freeform notes recorded.';

  const system = `You are an encouraging English speaking coach for a Japanese learner practicing C1 to C2 spoken English through recorded topic practice.
You will be given a tally of self-reported challenge tags and a list of freeform reflection notes from past practice sessions.
Write a short analysis (4-6 sentences, plain text, no markdown headers) that:
1) identifies the 1-2 most likely recurring weaknesses based on the evidence given,
2) is specific and grounded in the notes provided (quote or reference them briefly where useful),
3) ends with one concrete, actionable suggestion for what to focus on in the next few practice sessions.
Be warm and encouraging, not clinical.`;

  const userText = `Challenge tag tally: ${tagSummary}\n\nReflection notes:\n${notesText}`;
  const text = await callClaude(env, system, userText, 500);
  return json({ summary: text.trim() });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }
    if (request.method !== 'POST') {
      return json({ error: 'Only POST is supported.' }, 405);
    }
    if (!env.ANTHROPIC_API_KEY) {
      return json({ error: 'Server is missing ANTHROPIC_API_KEY. See SETUP_AI.md.' }, 500);
    }

    const url = new URL(request.url);
    try {
      if (url.pathname === '/suggest') return await handleSuggest(request, env);
      if (url.pathname === '/analyze') return await handleAnalyze(request, env);
      return json({ error: 'Unknown endpoint. Use /suggest or /analyze.' }, 404);
    } catch (err) {
      return json({ error: String(err && err.message ? err.message : err) }, 500);
    }
  },
};
