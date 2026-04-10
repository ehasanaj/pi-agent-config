---
description: Create AGENTS.md in the current directory with the wiki protocol.
---
Create a file `AGENTS.md` in the current directory with exactly the following content:

# Purpose

This repository implements a portable, agent-maintained wiki protocol inspired by Andrej Karpathy's LLM Wiki pattern: raw sources are compiled into a persistent markdown wiki instead of being rediscovered from scratch on every query.

This file is agent-facing. Follow it as a strict operating specification.

# Operating Principles

- Compile knowledge into the wiki; do not repeatedly rediscover it from scratch.
- Treat `raw/` as the immutable source layer.
- Prefer updating canonical pages over creating new pages.
- Keep substantive claims source-backed.
- Preserve uncertainty explicitly.
- Treat chat as non-canonical unless durable results are written back into the wiki.
- Expect one ingest or durable query to update many files.
- Support multi-format raw inputs, including `.txt`, `.md`, `.pdf`, `.docx`, and `.doc`.

# Authority Hierarchy

1. `raw/` is the ultimate source of truth.
2. `wiki/sources/` is the compiled representation of raw sources.
3. `wiki/entities/`, `wiki/concepts/`, and `wiki/disputes/` are maintained synthesis layers.
4. `wiki/queries/` contains derivative question artifacts.
5. Chat is non-canonical unless written back into the wiki.

# Do Not Do

- Do not modify, rename, move, or delete anything under `raw/`.
- Do not delete substantive wiki pages; prefer `superseded` or `archived`.
- Do not write uncited substantive claims on synthesized pages.
- Do not answer from chat memory when the wiki should be consulted.
- Do not create low-value page sprawl.
- Do not treat `wiki/queries/` as a substitute for updating canonical pages.
- Do not skip `initialize` when required structure is missing.

# Canonical Filesystem Layout

Use this exact structure:

```text
raw/
wiki/
  overview.md
  index.md
  log.md
  manifest.json
  sources/
    index.md
  entities/
    index.md
  concepts/
    index.md
  disputes/
    index.md
  queries/
    index.md
```

Rules:

- `raw/` is immutable and may contain multi-format source documents.
- `wiki/` is the maintained knowledge layer.
- `wiki/overview.md` is the semantic front door.
- `wiki/index.md` is the global catalog.
- `wiki/log.md` is the append-only operational history.
- `wiki/manifest.json` is the minimal machine-state registry.
- Each typed folder must have its own `index.md`.

# Naming, IDs, Links, and Timestamps

Rules:

- Use lowercase ASCII kebab-case for filenames and slugs.
- Use deterministic, type-prefixed page IDs.
- Use relative markdown links in page bodies.
- Store linked page IDs, not paths, in frontmatter `links`.
- Use ISO 8601 UTC timestamps, for example `2026-04-07T14:32:00Z`.
- `created` is immutable once set.
- `updated` changes on every substantive content or metadata edit.

Filename rules:

- `entities/`, `concepts/`, `disputes/`, and `queries/` use plain slug filenames, for example `openai.md` or `model-comparison-cost-vs-quality.md`.
- `sources/` filenames must be derived deterministically from the raw path, for example `raw/papers/attention-is-all-you-need.pdf` becomes `wiki/sources/papers-attention-is-all-you-need.md`.

ID examples:

- `source:papers-attention-is-all-you-need`
- `entity:openai`
- `concept:transformer-scaling`
- `dispute:model-evals-reliability`
- `query:model-comparison-cost-vs-quality`

# Universal Frontmatter Core

All markdown wiki pages except `wiki/log.md` must include YAML frontmatter.

Required universal core:

- `id`
- `type`
- `title`
- `status`
- `created`
- `updated`
- `source_ids`
- `links`

Rules:

- `links` contains referenced page IDs only.
- `source_ids` may be empty on pages with no direct source support yet, but should be populated as soon as evidence exists.
- `type` should match the page class, for example `overview`, `index`, `source`, `entity`, `concept`, `dispute`, or `query`.

# Status and Ingest Status Vocabularies

Use this exact page `status` vocabulary:

- `stub`
- `active`
- `reviewed`
- `disputed`
- `superseded`
- `archived`

Use this exact `ingest_status` vocabulary:

- `pending`
- `ingested`
- `updated`
- `failed`
- `removed`

# Page-Type Schemas

## Control Pages

`wiki/overview.md` must use the universal frontmatter core and these required body sections:

- `Current Thesis`
- `Key Entities`
- `Key Concepts`
- `Active Disputes`
- `Recent Changes`
- `Research Priorities`

