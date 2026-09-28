export default function Loading() {
  return (
    <div className="grid-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="panel" style={{ minHeight: 140, background: "linear-gradient(90deg, #f7f3eb, #fff, #f7f3eb)" }} />
      ))}
    </div>
  );
}
