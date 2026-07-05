type NotesBoxProps = {
  value: string;
  disabled: boolean;
  cueStart: number | null;
  onChange: (value: string) => void;
};

export function NotesBox({ value, disabled, cueStart, onChange }: NotesBoxProps) {
  return (
    <label className="notes-box">
      <span>Notes {cueStart !== null ? <em>@ {cueStart.toFixed(2)}s</em> : null}</span>
      <textarea
        value={value}
        disabled={disabled}
        rows={3}
        placeholder="Apex, cone wall, next gate."
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    </label>
  );
}