`wiki/index.md` and all folder-local indexes must use the universal frontmatter core.

Global `wiki/index.md` must contain fixed sections:

- `Sources`
- `Entities`
- `Concepts`
- `Disputes`
- `Queries`

Each index entry must include:

- link
- title
- one-line summary
- status
- updated
- source count where relevant

Folder-local indexes mirror the same entry format for their folder.

Index ordering rule:

- Order entries by `status`, then by most recently `updated` within each status group.

## `wiki/sources/`

Required type-specific frontmatter:

- `source_type`
- `raw_path`
- `content_hash`
- `ingest_status`
- `related_entity_ids`
- `related_concept_ids`

Required body sections:

- `Summary`
- `Key Claims`
- `Evidence Notes`
- `Related Entities`
- `Related Concepts`
- `Open Questions`
- `Update Impact`

Rules:

- Every file in `raw/` maps to exactly one page in `wiki/sources/`.
- Source pages are implicitly grounded in their own raw file; same-source claims do not need inline self-citations.
- Any cross-source comparison or synthesis inside a source page must cite the other source pages inline.

## `wiki/entities/`

Required type-specific frontmatter:

- `entity_type`
- `aliases`
- `related_entity_ids`
- `related_concept_ids`
- `source_ids`

Required body sections:

- `Overview`
- `Key Attributes`
- `Role in Domain`
- `Relationships`
- `Evidence`
- `Open Questions`
- `Related Pages`

## `wiki/concepts/`

Required type-specific frontmatter:

- `concept_type`
- `aliases`
- `related_entity_ids`
- `related_concept_ids`
- `source_ids`

Required body sections:

- `Overview`
- `Definition`
- `Why It Matters`
- `Key Claims`
- `Relationships`
- `Evidence`
- `Open Questions`
- `Related Pages`

## `wiki/disputes/`

Required type-specific frontmatter:

- `dispute_type`
- `affected_page_ids`
- `source_ids`
- `resolution_criteria`

Required body sections:

- `Issue`
- `Conflicting Claims`
- `Evidence`
- `Current Assessment`
- `Resolution Criteria`
- `Affected Pages`
- `Next Actions`

Rules:

- Create dispute pages for material conflicts and important open questions.
- Minor ambiguity alone does not require a dispute page.

## `wiki/queries/`

Required type-specific frontmatter:

- `query_type`
- `question`
- `affected_page_ids`
- `source_ids`
- `follow_up_questions`

Required body sections:

- `Question`
- `Short Answer`
- `Analysis`
- `Evidence`
- `Affected Pages`
- `Follow-up Questions`

Rules:

- Query page filenames use deterministic question slugs.
- If a new durable query overlaps a prior saved query materially, update the existing canonical query page instead of creating a near-duplicate.

# Control Files and Index Rules

`wiki/manifest.json` is the minimal canonical ingestion registry.

Each manifest entry must include exactly:

- `raw_path`
- `source_page`
- `content_hash`
- `ingest_status`

`wiki/log.md` must not use frontmatter.

Each log entry must use this structure:

- heading: `## [timestamp] operation | scope`
- `Pages Touched`
- `Manifest Changes`
- `Summary`
- `Failures`
- `Follow-up Notes`

`wiki/log.md` is append-only.

# Uncertainty Protocol

Explicitly distinguish these categories in prose:

- source-backed fact
- synthesized conclusion
- open question
- unresolved dispute
- tentative inference

Rules:

- Cross-source synthesis is allowed, but it must be labeled clearly as synthesis and remain citation-backed.
- Substantive synthesized claims on non-source pages require inline citations to `wiki/sources/` pages.
- Use relative markdown links for inline citations.

# Allowed Domain Variation

This schema is fixed, but these fields are intentionally freeform and domain-specific:

- `source_type`
- `entity_type`
- `concept_type`
- `dispute_type`
- `query_type`

Rules:

- Keep values short and stable.
- Reuse established values once introduced.
- Do not invent unnecessary near-synonyms for the same category.

# Operation Selection Rules

Always preflight before `ingest`, `query`, or `lint`:

1. Verify required canonical structure.
2. If anything required is missing, run `initialize` first.

Choose operations as follows:

- Use `initialize` when `wiki/` or any required file/folder is missing.
- Use `ingest` when the user wants raw sources compiled or refreshed.
- Use `query` when the user asks a question against the compiled wiki.
- Use `lint` when the user wants the wiki checked, cleaned up, or health-reviewed.

# Initialize Workflow

Follow this exact sequence:

