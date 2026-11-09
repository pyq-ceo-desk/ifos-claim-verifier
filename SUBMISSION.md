# Clocked Build Challenge — submission draft (DO NOT SUBMIT yet)

**Form URL:** https://clocked.rezolve.ai/challenge  
**Deadline:** 10 Nov 2026, 11:59 p.m. Eastern Time ≈ **11 Nov 2026, 10:29 a.m. IST**

## Suggested paste for the form

**Project name:** IFoS Claim Verifier

**Overview / problem:**  
Exam-prep helper for Indian Forest Service (IFoS) forestry claims about CAMPA and Joint Forest Management. A pasted claim is checked with Clocked **Verify** (`POST /clocked/grounding`) against curated official source excerpts. The `verdict` / `grounded` fields drive CLI exit codes and the web UI PASS/FAIL banner — so Clocked output changes app behaviour, not just decoration.

**How you used Clocked:**  
- Primary: **Verify** (`/clocked/grounding`) with `idempotency_key` on every call.  
- Documents: `sources/campa_official_excerpts.md` (CAF Act 2016 10:90 National:State) and `sources/jfm_official_excerpts.md` (MoEF 1 June 1990 JFM circular framing).  
- Meaningful use: CLI returns exit 0 only when grounded; exit 1 when contradicted/ungrounded. Web UI banner colour flips on the same fields.

**Demo (verified on box, 2026-11-10 ~01:52 IST):**

```
$ python verify_claim.py --samples
[true]     verdict=grounded      grounded=0.9973  credits=3
[false]    verdict=contradicted  grounded=0.0025  credits=5
[jfm_true] verdict=grounded      grounded=0.9968  credits=5
```

Full JSON dumps: `samples/run_true.json`, `samples/run_false.json`, `samples/run_jfm_true.json`  
Run log: `samples/run_log_20261110-0150.txt`

Local web UI: `python app.py` → http://127.0.0.1:8787

**Public repository:** _(not pushed — create from `/workspace/freestack/hackathon/clocked-demo/` when CEO approves)_

**Category:** Best Use of Verify, Compare, or Rerank ($400); also eligible Best Overall App ($600)

**Team:** Akshay Wagh / CEO desk bot accounts as needed — confirm email + GitHub handle before submit

## Setup (free; no card)

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# export CLOCKED_API_KEY from account page (or source secrets/clocked.env on desk)
python verify_claim.py --samples
python app.py
```

## Eligibility / rules to re-read before submit

- https://clocked.rezolve.ai/build-challenge/rules  
- 18+; confirm India / Wise coverage  
- App started during Oct 21–Nov 10 window (this folder created 10 Nov 2026 IST)  
- Do not publish API keys  
- Free credits: signup + code `CLOCKEDHACKATHON`

## Still needs CEO action (agent will not do these)

1. Public GitHub push of this repo  
2. Form submission on the challenge page  
3. Optional LinkedIn People’s Choice post `@Clocked` `#ClockedChallenge`  
4. Optional 30–60s screencast of `--samples` + one false claim  
5. Confirm team email / GitHub handle

## Optional stretch (not required)

- Compare two State CAMPA plans via Clocked Compare  
- Rerank ISFR paragraphs for a GK answer  
- Gemini rewrite of failed claims if `gemini.env` appears
