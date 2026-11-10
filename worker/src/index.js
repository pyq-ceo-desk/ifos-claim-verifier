/**
 * IFoS Claim Verifier — Cloudflare Worker.
 * CLOCKED_API_KEY must be bound as a Worker secret. Never put the key in this file.
 *
 * Rate limit: 30 Verify calls per client IP per UTC day, plus a global cap of
 * 100 Verify calls per UTC day, so the Clocked credit pool lasts through judging.
 */
import { DOCUMENTS, QUESTION, SAMPLE_TRUE, SAMPLE_FALSE } from "./sources.js";

const CLOCKED_URL = "https://clocked.rezolve.ai/clocked/grounding";
const PER_IP_DAILY = 30;
const GLOBAL_DAILY = 100;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
      return htmlResponse(page({ claim: "", resultHtml: "" }));
    }
    if (request.method === "GET" && url.pathname === "/health") {
      return json({ ok: true, hasKey: Boolean(env.CLOCKED_API_KEY) });
    }
    if (request.method === "POST" && (url.pathname === "/" || url.pathname === "/verify")) {
      return handleVerify(request, env);
    }
    return new Response("Not found", { status: 404 });
  },
};

async function handleVerify(request, env) {
  if (!env.CLOCKED_API_KEY) {
    return htmlOrJson(request, 500, "CLOCKED_API_KEY is not configured on this Worker.", null);
  }
  const claim = (await readClaim(request)).trim();
  if (!claim) {
    return htmlOrJson(request, 400, "Paste a claim to verify.", null);
  }
  if (claim.length > 4000) {
    return htmlOrJson(request, 400, "Claim is too long (max 4,000 characters).", null);
  }

  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const limited = await checkRateLimit(env, ip);
  if (limited) {
    return htmlOrJson(request, 429, limited, null);
  }

  try {
    const out = await verifyClaim(env, claim);
    return htmlOrJson(request, 200, null, out);
  } catch (err) {
    const message = err && err.message ? err.message : "Verify call failed.";
    return htmlOrJson(request, 502, message, null);
  }
}

async function readClaim(request) {
  const ctype = request.headers.get("content-type") || "";
  if (ctype.includes("application/json")) {
    const body = await request.json();
    return String(body.claim || "");
  }
  const text = await request.text();
  return String(new URLSearchParams(text).get("claim") || "");
}

async function verifyClaim(env, claim) {
  const idempotencyKey = crypto.randomUUID();
  const payload = {
    documents: DOCUMENTS,
    question: QUESTION,
    answer: claim,
    evidence: "all",
  };
  const response = await fetch(CLOCKED_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.CLOCKED_API_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(payload),
  });
  const raw = await response.text();
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    data = {};
  }
  if (!response.ok) {
    const detail = data.error || data.message || `Clocked HTTP ${response.status}`;
    throw new Error(String(detail).slice(0, 280));
  }
  const creditsHeader = response.headers.get("X-Clocked-Credits");
  const modelMsHeader = response.headers.get("X-Clocked-Model-Ms");
  return {
    claim,
    question: QUESTION,
    source_ids: DOCUMENTS.map((d) => d.id),
    verdict: data.verdict ?? null,
    grounded: data.grounded ?? null,
    answers_question: data.answers_question ?? null,
    claims: data.claims ?? null,
    credits: creditsHeader != null ? Number(creditsHeader) : data.credits ?? null,
    model_ms: modelMsHeader != null ? Number(modelMsHeader) : data.model_ms ?? null,
    endpoint: "POST /clocked/grounding  (Verify)",
  };
}

function passed(out) {
  const v = String(out.verdict || "").toLowerCase();
  const g = Number(out.grounded);
  return v === "grounded" || v === "supported" || (Number.isFinite(g) && g >= 0.7);
}

async function checkRateLimit(env, ip) {
  const day = new Date().toISOString().slice(0, 10);
  const ipCount = await incr(env, `ip:${ip}:${day}`, 172800);
  if (ipCount > PER_IP_DAILY) {
    return `Rate limit: this IP has already used ${PER_IP_DAILY} verifications today. Try again tomorrow.`;
  }
  const globalCount = await incr(env, `global:${day}`, 172800);
  if (globalCount > GLOBAL_DAILY) {
    return `Rate limit: the public demo has reached its ${GLOBAL_DAILY} verifications for today. Try again tomorrow.`;
  }
  return null;
}

