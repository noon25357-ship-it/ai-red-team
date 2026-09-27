# JEV Creative OS

JEV (TypeSafe `systemOne`) is the decision layer; skills only execute. One brief in, JEV decides what runs, reviews each output, and says when the campaign is done.

## Run

```sh
npm run jev:smoke                 # confirm the JEV connection first
npm run demo                      # dashboard at http://localhost:4173, press RUN CREATIVE OS
npm run record-demo               # headless live run, video saved to outputs/demo/
npm run record-demo -- --replay   # re-record the latest saved real run: zero JEV calls
```

`TYPESAFE_API_KEY` comes from the environment or the git-ignored `.env` (`npm run setup:key`).

## Decision points (the only places JEV is called)

| Decision | Question type | When |
|---|---|---|
| `next_skill` | Choice: remaining skills + `DONE` | before every step |
| `quality` / `acceptable` / `action` | Score (0-4 → 0-100) / Noul / Choice `CONTINUE·RETRY·HUMAN_REVIEW` | one call after each skill output |
| `worth_it` | Noul | before a paid skill that fits the budget |

Each decision records decision, confidence, probabilities, latency (measured around the API call only), and model. A full run of 6 skills is roughly 2 calls per skill plus 1.

## Guards

- Max 2 retries per skill, max 10 orchestration steps per run.
- Any answer with confidence below `CREATIVE_OS_CONFIDENCE_FLOOR` (default 0.25) → `HUMAN_REVIEW`.
- Cost guard: a skill with unknown cost, or cost above `CREATIVE_OS_BUDGET_USD` (default 0), goes to a human and is not executed.
- JEV reviews the evidence each skill reports (dimensions, text, structure), not rendered pixels.

## Skills

| Skill | Status | Engine |
|---|---|---|
| IMAGE | CONNECTED | local SVG template, $0 |
| MOTION | CONNECTED | local CSS animation, $0 |
| VIDEO | **NOT CONNECTED** | no provider configured; never executes |
| COPY | CONNECTED | local copy templates (not an LLM), $0 |
| FRONTEND | CONNECTED | local HTML template using IMAGE + COPY, $0 |
| REVIEW | CONNECTED | local checklist over the run state, $0 |

Add a skill by exporting an object with `name, description, engine, status, costEstimate, inputSchema, outputSchema, execute()` and listing it in `skills/registry.mjs`.

## Outputs

`outputs/{images,motion,video,copy,frontend,review}/` hold each asset plus a `.meta.json` (timestamp, source skill, version, status, JEV review). `outputs/runs/` keeps the full event log of every run; `outputs/demo/` holds recordings. All generated files are git-ignored.

`CREATIVE_OS_PACE_MS` (default 700 in the dashboard) adds a display pause between steps so the flow is readable on video; it is never counted in any latency.
