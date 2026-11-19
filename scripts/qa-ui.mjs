// qa:ui — UI quality gate for CI:
//   1) axe-core accessibility scans (serious/critical violations fail the run)
//   2) responsive sweep screenshots at six widths (incl. tablet 768/834)
// Serves the built app exactly like `npm run serve:test`; run `npm run build`
// first. Evidence lands in .qa/ui-sweep/.
import { spawn } from "node:child_process";
import { access, mkdir } from "node:fs/promises";
import { constants } from "node:fs";
import { chromium } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";

const PORT = 4173;
const BASE = `http://127.0.0.1:${PORT}`;
const OUT_DIR = ".qa/ui-sweep";
const REQUIRED_ARTIFACTS = ["app.bundle.js", "styles.bundle.css", "extension/popup.bundle.css"];
const SWEEP_WIDTHS = [360, 390, 640, 768, 834, 1280];
// One axe pass per breakpoint (mobile/tablet/desktop) plus a light-theme
// desktop pass; `shot` also saves a screenshot next to the dark sweep.
const AXE_RUNS = [
  { width: 360, label: "dark@360" },
  { width: 768, label: "dark@768" },
  { width: 1280, label: "dark@1280" },
  { width: 1280, theme: "light", label: "light@1280", shot: "1280-light" },
];
const STORAGE_KEYS = {
  entries: "personal_otp_vault_entries_v2",
  settings: "personal_otp_vault_settings_v3",
  persistWarningSeen: "personal_otp_vault_persist_warning_seen_v1",
};
const SEED_ENTRIES = [
  { id: "qa-1", label: "GitHub:user@example.com", secret: "JBSWY3DPEHPK3PXP", digits: 6, period: 30, pinned: false },
  { id: "qa-2", label: "AWS:root@prod", secret: "JBSWY3DPEHPK3PXQ", digits: 6, period: 30, pinned: false },
  { id: "qa-3", label: "Email:backup@person.io", secret: "JBSWY3DPEHPK3PXR", digits: 8, period: 60, pinned: true },
];
// localStorage payload the app boots from: a plain (unencrypted) seeded vault.
const seedStorage = (theme) => ({
  [STORAGE_KEYS.entries]: JSON.stringify(SEED_ENTRIES),
  [STORAGE_KEYS.settings]: JSON.stringify({
    persist: true,
    encrypt: false,
    unlockOnLoad: false,
    blurCodes: false,
    screenshotSafe: false,
    clearClipboard: false,
    sortBy: "pinned-alpha",
    groupBy: "none",
    ...(theme ? { theme } : {}),
  }),
  [STORAGE_KEYS.persistWarningSeen]: "true",
});

function startServer() {
  const args = ["http-server", ".", "-p", String(PORT), "-c-1", "--silent"];
  // win32: shell:true is required (.cmd shims since CVE-2024-27980) and the
  // single-string form avoids DEP0190. POSIX: classic args form — shell:false
  // with a space-bearing string would treat the whole line as one executable.
  const child = process.platform === "win32"
    ? spawn(`npx ${args.join(" ")}`, { stdio: "ignore", shell: true })
    : spawn("npx", args, { stdio: "ignore" });
  // Surface spawn failures (ENOENT etc.) cleanly instead of crashing on an
  // unhandled 'error' event; waitForServer turns it into a timeout message.
  child.on("error", (error) => console.error(`qa:ui server spawn failed: ${error.message}`));
  return child;
}

function stopServer(child) {
  if (!child) return;
  if (process.platform === "win32") {
    spawn(`taskkill /pid ${child.pid} /T /F`, { shell: true, stdio: "ignore" });
  } else {
    child.kill("SIGTERM");
  }
}

async function waitForServer(timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(BASE);
      if (res.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`Test server did not come up at ${BASE} within ${timeoutMs}ms`);
}

async function openSeededPage(context, { width, theme }) {
  const page = await context.newPage();
  await page.setViewportSize({ width, height: 800 });
  await page.addInitScript((storage) => {
    for (const [key, value] of Object.entries(storage)) localStorage.setItem(key, value);
  }, seedStorage(theme));
  await page.goto(BASE);
  // Entries visible = app initialized with the seeded plain vault.
  await page.locator(".entry").first().waitFor({ state: "visible", timeout: 15000 });
  return page;
}

async function axeScan(page, label) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const bad = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  return { label, bad, all: results.violations };
}

async function main() {
  for (const artifact of REQUIRED_ARTIFACTS) {
    try {
      await access(artifact, constants.F_OK);
    } catch {
      console.error(`Missing ${artifact} — run \`npm run build\` first.`);
      process.exit(2);
    }
  }
  await mkdir(OUT_DIR, { recursive: true });

  let server;
  const alreadyUp = await fetch(BASE).then((r) => r.ok).catch(() => false);
  if (!alreadyUp) {
    server = startServer();
    await waitForServer();
  } else {
    console.log(`reusing existing server on port ${PORT}`);
  }

  const browser = await chromium.launch();
  const context = await browser.newContext({ colorScheme: "dark" });
  const failures = [];

  try {
    // Responsive sweep — one screenshot per width (viewport-only; a fullPage
    // capture tiles 2×2 in some drivers and produced artifacts before).
    for (const width of SWEEP_WIDTHS) {
      const page = await openSeededPage(context, { width });
      await page.screenshot({ path: `${OUT_DIR}/${width}.png` });
      await page.close();
      console.log(`sweep: ${width}px -> ${OUT_DIR}/${width}.png`);
    }

    for (const { width, theme, label, shot } of AXE_RUNS) {
      const page = await openSeededPage(context, { width, theme });
      const scan = await axeScan(page, label);
      for (const v of scan.bad) {
        failures.push(`${scan.label}: [${v.impact}] ${v.id} — ${v.help} (${v.nodes.length} nodes)`);
      }
      console.log(`axe: ${scan.label} -> ${scan.all.length} violations total, ${scan.bad.length} serious/critical`);
      if (shot) await page.screenshot({ path: `${OUT_DIR}/${shot}.png` });
      await page.close();
    }
  } finally {
    await browser.close().catch(() => {});
    stopServer(server);
  }

  if (failures.length > 0) {
    console.error(`\nqa:ui FAILED — ${failures.length} serious/critical axe violation(s):`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log("\nqa:ui PASSED — no serious/critical axe violations; sweep screenshots written.");
}

main().catch((error) => {
  console.error("qa:ui crashed:", error);
  process.exit(1);
});
