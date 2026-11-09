# Clocked Build Challenge — submission draft (DO NOT SUBMIT yet)

**Form URL:** https://clocked.rezolve.ai/challenge  (entry form on that page; requires Clocked sign-in)

**Deadline:** 10 Nov 2026, 11:59 p.m. Eastern Time ≈ **11 Nov 2026, 10:29 a.m. IST**

## What the form asks for (from challenge page + official writeups)

1. **Project name** — e.g. `IFoS Claim Verifier`
2. **Overview / problem** — short description of what it does and who it helps
3. **Demo** — live URL **or short demo video** (CLI screencast / web UI recording is enough)
4. **Public repository** — with setup instructions and development history (Git commits)
5. **How you used Clocked** — which endpoint(s); how the output changes app behaviour
6. **Team details** — name(s), email(s), GitHub handle(s); award category selection
7. **Optional People’s Choice** — public LinkedIn post @Clocked + `#ClockedChallenge` before deadline

## Suggested paste for the form

**Name:** IFoS Claim Verifier

**Overview:** Exam-prep helper that verifies Indian Forest Service (IFoS) forestry claims about CAMPA and Joint Forest Management against official source excerpts. Pasted claims are grounded with Clocked Verify; the UI and CLI pass/fail only when the claim is supported.

**Endpoints:** Verify (`/clocked/grounding`). The `verdict` / `grounded` fields set CLI exit codes and the web banner (PASS vs FAIL).

**Repo:** _(create public GitHub repo from `/workspace/freestack/hackathon/clocked-demo/` — not pushed yet)_

**Demo:** Local `python app.py` on :8787; or attach a 30–60s screencast of `--samples` + one false claim.

**Category:** Best Use of Verify, Compare, or Rerank (also enter Best Overall if allowed)

## Eligibility notes (CEO must confirm)

- 18+, India generally OK per plan notes; confirm against https://clocked.rezolve.ai/build-challenge/rules
- App must be **started during** Oct 21–Nov 10 window (this demo folder created 10 Nov 2026 IST)
- Do not publish API keys
- Wise payment coverage / exclusions (QC, sanctioned regions, etc.) — read official rules before submit

## Not done by agent

- Public GitHub push
- Form submission
- LinkedIn People’s Choice post
- Demo video recording (can be done on request)
