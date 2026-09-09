# ⧉ HERMES // AGENT — Neural Interface v3.7.1

Antarmuka AI **serverless** bergaya cyberpunk: streaming chat real-time via OpenRouter,
sistem persona, parallax interaktif, particle field, dan **file generation** dengan
link sandbox. Frontend murni HTML/CSS/JS, backend berupa Vercel Serverless Functions.

![stack](https://img.shields.io/badge/stack-Vercel%20%C2%B7%20OpenRouter%20%C2%B7%20Vanilla%20JS-00f0ff)
![theme](https://img.shields.io/badge/theme-cyberpunk-ff2a6d)

---

## ✦ Arsitektur

```
┌──────────────────────────────────────────────────────┐
│  BROWSER (Vanilla HTML/CSS/JS)                       │
│  ├── Parallax engine + particle canvas (app.js)      │
│  ├── Persona core & model registry (personas.js)     │
│  └── Markdown renderer + blob sandbox link           │
├──────────────────────┬───────────────────────────────┤
│  /api/chat.js        │  /api/generate-file.js        │
│  POST → OpenRouter   │  POST → OpenRouter            │
│  SSE streaming proxy │  parse ===FILE: x.ext===      │
├──────────────────────┴───────────────────────────────┤
│  OPENROUTER_API_KEY  (server-side env — tak kelihatan│
│  di browser; dukung Opus, Sonnet, GPT, Gemini, dll)  │
└──────────────────────────────────────────────────────┘
```

## ✦ Fitur

- **Streaming real-time** — respons mengalir kata-per-kata (SSE → ReadableStream).
- **Persona system** — 4 core bawaan (PRIME / PHANTOM / SAGE / FORGE), mudah ditambah.
- **Model registry** — Opus, Sonnet, GPT-4o, o3-mini, Gemini, DeepSeek, Llama…
  tambah slug OpenRouter apa pun di `js/personas.js`.
- **File forge** — ketik `/file <instruksi>` → server minta model membuat file lengkap →
  frontend render kartu artefak + **link sandbox** (`sandbox://hermes.local/...`)
  yang bisa diklik untuk diunduh (blob URL).
- **Cyberpunk UI** — mouse parallax multi-layer, orbs neon, scanline flicker,
  glitch typography, boot sequence, telemetri live, clip-path cuts.
- **Zero dependency build** — tanpa bundler, tanpa framework.

## ✦ Setup Lokal

```bash
git clone https://github.com/<user>/hermes-agent.git
cd hermes-agent
cp .env.example .env.local        # isi OPENROUTER_API_KEY

npx vercel dev                    # atau: vercel dev
# buka http://localhost:3000
```

> Key lokal dibaca otomatis oleh Vercel CLI dari `.env.local` —
> frontend tidak pernah menyentuh key.

## ✦ Deploy ke Vercel

**Via GitHub (recommended):**

```bash
# 1) push ke GitHub
git init && git add -A && git commit -m "feat: hermes agent initial"
git branch -M main
git remote add origin https://github.com/<user>/hermes-agent.git
git push -u origin main

# 2) Vercel Dashboard → Add New → Project → Import repo
# 3) Settings → Environment Variables → tambahkan:
#       OPENROUTER_API_KEY = sk-or-v1-xxxx
# 4) Deploy. Selesai — /api/* otomatis jadi serverless functions.
```

**Via CLI:**

```bash
npm i -g vercel
vercel --prod
vercel env add OPENROUTER_API_KEY   # paste key saat diminta
vercel --prod                       # redeploy dengan env
```

## ✦ Konfigurasi Model

Semua konfigurasi model ada di **`js/personas.js`** (array `MODELS`):

```js
{ slug: "anthropic/claude-opus-4.1", label: "◆ CLAUDE OPUS 4.1", tier: "FLAGSHIP" },
// slug bebas — lihat https://openrouter.ai/models
```

Model juga bisa diganti on-the-fly lewat dropdown di header UI.

## ✦ Command

| Input | Efek |
|---|---|
| `pesan biasa` | Chat streaming dengan persona aktif |
| `/file buatkan landing page html cyberpunk` | Generate file → kartu + link sandbox |
| `⟲ RESET` | Bersihkan sesi & history |
| `Shift+Enter` | Baris baru di input |

## ✦ Roadmap Production

- [ ] Ganti blob URL dengan **Vercel Blob** untuk link sandbox permanen.
- [ ] Sesi persistent (Vercel KV / Redis) + multi-room chat.
- [ ] Auth (Clerk/Auth.js) + rate-limit per user.
- [ ] Upload file sebagai konteks (PDF/code → prompt).

## ✦ Lisensi

MIT — HERMES COLLECTIVE, 2026. Ditempa di neon dan kafein.
