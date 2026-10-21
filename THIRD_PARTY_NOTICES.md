# Third-Party Notices — MG Browser

MG Browser itself is licensed under the MIT License (see `LICENSE`).
The application bundles or depends on the following third-party components.
Their licenses remain in effect; this file is a summary, not a replacement
for the full license texts shipped with the application.

## Runtime

| Component | License | Notes |
| --- | --- | --- |
| **Electron** | MIT | `LICENSE.electron.txt` is included in the release folder. |
| **Chromium** | BSD-3-Clause and other open-source licenses | Full texts: `LICENSES.chromium.html` in the release folder. |
| **Node.js** | MIT | Bundled inside Electron. |
| **FFmpeg** (`ffmpeg.dll`) | LGPL-2.1-or-later (build dependent) | Electron's official builds include an FFmpeg build; review codec licensing (H.264/AAC) before commercial distribution. |
| **7-Zip** | LGPL-2.1-or-later | Only the installer-related notices are bundled; see `7zip-installer-*.txt`. |

## npm packages

The build depends on development packages such as `electron`, `electron-builder`
and `rcedit` (MIT / Apache-2.0 where applicable). Their license files are
available in `node_modules` and in each package's repository.

## Brands and trademarks

- **Google**, **Bing**, **DuckDuckGo**, **Brave**, **Yahoo**, **Yandex**,
  **Startpage**, **Wikipedia** and **Perplexity** are trademarks of their
  respective owners. MG Browser is not affiliated with, endorsed by, or
  sponsored by any of them.
- Search engines are accessed by navigating to their public websites. MG Browser
  does not ship their logos; engine indicators are simple letter badges.
- The MG Browser name, logo and icon are original assets of this project.

## Content and services

Search suggestions and instant answers are fetched from public endpoints
(Wikipedia API, DuckDuckGo Instant Answer API, and search-engine suggestion
endpoints). Availability and terms of use are controlled by those providers.
For a commercial public release, review each provider's API terms and consider
official APIs where required.

## Reporting

If you believe a file in this repository infringes a license or trademark,
please open an issue with details.
