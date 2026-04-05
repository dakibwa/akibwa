# Akibwa Agent Guide

Akibwa uses a local-first LLM wiki pattern. Do not start from scattered raw files unless the task specifically requires it.

## Start Here

Read these first, in order:

1. `/Users/danatkinson/Downloads/Akibwa Documents/AI Context/index.md`
2. `/Users/danatkinson/Downloads/Akibwa Documents/AI Context/schema.md`
3. `/Users/danatkinson/Downloads/Akibwa Documents/AI Context/Indexes/current-focus.md`
4. `/Users/danatkinson/Downloads/Akibwa Documents/AI Context/log.md`

Use `/Users/danatkinson/Downloads/Akibwa Documents/AI Context/Indexes/health-check.md` when you need to understand stale areas, open gaps, or suggested maintenance work.

## System Layers

- `Raw/` at `/Users/danatkinson/Downloads/Akibwa Documents/Raw`
  - Immutable source inputs.
  - Articles, screenshots, transcripts, workbooks, documents, and other captured material belong here.
  - Treat this as source-of-truth evidence. Do not casually rewrite it.

- `AI Context/` at `/Users/danatkinson/Downloads/Akibwa Documents/AI Context`
  - The compiled wiki layer written for agents.
  - `Domains/` holds major life-area summaries.
  - `Concepts/` holds cross-cutting pages such as capsule wardrobe or one-shoe strategy.
  - `Indexes/` holds navigation, backlinks, health checks, and source maps.
  - `Outputs/` holds filed query outputs and briefs that should compound into future work.

- `State/` at `/Users/danatkinson/Downloads/Akibwa Documents/State`
  - Machine-oriented memory and operational files.
  - Includes `scratchpad.json`, `memory.json`, `running.json`, `market-cache.json`, and `life-history.json`.
  - Use this for active intent, short-term memory, caches, and structured state.
  - `Private Context/` inside `State/` contains highly sensitive local-only markdown for agents. Do not surface it into the visible site or hosted export unless the user explicitly asks.

- `Surfaces/`
  - The dashboard and hosted views are surfaces over the knowledge base, not the knowledge base itself.
  - The main code for that lives in this repo, especially `/Users/danatkinson/Dakibwa/local-dashboard/launch.py` and `/Users/danatkinson/Dakibwa/public/`.

## Working Rules

- Prefer reading the compiled wiki before drilling into raw documents.
- When the user adds new information, update the persistent knowledge layer, not just chat context.
- When you complete a meaningful analysis or answer, consider filing it back into `AI Context/Outputs/` or updating affected domain/concept pages.
- Keep provenance clear. New compiled knowledge should point back to relevant raw or state sources.
- Design compilation so it can be rerun over the full corpus when a better model or better prompt becomes available.
- Keep extraction, normalization, synthesis, and rendering modular so one stage can improve without forcing a total rewrite of the rest.
- Preserve enough structure in raw and state layers that future reprocessing can replace weak compiled pages instead of being trapped by old summaries.
- Preserve the distinction between:
  - raw evidence
  - compiled markdown knowledge
  - machine state
- Do not expose absolute local filesystem paths in hosted/public exports unless they are intentionally sanitized.

## Maintenance Expectations

- `index.md` is the navigation entrypoint.
- `log.md` is the chronological record of wiki evolution.
- `schema.md` defines maintenance behavior and conventions.
- The wiki should accumulate and stay current. Answers should compound.

## Current Intent

Akibwa is being shaped as a private personal operating system and agent-native knowledge base:

- central repository for life/work context
- designed for continuity across future models
- optimized for agent navigation and compounding knowledge
- backed by local documents but surfaced through purpose-built interfaces
