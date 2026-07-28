# Working agreement

SPEC.md is a decision-locked build specification for a competition prototype.
It is the source of truth. Read it before every phase.

## Rules
- Never add features, screens, settings, routes, or dependencies beyond SPEC.md.
  §19 is a hard no-list. Unit tests are permitted; features are not.
- Strings marked exact in the spec are exact: voice-line texts, letter fixtures,
  CI failure messages, and copy. They are pre-recorded or shown to judges.
- §10 element order is also the Layout Lock CI baseline. Never reorder DOM.
- Work ONE phase at a time (SPEC.md §17). Do not start the next phase.
- Verify the phase's acceptance criteria and show evidence before claiming done.
- Update PROGRESS.md, then commit as "P{n}: <description>".
- If the spec is ambiguous or contradicts itself, STOP and ask. Do not resolve
  it silently and do not invent a default.
- Target: Android Chrome, 390x844, HTTPS. Everything must degrade gracefully
  with zero API keys present.