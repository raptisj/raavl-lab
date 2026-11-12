import React, { StrictMode, useEffect, useState, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  AudioPlayer,
  PlayerRoot,
  PlayPauseButton,
  TimeDisplay,
  SeekSlider,
  MuteButton,
  VolumeSlider,
  PlaybackRateSelect,
  LoopButton,
  PlayerStatus,
  usePlayer,
  usePlayerTime,
  usePlayerState,
  usePlayerContext,
  Waveform,
} from "raavl/react";
import { createAnnotations, type AnnotationDocument } from "raavl/regions";
import { mountTimeline } from "raavl/timeline";
import { mountMinimap } from "raavl/minimap";
import { createSnapper } from "raavl/snapping";
import { waveformThemes } from "raavl/themes";
import type { Player } from "raavl/core";
import type { WaveformView } from "raavl/dom";
import { source, annotations } from "../../../packages/fixtures/data.js";
import { editorAnnotations } from "./fixture";
if (new URLSearchParams(location.search).get("scenario") !== "headless")
  void import("raavl/styles.css");
import "./lab.css";
function Clock({ player }: { player: Player | null }) {
  const time = usePlayerTime(player);
  return <output data-testid="clock">{time.toFixed(2)}</output>;
}
function ContextControl() {
  const player = usePlayerContext();
  return <button onClick={() => player?.seek(5)}>Custom seek 5</button>;
}
function Parts() {
  return (
    <>
      <PlayPauseButton />
      <TimeDisplay />
      <SeekSlider />
      <MuteButton />
      <VolumeSlider />
      <PlaybackRateSelect />
      <LoopButton />
      <PlayerStatus />
      <ContextControl />
    </>
  );
}
function Modules({
  view,
  player,
}: {
  view: WaveformView | null;
  player: Player | null;
}) {
  useEffect(() => {
    if (!view || !player) return;
    const timeline = mountTimeline(document.getElementById("timeline")!, {
      view,
    });
    const mini = mountMinimap(document.getElementById("mini")!, {
      view,
      player,
    });
    return () => {
      mini.dispose();
      timeline.dispose();
    };
  }, [view, player]);
  return (
    <>
      <div id="timeline" />
      <div id="mini" />
    </>
  );
}
function Demo({ scenario }: { scenario: string }) {
  if (scenario === "many")
    return (
      <>
        {Array.from({ length: 12 }, (_, i) => (
          <AudioPlayer
            key={i}
            source={{ ...source, id: "player" + i, waveform: { kind: "none" } }}
            waveform={false}
          />
        ))}
      </>
    );
  if (scenario === "complete")
    return (
      <AudioPlayer
        source={source}
        controls={{ playbackRate: true, loop: true }}
        slots={{ status: (part) => <aside>{part}</aside> }}
        onError={(e) => console.error(e.code)}
      />
    );
  if (scenario === "composed")
    return (
      <PlayerRoot source={source}>
        <Waveform aria-label="Composed waveform" />
        <Parts />
      </PlayerRoot>
    );
  if (scenario === "owned")
    return (
      <Waveform
        source={source}
        defaultAnnotations={annotations}
        renderRegionLabel={(r) => <strong>{r.label}</strong>}
      />
    );
  if (scenario === "controlled") return <Controlled />;
  if (scenario === "themes") return <ThemePreview />;
  return <BorrowedDemo scenario={scenario} />;
}
function ThemePreview() {
  const [theme, setTheme] = useState("default");
  const [showTransport, setShowTransport] = useState(false);
  const [editorLayout, setEditorLayout] = useState<"inline" | "modal">(
    "inline",
  );
  const preset =
    theme === "paper"
      ? waveformThemes.paper
      : theme === "neon"
        ? waveformThemes.neon
        : null;
  return (
    <>
      <label htmlFor="player-theme">Waveform preset</label>
      <select
        id="player-theme"
        value={theme}
        onChange={(e) => setTheme(e.target.value)}
      >
        <option value="default">Default</option>
        <option value="paper">Paper</option>
        <option value="neon">Neon</option>
      </select>
      <label htmlFor="editor-layout">Editor layout</label>
      <select
        id="editor-layout"
        value={editorLayout}
        onChange={(e) =>
          setEditorLayout(e.target.value === "modal" ? "modal" : "inline")
        }
      >
        <option value="inline">Inline</option>
        <option value="modal">Modal</option>
      </select>
      <label>
        <input
          type="checkbox"
          checked={showTransport}
          onChange={(e) => setShowTransport(e.target.checked)}
        />
        Show extra playback controls
      </label>
      <AudioPlayer
        className="theme-preview"
        source={source}
        theme={preset}
        controls={
          showTransport ? { playbackRate: true, loop: true } : undefined
        }
        waveform={{
          defaultAnnotations: editorAnnotations,
          annotationEditor: editorLayout,
          interaction: { drag: "select" },
        }}
      />
    </>
  );
}
function Controlled() {
  const [state, setState] = useState<{
    document: AnnotationDocument;
    revision: number;
    rejected: number;
  }>({
    document: annotations,
    revision: 0,
    rejected: 0,
  });
  const latest = useRef(state);
  latest.current = state;
  const commit = (
    document: AnnotationDocument,
    change: { baseRevision: number },
  ) => {
    const current = latest.current;
    const next =
      change.baseRevision === current.revision
        ? { ...current, document, revision: current.revision + 1 }
        : { ...current, rejected: current.rejected + 1 };
    latest.current = next;
    setState(next);
  };
  return (
    <>
      <Waveform
        source={source}
        annotations={state.document}
        annotationsRevision={state.revision}
        onAnnotationsCommit={commit}
      />
      <button
        onClick={() =>
          commit(
            {
              ...state.document,
              regions: [
                ...state.document.regions,
                {
                  id: "new" + state.revision,
                  start: 9,
                  end: 10,
                  label: "Added",
                },
              ],
            },
            { baseRevision: state.revision },
          )
        }
      >
        External edit
      </button>
      <button
        onClick={() =>
          commit(
            { ...state.document, regions: [] },
            { baseRevision: state.revision - 1 },
          )
        }
      >
        Stale proposal
      </button>
      <pre data-testid="local-state">{JSON.stringify(state)}</pre>
    </>
  );
}
function BorrowedDemo({ scenario }: { scenario: string }) {
  const [error, setError] = useState("");
  const player = usePlayer({
    source: {
      ...source,
      waveform: scenario === "headless" ? { kind: "none" } : source.waveform,
    },
    onError: (e) => setError(`${e.code}:${e.stage}`),
  });
  const state = usePlayerState(player, (s) => s);
  const [show, setShow] = useState(true),
    [view, setView] = useState<WaveformView | null>(null);
  const [store, setStore] = useState<ReturnType<
    typeof createAnnotations
  > | null>(null);
  useEffect(() => {
    const s = createAnnotations({ document: annotations });
    setStore(s);
    return () => s.dispose();
  }, []);
  return (
    <>
      <button onClick={() => setShow((v) => !v)}>Toggle borrowed view</button>
      <button onClick={() => player?.play().catch((e) => setError(e.message))}>
        Play
      </button>
      <button onClick={() => player?.pause()}>Pause</button>
      <button onClick={() => player?.seek(5)}>Seek 5</button>
      <Clock player={player} />
      <pre>
        {JSON.stringify({
          source: state?.source,
          playback: state?.playback,
          waveform: state?.waveform,
        })}
      </pre>
      <output role="alert">{error}</output>
      {player && show && scenario !== "headless" && (
        <Waveform
          player={player}
          onView={setView}
          annotationStore={store ?? undefined}
          theme={waveformThemes.sage}
          interaction={{ drag: "select" }}
          snapAnnotation={createSnapper({ grid: 0.5 })}
          renderRegionLabel={(r) => <strong>{r.label}</strong>}
        />
      )}
      {scenario === "modules" && <Modules player={player} view={view} />}
      {scenario === "multiple" && player && <Waveform player={player} />}
      {scenario === "independent" && (
        <AudioPlayer
          source={{ ...source, id: "independent", waveform: { kind: "none" } }}
        />
      )}
      <button
        onClick={() =>
          store?.addRegion({
            id: "new" + store.getSnapshot().revision,
            start: 8,
            end: 9,
            label: "Added",
          })
        }
      >
        Add region
      </button>
    </>
  );
}
function App() {
  const scenario =
    new URLSearchParams(location.search).get("scenario") || "complete";
  const [mounted, setMounted] = useState(true);
  return (
    <>
      <h1>React ownership lab</h1>
      <nav>
        {[
          "complete",
          "composed",
          "headless",
          "owned",
          "borrowed",
          "multiple",
          "independent",
          "modules",
          "controlled",
          "themes",
          "many",
        ].map((s) => (
          <a key={s} href={"?scenario=" + s}>
            {s}
          </a>
        ))}
      </nav>
      <button onClick={() => setMounted((v) => !v)}>
        Mount / unmount owner
      </button>
      <section>{mounted && <Demo scenario={scenario} />}</section>
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
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
