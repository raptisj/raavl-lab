import type { Source, WaveformData } from "raavl/core";
import type { AnnotationDocument } from "raavl/regions";
export const peaks: WaveformData = {
  version: 1,
  sourceId: "tone",
  duration: 12,
  channels: [0, 1].map((c) => ({
    min: Array.from(
      { length: 600 },
      (_, i) => -0.2 - Math.abs(Math.sin(i * 0.07 + c)) * 0.5,
    ),
    max: Array.from(
      { length: 600 },
      (_, i) => 0.2 + Math.abs(Math.sin(i * 0.07 + c)) * 0.5,
    ),
  })),
};
export const source: Extract<Source, { kind: "url" }> = {
  kind: "url",
  id: "tone",
  url: "/fixtures/tone.wav",
  waveform: { kind: "peaks", data: peaks },
};
export const annotations: AnnotationDocument = {
  version: 1,
  sourceId: "tone",
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
