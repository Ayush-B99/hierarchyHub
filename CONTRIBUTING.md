# Contributing

## Workflow

We use trunk-based development: `main` is always releasable, and work happens on short-lived branches merged through pull requests.

1. Create a branch from `main`, for example `feat/employee-crud`, `fix/manager-loop` or `docs/user-guide`.
2. Commit in small, focused steps with clear messages that say what changed.
3. Open a pull request. CI must pass before merging.
4. Merge with **Rebase and merge**, so each small commit lands on `main` and the history reads step by step.

## Git hooks

Installed automatically by `pnpm install`:

- **pre-commit:** formats staged files with Prettier, so formatting never fails CI.

## Code comments

Keep comments short and casual, like you're explaining the code to a teammate. Lowercase is fine and full stops aren't needed. Explain why something is done, not what the code already says.

```ts
// the url holds the selected person so the back button just works
```

## Adding dependencies

```bash
pnpm --filter @hierarchy-hub/web add <package>       # runtime dependency
pnpm --filter @hierarchy-hub/api add -D <package>    # dev dependency
```

Tools used by several packages (TypeScript, ESLint, Vitest, Zod) are pinned once in the `catalog` in `pnpm-workspace.yaml`; reference them as `"catalog:"`.

## Definition of done

- `task check` passes (it runs the same checks as CI)
- New behaviour has tests
- Docs updated where behaviour changed
