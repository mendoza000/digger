import { expect, test } from "@playwright/test";

async function enterGame(page: import("@playwright/test").Page) {
  await page.route("**/api/players", async (route) => {
    await route.fulfill({ json: { id: 1, username: "tester" } });
  });
  await page.route("**/api/config/**", async (route) => {
    if (route.request().method() === "POST") await route.fulfill({ json: { ok: true } });
    else await route.fulfill({ json: { dificultad_preferida: "medio", sonido_activo: false } });
  });
  await page.route("**/api/scores", (route) => route.fulfill({ json: { ok: true } }));
  await page.goto("/");
  await page.getByPlaceholder("nombre_usuario").fill("tester");
  await page.getByRole("button", { name: "jugar" }).click();
  await page.getByRole("button", { name: "Jugar" }).waitFor();
  await page.getByRole("button", { name: "Jugar" }).click();
  await page.locator(".game-screen").waitFor();
}

test("mobile console suppresses selection and supported touch callout", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile emulation only");
  await page.addInitScript(() => sessionStorage.setItem("digger.player", JSON.stringify({ id: 1, username: "tester" })));
  await page.route("**/api/config/**", (route) => route.fulfill({ json: {} }));
  await page.goto("/play");
  await page.getByRole("button", { name: "Jugar" }).click();
  const console = page.locator(".game-console");
  const screen = page.locator(".game-screen");
  const controls = page.locator(".game-controls");
  const touchButton = page.getByRole("button", { name: "Up" });
  await expect(controls).toBeVisible();
  await expect(console).toHaveCSS("-webkit-user-select", "none");
  await expect(screen).toHaveCSS("-webkit-user-select", "none");
  await expect(controls).toHaveCSS("-webkit-user-select", "none");
  await expect(touchButton).toHaveCSS("-webkit-user-select", "none");
  if (await page.evaluate(() => CSS.supports("-webkit-touch-callout", "none"))) {
    await expect(touchButton).toHaveCSS("-webkit-touch-callout", "none");
  }
});

test("controls remain aligned and expose usable hit targets in portrait and landscape", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile emulation only");
  await page.addInitScript(() => sessionStorage.setItem("digger.player", JSON.stringify({ id: 1, username: "tester" })));
  await page.route("**/api/config/**", (route) => route.fulfill({ json: {} }));
  await page.goto("/play");
  await page.getByRole("button", { name: "Jugar" }).click();
  for (const orientation of ["portrait", "landscape"] as const) {
    await page.setViewportSize(orientation === "portrait" ? { width: 390, height: 844 } : { width: 844, height: 390 });
    const button = page.getByRole("button", { name: "Up" });
    await expect(button).toBeVisible();
    expect(await button.evaluate((el) => Math.min(el.getBoundingClientRect().width, el.getBoundingClientRect().height))).toBeGreaterThan(16);
  }
});

test("landing to game and Escape pause/resume keyboard regression", async ({ page, isMobile }) => {
  test.skip(isMobile, "desktop keyboard regression");
  await enterGame(page);
  await page.keyboard.down("ArrowUp");
  await page.keyboard.up("ArrowUp");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Continuar" })).toBeVisible();
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.locator(".game-screen")).toBeVisible();
});

test("direction presses expose pressed state and preserve simultaneous owners", async ({ page, isMobile }) => {
  test.skip(!isMobile, "touch interaction under mobile emulation");
  await enterGame(page);
  const up = page.getByRole("button", { name: "Up" });
  const left = page.getByRole("button", { name: "Left" });
  await up.dispatchEvent("pointerdown", { pointerId: 11, pointerType: "touch", isPrimary: true, button: 0, clientX: 100, clientY: 100 });
  await left.dispatchEvent("pointerdown", { pointerId: 12, pointerType: "touch", isPrimary: false, button: 0, clientX: 100, clientY: 100 });
  await expect(up).toHaveAttribute("aria-pressed", "true");
  await expect(left).toHaveAttribute("aria-pressed", "true");
  const leftBox = await left.boundingBox();
  expect(leftBox).not.toBeNull();
  await up.dispatchEvent("pointermove", { pointerId: 11, pointerType: "touch", isPrimary: true, button: 0, clientX: leftBox!.x + leftBox!.width / 2, clientY: leftBox!.y + leftBox!.height / 2 });
  await expect(up).toHaveAttribute("aria-pressed", "false");
  await expect(left).toHaveAttribute("aria-pressed", "true");
  await left.dispatchEvent("pointerup", { pointerId: 11, pointerType: "touch", isPrimary: true, button: 0 });
  await expect(left).toHaveAttribute("aria-pressed", "true");
  await left.dispatchEvent("pointercancel", { pointerId: 12, pointerType: "touch", isPrimary: false, button: 0 });
  await expect(left).toHaveAttribute("aria-pressed", "false");
  await up.dispatchEvent("pointerdown", { pointerId: 13, pointerType: "touch", isPrimary: true, button: 0 });
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect(up).toHaveAttribute("aria-pressed", "false");
  await up.dispatchEvent("pointerdown", { pointerId: 14, pointerType: "touch", isPrimary: true, button: 0 });
  await page.keyboard.press("Escape");
  await expect(up).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByRole("button", { name: "Continuar" })).toBeVisible();
  await page.getByRole("button", { name: "Continuar" }).click();
});

test("haptics preference defaults off and persists opt-in", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile preference flow");
  await page.addInitScript(() => sessionStorage.setItem("digger.player", JSON.stringify({ id: 1, username: "tester" })));
  await page.route("**/api/config/**", (route) => route.fulfill({ json: {} }));
  await page.goto("/play");
  const toggle = page.getByRole("checkbox", { name: /haptics/i });
  await expect(toggle).not.toBeChecked();
  await toggle.check();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("digger.haptics"))).toBe("true");
  await page.reload();
  await expect(page.getByRole("checkbox", { name: /haptics/i })).toBeChecked();
});

test("direction can cancel and A/B are actionable", async ({ page, isMobile }) => {
  test.skip(!isMobile, "touch interaction under mobile emulation");
  await enterGame(page);
  const up = page.getByRole("button", { name: "Up" });
  await up.dispatchEvent("pointerdown", { pointerId: 1, pointerType: "touch", isPrimary: true, button: 0 });
  await up.dispatchEvent("pointercancel", { pointerId: 1, pointerType: "touch", isPrimary: true, button: 0 });
  const shootA = page.getByRole("button", { name: "Shoot with A" });
  const shootB = page.getByRole("button", { name: "Shoot with B" });
  await expect(shootA).toBeVisible();
  await expect(shootB).toBeVisible();
  await shootA.dispatchEvent("pointerdown", { pointerId: 21, pointerType: "touch", isPrimary: true, button: 0 });
  await expect(shootA).toHaveAttribute("aria-pressed", "true");
  await shootA.dispatchEvent("pointerup", { pointerId: 21, pointerType: "touch", isPrimary: true, button: 0 });
  await expect(shootA).toHaveAttribute("aria-pressed", "false");
});
