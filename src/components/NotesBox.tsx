type NotesBoxProps = {
  value: string;
  disabled: boolean;
  cueStart: number | null;
  collapsed: boolean;
  onChange: (value: string) => void;
  onToggleCollapsed: () => void;
};

export function NotesBox({ value, disabled, cueStart, collapsed, onChange, onToggleCollapsed }: NotesBoxProps) {
  if (collapsed) {
    return (
      <aside className="notes-box notes-box-collapsed" aria-label="Notes">
        <button type="button" className="collapse-tab" onClick={onToggleCollapsed} title="Expand notes" aria-label="Expand notes">
          Notes
        </button>
      </aside>
    );
  }

  return (
    <section className="notes-box" aria-label="Notes">
      <div className="notes-header">
        Notes {cueStart !== null ? <em>@ {cueStart.toFixed(2)}s</em> : null}
        <button type="button" className="panel-collapse-button" onClick={onToggleCollapsed} title="Collapse notes" aria-label="Collapse notes">
          Collapse
        </button>
      </div>
      <textarea
        value={value}
        disabled={disabled}
        rows={3}
        aria-label="Notes"
        placeholder="Apex, cone wall, next gate."
        onChange={(event) => onChange(event.currentTarget.value)}
      />
      <div className="notes-hotkeys">Keys: 1-8 choose | Space/R prompt or next | P/Enter answer | M mute</div>
    </section>
  );
}
