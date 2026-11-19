---
title: "UI audit wave 2: flake root cause, shared tokens, qa:ui gate, tablet band"
date: 2026-11-18
summary: "Fixed extension unlock double-PBKDF2 (WithKey reuse), extracted styles/tokens.css as single token source with esbuild CSS bundles (CACHE v10), added qa:ui axe+responsive CI gate, tablet 2-col band, unified popup button classes, copy hotkeys 1-9"
---

# UI audit wave 2: flake root cause, shared tokens, qa:ui gate, tablet band

## What happened

Second ak-fix wave on the November UI/UX audit backlog ("Full strategic"
scope). Six items closed:

- **Extension unlock flake — root cause fixed in app code.** The unlock
  handler derived a PBKDF2 key handle (600k iterations) and then called
  `decryptVaultEntries`, which re-derives the SAME key internally — every
  unlock paid 1.2M PBKDF2 iterations. Under CI CPU contention that blew past
  Playwright's 5s assertion timeout: the "stays locked across repeated wrong
  unlock attempts" test flaked 2/4 (also pre-existing on the old bundle).
  Serial runs (CI config, `--workers=1`) were always green: 6/6 repeat-each
  with the fix. Fix: `extension/popup.js` unlock handler now calls
  `decryptVaultEntriesWithKey(keyHandle, payload)` — the DEK branch already
  did exactly this. Test side: KDF-bound assertions get `{ timeout: 20000 }`.
  Probe archaeology: my discriminating probe (`.qa/ui-audit/work/fix-probe/
  flake-probe.mjs`) burned three iterations on its own bugs (helper not
  serializable into page.evaluate; guessed wrong storage key before grep
  found `otp_extension_encrypted_v1`; missing `#status` await meant 600ms <
  PBKDF2 so the seed never encrypted) — retired in favor of repeating the
  REAL test serially, which was the actual evidence needed.
- **Shared design tokens are now real.** `styles/tokens.css` (spacing s1–s4,
  radius family, motion, full 2-theme color system) imported by BOTH
  stylesheets; `scripts/build.mjs` gained CSS entries via esbuild's array
  entryPoints form (`{in, out}` — object form collides on the
  `extension/popup.bundle` key), emitting `styles.bundle.css` +
  `extension/popup.bundle.css`; index.html/popup.html load the bundles;
  sw.js shell now pre-caches the CSS bundle (CACHE_NAME v9→v10).
  Gotchas: esbuild needs `external: ["*.woff2"]` or it errors/hashes the
  font urls (copy loader produced `*-HASH.woff2` in repo root — deleted);
  minified oklch normalizes `0.17`→`.17`, so bundle greps must match that.
  Popup light theme silently inherited the AA accent fix (54% = 5.28:1,
  was 58% = 4.44:1) — closes a wave-1 leftover for free.
- **qa:ui CI gate.** `scripts/qa-ui.mjs` + `npm run qa:ui`: axe-core
  (wcag2a/aa, 21a/aa) at 360/768/1280 dark + 1280 light, failing on
  serious/critical; responsive sweep screenshots (6 widths) to
  `.qa/ui-sweep/`. Seeds a plain 3-entry vault via
  `personal_otp_vault_entries_v2` + `settings_v3` (same as e2e). Windows
  gotchas: spawn on `.cmd` needs `shell:true` (EINVAL) and single-string
  commands to dodge DEP0190; cleanup via `taskkill /pid /T /F`. Wired as a
  CI step after tests in `.github/workflows/ci.yml`. Self-run: PASSED,
  0 serious/critical.
- **Tablet band (761–900px).** 768/834 sweep shots showed full-bleed
  ~800px cards ("stretched phone"). Now a 2-column entries grid; Manual
  order mode keeps 1 column because `computeDropIndex` (lib/otp.js:353) is
  vertical-only and a same-row pair would misplace drops by one — gated via
  `entriesRoot.classList.toggle("entries-manual", sortBy === "custom")` in
  renderEntries.
- **Button classes unified.** popup.html/JS renamed to `.btn ghost`/
  `.btn primary` (sed, 32 markup + 1 dynamic), popup.css selectors cleaned —
  zero `ghost-btn`/`primary-btn` references remain.
- **Copy hotkeys 1–9** in the root app keydown (modifier-guarded, dialog-
  guarded, 1-based screen order via getVisibleEntries).

## Decision

- Flake fix went into app code (halve KDF cost), not just test tolerances —
  the redundant derivation was real user-facing latency, and the test
  timeout raise covers residual contention.
- Tokens extraction carries CANONICAL root-app values, so the popup's dark
  palette (identical values already) and light accent unify to AA.
- 2-col tablet grid excludes Manual mode instead of upgrading the drop math
  to 2D — kept the change small; 2D drop index is a candidate follow-up.

## Next steps

- Full `npm test` verification (running at journal time), visual baselines
  if popup light-theme snapshots exist, `detect_changes` before any commit.
- Not committing: user hasn't authorized; local main is also 1 behind
  origin/main (unpulled).

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
