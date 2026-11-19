# Changelog

## Unreleased

UI/UX audit fixes (2 P0, 7 P1, plus P2/P3 polish from the November UI audit —
`.qa/ui-audit/` holds the full evidence and reports). Both frontends unless
noted.

Follow-up hardening wave (flake root cause, shared design system, CI gate):

### Added

- **`npm run qa:ui` UI quality gate**: axe-core scans (WCAG 2.x A/AA) at
  mobile/tablet/desktop widths plus a light-theme pass — serious/critical
  violations fail the run — and a responsive sweep writing screenshots to
  `.qa/ui-sweep/` at 360/390/640/768/834/1280. Wired into CI after the test
  job.
- **Copy hotkeys 1–9**: number keys copy the Nth visible entry's code in
  screen order; they never fire while typing in inputs/dialogs or with a
  modifier held.
- **Tablet layout band (761–900px)**: entries render as a two-column grid so
  cards stop stretching ~800px wide (Manual order mode keeps one column —
  the vertical-only drop-index math would misplace same-row drops).

### Changed

- **Shared design tokens are now a real package**: `styles/tokens.css` is the
  single source for the spacing base (s1–s4), radius family, motion, and the
  full color system in both themes; esbuild bundles it into
  `styles.bundle.css` and `extension/popup.bundle.css` (which the documents
  now load). Divergent copies in `styles.css` / `extension/popup.css` are
  deleted, vendored font URLs keep their pre-cached paths, and the service
  worker shell is bumped to `otp-vault-cache-v10`.
- Extension popup adopts the web app's `.btn primary` / `.btn ghost` classes;
  the divergent `ghost-btn` / `primary-btn` names are gone.

### Fixed

- **Extension unlock ran the 600k-iteration PBKDF2 twice** — the handler
  derived a key handle and then called `decryptVaultEntries`, which re-derives
  the same key internally. It now reuses the handle via
  `decryptVaultEntriesWithKey` (the DEK branch already did), halving unlock
  latency on slow devices. The redundant KDF was also the root cause of the
  flaky "stays locked across repeated wrong unlock attempts" e2e test under
  CI CPU contention; those KDF-bound assertions now allow 20s.

### Fixed

- **Backup/session banners no longer overlay the toolbar** (P0): `.data-banner`
  and `.vault-stale-banner` render in the document flow above the workspace
  instead of `position: fixed`, which used to cover the PINNED chip and the
  Sort/Group controls on desktop and intercept their clicks.
- **Session mode warns before data loss** (P0): with persistence off and
  entries present, a warning banner ("Entries live only in this browser tab…")
  shows with an Enable-storage shortcut; the empty state carries the same note
  before the first secret is typed.
- **Copy is always reachable** (P1): the per-card action row no longer hides
  behind hover, and the OTP code itself is now a button — one tap on the code
  copies it (aria-labeled per entry).
- **Vietnamese renders in Space Grotesk** (P1): added the Vietnamese and
  latin-ext variable subsets with `unicode-range`; previously 53 of 59
  Vietnamese codepoints fell back to the OS font.
- **Light-theme primary buttons pass WCAG AA** (P1): light `--accent` darkened
  to `oklch(54% 0.17 42)` (5.28:1 vs 4.46:1), applied to the system-follow
  block too.
- **Service worker serves fresh assets online** (P1): same-origin assets are
  network-first with the cache as offline fallback (the old cache-first
  handler pinned stale stylesheets/bundles until a CACHE_NAME bump); shell
  bumped to `otp-vault-cache-v9` and now pre-caches all fonts.
- **Extension popup leads with codes** (P1): the entries list moved above the
  Add form and the form starts collapsed (auto-expanded on first run / empty
  vault) — copying a code no longer needs ~2.7 viewports of scrolling.
- **Locked vault shows a locked state** (P1): a dedicated locked template
  replaces the first-import onboarding (whose add buttons were all dead);
  Add dialog routes to unlock instead of rendering a dead form; search
  no-match state drops the onboarding guide and offers "Clear search".
- **`<html lang>` follows the UI language** (P1, WCAG 3.1.1): `setLocale()`
  keeps `document.documentElement.lang` in sync; extension unlock-throttle
  expiry is tracked by state instead of matching the English message text
  (which never matched in Vietnamese); ~24 hardcoded strings now resolve
  through the catalog (parity re-verified: 499 EN = 499 VI).

### Changed

- `scripts/build.mjs` minifies bundles: `app.bundle.js` 620 KB → 308 KB.
- Up/Down reorder buttons appear only in Manual order mode; touch targets on
  coarse pointers grow to 44px (`--ctl-sm` was 36px); the mobile action row
  wraps instead of orphaning buttons.
- Global shortcuts (`/`, `n`) no longer fire while a dialog owns focus, `n`
  opens the Add sheet, and both expose `aria-keyshortcuts`.
