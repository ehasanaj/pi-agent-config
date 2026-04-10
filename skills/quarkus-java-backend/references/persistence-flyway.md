# Persistence and Flyway

## Data Strategy

Use Hibernate ORM + Panache with explicit mappings and PostgreSQL as default baseline.

Prefer repository pattern for query access. Keep entity state simple and aligned with table constraints.

## Transaction Guidance

- Use `@Transactional` at service boundaries by default.
- Keep transaction scopes narrow and tied to a business operation.
- Avoid transaction management in resources unless there is a strong reason.

## Hibernate and Schema Management

- Prefer `quarkus.hibernate-orm.database.generation=validate` for managed environments.
- Do not rely on auto-create/update for shared or persistent environments.
- Keep entity mapping changes and Flyway changes in one commit/change set.

## Flyway Rules

- Store migrations in `src/main/resources/db/migration/`.
- Use naming `V<integer>__<short_description>.sql`.
- Never modify applied migrations.
- Add a new migration for every schema change.
- Use `quarkus.flyway.migrate-at-start=true` where startup migration is expected.

## SQL Style

- Use uppercase SQL keywords.
- Keep one column definition per line for `CREATE TABLE`.
- Prefer explicit constraints (`NOT NULL`, `DEFAULT`, `CHECK`, `UNIQUE`, foreign keys).
- Keep enum value constraints synchronized with Java enum wire values.

## Versioned Data Models

When implementing versioned entities:

- Keep key structure and reference conventions consistent across the aggregate.
- Ensure uniqueness and current-version selection are enforced in SQL and repository queries.
- Validate write paths so only valid version transitions are persisted.

## Multi-Datasource Caution

If multiple datasources are used:

- Scope Flyway config per datasource.
- Keep migrations separated by datasource path/prefix.
- Avoid accidental cross-datasource table assumptions.

## Persistence Checklist

For any entity or schema change, ensure all are present:

- Updated entity mappings.
- New migration file.
- Repository query updates.
- Updated tests.
- OpenAPI update if payload shape changed.
