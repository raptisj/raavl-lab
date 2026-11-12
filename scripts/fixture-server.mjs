import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { bachAudio } from "../packages/fixtures/generate.mjs";
const audio = await readFile(bachAudio);
const server = createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname === "/health") {
    res.end("ok");
    return;
  }
  if (url.pathname !== "/cors-denied.mp3")
    res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "x-waveform-failure");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  const send = () => {
    if (res.destroyed) return;
    if (req.headers["x-waveform-failure"] === "network") {
      res.writeHead(503);
      res.end("deliberate waveform fetch failure");
      return;
    }
    if (req.headers["x-waveform-failure"] === "decode") {
      res.setHeader("Content-Type", "audio/mpeg");
      res.end("deliberately invalid waveform bytes");
      return;
    }
    const range = /bytes=(\d+)-(\d*)/.exec(req.headers.range || "");
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Accept-Ranges", "bytes");
    if (range) {
      const start = Number(range[1]),
        end = Math.min(Number(range[2] || audio.length - 1), audio.length - 1);
      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${audio.length}`,
        "Content-Length": end - start + 1,
      });
      res.end(audio.subarray(start, end + 1));
    } else {
      res.setHeader("Content-Length", audio.length);
      res.end(audio);
    }
  };
  const timer = setTimeout(send, url.pathname === "/slow.mp3" ? 1200 : 0);
  res.on("close", () => clearTimeout(timer));
});
server.listen(4390, "127.0.0.1", () =>
  console.log("Fixture HTTP server http://127.0.0.1:4390"),
);
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => server.close(() => process.exit()));