1. Check for `raw/` and `wiki/`.
2. Create any missing required folders.
3. Create `wiki/overview.md`, `wiki/index.md`, `wiki/log.md`, and `wiki/manifest.json` if missing.
4. Create all folder-local index files if missing.
5. Seed every created file with the required empty template or schema.
6. Re-read the initialized control files before any further operation.
7. Append an `initialize` entry to `wiki/log.md`.

# Ingest Workflow

Follow this exact sequence:

1. Read `wiki/overview.md`, `wiki/index.md`, `wiki/log.md`, and `wiki/manifest.json`.
2. Scan all files in `raw/`.
3. Classify each raw file as `new`, `changed`, `removed`, or `unchanged`.
4. Detect file type for each `new` or `changed` file.
5. For each `new` or `changed` file, create or update its one corresponding `wiki/sources/` page.
6. Update affected `wiki/entities/`, `wiki/concepts/`, and `wiki/disputes/` pages.
7. Update `wiki/overview.md`, `wiki/index.md`, and all affected folder-local indexes.
8. Append an `ingest` entry to `wiki/log.md`.
9. Run `lint`.
10. Append lint results to `wiki/log.md`.

Raw-source rules:

- `raw/` is batch intake. Ingest scans the full current contents of `raw/`.
- New files are ingested.
- Changed files are re-ingested in place.
- Unchanged files are skipped.
- Removed files are marked `removed` in the manifest; their compiled wiki pages remain.

Format-handling rules:

- Support `.txt`, `.md`, `.pdf`, `.docx`, and `.doc` in `raw/`.
- When a `pdf` skill or equivalent PDF extraction tool is available, use it for `.pdf` files.
- When a `docx` skill or equivalent DOCX extraction tool is available, use it for `.docx` files.
- Treat legacy `.doc` as best-effort.
- If extraction fails for any file, mark it `failed`, log the failure, and continue the batch ingest.

# Query Workflow

Follow this exact sequence:

1. Read `wiki/overview.md`, `wiki/index.md`, and `wiki/log.md`.
2. Identify relevant pages from the global and folder-local indexes.
3. Read the most relevant canonical pages first.
4. Escalate to `wiki/sources/` or `raw/` only if the wiki is incomplete, disputed, stale, or insufficiently evidenced.
5. Answer with inline citations.
6. If the result is durable, create or update a page in `wiki/queries/`.
7. Merge durable conclusions into affected canonical pages.
8. Update indexes as needed.
9. Append a `query` entry to `wiki/log.md`.

Durability rule:

- Save a query result when it produces reusable synthesis, comparison, decision support, or a clarified answer likely to matter again.

# Lint Workflow

Follow this exact sequence:

1. Read `wiki/overview.md`, `wiki/index.md`, `wiki/log.md`, and `wiki/manifest.json`.
2. Scan all wiki pages and indexes.
3. Run structural checks.
4. Run semantic checks.
5. Update affected pages if fixes are straightforward.
6. Create or update `wiki/disputes/` pages for material conflicts or important open questions.
7. Update `wiki/overview.md` and `wiki/index.md` if lint changes the wiki.
8. Append a `lint` entry to `wiki/log.md`.

Required lint scope:

- broken relative links
- missing or invalid frontmatter
- template violations
- index drift
- stale source hashes versus manifest
- missing inline citations on synthesized substantive claims
- orphan pages
- likely missing pages
- contradiction review
- important unresolved open questions

# Maintenance Rules

Page creation:

- Use a middle ground. Create stubs when a topic is likely to recur or needs its own structure, but avoid low-value proliferation.

Duplicates:

- Merge useful content into one canonical page.
- Mark weaker duplicates `superseded` or `archived`.
- Repair links and indexes.
- Log the consolidation.

Renames:

- Rename pages sparingly.
- If a rename is clearly better, repair links, indexes, and manifest references as needed.
- Log the rename.

Deletion:

- Non-destructive by default.
- Do not delete substantive pages merely because they are outdated or redundant.

Citation discipline:

- Inline citations are required on synthesized substantive claims outside same-source summaries.
- Cite `wiki/sources/` pages directly with relative markdown links, optionally with anchors.

# Minimal Examples

Universal frontmatter core example:

```yaml
---
id: entity:openai
type: entity
title: OpenAI
status: active
created: 2026-04-07T14:32:00Z
updated: 2026-04-07T14:32:00Z
source_ids:
  - source:reports-openai-company-profile
links:
  - concept:frontier-models
  - entity:microsoft
---
```

Source page example:

