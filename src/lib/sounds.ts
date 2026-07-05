type ToneKind = 'correct' | 'wrong';

let audioContext: AudioContext | null = null;

export function playTone(kind: ToneKind, enabled: boolean): void {
  if (!enabled) {
    return;
  }

  try {
    audioContext = audioContext ?? new AudioContext();
    const ctx = audioContext;
    const now = ctx.currentTime;
    if (kind === 'correct') {
      playOsc(ctx, now, 660, 0.08, 'sine', 0.08);
      playOsc(ctx, now + 0.08, 880, 0.12, 'sine', 0.07);
    } else {
      playOsc(ctx, now, 160, 0.12, 'sawtooth', 0.05);
    }
  } catch {
    // Audio is optional; browsers may block or omit AudioContext.
  }
}

function playOsc(
  ctx: AudioContext,
  start: number,
  frequency: number,
  duration: number,
  type: OscillatorType,
  gainValue: number
): void {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}
