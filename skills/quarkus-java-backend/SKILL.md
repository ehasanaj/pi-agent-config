---
name: quarkus-java-backend
description: Opinionated workflow for building and maintaining Quarkus Java backend services with layered architecture, secure REST endpoints, Flyway-managed schemas, and strong test coverage. Use when implementing or refactoring Quarkus APIs (resources/services/repositories/DTOs), updating persistence and migrations, enforcing security/auth semantics, synchronizing OpenAPI contracts, or running Maven-based quality gates.
---

# Quarkus Java Backend Development

Use this skill to produce consistent, production-grade Quarkus backend changes with strong defaults and explicit quality gates.

## Baseline Defaults

Assume these defaults unless the repository clearly uses alternatives:

- Java: `21`
- Framework: Quarkus `3.x`
- Build tooling: Maven Wrapper (`./mvnw`)
- REST: `quarkus-rest`, `quarkus-rest-jackson`
- DI/CDI: `quarkus-arc`
- Persistence: `quarkus-hibernate-orm`, `quarkus-hibernate-orm-panache`, `quarkus-jdbc-postgresql`
- Migrations: `quarkus-flyway`
- API docs: `quarkus-smallrye-openapi`
- Tests: `quarkus-junit5`, `rest-assured`

Prefer repository pattern by default. Active-record Panache style is allowed only when the codebase already follows it for that bounded context.

## Workflow

Follow this sequence for any non-trivial change:

1. Confirm architecture and naming expectations.
2. Model API contract updates before implementation.
3. Implement in layers (`Resource -> Service -> Repository -> DTO`).
4. Apply security and validation rules at the right boundaries.
5. Update persistence mappings and add Flyway migration in the same change.
6. Synchronize OpenAPI contract when endpoint behavior changes.
7. Add or update tests (`@QuarkusTest`, and `@QuarkusIntegrationTest` when relevant).
8. Run quality gates with `./mvnw` before handoff.

Do not skip migration, contract, or test updates when behavior changes.

## Reference Map

Load references selectively:

- Architecture and layering: `references/architecture-patterns.md`
- API behavior and status semantics: `references/api-contracts.md`
- Persistence and migrations: `references/persistence-flyway.md`
- Authentication/authorization and API hardening: `references/security-auth.md`
- Test strategy and coverage expectations: `references/testing-strategy.md`
- Java and package-level coding conventions: `references/coding-standards.md`
- Commands and delivery checklist: `references/quality-gates.md`

## Non-Negotiables

- Keep transport concerns in resources and business logic in services.
- Enforce authn/authz at every protected endpoint.
- Never expose entities directly from REST responses.
- Never edit already-applied Flyway migrations.
- Keep schema mappings, migrations, tests, and OpenAPI in sync.
- Do not log secrets or credentials.
