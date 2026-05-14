# Laws and Rules

This file is not documentation. It is a system of laws and rules that govern how code is written in this repository. When in doubt, defer to them. When they conflict with what you would otherwise do, they win.

## The Laws

These are inviolable. They generate the right decisions across the codebase.

1. **The UI only changes when the user changes it.** No polling, no background fetches, no auto-save, no "live" anything without an explicit user trigger. Streaming responses count as user-initiated because the user asked for them.

2. **Use the platform.** Reach for what the browser, the standard library, and the language already give you before reaching for a dependency. The platform is free; a dependency is a debt.

3. **No dependency without justification.** Each one must be load-bearing for something we cannot reasonably do without. "Convenient" is not justification. "Saves twenty lines" is not justification. "Solves a genuinely hard problem we don't want to re-solve" is justification.

4. **Write so it reads like prose.** A new reader should start at the entry point and follow the code top-to-bottom, understanding the system as they go. No jumping between files to learn what a name means.

5. **Solve the problem in front of you, fully.** Don't build for hypotheticals. Don't half-ass the present to leave room for an imagined future. The problem that exists, solved properly — nothing less, nothing more.

6. **Every line earns its place.** If deleting a line breaks nothing meaningful, it should not have been written. This applies at every scale: lines, functions, files, dependencies.

## The Rules

These follow from the Laws. They are concrete enough to cite in a code review.

- **Comments explain why, never what.** If a comment restates the code, delete it or rename the code so the comment becomes redundant.
- **No "removed", "TODO", "for now", or "in the future" comments.** These rot. Removed code lives in git. Future work lives in an issue.
- **No docstrings or block comments that narrate functions.** If a function needs a paragraph to be understood, it is too big or named wrong.
- **One file, one idea.** When a file spans two ideas, split it. When two files express one idea, merge them.
- **Functions earn their names.** A function's name should tell the reader exactly what it does. If naming is hard, the function is doing too much.
- **No abstractions without three call sites.** Don't extract a helper for one use. Don't build a generic interface for one implementation.
- **No `any`. No silent fallbacks.** If a value can be undefined, the type says so. If an error can occur, handle it deliberately or let it propagate.
- **Errors carry their context.** Include what failed and the relevant values, not just that something failed.
- **Native first.** `<dialog>`, `<details>`, `<form>`, `fetch`, `URLSearchParams`, `crypto.subtle`, `Intl`. If the platform does it, use it.
- **No utility libraries.** Lodash, date-fns, classnames, and their kind. Vanilla almost always wins.
- **Don't expand scope.** Fix what was asked. Don't refactor adjacent code, add unrequested tests, or rename things you didn't need to touch.

## Deployment

The app is deployed on Railway. Three services:

- **web** — https://railway.com/project/e365ff6a-7674-4984-ba5b-ffd2abd5b7f0/service/ad32b467-7520-404e-8bd7-ca2ac3d96de9
- **worker** — same project, separate service
- **db** — Railway Postgres

Each service deploys via railpack (`railpack.web.json`, `railpack.worker.json`). Build and start commands live in those files. Pushes to `main` trigger deploys automatically.

Secrets live in Railway, not in the repo. The local `.env` is intentionally minimal — anything missing from it is in Railway. To run locally with production-equivalent env, use:

```bash
railway run --service web -- npm --workspace web run dev:server
```

Or pull values explicitly:

```bash
railway variables --service web --json
```

Both require `railway login` + `railway link` first.
