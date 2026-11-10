"use client";
import { useEffect, useState } from "react";
import { AudioPlayer } from "raavl/react";
export default function Player({ name }: { name: string }) {
  const [identity, setIdentity] = useState("Loading package identity");
  useEffect(() => {
    fetch("/lab-source.json")
      .then((r) => r.json())
      .then((s) =>
        setIdentity(`Raavl ${s.version} · ${s.mode} · SHA256 ${s.hash}`),
      )
      .catch(() => setIdentity("Package identity unavailable"));
  }, []);
  return (
    <section aria-label={name}>
      <h2>{name}</h2>
      <p aria-label="Package source">{identity}</p>
      <AudioPlayer
        source={{
          kind: "url",
          id: name,
          url: "/fixtures/tone.wav",
          waveform: { kind: "none" },
        }}
        controls={{ playbackRate: true, loop: true }}
      />
    </section>
  );
}
