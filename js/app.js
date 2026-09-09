/* ═══════════════════════════════════════════════════════════
   HERMES // AGENT — Front-end Controller
   Parallax engine · Particle field · Streaming chat ·
   File generation (sandbox link) · Telemetry
   ═══════════════════════════════════════════════════════════ */
"use strict";

/* ───────────────────────── STATE ───────────────────────── */
const state = {
  persona: APP_CONFIG.defaultPersona,
  model: APP_CONFIG.defaultModel,
  history: [],            // {role, content}
  sessionLog: [],
  busy: false,
  tokenCount: 0,
  booted: false,
};

const $ = (s) => document.querySelector(s);

/* ═════════════════════ PARALLAX ENGINE ═════════════════════ */
const Parallax = (() => {
  const layers = [...document.querySelectorAll("[data-depth]")];
  let tx = 0, ty = 0, cx = 0, cy = 0;

  window.addEventListener("mousemove", (e) => {
    tx = (e.clientX / innerWidth - 0.5) * 2;   // -1 .. 1
    ty = (e.clientY / innerHeight - 0.5) * 2;
  });

  (function loop() {
    cx += (tx - cx) * 0.06;   // lerp → gerakan butter-smooth
    cy += (ty - cy) * 0.06;
    for (const el of layers) {
      const d = parseFloat(el.dataset.depth || 0);
      el.style.transform = `translate3d(${(-cx * d * 400).toFixed(2)}px, ${(-cy * d * 400).toFixed(2)}px, 0)`;
    }
    requestAnimationFrame(loop);
  })();
  return {};
})();

