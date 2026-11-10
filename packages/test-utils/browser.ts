import { expect, type Page } from "@playwright/test";
export function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && /hydrat|server rendered/i.test(m.text()))
      errors.push(m.text());
  });
  return errors;
}
export async function advancing(page: Page, selector: string) {
  await expect
    .poll(async () => Number(await page.locator(selector).textContent()))
    .toBeGreaterThan(0.1);
}
/** Observe real native media allocation; never replace media behavior. */
export async function trackMedia(page: Page) {
  await page.addInitScript(() => {
    const created: HTMLMediaElement[] = [];
    (window as any).__labMedia = created;
    const original = document.createElement.bind(document);
    document.createElement = ((
      name: string,
      options?: ElementCreationOptions,
    ) => {
      const element = original(name, options);
      if (name.toLowerCase() === "audio")
        created.push(element as HTMLMediaElement);
      return element;
    }) as typeof document.createElement;
  });
}
export async function playingMedia(page: Page) {
  return page.evaluate(
    () =>
      ((window as any).__labMedia as HTMLMediaElement[]).filter(
        (media) => !media.paused && !media.ended,
      ).length,
  );
}
