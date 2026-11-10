import { mkdir, writeFile } from "node:fs/promises";
export async function generate(dir) {
  await mkdir(dir, { recursive: true });
  const rate = 16000,
    seconds = 12,
    n = rate * seconds,
    b = Buffer.alloc(44 + n * 4);
  b.write("RIFF");
  b.writeUInt32LE(b.length - 8, 4);
  b.write("WAVEfmt ", 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(2, 22);
  b.writeUInt32LE(rate, 24);
  b.writeUInt32LE(rate * 4, 28);
  b.writeUInt16LE(4, 32);
  b.writeUInt16LE(16, 34);
  b.write("data", 36);
  b.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++)
    for (let c = 0; c < 2; c++)
      b.writeInt16LE(
        Math.round(
          Math.sin((i / rate) * Math.PI * 2 * (220 + c * 110)) *
            9000 *
            (0.6 + 0.4 * Math.sin((i / rate) * 2)),
        ),
        44 + i * 4 + c * 2,
      );
  await writeFile(dir + "/tone.wav", b);
  await writeFile(dir + "/bad.wav", "This is deliberately not audio.");
}
