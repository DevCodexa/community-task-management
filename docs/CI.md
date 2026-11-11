# Continuous integration

The `Build and test applications` GitHub Actions workflow runs for pull
requests targeting `main` and pushes to `main`. It installs from the
lockfiles and uses Node 20 for the frontend and Node 24 for the email-worker.
The workflow token only has `contents: read`.

The frontend job audits production dependencies at the high/critical threshold,
runs the strict TypeScript check, notification tests, the Vite production build,
and the listed Node-based regression and isolated PostgreSQL policy tests. Run
the type-check locally with:

```sh
npm ci
npm run typecheck
```

`typecheck` uses the existing `tsconfig.json` settings for the `src` tree,
including strict mode and unused-local/parameter checks. The worker's `npm test`
separately builds its TypeScript and runs worker tests. This project does not
yet have a configured ESLint rule set; unused checks are not a replacement for
linting, and the current check does not type-check test files.

The security gate checks production dependencies only; moderate findings and
development-dependency advisories do not fail it. Run `npm audit` separately
to review those findings. A registry outage may also fail the audit step; inspect
the job log and advisory before changing dependencies.

Workflow failures report the failing step in the PR checks. Fix the underlying
error and push another commit; do not disable the check to make a PR pass.
The workflow alone cannot enforce merge blocking: a repository administrator
must configure required status checks and branch protection for `main`.
That remaining setting is tracked in
[#18](https://github.com/codelovingcat/community-task-management/issues/18).