/* ═════════════════════ PARTICLE FIELD ═════════════════════ */
const Particles = (() => {
  const cv = $("#particles"), ctx = cv.getContext("2d");
  let W, H, pts = [];
  const COLORS = ["0,240,255", "255,42,109", "249,240,2"];

  function resize() {
    W = cv.width = innerWidth; H = cv.height = innerHeight;
    const n = Math.min(90, Math.floor(W * H / 22000));
    pts = Array.from({ length: n }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 1.8 + 0.4,
      c: COLORS[(Math.random() * COLORS.length) | 0],
      tw: Math.random() * Math.PI * 2,
    }));
  }
  resize();
  window.addEventListener("resize", resize);

  let mx = -999, my = -999;
  window.addEventListener("mousemove", (e) => { mx = e.clientX; my = e.clientY; });

  (function frame() {
    ctx.clearRect(0, 0, W, H);
    for (const p of pts) {
      p.x += p.vx; p.y += p.vy; p.tw += 0.05;
      // interaksi halus dengan kursor
      const dx = p.x - mx, dy = p.y - my, dist = Math.hypot(dx, dy);
      if (dist < 120 && dist > 0.1) { p.x += (dx / dist) * 0.8; p.y += (dy / dist) * 0.8; }
      if (p.x < -10) p.x = W + 10; if (p.x > W + 10) p.x = -10;
      if (p.y < -10) p.y = H + 10; if (p.y > H + 10) p.y = -10;
      const a = 0.25 + Math.sin(p.tw) * 0.2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.c},${a})`;
      ctx.fill();
    }
    // garis koneksi tipis antar partikel dekat
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const a = pts[i], b = pts[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < 110) {
          ctx.strokeStyle = `rgba(0,240,255,${(1 - d / 110) * 0.09})`;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
    }
    requestAnimationFrame(frame);
  })();
  return {};
})();

/* ═════════════════════ BOOT SEQUENCE ═════════════════════ */
function bootSequence() {
  const lines = [
    ["[HERMES BIOS v3.7.1] — neural interface init", ""],
    ["> memuat persona core ............ ", "ok"],
    ["> kalibrasi parallax optics ...... ", "ok"],
    ["> menyambung uplink OPENROUTER ... ", "ok"],
    ["> verifikasi enkripsi AES-256 .... ", "ok"],
    ["> dekripsi memori agen ........... ", "ok"],
    ["", ""],
    ["⚠ PERINGATAN: realitas mungkin berbeda setelah koneksi", "warn"],
    ["", ""],
    ["> SELAMAT DATANG, OPERATOR_", "ok"],
  ];
  const log = $("#boot-log"), fill = $("#boot-fill");
  let i = 0;
  (function next() {
    if (i < lines.length) {
      const [text, cls] = lines[i];
      const span = document.createElement("span");
      if (cls) span.className = cls;
      span.textContent = text + (cls === "ok" ? "[ OK ]" : "");
      log.appendChild(span);
      log.appendChild(document.createTextNode("\n"));
      fill.style.width = `${((i + 1) / lines.length) * 100}%`;
      i++;
      setTimeout(next, text === "" ? 60 : 160 + Math.random() * 220);
    } else {
      setTimeout(() => {
        $("#boot").classList.add("done");
        $("#app").classList.remove("hidden");
        $("#input").focus();
        state.booted = true;
      }, 450);
    }
  })();
}

/* ═════════════════════ UI BUILDERS ═════════════════════ */
function buildPersonaUI() {
  const wrap = $("#persona-list");
  wrap.innerHTML = "";
  for (const p of PERSONAS) {
    const el = document.createElement("div");
    el.className = "persona-card" + (p.id === state.persona ? " active" : "");
    el.innerHTML = `<div class="persona-name">${p.name}</div>
                    <div class="persona-role">${p.role}</div>
                    <div class="persona-desc">${p.desc}</div>`;
    el.onclick = () => {
      state.persona = p.id;
      wrap.querySelectorAll(".persona-card").forEach((c) => c.classList.remove("active"));
      el.classList.add("active");
      toast(`PERSONA AKTIF: ${p.name}`);
    };
    wrap.appendChild(el);
  }
}

function buildModelUI() {
  const sel = $("#model-select");
  sel.innerHTML = "";
  for (const m of MODELS) {
    const o = document.createElement("option");
    o.value = m.slug;
    o.textContent = `${m.label} — ${m.tier}`;
    if (m.slug === state.model) o.selected = true;
    sel.appendChild(o);
  }
  sel.onchange = () => {
    state.model = sel.value;
    $("#t-model").textContent = shortModel(state.model);
    toast(`MODEL: ${sel.options[sel.selectedIndex].textContent.split("—")[0].trim()}`);
  };
  $("#t-model").textContent = shortModel(state.model);
}

function shortModel(slug) {
  return slug.split("/").pop().toUpperCase().slice(0, 16);
}

function getPersona() {
  return PERSONAS.find((p) => p.id === state.persona) || PERSONAS[0];
}

function toast(msg) {
  let t = $("#toast");
  if (!t) { t = document.createElement("div"); t.id = "toast"; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove("show"), 2400);
}

/* ═════════════════════ MARKDOWN MINI ═════════════════════ */
function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function renderMd(src) {
  let s = escapeHtml(src);
  // code block ``` ... ```
  s = s.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) =>
    `<pre><code class="lang-${lang}">${code.replace(/\n$/, "")}</code></pre>`);
  // inline code
  s = s.replace(/`([^`\n]+)`/g, "<code>$1</code>");
  // headings
  s = s.replace(/^### (.*)$/gm, "<h3>$1</h3>")
       .replace(/^## (.*)$/gm, "<h2>$1</h2>")
       .replace(/^# (.*)$/gm, "<h1>$1</h1>");
  // bold / italic / strikethrough
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
       .replace(/\*([^*\n]+)\*/g, "<em>$1</em>")
       .replace(/~~([^~]+)~~/g, "<del>$1</del>");
  // links
  s = s.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  // list items
  s = s.replace(/^\s*[-*] (.*)$/gm, "<li>$1</li>");
  s = s.replace(/(<li>[\s\S]*?<\/li>)(?!\s*<li>)/g, "<ul>$1</ul>");
  // tables (sederhana)
  if (/^\|.*\|$/m.test(s)) {
    const rows = s.split("\n").filter((l) => l.startsWith("|"));
    if (rows.length >= 2) {
      const cells = (l) => l.split("|").slice(1, -1).map((c) => c.trim());
      let table = "<table>";
      rows.forEach((r, i) => {
        if (/^\|[\s\-|:]+\|$/.test(r)) return;
        const tag = i === 0 ? "th" : "td";
        table += `<tr>${cells(r).map((c) => `<${tag}>${c}</${tag}>`).join("")}</tr>`;
      });
      table += "</table>";
      s = s.split("\n").filter((l) => !l.startsWith("|")).join("\n") + table;
    }
  }
  // line breaks (di luar pre)
  s = s.replace(/\n/g, "<br>");
  s = s.replace(/<\/pre><br>/g, "</pre>").replace(/<br><pre>/g, "<pre>");
  return s;
}

/* ═════════════════════ CHAT RENDERING ═════════════════════ */
const stream = $("#chat-stream");

function showWelcome() {
  stream.innerHTML = "";
  const w = document.createElement("div");
  w.className = "welcome";
  w.innerHTML = `
    <h2>NEURAL LINK <em>ESTABLISHED</em></h2>
    <p>HERMES siap menerima transmisi. Pilih persona di panel kiri, pilih model di kanan atas,
    lalu kirim perintah. Ketik <b style="color:var(--yellow)">/file &lt;instruksi&gt;</b> untuk membuat file
    dan mendapatkan link sandbox-nya.</p>
    <div class="chips">
      <div class="chip" data-q="Rancang arsitektur web serverless untuk SaaS">⌘ arsitektur serverless</div>
      <div class="chip" data-q="/file buatkan index.html landing page cyberpunk lengkap">⌘ /file — generate file</div>
      <div class="chip" data-q="Audit keamanan API REST: checklist lengkap">⌘ audit keamanan</div>
      <div class="chip" data-q="Jelaskan trade-off SQL vs NoSQL untuk 1M DAU">⌘ analisis trade-off</div>
    </div>`;
  w.querySelectorAll(".chip").forEach((c) => (c.onclick = () => { $("#input").value = c.dataset.q; send(); }));
  stream.appendChild(w);
}

function addMsg(role, text) {
  // hapus welcome
  const w = stream.querySelector(".welcome");
  if (w) w.remove();

  const p = getPersona();
  const el = document.createElement("div");
  el.className = `msg ${role}`;
  const who = role === "user" ? "OPERATOR" : p.name;
  el.innerHTML = `
    <div class="avatar">${role === "user" ? "OP" : p.name.split("//")[1]?.slice(0, 2) || "HE"}</div>
    <div class="msg-body">
      <div class="msg-meta">${who} · ${new Date().toLocaleTimeString("id-ID")}</div>
      <div class="msg-content">${role === "agent" ? renderMd(text) : escapeHtml(text)}</div>
    </div>`;
  stream.appendChild(el);
  scrollBottom();
  return el;
}

function scrollBottom() {
  stream.scrollTop = stream.scrollHeight;
}

/* ═════════════════════ API: CHAT (streaming) ═════════════════════ */
async function callChat(userText, contentEl) {
  const persona = getPersona();
  const t0 = performance.now();

  const res = await fetch(APP_CONFIG.apiChat, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: state.history.slice(-APP_CONFIG.maxHistory),
      persona: persona.system,
      model: state.model,
    }),
  });

  if (!res.ok || !res.body) {
    const err = await res.text().catch(() => "unknown");
    throw new Error(`UPLINK GAGAL [${res.status}]: ${err.slice(0, 200)}`);
  }

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let full = "", buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += dec.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop();             // sisa parsial
    for (const line of lines) {
      const t = line.trim();
      if (!t.startsWith("data:")) continue;
      const payload = t.slice(5).trim();
      if (payload === "[DONE]") continue;
      try {
        const j = JSON.parse(payload);
        const delta = j.choices?.[0]?.delta?.content || "";
        if (delta) {
          full += delta;
          state.tokenCount += 1;
          contentEl.innerHTML = renderMd(full) + '<span class="stream-cursor"></span>';
          contentEl.classList.add("stream-cursor");
          scrollBottom();
        }
      } catch { /* chunk parsial — abaikan */ }
    }
  }

  const lat = Math.round(performance.now() - t0);
  $("#t-lat").textContent = `${lat} ms`;
  $("#t-tok").textContent = state.tokenCount.toLocaleString("id-ID");
  $("#t-up").textContent = `${Math.min(99, 40 + Math.round(full.length / 12))}%`;

  contentEl.classList.remove("stream-cursor");
  contentEl.innerHTML = renderMd(full) || "<em style='color:var(--text-dim)'>— respons kosong —</em>";
  return full;
}

