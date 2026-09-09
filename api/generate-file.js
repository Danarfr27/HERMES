/**
 * ═══════════════════════════════════════════════════════════
 *  HERMES // AGENT — Serverless File Forge  (Vercel)
 *  Minta model memproduksi SATU file lengkap → parsing →
 *  kembalikan metadata + content (frontend ubah jadi blob
 *  URL / link sandbox untuk diunduh).
 *
 *  Untuk penyimpanan persisten di production: ganti return
 *  dengan upload ke Vercel Blob (@vercel/blob) lalu return
 *  { url } permanen.
 * ═══════════════════════════════════════════════════════════
 */

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const MIME = {
  html: "text/html", css: "text/css", js: "text/javascript", mjs: "text/javascript",
  json: "application/json", md: "text/markdown", py: "text/x-python", txt: "text/plain",
  svg: "image/svg+xml", xml: "application/xml", csv: "text/csv", sql: "application/sql",
  ts: "text/typescript", yml: "text/yaml", yaml: "text/yaml", sh: "application/x-sh",
};

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "OPENROUTER_API_KEY belum dikonfigurasi." });

  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: "BODY_INVALID" });
  }

  const { instruction = "", persona = "", model = "anthropic/claude-opus-4.1" } = body || {};
  if (!instruction.trim()) return res.status(400).json({ error: "INSTRUCTION_EMPTY" });

  const forgeSystem = `${persona}

Kamu sekarang beroperasi sebagai FILE FORGE. Aturan KAKI:
1. Hasilkan SATU file lengkap sesuai instruksi user.
2. Jawabanmu HARUS diawali baris persis: ===FILE: namafile.ext===
3. Setelah baris itu, langsung tulis SELURUH konten file. Tanpa penjelasan sebelum/sesudah.
4. Konten harus runnable/valid — bukan pseudocode.`;

  const upstream = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...(process.env.OPENROUTER_SITE_URL ? { "HTTP-Referer": process.env.OPENROUTER_SITE_URL } : {}),
      ...(process.env.OPENROUTER_APP_NAME ? { "X-Title": process.env.OPENROUTER_APP_NAME } : {}),
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: forgeSystem },
        { role: "user", content: instruction },
      ],
      stream: false,
      temperature: 0.4,
      max_tokens: 8192,
    }),
  });

  if (!upstream.ok) {
    const t = await upstream.text().catch(() => "upstream error");
    return res.status(upstream.status).json({ error: `OPENROUTER_${upstream.status}`, detail: t.slice(0, 300) });
  }

  const data = await upstream.json();
  const raw = data.choices?.[0]?.message?.content || "";
  if (!raw.trim()) return res.status(502).json({ error: "MODEL_EMPTY_OUTPUT" });

  // ── parsing ===FILE: nama.ext=== ──
  const m = raw.match(/===FILE:\s*([^\n=]+\.[a-zA-Z0-9]+)\s*===/);
  let filename, content;
  if (m) {
    filename = m[1].trim();
    content = raw.slice(m.index + m[0].length).trim();
    // buang code fence pembungkus bila model tetap membungkus
    content = content.replace(/^```[a-zA-Z0-9]*\n/, "").replace(/```\s*$/, "").trim();
  } else {
    // fallback: model tidak patuh format — tetap simpan sebagai artefak
    filename = `hermes-artifact-${Date.now()}.md`;
    content = raw.trim();
  }

  const ext = filename.split(".").pop().toLowerCase();
  return res.status(200).json({
    filename,
    content,
    mime: MIME[ext] || "text/plain",
    size: Buffer.byteLength(content, "utf8"),
    model,
  });
};
