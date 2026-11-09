#!/usr/bin/env python3
"""IFoS Claim Verifier — Clocked Verify (grounding) demo.

Paste an IFoS forestry claim; Clocked checks it against curated official
CAMPA / JFM source excerpts. The verdict changes what the CLI prints and
exits with: grounded → OK, contradicted/ungrounded → FAIL.

Requires CLOCKED_API_KEY (source /workspace/secrets/clocked.env).
Never prints the key.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SOURCES = ROOT / "sources"


def load_env() -> None:
    env = Path("/workspace/secrets/clocked.env")
    if env.exists():
        for line in env.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def load_documents() -> list[dict]:
    docs = []
    for p in sorted(SOURCES.glob("*.md")):
        docs.append({"id": p.stem, "text": p.read_text(encoding="utf-8")})
    if not docs:
        raise SystemExit(f"no source documents in {SOURCES}")
    return docs


def verify(claim: str, question: str | None = None) -> dict:
    from clocked_sdk import Clocked

    load_env()
    if not os.environ.get("CLOCKED_API_KEY"):
        raise SystemExit("CLOCKED_API_KEY missing")
    docs = load_documents()
    q = question or (
        "Is this Indian Forest Service (IFoS) forestry claim supported by the "
        "official CAMPA Act / JFM circular source excerpts provided?"
    )
    client = Clocked()
    result = client.grounding(
        documents=docs,
        question=q,
        answer=claim,
        evidence="all",
    )
    # normalize for CLI consumers
    out = {
        "claim": claim,
        "question": q,
        "source_ids": [d["id"] for d in docs],
        "verdict": result.get("verdict"),
        "grounded": result.get("grounded"),
        "answers_question": result.get("answers_question"),
        "claims": result.get("claims"),
        "credits": getattr(result, "credits", None),
        "model_ms": getattr(result, "model_ms", None),
        "endpoint": "POST /clocked/grounding  (Verify)",
    }
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description="Verify an IFoS claim with Clocked grounding")
    ap.add_argument("claim", nargs="?", help="Claim text to verify")
    ap.add_argument("-f", "--file", help="Read claim from file")
    ap.add_argument("-q", "--question", help="Override grounding question")
    ap.add_argument("--json", action="store_true", help="Print full JSON")
    ap.add_argument("--samples", action="store_true", help="Run built-in true/false smoke claims")
    args = ap.parse_args()

    if args.samples:
        samples = [
            (
                "true",
                "Under the Compensatory Afforestation Fund Act, 2016, ninety percent of "
                "the amounts collected are credited to the State Compensatory Afforestation "
                "Fund and ten percent to the National Fund.",
            ),
            (
                "false",
                "Under the Compensatory Afforestation Fund Act, 2016, the entire corpus is "
                "credited only to the National Fund, and State governments receive no share.",
            ),
            (
                "jfm_true",
                "The MoEF circular of 1 June 1990 encouraged State Governments to involve "
                "village communities in protection and development of degraded forest lands "
                "through village institutions that receive usufructs and a share of harvest proceeds.",
            ),
        ]
        code = 0
        for label, claim in samples:
            out = verify(claim)
            path = ROOT / "samples" / f"run_{label}.json"
            path.write_text(json.dumps(out, indent=2, default=str)[:12000])
            print(f"[{label}] verdict={out['verdict']} grounded={out['grounded']} credits={out['credits']}")
            if label.startswith("true") or label.startswith("jfm"):
                if str(out.get("verdict")).lower() not in ("grounded", "supported", "yes"):
                    # accept high grounded score
                    if not (out.get("grounded") and float(out["grounded"]) >= 0.7):
                        code = 2
            else:
                if str(out.get("verdict")).lower() in ("grounded",) and float(out.get("grounded") or 0) > 0.5:
                    code = 2
        return code

    claim = args.claim
    if args.file:
        claim = Path(args.file).read_text(encoding="utf-8").strip()
    if not claim:
        ap.print_help()
        return 2

    out = verify(claim, args.question)
    if args.json:
        print(json.dumps(out, indent=2, default=str))
    else:
        print("Endpoint : Clocked Verify (grounding)")
        print("Verdict  :", out["verdict"])
        print("Grounded :", out["grounded"])
        print("Credits  :", out["credits"])
        print("Model ms :", out["model_ms"])
        claims = out.get("claims") or []
        if claims:
            print("Claims   :", len(claims))
            for i, c in enumerate(claims[:8], 1):
                if isinstance(c, dict):
                    print(f"  {i}. verdict={c.get('verdict')} text={str(c.get('text') or c.get('claim') or '')[:160]}")
                else:
                    print(f"  {i}. {c}")
    # exit code drives the app behavior (meaningful use of endpoint output)
    v = str(out.get("verdict") or "").lower()
    g = float(out.get("grounded") or 0)
    if v in ("grounded", "supported") or g >= 0.7:
        return 0
    if v in ("contradicted", "ungrounded", "unsupported") or g < 0.3:
        return 1
    return 3


if __name__ == "__main__":
    sys.exit(main())