/* ═════════════════════ API: FILE GENERATION ═════════════════════ */
async function callGenerateFile(instruction, container) {
  const persona = getPersona();
  const status = document.createElement("div");
  status.className = "msg agent";
  status.innerHTML = `
    <div class="avatar">FG</div>
    <div class="msg-body">
      <div class="msg-meta">HERMES//FORGE · FILE FORGE</div>
      <div class="msg-content stream-cursor"><em style="color:var(--yellow)">melebur instruksi menjadi artefak…</em></div>
    </div>`;
  container.appendChild(status);
  scrollBottom();
  const statusContent = status.querySelector(".msg-content");

  const t0 = performance.now();
  const res = await fetch(APP_CONFIG.apiFile, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ instruction, persona: persona.system, model: state.model }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`FILE FORGE GAGAL [${res.status}]: ${data.error || "unknown"}`);

  $("#t-lat").textContent = `${Math.round(performance.now() - t0)} ms`;

  // ── buat sandbox link (blob URL persist di session) ──
  const blob = new Blob([data.content], { type: data.mime || "text/plain" });
  const url = URL.createObjectURL(blob);
  const sandboxUrl = `sandbox://hermes.local/${data.filename}`;

  statusContent.classList.remove("stream-cursor");
  statusContent.innerHTML = `artefak <strong>${escapeHtml(data.filename)}</strong> ditempa ✓<br>
    <span style="color:var(--text-dim);font-size:11px">link sandbox: <span style="color:var(--green)">${sandboxUrl}</span></span>`;

  const card = document.createElement("div");
  card.className = "file-card";
  card.innerHTML = `
    <div class="file-icon">⬡</div>
    <div class="file-info">
      <div class="file-name">${escapeHtml(data.filename)}</div>
      <a class="file-link" href="${url}" download="${escapeHtml(data.filename)}" target="_blank">${sandboxUrl} ↗</a>
      <div class="file-size">${(data.content.length / 1024).toFixed(2)} KB · ${escapeHtml(data.mime || "text/plain")} · klik untuk unduh</div>
    </div>`;
  status.querySelector(".msg-body").appendChild(card);
  scrollBottom();
  return { filename: data.filename, sandboxUrl, size: data.content.length };
}

