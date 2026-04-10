# Coding Standards

## Java Style

- Prefer 4-space indentation.
- Use K&R braces (`if (...) {`).
- Keep lines around 120 characters when practical.
- Preserve a trailing newline at end of file.

## Imports

Group imports in this order with blank lines:

1. `java.*`
2. `jakarta.*`
3. third-party (`io.quarkus.*`, `org.*`, etc.)
4. project packages (`com.example.*`)

Place static imports last, after a blank line.

## Naming

- Packages: lowercase.
- Classes and enums: PascalCase.
- Methods and fields: camelCase.
- DB tables and columns: snake_case.
- Use clear business terms over technical abbreviations.

## Entity Conventions

- Use explicit table/column mapping annotations.
- Use wrapper types for nullable database columns.
- Keep Java defaults aligned with schema defaults.
- Prefer explicit `columnDefinition` when required for vendor-specific text/JSON behavior.

## Enum Conventions

- Keep wire values stable.
- Serialize enums explicitly when API value stability matters.
- Persist enums as strings unless there is an explicit alternative requirement.

## Logging Conventions

- Prefer `org.jboss.logging.Logger`.
- Log actionable events, not excessive noise.
- Never log secrets or sensitive personal data.

## API Code Practices

- Keep resources thin.
- Return typed DTOs, not maps-of-anything by default.
- Avoid hidden side effects in getters or mapping methods.

## Commenting

- Add comments only when intent is not obvious from code.
- Keep comments factual and maintainable.
