/**
 * ═══════════════════════════════════════════════════════════
 *  HERMES // AGENT — Serverless Chat Proxy  (Vercel)
 *  Streaming SSE → OpenRouter. Key aman di server-side env.
 *
 *  ENV (.env / Vercel Dashboard):
 *    OPENROUTER_API_KEY=sk-or-v1-xxxx
 *    OPENROUTER_SITE_URL=https://hermes-agent.vercel.app   (opsional)
 *    OPENROUTER_APP_NAME=HERMES Agent                       (opsional)
 * ═══════════════════════════════════════════════════════════
 */

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

module.exports = async function handler(req, res) {
  // ── CORS (aman untuk same-origin; longgarkan bila dipanggil lintas origin) ──
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "METHOD_NOT_ALLOWED — gunakan POST" });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "OPENROUTER_API_KEY belum dikonfigurasi di environment Vercel.",
    });
  }

  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: "BODY_INVALID — JSON tidak terbaca" });
  }

  const { messages = [], persona = "", model = "anthropic/claude-opus-4.1" } = body || {};

  if (!Array.isArray(messages) || !messages.length) {
    return res.status(400).json({ error: "MESSAGES_EMPTY" });
  }

  // ── susun payload OpenRouter ──
  const systemMsg = persona
    ? { role: "system", content: persona }
    : { role: "system", content: "Kamu adalah HERMES, agen AI yang membantu dengan presisi." };

  const upstream = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      // referer opsional (untuk ranking di OpenRouter)
      ...(process.env.OPENROUTER_SITE_URL ? { "HTTP-Referer": process.env.OPENROUTER_SITE_URL } : {}),
      ...(process.env.OPENROUTER_APP_NAME ? { "X-Title": process.env.OPENROUTER_APP_NAME } : {}),
    },
    body: JSON.stringify({
      model,                       // slug apa pun: opus, sonnet, gpt, gemini, ds, llama…
      messages: [systemMsg, ...messages],
      stream: true,
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const errText = await upstream.text().catch(() => "upstream error");
    return res.status(upstream.status).json({
      error: `OPENROUTER_${upstream.status}`,
      detail: errText.slice(0, 400),
    });
  }

  // ── pipe stream mentah ke client (format SSE OpenAI-compatible) ──
  res.status(200);
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");   // matikan buffering nginx/vercel edge

  const reader = upstream.body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
      // flush cepat agar streaming terasa real-time
      if (typeof res.flush === "function") res.flush();
    }
  } catch (e) {
    if (!res.writableEnded) res.write(`data: {"error":"STREAM_INTERRUPTED"}\n\n`);
  } finally {
    res.end();
  }
};
