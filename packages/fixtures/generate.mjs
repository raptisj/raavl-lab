import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

export const bachAudio = new URL("./bach_classical.mp3", import.meta.url);

export async function generate(dir) {
  await mkdir(dir, { recursive: true });
  await copyFile(bachAudio, join(dir, "bach_classical.mp3"));
  await writeFile(join(dir, "bad.wav"), "This is deliberately not audio.");
}