```markdown
---
id: source:papers-attention-is-all-you-need
type: source
title: Attention Is All You Need
status: reviewed
created: 2026-04-07T14:32:00Z
updated: 2026-04-07T14:32:00Z
source_ids: []
links:
  - concept:transformer-architecture
  - concept:self-attention
source_type: paper
raw_path: raw/papers/attention-is-all-you-need.pdf
content_hash: sha256:example
ingest_status: ingested
related_entity_ids: []
related_concept_ids:
  - concept:transformer-architecture
  - concept:self-attention
---

# Summary

This source introduces the transformer architecture.

# Key Claims

- Self-attention can replace recurrence for sequence transduction tasks.

# Evidence Notes

- Architecture, training setup, and benchmark results are provided in the source.

# Related Entities

- [Transformer Architecture](../concepts/transformer-architecture.md)

# Related Concepts

- [Self-Attention](../concepts/self-attention.md)

# Open Questions

- Which later sources materially revise these original claims?

# Update Impact

- Created and updated linked concept pages.
```

Entity page example:

```markdown
---
id: entity:openai
type: entity
title: OpenAI
status: active
created: 2026-04-07T14:32:00Z
updated: 2026-04-07T14:32:00Z
source_ids:
  - source:reports-openai-company-profile
links:
  - entity:microsoft
  - concept:frontier-models
entity_type: company
aliases:
  - OpenAI, Inc.
related_entity_ids:
  - entity:microsoft
related_concept_ids:
  - concept:frontier-models
---

# Overview

OpenAI is a central entity in this domain. [Company Profile](../sources/reports-openai-company-profile.md)

# Key Attributes

- AI research and product company. [Company Profile](../sources/reports-openai-company-profile.md)

# Role in Domain

- Plays a leading role in frontier model development. [Company Profile](../sources/reports-openai-company-profile.md)

# Relationships

- Closely linked with [Microsoft](microsoft.md). [Company Profile](../sources/reports-openai-company-profile.md)

# Evidence

- See [Company Profile](../sources/reports-openai-company-profile.md).

# Open Questions

- How stable is its long-term governance structure?

# Related Pages

- [Microsoft](microsoft.md)
- [Frontier Models](../concepts/frontier-models.md)
```

Query page example:

```markdown
---
id: query:model-comparison-cost-vs-quality
type: query
title: Model Comparison Cost vs Quality
status: active
created: 2026-04-07T14:32:00Z
updated: 2026-04-07T14:32:00Z
source_ids:
  - source:benchmarks-model-a
  - source:benchmarks-model-b
links:
  - concept:model-evaluation
  - dispute:model-benchmark-validity
query_type: comparison
question: Which model currently offers the best cost-quality tradeoff?
affected_page_ids:
  - concept:model-evaluation
  - dispute:model-benchmark-validity
follow_up_questions:
  - How sensitive is this answer to benchmark selection?
---

# Question

Which model currently offers the best cost-quality tradeoff?

# Short Answer

Current evidence suggests Model B offers the stronger cost-quality tradeoff, but this remains a synthesized conclusion contingent on benchmark scope. [Model A Benchmark](../sources/benchmarks-model-a.md) [Model B Benchmark](../sources/benchmarks-model-b.md)

# Analysis

This is a synthesized conclusion across benchmark and pricing sources, not a direct claim from any single source. [Model A Benchmark](../sources/benchmarks-model-a.md) [Model B Benchmark](../sources/benchmarks-model-b.md)

# Evidence

- [Model A Benchmark](../sources/benchmarks-model-a.md)
- [Model B Benchmark](../sources/benchmarks-model-b.md)

# Affected Pages

- [Model Evaluation](../concepts/model-evaluation.md)
- [Model Benchmark Validity](../disputes/model-benchmark-validity.md)

# Follow-up Questions

- How stable is this result over time?
```

Manifest example:

```json
[
  {
    "raw_path": "raw/papers/attention-is-all-you-need.pdf",
    "source_page": "wiki/sources/papers-attention-is-all-you-need.md",
    "content_hash": "sha256:example",
    "ingest_status": "ingested"
  },
  {
    "raw_path": "raw/notes/meeting-notes.docx",
    "source_page": "wiki/sources/notes-meeting-notes.md",
    "content_hash": "sha256:example-docx",
    "ingest_status": "updated"
  }
]
```

Log example:

```markdown
## [2026-04-07T14:32:00Z] ingest | raw batch

Pages Touched

- `wiki/sources/papers-attention-is-all-you-need.md`
- `wiki/concepts/transformer-architecture.md`
- `wiki/index.md`

Manifest Changes

- Added `raw/papers/attention-is-all-you-need.pdf`

Summary

- Ingested one new PDF source and updated linked concept pages.

Failures

- None.

Follow-up Notes

- Consider a dispute page if later sources challenge the benchmark framing.
```
