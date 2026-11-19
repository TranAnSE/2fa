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

const BASE = "http://127.0.0.1:4173";
const PORT = 4173;
const OUT_DIR = ".qa/ui-sweep";
const SWEEP_WIDTHS = [360, 390, 640, 768, 834, 1280];
const AXE_WIDTHS = [360, 768, 1280];
const SEED_ENTRIES = [
  { id: "qa-1", label: "GitHub:user@example.com", secret: "JBSWY3DPEHPK3PXP", digits: 6, period: 30, pinned: false },
  { id: "qa-2", label: "AWS:root@prod", secret: "JBSWY3DPEHPK3PXQ", digits: 6, period: 30, pinned: false },
  { id: "qa-3", label: "Email:backup@person.io", secret: "JBSWY3DPEHPK3PXR", digits: 8, period: 60, pinned: true },
];
const seedSettings = (theme) =>
  JSON.stringify({
    persist: true,
    encrypt: false,
    unlockOnLoad: false,
    blurCodes: false,
    screenshotSafe: false,
    clearClipboard: false,
    sortBy: "pinned-alpha",
    groupBy: "none",
    ...(theme ? { theme } : {}),
  });

function startServer() {
  // shell:true is required on win32 (spawn EINVAL on .cmd shims since
  // CVE-2024-27980 hardening); single string avoids the DEP0190 warning.
  const command = `npx http-server . -p ${PORT} -c-1 --silent`;
  const child = spawn(command, { stdio: "ignore", shell: process.platform === "win32" });
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

async function openSeededPage(context, { width, theme, fixedNow }) {
  const page = await context.newPage();
  await page.setViewportSize({ width, height: 800 });
  await page.addInitScript(({ entries, settings }) => {
    localStorage.setItem("personal_otp_vault_entries_v2", entries);
    localStorage.setItem("personal_otp_vault_settings_v3", settings);
    localStorage.setItem("personal_otp_vault_persist_warning_seen_v1", "true");
  }, {
    entries: JSON.stringify(SEED_ENTRIES),
    settings: seedSettings(theme),
    fixedNow,
  });
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
  for (const artifact of ["app.bundle.js", "styles.bundle.css", "extension/popup.bundle.css"]) {
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
  }

  const browser = await chromium.launch();
  const context = await browser.newContext({ colorScheme: "dark" });
  const fixedNow = Date.now();
  const failures = [];

  try {
    // Responsive sweep — one screenshot per width (viewport-only; a fullPage
    // capture tiles 2×2 in some drivers and produced artifacts before).
    for (const width of SWEEP_WIDTHS) {
      const page = await openSeededPage(context, { width, fixedNow });
      await page.screenshot({ path: `${OUT_DIR}/${width}.png` });
      await page.close();
      console.log(`sweep: ${width}px -> ${OUT_DIR}/${width}.png`);
    }

    // Axe scans: mobile, tablet, desktop, plus one light-theme desktop pass.
    for (const width of AXE_WIDTHS) {
      const page = await openSeededPage(context, { width, fixedNow });
      const scan = await axeScan(page, `dark@${width}`);
      for (const v of scan.bad) {
        failures.push(`${scan.label}: [${v.impact}] ${v.id} — ${v.help} (${v.nodes.length} nodes)`);
      }
      console.log(`axe: ${scan.label} -> ${scan.all.length} violations total, ${scan.bad.length} serious/critical`);
      await page.close();
    }
    {
      const page = await openSeededPage(context, { width: 1280, theme: "light", fixedNow });
      const scan = await axeScan(page, "light@1280");
      for (const v of scan.bad) {
        failures.push(`${scan.label}: [${v.impact}] ${v.id} — ${v.help} (${v.nodes.length} nodes)`);
      }
      console.log(`axe: ${scan.label} -> ${scan.all.length} violations total, ${scan.bad.length} serious/critical`);
      await page.screenshot({ path: `${OUT_DIR}/1280-light.png` });
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
