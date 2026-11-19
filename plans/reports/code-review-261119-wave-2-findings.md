# Wave-2 code review — findings & disposition (2026-11-19)

Commit under review: `a4a0074` (wave-2 UI hardening). Review by the
code-reviewer agent; fixes landed in `58e55c2`; polish in `d0085cc`.
Full suite (unit + 67 web + 29 extension e2e) and `npm run qa:ui` green
after each step.

## Real bugs

| Severity | Finding | Disposition |
|---|---|---|
| CRITICAL | `scripts/qa-ui.mjs` used the win32 single-string spawn with `shell:false` on POSIX — the whole command parsed as one executable path → uncaught ENOENT, CI step red on ubuntu-24.04 | **Fixed** `58e55c2` — platform branch + `child.on("error")` |
| MAJOR | `styles.bundle.css` / `extension/popup.bundle.css` untracked → fresh clone unstyled, `cache.addAll` 404 blocks SW install (repo convention tracks bundles) | **Fixed** `58e55c2` — both tracked |
| MINOR | Copy hotkeys used the flat sort order; with grouping on, "3" wasn't the 3rd card on screen | **Fixed** `58e55c2` — flatten `getEntryGroups()` |
| MINOR | No `event.repeat` guard — held digit spammed copy + advanced HOTP counters (persisted state) | **Fixed** `58e55c2` |
| MINOR | `.workspace-empty` landed half-width in the new tablet 2-col band | **Fixed** `58e55c2` — `grid-column: 1 / -1` |
| MINOR | SW network-first cached error responses (404/500 pages became offline fallbacks; navigate + asset handlers) | **Fixed** `58e55c2` — cache only `ok && type==="basic"` |

## Hardening

| Suggestion | Disposition |
|---|---|
| Other KDF-bound extension assertions at default 5s | **Fixed** — project-level `expect.timeout: 15s` for the extension project |
| qa:ui silently reusing a stale server on 4173 | **Fixed** — logs the reuse |
| Keydown guard missed `<select>` | **Fixed** |
| Docs drift (`docs/code-standards.md` tokens section, `README.md` cache-first rationale) | **Fixed** |
| Legacy pre-600k envelope re-encrypt caches the old-salt session key (next open = cache miss, graceful passphrase fallback) | **Deferred** — pre-existing, unchanged by wave 2; `clearSessionUnlock()` after re-encrypt is the cleaner shape if revisited |

## Simplifier pass (d0085cc)

Conservative polish, zero behavior change: qa-ui storage-key constants +
single `AXE_RUNS` table + dead `fixedNow` plumbing removed; hover-reveal
opacity leftovers dropped from styles.css (no-ops since the action row went
always-visible); comment coherence fixes in app.js / popup.css.

## Verified correct by review (no action)

- Unlock key-reuse safe for DEK + legacy envelopes; validation and
  `VAULT_DECRYPT_FAILED` wrapping preserved.
- `@import` ordering, `.hidden !important` vs renamed button selectors,
  `entries-manual` toggle on every render path, qa:ui failure hygiene,
  zero `ghost-btn`/`primary-btn` stragglers.

**Verdict at review time:** fix-first → both blockers fixed and verified;
final state green.
