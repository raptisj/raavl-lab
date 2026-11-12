import bachPeaks from "./bach-peaks.json";

export const audioUrl = "/fixtures/bach_classical.mp3";
export const sourceId = "bach-classical";
export const peaks = {
  version: /** @type {const} */ (1),
  sourceId,
  ...bachPeaks,
};
export const source = {
  kind: /** @type {const} */ ("url"),
  id: sourceId,
  url: audioUrl,
  waveform: { kind: /** @type {const} */ ("peaks"), data: peaks },
};
export const annotations = {
  version: /** @type {const} */ (1),
  sourceId,
  regions: [
    {
      id: "intro",
      start: 1,
      end: 3,
      label: "Intro",
      metadata: { speaker: "A" },
    },
    {
      id: "locked",
      start: 6,
      end: 8,
      label: "Locked",
      locked: true,
      channel: 1,
    },
  ],
  markers: [{ id: "cue", time: 4, label: "Cue" }],
};
