# Extensions in MG Browser

MG Browser can load **unpacked Chrome extensions** through Electron's extension
support. This is intentionally a lightweight extension system, not a Chrome Web
Store client.

## Load an extension

1. Open **Settings → Extensions**.
2. Click **Load unpacked extension…** and choose the folder that contains
   `manifest.json`.
3. Reload the pages you want the content scripts to run on
   (**Reload open tabs** button), because content scripts only inject on new
   navigations.
4. The extension stays enabled across restarts. Its folder path is stored in
   your local MG Browser profile.

## Remove / disable

Each extension has a toggle, a reload button, an "open folder" button and a
remove button in Settings → Extensions. Removing an extension deletes it from
the list but leaves its folder untouched.

## Supported capabilities (Electron limits)

Electron loads extensions into the browser session and supports a subset of the
Chrome extension APIs. What generally works:

- `content_scripts` (manifest V2/V3)
- `storage`, `runtime`, `tabs` (partial), `webRequest`, `i18n` (partial)
- background pages/service workers where Electron's Chromium supports them
- options pages and popups (opened as normal pages)

What may not work:

- Chrome Web Store installation (unpacked folders only)
- extensions that depend on Chrome-only APIs, side panels, devtools panels,
  native messaging, or enterprise policies
- store auto-updates and extension signatures
- full MV3 service-worker lifecycle in every Electron build

If an extension cannot load, the error is shown next to its entry in Settings.

## Test extension

A minimal test extension lives in `app/tools/test-extension` and is used by the
automated self-test (`MG_SELFTEST=1`). It sets a `data-mg-test-extension`
attribute on every page via a content script.

## Security warning

Extensions can read and modify every page you open, including passwords you type
into forms. Only install extensions whose source you trust. MG Browser does not
sandbox extensions more than Chromium/Electron does; a malicious extension has
the same privileges as it would in Chrome.

## Where data is stored

Extension paths and enabled state are stored in `mg-data.json` inside the MG
Browser profile folder. The extension's own storage lives in the browser
session partition (`persist:mg`).

## Mobile

The mobile PWA/Capacitor edition does **not** support desktop Chrome extensions;
Android/iOS WebView has no extension runtime. This feature is desktop-only.
