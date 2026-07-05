type StatusLineProps = {
  message: string;
  tone?: 'neutral' | 'good' | 'bad' | 'warn';
};

export function StatusLine({ message, tone = 'neutral' }: StatusLineProps) {
  return (
    <div className={`status-line status-${tone}`} role="status" aria-live="polite">
      {message}
    </div>
  );
}
