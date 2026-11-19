---
title: "UI/UX audit fix wave: 2 P0 + 7 P1 + polish across web and extension"
date: 2026-11-18
summary: "Fixed the full Nov UI audit backlog; verified 148 unit + full e2e + 12 visual, i18n 499=499; documented pre-existing extension decrypt flake"
---

# UI/UX audit fix wave: 2 P0 + 7 P1 + polish across web and extension

## What happened

Fixed the full UI/UX audit backlog (2 P0 + 7 P1 + P2/P3 polish) from the November audit (.qa/ui-audit/reports/). Root causes per finding:

- P0 banner overlay: `.data-banner`/`.vault-stale-banner` were `position: fixed` at top 72px, covering the listbar; now in-flow (`styles.css`), mobile override simplified.
- P0 session data loss: no warning anywhere; added `#session-mode-banner` (shown when `!settings.persist && entries.length > 0` in `updateDataSafetyBanners`) + `empty.sessionNote` in the empty state + Enable-storage CTA bound to the settings dialog.
- P1 copy affordance: `.entry-actions` was `opacity: 0` hover-reveal; now always visible, and `.entry-code` `<p>` became a `<button>` wired to the same copy handler (app.js `createEntryNode`).
- P1 VI font: fonts/ only had the latin subset; added Google Fonts vietnamese + latin-ext variable woff2 with unicode-range @font-face + APP_SHELL pre-cache.
- P1 light contrast: `--accent` oklch(58% .165 42) = 4.46:1; probe script picked oklch(54% .17 42) = 5.28:1 (both light blocks + focus-ring).
- P1 stale SW: fetch handler was cache-first; now network-first with cache fallback, CACHE_NAME v8→v9 (release rule honored).
- P1 popup IA: `#entries` moved above compose panel; `collapsed` defaults true (persisted; force-expanded on empty vault).
- P1 locked state: `showEmptyState` gained per-cause variants (locked/noMatch/empty); `openAddDialog` guards locked and routes to unlock.
- P1 html lang + i18n: `setLocale` syncs `documentElement.lang` (WCAG 3.1.1); popup throttle notice tracked by state flag instead of `startsWith("Too many failed attempts")` (broken in VI); ~24 hardcoded strings → catalog keys; parity 499=499 re-verified.

Gotcha found mid-flight: the first `setLocale` edit silently didn't survive a re-apply after a "File has not been read yet" rejection — the lang probe caught it (`lang` stayed "en"); re-applied and verified `lang: "vi"` in the browser.

## Decision

- Add-dialog close after successful save is app behavior (dialog auto-closes; kept open only on duplicate error) — probe scripts had to adapt, no app change.
- Up/Down hidden outside Manual order (test updated to selectOption "custom").
- Visual baselines updated via --update-snapshots (intentional UI change), extension visual baseline matched without update.
- Test selector updates: `#unlock-btn` scope instead of role-name (two Unlock buttons now exist by design), Copy needs `exact: true` (code button shares the name), remove button matched by aria-label "Remove".

## Verification

- `npm run build` (minify on): app.bundle.js 620.5KB → 307.6KB, popup 261.6 → 156.3KB.
- `npm run test:unit`: 148/148. Full e2e: 93–95/96 per run; serial extension run 25/25. Visual: 12/12 after baseline update. i18n parity 499 EN = 499 VI, 210 data-i18n keys resolve. axe: dark 0 violations (light color-contrast fixed via accent token).
- Browser probes: banner in-flow + no listbar overlap, session banner visible with entries, actions opacity 1, `documentElement.lang="vi"` after save, `document.fonts.check('16px "Space Grotesk"', "Tiếng Việt")` true, popup card top at ~84px (codes lead).

## Known issue (pre-existing, NOT introduced here)

`extension stays locked across repeated wrong unlock attempts` is flaky under parallel workers: correct passphrase sometimes rejected with "Incorrect passphrase or unreadable encrypted data" right after the encrypt-save→close→reopen cycle. Reproduced at HEAD with `git stash` (2/4 failed on the OLD bundle too). Serial runs are green. Looks like a chrome.storage write/visibility race in the test setup, predates this wave — suggest a follow-up (await storage settle or poll for the encrypted key before closing the seed popup).

## Next steps

- Uncommitted; branch is also 1 commit behind origin/main (pull before committing to avoid conflicts).
- Strategic leftovers from the audit (deliberately not in this wave): shared tokens package, CI visual/axe sweep (`npm run qa:ui` idea), global copy hotkeys 1-9, tablet breakpoint.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
