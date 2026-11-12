import { createPlayer } from "raavl";
import { mountWaveform } from "raavl/dom";
import {
  createAnnotations,
  parseAnnotations,
  stringifyAnnotations,
} from "raavl/regions";
import { mountTimeline } from "raavl/timeline";
import { mountMinimap } from "raavl/minimap";
import {
  createHistory,
  recordHistory,
  undoHistory,
  redoHistory,
} from "raavl/history";
import { createSnapper } from "raavl/snapping";
import { waveformThemes, parseTheme } from "raavl/themes";
import catalog from "raavl/themes.json";
import { peaks, source, annotations } from "../../../packages/fixtures/data.js";
if (new URLSearchParams(location.search).get("scenario") !== "headless")
  void import("raavl/styles.css");
import "./lab.css";
const root = document.querySelector("#root");
root.innerHTML = `<h1>Vanilla integration lab</h1><p>Public package imports · stereo fixture · explicit lifecycle ownership</p><nav>${["editor", "headless", "data", "sources", "failures", "ownership", "controlled", "scale"].map((s) => `<a href="?scenario=${s}">${s}</a>`).join(" ")}</nav><section><h2 id="scenario"></h2><div id="buttons"></div><label>Local audio <input id="file" type="file" accept="audio/*"></label><div id="wave"></div><div id="timeline"></div><div id="mini"></div><div id="second"></div><output id="clock">0.00</output><pre id="state"></pre><pre id="events"></pre><textarea aria-label="Annotation JSON"></textarea><pre id="document"></pre></section>`;
const el = (id) => document.getElementById(id);
const scenario =
  new URLSearchParams(location.search).get("scenario") || "editor";
el("scenario").textContent = scenario;
const report = (e) => {
  el("events").textContent = JSON.stringify({
    code: e.code,
    stage: e.stage,
    message: e.message,
    reason: e.reason,
  });
};
const button = (label, fn) => {
  const b = document.createElement("button");
  b.textContent = label;
  b.onclick = () => {
    try {
      Promise.resolve(fn()).catch(report);
    } catch (e) {
      report(e);
    }
  };
  el("buttons").append(b);
};
const player = createPlayer();
let accepted = annotations,
  revision = 0,
  rejected = 0;
const commitControlled = (document, change) => {
  if (change.baseRevision !== revision) {
    rejected++;
    el("events").textContent = "Rejected stale proposal " + rejected;
    return;
  }
  accepted = document;
  revision++;
  if (!restoring) history = recordHistory(history, document);
  store.setControlled({
    value: accepted,
    revision,
    onCommit: commitControlled,
  });
};
const store = createAnnotations(
  scenario === "controlled"
    ? {
        value: accepted,
        revision,
        onCommit: commitControlled,
        rules: { minLength: 0.2, maxLength: 8, snap: 0.1 },
      }
    : {
        document: annotations,
        rules: { minLength: 0.2, maxLength: 8, snap: 0.1 },
      },
);
let history = createHistory(annotations),
  restoring = false;
store.onCommit((doc) => {
  if (!restoring) history = recordHistory(history, doc);
});
const doc = () => {
  el("document").textContent = stringifyAnnotations(
    store.getSnapshot().document,
  );
};
store.subscribe(doc);
doc();
const state = () => {
  const s = player.getSnapshot();
  el("state").textContent = JSON.stringify({
    ...s,
    data: s.data ? "peaks" : null,
  });
  if (s.error || s.waveformError) report(s.error || s.waveformError);
};
const off = player.subscribe(state),
  offTime = player.subscribeTime(() => {
    el("clock").textContent = player.getCurrentTime().toFixed(2);
  });
state();
let view, mini, timeline, second;
if (scenario === "scale")
  store.replaceDocument({
    ...annotations,
    regions: Array.from({ length: 10000 }, (_, i) => ({
      id: "dense" + i,
      start: i * 0.7,
      end: i * 0.7 + 0.3,
      label: "Region " + i,
    })),
    markers: [],
  });
const data =
  scenario === "scale"
    ? {
        ...peaks,
        duration: 7200,
        channels: peaks.channels.map((c) => ({
          min: Array.from(
            { length: 720000 },
            (_, i) => c.min[i % c.min.length],
          ),
          max: Array.from(
            { length: 720000 },
            (_, i) => c.max[i % c.max.length],
          ),
        })),
      }
    : peaks;
if (scenario !== "headless") {
  view = mountWaveform(el("wave"), {
    ...(scenario === "data" || scenario === "scale" ? { data } : { player }),
    annotations: store,
    interaction: { drag: "select" },
    viewport: { follow: "off" },
    renderRegionLabel: (r) => {
      const span = document.createElement("span");
      span.textContent = r.label || r.id;
      return {
        element: span,
        dispose() {
          span.remove();
        },
      };
    },
    onAnnotationError: report,
    snapAnnotation: createSnapper({
      grid: 0.5,
      playhead: () => player.getCurrentTime(),
      targets: () => [9],
    }),
  });
  timeline = mountTimeline(el("timeline"), { view });
  mini = mountMinimap(el("mini"), {
    view,
    ...(scenario === "data" || scenario === "scale" ? { data } : { player }),
  });
}
if (!["data", "scale"].includes(scenario))
  player
    .setSource(
      scenario === "headless"
        ? { ...source, waveform: { kind: "none" } }
        : source,
    )
    .catch(report);
