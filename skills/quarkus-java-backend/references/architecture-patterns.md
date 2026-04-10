# Architecture Patterns

## Core Layering

Use a strict layered flow for business features:

1. `*Resource`: HTTP boundary only.
2. `*Service`: business rules and orchestration.
3. `*Repository`: data access and query composition.
4. DTOs: API request/response models.

Keep each concern in its layer. Do not place persistence logic in resources.

## Package Shape

Use feature-oriented slices, for example:

- `com.example.orders.resource`
- `com.example.orders.service`
- `com.example.orders.repository`
- `com.example.orders.dto`

Avoid broad utility packages for feature logic that should stay inside the bounded context.

## Resource Responsibilities

- Parse and validate incoming request data.
- Convert service outcomes to HTTP status codes.
- Keep methods small and transport-centric.
- Return API DTOs or `RestResponse<T>` when status/header control is needed.

## Service Responsibilities

- Own use-case behavior and cross-repository orchestration.
- Apply transaction boundaries (typically `@Transactional` here).
- Guard business invariants.
- Produce domain outcomes mapped to DTOs by service or dedicated mapper.

## Repository Responsibilities

- Encapsulate Panache/Hibernate queries.
- Keep query methods intention-revealing.
- Avoid embedding business policy in query helpers.

## Panache Strategy

Default to repository-first (`PanacheRepository` or `PanacheRepositoryBase`).

Allow active-record entities only when:

- Existing feature code already uses active-record style.
- Mixing styles in the same feature would reduce maintainability.

Do not introduce mixed repository and active-record conventions in one feature slice unless there is a clear migration plan.

## Versioned Domain Pattern (Optional)

If the domain requires versioned records:

- Use embedded composite keys (for example `id + version`).
- Keep explicit `current` and `enabled` flags where soft activation is required.
- Include audit metadata (`dateCreated`, `createdBy`, `lastUpdated`, `lastUpdatedBy`).
- Prefer explicit foreign-key value objects for versioned references when relationship clarity is critical.

Apply this pattern consistently across related entities; avoid partial adoption in a single aggregate.

## Mapping Rules

- Use explicit table and column mappings (`@Table`, `@Column`).
- Keep nullability and defaults aligned between Java model and SQL migration.
- Use wrapper types (`Integer`, `Boolean`) for nullable columns.
- Persist enums as strings (`@Enumerated(EnumType.STRING)`) unless there is an explicit reason not to.
