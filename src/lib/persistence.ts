import type { AnchorStats, Annotation, Mode, Settings } from '../types';

const prefix = 'autoxvision:v1';

export function loadSettings(defaults: Settings): Settings {
  return read(`${prefix}:settings`, defaults);
}

export function saveSettings(settings: Settings): void {
  write(`${prefix}:settings`, settings);
}

export function loadAnnotations(videoFingerprint: string): Annotation[] {
  return read(`${prefix}:annotations:${videoFingerprint}`, []);
}

export function saveAnnotations(videoFingerprint: string, annotations: Annotation[]): void {
  write(`${prefix}:annotations:${videoFingerprint}`, annotations);
}

export function highScoreKey(videoFingerprint: string, mode: Mode): string {
  return `${prefix}:highScore:${videoFingerprint}:${mode}`;
}

export function loadHighScore(videoFingerprint: string, mode: Mode): number {
  return read(highScoreKey(videoFingerprint, mode), 0);
}

export function saveHighScore(videoFingerprint: string, mode: Mode, score: number): void {
  write(highScoreKey(videoFingerprint, mode), score);
}

export function loadStats(videoFingerprint: string): Record<string, AnchorStats> {
  return read(`${prefix}:stats:${videoFingerprint}`, {});
}

export function saveStats(videoFingerprint: string, stats: Record<string, AnchorStats>): void {
  write(`${prefix}:stats:${videoFingerprint}`, stats);
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Best-effort local persistence should never block the drill.
  }
}
