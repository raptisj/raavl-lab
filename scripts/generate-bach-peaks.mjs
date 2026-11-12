import { readFile, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const fixture = new URL("../packages/fixtures/", import.meta.url);
const mp3 = await readFile(new URL("bach_classical.mp3", fixture));
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const peaks = await page.evaluate(async (base64) => {
    const bytes = Uint8Array.from(atob(base64), (byte) => byte.charCodeAt(0));
    const context = new OfflineAudioContext(2, 1, 24_000);
    const audio = await context.decodeAudioData(bytes.buffer);
    const bucketSize = audio.sampleRate / 25;
    const channels = Array.from({ length: audio.numberOfChannels }, (_, i) => {
      const samples = audio.getChannelData(i);
      const min = [],
        max = [];
      for (let start = 0; start < samples.length; start += bucketSize) {
        const bucket = samples.subarray(start, start + bucketSize);
        min.push(Number(Math.min(...bucket).toFixed(4)));
        max.push(Number(Math.max(...bucket).toFixed(4)));
      }
      return { min, max };
    });
    return { duration: audio.duration, channels };
  }, mp3.toString("base64"));
  await writeFile(
    new URL("bach-peaks.json", fixture),
    JSON.stringify(peaks) + "\n",
  );
} finally {
  await browser.close();
}
