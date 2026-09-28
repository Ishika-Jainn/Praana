"use client";

export default function ConsoleError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <section className="panel panel-pad">
      <p className="kicker">Desk interrupted</p>
      <h1 className="serif">The page could not finish loading.</h1>
      <p className="muted">{error.message}</p>
      <button className="btn-primary" onClick={reset}>Try again</button>
    </section>
  );
}
