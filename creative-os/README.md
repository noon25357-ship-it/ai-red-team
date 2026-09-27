# JEV Creative OS

JEV (TypeSafe `systemOne`) is the decision layer; skills only execute. One brief in, JEV picks the next skill, reviews every real output against measured evidence, and the run ends when every connected skill is approved.

## Run

```sh
npm run jev:smoke                          # confirm the JEV connection
npm run skill -- COPY IMAGE MOTION FRONTEND REVIEW   # run skills for real without JEV (tests execution + evidence)
npm run demo                               # dashboard at http://localhost:4173, press RUN CREATIVE OS
npm run record-demo                        # live run, whole run recorded to outputs/demo/
npm run record-demo -- --replay            # short clip: latest real run replayed with gaps capped at 1.5s (no calls)
npm run analyze-run                        # JEV decision sequence, model check, why the run ended
```

Needs `TYPESAFE_API_KEY` (env or git-ignored `.env`, see `npm run setup:key`), the Claude Code CLI logged in (`claude`), and Playwright's Chromium (`npx playwright install chromium`).

## Skills

| Skill | Status | How it executes | Real output |
|---|---|---|---|
| COPY | CONNECTED | `claude -p` → JSON, validated (fields, Arabic, X length ≤ 280, hashtags, no links) | copy JSON |
| IMAGE | CONNECTED | `claude -p` writes an SVG → Playwright renders a 1600×900 PNG. Shown as **VECTOR IMAGE · LLM AUTHORED**; not an image model | SVG + PNG |
| MOTION | CONNECTED | `claude -p` writes an HTML/CSS/SVG animation → Playwright records it | 1280×720 WebM + poster PNG |
| FRONTEND | CONNECTED | `claude -p` with the installed `frontend-design` skill → Playwright tests desktop 1440×900 and mobile 390×844 | HTML + 2 screenshots |
| REVIEW | CONNECTED (final aggregator) | never offered as a next skill and never retried; runs once the creative skills are final, collects their real outputs, and JEV judges the whole campaign | JSON report + final JEV state |
| VIDEO | **NOT CONNECTED** | no provider; declared at run start and never offered to JEV | — |

`claude -p` runs with no tools, outside the repo, on the user's Claude login (plan usage, no API key). No paid API is used. The old local templates are gone.

## Evidence JEV reviews

Each output's `.meta.json` and the review state carry: file paths and sizes, dimensions, duration (animation and recorded), screenshots, generated content, every validation check with pass/fail and detail, console/page errors, and the generator (tool, model, duration, tokens).

## Decision points

| Decision | Question | When |
|---|---|---|
| `next_skill` | Choice over remaining connected skills | only when more than one skill remains |
| `review_action` | Choice `APPROVE · RETRY · HUMAN_REVIEW` (**the executive decision**) | after each creative output |
| `campaign_decision` | Choice `APPROVE_CAMPAIGN · HUMAN_REVIEW · INCOMPLETE · RETRY_<SKILL>` | once, in REVIEW (again after a RETRY_<SKILL>) |
| `quality_score`, `acceptable` | Score 0-4 (shown 0-100), Noul (evidence only) | same call |
| `worth_it` | Noul | before an affordable paid skill (none configured) |

## Review policy

- `review_action` decides. Its confidence below `CREATIVE_OS_CONFIDENCE_FLOOR` (0.25) → HUMAN_REVIEW.
- Strong contradiction → HUMAN_REVIEW, never an automatic retry: APPROVE with `acceptable = no`; APPROVE with quality < 40; RETRY with `acceptable = yes` and quality ≥ 75.
- RETRY regenerates with feedback (score and failed checks), at most 2 retries per skill, within 16 steps per run.
- A failed execution goes to HUMAN_REVIEW.
- A skill in a final state (APPROVED, HUMAN_REVIEW, NOT CONNECTED, BLOCKED) never runs again.

## Final campaign review (REVIEW)

- REVIEW gathers IMAGE, COPY, MOTION, FRONTEND: files, sizes, dimensions, duration, screenshots, copy text, validation counts, failed checks only.
- A cross-asset check runs only when every asset it needs exists; otherwise it is listed under `skipped_checks`, never counted as passed.
- A technical failure is `EXECUTION_FAILED` with a named cause (for example expired Claude OAuth), not a low quality score. It is never retried automatically.
- JEV answers `campaign_decision`: `APPROVE_CAMPAIGN · HUMAN_REVIEW · INCOMPLETE · RETRY_<SKILL>` (only for produced skills with retries left). `quality_score` and `acceptable` are evidence. APPROVE_CAMPAIGN with `acceptable = no` or quality < 40 → HUMAN_REVIEW. APPROVE_CAMPAIGN while a skill failed technically → INCOMPLETE.
- `RETRY_<SKILL>` regenerates that skill (within its retry limit), then REVIEW aggregates and asks again. If nothing was produced, no JEV call is made and the run is INCOMPLETE with the cause.
- The exact state of every JEV call is stored in the run log; `npm run analyze-run` prints the final review state.

## When a run ends

- `DONE`: every connected skill is APPROVED, by JEV or by a person in the dashboard after HUMAN_REVIEW. VIDEO, declared NOT CONNECTED from the start, does not block DONE.
- `AWAITING_HUMAN_REVIEW`: all connected skills finished and at least one waits for a person (Approve / Reject buttons in the dashboard).
- `INCOMPLETE`: a skill failed technically, JEV marked the campaign incomplete, or a person rejected an output. Also `STOPPED_MAX_STEPS`, `FAILED` (JEV error).

## Outputs

`outputs/{images,motion,video,copy,frontend,review}/` hold each asset and its `.meta.json` (timestamp, source skill, version, status, evidence, JEV review, human review). `outputs/runs/` keeps every run's event log; `outputs/demo/` holds recordings. All generated files are git-ignored.
