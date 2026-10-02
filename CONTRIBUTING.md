# Contributing

## Workflow

We use trunk-based development: `main` is always releasable, and work happens on short-lived branches merged through pull requests.

1. Create a branch from `main`: `<type>/<short-description>`, e.g. `feat/employee-crud`, `fix/manager-loop`, `docs/user-guide`.
2. Commit in small, focused steps.
3. Open a pull request. CI must pass before merging.
4. Merge with **Rebase and merge**, so each small, focused commit lands on `main` and the history reads step by step. Clean up messy work-in-progress commits (`git rebase -i`) before merging.

## Commit messages

Commits follow [Conventional Commits](https://www.conventionalcommits.org/) and are checked by commitlint on every commit:

```text
<type>(<scope>): <summary in the imperative, lower case>
```

| Type       | Use for                                                 |
| ---------- | ------------------------------------------------------- |
| `feat`     | A new feature                                           |
| `fix`      | A bug fix                                               |
| `docs`     | Documentation only                                      |
| `test`     | Adding or fixing tests                                  |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `chore`    | Tooling, config, dependencies                           |
| `ci`       | CI/CD workflows                                         |
| `build`    | Build system or Docker                                  |

Scopes: `api`, `web`, `shared`, `tsconfig`, `eslint-config`, `infra`, `docs`, `ci`, `deps`, `repo`.

Examples: `feat(api): add employee endpoints`, `fix(web): keep table filters in the URL`, `chore(deps): bump vite`.

## Git hooks

Installed automatically by `pnpm install`:

- **pre-commit:** formats staged files with Prettier.
- **commit-msg:** rejects messages that don't follow the convention above.

## Adding dependencies

```bash
pnpm --filter @hierarchy-hub/web add <package>       # runtime dependency
pnpm --filter @hierarchy-hub/api add -D <package>    # dev dependency
```

Tools used by several packages (TypeScript, ESLint, Vitest, Zod) are pinned once in the `catalog` in `pnpm-workspace.yaml`; reference them as `"catalog:"`.

## Definition of done

- `pnpm lint && pnpm typecheck && pnpm test && pnpm build` pass
- New behaviour has tests
- Docs updated where behaviour changed