/* ═════════════════════ SEND PIPELINE ═════════════════════ */
async function send() {
  const input = $("#input");
  const text = input.value.trim();
  if (!text || state.busy) return;

  state.busy = true;
  setBusyUI(true);
  input.value = "";
  autoGrow();

  addMsg("user", text);
  state.sessionLog.push({ t: new Date(), text });
  renderSessionLog();

  const isFileCmd = text.toLowerCase().startsWith("/file");
  const payload = isFileCmd ? text.slice(5).trim() || "buatkan file README.md projek HERMES" : text;

  state.history.push({ role: "user", content: payload });
  // optimistic typing placeholder
  const typing = addMsg("agent", "…");
  const contentEl = typing.querySelector(".msg-content");
  contentEl.innerHTML = "<em style='color:var(--cyan)'>menyusun respons</em><span class='stream-cursor'></span>";

  try {
    if (isFileCmd) {
      typing.remove();
      const artifact = await callGenerateFile(payload, stream);
      state.history.push({ role: "assistant", content: `[FILE GENERATED] ${artifact.filename} (${artifact.size} bytes) sandbox: ${artifact.sandboxUrl}` });
      setLinkStatus(true);
    } else {
      const full = await callChat(payload, contentEl);
      state.history.push({ role: "assistant", content: full });
      setLinkStatus(true);
    }
  } catch (err) {
    contentEl.classList.remove("stream-cursor");
    contentEl.innerHTML = `<span style="color:var(--magenta)">⚠ ${escapeHtml(err.message)}</span><br>
      <span style="color:var(--text-dim);font-size:11px">Pastikan OPENROUTER_API_KEY sudah di-set di environment Vercel.</span>`;
    setLinkStatus(false);
  } finally {
    state.busy = false;
    setBusyUI(false);
    input.focus();
  }
}

function setBusyUI(b) {
  $("#btn-send").disabled = b;
  $("#input").disabled = b;
  $("#btn-send").textContent = b ? "…" : "SEND ⏎";
}

function setLinkStatus(ok) {
  const pill = document.querySelector(".status-pill");
  pill.classList.toggle("online", ok);
  $("#link-status").textContent = ok ? "LINK ACTIVE" : "LINK ERROR";
}

function renderSessionLog() {
  const log = $("#session-log");
  log.innerHTML = "";
  if (!state.sessionLog.length) {
    log.innerHTML = '<div class="log-empty">— no transmissions —</div>';
    return;
  }
  for (const s of state.sessionLog.slice(-30).reverse()) {
    const el = document.createElement("div");
    el.className = "log-item";
    el.innerHTML = `<span class="lt">${s.t.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>${escapeHtml(s.text.slice(0, 60))}`;
    el.onclick = () => { $("#input").value = s.text; $("#input").focus(); };
    log.appendChild(el);
  }
}

/* ═════════════════════ INPUT UX ═════════════════════ */
function autoGrow() {
  const i = $("#input");
  i.style.height = "auto";
  i.style.height = Math.min(i.scrollHeight, 160) + "px";
}

/* ═════════════════════ INIT ═════════════════════ */
document.addEventListener("DOMContentLoaded", () => {
  buildPersonaUI();
  buildModelUI();
  renderSessionLog();

  const input = $("#input");
  input.addEventListener("input", autoGrow);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  });
  $("#btn-send").onclick = send;
  $("#btn-clear").onclick = () => {
    state.history = [];
    state.sessionLog = [];
    state.tokenCount = 0;
    $("#t-tok").textContent = "0";
    renderSessionLog();
    showWelcome();
    toast("SESSION RESET ✓");
  };

  // telemetry uplink fluctuation (dekoratif)
  setInterval(() => {
    if (!state.busy) $("#t-up").textContent = `${55 + Math.floor(Math.random() * 40)}%`;
  }, 2600);

  showWelcome();
  bootSequence();
});
