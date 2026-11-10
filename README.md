# IFoS Claim Verifier (Clocked Build Challenge demo)

**Public demo (short video of the CLI and web UI in use):**  
https://github.com/pyq-ceo-desk/ifos-claim-verifier/releases/download/demo-v1/ifos-claim-verifier-demo.mp4

The same file is also in the repository at `demo/ifos-claim-verifier-demo.mp4`. This recording stays available through judging (18 Nov 2026).


**What it is.** A small working app that takes an Indian Forest Service (IFoS) forestry claim about **CAMPA** or **Joint Forest Management (JFM)** and checks it against curated official source excerpts using Clocked **Verify** (`POST /clocked/grounding`).

**Why Clocked matters here.** The grounding `verdict` / `grounded` score is not decorative: the CLI exit code and the web UI pass/fail banner change based on that output. That is the “meaningful use” the challenge asks for.

## Endpoints used

| Clocked name | API path | Role in this app |
|---|---|---|
| **Verify** | `/clocked/grounding` | Decide whether a pasted claim is supported by CAMPA/JFM source docs |

Optional stretch (not required for entry): Compare two State CAMPA plans, or Rerank ISFR paragraphs for a GK answer — same corpus pattern.

## Setup (free; no card)

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export CLOCKED_API_KEY='<your Clocked API key>'   # from https://clocked.rezolve.ai/account
```

Alternatively, put `CLOCKED_API_KEY=...` in a `.env` file in this directory. That file is gitignored and must never be committed. The CLI and web UI read the key from the environment (or `.env`); they never print it.

Optional stretch only: export `GEMINI_API_KEY` if you want a rewrite suggestion for a failed claim. This is not required for the challenge entry.

## CLI

```bash
# smoke: one true claim + one false claim
python verify_claim.py --samples

# verify your own claim
python verify_claim.py "Under the CAMPA Act, 2016, 90% goes to State Funds and 10% to the National Fund."
echo $?   # 0 = grounded, 1 = fail
```

## Local web UI

```bash
python app.py
# open http://127.0.0.1:8787
```

## Source corpus

- `sources/campa_official_excerpts.md` — Compensatory Afforestation Fund Act, 2016 structure (10:90 National:State), FCA diversion context
- `sources/jfm_official_excerpts.md` — MoEF 1 June 1990 JFM circular + strengthening guidelines framing

These are short public-law summaries for the demo. Swap in full India Code / FAOLEX PDFs via `pdf=` on the same grounding call for production booklet checking.

## Smoke results (box, 2026-11-10 IST)

| Claim | Expected | Observed |
|---|---|---|
| 90% State / 10% National under CAF Act 2016 | grounded | `verdict=grounded`, `grounded=0.9973` |
| Entire corpus only to National Fund | contradicted | `verdict=contradicted`, `grounded=0.0025` |
| MoEF 1 June 1990 JFM village institutions / usufructs | grounded | `verdict=grounded`, `grounded=0.9968` |

Live retest for the demo video (10 Nov 2026, 10:09 AM IST): true claim `verdict=grounded`, `grounded=0.9973`, PASS; false claim `verdict=contradicted`, `grounded=0.0025`, FAIL.

## Challenge fit

- Group award target: **Best Use of Verify, Compare, or Rerank** ($400)
- Also eligible for Best Overall App ($600)
- Built during challenge window; uses free 20k credits (`CLOCKEDHACKATHON`)


## Public Worker (optional deploy)

`worker/` is a Cloudflare Worker that serves the same claim form and calls Clocked Verify **server-side**. The API key must be set with `wrangler secret put CLOCKED_API_KEY` and must never be committed. The Worker rate-limits to 30 verifications per IP per day and 100 per day globally.

A live workers.dev URL is not published yet. The Worker source is in the repo and can be deployed on the Workers free tier with `wrangler secret put CLOCKED_API_KEY`. Until then, the public demo URL is the video above.

See `worker/README.md` for deploy commands.

## License

MIT for this demo code. Official statutes remain Government of India / FAOLEX public texts.
