# Quality Gates

## Default Commands

Use Maven Wrapper commands by default:

- Dev mode: `./mvnw quarkus:dev`
- Compile: `./mvnw compile`
- Unit/integration-at-HTTP tests: `./mvnw test`
- Package: `./mvnw package`
- Full verify incl. integration tests: `./mvnw verify -DskipITs=false`

Run the smallest relevant command set for the touched scope, then expand to `verify` when changes are broad.

## Done Checklist

Before handing off, verify:

- Layering is preserved (`Resource -> Service -> Repository -> DTO`).
- Auth semantics are correct (`401` vs `403`).
- Entity/schema changes include Flyway migration.
- OpenAPI contract is updated when API behavior changed.
- Tests are added/updated for success and failure paths.
- Relevant `./mvnw` quality command(s) pass.

## Suggested Verification Matrix

- API-only change: `./mvnw test`
- Persistence or migration change: `./mvnw test` then `./mvnw verify -DskipITs=false`
- Security pipeline change: `./mvnw test` with focused auth-path assertions
- Packaging/runtime-profile-sensitive change: `./mvnw verify -DskipITs=false`

## Failure Handling

When a gate fails:

1. Fix root cause before adding new features.
2. Re-run the same command to validate the fix.
3. Re-run the highest relevant gate before final handoff.

Do not declare completion while known test, migration, or contract mismatches remain.
