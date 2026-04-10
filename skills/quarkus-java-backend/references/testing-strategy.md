# Testing Strategy

## Testing Layers

Use two primary layers:

1. `@QuarkusTest` + RestAssured for HTTP-level integration and CDI wiring.
2. `@QuarkusIntegrationTest` for packaged artifact validation (`*IT` classes).

Add focused unit tests only where they improve feedback speed for pure logic.

## Resource Tests

- Validate status codes, payload shape, and headers.
- Cover success and failure paths.
- Verify input validation and media-type handling.

## Service and Security Tests

- Verify authorization logic (`401` vs `403`).
- Test boundary conditions and forbidden transitions.
- Ensure request context auth identity is consumed correctly.

## Persistence Tests

- Validate query behavior for representative datasets.
- Cover migration-dependent behavior where schema evolves.
- Keep tests deterministic and isolated from external mutable state.

## Integration Tests (`*IT`)

- Run packaged mode checks for critical endpoints.
- Use when startup wiring, config profiles, or packaging differences matter.

## Test Data Rules

- Keep fixtures minimal and readable.
- Prefer explicit setup over order-dependent side effects.
- Avoid flakiness from wall clock / random behavior unless controlled.

## Validation and Error Tests

For each endpoint that accepts input, verify:

- Invalid payload -> `400` with contract-compliant error body.
- Unsupported media type -> `415` when applicable.
- Unknown record -> `404` when applicable.

## Minimum Coverage Expectations

For meaningful backend changes, include tests for:

- Main success path.
- At least one invalid input path.
- At least one authorization failure path (for protected APIs).
- Regression scenario tied to the changed behavior.
