import type { ReactNode } from "react";
import Link from "next/link";
import Player from "./player";
import "raavl/styles.css";
import "./lab.css";
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <h1>Next App Router lifecycle lab</h1>
        <nav>
          <Link href="/">Local player</Link>
          <Link href="/away">Away</Link>
        </nav>
        <Player name="Persistent layout player" />
        {children}
      </body>
    </html>
  );
}
