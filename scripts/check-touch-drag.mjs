import { chromium } from "playwright";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  executablePath: process.env.QA_CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true,
});
const page = await context.newPage();
try {
  await page.goto(
    (process.env.QA_BASE_URL || "http://127.0.0.1:3000") + "/demo/pipeline",
    { waitUntil: "networkidle" }
  );
  const card = page
    .locator(".crm-pipeline-column")
    .nth(0)
    .locator(".crm-lead-card")
    .first();
  await card.locator(".crm-drag-handle").waitFor();
  const start = await card.locator(".crm-drag-handle").boundingBox();
  const target = await page
    .locator(".crm-pipeline-column")
    .nth(1)
    .boundingBox();
  const x = start.x + start.width / 2,
    y = start.y + start.height / 2,
    tx = Math.min(370, target.x + target.width / 2),
    ty = target.y + 120;
  assert.ok(tx > target.x && tx < 390);
  const cdp = await context.newCDPSession(page);
  const change = page.waitForResponse(
    r =>
      r.url().includes("/api/etc/contacts/") && r.request().method() === "PATCH"
  );
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y }],
  });
  await page.waitForTimeout(220);
  for (let step = 1; step <= 12; step++) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        { x: x + ((tx - x) * step) / 12, y: y + ((ty - y) * step) / 12 },
      ],
    });
    await page.waitForTimeout(25);
  }
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  const response = await change;
  assert.equal(response.status(), 200);
  const body = await response.json();
  assert.equal(body.stage, "en_atencion");
  await page.reload({ waitUntil: "networkidle" });
  assert.ok(
    (await page.locator(".crm-pipeline-column").nth(1).textContent()).includes(
      body.name
    )
  );
  console.log(
    "OK: gesto táctil de drag and drop y etapa persistida al recargar en viewport móvil."
  );
} catch (error) {
  await page.screenshot({
    path: "/home/ubuntu/etc-qa/views/touch-drag-failure.png",
  });
  throw error;
} finally {
  await browser.close();
}
