export function SystemMark({ variant = "light" }) {
  return (
    <div className={`system-mark system-mark-${variant}`} aria-hidden="true">
      <span className="mark-plane mark-plane-a" />
      <span className="mark-plane mark-plane-b" />
      <span className="mark-plane mark-plane-c" />
      <span className="mark-node mark-node-a" />
      <span className="mark-node mark-node-b" />
      <span className="mark-node mark-node-c" />
      <span className="mark-node mark-node-d" />
      <span className="mark-axis mark-axis-x" />
      <span className="mark-axis mark-axis-y" />
    </div>
  );
}

export function MiniSystemPreview({ title = "Workflow", items = [] }) {
  const rows = items.length ? items : ["Inputs", "Decision", "Output"];

  return (
    <div className="mini-preview" aria-label={`${title} preview`}>
      <div className="mini-preview-head">
        <span>{title}</span>
        <i />
      </div>
      <div className="mini-preview-grid">
        {rows.map((item, index) => (
          <div key={item} className="mini-preview-row">
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{item}</strong>
            <em />
          </div>
        ))}
      </div>
    </div>
  );
}
