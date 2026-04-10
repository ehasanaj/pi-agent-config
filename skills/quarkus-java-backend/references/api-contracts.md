# API Contracts

## Contract-First Behavior

Treat API behavior as a contract. If endpoint behavior changes, update the OpenAPI document and tests in the same change.

If static OpenAPI is used (for example `src/main/resources/META-INF/openapi.yml` with runtime scanning disabled), keep it manually synchronized.

## Input Boundary Rules

- Validate at the resource boundary.
- Use Bean Validation (`@Valid`, constraints) for request DTOs.
- Reject malformed input with `400`.
- Avoid leaking parser/stack details in responses.

## Status Code Semantics

Use consistent semantics:

- `200`: successful read/update operations.
- `201`: successful creation with location when appropriate.
- `204`: successful operation with no response body.
- `400`: invalid client input.
- `401`: missing/invalid authentication.
- `403`: authenticated but not authorized.
- `404`: record not found.
- `409`: business conflict / duplicate state.
- `415`: unsupported media type.
- `429`: rate-limit or abuse control signal.
- `500`: unexpected server fault with sanitized response.

## Content-Type Discipline

- Require explicit, expected request `Content-Type`.
- Return explicit response `Content-Type`.
- Reject unsupported types rather than auto-converting.

## DTO Policy

- Never return JPA entities directly from REST methods.
- Define request/response DTOs per endpoint or feature.
- Keep wire format stable; use explicit enums and clear field names.
- Avoid nullable ambiguity when a field is required by contract.

## Null Handling

- Do not return `null` as endpoint payload.
- Use `404` or empty collections where semantically correct.

## Idempotency and Method Use

- Keep HTTP method semantics clear (`GET` read-only, `POST` create/action, `PUT` replace, `PATCH` partial update, `DELETE` remove/deactivate).
- Preserve idempotency expectations for `PUT` and `DELETE` where applicable.
- Reject unsupported methods with `405`.

## OpenAPI Consistency Checklist

When endpoint behavior changes, verify:

- Path and method definitions are accurate.
- Request and response schema examples remain valid.
- Status codes and error payloads match implementation.
- Security requirements (header/token scheme) are represented.
