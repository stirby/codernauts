export function PanelTitle({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="panel-title">
      <p className="eyebrow">{kicker}</p>
      <h2>{title}</h2>
    </div>
  );
}
