# Documentation

Project documentation for **The Modesty House**.

## Contents

| Doc | What's in it |
|---|---|
| [`architecture.md`](./architecture.md) | System design, module map, rendering model, read-side rules |
| [`data-pipeline.md`](./data-pipeline.md) | Scrape → normalize → curate → publish, in depth, with runbooks |
| [`launch-readiness.md`](./launch-readiness.md) | Prioritized launch blockers with evidence and fixes |
| [`decisions/`](./decisions/) | ADRs — decisions that constrain future work |
| [`log/`](./log/) | One entry per step of work: what changed, and the evidence it works |

## How we document

**Every meaningful step** gets a `log/YYYY-MM-DD-<slug>.md` entry. The log is a factual
record, not a changelog for marketing — it must include the verification evidence
(commands run and their real output), and it must record partial or reverted work honestly.

**Architectural decisions** get an ADR in `decisions/`, numbered sequentially. An ADR is
warranted when a choice constrains future work: storage engine, rendering strategy, auth
model, pipeline shape, third-party dependency with lock-in.

**Mistakes** go in the local engineering handbook, not here — they're operating knowledge,
and they need to be in the file that gets read at the start of a working session.

## Templates

### Log entry

```markdown
# <What was done>
**Date:** YYYY-MM-DD · **Status:** done | partial | reverted

## Goal
## What changed
## Verification
## Notes / follow-ups
```

### ADR

```markdown
# ADR-NNNN — <Title>
**Date:** YYYY-MM-DD · **Status:** proposed | accepted | superseded by ADR-MMMM

## Context
## Decision
## Consequences
## Alternatives considered
```
