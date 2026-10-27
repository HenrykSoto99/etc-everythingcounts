import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
const base = process.env.QA_BASE_URL || "http://127.0.0.1:3000";
const output = "/home/ubuntu/etc-qa/views";
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.QA_CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const results = [];
try {
  for (const device of [
    { name: "laptop", width: 1366, height: 900 },
    { name: "tablet", width: 820, height: 1180, hasTouch: true },
    { name: "mobile", width: 390, height: 844, hasTouch: true, isMobile: true },
  ]) {
    if (
      process.env.QA_DEVICES &&
      !process.env.QA_DEVICES.split(",").includes(device.name)
    )
      continue;
    const context = await browser.newContext({
      viewport: { width: device.width, height: device.height },
      hasTouch: device.hasTouch ?? false,
      isMobile: device.isMobile ?? false,
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    for (const route of [
      "/",
      "/login",
      "/demo/pipeline",
      "/demo/consultations",
      "/demo/settings",
      "/recursos/api",
    ]) {
      if (
        process.env.QA_ROUTES &&
        !process.env.QA_ROUTES.split(",").includes(route)
      )
        continue;
      await page.goto(base + route, {
        waitUntil: "networkidle",
        timeout: 30000,
      });
      await page
        .locator("h1")
        .first()
        .waitFor({ state: "visible", timeout: 20000 });
      await page.waitForTimeout(350);
      const layout = await page.evaluate(() => ({
        width: innerWidth,
        scroll: document.documentElement.scrollWidth,
        title: document.querySelector("h1")?.textContent,
        overflows: [...document.querySelectorAll("body *")]
          .filter(element => {
            const r = element.getBoundingClientRect(),
              style = getComputedStyle(element);
            return (
              r.width > 0 &&
              r.left < innerWidth &&
              r.right > innerWidth + 2 &&
              style.position !== "fixed" &&
              !element.closest(
                ".crm-pipeline-board,.crm-table-scroll,.crm-sidebar,.preview-window,.preview-inbox,.preview-person,.preview-app,.resource-code-block"
              )
            );
          })
          .slice(0, 8)
          .map(e => ({
            tag: e.tagName,
            class: e.className,
            right: Math.round(e.getBoundingClientRect().right),
          })),
      }));
      const name = `${device.name}-${route === "/" ? "landing" : route.slice(1).replaceAll("/", "-")}`;
      await page.screenshot({ path: path.join(output, name + ".png") });
      results.push({
        device: device.name,
        targetWidth: device.width,
        route,
        ...layout,
        errors: [...errors],
      });
      console.log(
        `${device.name} ${route}: viewport ${layout.width}, documento ${layout.scroll}, errores ${errors.length}`,
        JSON.stringify(layout.overflows)
      );
    }
    await context.close();
  }
} finally {
  await browser.close();
}
await fs.writeFile(
  path.join(output, "layout-results.json"),
  JSON.stringify(results, null, 2) + "\n"
);
if (
  results.some(
    r =>
      r.errors.length ||
      r.scroll > r.targetWidth + 2 ||
      r.width > r.targetWidth + 2
  )
)
  process.exitCode = 1;
