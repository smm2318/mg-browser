# MG Browser — Personal Signed-Runtime Test Build

This folder is a **personal test build**, not a public release.

## How it is built

The `MG-Browser.exe` in this folder is the original, **unmodified** Electron
executable of the locally installed DeepSeek Harness runtime, renamed only.
Because its bytes were not changed, its Authenticode signature is still valid:

- Signature: **valid EV code-signing certificate** (GlobalSign)
- Publisher shown by Windows: the original Electron distributor (DeepSeek)

The MG Browser application code is loaded from `resources\app`.

## Why this build opens without SmartScreen

Windows SmartScreen trusts a file with a valid, trusted Authenticode signature.
Our normal release replaces the icon with `rcedit`, which invalidates the
signature and makes the file “unsigned” again.

## Run

Double-click `MG-Browser.exe`, or run `Create-Personal-Shortcut.ps1` once to
create a desktop shortcut with the MG icon.

## Important limits

- **Do not distribute this build.** The publisher identity belongs to the
  original Electron vendor; publishing it as MG Browser would be misleading
  and is not permitted.
- The EXE file icon and Properties still show the original vendor metadata.
  The window/taskbar icon is MG because the app sets it at runtime.
- Data is stored in `%APPDATA%\MG Browser`, the same profile as the normal build.
- For public releases, sign the real build with your own certificate
  (see `docs/SIGNING.md`) or ship through Microsoft Store, which signs the
  package itself.

## Security

Only use a signed runtime obtained from software you trust. Verify the
signature yourself in PowerShell:

```powershell
Get-AuthenticodeSignature .\MG-Browser.exe | Format-List Status, StatusMessage
```

Expected: `Status: Valid`.