- Install App failure feedback toasts globally instead of writing into the
  closed settings sheet; the timer widget uses `role="timer"`; `#entries` no
  longer has `aria-live` (screen readers were re-announcing the whole list
  every second) — toasts remain the live region.
- Manifest/meta theme colors unified with the app tokens (`#12100e` dark,
  `#f6f4f1` light); unicode glyphs (⚙ ◷ ✕ ⠿ x) replaced with inline SVG icons;
  extension renamed its divergent `--s8` token and accepts the root app's
  `.btn.primary`/`.btn.ghost` classes.

## 0.4.0 — 2026-10-28

A migration-and-language wave: imports from Aegis and 2FAS, single-entry QR
export, full i18n with a complete Vietnamese translation, and backup format
v3 with a keyed checksum. Everything ships for BOTH the web app (PWA) and the
Chrome extension popup unless noted otherwise.

### Added

- **Aegis + 2FAS import**: `lib/importers.js` decodes Aegis plain-text JSON
  exports and 2FAS app backups into the shared import preview (per-entry
  selection, duplicate pre-unchecking, group names imported as tags).
  Encrypted Aegis exports are rejected with guidance to re-export unencrypted.
  File picker lives in the Add sheet (web) and the import row (extension).
- **Single-entry QR export**: a `QR` action on every entry renders its
  `otpauth://` URI as a scannable QR code (vendored `qrcode` npm package,
  bundled like `jsqr` — no CDN) with Copy URI (web + extension) and Download
  PNG (web). `lib/otp.js` gains `buildOtpAuthUri`, round-trip tested through
  `parseOtpAuthUri`.
- **Extension keyboard shortcut**: `Ctrl+Shift+U` (`Cmd+Shift+U` on macOS)
  opens the popup via the MV3 `commands` API.
- **i18n completed + Vietnamese locale**: every user-visible string in both
  frontends now resolves through `t()`; static HTML carries `data-i18n` /
  `data-i18n-placeholder` / `data-i18n-aria-label` / `data-i18n-title`
  attributes applied by `applyTranslations()`. A Language setting
  (System/English/Tiếng Việt) joins Theme in both settings panels; `vi` ships
  as a complete catalog (unit-tested to cover every English key). Passphrase
  strength labels translate via `translateStrengthAssessment`.
