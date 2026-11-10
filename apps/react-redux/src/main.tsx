import React, { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Waveform, usePlayer, usePlayerTime } from "raavl/react";
import type { Player } from "raavl/core";
import { stringifyAnnotations, parseAnnotations } from "raavl/regions";
import { useDocument, current, dispatch } from "./store";
import "raavl/styles.css";
import "./lab.css";
function Clock({ player }: { player: Player | null }) {
  const t = usePlayerTime(player);
  return <output>{t.toFixed(2)}</output>;
}
function App() {
  const state = useDocument();
  const [error, setError] = useState(""),
    [text, setText] = useState("");
  const player = usePlayer({
    source: { kind: "url", ...state.source, waveform: { kind: "decode" } },
    onError: (e) => setError(e.code),
  });
  const act = (fn: () => void) => {
    try {
      fn();
      setError("");
    } catch (e) {
      setError(String(e));
    }
  };
  const reload = () => {
    const currentState = current();
    const raw = localStorage.getItem("annotations:" + currentState.source.id);
    if (raw)
      dispatch({
        type: "reload",
        document: parseAnnotations(raw, currentState.source.id),
      });
  };
  useEffect(() => {
    act(() => reload());
  }, []);
  const commit = (
    document: typeof state.document,
    change: { baseRevision: number },
  ) =>
    dispatch({ type: "commit", document, baseRevision: change.baseRevision });
  return (
    <>
      <h1>Controlled annotation store</h1>
      <p>
        Serializable documents and accepted history live in the application
        store. The player and clock remain in lifecycle owners.
      </p>
      <section>
        <button
          onClick={() => player?.play().catch((e) => setError(String(e)))}
        >
          Play
        </button>
        <button onClick={() => player?.pause()}>Pause</button>
        <Clock player={player} />
        {player && (
          <Waveform
            player={player}
            annotations={state.document}
            annotationsRevision={state.revision}
            onAnnotationsCommit={commit}
            onAnnotationSelect={(id) => dispatch({ type: "select", id })}
            interaction={{ drag: "select" }}
            renderRegionLabel={(r) => <strong>{r.label}</strong>}
          />
        )}
        <button
          onClick={() => {
            const s = current();
            commit(
              {
                ...s.document,
                regions: [
                  ...s.document.regions,
                  { id: "r" + s.revision, start: 8, end: 9, label: "External" },
                ],
              },
              { baseRevision: s.revision },
            );
          }}
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
        <button onClick={() => dispatch({ type: "undo" })}>Undo</button>
        <button onClick={() => dispatch({ type: "redo" })}>Redo</button>
        <button
          onClick={() =>
            localStorage.setItem(
              "annotations:" + state.source.id,
              stringifyAnnotations(state.document),
            )
          }
        >
          Save
        </button>
        <button onClick={() => act(() => reload())}>Reload saved</button>
        <button onClick={() => dispatch({ type: "source" })}>
          Change source
        </button>
        <button onClick={() => setText(stringifyAnnotations(state.document))}>
          Export JSON
        </button>
        <button
          onClick={() =>
            act(() =>
              commit(parseAnnotations(text, state.source.id), {
                baseRevision: current().revision,
              }),
            )
          }
        >
          Import JSON
        </button>
        <textarea
          aria-label="Annotation JSON"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <pre data-testid="store">{JSON.stringify(state)}</pre>
        <output role="alert">{error}</output>
      </section>
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
