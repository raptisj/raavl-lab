import Player from "./player";
export default function Page() {
  return (
    <main>
      <p>
        This shell is server rendered. Route-owned playback stops on navigation.
      </p>
      <Player name="Route local player" />
    </main>
  );
}
