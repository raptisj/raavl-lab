import { test, expect } from "@playwright/test";
import {
  collectErrors,
  advancing,
  trackMedia,
  playingMedia,
} from "../../packages/test-utils/browser";
for (const [i, app] of ["vanilla-js", "vanilla-ts"].entries()) {
  test(`${app} playback, editing, persistence, borrowed view and disposal`, async ({
    page,
  }) => {
    const errors = collectErrors(page);
    await page.goto(`http://127.0.0.1:${4301 + i}`);
    await expect(page.locator("#state")).toContainText('"source":"ready"');
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await advancing(page, "#clock");
    await page.getByRole("button", { name: "Pause", exact: true }).click();
    await page.getByRole("button", { name: "Seek 5", exact: true }).click();
    await expect
      .poll(async () => Number(await page.locator("#clock").textContent()))
      .toBeGreaterThan(4.8);
    await page.getByRole("button", { name: "Add region", exact: true }).click();
    await expect(page.locator("#document")).toContainText("Added");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.reload();
    await page
      .getByRole("button", { name: "Reload saved", exact: true })
      .click();
    await expect(page.locator("#document")).toContainText("Added");
    await page
      .getByRole("button", { name: "Second borrowed view", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Remove borrowed view", exact: true })
      .click();
    await expect(page.locator("#state")).toContainText('"source":"ready"');
    await page
      .getByRole("button", { name: "Dispose twice", exact: true })
      .click();
    await expect(page.locator("#state")).toContainText("disposed");
    expect(errors).toEqual([]);
  });
  test(`${app} data-only, source failures and replacement`, async ({
    page,
  }) => {
    await page.goto(`http://127.0.0.1:${4301 + i}/?scenario=data`);
    await expect(page.locator("#wave canvas")).toHaveCount(2);
    await expect(page.locator("#state")).toContainText('"source":"idle"');
    const before = await page
      .locator("#wave canvas")
      .first()
      .evaluate((c: HTMLCanvasElement) => c.toDataURL());
    await page
      .getByRole("button", { name: "Replace data", exact: true })
      .click();
    await expect
      .poll(() =>
        page
          .locator("#wave canvas")
          .first()
          .evaluate((c: HTMLCanvasElement) => c.toDataURL()),
      )
      .not.toBe(before);
    await page.goto(`http://127.0.0.1:${4301 + i}/?scenario=sources`);
    await page.getByRole("button", { name: "Bad peaks", exact: true }).click();
    await expect(page.locator("#events")).toContainText("INVALID_DATA");
    await page
      .getByRole("button", { name: "Supplied peaks", exact: true })
      .click();
    await expect(page.locator("#state")).toContainText('"waveform":"ready"');
    await page.getByRole("button", { name: "Abort", exact: true }).click();
    await expect(page.locator("#events")).toContainText("CANCELLED");
    await page
      .getByRole("button", { name: "Rapid replace", exact: true })
      .click();
    await expect(page.locator("#state")).toContainText('"sourceId":"tone"');
  });
}
test("react borrowed ownership and headless clock", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("http://127.0.0.1:4303/?scenario=borrowed");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await advancing(page, "[data-testid=clock]");
  await page.getByRole("button", { name: "Toggle borrowed view" }).click();
  await expect(page.locator("section pre")).toContainText("playing");
  await page.getByRole("button", { name: "Mount / unmount owner" }).click();
  await expect(page.locator("[data-testid=clock]")).toHaveCount(0);
  expect(errors).toEqual([]);
});
for (const [i, app] of ["react-redux", "react-zustand"].entries())
  test(`${app} accepted revisions, stale rejection, history and reload`, async ({
    page,
  }) => {
    const errors = collectErrors(page);
    await page.goto(`http://127.0.0.1:${4304 + i}`);
    const state = async () =>
      JSON.parse((await page.getByTestId("store").textContent()) || "{}");
    await page.getByRole("button", { name: "External edit" }).click();
    expect((await state()).document.regions).toHaveLength(3);
    await page.getByRole("button", { name: "Stale proposal" }).click();
    expect((await state()).rejected).toBe(1);
    expect((await state()).history.past).toHaveLength(1);
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.reload();
    await expect
      .poll(async () => (await state()).document.regions.length)
      .toBe(3);
    await page.getByRole("button", { name: "Change source" }).click();
    expect((await state()).history.past).toHaveLength(0);
    expect(errors).toEqual([]);
  });
test("next-app-router production hydration and persistent navigation", async ({
  page,
}) => {
  const errors = collectErrors(page);
  await trackMedia(page);
  await page.goto("http://127.0.0.1:4306");
  const persistent = page.getByRole("region", {
    name: "Persistent layout player",
  });
  await persistent
    .getByRole("button", { name: "Play audio", exact: true })
    .click();
  await expect(
    persistent.getByRole("button", { name: "Pause audio", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("region", { name: "Route local player" })
    .getByRole("button", { name: "Play audio", exact: true })
    .click();
  await expect.poll(() => playingMedia(page)).toBe(2);
  await page.getByRole("link", { name: "Away", exact: true }).click();
  await expect.poll(() => playingMedia(page)).toBe(1);
  await expect(page.getByRole("heading", { name: "Away route" })).toBeVisible();
  await expect(
    persistent.getByRole("button", { name: "Pause audio", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Route local player" }),
  ).toHaveCount(0);
  expect(errors).toEqual([]);
});
test("vanilla-js waveform failures preserve playback and stale loads cannot win", async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto("http://127.0.0.1:4301/?scenario=failures");
  for (const [button, code] of [
    ["Waveform network failure", "NETWORK"],
    ["Waveform decode failure", "DECODE"],
    ["CORS failure", "NETWORK"],
  ]) {
    await page.getByRole("button", { name: button, exact: true }).click();
    await expect(page.locator("#events")).toContainText(code);
    await expect(page.locator("#state")).toContainText('"source":"ready"');
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await expect(page.locator("#state")).toContainText('"playback":"playing"');
    await page.getByRole("button", { name: "Pause", exact: true }).click();
  }
  await page.getByRole("button", { name: "Slow source", exact: true }).click();
  await page
    .getByRole("button", { name: "Supplied peaks", exact: true })
    .click();
  await expect(page.locator("#state")).toContainText('"waveform":"ready"');
  await page.waitForTimeout(1400);
  await expect(page.locator("#state")).toContainText('"waveform":"ready"');
  expect(
    errors.filter(
      (e) => !e.includes("cors-denied.wav due to access control checks"),
    ),
  ).toEqual([]);
});
for (const scenario of [
  "complete",
  "composed",
  "headless",
  "owned",
  "multiple",
  "independent",
  "modules",
])
  test(`react ${scenario} scenario`, async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto("http://127.0.0.1:4303/?scenario=" + scenario);
    if (scenario === "complete" || scenario === "composed") {
      await page
        .getByRole("button", { name: "Play audio", exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: "Pause audio", exact: true }),
      ).toBeVisible();
      await page
        .getByRole("slider", { name: "Seek audio", exact: true })
        .focus();
      await page.keyboard.press("ArrowRight");
      await page
        .getByRole("combobox", { name: "Playback speed" })
        .selectOption("1.5");
    } else if (scenario === "owned") {
      await expect(
        page.getByText("Intro", { exact: true }).first(),
      ).toBeVisible();
    } else {
      await page.getByRole("button", { name: "Play", exact: true }).click();
      await advancing(page, "[data-testid=clock]");
    }
    await page.getByRole("button", { name: "Mount / unmount owner" }).click();
    await page.getByRole("button", { name: "Mount / unmount owner" }).click();
    expect(errors).toEqual([]);
  });
test("vanilla-js modules, keyboard, selection, themes and history", async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto("http://127.0.0.1:4301");
  await expect(page.locator("#state")).toContainText('"waveform":"ready"');
  await page.getByRole("button", { name: "Zoom", exact: true }).click();
  await page.getByRole("button", { name: "Scroll", exact: true }).click();
  await expect(page.locator("#clock")).toHaveText("0.00");
  await page.getByRole("button", { name: "Fit", exact: true }).click();
  const surface = page.locator("#wave .raavl-waveform").first();
  await surface.focus();
  await page.keyboard.press("ArrowRight");
  await expect
    .poll(async () => Number(await page.locator("#clock").textContent()))
    .toBeGreaterThan(0);
  await page.locator("#wave .raavl-surface").scrollIntoViewIfNeeded();
  const box = await page.locator("#wave .raavl-surface").boundingBox();
  if (!box) throw Error("No waveform surface");
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.7);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.7, {
    steps: 5,
  });
  await page.mouse.up();
  await page
    .getByRole("button", { name: "Selection → region", exact: true })
    .click();
  await expect(page.locator("#document")).toContainText("Selected");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.locator("#document")).not.toContainText("Selected");
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect(page.locator("#document")).toContainText("Selected");
  for (const name of ["Bars / neon", "JSON theme", "CSS theme"])
    await page.getByRole("button", { name, exact: true }).click();
  await expect(page.locator("#state")).toContainText('"source":"ready"');
  expect(errors).toEqual([]);
});
for (const [app, port, output] of [
  ["vanilla-js", 4301, "#document"],
  ["react-redux", 4304, "[data-testid=store]"],
  ["react-zustand", 4305, "[data-testid=store]"],
] as const)
  test(`${app} pointer edits, locks, and external revision during gesture`, async ({
    page,
  }) => {
    await page.goto(`http://127.0.0.1:${port}/?scenario=controlled`);
    const read = async () => {
      const data = JSON.parse(
        (await page.locator(output).textContent()) || "{}",
      );
      return data.document || data;
    };
    const body = page.locator(
      '.raavl-region-body[data-raavl-annotation="intro"]',
    );
    await body.scrollIntoViewIfNeeded();
    await body.focus();
    await page.keyboard.press("ArrowRight");
    await expect
      .poll(
        async () =>
          (await read()).regions.find((r: any) => r.id === "intro").start,
      )
      .toBeGreaterThan(1);
    const locked = page.locator(
      '.raavl-region-body[data-raavl-annotation="locked"]',
    );
    await locked.focus();
    await page.keyboard.press("ArrowRight");
    expect(
      (await read()).regions.find((r: any) => r.id === "locked").start,
    ).toBe(6);
    await body.scrollIntoViewIfNeeded();
    const box = await body.boundingBox();
    if (!box) throw Error("Missing annotation");
    const before = (await read()).regions.find(
      (r: any) => r.id === "intro",
    ).start;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2, {
      steps: 5,
    });
    await page
      .getByRole("button", {
        name: app === "vanilla-js" ? "External revision" : "External edit",
        exact: true,
      })
      .evaluate((button: HTMLButtonElement) => button.click());
    await page.mouse.up();
    expect(
      (await read()).regions.find((r: any) => r.id === "intro").start,
    ).toBe(before);
    await page
      .getByRole("button", { name: "Stale proposal", exact: true })
      .click();
    expect((await read()).regions.length).toBeGreaterThan(0);
  });