button("Play", () => player.play());
button("Pause", () => player.pause());
button("Seek 5", () => player.seek(5));
button("Seek half", () => player.seekFraction(0.5));
button("Mute", () => player.setMuted(!player.getSnapshot().muted));
button("Volume 50%", () => player.setVolume(0.5));
button("Rate 1.5", () => player.setPlaybackRate(1.5));
button("Loop", () => player.setLoop(!player.getSnapshot().loop));
button("Range 1–3", () => player.playRange({ start: 1, end: 3, loop: true }));
if (scenario === "controlled") {
  button("Stale proposal", () =>
    commitControlled(
      { ...accepted, regions: [] },
      { baseRevision: revision - 1 },
    ),
  );
  button("External revision", () => {
    accepted = {
      ...accepted,
      markers: [...accepted.markers, { id: "external" + revision, time: 11 }],
    };
    revision++;
    history = recordHistory(history, accepted);
    store.setControlled({
      value: accepted,
      revision,
      onCommit: commitControlled,
    });
  });
}
button("Add region", () =>
  store.addRegion({
    id: "r" + store.getSnapshot().revision,
    start: 8,
    end: 9,
    label: "Added",
  }),
);
button("Add marker", () =>
  store.addMarker({
    id: "m" + store.getSnapshot().revision,
    time: 10,
    label: "New cue",
  }),
);
button("Update intro", () =>
  store.updateRegion("intro", { label: "Edited", end: 3.5 }),
);
button("Delete intro", () => store.remove("intro"));
button("Try locked edit", () => store.updateRegion("locked", { start: 5 }));
button("Undo", () => {
  history = undoHistory(history);
  restoring = true;
  try {
    store.replaceDocument(history.present);
  } finally {
    restoring = false;
  }
});
button("Redo", () => {
  history = redoHistory(history);
  restoring = true;
  try {
    store.replaceDocument(history.present);
  } finally {
    restoring = false;
  }
});
button("Export JSON", () => {
  document.querySelector("textarea").value = stringifyAnnotations(
    store.getSnapshot().document,
  );
});
button("Import JSON", () =>
  store.replaceDocument(
    parseAnnotations(document.querySelector("textarea").value, source.id),
  ),
);
button("Save", () =>
  localStorage.setItem(
    `vanilla:${source.id}`,
    stringifyAnnotations(store.getSnapshot().document),
  ),
);
button("Reload saved", () =>
  store.replaceDocument(
    parseAnnotations(
      localStorage.getItem(`vanilla:${source.id}`) || "",
      source.id,
    ),
  ),
);
button("Zoom", () => view?.update({ viewport: { zoom: 120 } }));
button("Fit", () => view?.update({ viewport: { zoom: "fit" } }));
button("Scroll", () => view?.scrollTo(4));
button("Bars / neon", () =>
  view?.update({
    appearance: { style: "bars", normalize: true, amplitude: 0.7, height: 200 },
    theme: waveformThemes.neon,
  }),
);
button("JSON theme", () => view?.update({ theme: parseTheme(catalog.paper) }));
button("CSS theme", () => {
  el("wave").style.setProperty("--raavl-wave-color", "#c33");
  view?.update({ theme: null });
  view?.refreshTheme();
});
button("Selection → region", () =>
  view?.createRegionFromSelection("selection", "Selected"),
);
button("Clear selection", () => view?.clearSelection());
button("Decode URL", () =>
  player.setSource({ ...source, waveform: { kind: "decode" } }),
);
button("No waveform", () =>
  player.setSource({ ...source, waveform: { kind: "none" } }),
);
button("Supplied peaks", () => player.setSource(source));
button("Blob", async () =>
  player.setSource({
    kind: "file",
    id: source.id,
    file: await (await fetch(source.url)).blob(),
    waveform: { kind: "peaks", data: peaks },
  }),
);
let media;
button("Borrow media", () => {
  media?.pause();
  media?.remove();
  media = new Audio(source.url);
  media.controls = true;
  root.append(media);
  return player.setSource({
    kind: "media",
    id: source.id,
    element: media,
    waveform: { kind: "none" },
  });
});
el("file").onchange = (e) => {
  const file = e.target.files?.[0];
  if (file)
    player.setSource({ kind: "file", id: file.name, file }).catch(report);
};
button("Waveform network failure", () =>
  player.setSource({
    ...source,
    url: "http://127.0.0.1:4390/audio.mp3",
    request: { headers: { "x-waveform-failure": "network" } },
    waveform: { kind: "decode" },
  }),
);
button("Waveform decode failure", () =>
  player.setSource({
    ...source,
    url: "http://127.0.0.1:4390/audio.mp3",
    request: { headers: { "x-waveform-failure": "decode" } },
    waveform: { kind: "decode" },
  }),
);
button("CORS failure", () =>
  player.setSource({
    ...source,
    url: "http://127.0.0.1:4390/cors-denied.mp3",
    waveform: { kind: "decode" },
  }),
);
button("Slow source", () =>
  player.setSource({ ...source, url: "http://127.0.0.1:4390/slow.mp3" }),
);
button("Bad media", () =>
  player.setSource({ ...source, url: "/fixtures/bad.wav" }),
);
button("Missing URL", () =>
  player.setSource({ ...source, url: "/fixtures/missing.wav" }),
);
button("Bad peaks", () =>
  player.setSource({
    ...source,
    waveform: { kind: "peaks", data: { ...peaks, sourceId: "wrong" } },
  }),
);
button("Abort", () => {
  const abort = new AbortController();
  const promise = player.setSource(
    { ...source, url: `${source.url}?abort` },
    { signal: abort.signal },
  );
  abort.abort();
  return promise;
});
button("Rapid replace", async () => {
  const first = player.setSource({ ...source, id: "old" }).catch(report);
  await player.setSource(source);
  await first;
});
button("Second borrowed view", () => {
  second?.dispose();
  second = mountWaveform(el("second"), { player });
});
button("Remove borrowed view", () => {
  second?.dispose();
  second = undefined;
});
button("Seek interaction", () =>
  view?.update({ interaction: { drag: "seek" } }),
);
button("Follow center", () =>
  view?.update({ viewport: { follow: "center", zoom: 120 } }),
);
button("Follow visible", () =>
  view?.update({ viewport: { follow: "visible", zoom: 120 } }),
);
button("Split channels", () =>
  view?.update({ appearance: { splitChannels: true, height: 240 } }),
);
button("Narrow view", () => {
  el("wave").style.width = el("wave").style.width ? "" : "60%";
});
button("Source revision", () =>
  player.setSource({
    ...source,
    revision: "r2",
    waveform: { kind: "peaks", data: { ...peaks, sourceRevision: "r2" } },
  }),
);
button("Mismatched duration", () =>
  player.setSource({
    ...source,
    waveform: { kind: "peaks", data: { ...peaks, duration: 30 } },
  }),
);
button("Invalid rules", () =>
  view?.update({ annotationRules: { minLength: 5, maxLength: 1 } }),
);
button("Out of bounds", () =>
  store.addRegion({
    id: "outside",
    start: peaks.duration + 1,
    end: peaks.duration + 3,
  }),
);
button("Replace data", () =>
  view?.update({ data: { ...data, channels: [data.channels[1]] } }),
);
button("Clear", () => player.clearSource());
button("Dispose twice", () => {
  mini?.dispose();
  timeline?.dispose();
  second?.dispose();
  view?.dispose();
  player.dispose();
  player.dispose();
  state();
});
const measure = async (mode) => {
  if (!view) return;
  const samples = [];
  view.update({
    annotations: mode === "hidden" ? null : store,
    viewport: { zoom: mode === "zoom" ? 100 : "fit" },
  });
  for (let i = 0; i < 31; i++) {
    const start = performance.now();
    view.update({ viewport: { zoom: mode === "zoom" ? 100 : "fit" } });
    await new Promise((resolve) => requestAnimationFrame(() => resolve()));
    if (i) samples.push(performance.now() - start);
  }
  samples.sort((a, b) => a - b);
  el("events").textContent = JSON.stringify({
    mode,
    environment: navigator.userAgent,
    warmup: 1,
    samples: 30,
    median: samples[15],
    p95: samples[28],
    dom: document.querySelectorAll("*").length,
    regions: document.querySelectorAll(".raavl-region").length,
    devicePixelRatio,
  });
};
button("Measure zoom", () => measure("zoom"));
button("Measure fit", () => measure("fit"));
button("Measure hidden", () => measure("hidden"));
window.addEventListener(
  "pagehide",
  () => {
    mini?.dispose();
    timeline?.dispose();
    second?.dispose();
    view?.dispose();
    off();
    offTime();
    store.dispose();
    player.dispose();
    media?.pause();
    media?.remove();
  },
  { once: true },
);

// Provenance comes from the selected artifact, never from library source aliases.
fetch("/lab-source.json")
  .then((response) => response.json())
  .then((identity) => {
    const banner = document.createElement("pre");
    banner.setAttribute("aria-label", "Package source");
    banner.textContent = `Raavl ${identity.version} · ${identity.mode} · SHA256 ${identity.hash}`;
    document.body.prepend(banner);
  })
  .catch(() => {
    const banner = document.createElement("p");
    banner.textContent = "Package source identity unavailable";
    document.body.prepend(banner);
  });