- **Backup format v3**: encrypted backups now carry a keyed HMAC-SHA256
  checksum (`mac`) computed from a PBKDF2-derived key that domain-separates
  from the AES key (info-prefixed salt), giving authenticity rather than
  integrity-only (the old caveat #4). Import verifies the mac before
  decryption and fails with a clear authenticity error on a wrong passphrase
  or tampered file.

### Changed

- New exports write version 3. Plain (unencrypted) backups keep the unkeyed
  SHA-256 checksum; encrypted backups add the keyed mac.
- v1 and v2 backup files still import: v2 verifies via the unkeyed checksum,
  v1 via the legacy lenient path, each with the existing warnings.
- Service worker cache bumped to `otp-vault-cache-v8` (bundle changed).

### Release notes — compatibility caveats

1. **v3 backups require this release**: backups exported by this version
   cannot be restored by pre-upgrade app versions ("Backup version is not
   supported"). Export a fresh backup BEFORE upgrading and keep the old file,
   or note that old versions can still read v2 files you already have.
2. **Wrong passphrase on v3 encrypted backups** now fails at the keyed
   checksum ("Backup authenticity check failed…") instead of the generic
   decrypt error; behavior is stricter, the result the same.
3. **`qrcode` joins `jsqr` as a runtime-bundled npm dependency**; the app
   shell still loads no third-party origins.

## 0.3.0 — Product UI Redesign

A full visual redesign of both the web app and the extension popup, executed as
a product UI rather than a landing page. The vault's identity (warm charcoal,
cream text, signal orange) is kept; everything else is rebuilt on a disciplined
token system.

### Changed

- **Codes-first app shell**: the marketing hero, decorative signal module and
  halo glows are gone. A compact sticky top bar (brand, search, global timer,
  history, install, lock, settings, add) keeps OTP codes within one glance.
- **Compact entry rows**: oversized cards replaced with quiet hairline rows —
  one-line issuer/account, large mono code, inline countdown ring. Secondary
  actions (Edit, Reveal, Pin, Up, Down, Remove, drag) appear on hover/focus
  (always on touch); Copy stays permanently visible.
- **Add & import moved into a slide-over sheet** with tabs (Manual / Paste /
  QR / Camera); the sheet closes after a successful save.
- **Settings moved into its own slide-over sheet** with a marked danger zone
  for Clear All.
- **Copy history moved into a sheet** opened from the top bar with a live
  count badge.
- **New token system** (oklch color ramps, 4pt spacing, type scale, control
  heights, single radius family, motion tokens) shared by web app and
  extension; dark default with light/system themes kept in sync.
- Extension popup restyled with the same tokens: compact header, tighter
  cards, same countdown ring language.
- Service worker cache bumped to `otp-vault-cache-v7`.

### Fixed

- Contrast: small UI labels now meet 4.5:1 in both themes.
- Summary stats, sort/group controls and the offline chip consolidated into
  one toolbar row instead of card grids.

## 0.2.0 — Hardening & Polish Wave

Everything in this release shipped for BOTH the web app (PWA) and the Chrome
extension popup unless noted otherwise.

### Added

- **HOTP + SHA-256/512 support**: `otpauth://hotp` URIs, SHA-1/256/512
  algorithms, 6–8 digits, 15–120s periods; HOTP counters increment on
  reveal/copy; entries storage moved to v3 (legacy v2 retained read-only).
- **Google Authenticator import**: otpauth-migration QR decoding with batch
  stitching, an import preview with per-entry selection, and clipboard/paste
  support.
- **Biometric unlock (WebAuthn PRF)**: opt-in enrollment per platform; vault
  data moves to a two-envelope DEK design (`kdf.mode: "dek-v1"`). The
  passphrase always remains the recovery path. Enrolling/disabling lives in
  Settings and requires encrypted device storage.
- **Undo delete**: removals offer Undo for 10 minutes via a persisted
  tombstone (survives popup reopen; encrypted whenever the vault is).
- **Backup reminder**: a 30-day no-export warning with last-export hash.
- **Time-drift check**: optional server-time comparison with a banner when the
  device clock is off by more than 5 seconds.
- **Auto-lock**: idle timeout (5/15/30 minutes or off) with a single lock path
  on both platforms; extension unlock material cached in
  `chrome.storage.session`, cleared on lock/idle/browser exit.
- **Unlock throttling**: exponential backoff after repeated failed unlocks.
- **Dark mode**: tokenized design system with a System/Light/Dark toggle; the
  default look is unchanged (dark), System follows `prefers-color-scheme`.
- **Drag & drop reorder**: pointer-based handles in manual-order mode; the
  Up/Down buttons remain as the accessible fallback.
- **Per-entry countdown rings** with `prefers-reduced-motion` opt-out, and a
  copy haptic (`navigator.vibrate`, silent no-op where unsupported).
- **i18n framework**: `lib/i18n.js` with an English catalog; the unlock and
  settings areas read strings via `t()` (remaining areas keep hardcoded
  English this release).

### Changed

- **KDF envelope**: PBKDF2 parameters now live inside the encrypted envelope
  (`kdf` block). New vaults use 600,000 iterations; sub-floor envelopes are
  silently re-encrypted at the current default right after a successful
  unlock. Passphrase strength metering added.
- **Strict passcode UI hardening**: vendored fonts (no third-party origins),
  `jsqr` bundled from npm (no CDN), and a meta CSP locking scripts/styles/
  images/fonts to `'self'`.
- **Backups**: lenient import (invalid items are counted and skipped instead
  of rejecting the whole file) while strict checksums still gate verified
  imports.

### Release notes — compatibility caveats (read before downgrade/restore)

1. **600k downgrade trap**: vaults re-encrypted by this release (600k PBKDF2)
   cannot be read by pre-0.1.2 app versions. Restore a pre-upgrade backup
   instead of downgrading the app.
2. **HOTP in old versions**: HOTP entries in new backups degrade to TOTP when
   restored into pre-0.1.3 versions.
3. **Biometric-mode vaults**: only a LIVE biometric-mode vault requires
   0.1.5+ code to unlock. Backup exports always re-encrypt under the
   passphrase into the standard envelope (no `dek` block), so they restore by
   passphrase alone on any version. Deleting the browser WebAuthn credential
   keeps the passphrase path fully functional.
4. **Backup checksum is integrity-only** (unkeyed), not authenticity: anyone
   with the file can recompute it. Treat backup files as secret.
5. **`jsqr` is the sole runtime-bundled dependency** (npm-installed, esbuild
   bundled). There are no CDN or third-party origins in the app shell.
6. **Framing protection is a hosting concern**: a meta CSP cannot deliver
   `frame-ancestors`, so hosts should serve `X-Frame-Options: DENY` or
   `Content-Security-Policy: frame-ancestors 'none'` headers.
7. **CSP trade-off**: `connect-src 'self' https:` is deliberate — it keeps the
   QR-image-URL import (which fetches user-supplied hosts) working. Scripts,
   styles, images, and fonts stay locked to `'self'`.
8. **Release checklist**: bump `CACHE_NAME` in `sw.js:1` in EVERY release that
   changes `app.bundle.js` — cache-first service-worker serving otherwise
   keeps stale bundles alive in already-open tabs.

## 0.1.1 and earlier

See the git history for the initial local-first TOTP vault, encrypted storage,
backup v2 format, PWA shell, and the Chrome MV3 extension.
