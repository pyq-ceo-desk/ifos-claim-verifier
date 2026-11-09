#!/usr/bin/env python3
"""Tiny local web UI for the IFoS Claim Verifier (stdlib only + clocked-sdk)."""
from __future__ import annotations

import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs

import verify_claim

HOST, PORT = "127.0.0.1", int(os.environ.get("PORT", "8787"))

HTML = """<!doctype html>
<html><head><meta charset=utf-8><title>IFoS Claim Verifier (Clocked Verify)</title>
<style>
body{font-family:system-ui,sans-serif;max-width:820px;margin:2rem auto;padding:0 1rem;background:#0b1220;color:#e8eefc}
textarea{width:100%;min-height:140px;background:#111a2e;color:#e8eefc;border:1px solid #334;border-radius:8px;padding:.75rem}
button{background:#3b82f6;color:white;border:0;border-radius:8px;padding:.6rem 1rem;font-weight:600;cursor:pointer}
.card{background:#111a2e;border:1px solid #334;border-radius:12px;padding:1rem;margin-top:1rem}
.ok{color:#4ade80}.bad{color:#f87171}.mid{color:#fbbf24}
code{background:#1a2438;padding:.1rem .3rem;border-radius:4px}
</style></head><body>
<h1>IFoS Claim Verifier</h1>
<p>Checks forestry claims against official CAMPA / JFM excerpts using Clocked
<code>Verify</code> (<code>/clocked/grounding</code>). The verdict changes the UI colour and pass/fail banner.</p>
<form method=POST>
<textarea name=claim placeholder="Paste an IFoS CAMPA or JFM claim…">{claim}</textarea>
<p><button type=submit>Verify with Clocked</button></p>
</form>
{result}
</body></html>
"""


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass

    def do_GET(self):
        body = HTML.format(claim="", result="")
        self._html(body)

    def do_POST(self):
        n = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(n).decode("utf-8", errors="replace")
        claim = (parse_qs(raw).get("claim") or [""])[0].strip()
        result_html = ""
        if claim:
            try:
                out = verify_claim.verify(claim)
                v = str(out.get("verdict") or "")
                g = out.get("grounded")
                cls = "ok" if str(v).lower() == "grounded" or (g and float(g) >= 0.7) else "bad"
                banner = "PASS — claim grounded in sources" if cls == "ok" else "FAIL — not grounded / contradicted"
                result_html = (
                    f"<div class='card'><div class='{cls}'><strong>{banner}</strong></div>"
                    f"<p>Verdict: <code>{v}</code> · Grounded score: <code>{g}</code> · "
                    f"Credits: <code>{out.get('credits')}</code></p>"
                    f"<pre style='white-space:pre-wrap;font-size:12px'>{json.dumps(out, indent=2, default=str)[:4000]}</pre></div>"
                )
            except Exception as e:
                result_html = f"<div class='card mid'>Error: {e}</div>"
        body = HTML.format(claim=claim.replace("<", "&lt;"), result=result_html)
        self._html(body)

    def _html(self, body: str):
        data = body.encode()
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)


def main():
    verify_claim.load_env()
    httpd = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"IFoS Claim Verifier on http://{HOST}:{PORT}  (Ctrl+C to stop)")
    httpd.serve_forever()


if __name__ == "__main__":
    main()
