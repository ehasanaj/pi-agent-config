# Security and Authentication

## Security Defaults

- Expose only HTTPS in non-local environments.
- Enforce authentication on protected endpoints.
- Perform authorization per endpoint and resource scope.
- Keep authn and authz checks server-side; never rely on frontend flow order.

## Header Token Pattern

For API-token style auth:

1. Resource filter reads configured auth header.
2. Auth service validates token against authoritative source.
3. Authenticated principal is stored in request-scoped context.
4. Resource/service code consumes request context, not raw headers.

Maintain clear separation between authentication and business authorization.

## Response Semantics

- Missing/invalid credentials -> `401`.
- Authenticated but forbidden operation/scope -> `403`.
- Never collapse these into a single error path.

## Shared Schema Guarding

If authentication depends on shared/external tables:

- Validate expected schema shape at startup.
- Fail fast when required columns/tables are incompatible.
- Do not create migrations for external ownership tables.

## Secure Logging Rules

- Use structured, minimal logging for auth decisions.
- Never log secrets: tokens, passwords, key material, connection secrets.
- Include request correlation IDs where available.

## REST Hardening (OWASP-Aligned)

- Restrict methods per endpoint and reject unsupported methods.
- Validate request size and content type.
- Validate all path/query/body input.
- Return sanitized errors.
- Add abuse controls where needed (rate limit, quotas, anomaly logging).

## Recommended Security Headers for APIs

For JSON APIs, configure headers according to platform needs, typically including:

- `Cache-Control: no-store` for sensitive responses.
- `X-Content-Type-Options: nosniff`.
- `X-Frame-Options: DENY` (or equivalent CSP frame policy).
- `Strict-Transport-Security` on HTTPS endpoints.

## Security Test Expectations

Any security-related change should include tests for:

- Unauthorized (`401`) paths.
- Forbidden (`403`) paths.
- Happy-path authenticated behavior.
- Token/header parsing edge cases.
