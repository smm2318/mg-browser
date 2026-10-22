# Security Policy

## Supported versions

| Version | Supported |
| --- | --- |
| 1.0.x | ✅ |
| < 1.0 | ❌ |

## Reporting a vulnerability

Please **do not** open a public issue for security problems.

Email: `security@YOUR-DOMAIN.example` (replace with a real address before publishing)

Include:

- MG Browser version and platform
- Steps to reproduce
- Impact and any proof of concept
- Whether the issue is already public

You can expect an initial response within 7 days. Please allow time for a fix
before public disclosure. There is no bug bounty.

## Scope

In scope:

- The MG Browser desktop application (`app/`)
- The mobile PWA (`mobile/www/`)
- IPC boundaries, preload scripts, password vault, download handling

Out of scope:

- Vulnerabilities in Electron/Chromium itself (report upstream)
- Websites opened inside the browser
- Social engineering
- Issues requiring an already-compromised device

## Security design notes

- Renderer processes run with `contextIsolation: true`, `sandbox: true` and
  `nodeIntegration: false`.
- Passwords are encrypted with the OS keychain via Electron `safeStorage`, with
  an AES-256-GCM fallback.
- The custom new-tab API is only exposed to local `file://` new-tab pages.
- No telemetry is collected by MG Browser.