test("vanilla-js borrowed media ownership and file input", async ({ page }) => {
  await page.goto("http://127.0.0.1:4301/?scenario=ownership");
  await page.getByRole("button", { name: "Borrow media", exact: true }).click();
  await expect(page.locator("#state")).toContainText('"source":"ready"');
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect
    .poll(() =>
      page.locator("audio").evaluate((a: HTMLAudioElement) => a.currentTime),
    )
    .toBeGreaterThan(0.1);
  await page
    .getByRole("button", { name: "Dispose twice", exact: true })
    .click();
  expect(
    await page.locator("audio").evaluate((a: HTMLAudioElement) => a.paused),
  ).toBe(false);
  await page.reload();
  const audio = await (
    await page.request.get("http://127.0.0.1:4301/fixtures/tone.wav")
  ).body();
  await page.locator("input[type=file]").setInputFiles({
    name: "fixture.wav",
    mimeType: "audio/wav",
    buffer: audio,
  });
  await expect(page.locator("#state")).toContainText(
    '"sourceId":"fixture.wav"',
  );
  await expect(page.locator("#state")).toContainText('"waveform":"ready"');
});
test.describe("touch emulation", () => {
  test.use({ hasTouch: true });
  test("vanilla-js touch seek", async ({ page }) => {
    await page.goto("http://127.0.0.1:4301/?scenario=editor");
    await expect(page.locator("#state")).toContainText('"source":"ready"');
    await page
      .getByRole("button", { name: "Seek interaction", exact: true })
      .click();
    await page.locator("#wave .raavl-surface").scrollIntoViewIfNeeded();
    const box = await page.locator("#wave .raavl-surface").boundingBox();
    if (!box) throw Error("Missing surface");
    await page.touchscreen.tap(box.x + box.width * 0.9, box.y + 10);
    await expect
      .poll(async () => Number(await page.locator("#clock").textContent()))
      .toBeGreaterThan(9);
  });
});
test("vanilla-js transport settings, range playback, rules and minimap", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:4301");
  await expect(page.locator("#state")).toContainText('"source":"ready"');
  const state = async () =>
    JSON.parse((await page.locator("#state").textContent()) || "{}");
  for (const [name, key, value] of [
    ["Mute", "muted", true],
    ["Volume 50%", "volume", 0.5],
    ["Rate 1.5", "playbackRate", 1.5],
    ["Loop", "loop", true],
  ] as const) {
    await page.getByRole("button", { name, exact: true }).click();
    expect((await state())[key]).toBe(value);
  }
  await page.getByRole("button", { name: "Seek half", exact: true }).click();
  await expect
    .poll(async () => Number(await page.locator("#clock").textContent()))
    .toBeCloseTo(6, 0);
  await page.getByRole("button", { name: "Range 1–3", exact: true }).click();
  await expect(page.locator("#state")).toContainText('"playback":"playing"');
  expect((await state()).loop).toBe(false);
  await expect
    .poll(async () => Number(await page.locator("#clock").textContent()))
    .toBeLessThan(3.5);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.getByRole("button", { name: "Zoom", exact: true }).click();
  const time = Number(await page.locator("#clock").textContent());
  const minimap = page.getByRole("slider", {
    name: "Waveform viewport",
    exact: true,
  });
  await expect(minimap).toHaveAttribute("aria-disabled", "false");
  await minimap.focus();
  await expect
    .poll(() =>
      page
        .locator("#wave .raavl-waveform")
        .evaluate((e) => e.scrollWidth - e.clientWidth),
    )
    .toBeGreaterThan(0);
  await expect
    .poll(async () => Number(await minimap.getAttribute("aria-valuemax")))
    .toBeGreaterThan(0);
  await page.keyboard.press("End");
  await expect
    .poll(async () => Number(await minimap.getAttribute("aria-valuenow")))
    .toBeGreaterThan(0);
  expect(Number(await page.locator("#clock").textContent())).toBeCloseTo(
    time,
    1,
  );
  for (const name of ["Try locked edit", "Out of bounds", "Invalid rules"]) {
    await page.getByRole("button", { name, exact: true }).click();
    await expect(page.locator("#events")).toContainText("INVALID_DATA");
  }
  await page
    .getByRole("button", { name: "Source revision", exact: true })
    .click();
  await expect(page.locator("#state")).toContainText('"waveform":"ready"');
  await page
    .getByRole("button", { name: "Mismatched duration", exact: true })
    .click();
  await expect(page.locator("#events")).toContainText("DURATION_MISMATCH");
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await expect(page.locator("#state")).toContainText('"source":"idle"');
});

test("react controlled local state accepts and rejects revisions", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:4303/?scenario=controlled");
  await page
    .getByRole("button", { name: "External edit", exact: true })
    .click();
  const read = async () =>
    JSON.parse((await page.getByTestId("local-state").textContent()) || "{}");
  expect((await read()).document.regions).toHaveLength(3);
  await page
    .getByRole("button", { name: "Stale proposal", exact: true })
    .click();
  expect((await read()).rejected).toBe(1);
  expect((await read()).document.regions).toHaveLength(3);
});
