# Zenan Huo — personal website

A buildless, responsive academic homepage for GitHub Pages. No installation or build step required.

## Local preview

Run `python3 -m http.server 8000 --bind 127.0.0.1` in this directory, then open http://127.0.0.1:8000.

## GitHub Pages

Push this directory to the `zenanh.github.io` repository. In Settings → Pages, select **Deploy from a branch**, the desired branch, and **/ (root)**. All assets use relative paths.

## Editing

- `index.html`: biography, affiliation, education, and Scholar URL.
- `style.css`: layout, responsive breakpoints, and theme tokens.
- `assets/liquid-glass.css`: glass materials and fallback.
- `glass.js`: Chromium refraction enhancement; other engines use CSS frost.
- The site uses a fixed dark theme and a fixed footer year (2016).
- `.private/workbench.md` is the local-only Workbench source; `scripts/encrypt_workbench.py` renders and encrypts it into `assets/workbench-vault.json` after prompting for the password.

Content is based on the supplied October 2026 CV. No external fonts, analytics, or runtime dependencies are loaded.