async function incr(env, key, ttlSeconds) {
  // Prefer KV when bound; otherwise use the Cache API so a first deploy still works.
  if (env.RATE_LIMIT) {
    const current = parseInt((await env.RATE_LIMIT.get(key)) || "0", 10);
    const next = current + 1;
    await env.RATE_LIMIT.put(key, String(next), { expirationTtl: ttlSeconds });
    return next;
  }
  const cache = caches.default;
  const cacheKey = new Request(`https://ifos-claim-verifier-rate.internal/${encodeURIComponent(key)}`);
  const hit = await cache.match(cacheKey);
  const current = hit ? parseInt((await hit.text()) || "0", 10) : 0;
  const next = current + 1;
  await cache.put(
    cacheKey,
    new Response(String(next), { headers: { "Cache-Control": `max-age=${ttlSeconds}` } }),
  );
  return next;
}

function wantsJson(request) {
  const accept = request.headers.get("accept") || "";
  const ctype = request.headers.get("content-type") || "";
  return ctype.includes("application/json") || accept.includes("application/json");
}

function htmlOrJson(request, status, error, out) {
  if (wantsJson(request)) {
    if (error) return json({ error }, status);
    return json(out, status);
  }
  const claim = out?.claim || "";
  const resultHtml = error ? errorCard(error) : resultCard(out);
  return htmlResponse(page({ claim, resultHtml }), status);
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function htmlResponse(body, status = 200) {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function resultCard(out) {
  const ok = passed(out);
  const cls = ok ? "ok" : "bad";
  const banner = ok ? "PASS — claim grounded in sources" : "FAIL — not grounded / contradicted";
  const preview = JSON.stringify(out, null, 2).slice(0, 4000);
  return `<div class="card"><div class="${cls}"><strong>${banner}</strong></div>
<p>Verdict: <code>${escapeHtml(out.verdict)}</code> · Grounded score: <code>${escapeHtml(out.grounded)}</code> · Credits: <code>${escapeHtml(out.credits)}</code></p>
<pre>${escapeHtml(preview)}</pre></div>`;
}

function errorCard(message) {
  return `<div class="card mid">Error: ${escapeHtml(message)}</div>`;
}

function page({ claim, resultHtml }) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>IFoS Claim Verifier (Clocked Verify)</title>
<style>
body{font-family:system-ui,sans-serif;max-width:820px;margin:2rem auto;padding:0 1rem;background:#0b1220;color:#e8eefc}
textarea{width:100%;min-height:140px;background:#111a2e;color:#e8eefc;border:1px solid #334;border-radius:8px;padding:.75rem;box-sizing:border-box}
button{background:#3b82f6;color:white;border:0;border-radius:8px;padding:.6rem 1rem;font-weight:600;cursor:pointer}
button.secondary{background:#1f2a44;border:1px solid #334}
.row{display:flex;gap:.5rem;flex-wrap:wrap;margin:.5rem 0 0}
.card{background:#111a2e;border:1px solid #334;border-radius:12px;padding:1rem;margin-top:1rem}
.ok{color:#4ade80}.bad{color:#f87171}.mid{color:#fbbf24}
code,pre{background:#1a2438;padding:.1rem .3rem;border-radius:4px}
pre{white-space:pre-wrap;font-size:12px;padding:.75rem;overflow:auto}
.muted{color:#9aa7c2;font-size:.92rem}
a{color:#93c5fd}
</style></head><body>
<h1>IFoS Claim Verifier</h1>
<p>Checks forestry claims against official CAMPA / JFM excerpts using Clocked
<code>Verify</code> (<code>/clocked/grounding</code>). The verdict changes the UI colour and pass/fail banner.</p>
<form method="POST" action="/">
<textarea name="claim" placeholder="Paste an IFoS CAMPA or JFM claim…">${escapeHtml(claim)}</textarea>
<div class="row">
<button type="submit">Verify with Clocked</button>
<button type="submit" class="secondary" name="claim" value="${escapeHtml(SAMPLE_TRUE)}">Try a true CAMPA claim</button>
<button type="submit" class="secondary" name="claim" value="${escapeHtml(SAMPLE_FALSE)}">Try a false CAMPA claim</button>
</div>
</form>
${resultHtml}
<p class="muted">Public demo for the Clocked Build Challenge. 30 verifications per IP per day (100 global per day).
Source: <a href="https://github.com/pyq-ceo-desk/ifos-claim-verifier">github.com/pyq-ceo-desk/ifos-claim-verifier</a>.
The API key is stored as a Worker secret and is never shipped in this page or the repository.</p>
</body></html>`;
}
