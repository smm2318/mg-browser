# Contributing to MG Browser

Thanks for helping improve MG Browser.

## Roles (code signing policy)

- **Authors / committers:** `@YOUR_GITHUB_USERNAME`
- **Reviewers:** `@YOUR_GITHUB_USERNAME` (all pull requests from non-committers are reviewed before merge)
- **Approvers:** `@YOUR_GITHUB_USERNAME` (approves every release before it is signed)

## Development

```bash
cd app
npm install
npm start
```

The mobile edition lives in `mobile/` (plain HTML/CSS/JS, no build step).

## Pull requests

1. Open an issue first for large changes.
2. Keep changes focused and describe the user-visible effect.
3. Run a syntax check on changed files: `node --check path/to/file.js`.
4. Update `CHANGELOG.md` for user-visible changes.
5. Do not commit build artifacts (`release/`, `dist/`, `node_modules/`) — they are ignored.

## Code style

- Vanilla JavaScript, CommonJS in the main process, classic scripts in the renderer.
- Use `contextIsolation`-safe IPC; never enable `nodeIntegration` in pages.
- Keep user data local; no telemetry.

## Security

See [SECURITY.md](SECURITY.md). Do not open public issues for vulnerabilities.
