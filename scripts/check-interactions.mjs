import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const base = process.env.QA_BASE_URL || "http://127.0.0.1:3000";
const browser = await chromium.launch({
  executablePath: process.env.QA_CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const context = await browser.newContext({
  viewport: { width: 1366, height: 900 },
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", e => errors.push(e.message));
try {
  if (!process.env.QA_SKIP_DRAG) {
    await page.goto(base + "/demo/pipeline", { waitUntil: "networkidle" });
    await page.locator(".crm-drag-handle").first().waitFor();
    const card = page
      .locator(".crm-pipeline-column")
      .nth(0)
      .locator(".crm-lead-card")
      .first();
    const name = await card
      .locator("h3,strong")
      .first()
      .textContent()
      .catch(() => card.textContent());
    const handle = await card.locator(".crm-drag-handle").boundingBox();
    const target = await page
      .locator(".crm-pipeline-column")
      .nth(1)
      .boundingBox();
    const change = page.waitForResponse(
      r =>
        r.url().includes("/api/etc/contacts/") &&
        r.request().method() === "PATCH"
    );
    await page.mouse.move(
      handle.x + handle.width / 2,
      handle.y + handle.height / 2
    );
    await page.mouse.down();
    await page.mouse.move(
      handle.x + handle.width / 2 + 12,
      handle.y + handle.height / 2 + 12,
      { steps: 4 }
    );
    await page.mouse.move(target.x + target.width / 2, target.y + 110, {
      steps: 15,
    });
    await page.mouse.up();
    const moved = await change;
    assert.equal(moved.status(), 200);
    const body = await moved.json();
    assert.equal(body.stage, "en_atencion");
    await page.reload({ waitUntil: "networkidle" });
    assert.ok(
      (
        await page.locator(".crm-pipeline-column").nth(1).textContent()
      ).includes(body.name)
    );
    console.log(
      "OK: drag and drop de escritorio guardado y conservado al recargar."
    );
  }
  await page.goto(base + "/demo/consultations", { waitUntil: "networkidle" });
  await page
    .locator(".crm-consultation-compose textarea")
    .fill("Escribe un poema sobre el océano.");
  await page.locator(".crm-consultation-compose button[type=submit]").click();
  await page
    .locator(".crm-consultation-message.is-assistant:not(.is-pending)")
    .waitFor({ timeout: 30000 });
  assert.equal(
    await page.locator(".crm-consultation-message.is-user").count(),
    1
  );
  assert.equal(
    await page
      .locator(".crm-consultation-message.is-assistant:not(.is-pending)")
      .count(),
    1
  );
  const reply = await page
    .locator(".crm-consultation-message.is-assistant p")
    .textContent();
  assert.ok(reply.length > 20);
  assert.ok(!reply.includes("Escribe un poema"));
  console.log(
    "OK: consulta fuera de operación bloqueada; pregunta y respuesta separadas, sin duplicados."
  );
  await page.locator(".etc-preferences select").first().selectOption("en");
  await page.waitForFunction(() => document.documentElement.lang === "en");
  await page
    .locator(".crm-section-heading h1")
    .filter({ hasText: "business" })
    .waitFor();
  const theme = page.locator(".etc-preferences button").first();
  await theme.click();
  await page.waitForFunction(() =>
    document.documentElement.classList.contains("dark")
  );
  await page.reload({ waitUntil: "networkidle" });
  assert.equal(await page.evaluate(() => document.documentElement.lang), "en");
  assert.ok(
    await page.evaluate(() =>
      document.documentElement.classList.contains("dark")
    )
  );
  await page.screenshot({
    path: "/home/ubuntu/etc-qa/views/laptop-consultations-dark-en.png",
  });
  console.log("OK: inglés y tema oscuro persistentes al recargar.");
  await page.goto(base + "/login", { waitUntil: "networkidle" });
  const password = page.locator('input[autocomplete="current-password"]');
  await password.fill("Demo-Only-Example-123");
  const eye = page.locator(".access-password button").first();
  await eye.click();
  assert.equal(await password.getAttribute("type"), "text");
  await eye.click();
  assert.equal(await password.getAttribute("type"), "password");
  console.log("OK: control mostrar/ocultar contraseña.");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + "/", { waitUntil: "networkidle" });
  await page.locator(".mobile-menu").click();
  assert.ok(await page.locator("nav.nav-open").isVisible());
  assert.ok(
    (await page.locator("nav.nav-open").textContent()).includes("Financial")
  );
  await page.screenshot({
    path: "/home/ubuntu/etc-qa/views/mobile-menu-dark-en.png",
  });
  assert.equal(
    await page
      .locator("button")
      .filter({ hasText: /Pause|Replay|Pausar|Repetir/ })
      .count(),
    0
  );
  console.log(
    "OK: menú móvil accesible y animaciones sin botones de pausa/repetición."
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.ok(
    (await page
      .locator(".sample-bubble")
      .first()
      .evaluate(el => getComputedStyle(el).animationName)) === "none"
  );
  console.log(
    "OK: preferencia de movimiento reducido respetada sin controles visibles."
  );
  assert.deepEqual(errors, []);
} catch (error) {
  await page
    .screenshot({ path: "/home/ubuntu/etc-qa/views/interaction-failure.png" })
    .catch(() => {});
  throw error;
} finally {
  await browser.close();
}
